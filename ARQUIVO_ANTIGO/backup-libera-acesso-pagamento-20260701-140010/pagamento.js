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
        description: "Influencer Academy - acesso completo"
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
        window.location.href = "cadastro.html?paid=1";
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

