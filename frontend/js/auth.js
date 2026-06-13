//Codigo por I L A N

//1 - Login
document.addEventListener("DOMContentLoaded", () => {
  const formLogin = document.getElementById("form-login");
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      limpiarError(formLogin);

      const email    = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;

      if (!email || !password) {
        mostrarErrorForm(formLogin, "Completá todos los campos.");
        return;
      }

      setLoading(formLogin, true, "Ingresando...");
      try {
        const res = await Api.post("/login", { email, password }, false);

        if (!res.jwt || res.codigo !== 200) {
          throw new Error(res.mensaje || "Email o contraseña incorrectos.");
        }

        const usuario = res.payload?.[0] ?? { email, rol: "usuario" };
        Api.guardarToken(res.jwt);
        Api.guardarUsuario({ ...usuario, id: usuario.id_usuario });

        window.location.href = "index.html";
      } catch (err) {
        mostrarErrorForm(formLogin, err.message || "Email o contraseña incorrectos.");
      } finally {
        setLoading(formLogin, false, "Iniciar sesión");
      }
    });
  }

  //2 - Registro
  const formRegistro = document.getElementById("form-registro");
  if (formRegistro) {
    formRegistro.addEventListener("submit", async (e) => {
      e.preventDefault();
      limpiarError(formRegistro);

      const nombre    = document.getElementById("reg-nombre").value.trim();
      const apellido  = document.getElementById("reg-apellido").value.trim();
      const email     = document.getElementById("reg-email").value.trim();
      const telefono  = document.getElementById("reg-telefono").value.trim();
      const direccion = document.getElementById("reg-direccion").value.trim();
      const password  = document.getElementById("reg-password").value;
      const password2 = document.getElementById("reg-password2").value;

      if (!nombre || !apellido || !email || !telefono || !direccion || !password) {
        mostrarErrorForm(formRegistro, "Completá todos los campos.");
        return;
      }
      if (password !== password2) {
        mostrarErrorForm(formRegistro, "Las contraseñas no coinciden.");
        return;
      }
      if (password.length < 6) {
        mostrarErrorForm(formRegistro, "La contraseña debe tener al menos 6 caracteres.");
        return;
      }

      setLoading(formRegistro, true, "Creando cuenta...");
      try {
        await Api.post("/registrarUsuario", {
          nombre, apellido, email, telefono, direccion,
          password, rol: "usuario"
        }, false);

        mostrarToast("Cuenta creada. ¡Ya podés iniciar sesión!");
        setTimeout(() => { window.location.href = "login.html"; }, 1500);
      } catch (err) {
        mostrarErrorForm(formRegistro, err.message || "Error al crear la cuenta.");
      } finally {
        setLoading(formRegistro, false, "Crear cuenta");
      }
    });
  }
});

//3 - Helpers
function mostrarErrorForm(form, msg) {
  let el = form.querySelector(".alerta-error-form");
  if (!el) {
    el = document.createElement("div");
    el.className = "alerta alerta-error alerta-error-form";
    form.prepend(el);
  }
  el.textContent = msg;
}

function limpiarError(form) {
  form.querySelector(".alerta-error-form")?.remove();
}

function setLoading(form, cargando, label) {
  const btn = form.querySelector("button[type='submit']");
  if (!btn) return;
  btn.disabled    = cargando;
  btn.textContent = label;
}
