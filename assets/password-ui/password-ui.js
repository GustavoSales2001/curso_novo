(function () {
  const isRegisterPage = location.pathname.toLowerCase().includes("cadastro");
  const isLoginPage = location.pathname.toLowerCase().includes("login");

  if (!isRegisterPage && !isLoginPage) return;

  function norm(text) {
    return String(text || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function getPasswordInputs() {
    return Array.from(document.querySelectorAll("input")).filter(input => {
      const type = norm(input.type);
      const name = norm(input.name);
      const id = norm(input.id);
      const placeholder = norm(input.placeholder);

      return (
        type === "password" ||
        name.includes("senha") ||
        name.includes("password") ||
        id.includes("senha") ||
        id.includes("password") ||
        placeholder.includes("senha") ||
        placeholder.includes("password")
      );
    });
  }

  function wrapPasswordInput(input) {
    if (!input || input.dataset.iaPasswordReady === "1") return;

    input.dataset.iaPasswordReady = "1";

    const wrapper = document.createElement("div");
    wrapper.className = "ia-password-field";

    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ia-password-toggle";
    btn.setAttribute("aria-label", "Mostrar senha");
    btn.innerHTML = "👁";

    btn.addEventListener("click", function () {
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      btn.innerHTML = visible ? "👁" : "🙈";
      btn.setAttribute("aria-label", visible ? "Mostrar senha" : "Ocultar senha");
    });

    wrapper.appendChild(btn);
  }

  function findMainPasswordInput() {
    const inputs = getPasswordInputs();

    return inputs.find(input => {
      const id = norm(input.id);
      const name = norm(input.name);
      const placeholder = norm(input.placeholder);

      return !id.includes("confirm") &&
             !name.includes("confirm") &&
             !placeholder.includes("confirm") &&
             !placeholder.includes("repita");
    }) || inputs[0];
  }

  function findConfirmInput() {
    return document.querySelector("#confirmarSenha, input[name='confirmarSenha'], input[data-confirm-password='1']");
  }

  function createConfirmPassword() {
    if (!isRegisterPage) return;

    const passwordInput = findMainPasswordInput();
    if (!passwordInput) return;

    if (findConfirmInput()) return;

    const block = document.createElement("div");
    block.className = "ia-confirm-block";
    block.innerHTML = `
      <label for="confirmarSenha">Confirmar senha *</label>
      <input 
        type="password" 
        id="confirmarSenha" 
        name="confirmarSenha" 
        data-confirm-password="1"
        placeholder="Digite a senha novamente"
        autocomplete="new-password"
        required
      >
      <div class="ia-password-hint">
        Digite a mesma senha duas vezes para evitar erro no acesso.
      </div>
    `;

    const passwordWrapper = passwordInput.closest(".ia-password-field");
    const passwordContainer =
      passwordWrapper?.parentElement ||
      passwordInput.closest(".form-group, .input-group, .field, .campo, label, div") ||
      passwordInput.parentElement;

    passwordContainer.insertAdjacentElement("afterend", block);

    const confirmInput = block.querySelector("input");
    wrapPasswordInput(confirmInput);

    passwordInput.addEventListener("input", validatePasswordsSoft);
    confirmInput.addEventListener("input", validatePasswordsSoft);
  }

  function getMessageBox() {
    let box = document.querySelector("#iaPasswordMessage");

    if (!box) {
      box = document.createElement("div");
      box.id = "iaPasswordMessage";

      const confirmInput = findConfirmInput();
      const target = confirmInput?.closest(".ia-confirm-block") || confirmInput?.parentElement;

      if (target) {
        target.appendChild(box);
      }
    }

    return box;
  }

  function validatePasswords(showSuccess) {
    if (!isRegisterPage) return true;

    const passwordInput = findMainPasswordInput();
    const confirmInput = findConfirmInput();

    if (!passwordInput || !confirmInput) return true;

    const password = passwordInput.value.trim();
    const confirm = confirmInput.value.trim();
    const box = getMessageBox();

    box.className = "";
    box.textContent = "";

    if (!password || !confirm) {
      if (showSuccess) {
        box.className = "ia-password-error";
        box.textContent = "Preencha a senha e confirme digitando a mesma senha novamente.";
      }
      return false;
    }

    if (password !== confirm) {
      box.className = "ia-password-error";
      box.textContent = "As senhas não conferem. Digite a mesma senha nos dois campos.";
      confirmInput.focus();
      return false;
    }

    if (password.length < 8) {
      box.className = "ia-password-error";
      box.textContent = "Use uma senha com pelo menos 8 caracteres.";
      passwordInput.focus();
      return false;
    }

    if (showSuccess) {
      box.className = "ia-password-ok";
      box.textContent = "Senha confirmada com sucesso.";
    }

    return true;
  }

  function validatePasswordsSoft() {
    const passwordInput = findMainPasswordInput();
    const confirmInput = findConfirmInput();

    if (!passwordInput || !confirmInput) return;

    if (passwordInput.value && confirmInput.value) {
      validatePasswords(true);
    }
  }

  function interceptRegisterSubmit() {
    if (!isRegisterPage) return;

    document.addEventListener("submit", function (event) {
      if (!validatePasswords(true)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    }, true);

    document.addEventListener("click", function (event) {
      const btn = event.target.closest("button, input[type='submit'], a");
      if (!btn) return;

      const text = norm(btn.innerText || btn.value || btn.textContent);

      const isCreateButton =
        text.includes("criar") ||
        text.includes("cadastrar") ||
        text.includes("minha conta") ||
        text.includes("acesso");

      if (!isCreateButton) return;

      if (!validatePasswords(true)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    }, true);
  }

  function boot() {
    getPasswordInputs().forEach(wrapPasswordInput);
    createConfirmPassword();
    interceptRegisterSubmit();
  }

  document.addEventListener("DOMContentLoaded", function () {
    boot();
    setTimeout(boot, 300);
    setTimeout(boot, 900);
  });
})();

