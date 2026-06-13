//Codigo por I L A N

// ============================================================
//  CARRITO
// ============================================================

//1 - Cargar carrito
async function cargarCarrito() {
  const contenedor = document.getElementById("carrito-lista");
  const totalEl    = document.getElementById("carrito-total");
  if (!contenedor) return;

  if (!Api.estaLogueado()) {
    contenedor.innerHTML = `<div class="alerta alerta-error">Tenés que iniciar sesión para ver el carrito.</div>`;
    return;
  }

  try {
    const usuario = Api.obtenerUsuario();
    const uid     = usuario.id_usuario || usuario.id;
    const res     = await Api.get(`/obtenerProductosCarrito/${uid}`);
    const items   = res.payload || [];

    if (!items.length) {
      contenedor.innerHTML = `
        <div class="estado-vacio">
          <span class="estado-vacio-icono">🛒</span>
          <p>Tu carrito está vacío</p>
          <a href="index.html" class="btn btn-primario btn-sm">Ir al catálogo</a>
        </div>`;
      if (totalEl) totalEl.textContent = formatearPrecio(0);
      return;
    }

    let total = 0;
    contenedor.innerHTML = items.map(item => {
      const precio = Number(item.precio_unitario || item.precio || 0);
      const cant   = item.cantidad || 1;
      total += precio * cant;
      return `
        <div class="carrito-item">
          <img class="carrito-item-img" src="${item.ulrImagen || item.imagen || "img/default.png"}"
            alt="${item.nombre || ""}" onerror="imgFallback(this)">
          <div class="carrito-item-info">
            <p class="carrito-item-nombre">${item.producto || item.nombre || ""}</p>
            <p class="carrito-item-detalle">Talle: ${item.talle || "-"} · Cant: ${cant}</p>
            <p class="carrito-item-precio">${formatearPrecio(precio)}</p>
          </div>
          <button class="btn btn-peligro btn-sm"
            onclick="eliminarDelCarrito(${item.id_detalle_pedido || item.id}, this)">
            Eliminar
          </button>
        </div>`;
    }).join("");

    if (totalEl) totalEl.textContent = formatearPrecio(total);

    const totalPagoEl = document.getElementById("pago-total-monto");
    if (totalPagoEl) totalPagoEl.textContent = formatearPrecio(total);

    sessionStorage.setItem("carritoTotal", total);
    sessionStorage.setItem("carritoItems", JSON.stringify(items));

  } catch (err) {
    contenedor.innerHTML = `<div class="alerta alerta-error">${err.message}</div>`;
  }
}

//2 - Eliminar ítem del carrito
async function eliminarDelCarrito(idDetalle, btn) {
  try {
    const usuario = Api.obtenerUsuario();
    await Api.delete("/eliminarProductoCarrito", {
  id_usuario: uid,
  id_inventario: item.idInventario
});
    mostrarToast("Producto eliminado del carrito");
    actualizarBadgeCarrito();
    cargarCarrito();
  } catch (err) {
    mostrarToast(err.message || "Error al eliminar", "error");
  }
}

// ============================================================
//  PAGO
// ============================================================

//3 - Init pago
function initPago() {
  const selectMetodo = document.getElementById("metodo-pago");
  const camposTarjeta = document.getElementById("campos-tarjeta");
  const btnPagar      = document.getElementById("btn-pagar");
  if (!selectMetodo) return;

  const total  = sessionStorage.getItem("carritoTotal") || 0;
  const totalEl = document.getElementById("pago-total");
  if (totalEl) totalEl.textContent = formatearPrecio(total);

  selectMetodo.addEventListener("change", () => {
    const necesitaTarjeta = ["debito", "credito"].includes(selectMetodo.value);
    camposTarjeta?.classList.toggle("visible", necesitaTarjeta);
    validarPago();
  });

  document.querySelectorAll("#form-pago input, #form-pago select").forEach(el => {
    el.addEventListener("input", validarPago);
  });

  if (btnPagar) {
    btnPagar.addEventListener("click", async () => {
      mostrarToast("¡Pago aprobado con éxito! 🎉");
      setTimeout(() => { window.location.href = "index.html"; }, 2000);
    });
  }
}

function validarPago() {
  const metodo  = document.getElementById("metodo-pago")?.value;
  const btnPagar = document.getElementById("btn-pagar");
  if (!btnPagar) return;

  let valido = !!metodo;

  if (["debito", "credito"].includes(metodo)) {
    const numero  = document.getElementById("num-tarjeta")?.value.trim();
    const venc    = document.getElementById("venc-tarjeta")?.value.trim();
    const titular = document.getElementById("titular-tarjeta")?.value.trim();
    valido = valido && !!numero && !!venc && !!titular;
  }

  btnPagar.disabled = !valido;
}

// ============================================================
//  FAVORITOS
// ============================================================

//4 - Cargar favoritos
async function cargarFavoritos() {
  const contenedor = document.getElementById("favoritos-grilla");
  if (!contenedor) return;

  if (!Api.estaLogueado()) {
    contenedor.innerHTML = `<div class="alerta alerta-error">Tenés que iniciar sesión para ver favoritos.</div>`;
    return;
  }

  try {
    const usuario = Api.obtenerUsuario();
    const uid     = usuario.id_usuario || usuario.id;
    const res     = await Api.get(`/obtenerFavoritos/${uid}`);
    const favs    = res.payload || [];

    if (!favs.length) {
      contenedor.innerHTML = `
        <div class="estado-vacio">
          <span class="estado-vacio-icono">♥</span>
          <p>No tenés productos en favoritos</p>
          <a href="index.html" class="btn btn-primario btn-sm">Explorar catálogo</a>
        </div>`;
      return;
    }

    //--Traer datos completos de cada producto favorito--
    const productos = await Promise.all(favs.map(async f => {
      try {
        const r = await Api.get(`/obtenerDatosProducto/${f.idProducto}`, false);
        const p = r.payload?.[0];
        if (!p) return null;
        return {
          idProducto: f.idProducto,
          nombre:     p.producto || p.nombre || "",
          precio:     p.precio,
          imagen:     p.ulrImagen || p.imagen || ""
        };
      } catch { return null; }
    }));

    const validos = productos.filter(Boolean);

    if (!validos.length) {
      contenedor.innerHTML = `<div class="estado-vacio"><p>No se pudieron cargar los favoritos.</p></div>`;
      return;
    }

    contenedor.innerHTML = validos.map(p => `
      <article class="card-producto">
        <a href="producto.html?id=${p.idProducto}">
          <div class="card-imagen">
            <img src="${p.imagen}" alt="${p.nombre}" onerror="imgFallback(this)">
          </div>
        </a>
        <div class="card-cuerpo">
          <p class="card-nombre">${p.nombre}</p>
          <p class="card-precio">${formatearPrecio(p.precio)}</p>
        </div>
        <div class="card-pie">
          <button class="btn btn-peligro btn-sm btn-full"
            onclick="eliminarFavorito(${p.idProducto}, this)">
            Eliminar
          </button>
        </div>
      </article>`).join("");

  } catch (err) {
    contenedor.innerHTML = `<div class="alerta alerta-error">${err.message}</div>`;
  }
}

//5 - Eliminar favorito
async function eliminarFavorito(idProducto, btn) {
  try {
    const usuario = Api.obtenerUsuario();
    const uid     = usuario.id_usuario || usuario.id;
    await Api.delete("/eliminarFavorito", { id_usuario: uid, id_producto: idProducto });
    mostrarToast("Eliminado de favoritos");
    btn.closest(".card-producto")?.remove();
  } catch (err) {
    mostrarToast(err.message || "Error al eliminar", "error");
  }
}

// ============================================================
//  PERFIL
// ============================================================

//6 - Cargar datos del perfil
async function cargarPerfil() {
  const form = document.getElementById("form-perfil");
  if (!form) return;

  if (!Api.estaLogueado()) {
    window.location.href = "login.html";
    return;
  }

  try {
    const usuario = Api.obtenerUsuario();
    const uid     = usuario.id_usuario || usuario.id;
    const res     = await Api.get(`/obtenerDatosUsuario/${uid}`);
    const datos   = res.payload?.[0] || usuario;

    document.getElementById("perfil-nombre").value    = datos.nombre    || "";
    document.getElementById("perfil-apellido").value  = datos.apellido  || "";
    document.getElementById("perfil-email").value     = datos.email     || "";
    document.getElementById("perfil-telefono").value  = datos.telefono  || "";
    document.getElementById("perfil-direccion").value = datos.direccion || "";
  } catch (err) {
    mostrarToast(err.message || "Error al cargar perfil", "error");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const usuario = Api.obtenerUsuario();
      const uid     = usuario.id_usuario || usuario.id;
      await Api.post(`/modificarUsuario/${uid}`, {
        nombre:    document.getElementById("perfil-nombre").value.trim(),
        apellido:  document.getElementById("perfil-apellido").value.trim(),
        email:     document.getElementById("perfil-email").value.trim(),
        telefono:  document.getElementById("perfil-telefono").value.trim(),
        direccion: document.getElementById("perfil-direccion").value.trim(),
      });
      mostrarToast("Datos actualizados correctamente");
    } catch (err) {
      mostrarToast(err.message || "Error al guardar", "error");
    }
  });
}

// ============================================================
//  ADMIN
// ============================================================

//7 - Cargar tabla de productos
async function cargarTablaAdmin() {
  const tabla = document.getElementById("admin-tabla-body");
  if (!tabla) return;

  if (!Api.esAdmin()) {
    window.location.href = "index.html";
    return;
  }

  try {
    const res      = await Api.get("/obtenerProductos");
    const productos = res.payload || [];

    tabla.innerHTML = productos.map(p => `
      <tr>
        <td><img src="${p.ulrImagen || p.imagen || ""}" onerror="imgFallback(this)"></td>
        <td>${p.producto || p.nombre || ""}</td>
        <td>${p.categoria || ""}</td>
        <td>${formatearPrecio(p.precio)}</td>
        <td>${p.genero || ""}</td>
        <td>
          <button class="btn btn-secundario btn-sm"
            onclick="editarProducto(${p.idProducto || p.id_producto})">
            Editar
          </button>
        </td>
      </tr>`).join("");

  } catch (err) {
    mostrarToast(err.message || "Error al cargar productos", "error");
  }
}

//8 - Cargar categorías en el select del form admin
async function cargarCategoriasAdmin() {
  const select = document.getElementById("admin-categoria");
  if (!select) return;
  try {
    const res  = await Api.get("/obtenerCategorias");
    const cats = res.payload || [];
    select.innerHTML = `<option value="">Seleccioná una categoría</option>` +
      cats.map(c => `<option value="${c.id_categoria}">${c.nombre}</option>`).join("");
  } catch { /* silencioso */ }
}

//9 - Guardar producto (nuevo o edición)
let productoEditandoId = null;

async function guardarProducto(e) {
  e.preventDefault();
  const datos = {
    nombre:       document.getElementById("admin-nombre").value.trim(),
    descripcion:  document.getElementById("admin-descripcion").value.trim(),
    precio:       Number(document.getElementById("admin-precio").value),
    genero:       document.getElementById("admin-genero").value,
    id_categoria: Number(document.getElementById("admin-categoria").value),
    imagen:       document.getElementById("admin-imagen").value.trim(),
  };

  try {
    if (productoEditandoId) {
      await Api.put(`/modificarProducto/${productoEditandoId}`, datos);
      mostrarToast("Producto modificado correctamente");
      productoEditandoId = null;
      document.querySelector("#form-admin button[type='submit']").textContent = "Guardar producto";
    } else {
      await Api.post("/cargarProducto", datos);
      mostrarToast("Producto cargado correctamente");
    }
    e.target.reset();
    cargarTablaAdmin();
  } catch (err) {
    mostrarToast(err.message || "Error al guardar", "error");
  }
}

//10 - Editar producto (precargar form)
async function editarProducto(id) {
  try {
    const res = await Api.get(`/obtenerDatosProducto/${id}`);
    const p   = res.payload?.[0];
    if (!p) return;

    document.getElementById("admin-nombre").value      = p.producto    || p.nombre || "";
    document.getElementById("admin-descripcion").value = p.descripcion || "";
    document.getElementById("admin-precio").value      = p.precio      || 0;
    document.getElementById("admin-genero").value      = p.genero      || "";
    document.getElementById("admin-imagen").value      = p.ulrImagen   || p.imagen || "";
    document.getElementById("admin-categoria").value   = p.idCategoria || p.id_categoria || "";

    productoEditandoId = id;
    document.querySelector("#form-admin button[type='submit']").textContent = "Guardar cambios";

    mostrarToast("Producto cargado para edición");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    mostrarToast(err.message || "Error al cargar producto", "error");
  }
}

//11 - Init según página
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("carrito-lista"))  cargarCarrito();
  if (document.getElementById("form-pago"))       initPago();
  if (document.getElementById("favoritos-grilla")) cargarFavoritos();
  if (document.getElementById("form-perfil"))     cargarPerfil();
  if (document.getElementById("admin-tabla-body")) {
    if (!Api.esAdmin()) {
      window.location.href = "index.html";
      return;
    }
    cargarTablaAdmin();
    cargarCategoriasAdmin();
    document.getElementById("form-admin")?.addEventListener("submit", guardarProducto);
  }
});
