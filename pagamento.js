// VERIFY_RELEASE_DB_CLIENT_V1
function iaGetBuyerEmailForPix() {
  const input = document.getElementById("iaBuyerEmail");
  const fromInput = String(input?.value || "").trim().toLowerCase();
  
  // Tenta pegar o e-mail salvo da tela de cadastro
  const storedCadastro = String(localStorage.getItem("ia_user_email") || "").trim().toLowerCase();
  const storedPix = String(localStorage.getItem("influencer_academy_buyer_email") || "").trim().toLowerCase();

  return fromInput || storedCadastro || storedPix;
}

function iaSaveBuyerEmailForPix() {
  const email = iaGetBuyerEmailForPix();
  if (email) {
    localStorage.setItem("influencer_academy_buyer_email", email);
  }
  return email;
}

async function iaVerifyReleaseAndEnter(paymentId) {
  const email = iaSaveBuyerEmailForPix();

  if (!email) {
    setStatus("Digite o e-mail do aluno antes de verificar o pagamento. É esse e-mail que será liberado no curso.", "error");
    return false;
  }

  const response = await fetch(`${API_BASE}/api/payments/verify-release`, {
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

  if (!response.ok || !data.ok || !data.released) {
    throw new Error(data.message || "Pagamento aprovado, mas não consegui liberar o acesso no banco.");
  }

  localStorage.setItem("influencer_academy_payment_id", String(paymentId || ""));
  localStorage.setItem("influencer_academy_payment_approved", "1");
  localStorage.setItem("influencer_academy_access_released", "1");
  localStorage.setItem("influencer_academy_paid_access", "1");
  localStorage.setItem("access_released", "1");
  localStorage.setItem("curso_novo_access", "released");
  localStorage.setItem("student_access_granted", "1");
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("user_logged_in", "1");
  localStorage.setItem("aluno_logado", "1");

  const aluno = {
    name: "Aluno(a)",
    email,
    access_released: true,
    payment_approved: true,
    payment_id: String(paymentId || ""),
    created_at: new Date().toISOString()
  };

  localStorage.setItem("influencer_academy_user", JSON.stringify(aluno));
  localStorage.setItem("influencerAcademyUser", JSON.stringify(aluno));
  localStorage.setItem("currentUser", JSON.stringify(aluno));

  setStatus("Pagamento aprovado e acesso liberado. Entrando na área do aluno...", "success");

  // Correção do erro de await dentro de função síncrona
  setTimeout(async () => {
    window.location.href = "area.html?paid=1#home";
  }, 900);

  return true;
}

document.addEventListener("DOMContentLoaded", function () {
  const input = document.getElementById("iaBuyerEmail");
  const stored = localStorage.getItem("influencer_academy_buyer_email") || localStorage.getItem("ia_user_email");

  if (input && stored && !input.value) {
    input.value = stored;
  }

  if (input) {
    input.addEventListener("input", iaSaveBuyerEmailForPix);
  }
});

// PAGAMENTO_DIRETO_AREA_ALUNO_V1
function iaLiberarAcessoEEntrarNaArea(paymentId) {
  const id = String(paymentId || "");

  localStorage.setItem("influencer_academy_payment_id", id);
  localStorage.setItem("influencer_academy_payment_approved", "1");
  localStorage.setItem("influencer_academy_access_released", "1");
  localStorage.setItem("influencer_academy_paid_access", "1");

  localStorage.setItem("access_released", "1");
  localStorage.setItem("curso_novo_access", "released");
  localStorage.setItem("student_access_granted", "1");
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("user_logged_in", "1");
  localStorage.setItem("aluno_logado", "1");

  const alunoAtual = localStorage.getItem("influencer_academy_user");

  if (!alunoAtual) {
    const aluno = {
      name: "Aluno(a)",
      email: iaGetBuyerEmailForPix() || "",
      access_released: true,
      payment_approved: true,
      payment_id: id,
      created_at: new Date().toISOString()
    };

    localStorage.setItem("influencer_academy_user", JSON.stringify(aluno));
    localStorage.setItem("influencerAcademyUser", JSON.stringify(aluno));
    localStorage.setItem("currentUser", JSON.stringify(aluno));
  }

  const destino = id
    ? "area.html?paid=1&payment_id=" + encodeURIComponent(id) + "#home"
    : "area.html?paid=1#home";

  window.location.href = destino;
}

const RAILWAY_API = "https://cursonovo-production.up.railway.app";
const API_BASE = RAILWAY_API; // Forçando a URL correta para evitar erros no GitHub Pages

let currentPaymentId = null;

// AUTO_PAYMENT_REDIRECT_FIX_V1 (Correção do erro do top-level await)
if (localStorage.getItem("influencer_academy_access_released") === "1") {
  // Redireciona direto se já tem acesso
  window.location.href = "area.html?paid=1#home";
}

const generatePixBtn = document.getElementById("generatePixBtn");
const statusBox = document.getElementById("statusBox");
const pixResult = document.getElementById("pixResult");
const qrCodeImage = document.getElementById("qrCodeImage");
const pixCode = document.getElementById("pixCode");
const copyPixBtn = document.getElementById("copyPixBtn");
const checkPaymentBtn = document.getElementById("checkPaymentBtn");

function setStatus(message, type = "") {
  if (!statusBox) return;
  statusBox.className = "status-box";
  if (type) statusBox.classList.add(type);
  statusBox.textContent = message;
  statusBox.classList.remove("hidden");
}

function clearStatus() {
  if (!statusBox) return;
  statusBox.classList.add("hidden");
  statusBox.textContent = "";
}

async function generatePix() {
  const buyerEmailBeforePix = iaSaveBuyerEmailForPix();
  if (!buyerEmailBeforePix) {
    setStatus("Erro: E-mail não encontrado. Volte para a página de cadastro.", "error");
    return;
  }
  
  clearStatus();
  pixResult.classList.add("hidden");

  generatePixBtn.disabled = true;
  generatePixBtn.textContent = "Gerando QR Code...";

  // 1. Pega informações de cupom e cronômetro do LocalStorage
  const deadlineKey = "influencerCountdownDeadline";
  const deadline = localStorage.getItem(deadlineKey);
  const isExpired = deadline ? Date.now() > new Date(deadline).getTime() : false;
  const isCouponActive = localStorage.getItem("influencerCouponApplied") === "true";

  try {
    // Aponta para a rota correta do app.js (/api/payments/pix)
    const response = await fetch(`${API_BASE}/api/payments/pix`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        payer: { email: buyerEmailBeforePix }, // Envia o email no formato exigido pelo app.js
        coupon_applied: isCouponActive,        // Envia o status do cupom
        is_expired: isExpired                  // Envia se o prazo acabou
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.error || "Não consegui gerar o PIX agora.");
    }

    currentPaymentId = data.id || data.payment_id;

    // Adapta para o retorno do Mercado Pago / seu backend
    qrCodeImage.src = `data:image/png;base64,${data.qr_code_base64}`;
    pixCode.value = data.qr_code || "";

    pixResult.classList.remove("hidden");

    setStatus("QR Code gerado. Agora pague pelo app do seu banco e depois clique em verificar acesso.", "success");
  } catch (error) {
    setStatus(error.message || "Erro ao gerar PIX. Tente novamente.", "error");
  } finally {
    generatePixBtn.disabled = false;
    generatePixBtn.textContent = "Gerar novo QR Code PIX";
  }
}

async function copyPix() {
  try {
    await navigator.clipboard.writeText(pixCode.value);
    setStatus("Código PIX copiado.", "success");
  } catch (_) {
    pixCode.select();
    document.execCommand("copy");
    setStatus("Código PIX copiado.", "success");
  }
}

async function checkPayment() {
  if (!currentPaymentId) {
    setStatus("Gere o PIX primeiro para consultar o pagamento.", "error");
    return;
  }

  checkPaymentBtn.disabled = true;
  checkPaymentBtn.textContent = "Verificando...";

  try {
    // Rota de verificação de status (ajuste /api/ se necessário)
    const response = await fetch(`${API_BASE}/api/payments/status/${currentPaymentId}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Não consegui consultar o pagamento.");
    }

    if (data.status === "approved") {
      localStorage.setItem("influencer_academy_payment_approved", "1");
      localStorage.setItem("influencer_academy_access_released", "1");

      setStatus("Pagamento aprovado. Redirecionando para a área de membros...", "success");

      // Correção do await dentro do setTimeout
      setTimeout(async () => {
        localStorage.setItem("influencer_academy_payment_id", String(currentPaymentId || ""));
        localStorage.setItem("influencer_academy_payment_approved", "1");
        await iaVerifyReleaseAndEnter(currentPaymentId);
      }, 1200);

      return;
    }

    setStatus("Pagamento ainda não aprovado. Aguarde alguns segundos e tente novamente.", "");
  } catch (error) {
    setStatus(error.message || "Erro ao verificar pagamento.", "error");
  } finally {
    checkPaymentBtn.disabled = false;
    checkPaymentBtn.textContent = "Já paguei, verificar acesso";
  }
}

if (generatePixBtn) generatePixBtn.addEventListener("click", generatePix);
if (copyPixBtn) copyPixBtn.addEventListener("click", copyPix);
if (checkPaymentBtn) checkPaymentBtn.addEventListener("click", checkPayment);