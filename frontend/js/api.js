//Codigo por I L A N

//1 - URL base del backend
const API_BASE = "http://localhost:4000/api";

//2 - Módulo de API
const Api = {

  //--Sesión--
  obtenerToken()      { return localStorage.getItem("token"); },
  guardarToken(t)     { localStorage.setItem("token", t); },
  eliminarToken()     { localStorage.removeItem("token"); },

  obtenerUsuario()    {
    const u = localStorage.getItem("usuario");
    return u ? JSON.parse(u) : null;
  },
  guardarUsuario(u)   { localStorage.setItem("usuario", JSON.stringify(u)); },
  eliminarUsuario()   { localStorage.removeItem("usuario"); },

  estaLogueado()      { return !!this.obtenerToken(); },
  esAdmin()           {
    const u = this.obtenerUsuario();
    return u && (u.rol === "administrador" || u.rol === "admin");
  },

  //--Fetch genérico--
  async request(metodo, endpoint, body = null, requiereAuth = true) {
    const headers = { "Content-Type": "application/json" };

    if (requiereAuth) {
      const token = this.obtenerToken();
      if (token) headers["Authorization"] = token;
    }

    const config = { method: metodo, headers };
    if (body) config.body = JSON.stringify(body);

    const res  = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.mensaje || data.error || `Error ${res.status}`);
    if (data.codigo !== undefined && data.codigo !== 200) {
      throw new Error(data.mensaje || `Error código ${data.codigo}`);
    }
    return data;
  },

  get(endpoint, auth = true)         { return this.request("GET",    endpoint, null, auth); },
  post(endpoint, body, auth = true)  { return this.request("POST",   endpoint, body, auth); },
  put(endpoint, body)                { return this.request("PUT",    endpoint, body, true); },
  delete(endpoint, body)             { return this.request("DELETE", endpoint, body, true); },

  //--Cuotas--
  TASAS_CUOTA: { 1: 1, 3: 1, 6: 1.15, 9: 1.18, 12: 1.22 },

  calcularTotalCuota(precio, n) {
    return Math.ceil(precio * (this.TASAS_CUOTA[n] || 1));
  },
  calcularValorCuota(precio, n) {
    return Math.ceil(this.calcularTotalCuota(precio, n) / n);
  },
};

//3 - Toast
function mostrarToast(mensaje, tipo = "exito") {
  let contenedor = document.getElementById("toast-contenedor");
  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "toast-contenedor";
    document.body.appendChild(contenedor);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensaje;
  contenedor.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

//4 - Imagen fallback
function imgFallback(img) {
  img.onerror = null;
  img.removeAttribute("onerror");
  img.src = "/img/default.png";
}

//5 - Formatear precio
function formatearPrecio(n) {
  return "$" + Number(n).toLocaleString("es-AR");
}

//6 - Actualizar badge del carrito
async function actualizarBadgeCarrito() {
  try {
    const usuario = Api.obtenerUsuario();
    if (!usuario) return;
    const res   = await Api.get(`/obtenerProductosCarrito/${usuario.id_usuario || usuario.id}`);
    const items = res.payload || [];
    const badge = document.querySelector(".badge-carrito");
    if (!badge) return;
    badge.textContent    = items.length;
    badge.style.display  = items.length > 0 ? "" : "none";
  } catch { /* silencioso */ }
}
