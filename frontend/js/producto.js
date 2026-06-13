//Codigo por I L A N

//1 - Variables
let productoActual = null;
let inventarioActual = [];
let talleSeleccionado = null;

//2 - Init
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id     = params.get("id");
  if (!id) { window.location.href = "index.html"; return; }
  await cargarProducto(id);
  setupCuotas();
});

//3 - Cargar producto desde la API
async function cargarProducto(id) {
  try {
    const res = await Api.get(`/obtenerDatosProducto/${id}`, false);
    const rows = res.payload || [];
    if (!rows.length) throw new Error("Producto no encontrado");

    productoActual  = rows[0];
    inventarioActual = rows;

    renderizarDetalle();
  } catch (err) {
    document.querySelector("main").innerHTML =
      `<div class="contenedor"><div class="alerta alerta-error">${err.message}</div></div>`;
  }
}

//4 - Renderizar el detalle
function renderizarDetalle() {
  const p        = productoActual;
  const nombre   = p.producto  || p.nombre || "";
  const imagen   = p.ulrImagen || p.imagen || "img/default.png";
  const stockTotal = inventarioActual.reduce((acc, r) => acc + (r.stock || 0), 0);

  document.title = `${nombre} — Lana & Lino`;

  document.getElementById("img-producto").src = imagen;
  document.getElementById("img-producto").alt = nombre;
  document.getElementById("det-categoria").textContent = p.categoria || "";
  document.getElementById("det-nombre").textContent    = nombre;
  document.getElementById("det-precio").textContent    = formatearPrecio(p.precio);
  document.getElementById("det-descripcion").textContent = p.descripcion || "";

  actualizarBreadcrumb(nombre);
  renderizarStock(stockTotal);
  renderizarTalles();
  actualizarCuotas(p.precio);
  setupBtnCarrito();
}

//5 - Breadcrumb
function actualizarBreadcrumb(nombre) {
  const el = document.getElementById("breadcrumb-nombre");
  if (el) el.textContent = nombre;
}

//6 - Indicador de stock
function renderizarStock(stock) {
  const el = document.getElementById("stock-indicador");
  if (!el) return;

  if (stock <= 0) {
    el.innerHTML = `<span class="stock-punto sin-stock"></span> Sin stock`;
  } else if (stock <= 5) {
    el.innerHTML = `<span class="stock-punto bajo-stock"></span> Últimas ${stock} unidades`;
  } else {
    el.innerHTML = `<span class="stock-punto disponible"></span> En stock (${stock} disponibles)`;
  }
}

//7 - Talles disponibles
function renderizarTalles() {
  const contenedor = document.getElementById("opciones-talle");
  if (!contenedor) return;

  const tallesUnicos = [...new Map(inventarioActual.map(r => [r.talle, r])).values()];

  if (!tallesUnicos.length) {
    contenedor.innerHTML = `<div class="sin-stock-banner">Sin stock disponible</div>`;
    return;
  }

  contenedor.innerHTML = tallesUnicos.map(r => {
    const sinStock = r.stock <= 0;
    return `
      <button class="opcion-talle ${sinStock ? "sin-stock" : ""}"
        data-talle="${r.talle}" ${sinStock ? "disabled" : ""}
        onclick="seleccionarTalle(this, '${r.talle}')">
        ${r.talle}
      </button>`;
  }).join("");
}

//8 - Seleccionar talle
function seleccionarTalle(btn, talle) {
  document.querySelectorAll(".opcion-talle").forEach(b => b.classList.remove("seleccionado"));
  btn.classList.add("seleccionado");
  talleSeleccionado = talle;
}

//9 - Agregar al carrito
function setupBtnCarrito() {
  const btnCarrito = document.getElementById("btn-agregar-carrito");
  if (!btnCarrito) return;

  btnCarrito.onclick = async () => {
    if (!Api.estaLogueado()) {
      window.location.href = "login.html";
      return;
    }
    if (!talleSeleccionado) {
      mostrarToast("Seleccioná un talle primero", "error");
      return;
    }

    const inv = inventarioActual.find(r => r.talle === talleSeleccionado);
    if (!inv) return;

    try {
      const usuario = Api.obtenerUsuario();
      await Api.post("/agregarACarrito", {
        id_usuario:      usuario.id_usuario || usuario.id,
        id_inventario: inv.idInventario,
        cantidad:        1,
        precio_unitario: productoActual.precio
      });
      mostrarToast("Agregado al carrito 🛒");
      actualizarBadgeCarrito();
    } catch (err) {
      mostrarToast(err.message || "Error al agregar", "error");
    }
  };
}

//10 - Favorito en el detalle
document.addEventListener("DOMContentLoaded", async () => {
  const btn = document.getElementById("btn-favorito");
  if (!btn) return;

  const params = new URLSearchParams(window.location.search);
  const id     = parseInt(params.get("id"));

  if (Api.estaLogueado()) {
    try {
      const usuario = Api.obtenerUsuario();
      const uid     = usuario.id_usuario || usuario.id;
      const res     = await Api.get(`/obtenerFavoritos/${uid}`);
      const favs    = res.payload || [];
      const esFav   = favs.some(f => Number(f.idProducto || f.id_producto) === id);
      if (esFav) btn.classList.add("activo");
    } catch { /* silencioso */ }
  }

  btn.addEventListener("click", async () => {
    if (!Api.estaLogueado()) {
      window.location.href = "login.html";
      return;
    }
    const usuario = Api.obtenerUsuario();
    const uid     = usuario.id_usuario || usuario.id;
    const esFav   = btn.classList.contains("activo");

    try {
      if (esFav) {
        await Api.delete("/eliminarFavorito", { id_usuario: uid, id_producto: id });
        btn.classList.remove("activo");
        mostrarToast("Eliminado de favoritos");
      } else {
        await Api.post("/agregarFavorito", { id_producto: id, id_usuario: uid });
        btn.classList.add("activo");
        mostrarToast("Agregado a favoritos ♥");
      }
    } catch (err) {
      mostrarToast(err.message || "Error", "error");
    }
  });
});

//11 - Cuotas
function setupCuotas() {}

function actualizarCuotas(precio) {
  const botones = document.querySelectorAll(".cuota-btn");
  const display = document.getElementById("cuota-precio");
  if (!botones.length || !display) return;

  botones.forEach(btn => {
    btn.addEventListener("click", () => {
      botones.forEach(b => b.classList.remove("activo"));
      btn.classList.add("activo");
      const n     = parseInt(btn.dataset.cuotas);
      const valor = Api.calcularValorCuota(precio, n);
      const total = Api.calcularTotalCuota(precio, n);
      display.innerHTML = `${formatearPrecio(valor)} <span>x ${n} cuota${n > 1 ? "s" : ""}
        ${n > 3 ? `(total ${formatearPrecio(total)})` : "sin interés"}</span>`;
    });
  });

  //--Activar 1 cuota por defecto--
  const primer = document.querySelector(".cuota-btn");
  if (primer) primer.click();
}
