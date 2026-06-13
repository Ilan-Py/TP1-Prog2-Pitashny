//Codigo por I L A N

//1 - Modo oscuro
function iniciarModoOscuro() {
  const guardado = localStorage.getItem("modoOscuro") === "true";
  if (guardado) document.body.classList.add("modo-oscuro");

  const btn = document.getElementById("btn-oscuro");
  if (!btn) return;

  actualizarIconoOscuro(btn, guardado);

  btn.addEventListener("click", () => {
    const activo = document.body.classList.toggle("modo-oscuro");
    localStorage.setItem("modoOscuro", activo);
    actualizarIconoOscuro(btn, activo);
  });
}

function actualizarIconoOscuro(btn, oscuro) {
  btn.innerHTML = oscuro
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>`;
}

//2 - Sesión en el header
function actualizarHeaderSesion() {
  const logueado = Api.estaLogueado();
  const esAdmin  = Api.esAdmin();

  const btnSesion = document.getElementById("btn-sesion");
  if (btnSesion) {
    if (logueado) {
      btnSesion.textContent = "Cerrar sesión";
      btnSesion.onclick = () => {
        Api.eliminarToken();
        Api.eliminarUsuario();
        window.location.href = "index.html";
      };
    } else {
      btnSesion.textContent = "Iniciar sesión";
      btnSesion.onclick = () => { window.location.href = "login.html"; };
    }
  }

  const btnAdmin = document.getElementById("btn-admin");
  if (btnAdmin) {
    if (esAdmin) {
      btnAdmin.classList.add("visible");
      btnAdmin.onclick = () => { window.location.href = "admin.html"; };
    }
  }

  if (logueado) actualizarBadgeCarrito();
}

//3 - Cargar categorías en el dropdown
async function cargarCategoriasDropdown() {
  const menu = document.getElementById("dropdown-menu");
  if (!menu) return;

  try {
    const res  = await Api.get("/obtenerCategorias", false);
    const cats = res.payload || [];
    if (!cats.length) return;

    menu.innerHTML = `<a href="index.html">Todos los productos</a>` +
      cats.map(c =>
        `<a href="index.html?categoria=${c.id_categoria}">${c.nombre}</a>`
      ).join("");
  } catch { /* silencioso */ }
}

//4 - Menú hamburguesa
function setupNavToggle() {
  const header = document.querySelector(".header");
  const toggle = document.getElementById("nav-toggle");
  if (!header || !toggle) return;

  toggle.addEventListener("click", () => {
    const abierto = header.classList.toggle("abierto");
    toggle.setAttribute("aria-expanded", abierto ? "true" : "false");
  });
}

//5 - Init
document.addEventListener("DOMContentLoaded", () => {
  iniciarModoOscuro();
  actualizarHeaderSesion();
  setupNavToggle();
  cargarCategoriasDropdown();
});
