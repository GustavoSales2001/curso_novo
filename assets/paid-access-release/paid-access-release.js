(function () {
  const API_BASE =
    location.protocol === "file:" || location.hostname.includes("github.io")
      ? "https://cursonovo-production.up.railway.app"
      : "";

  const params = new URLSearchParams(location.search);
  const paid = params.get("paid") === "1" || localStorage.getItem("influencer_academy_payment_approved") === "1";
  const paymentIdFromUrl = params.get("payment_id") || params.get("paymentId") || "";
  const storedPaymentId = localStorage.getItem("influencer_academy_payment_id") || "";
  const paymentId = paymentIdFromUrl || storedPaymentId;

  if (paymentId) {
    localStorage.setItem("influencer_academy_payment_id", paymentId);
  }

  if (!location.pathname.toLowerCase().includes("cadastro")) return;

  function normalize(text) {
    return String(text || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function getEmail() {
    const inputs = Array.from(document.querySelectorAll("input"));

    const emailInput =
      inputs.find(i => normalize(i.type) === "email") ||
      inputs.find(i => normalize(i.name).includes("email")) ||
      inputs.find(i => normalize(i.id).includes("email")) ||
      inputs.find(i => normalize(i.placeholder).includes("email"));

    return String(emailInput?.value || "").trim().toLowerCase();
  }

  function banner(message, type) {
    let box = document.querySelector("#iaPaidReleaseBanner");

    if (!box) {
      box = document.createElement("div");
      box.id = "iaPaidReleaseBanner";
      box.className = "ia-paid-release-banner";

      const form = document.querySelector("form");
      const title = document.querySelector("h1, h2");

      if (form) {
        form.insertBefore(box, form.firstChild);
      } else if (title) {
        title.insertAdjacentElement("afterend", box);
      } else {
        document.body.prepend(box);
      }
    }

    box.className = "ia-paid-release-banner";
    if (type) box.classList.add(type);
    box.textContent = message;
  }

  async function releaseAccess(email) {
    if (!paid) return { ok: false, message: "Pagamento ainda não identificado." };

    if (!paymentId) {
      return {
        ok: false,
        message: "Pagamento aprovado, mas o código do pagamento não foi encontrado. Volte para a tela de pagamento e clique em verificar acesso."
      };
    }

    if (!email) {
      return {
        ok: false,
        message: "Preencha o e-mail para liberar o acesso."
      };
    }

    banner("Pagamento identificado. Liberando seu acesso automaticamente...", "loading");

    const response = await fetch(`${API_BASE}/api/payments/release-access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        payment_id: paymentId
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Não consegui liberar o acesso automaticamente.");
    }

    localStorage.setItem("influencer_academy_access_released", "1");
    localStorage.setItem("influencer_academy_payment_approved", "1");

    banner("Acesso liberado com sucesso. Entrando na área do aluno...", "");

    setTimeout(function () {
      window.location.href = "area.html#home";
    }, 900);

    return data;
  }

  async function tryReleaseAfterCadastro() {
    const email = getEmail();

    if (!email) {
      banner("Pagamento identificado. Preencha o cadastro com o mesmo e-mail usado na compra para liberar o acesso.", "loading");
      return;
    }

    try {
      await releaseAccess(email);
    } catch (error) {
      banner(error.message || "Não consegui liberar o acesso automaticamente.", "error");
    }
  }

  function installFetchWatcher() {
    const originalFetch = window.fetch;

    window.fetch = async function () {
      const args = arguments;
      const response = await originalFetch.apply(this, args);

      try {
        const url = String(args[0] || "");
        const method = String(args[1]?.method || "GET").toUpperCase();

        const looksLikeCadastro =
          method === "POST" &&
          (
            url.includes("cadastro") ||
            url.includes("register") ||
            url.includes("signup") ||
            url.includes("users") ||
            url.includes("leads")
          );

        if (looksLikeCadastro && response.ok && paid) {
          setTimeout(tryReleaseAfterCadastro, 350);
        }
      } catch (_) {}

      return response;
    };
  }

  function stopRedirectBackToPayment() {
    if (!paid) return;

    const originalAssign = window.location.assign.bind(window.location);
    const originalReplace = window.location.replace.bind(window.location);

    window.location.assign = function (url) {
      const target = String(url || "");

      if (target.includes("pagamento.html")) {
        tryReleaseAfterCadastro();
        return;
      }

      return originalAssign(url);
    };

    window.location.replace = function (url) {
      const target = String(url || "");

      if (target.includes("pagamento.html")) {
        tryReleaseAfterCadastro();
        return;
      }

      return originalReplace(url);
    };
  }

  function interceptButtons() {
    document.addEventListener("click", function (event) {
      const btn = event.target.closest("button, input[type='submit'], a");
      if (!btn) return;

      const text = normalize(btn.innerText || btn.value || btn.textContent);

      const isCreate =
        text.includes("criar") ||
        text.includes("cadastrar") ||
        text.includes("conta") ||
        text.includes("acesso");

      if (!isCreate || !paid) return;

      setTimeout(tryReleaseAfterCadastro, 1200);
      setTimeout(tryReleaseAfterCadastro, 2500);
    }, true);
  }

  function boot() {
    if (paid) {
      banner("Pagamento identificado. Finalize o cadastro para liberar seu acesso automaticamente.", "loading");
    }

    installFetchWatcher();
    stopRedirectBackToPayment();
    interceptButtons();

    window.IAReleasePaidAccess = tryReleaseAfterCadastro;
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
