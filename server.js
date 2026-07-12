import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import crypto from "crypto";
import { MercadoPagoConfig, Payment } from "mercadopago";
import handleIncomingMessage from "./messageHandler.js";
import siteChatRoutes from "./siteChatRoutes.js";

const BOT_VERSION = "influencer-academy-whatsapp-v9-grandao-limpo";
const COURSE_NAME_SAFE = "Influencer Academy";
const COURSE_URL_SAFE = "https://influenceracademy.site";
const COURSE_PRICE_SAFE = "R$ 39,99";

dotenv.config();

const app = express();
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const port = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.use(express.json());
app.use("/api", siteChatRoutes);
app.get("/api/bot-version", (req, res) => {
  res.json({
    ok: true,
    bot_version: BOT_VERSION,
    course_name: COURSE_NAME_SAFE,
    course_url: COURSE_URL_SAFE,
    price: COURSE_PRICE_SAFE,
    message: "Bot Influencer Academy ativo"
  });
});


function cleanEnv(value = "") {
  return String(value || "")
    .trim()
    .replace(/^"(.*)"$/, "$1")
    .replace(/^'(.*)'$/, "$1")
    .trim();
}

const allowedOrigins = cleanEnv(process.env.FRONTEND_URL)
  .split(",")
  .map((v) => cleanEnv(v))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
if (!origin || origin === "null") return callback(null, true);
      const allowed = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://gustavosales2001.github.io",
        "https://influenceracademy.site" // ADICIONE ESTA LINHA
      ];

      if (allowed.includes(origin)) {
        return callback(null, true);
      }

      console.log("CORS bloqueado:", origin);
      return callback(new Error("Origem não permitida pelo CORS."));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  })
);

if (!cleanEnv(process.env.MERCADO_PAGO_ACCESS_TOKEN)) {
  throw new Error("Defina MERCADO_PAGO_ACCESS_TOKEN no .env");
}

const client = new MercadoPagoConfig({
  accessToken: cleanEnv(process.env.MERCADO_PAGO_ACCESS_TOKEN),
  options: { timeout: 5000 }
});

const paymentClient = new Payment(client);

const COURSE_NAME = "Influencer Academy";
const COURSE_DESCRIPTION = "Influencer Academy - Curso de crescimento, conteúdo e presença digital";
const COURSE_PRICE = 39.99;
const COURSE_FRONTEND_URL = "https://influenceracademy.site";

let pool;
let whatsappJobRunning = false;

function getWhatsAppConfig() {
  const token = cleanEnv(process.env.WHATSAPP_TOKEN);
  const phoneNumberId = cleanEnv(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const templateName = cleanEnv(process.env.WHATSAPP_TEMPLATE_NAME) || "hello_world";
  const verifyToken = cleanEnv(process.env.WHATSAPP_VERIFY_TOKEN);
  const apiVersion = cleanEnv(process.env.WHATSAPP_API_VERSION) || "v25.0";
  const templateLanguage = cleanEnv(process.env.WHATSAPP_TEMPLATE_LANGUAGE) || "en_US";

  return {
    token,
    phoneNumberId,
    templateName,
    verifyToken,
    apiVersion,
    templateLanguage
  };
}

function getWhatsAppMessagesUrl() {
  const { phoneNumberId, apiVersion } = getWhatsAppConfig();

  if (!phoneNumberId) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID não configurado.");
  }

  return `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
}

async function initDB() {
  pool = mysql.createPool({
    host: cleanEnv(process.env.MYSQLHOST),
    port: Number(cleanEnv(process.env.MYSQLPORT) || 3306),
    user: cleanEnv(process.env.MYSQLUSER),
    password: cleanEnv(process.env.MYSQLPASSWORD),
    database: cleanEnv(process.env.MYSQL_DATABASE),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  console.log("MYSQLHOST:", cleanEnv(process.env.MYSQLHOST));
  console.log("MYSQLPORT:", cleanEnv(process.env.MYSQLPORT));
  console.log("MYSQLUSER:", cleanEnv(process.env.MYSQLUSER));
  console.log("MYSQL_DATABASE:", cleanEnv(process.env.MYSQL_DATABASE));

  await pool.query("SELECT 1");
  console.log("MySQL conectado com sucesso.");
}

function sanitizeCpf(value = "") {
  return String(value).replace(/\D/g, "");
}

function generateAccessToken() {
  return crypto.randomBytes(24).toString("hex");
}

function normalizePhoneBR(phone = "") {
  let digits = String(phone).replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

function getFinalTestPhone(user) {
  return normalizePhoneBR(user.celular);
}

function getEnvStatus() {
  const wa = getWhatsAppConfig();

  return {
    node_env: cleanEnv(process.env.NODE_ENV) || null,
    port: port || null,
    frontend_url_configured: Boolean(cleanEnv(process.env.FRONTEND_URL)),
    mysql: {
      host: cleanEnv(process.env.MYSQLHOST) || null,
      port: cleanEnv(process.env.MYSQLPORT) || null,
      user: cleanEnv(process.env.MYSQLUSER) || null,
      database: cleanEnv(process.env.MYSQL_DATABASE) || null,
      password_configured: Boolean(cleanEnv(process.env.MYSQLPASSWORD))
    },
    mercado_pago: {
      access_token_configured: Boolean(cleanEnv(process.env.MERCADO_PAGO_ACCESS_TOKEN)),
      public_key_configured: Boolean(cleanEnv(process.env.MERCADO_PAGO_PUBLIC_KEY)),
      webhook_base_url: cleanEnv(process.env.WEBHOOK_BASE_URL) || null
    },
    whatsapp: {
      token_configured: Boolean(wa.token),
      phone_number_id: wa.phoneNumberId || null,
      verify_token_configured: Boolean(wa.verifyToken),
      verify_token_preview: wa.verifyToken ? `${wa.verifyToken.slice(0, 6)}...` : null,
      template_name: wa.templateName || null,
      api_version: wa.apiVersion,
      template_language: wa.templateLanguage
    },
    claude: {
      api_key_configured: Boolean(cleanEnv(process.env.CLAUDE_API_KEY)),
      model: cleanEnv(process.env.CLAUDE_MODEL) || null
    }
  };
}

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NULL,
      email VARCHAR(191) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NULL,
      celular VARCHAR(30) NULL,
      nascimento VARCHAR(30) NULL,
      area VARCHAR(100) NULL,
      access_released TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const [columns] = await pool.query("SHOW COLUMNS FROM users");
  const columnNames = columns.map(col => col.Field);

  if (!columnNames.includes("celular")) {
    await pool.query("ALTER TABLE users ADD COLUMN celular VARCHAR(30) NULL");
  }

  if (!columnNames.includes("nascimento")) {
    await pool.query("ALTER TABLE users ADD COLUMN nascimento VARCHAR(30) NULL");
  }

  if (!columnNames.includes("area")) {
    await pool.query("ALTER TABLE users ADD COLUMN area VARCHAR(100) NULL");
  }

  if (!columnNames.includes("whatsapp_sent")) {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN whatsapp_sent TINYINT(1) NOT NULL DEFAULT 0
    `);
  }

  if (!columnNames.includes("whatsapp_sent_at")) {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN whatsapp_sent_at TIMESTAMP NULL DEFAULT NULL
    `);
  }

  if (!columnNames.includes("last_whatsapp_message_at")) {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN last_whatsapp_message_at TIMESTAMP NULL DEFAULT NULL
    `);
  }

  if (!columnNames.includes("whatsapp_opt_in")) {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN whatsapp_opt_in TINYINT(1) NOT NULL DEFAULT 1
    `);
  }

  if (!columnNames.includes("whatsapp_followup_count")) {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN whatsapp_followup_count TINYINT(1) NOT NULL DEFAULT 0
    `);
  }

  if (!columnNames.includes("whatsapp_followup_finished")) {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN whatsapp_followup_finished TINYINT(1) NOT NULL DEFAULT 0
    `);
  }

  if (!columnNames.includes("last_customer_message_at")) {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN last_customer_message_at TIMESTAMP NULL DEFAULT NULL
    `);
  }

  if (!columnNames.includes("last_bot_message_at")) {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN last_bot_message_at TIMESTAMP NULL DEFAULT NULL
    `);
  }

  if (!columnNames.includes("bot_paused")) {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN bot_paused TINYINT(1) NOT NULL DEFAULT 0
    `);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      payment_id VARCHAR(100) NOT NULL UNIQUE,
      payment_type VARCHAR(30) NOT NULL,
      status VARCHAR(50) NOT NULL,
      status_detail VARCHAR(100) NULL,
      transaction_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      description VARCHAR(255) NULL,
      payer_email VARCHAR(191) NOT NULL,
      external_reference VARCHAR(100) NULL,
      access_token VARCHAR(100) NULL,
      raw_response JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_payments_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_events (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      payment_id VARCHAR(100) NULL,
      event_type VARCHAR(100) NULL,
      action_name VARCHAR(100) NULL,
      raw_payload JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      celular VARCHAR(30) NOT NULL,
      direction ENUM('in','out') NOT NULL,
      message_text TEXT NULL,
      wa_message_id VARCHAR(120) NULL,
      raw_payload JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_celular (celular),
      CONSTRAINT fk_whatsapp_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_logs (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      level VARCHAR(20) NOT NULL DEFAULT 'info',
      source VARCHAR(80) NULL,
      event_name VARCHAR(120) NULL,
      message TEXT NULL,
      user_id INT NULL,
      celular VARCHAR(30) NULL,
      email VARCHAR(191) NULL,
      metadata JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_app_logs_level (level),
      INDEX idx_app_logs_event_name (event_name),
      INDEX idx_app_logs_created_at (created_at)
    )
  `);
}

async function findOrCreateUser({ name, email }) {
  const [rows] = await pool.query(
    `SELECT id, email, name, celular, nascimento, area, access_released
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );

  if (rows.length > 0) {
    return rows[0];
  }

  const [result] = await pool.query(
    `INSERT INTO users (name, email)
     VALUES (?, ?)`,
    [name || null, email]
  );

  return {
    id: result.insertId,
    name: name || null,
    email,
    celular: null,
    nascimento: null,
    area: null,
    access_released: 0
  };
}

async function savePayment({
  userId,
  paymentId,
  paymentType,
  status,
  statusDetail,
  amount,
  description,
  payerEmail,
  externalReference,
  rawResponse
}) {
  const accessToken = generateAccessToken();

  await pool.query(
    `
    INSERT INTO payments (
      user_id,
      payment_id,
      payment_type,
      status,
      status_detail,
      transaction_amount,
      description,
      payer_email,
      external_reference,
      access_token,
      raw_response
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      status_detail = VALUES(status_detail),
      transaction_amount = VALUES(transaction_amount),
      description = VALUES(description),
      payer_email = VALUES(payer_email),
      external_reference = VALUES(external_reference),
      raw_response = VALUES(raw_response),
      updated_at = CURRENT_TIMESTAMP
    `,
    [
      userId || null,
      String(paymentId),
      paymentType,
      status,
      statusDetail || null,
      Number(amount || 0),
      description || null,
      payerEmail,
      externalReference || null,
      accessToken,
      JSON.stringify(rawResponse || {})
    ]
  );

  return accessToken;
}

async function markAccessReleased(paymentId, email) {
  await pool.query(
    `
    UPDATE payments
    SET status = 'approved', updated_at = CURRENT_TIMESTAMP
    WHERE payment_id = ?
    `,
    [String(paymentId)]
  );

  if (email) {
    await pool.query(
      `
      UPDATE users
      SET access_released = 1, updated_at = CURRENT_TIMESTAMP
      WHERE email = ?
      `,
      [email]
    );
  }
}

async function saveWhatsappMessage({
  userId = null,
  celular,
  direction,
  messageText = "",
  waMessageId = null,
  rawPayload = {}
}) {
  await pool.query(
    `
    INSERT INTO whatsapp_messages (
      user_id, celular, direction, message_text, wa_message_id, raw_payload
    ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      celular,
      direction,
      messageText || null,
      waMessageId || null,
      JSON.stringify(rawPayload || {})
    ]
  );
}


async function saveAppLog({
  level = "info",
  source = null,
  eventName = null,
  message = "",
  userId = null,
  celular = null,
  email = null,
  metadata = {}
} = {}) {
  try {
    if (!pool) return;

    await pool.query(
      `
      INSERT INTO app_logs (
        level, source, event_name, message, user_id, celular, email, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        level,
        source,
        eventName,
        message,
        userId,
        celular,
        email,
        JSON.stringify(metadata || {})
      ]
    );
  } catch (error) {
    console.error("Erro ao salvar app_logs:", error.message);
  }
}

async function sendWhatsAppText(to, text) {
  const wa = getWhatsAppConfig();
  const url = getWhatsAppMessagesUrl();

  console.log("===== WHATSAPP CONFIG =====");
  console.log("API:", wa.apiVersion);
  console.log("PHONE ID:", wa.phoneNumberId);
  console.log("TOKEN:", wa.token ? wa.token.substring(0, 25) + "..." : "UNDEFINED");
  console.log("URL:", url);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${wa.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Erro Meta WhatsApp texto:", JSON.stringify(data, null, 2));
    throw new Error(data?.error?.message || "Erro ao enviar WhatsApp");
  }

  return data;
}

async function sendWhatsAppTemplate(to, templateName = "hello_world") {
  const wa = getWhatsAppConfig();
  const url = getWhatsAppMessagesUrl();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${wa.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: cleanEnv(templateName || wa.templateName || "hello_world"),
        language: { code: wa.templateLanguage }
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Erro Meta WhatsApp template:", JSON.stringify(data, null, 2));
    throw new Error(data?.error?.message || "Erro ao enviar template WhatsApp");
  }

  return data;
}

async function getUserByPhone(celular) {
  const normalized = normalizePhoneBR(celular);

  const [rows] = await pool.query(
    `
    SELECT id, name, email, celular, access_released, whatsapp_sent, bot_paused
    FROM users
    WHERE 
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(celular, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ?
  OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(celular, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ?
  OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(celular, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ?
    LIMIT 1
    `,
    [
  `%${normalized.slice(-11)}`,
  `%${normalized.slice(-10)}`,
  `%${normalized.slice(-9)}`
    ]
  );

  return rows[0] || null;
}

async function getPendingWhatsappUsers() {
  const [rows] = await pool.query(
    `
    SELECT id, name, celular
      FROM users
      WHERE id >= 100
      AND access_released = 0
      AND whatsapp_sent = 0
      AND whatsapp_opt_in = 1
      AND bot_paused = 0
      AND celular IS NOT NULL
      AND celular <> ''
      AND created_at <= NOW() - INTERVAL 20 MINUTE
    `
  );

  return rows;
}

async function markWhatsappSent(userId) {
  await pool.query(
    `
    UPDATE users
    SET whatsapp_sent = 1,
        whatsapp_sent_at = NOW(),
        last_whatsapp_message_at = NOW(),
        last_bot_message_at = NOW(),
        whatsapp_followup_count = 0,
        whatsapp_followup_finished = 0,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [userId]
  );
}

// Rastreador de contexto de conversa por usuário
const conversationContext = new Map();

function getConversationStage(userId) {
  if (!conversationContext.has(userId)) {
    conversationContext.set(userId, {
      theme: null,
      stage: 0,
      lastInteraction: Date.now()
    });
  }
  return conversationContext.get(userId);
}

function updateConversationStage(userId, theme, stage) {
  conversationContext.set(userId, {
    theme,
    stage,
    lastInteraction: Date.now()
  });
}

function buildCustomerReply(text = "", user = null) {
  const rawMsg = String(text || "");
  const msg = normalizeText(rawMsg);
  const userId = user?.id || "anonymous";

  const linkCurso = COURSE_FRONTEND_URL;
  const whatsappMilene = "5511922198936";
  const whatsappGustavo = "5511933128628";

  const nome = user?.name ? user.name.split(" ")[0] : "";
  const saudacao = nome ? `${nome}, ` : "";
  const context = getConversationStage(userId);

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function hasAny(text, keywords) {
    return keywords.some(k => text.includes(normalizeText(k)));
  }

  function linkMilene() {
    return `https://wa.me/${whatsappMilene}`;
  }

  function linkGustavo() {
    return `https://wa.me/${whatsappGustavo}`;
  }

  function handleThemeProgression(theme, keywords) {
    if (!hasAny(msg, keywords)) return null;

    updateConversationStage(userId, theme, context.stage + 1);

    const responses = {
      // Fluxo: Sobre o curso
      sobreCurso: [
        `${saudacao}O curso "Influencer Academy" foi pensado para pessoas que querem dominar a criação de conteúdo e ter uma presença digital estratégica.`,

        `Você aprende:
- criação de conteúdo
- edição de vídeos e fotos
- como engajar a sua audiência
- roteiros e formatos que funcionam
- como crescer nas redes sociais de forma estruturada`,

        `Tudo isso de forma prática, não é teoria pura. Você aprende e já começa a aplicar no seu Instagram e Reels.`,

        `Se quiser conhecer melhor, posso te mandar o link. Lá tem mais informações e você vê se faz sentido para o seu caso.

Quer?`
      ],

      // Fluxo: Dúvida geral
      duvida: [
        `${saudacao}Claro, faz a pergunta com calma.

Se for sobre conteúdo, Instagram, crescimento ou acesso ao curso, estou aqui para ajudar.`,

        `Me conta a sua dúvida específica que eu vejo melhor como posso ajudar.`,

        null, 
        null,
        null
      ],

      // Fluxo: Acesso / Link
      acessar: [
        `${saudacao}Antes de mandar o link, deixa eu entender melhor sua situação.

Você quer focar mais na parte de edição (Reels/Vídeos) ou no crescimento do perfil de forma geral?`,

        `Porque assim consigo te explicar melhor se o curso atende ao que você precisa neste momento.`,

        `Depois disso, eu te passo o link com a melhor condição que temos disponível.`,

        `Então, qual é o seu foco agora?`
      ],

      // Fluxo: Problema técnico
      problema: [
        `${saudacao}Entendi que está com um problema técnico.

Deixa eu direcionar para a pessoa certa resolver isso mais rápido.`,

        `O Gustavo consegue verificar erro de página, acesso, login, pagamento ou qualquer falha técnica.`,

        `Se você conseguir enviar um print da tela onde está o problema, ele resolve muito mais rápido.`,

        `Link do Gustavo: ${linkGustavo()}`,

        null
      ]
    };

    return responses[theme]?.[context.stage - 1] || null;
  }

  if (hasAny(msg, ["como funciona", "funciona", "sobre o curso", "curso"])) {
    const response = handleThemeProgression("sobreCurso", ["como funciona", "sobre o curso"]);
    if (response) return response;
  }

  if (hasAny(msg, ["quero acessar", "onde acesso", "link", "acessar", "comprar", "pagina", "página"])) {
    const response = handleThemeProgression("acessar", ["quero acessar", "onde acesso", "link", "acessar"]);
    if (response) return response;
  }

  if (hasAny(msg, ["erro", "bug", "travou", "nao abre", "não abre", "pagina nao abre", "página não abre"])) {
    const response = handleThemeProgression("problema", ["erro", "bug", "travou"]);
    if (response) return response;
  }

  // =====================================================
  // 1. SAUDAÇÃO / INÍCIO DE CONVERSA
  // =====================================================
  if (hasAny(msg, ["oi", "ola", "olá", "bom dia", "boa tarde", "boa noite", "eai", "e aí", "opa"])) {
    return `${saudacao}Oi! Tudo bem?

Antes de falar sobre o curso, me conta: você está com dúvida sobre conteúdo, Instagram ou acesso?`;
  }

  // =====================================================
  // 2. TUDO BEM / QUEBRA DE GELO
  // =====================================================
  if (hasAny(msg, ["tudo bem", "td bem", "como vai", "como voce esta", "como você está"])) {
    return `Tudo certo por aqui.

E você, como posso ajudar hoje?`;
  }

  // =====================================================
  // 3. DÚVIDA GERAL
  // =====================================================
  if (hasAny(msg, ["tenho duvida", "tenho dúvida", "duvida", "dúvida", "nao entendi", "não entendi", "pode explicar", "explica melhor"])) {
    return `${saudacao}Claro. Me conta sua dúvida específica sobre conteúdo, crescimento no Instagram ou curso e eu respondo direto.`;
  }

  // =====================================================
  // 4. SOBRE O CURSO / COMO FUNCIONA
  // =====================================================
  if (hasAny(msg, ["como funciona", "funciona", "me explica", "saber mais", "mais informacoes", "mais informações", "sobre o curso", "curso"])) {
    return `O curso é voltado para quem precisa melhorar sua presença digital, produzir melhor conteúdo e crescer no Instagram.

Antes de eu te mandar mais detalhes, me diz: qual parte você quer entender melhor? A edição, o formato ou como ter mais engajamento?`;
  }

  // =====================================================
  // 6. PREÇO / VALOR / CUSTO
  // =====================================================
  if (hasAny(msg, ["preco", "preço", "valor", "quanto custa", "custa", "custo", "investimento"])) {
    return `O investimento é de R$ 39,99! Antes de passar o link, me conta: qual o seu maior desafio hoje? É gravar vídeos, ter ideias, ou entender o que dá engajamento?`;
  }

  // =====================================================
  // 7. LINK / ACESSAR / COMPRAR
  // =====================================================
  if (hasAny(msg, ["link", "acessar", "comprar", "quero comprar", "onde compro", "onde acesso", "pagina", "página"])) {
    return `Entendi. Antes de enviar o link, me conta qual a sua maior dúvida: engajamento, edição de vídeo ou conteúdo do curso? Assim eu posso te responder melhor.`;
  }

  // =====================================================
  // 8. DESCONTO / PROMOÇÃO / CUPOM
  // =====================================================
  if (hasAny(msg, ["desconto", "promocao", "promoção", "cupom", "oferta", "condicao especial", "condição especial"])) {
    return `O valor atual já está com uma condição super especial!

Me conta um pouco mais sobre o seu perfil hoje: você já posta com frequência ou está começando agora?`;
  }

  // =====================================================
  // 9. PAGAMENTO / PIX / CARTÃO / BOLETO
  // =====================================================
  if (hasAny(msg, ["pagamento", "pagar", "pix", "cartao", "cartão", "boleto", "mercado pago", "credito", "crédito", "debito", "débito"])) {
    return `O pagamento é feito direto na página do curso e é 100% seguro. Se precisar, posso te orientar sobre como chegar lá ou indicar quem pode te ajudar se aparecer algum erro.`;
  }

  // =====================================================
  // 10. ERRO / BUG / PROBLEMA TÉCNICO
  // =====================================================
  if (hasAny(msg, ["erro", "bug", "travou", "nao abre", "não abre", "pagina nao abre", "página não abre", "deu problema", "problema tecnico", "problema técnico", "falha", "carregando", "tela branca", "nao carrega", "não carrega"])) {
    return `Parece ser um problema técnico. O Gustavo pode verificar o site, login, acesso ou pagamento.

Se puder, mande um print da tela e explique em qual parte travou.`;
  }

  // =====================================================
  // 11. LOGIN / SENHA / ACESSO / CADASTRO
  // =====================================================
  if (hasAny(msg, ["login", "senha", "cadastro", "entrar", "acesso", "area do aluno", "área do aluno", "nao consigo acessar", "não consigo acessar", "liberar acesso"])) {
    return `Para acessar, entre no site do curso e use o seu login. Se ainda não tem conta, cadastre-se normalmente.

Se der erro no login, acesso não liberar ou a página travar, posso te passar quem resolve isso.`;
  }

  // =====================================================
  // 12. MÓDULOS / AULAS / CONTEÚDO
  // =====================================================
  if (hasAny(msg, ["modulo", "módulo", "modulos", "módulos", "aula", "aulas", "conteudo", "conteúdo", "material", "materiais", "pdf", "checklist"])) {
    return `O curso é direto e prático. Ele mostra como:
- criar e estruturar bons conteúdos
- editar seus Reels para prender a atenção
- engajar a sua audiência
- usar parcerias para crescer
- organizar seu calendário de postagens

O objetivo é não só deixar o perfil bonito, mas fazer você crescer de verdade.`;
  }

  // =====================================================
  // 69. ENTENDI / OK / CERTO
  // =====================================================
  if (hasAny(msg, ["entendi", "ok", "certo", "ta bom", "tá bom", "beleza", "blz"])) {
    return `Perfeito.

Se quiser, posso te ajudar com o próximo passo.

Você quer:`;
  }

  // =====================================================
  // 70. SIM / QUERO / TENHO INTERESSE
  // =====================================================
  if (hasAny(msg, ["sim", "quero", "tenho interesse", "pode mandar", "manda", "me envie", "envia", "quero sim"])) {
    return `Ótimo.

Me conta qual é a sua maior dúvida: conteúdo, crescimento ou acesso?

Assim eu respondo de forma mais clara antes de falar de acesso.`;
  }

  // =====================================================
  // 71. NÃO / NÃO QUERO
  // =====================================================
  if (hasAny(msg, ["nao quero", "não quero", "nao tenho interesse", "não tenho interesse"])) {
    return `Tudo bem.

Se sua dúvida for sobre conteúdo ou crescimento digital, posso tentar te orientar por aqui mesmo.`;
  }

  // =====================================================
  // 72. HUMANO / ATENDENTE / SUPORTE
  // =====================================================
  if (hasAny(msg, ["humano", "atendente", "falar com alguem", "falar com alguém", "pessoa", "suporte", "ajuda humana"])) {
    return `Claro 😊

Vou te direcionar certinho:

👩‍💼 Para dúvidas sobre conteúdo, curso, ou orientação:
👉 Milene: ${linkMilene()}

👨‍💻 Para erro, login, acesso, pagamento travado, página com problema ou bug:
👉 Gustavo: ${linkGustavo()}

Assim você fala com a pessoa certa e resolve mais rápido.`;
  }

  // =====================================================
  // 73. OBRIGADO
  // =====================================================
  if (hasAny(msg, ["obrigado", "obrigada", "valeu", "vlw", "agradeco", "agradeço"])) {
    return `Por nada.

Se tiver qualquer dúvida sobre Instagram, curso ou acesso, pode chamar.`;
  }

  // =====================================================
  // 74. CLIENTE CONFUSO / MENSAGEM CURTA
  // =====================================================
  if (rawMsg.trim().length <= 3) {
    return `${saudacao}me fala um pouco melhor o que você precisa.

Você quer ajuda com conteúdo, acesso ao curso ou está com algum problema técnico?`;
  }

  // =====================================================
  // 75. RESPOSTA PADRÃO INTELIGENTE
  // =====================================================
  return `${saudacao}entendi.

Para eu te ajudar melhor, me conta um pouco mais sobre sua dúvida.

Se for sobre Instagram, Reels, engajamento ou se o curso serve para o seu caso, posso te orientar por aqui.

Se for erro técnico, acesso, login, pagamento travado ou página com falha, me avisa que eu te direciono para o suporte certo.`;
}

async function getConversationHistory(userId, limit = 10) {
  if (!userId) return [];

  try {
    const [rows] = await pool.query(
      `
      SELECT direction, message_text, created_at
      FROM whatsapp_messages
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [userId, limit]
    );

    return rows.reverse(); // Mais antigos primeiro
  } catch (error) {
    console.error("Erro ao recuperar histórico:", error.message);
    return [];
  }
}

function buildMessageHistory(conversationHistory, currentMessage) {
  const messages = [];

  for (const msg of conversationHistory) {
    messages.push({
      role: msg.direction === "in" ? "user" : "assistant",
      content: msg.message_text || ""
    });
  }

  messages.push({
    role: "user",
    content: currentMessage
  });

  return messages;
}

function detectConversationPath(history) {
  const allMessages = history.map(msg => msg.message_text?.toLowerCase() || "").join(" ");
  
  const contentKeywords = ["conteúdo", "aula", "módulo", "aprendo", "ensina", "tópico", "tema", "instagram", "reels", "engajamento", "seguidores", "aprend"];
  const paymentKeywords = ["pagar", "pagamento", "preço", "valor", "caro", "desconto", "promoção", "boleto", "cartão", "débito", "crédito", "investiment", "grana", "quanto"];
  const accessKeywords = ["acesso", "entrar", "login", "senha", "usuário", "plataforma", "problema", "não consigo", "travou", "conta", "cadastr"];
  const technicalKeywords = ["erro", "bug", "não funciona", "quebrou", "problema técnico", "falha", "travou", "tela branca", "não aparec"];

  const contentScore = contentKeywords.filter(kw => allMessages.includes(kw)).length;
  const paymentScore = paymentKeywords.filter(kw => allMessages.includes(kw)).length;
  const accessScore = accessKeywords.filter(kw => allMessages.includes(kw)).length;
  const technicalScore = technicalKeywords.filter(kw => allMessages.includes(kw)).length;

  const scores = { content: contentScore, payment: paymentScore, access: accessScore, technical: technicalScore };
  const maxScore = Math.max(...Object.values(scores));

  if (maxScore === 0) return "general";
  return Object.keys(scores).find(key => scores[key] === maxScore);
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9áàãâéèêíìîóòõôúùûç ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPreviousBotQuestions(history) {
  return history
    .filter(msg => msg.direction === "out")
    .map(msg => normalizeText(msg.message_text || ""));
}

function findUnusedQuestion(questions, previousQuestions) {
  for (const question of questions) {
    const normalizedQuestion = normalizeText(question);
    const alreadyAsked = previousQuestions.some(prev => prev.includes(normalizedQuestion) || normalizedQuestion.includes(prev));
    if (!alreadyAsked) {
      return question;
    }
  }
  return questions[Math.floor(Math.random() * questions.length)];
}

function getFollowUpQuestion(path, history = []) {
  const paths = {
    content: [
      "E qual é a sua principal necessidade: ter mais ideias de conteúdo ou entender como editar melhor?",
      "Qual é a sua maior dificuldade no momento: gravar os vídeos ou fazer as pessoas interagirem?",
      "Você quer focar em qual parte: produzir mais Reels ou fechar parcerias?",
      "Qual é o seu maior desafio agora: entender o que dá engajamento ou criar um calendário de posts?",
      "O que te preocupa mais: a qualidade dos seus vídeos ou o número de visualizações?",
      "Quer aprender a prender a atenção das pessoas logo nos primeiros segundos? É isso que está faltando?",
      "Se eu te mostrar como deixar seu perfil muito mais profissional, você acha que vai te ajudar?",
      "Você quer melhorar os seus vídeos ou toda a identidade visual do seu Instagram?"
    ],
    payment: [
      "Qual é a sua maior preocupação: o valor total, as formas de pagamento, ou questões de segurança da transação?",
      "Quer saber mais sobre como funciona o acesso? Ou você tem dúvida com qual forma de pagamento escolher?",
      "Entendi sua preocupação com o investimento. Você quer saber qual é o retorno que vai ter?",
      "O que ajudaria mais nesse momento: saber exatamente o que você ganha com o acesso ou tirar dúvidas técnicas?",
      "Posso explicar melhor as formas de pagamento disponíveis ou você quer um desconto especial?",
      "Você quer parcelar ou prefere à vista? A gente pode encontrar uma forma que cabe no seu bolso.",
      "Você quer que eu te explique o valor e também as vantagens que ele traz pro seu perfil?",
      "Prefere pagar agora e ter acesso imediato, ou quer saber todas as garantias antes de decidir?"
    ],
    access: [
      "Quando você tentou acessar, qual foi exatamente a mensagem de erro? Consegue me mandar um print?",
      "A dificuldade é para entrar na plataforma ou para visualizar os conteúdos após o login?",
      "Você conseguiu fazer o cadastro normalmente, ou o problema começou desde o começo?",
      "Já tentou acessar de outro navegador ou dispositivo? Às vezes resolve na hora!",
      "Qual é o navegador que você está usando no momento? Chrome, Firefox, Safari?",
      "Qual dispositivo você está tentando usar: computador, tablet ou celular?",
      "Você acessou pelo celular ou pelo computador? Isso pode fazer diferença.",
      "Se eu te mandar um passo a passo rápido, quer testar agora comigo?"
    ],
    technical: [
      "Que tipo de erro está aparecendo na sua tela? Se conseguir um print, ajuda demais!",
      "Qual página ou recurso está com problema: vídeos, PDFs, exercícios, ou a plataforma inteira?",
      "Já tentou limpar o cache do navegador? Às vezes é só isso que resolve!",
      "Qual dispositivo você está usando: computador, tablet ou celular?",
      "Esse problema apareceu desde o começo ou começou agora de repente?",
      "Qual é o seu sistema operacional: Windows, Mac ou Linux?",
      "Você estava usando algum link específico ou clicou na página principal?",
      "Se eu te orientar passo a passo agora, você consegue testar comigo?"
    ],
    general: [
      "O que você gostaria de saber primeiro: como funciona o curso, o que está incluso, ou como é o acesso?",
      "Qual é sua maior dúvida agora: sobre o conteúdo que você aprende, como pagamento funciona, ou acesso?",
      "Quer que eu explique tudo desde o começo ou você tem uma dúvida específica?",
      "O que te traz por aqui? Você está buscando crescer no Instagram ou melhorar a qualidade dos vídeos?",
      "Como posso te ajudar melhor: mostrando o que você ganha com o curso ou respondendo dúvidas técnicas?",
      "Se eu resolvesse uma dúvida agora, qual seria a mais importante pra você?",
      "Você prefere que eu te explique o curso com exemplos reais ou com foco no seu caso?",
      "Você quer saber primeiro sobre o conteúdo ou sobre como o curso funciona?"
    ]
  };

  const questions = paths[path] || paths.general;
  const previousQuestions = getPreviousBotQuestions(history);
  return findUnusedQuestion(questions, previousQuestions);
}

function countConversationTurns(history) {
  return history.filter(msg => msg.direction === "in").length;
}

function isConfirmation(messageText) {
  const text = messageText.toLowerCase().trim();
  const confirmations = ["sim", "s", "ok", "tudo bem", "tá bom", "blz", "valeu", "entendi", "certo", "perfeito", "ótimo", "legal", "show", "top", "massa", "👍", "✅"];
  return confirmations.some(c => text.includes(c) || text === c);
}

function countTopicMentions(history, topic) {
  const keywords = {
    content: ["conteúdo", "aula", "módulo", "aprendo", "ensina", "tópico"],
    payment: ["preço", "valor", "quanto", "custa", "desconto"],
    access: ["acesso", "entrar", "login", "senha"],
    technical: ["erro", "bug", "não funciona", "problema"]
  };
  
  const topicKeywords = keywords[topic] || [];
  let count = 0;
  
  for (const msg of history) {
    if (msg.direction === "in") {
      const text = msg.message_text?.toLowerCase() || "";
      if (topicKeywords.some(kw => text.includes(kw))) {
        count++;
      }
    }
  }
  
  return count;
}

function detectConversationStage(history, conversationPath) {
  const userMessages = history.filter(msg => msg.direction === "in").length;
  
  if (userMessages <= 2) return "awareness";
  if (userMessages <= 5) return "interest";
  if (userMessages <= 8) return "decision";
  return "objection";
}

function getStageProgression(stage, conversationPath, mentionsCount) {
  const responses = {
    awareness: {
      content: [
        "Já que você perguntou sobre conteúdo, vou ser bem direto: o curso é muito focado na prática. Você já tem um Instagram ativo ou quer começar do zero?",
        "Esse é o tipo de dúvida que a gente resolve rápido: o curso mostra o passo a passo da criação. Você quer focar mais em vídeo ou em postagens estáticas?",
        "Ótimo ponto! O curso oferece aulas práticas de edição e engajamento. Você prefere um caminho mais focado em Reels ou em estratégias gerais?"
      ],
      payment: [
        "Entendi sua preocupação. Deixa eu ser transparente: o investimento é pequeno comparado ao retorno. O valor compensa rápido! Quer saber exatamente como?",
        "O valor é planejado para ser acessível e com resultado. Se quiser, te explico as formas de pagamento e qual oferece mais segurança para você.",
        "Se você quer pagar com segurança e ver mais valor, posso te mostrar as opções que ficam mais fáceis para sua rotina."
      ],
      access: [
        "Tranquilo, o acesso é automático! Logo após o pagamento você já tem tudo liberado. Que tal começarmos pelo essencial então?",
        "O acesso é liberado rapidinho. Se quiser, posso te orientar no primeiro login agora mesmo.",
        "Assim que fechar, você recebe o link e já entra no curso. Quer que eu prepare o passo a passo para você?"
      ],
      general: [
        "Entendi sua dúvida. Deixa eu organizar melhor para você: o curso tem pilares focados em crescimento e conteúdo. Qual te interessa mais?",
        "Vamos fazer o seguinte: te explico os pontos principais e você me diz o que mais te interessa. Pode ser?",
        "Antes de falar de acesso, me conta: você quer entender a parte de edição de vídeos ou de engajamento?"
      ]
    },
    interest: {
      content: [
        "Perfeito! Então você quer isso mesmo. Muita gente posta todo dia e não cresce porque erra no básico. Você quer aprender a fugir dessa?",
        "Ótimo! Isso mostra que você já está no caminho certo. Você prefere melhorar o engajamento geral ou atrair seguidores novos?",
        "Esse é um ponto chave. Se te ajudar, posso mostrar como aplicar isso na prática logo nas primeiras aulas."
      ],
      payment: [
        "Vejo que realmente quer investir. Que bom! Deixa eu te mostrar um último detalhe que faz toda diferença...",
        "Isso mostra que você está interessado de verdade. Quer saber qual é a melhor forma de pagar para liberar logo?",
        "Excelente! Posso te explicar as formas de pagamento que costumam facilitar bastante."
      ],
      access: [
        "Ótimo! Já que entendeu como funciona, quer começar agora mesmo? O sistema libera tudo na hora.",
        "Perfeito, você está quase lá. Quer que eu te envie a etapa exata pra acessar já?",
        "Isso é ótimo. Se quiser, te explico o passo a passo para acessar sem erro e já começar hoje."
      ],
      general: [
        "Ótimo! Vejo que você tá levando a sério. Vamos pro próximo passo?",
        "Perfeito. Agora me conta: você quer que eu te ajude com o curso em si ou com a forma de usar ele no seu Instagram?",
        "Excelente. Posso te explicar como cada parte do curso ajuda a melhorar sua criação de conteúdo."
      ]
    },
    decision: {
      content: [
        "Você já tem tudo que precisa saber! Só falta você tomar a ação. Tá pronto para começar, ou tem aquele último detalhe que te falta?",
        "Está quase! Agora falta só decidir qual estratégia de conteúdo quer focar primeiro.",
        "Se quiser, posso te mostrar o próximo passo para você começar a aplicar tudo imediatamente."
      ],
      payment: [
        "Você tá 100% pronto. Só falta esse último passo. Qual forma de pagamento funciona melhor com você agora?",
        "Excelente. Você prefere pagar agora e garantir logo o acesso, ou quer que eu te aponte a opção mais tranquila?",
        "Você já entendeu o valor. Quer que eu te diga qual opção de pagamento tem mais vantagem aqui?"
      ],
      access: [
        "Perfeito! Você já entendeu tudo. Agora é só começar. Tá pronto?",
        "Isso! Você só precisa do último passo de login para entrar. Quer que eu te ajude com ele agora?",
        "Se você quiser, mando o passo a passo pra entrar e já começar a usar o curso hoje mesmo."
      ],
      general: [
        "Você tá bem perto de tomar essa decisão! Que tal a gente conversar com o especialista para ele te colocar no caminho certo?",
        "Pronto para o próximo passo? Se quiser, posso facilitar contato com quem entende do curso e da sua situação.",
        "Você está quase acertando. Posso te direcionar para o especialista para tirar qualquer dúvida restante."
      ]
    },
    objection: {
      content: [
        mentionsCount >= 3 ? "Vejo que você tem muita curiosidade! 🤓 Que tal a gente agendar uma call com o especialista? Ele pode responder TUDO que você quer saber com muito mais detalhe. Quer?" : "Ótima pergunta! Deixa eu responder com mais clareza...",
        "Se você tiver mais dúvidas, posso te ajudar. Mas também posso passar o especialista para esclarecer todos os detalhes.",
        "Sua dúvida é importante, e eu quero te deixar tranquilo. Se quiser, te passo o contato do especialista pra conversar mais a fundo."
      ],
      payment: [
        mentionsCount >= 3 ? "Entendo perfeitamente sua preocupação com investimento. Sabe o que? Vou te passar o contato do especialista. Ele consegue estruturar uma forma que caiba no seu bolso. Topa?" : "Ótima observação. Deixa eu detalhar melhor...",
        "Se quiser, te explico o plano que cabe no seu bolso e ainda garante o acesso. Quer saber mais?",
        "Temos opções diferentes. Quer que eu te apresente a melhor para a sua situação?"
      ],
      access: [
        mentionsCount >= 2 ? "Seu navegador pode ser o problema. Melhor o especialista ajudar direto. Quer que eu passe o WhatsApp dele?" : "Deixa eu tentar resolver isso com você...",
        "Se preferir, posso te encaminhar para quem resolve passo a passo esse tipo de acesso.",
        "A maioria resolve com um ajuste simples. Quer que eu te ajude com isso agora?"
      ],
      technical: [
        "Vamos passar isso pro especialista! Ele resolve rápido. Quer?",
        "Se quiser, posso te indicar o técnico que resolve essa questão de vez.",
        "Eu posso continuar aqui ou te conectar direto com quem resolve esse erro mais rápido. Quer?"
      ],
      general: [
        "Vejo que você tem bastantes dúvidas, e isso é bom! Melhor você conversar direto com o especialista que conhece tudo. Topa?",
        "Se quiser, posso mandar o WhatsApp do especialista para você falar com quem entende do curso e do seu caso. Quer?",
        "Você está com boas perguntas. Quer que eu passe seu caso para o especialista e ele responda tudo?"
      ]
    }
  };
  
  const choices = responses[stage]?.[conversationPath] || responses.interest.general;
  if (!choices) return null;
  return choices[Math.floor(Math.random() * choices.length)];
}

function shouldOfferSpecialist(history, conversationPath) {
  const userMessages = history.filter(msg => msg.direction === "in").length;
  const topicMentions = countTopicMentions(history, conversationPath);
  const stage = detectConversationStage(history, conversationPath);
  
  return stage === "objection" && topicMentions >= 2;
}

function detectQuestionType(messageText) {
  const text = messageText.toLowerCase();

  const priceKeywords = ["preço", "valor", "quanto", "custa", "caro", "desconto", "promoção", "pagar", "pagamento", "investimento", "grana", "boleto", "cartão"];
  if (priceKeywords.some(kw => text.includes(kw))) {
    return "price";
  }

  const contentKeywords = ["o que aprend", "qual conteúdo", "qual aula", "qual módulo", "ensina", "tópico", "matéria", "programa", "instagram", "conteudo", "como funciona o curso"];
  if (contentKeywords.some(kw => text.includes(kw))) {
    return "content";
  }

  const accessKeywords = ["como acessar", "como entrar", "login", "senha", "usuário", "cadastr", "plataforma", "entrar no site"];
  if (accessKeywords.some(kw => text.includes(kw))) {
    return "access";
  }

  const technicalKeywords = ["erro", "bug", "não funciona", "quebrou", "travou", "não consigo", "problema", "falha", "tela branca"];
  if (technicalKeywords.some(kw => text.includes(kw))) {
    return "technical";
  }

  const viabilityKeywords = ["vale a pena", "serve pra", "funciona pra", "vai me ajud", "vai mudar", "resultado", "funciona mesmo", "é bom", "é legal"];
  if (viabilityKeywords.some(kw => text.includes(kw))) {
    return "viability";
  }

  return "general";
}

function getDirectAnswer(questionType, user) {
  const linkCurso = COURSE_FRONTEND_URL;
  
  const answers = {
    price: {
      response: `Ótimo, vou ser bem honesto com você! 💰

O investimento está com condição especial agora. As formas de pagamento incluem cartão parcelado ou PIX. O valor vale o esforço porque te ensina a profissionalizar seu conteúdo de verdade.`,
      followUps: [
        "Qual forma de pagamento você prefere: PIX ou parcelado?",
        "Quer que eu te explique as opções de parcelamento disponíveis?",
        "Você prefere garantir agora ou saber mais sobre o conteúdo antes?"
      ]
    },
    content: {
      response: `Perfeito, deixa eu te contar! 📚

O curso é dividido em módulos práticos:
✅ Edição de Reels e vídeos que prendem a atenção
✅ Como engajar a audiência no Instagram
✅ Estruturas de conteúdo magnético
✅ Materiais e exemplos para aplicar direto no seu perfil

Nada de teoria vazia — é resultado real.`,
      followUps: [
        "Qual parte mais te interessa: engajamento, edição de vídeo, ou crescimento de seguidores?",
        "Você quer que eu te explique como criar vídeos que as pessoas não param de assistir?",
        "Se eu te mostrar o caminho mais rápido para chamar atenção no Instagram, você quer ver?"
      ]
    },
    access: {
      response: `Tranquilo, é bem simples! 🔓

Depois que você paga, você recebe:
1. Um email com o link de acesso
2. Seu usuário e senha
3. Acesso imediato a todos os módulos
4. Suporte direto pelo WhatsApp`,
      followUps: [
        "Quer testar o acesso agora ou tem mais alguma dúvida antes de começar?",
        "Você prefere que eu te explique o passo a passo de login?",
        "Quer que eu te confirme se o seu cadastro já está liberado?"
      ]
    },
    technical: {
      response: `Entendi, vamos resolver isso! 🔧

Me ajuda com essas informações:
- Qual navegador você tá usando?
- É no computador, celular ou tablet?
- Qual mensagem de erro apareceu?`,
      followUps: [
        "Consegue me passar essas informações? Assim resolvo rápido!",
        "Se você me disser o navegador e o erro, eu te oriento passo a passo.",
        "Quer que eu te indique qual navegador funciona melhor com a plataforma?"
      ]
    },
    viability: {
      response: `Funciona demais! 🎯

A maioria dos alunos que passa pelo curso:
✅ Consegue mais alcance nas publicações
✅ Aprende a editar de forma profissional
✅ Transforma seguidores em uma comunidade engajada

O curso entrega um método prático e direto ao ponto.`,
      followUps: [
        "Você quer melhorar pra qual objetivo: crescer sua marca pessoal ou divulgar serviços?",
        "Quer que eu te mostre como isso se aplica no seu Instagram específico?",
        "Deseja que eu explique como isso ajuda a prender a atenção do seu público?"
      ]
    },
    general: {
      response: null,
      followUps: []
    }
  };

  const answer = answers[questionType] || answers.general;
  if (!answer.response) return answer;

  const followUpList = answer.followUps || ["Como posso te ajudar melhor? "];
  const followUp = followUpList[Math.floor(Math.random() * followUpList.length)];

  return {
    response: answer.response,
    followUp
  };
}

async function maybeGetClaudeReply(messageText, user) {
  const claudeKey = cleanEnv(process.env.CLAUDE_API_KEY);
  const specialistPhone = "5511933128628";

  if (!claudeKey || claudeKey === "sua_chave_real") {
    return null;
  }

  try {
    const history = user?.id ? await getConversationHistory(user.id) : [];
    const questionType = detectQuestionType(messageText);
    const isConfirmationMsg = isConfirmation(messageText);
    const conversationPath = detectConversationPath(history);
    const stage = detectConversationStage(history, conversationPath);
    const topicMentions = countTopicMentions(history, conversationPath);
    const shouldOffer = shouldOfferSpecialist(history, conversationPath);
    
    if (shouldOffer) {
      return `Vejo que você tem várias dúvidas sobre isso, e isso é ótimo! 🤓

Melhor conversar direto com o especialista que pode responder TUDO com muito mais detalhe. Ele consegue estruturar a melhor forma pra você.

Quer que eu passe o WhatsApp dele? É: ${specialistPhone} 

Ele tá disponível pra conversar e tirar todas as suas dúvidas! 🚀`;
    }
    
    if (isConfirmationMsg && history.length > 0) {
      const progressionResponse = getStageProgression(stage, conversationPath, topicMentions);
      if (progressionResponse) {
        return progressionResponse;
      }
    }
    
    const directAnswer = getDirectAnswer(questionType, user);
    if (directAnswer?.response) {
      return `${directAnswer.response}\n\n${directAnswer.followUp}`;
    }
    
    const messages = buildMessageHistory(history, messageText);
    const followUpQuestion = getFollowUpQuestion(conversationPath, history);

    const pathDescriptions = {
      content: "O cliente está interessado no CONTEÚDO do curso (edição, Reels, Instagram, engajamento).",
      payment: "O cliente tem dúvidas sobre PAGAMENTO, preço, desconto ou formas de pagar.",
      access: "O cliente tem problemas de ACESSO à plataforma (login, conta, entrar no site).",
      technical: "O cliente enfrenta PROBLEMAS TÉCNICOS (erro, bug, não funciona, travou).",
      general: "O cliente está começando a conversa ou tem interesse geral."
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: cleanEnv(process.env.CLAUDE_MODEL) || "claude-3-5-sonnet-20241022",
        max_tokens: 300,
        system: `Você é um atendente comercial super amigável do curso Influencer Academy.
      O curso ensina criação de conteúdo, crescimento no Instagram, edição e parcerias. Valor: R$ 39,99.

      CONTEXTO ATUAL:
      ${pathDescriptions[conversationPath] || ""}
      Tipo de pergunta: ${questionType || ""}
      Estágio da conversa: ${stage || ""}
      Total de mensagens nesta conversa: ${history.length}

      PERSONALIDADE:
      - Seja natural, casual e genuíno - fale como um amigo.
      - Use emojis moderadamente (1-2 por mensagem).
      - Seja breve e objetivo (textos curtos).
      - Nunca mencione que você é uma IA.

      O CLIENTE:
      ${user?.name ? `Nome: ${user.name}` : "Novo cliente"}
      Status: Ainda não tem acesso ao curso

      REGRA 1 (GATILHO DE VENDA - ESCASSEZ DE CONTEÚDO): 
      Você tem um limite de dicas gratuitas. Se o cliente fizer perguntas sobre ESTRATÉGIA, CONTEÚDO ou DICAS (ex: "como crescer", "me dá uma ideia"), dê no máximo 2 respostas ajudando.
      Na 3ª pergunta sobre CONTEÚDO, NÃO ENTREGUE MAIS O OURO! Em vez da dica, responda exatamente:
      "Para aprofundar nisso e ter o passo a passo completo, você precisa da Academy! ✨ Posso te mostrar os valores e pacotes pra gente já aplicar no seu perfil?"

      REGRA 2 (VENDAS SÃO LIVRES):
      Se o cliente perguntar sobre VALORES, PACOTES, PREÇO, PAGAMENTO ou COMO FUNCIONA (como a opção 4 do menu), responda SEMPRE de forma clara e natural, explicando o valor de R$ 39,99. NUNCA bloqueie ou use gatilho de escassez quando a dúvida for sobre a compra.

      REGRA 3 (RESPONDER E CONTINUAR):
      Se você for responder normalmente, responda a pergunta do cliente e DEPOIS termine com esta pergunta exata para continuar a conversa: "${followUpQuestion}"`,
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro Claude:", data);
      return null;
    }

    return data?.content?.[0]?.text?.trim() || null;
  } catch (error) {
    console.error("Erro ao consultar Claude:", error.message);
    return null;
  }
}

async function processPendingWhatsappMessages() {
  if (whatsappJobRunning) return;
  whatsappJobRunning = true;

  try {
    const users = await getPendingWhatsappUsers();

    for (const user of users) {
      try {
        const celularBanco = normalizePhoneBR(user.celular);
        const celular = getFinalTestPhone(user);

        if (!celular) continue;

        const mensagensTeste = [
          `Oi, tudo bem? 😊

Vi que você se cadastrou no curso, mas o acesso ainda não foi liberado. Ficou alguma dúvida pra finalizar?`,

          `Fala! 👀

Você chegou bem perto de garantir o acesso ao curso… aconteceu alguma coisa na hora do pagamento?`,

          `Oii! 💕

Vi seu interesse aqui no curso. Posso te ajudar a liberar o acesso rapidinho?`
        ];

        const mensagemInicial = mensagensTeste[Math.floor(Math.random() * mensagensTeste.length)];

        const randomDelay = Math.floor(Math.random() * 2000) + 8000;

        await delay(randomDelay);

        const textResponse = await sendWhatsAppText(celular, mensagemInicial);

        await saveWhatsappMessage({
          userId: user.id,
          celular,
          direction: "out",
          messageText: mensagemInicial,
          waMessageId: textResponse?.messages?.[0]?.id || null,
          rawPayload: textResponse
        });

        await markWhatsappSent(user.id);
      } catch (err) {
        console.error(`Erro ao enviar WhatsApp para user_id ${user.id}:`, err.message);
      }
    }
  } catch (error) {
    console.error("Erro na rotina de WhatsApp:", error.message);
  } finally {
    whatsappJobRunning = false;
  }
}

app.get("/api/inbox/conversations", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.celular,
        u.access_released,
        u.whatsapp_sent,
        u.last_customer_message_at,
        u.last_bot_message_at,
        u.bot_paused,
        (
          SELECT message_text 
          FROM whatsapp_messages wm 
          WHERE wm.user_id = u.id 
          ORDER BY wm.created_at DESC 
          LIMIT 1
        ) AS last_message,
        (
          SELECT created_at 
          FROM whatsapp_messages wm 
          WHERE wm.user_id = u.id 
          ORDER BY wm.created_at DESC 
          LIMIT 1
        ) AS last_message_at
      FROM users u
      WHERE u.celular IS NOT NULL
        AND u.celular <> ''
      ORDER BY last_message_at DESC

    `);

    res.json({ success: true, conversations: rows });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar conversas", details: error.message });
  }
});

app.get("/api/inbox/messages/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [messages] = await pool.query(
      `
      SELECT id, user_id, celular, direction, message_text, created_at
      FROM whatsapp_messages
      WHERE user_id = ?
      ORDER BY created_at ASC
      `,
      [userId]
    );

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar mensagens", details: error.message });
  }
});

app.post("/api/inbox/bot-status", async (req, res) => {
  try {
    const { userId, paused } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório" });
    }

    await pool.query(
      `
      UPDATE users
      SET bot_paused = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [paused ? 1 : 0, userId]
    );

    res.json({
      success: true,
      userId,
      bot_paused: paused ? 1 : 0
    });
  } catch (error) {
    res.status(500).json({
      error: "Erro ao alterar status do bot",
      details: error.message
    });
  }
});

app.post("/api/inbox/send", async (req, res) => {
  try {
    const { userId, message } = req.body;
    console.log("Recebendo mensagem manual para:", userId); 

    if (!userId || !message) {
      return res.status(400).json({ error: "userId e message são obrigatórios" });
    }

    const [rows] = await pool.query(
      `
      SELECT id, name, celular
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const user = rows[0];
    const celular = normalizePhoneBR(user.celular);

    const response = await sendWhatsAppText(celular, message);

    await saveWhatsappMessage({
      userId: user.id,
      celular,
      direction: "out",
      messageText: message,
      waMessageId: response?.messages?.[0]?.id || null,
      rawPayload: response
    });

    await pool.query(
      `
      UPDATE users
      SET last_bot_message_at = NOW(),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [user.id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao enviar mensagem", details: error.message });
  }
});

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      ok: true,
      message: "Backend online e MySQL conectado"
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Erro ao validar MySQL",
      details: error.message
    });
  }
});

app.get("/api/health/details", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      ok: true,
      message: "Backend online, MySQL conectado e variáveis carregadas",
      env: getEnvStatus()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Erro ao validar ambiente",
      details: error.message,
      env: getEnvStatus()
    });
  }
});

app.get("/api/config", (_req, res) => {
  res.json({
    publicKey: cleanEnv(process.env.MERCADO_PAGO_PUBLIC_KEY) || ""
  });
});

app.post("/api/chat/start", async (req, res) => {
  try {
    const { nome, email, celular, mensagem } = req.body;

    if (!mensagem) {
      return res.status(400).json({ error: "Mensagem obrigatória" });
    }

    let user = null;

    if (email) {
      const [rows] = await pool.query(
        `
        SELECT id, name, email, celular, access_released
        FROM users
        WHERE email = ?
        LIMIT 1
        `,
        [email]
      );
      user = rows[0] || null;
    }

    const { intent, reply } = handleIncomingMessage(mensagem, user);

    let resposta = reply;
    if (intent === "FALLBACK") {
      const respostaClaude = await maybeGetClaudeReply(mensagem, user);
      resposta = respostaClaude || reply;
    }

    return res.json({
      success: true,
      reply: resposta,
      user: user || { nome, email, celular }
    });
  } catch (error) {
    console.error("Erro /api/chat/start:", error);
    return res.status(500).json({
      error: "Erro ao iniciar chat",
      details: error.message
    });
  }
});

app.post("/api/users/register", async (req, res) => {
  try {
    const { name, email, password, celular, nascimento, area } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Nome, e-mail e senha são obrigatórios"
      });
    }

    const [existing] = await pool.query(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: "Já existe uma conta com esse e-mail"
      });
    }

    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, celular, nascimento, area)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        password,
        celular || null,
        nascimento || null,
        area || null
      ]
    );

    return res.status(201).json({
      success: true,
      user: {
        id: result.insertId,
        name,
        email,
        celular: celular || null,
        nascimento: nascimento || null,
        area: area || null,
        access_released: 0
      }
    });
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    return res.status(500).json({
      error: "Erro ao registrar usuário",
      details: error.message
    });
  }
});

app.post("/api/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "E-mail e senha são obrigatórios"
      });
    }

    const [rows] = await pool.query(
      `SELECT id, name, email, password_hash, celular, nascimento, area, access_released
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: "Nenhuma conta cadastrada encontrada"
      });
    }

    const user = rows[0];

    if (user.password_hash !== password) {
      return res.status(401).json({
        error: "E-mail ou senha inválidos."
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        nome: user.name,
        email: user.email,
        celular: user.celular,
        nascimento: user.nascimento,
        area: user.area,
        access_released: user.access_released
      }
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({
      error: "Erro ao fazer login",
      details: error.message
    });
  }
});

app.get("/api/users/access/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);

    const [rows] = await pool.query(
      `SELECT id, name, email, celular, nascimento, area, access_released
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: "Usuário não encontrado"
      });
    }

    return res.json({
      success: true,
      user: {
        id: rows[0].id,
        name: rows[0].name,
        email: rows[0].email,
        celular: rows[0].celular,
        nascimento: rows[0].nascimento,
        area: rows[0].area,
        access_released: rows[0].access_released
      }
    });
  } catch (error) {
    console.error("Erro ao consultar acesso do usuário:", error);
    return res.status(500).json({
      error: "Erro ao consultar acesso",
      details: error.message
    });
  }
});

app.post("/api/payments/pix", async (req, res) => {
  try {
    const { payer, coupon_applied, is_expired } = req.body;
    
    let amount = is_expired ? 69.99 : 39.99; // Base dinâmica

    // Verifica se veio como booleano ou como texto
    if (coupon_applied === true || coupon_applied === "true") { 
      amount = amount - 10; 
    }

    const description = COURSE_DESCRIPTION;

    if (!payer?.email) {
      return res.status(400).json({
        error: "Campos obrigatórios: payer.email"
      });
    }

    const user = await findOrCreateUser({
      name: `${payer.first_name || ""} ${payer.last_name || ""}`.trim(),
      email: payer.email
    });

    const webhookBaseUrl = cleanEnv(process.env.WEBHOOK_BASE_URL);
    const notificationUrl = webhookBaseUrl
      ? `${webhookBaseUrl}/api/webhooks/mercadopago`
      : undefined;

    const externalReference = `user_${user.id}`;

    const body = {
      // 4. Usamos a variável 'amount' que já foi calculada com ou sem desconto
      transaction_amount: Number(amount),
      description,
      payment_method_id: "pix",
      external_reference: externalReference,
      payer: {
        email: payer.email,
        first_name: payer.first_name || "",
        last_name: payer.last_name || "",
        identification: payer.identification?.number
          ? {
              type: payer.identification.type || "CPF",
              number: sanitizeCpf(payer.identification.number)
            }
          : undefined
      },
      notification_url: notificationUrl
    };
    
    const result = await paymentClient.create({ body });
    const tx = result?.point_of_interaction?.transaction_data || {};

    const accessToken = await savePayment({
      userId: user.id,
      paymentId: result.id,
      paymentType: "pix",
      status: result.status,
      statusDetail: result.status_detail,
      amount: result.transaction_amount,
      description,
      payerEmail: payer.email,
      externalReference,
      rawResponse: result
    });

    return res.status(201).json({
      id: result.id,
      status: result.status,
      status_detail: result.status_detail,
      transaction_amount: result.transaction_amount,
      qr_code: tx.qr_code || null,
      qr_code_base64: tx.qr_code_base64 || null,
      ticket_url: tx.ticket_url || null,
      access_token: accessToken
    });
  } catch (error) {
    console.error("Erro PIX:", error);
    return res.status(500).json({
      error: "Erro ao criar pagamento PIX",
      details: error?.message || "Erro desconhecido"
    });
  }
});

app.post("/api/payments/card", async (req, res) => {
  try {
    const {
      amount,
      description,
      installments,
      payment_method_id,
      issuer_id,
      token,
      payer
    } = req.body;

    if (
      !amount ||
      !description ||
      !installments ||
      !payment_method_id ||
      !token ||
      !payer?.email
    ) {
      return res.status(400).json({
        error: "Campos obrigatórios: installments, payment_method_id, token e payer.email"
      });
    }

    const user = await findOrCreateUser({
      name: `${payer.first_name || ""} ${payer.last_name || ""}`.trim(),
      email: payer.email
    });

    const webhookBaseUrl = cleanEnv(process.env.WEBHOOK_BASE_URL);
    const notificationUrl = webhookBaseUrl
      ? `${webhookBaseUrl}/api/webhooks/mercadopago`
      : undefined;

    const externalReference = `user_${user.id}`;

    const body = {
      transaction_amount: Number(amount),
      token,
      description,
      installments: Number(installments),
      payment_method_id,
      issuer_id: issuer_id || undefined,
      external_reference: externalReference,
      payer: {
        email: payer.email,
        identification: payer.identification?.number
          ? {
              type: payer.identification.type || "CPF",
              number: sanitizeCpf(payer.identification.number)
            }
          : undefined
      },
      notification_url: notificationUrl
    };

    const result = await paymentClient.create({ body });

    const accessToken = await savePayment({
      userId: user.id,
      paymentId: result.id,
      paymentType: "card",
      status: result.status,
      statusDetail: result.status_detail,
      amount: result.transaction_amount,
      description,
      payerEmail: payer.email,
      externalReference,
      rawResponse: result
    });

    if (result.status === "approved") {
      await markAccessReleased(result.id, payer.email);
    }

    return res.status(201).json({
      id: result.id,
      status: result.status,
      status_detail: result.status_detail,
      transaction_amount: result.transaction_amount,
      access_token: accessToken
    });
  } catch (error) {
    console.error("Erro cartão:", error);
    return res.status(500).json({
      error: "Erro ao criar pagamento com cartão",
      details: error?.message || "Erro desconhecido"
    });
  }
});

app.get("/api/payments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await paymentClient.get({ id });

    await pool.query(
      `
      UPDATE payments
      SET
        status = ?,
        status_detail = ?,
        transaction_amount = ?,
        raw_response = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE payment_id = ?
      `,
      [
        result.status,
        result.status_detail || null,
        Number(result.transaction_amount || 0),
        JSON.stringify(result),
        String(result.id)
      ]
    );

    if (result.status === "approved") {
      const payerEmail = result?.payer?.email || null;

      const externalReference = result?.external_reference || null;
      const userId = externalReference?.startsWith("user_")
        ? Number(externalReference.split("_")[1])
        : null;

      if (userId) {
        await pool.query(
          `
          UPDATE users
          SET access_released = 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [userId]
        );

        await pool.query(
          `
          UPDATE payments
          SET user_id = COALESCE(user_id, ?), updated_at = CURRENT_TIMESTAMP
          WHERE payment_id = ?
          `,
          [userId, String(result.id)]
        );
      } else if (payerEmail) {
        await markAccessReleased(result.id, payerEmail);
      }
    }

    return res.json({
      id: result.id,
      status: result.status,
      status_detail: result.status_detail,
      transaction_amount: result.transaction_amount,
      payment_method_id: result.payment_method_id
    });
  } catch (error) {
    console.error("Erro consulta:", error);
    return res.status(500).json({
      error: "Erro ao consultar pagamento",
      details: error?.message || "Erro desconhecido"
    });
  }
});

app.post("/api/webhooks/mercadopago", async (req, res) => {
  try {
    console.log("Webhook recebido:", JSON.stringify(req.body, null, 2));

    const topic = req.body?.type || req.body?.topic || null;
    const actionName = req.body?.action || null;
    const dataId = req.body?.data?.id || req.body?.id || null;

    await pool.query(
      `
      INSERT INTO payment_events (payment_id, event_type, action_name, raw_payload)
      VALUES (?, ?, ?, ?)
      `,
      [
        dataId ? String(dataId) : null,
        topic,
        actionName,
        JSON.stringify(req.body)
      ]
    );

    if (dataId) {
      const payment = await paymentClient.get({ id: String(dataId) });

      const [existingRows] = await pool.query(
        `
        SELECT user_id, payer_email, access_token
        FROM payments
        WHERE payment_id = ?
        LIMIT 1
        `,
        [String(payment.id)]
      );

      const existingPayment = existingRows[0] || null;

      const payerEmail =
        payment?.payer?.email ||
        existingPayment?.payer_email ||
        null;

      const externalReference = payment?.external_reference || null;
      const userIdFromReference = externalReference?.startsWith("user_")
        ? Number(externalReference.split("_")[1])
        : null;

      const userId = userIdFromReference || existingPayment?.user_id || null;

      if (!payerEmail) {
        console.log(
          `Webhook sem payer_email para payment ${payment.id}. Tentando seguir com external_reference/user_id.`
        );
      }

      if (!payerEmail && !userId) {
        console.log(
          `Webhook ignorado: sem payer_email e sem user_id para payment ${payment.id}`
        );
        return res.sendStatus(200);
      }

      await pool.query(
        `
        INSERT INTO payments (
          user_id,
          payment_id,
          payment_type,
          status,
          status_detail,
          transaction_amount,
          description,
          payer_email,
          external_reference,
          raw_response
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          user_id = VALUES(user_id),
          status = VALUES(status),
          status_detail = VALUES(status_detail),
          transaction_amount = VALUES(transaction_amount),
          description = VALUES(description),
          payer_email = VALUES(payer_email),
          external_reference = VALUES(external_reference),
          raw_response = VALUES(raw_response),
          updated_at = CURRENT_TIMESTAMP
        `,
        [
          userId,
          String(payment.id),
          payment.payment_method_id || "unknown",
          payment.status || "unknown",
          payment.status_detail || null,
          Number(payment.transaction_amount || 0),
          payment.description || null,
          payerEmail || "sem-email@temporario.local",
          externalReference || null,
          JSON.stringify(payment)
        ]
      );

      if (payment.status === "approved") {
        if (userId) {
          await pool.query(
            `
            UPDATE users
            SET access_released = 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [userId]
          );

          await pool.query(
            `
            UPDATE payments
            SET status = 'approved', user_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE payment_id = ?
            `,
            [userId, String(payment.id)]
          );

          console.log(`Acesso liberado para user_id ${userId}`);
        } else if (payerEmail) {
          await markAccessReleased(payment.id, payerEmail);
          console.log(`Acesso liberado para email ${payerEmail}`);
        }
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Erro webhook:", error);
    return res.sendStatus(200);
  }
});

app.get("/api/webhooks/whatsapp", (req, res) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    const wa = getWhatsAppConfig();

    console.log("Verificação webhook WhatsApp recebida:", {
      mode,
      tokenRecebido: token || null,
      tokenEsperadoConfigurado: Boolean(wa.verifyToken)
    });

    if (mode === "subscribe" && token === wa.verifyToken) {
      return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
  } catch (error) {
    console.error("Erro verificação webhook WhatsApp:", error);
    return res.sendStatus(500);
  }
});

app.post("/api/webhooks/whatsapp", async (req, res) => {
  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    console.log("Webhook WhatsApp payload recebido.");

    const delay = ms => new Promise(res => setTimeout(res, ms));

    const message = value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = normalizePhoneBR(message.from || "");
    const type = message.type;

    if (type === "audio" || type === "voice") {
      const audioReply = "Menina, estou num lugar que não consigo ouvir áudio agora 🙈 Consegue me escrever rapidinho qual é a sua dúvida?";
      await sendWhatsAppText(from, audioReply);
      return res.sendStatus(200);
    }

    const text = message?.text?.body || "";

    const user = await getUserByPhone(from);

    await saveWhatsappMessage({
      userId: user?.id || null,
      celular: from,
      direction: "in",
      messageText: text,
      waMessageId: message.id || null,
      rawPayload: req.body
    });

    if (user?.bot_paused) {
      if (user?.id) {
        await pool.query(`
          UPDATE users
          SET last_whatsapp_message_at = NOW(),
              last_customer_message_at = NOW(),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [user.id]);
      }
      console.log(`⏸️ Bot pausado para user ${user?.id}`);
      return res.sendStatus(200);
    }

    if (user?.id) {
      await pool.query(
        `
        UPDATE users
        SET last_whatsapp_message_at = NOW(),
            last_customer_message_at = NOW(),
            whatsapp_followup_finished = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [user.id]
      );
    }

    const { intent, reply } = handleIncomingMessage(text, user);

    let finalReply = reply;
    
    if (intent === "FALLBACK" || intent === "fallback") {
      const claudeReply = await maybeGetClaudeReply(text, user);
      finalReply = claudeReply || reply || "Posso te ajudar com pagamento, acesso ou dúvidas do curso 😊";
    }

    const replyParts = finalReply.split('\n\n').filter(part => part.trim() !== "");

    let lastSendResponse = null;

    for (let i = 0; i < replyParts.length; i++) {
      const part = replyParts[i];
      
      lastSendResponse = await sendWhatsAppText(from, part.trim());

      if (i < replyParts.length - 1) {
        await delay(2500); 
      }
    }

    await saveWhatsappMessage({
      userId: user?.id || null,
      celular: from,
      direction: "out",
      messageText: finalReply,
      waMessageId: lastSendResponse?.messages?.[0]?.id || null,
      rawPayload: lastSendResponse
    });

    return res.sendStatus(200);
  } catch (error) {
    console.error("Erro webhook WhatsApp:", error);
    return res.sendStatus(200);
  }
});

const FOLLOWUP_INTERVALS = [30, 40];
const MAX_FOLLOWUPS = FOLLOWUP_INTERVALS.length;

function getFollowupMessage(followupCount) {
  const mensagens = [
    `Oii! Estou passando de novo só pra te lembrar que a condição especial da Influencer Academy ainda tá valendo! ✨\n\nQuer que eu te mande o link do Pix ou do cartão pra facilitar e a gente já liberar o seu acesso?`,
    
    `Última mensagem por aqui! 🙈\n\nSe você ainda estiver com alguma dúvida sobre o curso, o conteúdo ou o pagamento, vou deixar o contato do nosso especialista.\n\nPode chamar lá que a equipe te ajuda com tudo:\n👉 https://wa.me/5511933128628` 
  ];

  return mensagens[followupCount] || null;  
}

async function getUsersForWhatsappFollowUp() {
  const [rows] = await pool.query(
    `
    SELECT id, name, celular, whatsapp_followup_count
    FROM users
      WHERE id >= 100
      AND access_released = 0
      AND whatsapp_sent = 1
      AND whatsapp_opt_in = 1
      AND bot_paused = 0
      AND whatsapp_followup_finished = 0
      AND whatsapp_followup_count < ?
      AND celular IS NOT NULL
      AND celular <> ''
      AND (
        (whatsapp_followup_count = 0 AND last_bot_message_at <= NOW() - INTERVAL ? MINUTE)
        OR (whatsapp_followup_count = 1 AND last_bot_message_at <= NOW() - INTERVAL ? MINUTE)
      )
      AND NOT EXISTS (
        SELECT 1
        FROM whatsapp_messages wm
        WHERE wm.user_id = users.id
          AND wm.direction = 'in'
          AND wm.created_at >= users.whatsapp_sent_at
      )
    `,
    [MAX_FOLLOWUPS, FOLLOWUP_INTERVALS[0], FOLLOWUP_INTERVALS[1]]
  );

  return rows;
}

async function processWhatsappFollowUps() {
  try {
    const users = await getUsersForWhatsappFollowUp();

    for (const user of users) {
      try {
        const celular = getFinalTestPhone(user);
        if (!celular) continue;

        const followupCount = Number(user.whatsapp_followup_count || 0);
        const message = getFollowupMessage(followupCount);

        if (!message) continue;

        const sendResponse = await sendWhatsAppText(celular, message);

        await saveWhatsappMessage({
          userId: user.id,
          celular,
          direction: "out",
          messageText: message,
          waMessageId: sendResponse?.messages?.[0]?.id || null,
          rawPayload: sendResponse
        });

        const nextCount = followupCount + 1;

        await pool.query(
          `
          UPDATE users
          SET whatsapp_followup_count = ?,
              whatsapp_followup_finished = ?,
              last_bot_message_at = NOW(),
              last_whatsapp_message_at = NOW(),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [
            nextCount,
            nextCount >= MAX_FOLLOWUPS ? 1 : 0,
            user.id
          ]
        );

        console.log(`Follow-up ${nextCount} enviado para user_id ${user.id} - ${celular}`);
      } catch (error) {
        console.error(`Erro no follow-up para user_id ${user.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error("Erro geral no processo de follow-up:", error.message);
  }
}

async function start() {
  try {
    await initDB();
    await ensureTables();

    
// ===================== ROTA_PIX_PREMIUM_V2 =====================
app.use(express.json({ limit: "10mb" }));

const IA_PAYMENT_PRICE = Number(process.env.COURSE_PAYMENT_AMOUNT || 39.99);

async function iaCreatePixPayment(req, res) {
  try {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;

    if (!token) {
      return res.status(500).json({
        ok: false,
        message: "Configure a variável MERCADO_PAGO_ACCESS_TOKEN no Railway."
      });
    }

    const amount = Number(req.body?.amount || IA_PAYMENT_PRICE);
    const description = req.body?.description || "Influencer Academy - acesso completo";

    const idempotencyKey =
      globalThis.crypto && globalThis.crypto.randomUUID
        ? globalThis.crypto.randomUUID()
        : String(Date.now()) + "-" + Math.random();

    const payerEmail = "cliente+" + Date.now() + "@influenceracademy.com.br";

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description,
        payment_method_id: "pix",
        payer: {
          email: payerEmail,
          first_name: "Cliente",
          last_name: "Influencer Academy"
        }
      })
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Erro Mercado Pago PIX:", data);
      return res.status(500).json({
        ok: false,
        message: "Mercado Pago não conseguiu gerar o PIX.",
        details: data
      });
    }

    const transaction = data.point_of_interaction?.transaction_data || {};

    return res.json({
      ok: true,
      payment_id: data.id,
      status: data.status,
      qr_code: transaction.qr_code,
      qr_code_base64: transaction.qr_code_base64,
      ticket_url: transaction.ticket_url
    });
  } catch (error) {
    console.error("Erro ao criar PIX:", error);
    return res.status(500).json({
      ok: false,
      message: "Erro interno ao gerar PIX."
    });
  }
}

async function iaCheckPixPayment(req, res) {
  try {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;

    if (!token) {
      return res.status(500).json({
        ok: false,
        message: "Configure a variável MERCADO_PAGO_ACCESS_TOKEN no Railway."
      });
    }

    const paymentId = req.params.id;

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments/" + paymentId, {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      return res.status(500).json({
        ok: false,
        message: "Não consegui consultar esse pagamento.",
        details: data
      });
    }

    return res.json({
      ok: true,
      payment_id: data.id,
      status: data.status,
      status_detail: data.status_detail
    });
  } catch (error) {
    console.error("Erro ao consultar PIX:", error);
    return res.status(500).json({
      ok: false,
      message: "Erro interno ao consultar pagamento."
    });
  }
}

app.post("/payments/create-pix", iaCreatePixPayment);
app.post("/api/payments/create-pix", iaCreatePixPayment);

app.get("/payments/status/:id", iaCheckPixPayment);
app.get("/api/payments/status/:id", iaCheckPixPayment);
// =================== FIM ROTA_PIX_PREMIUM_V2 ===================

// ===================== AUTO_RELEASE_AFTER_PAYMENT_V1 =====================
app.use(express.json({ limit: "10mb" }));

let iaAutoReleasePool = null;

async function iaGetAutoReleasePool() {
  if (iaAutoReleasePool) return iaAutoReleasePool;

  const mysqlModule = await import("mysql2/promise");
  const mysql = mysqlModule.default || mysqlModule;

  iaAutoReleasePool = mysql.createPool({
    host: process.env.MYSQLHOST || process.env.DB_HOST,
    user: process.env.MYSQLUSER || process.env.DB_USER,
    password: process.env.MYSQLPASSWORD || process.env.DB_PASS,
    database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || process.env.MYSQL_DB || process.env.DB_NAME || "railway",
    port: Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  return iaAutoReleasePool;
}

async function iaCheckMercadoPagoPayment(paymentId) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;

  if (!token) {
    return {
      ok: false,
      approved: false,
      message: "MERCADO_PAGO_ACCESS_TOKEN não configurado no Railway."
    };
  }

  if (!paymentId) {
    return {
      ok: false,
      approved: false,
      message: "payment_id não recebido."
    };
  }

  const mpResponse = await fetch("https://api.mercadopago.com/v1/payments/" + encodeURIComponent(paymentId), {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token
    }
  });

  const data = await mpResponse.json();

  if (!mpResponse.ok) {
    console.error("Erro ao consultar Mercado Pago:", data);
    return {
      ok: false,
      approved: false,
      message: "Não foi possível consultar o pagamento no Mercado Pago.",
      details: data
    };
  }

  return {
    ok: true,
    approved: data.status === "approved",
    status: data.status,
    status_detail: data.status_detail,
    payment_id: data.id
  };
}

async function iaReleaseAccessByEmail(email) {
  const pool = await iaGetAutoReleasePool();

  let result;

  try {
    [result] = await pool.execute(
      "UPDATE users SET access_released = 1, updated_at = NOW() WHERE LOWER(email) = LOWER(?)",
      [email]
    );
  } catch (error) {
    [result] = await pool.execute(
      "UPDATE users SET access_released = 1 WHERE LOWER(email) = LOWER(?)",
      [email]
    );
  }

  return result;
}

async function iaReleaseAccessRoute(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const paymentId = String(req.body?.payment_id || req.body?.paymentId || "").trim();

    if (!email) {
      return res.status(400).json({
        ok: false,
        message: "E-mail não recebido para liberar o acesso."
      });
    }

    if (!paymentId) {
      return res.status(400).json({
        ok: false,
        message: "Pagamento não identificado. Gere ou verifique o PIX novamente."
      });
    }

    const payment = await iaCheckMercadoPagoPayment(paymentId);

    if (!payment.ok) {
      return res.status(500).json({
        ok: false,
        message: payment.message || "Erro ao validar pagamento."
      });
    }

    if (!payment.approved) {
      return res.status(402).json({
        ok: false,
        message: "Pagamento ainda não aprovado.",
        status: payment.status,
        status_detail: payment.status_detail
      });
    }

    const update = await iaReleaseAccessByEmail(email);

    if (!update || update.affectedRows < 1) {
      return res.status(404).json({
        ok: false,
        message: "Pagamento aprovado, mas não encontrei esse e-mail no cadastro. Crie a conta novamente com o mesmo e-mail."
      });
    }

    return res.json({
      ok: true,
      released: true,
      email,
      payment_id: payment.payment_id,
      message: "Acesso liberado com sucesso."
    });
  } catch (error) {
    console.error("Erro ao liberar acesso após pagamento:", error);

    return res.status(500).json({
      ok: false,
      message: "Erro interno ao liberar acesso após pagamento."
    });
  }
}

app.post("/api/payments/release-access", iaReleaseAccessRoute);
app.post("/payments/release-access", iaReleaseAccessRoute);

app.get("/api/payments/release-health", async (req, res) => {
  try {
    const pool = await iaGetAutoReleasePool();
    await pool.query("SELECT 1");
    res.json({
      ok: true,
      message: "Rota de liberação automática ativa."
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Erro na rota de liberação automática."
    });
  }
});
// =================== FIM AUTO_RELEASE_AFTER_PAYMENT_V1 ===================

// ===================== PIX_RELEASE_DB_FINAL_V1 =====================
app.use(express.json({ limit: "10mb" }));

let iaPixReleasePool = null;

async function iaGetPixReleasePool() {
  if (iaPixReleasePool) return iaPixReleasePool;

  const mysqlModule = await import("mysql2/promise");
  const mysql = mysqlModule.default || mysqlModule;

  iaPixReleasePool = mysql.createPool({
    host: process.env.MYSQLHOST || process.env.DB_HOST,
    user: process.env.MYSQLUSER || process.env.DB_USER,
    password: process.env.MYSQLPASSWORD || process.env.DB_PASS,
    database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || process.env.MYSQL_DB || process.env.DB_NAME || "railway",
    port: Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  return iaPixReleasePool;
}

async function iaCheckPixApproved(paymentId) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;

  if (!token) {
    return {
      ok: false,
      approved: false,
      message: "MERCADO_PAGO_ACCESS_TOKEN não configurado no Railway."
    };
  }

  if (!paymentId) {
    return {
      ok: false,
      approved: false,
      message: "payment_id não recebido."
    };
  }

  const mpResponse = await fetch("https://api.mercadopago.com/v1/payments/" + encodeURIComponent(paymentId), {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token
    }
  });

  const data = await mpResponse.json();

  if (!mpResponse.ok) {
    console.error("Erro Mercado Pago release:", data);

    return {
      ok: false,
      approved: false,
      message: "Não foi possível consultar o pagamento no Mercado Pago.",
      details: data
    };
  }

  return {
    ok: true,
    approved: data.status === "approved",
    status: data.status,
    status_detail: data.status_detail,
    payment_id: data.id
  };
}

async function iaReleaseUserAccess(email) {
  const pool = await iaGetPixReleasePool();

  let result;

  try {
    [result] = await pool.execute(
      "UPDATE users SET access_released = 1, updated_at = NOW() WHERE LOWER(email) = LOWER(?)",
      [email]
    );
  } catch (err) {
    [result] = await pool.execute(
      "UPDATE users SET access_released = 1 WHERE LOWER(email) = LOWER(?)",
      [email]
    );
  }

  return result;
}

async function iaPixReleaseRoute(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const paymentId = String(req.body?.payment_id || req.body?.paymentId || "").trim();

    if (!email) {
      return res.status(400).json({
        ok: false,
        released: false,
        message: "Informe o e-mail do aluno para liberar o acesso."
      });
    }

    if (!paymentId) {
      return res.status(400).json({
        ok: false,
        released: false,
        message: "Pagamento não identificado. Gere o PIX novamente ou clique em verificar pagamento."
      });
    }

    const payment = await iaCheckPixApproved(paymentId);

    if (!payment.ok) {
      return res.status(500).json({
        ok: false,
        released: false,
        message: payment.message || "Erro ao validar pagamento."
      });
    }

    if (!payment.approved) {
      return res.status(402).json({
        ok: false,
        released: false,
        message: "Pagamento ainda não aprovado.",
        status: payment.status,
        status_detail: payment.status_detail
      });
    }

    const update = await iaReleaseUserAccess(email);

    if (!update || update.affectedRows < 1) {
      return res.status(404).json({
        ok: false,
        released: false,
        payment_approved: true,
        message: "Pagamento aprovado, mas esse e-mail ainda não existe no cadastro. Crie a conta com esse mesmo e-mail ou ajuste o e-mail no banco.",
        email
      });
    }

    return res.json({
      ok: true,
      released: true,
      payment_approved: true,
      email,
      payment_id: payment.payment_id,
      message: "Pagamento aprovado e acesso liberado no banco."
    });
  } catch (error) {
    console.error("Erro PIX_RELEASE_DB_FINAL_V1:", error);

    return res.status(500).json({
      ok: false,
      released: false,
      message: "Erro interno ao liberar acesso no banco."
    });
  }
}

app.post("/api/payments/verify-release", iaPixReleaseRoute);
app.post("/payments/verify-release", iaPixReleaseRoute);

app.get("/api/payments/verify-release-health", async (req, res) => {
  try {
    const pool = await iaGetPixReleasePool();
    await pool.query("SELECT 1");
    res.json({
      ok: true,
      message: "Rota verify-release ativa e conectada ao banco."
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Erro na rota verify-release."
    });
  }
});
// =================== FIM PIX_RELEASE_DB_FINAL_V1 ===================

// ===================== PIX_WEBHOOK_AUTO_RELEASE_FINAL_V2 =====================
app.use(express.json({ limit: "10mb" }));

let iaPixAutoPool = null;

function iaPixDbConfig() {
  return {
    host: process.env.MYSQLHOST || process.env.MYSQL_HOST || process.env.DB_HOST,
    user: process.env.MYSQLUSER || process.env.MYSQL_USER || process.env.DB_USER,
    password: process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || process.env.DB_PASS,
    database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || process.env.MYSQL_DB || process.env.DB_NAME || "railway",
    port: Number(process.env.MYSQLPORT || process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

async function iaGetPixAutoPool() {
  if (iaPixAutoPool) return iaPixAutoPool;

  const mysqlModule = await import("mysql2/promise");
  const mysql = mysqlModule.default || mysqlModule;

  iaPixAutoPool = mysql.createPool(iaPixDbConfig());
  return iaPixAutoPool;
}

function iaNormalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function iaReleaseAccessByEmailFinal(email) {
  const cleanEmail = iaNormalizeEmail(email);

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return {
      ok: false,
      affectedRows: 0,
      message: "E-mail inválido para liberação."
    };
  }

  const pool = await iaGetPixAutoPool();

  let result;

  try {
    [result] = await pool.execute(
      "UPDATE users SET access_released = 1, updated_at = NOW() WHERE LOWER(email) = LOWER(?)",
      [cleanEmail]
    );
  } catch (error) {
    console.error("Erro update com updated_at, tentando sem updated_at:", error.message);

    [result] = await pool.execute(
      "UPDATE users SET access_released = 1 WHERE LOWER(email) = LOWER(?)",
      [cleanEmail]
    );
  }

  return {
    ok: true,
    affectedRows: result.affectedRows || 0,
    email: cleanEmail
  };
}

async function iaGetMercadoPagoPaymentFinal(paymentId) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;

  if (!token) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado no Railway.");
  }

  if (!paymentId) {
    throw new Error("payment_id não recebido.");
  }

  const response = await fetch("https://api.mercadopago.com/v1/payments/" + encodeURIComponent(paymentId), {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token
    }
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Erro Mercado Pago:", data);
    throw new Error("Não foi possível consultar o pagamento no Mercado Pago.");
  }

  return data;
}

function iaExtractEmailFromPaymentFinal(payment) {
  return iaNormalizeEmail(
    payment?.metadata?.email ||
    payment?.metadata?.student_email ||
    payment?.external_reference ||
    payment?.payer?.email ||
    ""
  );
}

async function iaReleaseFromPaymentFinal(paymentId) {
  const payment = await iaGetMercadoPagoPaymentFinal(paymentId);

  const email = iaExtractEmailFromPaymentFinal(payment);
  const approved = payment.status === "approved";

  if (!approved) {
    return {
      ok: true,
      released: false,
      approved: false,
      status: payment.status,
      status_detail: payment.status_detail,
      email,
      payment_id: payment.id,
      message: "Pagamento ainda não aprovado."
    };
  }

  if (!email) {
    return {
      ok: false,
      released: false,
      approved: true,
      payment_id: payment.id,
      message: "Pagamento aprovado, mas não encontrei e-mail vinculado ao pagamento."
    };
  }

  const update = await iaReleaseAccessByEmailFinal(email);

  if (!update.affectedRows) {
    return {
      ok: false,
      released: false,
      approved: true,
      payment_id: payment.id,
      email,
      message: "Pagamento aprovado, mas esse e-mail não foi encontrado na tabela users."
    };
  }

  return {
    ok: true,
    released: true,
    approved: true,
    payment_id: payment.id,
    email,
    message: "Pagamento aprovado e acesso liberado automaticamente."
  };
}

app.post("/api/payments/create-pix-direct", async (req, res) => {
  try {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;

    if (!token) {
      return res.status(500).json({
        ok: false,
        message: "MERCADO_PAGO_ACCESS_TOKEN não configurado no Railway."
      });
    }

    const email = iaNormalizeEmail(req.body?.email || req.body?.student_email || req.body?.payer_email);

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        ok: false,
        message: "Cadastro não identificado. Volte, crie sua conta e tente gerar o PIX novamente."
      });
    }

    const price = Number(process.env.COURSE_PRICE || process.env.COURSE_PRICE_NUM || 39.99);

    const mpBody = {
      transaction_amount: price,
      description: "Influencer Academy - acesso completo",
      payment_method_id: "pix",
      payer: {
        email
      },
      external_reference: email,
      metadata: {
        email,
        student_email: email,
        course: "Influencer Academy"
      }
    };

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        "X-Idempotency-Key": "ia-pix-" + Date.now() + "-" + Math.random().toString(16).slice(2)
      },
      body: JSON.stringify(mpBody)
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Erro ao criar PIX:", data);

      return res.status(500).json({
        ok: false,
        message: "Erro ao gerar QR Code PIX.",
        details: data
      });
    }

    const transaction = data?.point_of_interaction?.transaction_data || {};

    return res.json({
      ok: true,
      payment_id: data.id,
      status: data.status,
      email,
      qr_code: transaction.qr_code,
      qr_code_base64: transaction.qr_code_base64,
      ticket_url: transaction.ticket_url,
      message: "PIX gerado com sucesso."
    });
  } catch (error) {
    console.error("Erro create-pix-direct:", error);

    return res.status(500).json({
      ok: false,
      message: "Erro interno ao gerar QR Code PIX."
    });
  }
});

app.post("/api/payments/check-pix-direct", async (req, res) => {
  try {
    const paymentId = String(req.body?.payment_id || req.body?.paymentId || "").trim();

    const result = await iaReleaseFromPaymentFinal(paymentId);

    const statusCode = result.released ? 200 : result.approved ? 404 : 402;

    return res.status(statusCode).json(result);
  } catch (error) {
    console.error("Erro check-pix-direct:", error);

    return res.status(500).json({
      ok: false,
      released: false,
      message: error.message || "Erro interno ao verificar pagamento."
    });
  }
});

async function iaMercadoPagoWebhookFinal(req, res) {
  try {
    const paymentId =
      req.body?.data?.id ||
      req.body?.id ||
      req.query?.["data.id"] ||
      req.query?.id ||
      req.query?.payment_id;

    if (!paymentId) {
      return res.status(200).json({
        ok: true,
        ignored: true,
        message: "Webhook recebido sem payment_id."
      });
    }

    const result = await iaReleaseFromPaymentFinal(paymentId);

    console.log("Webhook Mercado Pago processado:", result);

    return res.status(200).json({
      ok: true,
      result
    });
  } catch (error) {
    console.error("Erro webhook Mercado Pago:", error);

    return res.status(200).json({
      ok: false,
      message: error.message || "Erro ao processar webhook."
    });
  }
}

app.post("/api/webhooks/mercadopago", iaMercadoPagoWebhookFinal);
app.post("/webhooks/mercadopago", iaMercadoPagoWebhookFinal);
app.get("/api/webhooks/mercadopago", iaMercadoPagoWebhookFinal);

app.get("/api/payments/direct-health", async (req, res) => {
  try {
    const pool = await iaGetPixAutoPool();
    await pool.query("SELECT 1");

    res.json({
      ok: true,
      database: iaPixDbConfig().database,
      message: "PIX automático ativo e conectado ao banco."
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message || "Erro no PIX automático."
    });
  }
});
// =================== FIM PIX_WEBHOOK_AUTO_RELEASE_FINAL_V2 ===================
app.listen(port, () => {
      console.log(`Servidor rodando na porta ${port}`);
    });

    setInterval(() => {
      processPendingWhatsappMessages();
    }, 60 * 1000);

    setInterval(() => {
      processWhatsappFollowUps();
    }, 60 * 1000);

    processPendingWhatsappMessages();
    processWhatsappFollowUps();
  } catch (error) {
    console.error("Erro ao iniciar servidor:", error);
    process.exit(1);
  }
}

start();