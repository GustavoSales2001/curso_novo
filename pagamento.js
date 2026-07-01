// VERIFY_RELEASE_DB_CLIENT_V1
function iaGetBuyerEmailForPix() {
  const input = document.getElementById("iaBuyerEmail");
  const fromInput = String(input?.value || "").trim().toLowerCase();
  const stored = String(localStorage.getItem("influencer_academy_buyer_email") || "").trim().toLowerCase();

  return fromInput || stored;
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

  setTimeout(function () {
    await iaVerifyReleaseAndEnter(currentPaymentId);
  }, 900);

  return true;
}

document.addEventListener("DOMContentLoaded", function () {
  const input = document.getElementById("iaBuyerEmail");
  const stored = localStorage.getItem("influencer_academy_buyer_email");

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
      email: "",
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

// AUTO_PAYMENT_REDIRECT_FIX_V1
if (localStorage.getItem("influencer_academy_access_released") === "1") {
  await iaVerifyReleaseAndEnter(currentPaymentId);
}
const RAILWAY_API = "https://cursonovo-production.up.railway.app";

const API_BASE =
  location.protocol === "file:" ||
  location.hostname.includes("github.io")
    ? RAILWAY_API
    : "";

const PRICE = 39.99;

let currentPaymentId = null;

const generatePixBtn = document.getElementById("generatePixBtn");
const statusBox = document.getElementById("statusBox");
const pixResult = document.getElementById("pixResult");
const qrCodeImage = document.getElementById("qrCodeImage");
const pixCode = document.getElementById("pixCode");
const copyPixBtn = document.getElementById("copyPixBtn");
const checkPaymentBtn = document.getElementById("checkPaymentBtn");

function setStatus(message, type = "") {
  statusBox.className = "status-box";
  if (type) statusBox.classList.add(type);
  statusBox.textContent = message;
  statusBox.classList.remove("hidden");
}

function clearStatus() {
  statusBox.classList.add("hidden");
  statusBox.textContent = "";
}

async function generatePix() {
  const buyerEmailBeforePix = iaSaveBuyerEmailForPix();
  if (!buyerEmailBeforePix) {
    setStatus("Digite o e-mail do aluno antes de gerar o PIX. Esse e-mail será usado para liberar o acesso.", "error");
    return;
  }
  clearStatus();
  pixResult.classList.add("hidden");

  generatePixBtn.disabled = true;
  generatePixBtn.textContent = "Gerando QR Code...";

  try {
    const response = await fetch(`${API_BASE}/payments/create-pix`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: PRICE,
        description: "Influencer Academy - acesso completo",
        email: buyerEmailBeforePix
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      throw new Error(data.message || data.error || "Não consegui gerar o PIX agora.");
    }

    currentPaymentId = data.payment_id;

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
    const response = await fetch(`${API_BASE}/payments/status/${currentPaymentId}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Não consegui consultar o pagamento.");
    }

    if (data.status === "approved") {
      localStorage.setItem("influencer_academy_payment_approved", "1");
      localStorage.setItem("influencer_academy_access_released", "1");

      setStatus("Pagamento aprovado. Redirecionando para criar sua conta...", "success");

      setTimeout(() => {
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

generatePixBtn.addEventListener("click", generatePix);
copyPixBtn.addEventListener("click", copyPix);
checkPaymentBtn.addEventListener("click", checkPayment);




