(function () {
  function norm(text) {
    return String(text || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function findEmailInput() {
    const inputs = Array.from(document.querySelectorAll("input"));

    return (
      inputs.find(i => norm(i.type) === "email") ||
      inputs.find(i => norm(i.name).includes("email")) ||
      inputs.find(i => norm(i.id).includes("email")) ||
      inputs.find(i => norm(i.placeholder).includes("email"))
    );
  }

  function saveEmail() {
    const input = findEmailInput();
    const email = String(input?.value || "").trim().toLowerCase();

    if (!email || !email.includes("@")) return;

    localStorage.setItem("influencer_academy_student_email", email);
    localStorage.setItem("influencer_academy_buyer_email", email);
    localStorage.setItem("student_email", email);

    try {
      const current = JSON.parse(localStorage.getItem("influencer_academy_user") || "{}");
      current.email = email;
      localStorage.setItem("influencer_academy_user", JSON.stringify(current));
      localStorage.setItem("currentUser", JSON.stringify(current));
    } catch (_) {}
  }

  function boot() {
    const input = findEmailInput();

    if (input) {
      input.addEventListener("input", saveEmail);
      input.addEventListener("change", saveEmail);
    }

    document.addEventListener("submit", saveEmail, true);
    document.addEventListener("click", function (event) {
      const btn = event.target.closest("button, input[type='submit'], a");
      if (!btn) return;

      const text = norm(btn.innerText || btn.value || btn.textContent);

      if (
        text.includes("criar") ||
        text.includes("cadastrar") ||
        text.includes("minha conta") ||
        text.includes("acesso")
      ) {
        saveEmail();
      }
    }, true);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
