//Codigo por I L A N

//1 - Estado
let todosLosProductos = [];
let idsFavoritos = new Set();

//2 - Init
document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([cargarFiltrosCategorias(), cargarIdsFavoritos()]);
  await cargarProductos();
  setupBuscador();
  setupFiltros();
  setupOrdenar();
  setupLimpiarFiltros();
});

//3 - Cargar IDs de favoritos del usuario
async function cargarIdsFavoritos() {
  if (!Api.estaLogueado()) return;
  try {
    const usuario = Api.obtenerUsuario();
    const id      = usuario.id_usuario || usuario.id;
    const res     = await Api.get(`/obtenerFavoritos/${id}`);
    const favs    = res.payload || [];
    idsFavoritos  = new Set(favs.map(f => Number(f.idProducto || f.id_producto)));
  } catch { /* silencioso */ }
}

//4 - Cargar categorías del sidebar dinámicamente
async function cargarFiltrosCategorias() {
  const contenedor = document.querySelector(".filtro-opciones[data-filtro='categoria']");
  if (!contenedor) return;
  try {
    const res  = await Api.get("/obtenerCategorias", false);
    const cats = res.payload || [];
    if (!cats.length) return;

    contenedor.innerHTML = cats.map(c => `
      <label class="filtro-opcion">
        <input type="checkbox" name="categoria" value="${c.nombre.toLowerCase()}" data-id="${c.id_categoria}">
        <span>${c.nombre}</span>
        <span class="filtro-conteo">0</span>
      </label>
    `).join("");

    contenedor.querySelectorAll("input").forEach(cb => {
      cb.addEventListener("change", aplicarFiltros);
    });

    const urlCat = new URLSearchParams(window.location.search).get("categoria");
    if (urlCat) {
      const match = contenedor.querySelector(`input[data-id="${urlCat}"]`);
      if (match) match.checked = true;
    }
  } catch { /* silencioso */ }
}

//5 - Cargar productos desde la API
async function cargarProductos() {
  try {
    const res = await Api.get("/obtenerProductos", false);
    todosLosProductos = res.payload || [];
    await enriquecerConInventario();
    actualizarConteosFiltros(todosLosProductos);
    aplicarFiltros();
  } catch {
    document.querySelector(".grilla-productos").innerHTML =
      `<div class="alerta alerta-error" style="grid-column:1/-1">Error al cargar los productos.</div>`;
  }
}

//6 - Traer color y stock desde el inventario de cada producto
async function enriquecerConInventario() {
  await Promise.all(todosLosProductos.map(async (p) => {
    const id = p.idProducto || p.id_producto || p.id;
    if (!id) return;
    try {
      const res  = await Api.get(`/obtenerDatosProducto/${id}`, false);
      const rows = res.payload || [];
      if (!rows.length) return;
      p.color      = rows[0].color || "";
      p.stockTotal = rows.reduce((acc, r) => acc + (r.stock || 0), 0);
    } catch { /* sin inventario */ }
  }));
}

//7 - Actualizar conteos en el sidebar
function actualizarConteosFiltros(productos) {
  const cGenero   = {};
  const cCategoria = {};
  const cColor    = {};

  productos.forEach(p => {
    const g = (p.genero    || "").toLowerCase().trim();
    const c = (p.categoria || "").toLowerCase().trim();
    const col = (p.color   || "").toLowerCase().trim();
    if (g)   cGenero[g]    = (cGenero[g]    || 0) + 1;
    if (c)   cCategoria[c] = (cCategoria[c] || 0) + 1;
    if (col) cColor[col]   = (cColor[col]   || 0) + 1;
  });

  document.querySelectorAll("input[name='genero']").forEach(input => {
    const el = input.closest(".filtro-opcion")?.querySelector(".filtro-conteo");
    if (el) el.textContent = cGenero[input.value] || 0;
  });
  document.querySelectorAll("input[name='categoria']").forEach(input => {
    const el = input.closest(".filtro-opcion")?.querySelector(".filtro-conteo");
    if (el) el.textContent = cCategoria[input.value] || 0;
  });
  document.querySelectorAll("input[name='color']").forEach(input => {
    const el = input.closest(".swatch-wrapper")?.querySelector(".filtro-conteo");
    if (el) el.textContent = cColor[input.value] || 0;
  });
}

//8 - Aplicar filtros y renderizar
function aplicarFiltros() {
  let filtrados = [...todosLosProductos];

  const urlCat = new URLSearchParams(window.location.search).get("categoria");
  if (urlCat) {
    filtrados = filtrados.filter(p =>
      String(p.idCategoria || p.id_categoria) === urlCat ||
      p.categoria?.toLowerCase() === urlCat.toLowerCase()
    );
  }

  const generos = obtenerChecked("input[name='genero']:checked");
  if (generos.length) {
    filtrados = filtrados.filter(p => generos.includes(p.genero?.toLowerCase()));
  }

  const categorias = obtenerChecked("input[name='categoria']:checked");
  if (categorias.length) {
    filtrados = filtrados.filter(p => categorias.includes(p.categoria?.toLowerCase()));
  }

  const colores = obtenerChecked("input[name='color']:checked");
  if (colores.length) {
    filtrados = filtrados.filter(p => colores.includes(p.color?.toLowerCase()));
  }

  const query = document.querySelector(".buscador input")?.value?.toLowerCase().trim();
  if (query) {
    filtrados = filtrados.filter(p =>
      (p.producto || p.nombre || "").toLowerCase().includes(query)
    );
  }

  renderizarProductos(filtrados);
  actualizarConteo(filtrados.length);
}

function obtenerChecked(selector) {
  return Array.from(document.querySelectorAll(selector)).map(el => el.value.toLowerCase());
}

//9 - Renderizar cards
function renderizarProductos(productos) {
  const grilla = document.querySelector(".grilla-productos");
  if (!grilla) return;

  if (!productos.length) {
    grilla.innerHTML = `
      <div class="estado-vacio" style="grid-column:1/-1">
        <span class="estado-vacio-icono">🔍</span>
        <p>No se encontraron productos</p>
      </div>`;
    return;
  }

  grilla.innerHTML = productos.map(p => {
    const id      = p.idProducto || p.id_producto || p.id;
    const nombre  = p.producto   || p.nombre || "";
    const imagen  = p.ulrImagen  || p.imagen || "img/default.png";
    const stock   = p.stockTotal !== undefined ? p.stockTotal : 1;
    const hayStock = stock > 0;
    const esFav   = idsFavoritos.has(Number(id));

    return `
      <article class="card-producto">
        <a href="producto.html?id=${id}">
          <div class="card-imagen">
            <img src="${imagen}" alt="${nombre}" onerror="imgFallback(this)">
            ${!hayStock ? '<span class="card-etiqueta sin-stock">Sin stock</span>' : ""}
            <button class="card-favorito ${esFav ? "activo" : ""}" type="button"
              title="Favoritos" data-id="${id}" onclick="toggleFavorito(event, this)">
              <svg width="16" height="16" viewBox="0 0 24 24"
                fill="${esFav ? "var(--acento)" : "none"}"
                stroke="${esFav ? "var(--acento)" : "currentColor"}" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>
        </a>
        <div class="card-cuerpo">
          <p class="card-categoria">${[p.categoria, p.genero].filter(Boolean).join(" · ")}</p>
          <a href="producto.html?id=${id}"><h3 class="card-nombre">${nombre}</h3></a>
          <p class="card-precio">${formatearPrecio(p.precio)}</p>
        </div>
        <div class="card-pie">
          ${hayStock
            ? `<a href="producto.html?id=${id}" class="btn btn-secundario btn-sm btn-full">Ver producto</a>`
            : `<button class="btn btn-ghost btn-sm btn-full" disabled>Sin stock</button>`}
        </div>
      </article>`;
  }).join("");
}

//10 - Toggle favorito desde la card
async function toggleFavorito(e, btn) {
  e.preventDefault();
  e.stopPropagation();

  if (!Api.estaLogueado()) {
    window.location.href = "login.html";
    return;
  }

  const usuario  = Api.obtenerUsuario();
  const id       = parseInt(btn.dataset.id);
  const svg      = btn.querySelector("svg");
  const esFav    = btn.classList.contains("activo");

  try {
    if (esFav) {
      await Api.delete("/eliminarFavorito", {
        id_usuario: usuario.id_usuario || usuario.id,
        id_producto: id
      });
      btn.classList.remove("activo");
      svg.setAttribute("fill",   "none");
      svg.setAttribute("stroke", "currentColor");
      idsFavoritos.delete(id);
      mostrarToast("Eliminado de favoritos");
    } else {
      await Api.post("/agregarFavorito", {
        id_producto: id,
        id_usuario: usuario.id_usuario || usuario.id
      });
      btn.classList.add("activo");
      svg.setAttribute("fill",   "var(--acento)");
      svg.setAttribute("stroke", "var(--acento)");
      idsFavoritos.add(id);
      mostrarToast("Agregado a favoritos ♥");
    }
  } catch (err) {
    mostrarToast(err.message || "Error", "error");
  }
}

//11 - Conteo de resultados
function actualizarConteo(n) {
  const el = document.querySelector(".toolbar-conteo");
  if (el) el.innerHTML = `Mostrando <strong>${n}</strong> producto${n !== 1 ? "s" : ""}`;
}

//12 - Buscador
function setupBuscador() {
  const input = document.querySelector(".buscador input");
  const btn   = document.querySelector(".buscador button");
  if (!input) return;
  input.addEventListener("input", aplicarFiltros);
  if (btn) btn.addEventListener("click", aplicarFiltros);
  input.addEventListener("keydown", e => { if (e.key === "Enter") aplicarFiltros(); });
}

//13 - Filtros
function setupFiltros() {
  document.querySelectorAll(".sidebar-filtros input[type='checkbox']").forEach(cb => {
    cb.addEventListener("change", aplicarFiltros);
  });
}

//14 - Ordenar
function setupOrdenar() {
  const sel = document.querySelector(".ordenar-select");
  if (!sel) return;
  sel.addEventListener("change", () => {
    const orden = sel.value;
    if (orden === "precio-asc")  todosLosProductos.sort((a, b) => a.precio - b.precio);
    if (orden === "precio-desc") todosLosProductos.sort((a, b) => b.precio - a.precio);
    aplicarFiltros();
  });
}

//15 - Limpiar filtros
function setupLimpiarFiltros() {
  const btn = document.getElementById("btn-limpiar-filtros");
  if (!btn) return;
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sidebar-filtros input[type='checkbox']").forEach(cb => cb.checked = false);
    const input = document.querySelector(".buscador input");
    if (input) input.value = "";
    history.replaceState(null, "", "index.html");
    aplicarFiltros();
  });
}
