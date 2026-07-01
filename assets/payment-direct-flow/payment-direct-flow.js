(function () {
  const API_BASE =
    location.protocol === "file:" || location.hostname.includes("github.io")
      ? "https://cursonovo-production.up.railway.app"
      : "";

  function getStudentEmail() {
    const keys = [
      "influencer_academy_student_email",
      "influencer_academy_buyer_email",
      "student_email"
    ];

    for (const key of keys) {
      const value = String(localStorage.getItem(key) || "").trim().toLowerCase();
      if (value && value.includes("@")) return value;
    }

    const jsonKeys = [
      "influencer_academy_user",
      "influencerAcademyUser",
      "currentUser",
      "user"
    ];

    for (const key of jsonKeys) {
      try {
        const obj = JSON.parse(localStorage.getItem(key) || "{}");
        const email = String(obj.email || obj.user_email || "").trim().toLowerCase();
        if (email && email.includes("@")) return email;
      } catch (_) {}
    }

    return "";
  }

  function findButton(words) {
    const items = Array.from(document.querySelectorAll("button, a, input[type='button'], input[type='submit']"));

    return items.find(el => {
      const text = String(el.innerText || el.value || el.textContent || "").toLowerCase();
      return words.some(word => text.includes(word));
    });
  }

  function ensureBox() {
    let box = document.getElementById("iaPaymentDirectBox");

    if (box) return box;

    const generateBtn =
      document.getElementById("generatePixBtn") ||
      findButton(["gerar qr", "gerar pix", "qr code pix"]);

    box = document.createElement("div");
    box.id = "iaPaymentDirectBox";
    box.className = "ia-payment-direct-box";
    box.innerHTML = `
      <div id="iaPaymentDirectStatus" class="ia-payment-direct-status">
        Clique em gerar QR Code PIX para criar o pagamento.
      </div>

      <div id="iaPaymentDirectQr" class="ia-payment-direct-qr" style="display:none;"></div>

      <div class="ia-payment-direct-actions">
        <button type="button" id="iaVerifyPixDirect" class="secondary">Já paguei, verificar acesso</button>
      </div>
    `;

    if (generateBtn) {
      generateBtn.insertAdjacentElement("afterend", box);
    } else {
      document.body.appendChild(box);
    }

    return box;
  }

  function setStatus(message, type) {
    ensureBox();

    const status = document.getElementById("iaPaymentDirectStatus");
    if (!status) return;

    status.className = "ia-payment-direct-status";
    if (type) status.classList.add(type);
    status.textContent = message;
  }

  function renderQr(data) {
    ensureBox();

    const qr = document.getElementById("iaPaymentDirectQr");
    if (!qr) return;

    const img = data.qr_code_base64
      ? `<img src="data:image/png;base64,${data.qr_code_base64}" alt="QR Code PIX">`
      : "";

    const code = data.qr_code
      ? `<textarea class="ia-payment-direct-code" readonly>${data.qr_code}</textarea>
         <button type="button" id="iaCopyPixCode">Copiar código PIX</button>`
      : "";

    qr.style.display = "grid";
    qr.innerHTML = `${img}${code}`;

    const copy = document.getElementById("iaCopyPixCode");
    if (copy && data.qr_code) {
      copy.addEventListener("click", async function () {
        await navigator.clipboard.writeText(data.qr_code);
        setStatus("Código PIX copiado. Agora é só pagar no app do banco.", "success");
      });
    }
  }

  async function createPixDirect(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    const email = getStudentEmail();

    if (!email) {
      setStatus("Não encontrei o e-mail do cadastro. Volte, crie sua conta primeiro e depois gere o PIX.", "error");
      return false;
    }

    setStatus("Gerando QR Code PIX...", "");

    const response = await fetch(`${API_BASE}/api/payments/create-pix-direct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      setStatus(data.message || "Erro ao gerar QR Code PIX.", "error");
      return false;
    }

    localStorage.setItem("influencer_academy_payment_id", String(data.payment_id || ""));
    localStorage.setItem("influencer_academy_student_email", email);

    renderQr(data);

    setStatus("QR Code gerado. Após pagar, clique em verificar acesso.", "success");

    return false;
  }

  async function verifyPixDirect(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    const paymentId = String(localStorage.getItem("influencer_academy_payment_id") || "").trim();

    if (!paymentId) {
      setStatus("Nenhum PIX foi gerado ainda. Gere o QR Code primeiro.", "error");
      return false;
    }

    setStatus("Verificando pagamento e liberando acesso...", "");

    const response = await fetch(`${API_BASE}/api/payments/check-pix-direct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        payment_id: paymentId
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.released) {
      setStatus(data.message || "Pagamento ainda não identificado como aprovado.", "error");
      return false;
    }

    localStorage.setItem("influencer_academy_access_released", "1");
    localStorage.setItem("access_released", "1");
    localStorage.setItem("student_access_granted", "1");
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("user_logged_in", "1");
    localStorage.setItem("aluno_logado", "1");

    setStatus("Pagamento aprovado. Acesso liberado. Entrando na área do aluno...", "success");

    setTimeout(function () {
      window.location.href = "area.html#home";
    }, 900);

    return false;
  }

  function removeEmailBox() {
    document.querySelectorAll(".pix-buyer-box").forEach(el => el.remove());
  }

  function bindButtons() {
    removeEmailBox();
    ensureBox();

    const generateBtn =
      document.getElementById("generatePixBtn") ||
      findButton(["gerar qr", "gerar pix", "qr code pix"]);

    const verifyBtn =
      document.getElementById("iaVerifyPixDirect") ||
      findButton(["verificar acesso", "já paguei", "ja paguei", "verificar pagamento"]);

    if (generateBtn && generateBtn.dataset.iaDirectBound !== "1") {
      generateBtn.dataset.iaDirectBound = "1";
      generateBtn.onclick = null;
      generateBtn.addEventListener("click", createPixDirect, true);
    }

    if (verifyBtn && verifyBtn.dataset.iaDirectBound !== "1") {
      verifyBtn.dataset.iaDirectBound = "1";
      verifyBtn.onclick = null;
      verifyBtn.addEventListener("click", verifyPixDirect, true);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindButtons();
    setTimeout(bindButtons, 400);
    setTimeout(bindButtons, 1200);
  });

  if (document.readyState !== "loading") {
    bindButtons();
  }
})();
