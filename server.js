import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import crypto from "crypto";
import { MercadoPagoConfig, Payment } from "mercadopago";
import handleIncomingMessage from "./messageHandler.js";
import siteChatRoutes from "./siteChatRoutes.js";

const BOT_VERSION = "influencer-academy-whatsapp-v8-clean";
const COURSE_NAME_SAFE = "Influencer Academy";
const COURSE_URL_SAFE = "https://gustavosales2001.github.io/curso_novo/";
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
        "https://gustavosales2001.github.io"
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
const COURSE_FRONTEND_URL = "https://gustavosales2001.github.io/curso_novo/";

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
    mysql: {
      host: cleanEnv(process.env.MYSQLHOST) || null,
      database: cleanEnv(process.env.MYSQL_DATABASE) || null,
      password_configured: Boolean(cleanEnv(process.env.MYSQLPASSWORD))
    },
    mercado_pago: {
      access_token_configured: Boolean(cleanEnv(process.env.MERCADO_PAGO_ACCESS_TOKEN))
    },
    whatsapp: {
      token_configured: Boolean(wa.token)
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

  const addColumn = async (colName, colDef) => {
    if (!columnNames.includes(colName)) {
      await pool.query(`ALTER TABLE users ADD COLUMN ${colName} ${colDef}`);
    }
  };

  await addColumn("celular", "VARCHAR(30) NULL");
  await addColumn("nascimento", "VARCHAR(30) NULL");
  await addColumn("area", "VARCHAR(100) NULL");
  await addColumn("whatsapp_sent", "TINYINT(1) NOT NULL DEFAULT 0");
  await addColumn("whatsapp_sent_at", "TIMESTAMP NULL DEFAULT NULL");
  await addColumn("last_whatsapp_message_at", "TIMESTAMP NULL DEFAULT NULL");
  await addColumn("whatsapp_opt_in", "TINYINT(1) NOT NULL DEFAULT 1");
  await addColumn("whatsapp_followup_count", "TINYINT(1) NOT NULL DEFAULT 0");
  await addColumn("whatsapp_followup_finished", "TINYINT(1) NOT NULL DEFAULT 0");
  await addColumn("last_customer_message_at", "TIMESTAMP NULL DEFAULT NULL");
  await addColumn("last_bot_message_at", "TIMESTAMP NULL DEFAULT NULL");
  await addColumn("bot_paused", "TINYINT(1) NOT NULL DEFAULT 0");

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
      CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
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
      CONSTRAINT fk_whatsapp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function findOrCreateUser({ name, email }) {
  const [rows] = await pool.query(
    `SELECT id, email, name, celular, nascimento, area, access_released FROM users WHERE email = ? LIMIT 1`,
    [email]
  );

  if (rows.length > 0) return rows[0];

  const [result] = await pool.query(
    `INSERT INTO users (name, email) VALUES (?, ?)`,
    [name || null, email]
  );

  return { id: result.insertId, name: name || null, email, celular: null, access_released: 0 };
}

async function savePayment({
  userId, paymentId, paymentType, status, statusDetail, amount, description, payerEmail, externalReference, rawResponse
}) {
  const accessToken = generateAccessToken();

  await pool.query(
    `INSERT INTO payments (
      user_id, payment_id, payment_type, status, status_detail, transaction_amount, description, payer_email, external_reference, access_token, raw_response
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      status = VALUES(status), status_detail = VALUES(status_detail), transaction_amount = VALUES(transaction_amount),
      description = VALUES(description), payer_email = VALUES(payer_email), external_reference = VALUES(external_reference),
      raw_response = VALUES(raw_response), updated_at = CURRENT_TIMESTAMP`,
    [
      userId || null, String(paymentId), paymentType, status, statusDetail || null, Number(amount || 0),
      description || null, payerEmail, externalReference || null, accessToken, JSON.stringify(rawResponse || {})
    ]
  );

  return accessToken;
}

async function markAccessReleased(paymentId, email) {
  await pool.query(`UPDATE payments SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE payment_id = ?`, [String(paymentId)]);
  if (email) {
    await pool.query(`UPDATE users SET access_released = 1, updated_at = CURRENT_TIMESTAMP WHERE email = ?`, [email]);
  }
}

async function saveWhatsappMessage({
  userId = null, celular, direction, messageText = "", waMessageId = null, rawPayload = {}
}) {
  await pool.query(
    `INSERT INTO whatsapp_messages (user_id, celular, direction, message_text, wa_message_id, raw_payload) VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, celular, direction, messageText || null, waMessageId || null, JSON.stringify(rawPayload || {})]
  );
}

async function saveAppLog({ level = "info", source = null, eventName = null, message = "", userId = null, celular = null, email = null, metadata = {} } = {}) {
  try {
    if (!pool) return;
    await pool.query(
      `INSERT INTO app_logs (level, source, event_name, message, user_id, celular, email, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [level, source, eventName, message, userId, celular, email, JSON.stringify(metadata || {})]
    );
  } catch (error) {
    console.error("Erro ao salvar app_logs:", error.message);
  }
}

async function sendWhatsAppText(to, text) {
  const wa = getWhatsAppConfig();
  const url = getWhatsAppMessagesUrl();

  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${wa.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Erro ao enviar WhatsApp");
  return data;
}

async function getUserByPhone(celular) {
  const normalized = normalizePhoneBR(celular);
  const [rows] = await pool.query(
    `SELECT id, name, email, celular, access_released, whatsapp_sent, bot_paused FROM users
     WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(celular, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ? LIMIT 1`,
    [`%${normalized.slice(-10)}`]
  );
  return rows[0] || null;
}

async function getPendingWhatsappUsers() {
  const [rows] = await pool.query(
    `SELECT id, name, celular FROM users
     WHERE id >= 100 AND access_released = 0 AND whatsapp_sent = 0 AND whatsapp_opt_in = 1 AND bot_paused = 0
     AND celular IS NOT NULL AND celular <> '' AND created_at <= NOW() - INTERVAL 20 MINUTE`
  );
  return rows;
}

async function markWhatsappSent(userId) {
  await pool.query(
    `UPDATE users SET whatsapp_sent = 1, whatsapp_sent_at = NOW(), last_whatsapp_message_at = NOW(),
     last_bot_message_at = NOW(), whatsapp_followup_count = 0, whatsapp_followup_finished = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [userId]
  );
}

async function getConversationHistory(userId, limit = 10) {
  if (!userId) return [];
  try {
    const [rows] = await pool.query(
      `SELECT direction, message_text, created_at FROM whatsapp_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [userId, limit]
    );
    return rows.reverse();
  } catch (error) {
    console.error("Erro histórico:", error.message);
    return [];
  }
}

function buildMessageHistory(conversationHistory, currentMessage) {
  const messages = [];
  for (const msg of conversationHistory) {
    messages.push({ role: msg.direction === "in" ? "user" : "assistant", content: msg.message_text || "" });
  }
  messages.push({ role: "user", content: currentMessage });
  return messages;
}

// ==========================================================
// CLAUDE 100% INFLUENCER ACADEMY (SEM CÓDIGO DE CURRÍCULO)
// ==========================================================
async function maybeGetClaudeReply(messageText, user) {
  const claudeKey = cleanEnv(process.env.CLAUDE_API_KEY);
  if (!claudeKey || claudeKey === "sua_chave_real") return null;

  try {
    const history = user?.id ? await getConversationHistory(user.id, 6) : [];
    const messages = buildMessageHistory(history, messageText);

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
        O curso ensina criação de conteúdo, crescimento no Instagram, edição (CapCut/Canva) e parcerias.
        
        REGRA 1: Seja natural, casual e acolhedor (use 1 ou 2 emojis).
        REGRA 2: Nunca dê textos enormes. Seja objetivo.
        REGRA 3: O curso custa R$ 39,99.
        REGRA 4: Se o cliente relatar erro, pagamento não liberado ou quiser suporte humano, direcione para o WhatsApp: 5511933128628.
        REGRA 5: NUNCA, em hipótese alguma, fale sobre currículos, vagas, Gupy ou entrevistas de emprego. Você é do nicho de influenciadores digitais.`,
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

// ==========================================================
// FOLLOW-UPS (MENSAGEM INICIAL + 2 REPESCAGENS = 3 MENSAGENS)
// ==========================================================
const FOLLOWUP_INTERVALS = [30, 40]; // 30 min para a segunda msg, 40 min para a terceira e última.
const MAX_FOLLOWUPS = FOLLOWUP_INTERVALS.length;

function getFollowupMessage(followupCount) {
  const mensagens = [
    // 2ª Mensagem (+30 min da primeira)
    `Oii! Estou passando de novo só pra te lembrar que a condição especial da Influencer Academy ainda tá valendo! ✨\n\nQuer que eu te mande o link do Pix ou do cartão pra facilitar e a gente já liberar o seu acesso?`,
    
    // 3ª Mensagem (+40 min da segunda)
    `Última mensagem por aqui! 🙈\n\nSe você ainda estiver com alguma dúvida sobre o curso, o conteúdo ou o pagamento, vou deixar o contato do nosso especialista.\n\nPode chamar lá que a equipe te ajuda com tudo:\n👉 https://wa.me/5511933128628` 
  ];
  return mensagens[followupCount] || null;  
}

async function processPendingWhatsappMessages() {
  if (whatsappJobRunning) return;
  whatsappJobRunning = true;

  try {
    const users = await getPendingWhatsappUsers();
    for (const user of users) {
      try {
        const celular = getFinalTestPhone(user);
        if (!celular) continue;

        // 1ª Mensagem (+20 min do cadastro - via SQL created_at)
        const mensagensIniciais = [
          `Oii! 💕 Vi que você se cadastrou na Influencer Academy, mas o acesso ainda não foi liberado. Ficou alguma dúvida na página de pagamento?`,
          `Oii! ✨ Você chegou bem perto de garantir sua vaga na Academy... aconteceu alguma coisa na hora do pagamento?`
        ];

        const mensagemInicial = mensagensIniciais[Math.floor(Math.random() * mensagensIniciais.length)];
        const randomDelay = Math.floor(Math.random() * 2000) + 8000;
        await delay(randomDelay);

        const textResponse = await sendWhatsAppText(celular, mensagemInicial);

        await saveWhatsappMessage({
          userId: user.id, celular, direction: "out", messageText: mensagemInicial,
          waMessageId: textResponse?.messages?.[0]?.id || null, rawPayload: textResponse
        });

        await markWhatsappSent(user.id);
        console.log(`WhatsApp inicial de abandono enviado para user_id ${user.id} - ${celular}`);
      } catch (err) {
        console.error(`Erro ao enviar WhatsApp inicial para user_id ${user.id}:`, err.message);
      }
    }
  } catch (error) {
    console.error("Erro na rotina de WhatsApp pendente:", error.message);
  } finally {
    whatsappJobRunning = false;
  }
}

async function getUsersForWhatsappFollowUp() {
  const [rows] = await pool.query(
    `SELECT id, name, celular, whatsapp_followup_count FROM users
     WHERE id >= 100 AND access_released = 0 AND whatsapp_sent = 1 AND whatsapp_opt_in = 1 AND bot_paused = 0
     AND whatsapp_followup_finished = 0 AND whatsapp_followup_count < ? AND celular IS NOT NULL AND celular <> ''
     AND (
       (whatsapp_followup_count = 0 AND last_bot_message_at <= NOW() - INTERVAL ? MINUTE)
       OR (whatsapp_followup_count = 1 AND last_bot_message_at <= NOW() - INTERVAL ? MINUTE)
     )
     AND NOT EXISTS (
       SELECT 1 FROM whatsapp_messages wm
       WHERE wm.user_id = users.id AND wm.direction = 'in' AND wm.created_at >= users.whatsapp_sent_at
     )`,
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
          userId: user.id, celular, direction: "out", messageText: message,
          waMessageId: sendResponse?.messages?.[0]?.id || null, rawPayload: sendResponse
        });

        const nextCount = followupCount + 1;
        await pool.query(
          `UPDATE users SET whatsapp_followup_count = ?, whatsapp_followup_finished = ?, last_bot_message_at = NOW(),
           last_whatsapp_message_at = NOW(), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [nextCount, nextCount >= MAX_FOLLOWUPS ? 1 : 0, user.id]
        );
        console.log(`Follow-up ${nextCount} enviado para user_id ${user.id}`);
      } catch (error) {
        console.error(`Erro no follow-up para user_id ${user.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error("Erro geral no processo de follow-up:", error.message);
  }
}

// ==========================================================
// ROTAS E SERVIDOR RESTANTE (MANTIDOS INTACTOS)
// ==========================================================

app.get("/api/inbox/conversations", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.celular, u.access_released, u.whatsapp_sent, u.last_customer_message_at, u.last_bot_message_at, u.bot_paused,
      (SELECT message_text FROM whatsapp_messages wm WHERE wm.user_id = u.id ORDER BY wm.created_at DESC LIMIT 1) AS last_message,
      (SELECT created_at FROM whatsapp_messages wm WHERE wm.user_id = u.id ORDER BY wm.created_at DESC LIMIT 1) AS last_message_at
      FROM users u WHERE u.celular IS NOT NULL AND u.celular <> '' ORDER BY last_message_at DESC
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
      `SELECT id, user_id, celular, direction, message_text, created_at FROM whatsapp_messages WHERE user_id = ? ORDER BY created_at ASC`,
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
    if (!userId) return res.status(400).json({ error: "userId é obrigatório" });
    await pool.query(`UPDATE users SET bot_paused = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [paused ? 1 : 0, userId]);
    res.json({ success: true, userId, bot_paused: paused ? 1 : 0 });
  } catch (error) {
    res.status(500).json({ error: "Erro ao alterar status do bot", details: error.message });
  }
});

app.post("/api/inbox/send", async (req, res) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) return res.status(400).json({ error: "userId e message são obrigatórios" });
    
    const [rows] = await pool.query(`SELECT id, name, celular FROM users WHERE id = ? LIMIT 1`, [userId]);
    if (!rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

    const user = rows[0];
    const celular = normalizePhoneBR(user.celular);
    const response = await sendWhatsAppText(celular, message);

    await saveWhatsappMessage({ userId: user.id, celular, direction: "out", messageText: message, waMessageId: response?.messages?.[0]?.id || null, rawPayload: response });
    await pool.query(`UPDATE users SET last_bot_message_at = NOW(), updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao enviar mensagem", details: error.message });
  }
});

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, message: "Backend online e MySQL conectado" });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Erro ao validar MySQL", details: error.message });
  }
});

app.get("/api/health/details", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, message: "Backend online, MySQL conectado", env: getEnvStatus() });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Erro ao validar ambiente", details: error.message, env: getEnvStatus() });
  }
});

app.get("/api/config", (_req, res) => {
  res.json({ publicKey: cleanEnv(process.env.MERCADO_PAGO_PUBLIC_KEY) || "" });
});

app.post("/api/chat/start", async (req, res) => {
  try {
    const { nome, email, celular, mensagem } = req.body;
    if (!mensagem) return res.status(400).json({ error: "Mensagem obrigatória" });

    let user = null;
    if (email) {
      const [rows] = await pool.query(`SELECT id, name, email, celular, access_released FROM users WHERE email = ? LIMIT 1`, [email]);
      user = rows[0] || null;
    }

    const { intent, reply } = handleIncomingMessage(mensagem, user);
    let resposta = reply;
    if (intent === "FALLBACK") {
      const respostaClaude = await maybeGetClaudeReply(mensagem, user);
      resposta = respostaClaude || reply;
    }

    return res.json({ success: true, reply: resposta, user: user || { nome, email, celular } });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao iniciar chat", details: error.message });
  }
});

app.post("/api/users/register", async (req, res) => {
  try {
    const { name, email, password, celular, nascimento, area } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios" });

    const [existing] = await pool.query(`SELECT id FROM users WHERE email = ? LIMIT 1`, [email]);
    if (existing.length > 0) return res.status(409).json({ error: "Já existe uma conta com esse e-mail" });

    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, celular, nascimento, area) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, password, celular || null, nascimento || null, area || null]
    );

    return res.status(201).json({ success: true, user: { id: result.insertId, name, email, celular: celular || null, access_released: 0 } });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao registrar usuário", details: error.message });
  }
});

app.post("/api/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "E-mail e senha são obrigatórios" });

    const [rows] = await pool.query(`SELECT id, name, email, password_hash, celular, access_released FROM users WHERE email = ? LIMIT 1`, [email]);
    if (!rows.length) return res.status(404).json({ error: "Nenhuma conta cadastrada encontrada" });

    const user = rows[0];
    if (user.password_hash !== password) return res.status(401).json({ error: "E-mail ou senha inválidos." });

    return res.json({ success: true, user: { id: user.id, nome: user.name, email: user.email, celular: user.celular, access_released: user.access_released } });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao fazer login", details: error.message });
  }
});

app.get("/api/users/access/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const [rows] = await pool.query(`SELECT id, name, email, celular, access_released FROM users WHERE email = ? LIMIT 1`, [email]);
    if (!rows.length) return res.status(404).json({ error: "Usuário não encontrado" });
    return res.json({ success: true, user: rows[0] });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao consultar acesso", details: error.message });
  }
});

// ==========================================================
// ROTAS DE MERCADO PAGO
// ==========================================================
app.post("/api/payments/pix", async (req, res) => {
  try {
    const { payer } = req.body;
    const amount = COURSE_PRICE;
    const description = COURSE_DESCRIPTION;
    if (!payer?.email) return res.status(400).json({ error: "Campos obrigatórios: payer.email" });

    const user = await findOrCreateUser({ name: `${payer.first_name || ""} ${payer.last_name || ""}`.trim(), email: payer.email });
    const notificationUrl = process.env.WEBHOOK_BASE_URL ? `${cleanEnv(process.env.WEBHOOK_BASE_URL)}/api/webhooks/mercadopago` : undefined;
    const externalReference = `user_${user.id}`;

    const body = {
      transaction_amount: Number(amount), description, payment_method_id: "pix", external_reference: externalReference,
      payer: { email: payer.email, first_name: payer.first_name || "", last_name: payer.last_name || "",
        identification: payer.identification?.number ? { type: payer.identification.type || "CPF", number: sanitizeCpf(payer.identification.number) } : undefined
      }, notification_url: notificationUrl
    };

    const result = await paymentClient.create({ body });
    const tx = result?.point_of_interaction?.transaction_data || {};
    const accessToken = await savePayment({ userId: user.id, paymentId: result.id, paymentType: "pix", status: result.status, statusDetail: result.status_detail, amount: result.transaction_amount, description, payerEmail: payer.email, externalReference, rawResponse: result });

    return res.status(201).json({ id: result.id, status: result.status, status_detail: result.status_detail, transaction_amount: result.transaction_amount, qr_code: tx.qr_code || null, qr_code_base64: tx.qr_code_base64 || null, ticket_url: tx.ticket_url || null, access_token: accessToken });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar pagamento PIX", details: error?.message || "Erro desconhecido" });
  }
});

app.post("/api/payments/card", async (req, res) => {
  try {
    const { amount, description, installments, payment_method_id, issuer_id, token, payer } = req.body;
    if (!amount || !description || !installments || !payment_method_id || !token || !payer?.email) return res.status(400).json({ error: "Campos obrigatórios ausentes" });

    const user = await findOrCreateUser({ name: `${payer.first_name || ""} ${payer.last_name || ""}`.trim(), email: payer.email });
    const notificationUrl = process.env.WEBHOOK_BASE_URL ? `${cleanEnv(process.env.WEBHOOK_BASE_URL)}/api/webhooks/mercadopago` : undefined;
    const externalReference = `user_${user.id}`;

    const body = {
      transaction_amount: Number(amount), token, description, installments: Number(installments), payment_method_id, issuer_id: issuer_id || undefined, external_reference: externalReference,
      payer: { email: payer.email, identification: payer.identification?.number ? { type: payer.identification.type || "CPF", number: sanitizeCpf(payer.identification.number) } : undefined }, notification_url: notificationUrl
    };

    const result = await paymentClient.create({ body });
    const accessToken = await savePayment({ userId: user.id, paymentId: result.id, paymentType: "card", status: result.status, statusDetail: result.status_detail, amount: result.transaction_amount, description, payerEmail: payer.email, externalReference, rawResponse: result });

    if (result.status === "approved") await markAccessReleased(result.id, payer.email);
    return res.status(201).json({ id: result.id, status: result.status, status_detail: result.status_detail, transaction_amount: result.transaction_amount, access_token: accessToken });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar pagamento com cartão", details: error?.message || "Erro desconhecido" });
  }
});

app.get("/api/payments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await paymentClient.get({ id });

    await pool.query(
      `UPDATE payments SET status = ?, status_detail = ?, transaction_amount = ?, raw_response = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_id = ?`,
      [result.status, result.status_detail || null, Number(result.transaction_amount || 0), JSON.stringify(result), String(result.id)]
    );

    if (result.status === "approved") {
      const payerEmail = result?.payer?.email || null;
      const externalReference = result?.external_reference || null;
      const userId = externalReference?.startsWith("user_") ? Number(externalReference.split("_")[1]) : null;

      if (userId) {
        await pool.query(`UPDATE users SET access_released = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [userId]);
        await pool.query(`UPDATE payments SET user_id = COALESCE(user_id, ?), updated_at = CURRENT_TIMESTAMP WHERE payment_id = ?`, [userId, String(result.id)]);
      } else if (payerEmail) {
        await markAccessReleased(result.id, payerEmail);
      }
    }
    return res.json({ id: result.id, status: result.status, status_detail: result.status_detail, transaction_amount: result.transaction_amount, payment_method_id: result.payment_method_id });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao consultar pagamento", details: error?.message || "Erro desconhecido" });
  }
});

app.get("/api/webhooks/whatsapp", (req, res) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    const wa = getWhatsAppConfig();

    if (mode === "subscribe" && token === wa.verifyToken) return res.status(200).send(challenge);
    return res.sendStatus(403);
  } catch (error) {
    return res.sendStatus(500);
  }
});

app.post("/api/webhooks/whatsapp", async (req, res) => {
  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    if (!message) return res.sendStatus(200);

    const from = normalizePhoneBR(message.from || "");
    const type = message.type; 

    if (type === "audio" || type === "voice") {
      await sendWhatsAppText(from, "Menina, estou num lugar que não consigo ouvir áudio agora 🙈 Consegue me escrever rapidinho qual é a sua dúvida?");
      return res.sendStatus(200);
    }

    const text = message?.text?.body || "";
    const user = await getUserByPhone(from);

    await saveWhatsappMessage({ userId: user?.id || null, celular: from, direction: "in", messageText: text, waMessageId: message.id || null, rawPayload: req.body });

    if (user?.bot_paused) {
      if (user?.id) await pool.query(`UPDATE users SET last_whatsapp_message_at = NOW(), last_customer_message_at = NOW(), updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);
      return res.sendStatus(200);
    }

    if (user?.id) await pool.query(`UPDATE users SET last_whatsapp_message_at = NOW(), last_customer_message_at = NOW(), whatsapp_followup_finished = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);

    const { intent, reply } = handleIncomingMessage(text, user);
    let finalReply = reply;
    
    if (intent === "FALLBACK" || intent === "fallback") {
      const claudeReply = await maybeGetClaudeReply(text, user);
      finalReply = claudeReply || reply || "Posso te ajudar com pagamento, acesso ou dúvidas do curso 😊";
    }

    const replyParts = finalReply.split('\n\n').filter(part => part.trim() !== "");
    let lastSendResponse = null;

    for (let i = 0; i < replyParts.length; i++) {
      lastSendResponse = await sendWhatsAppText(from, replyParts[i].trim());
      if (i < replyParts.length - 1) await delay(2500); 
    }

    await saveWhatsappMessage({ userId: user?.id || null, celular: from, direction: "out", messageText: finalReply, waMessageId: lastSendResponse?.messages?.[0]?.id || null, rawPayload: lastSendResponse });
    return res.sendStatus(200);
  } catch (error) {
    console.error("Erro webhook WhatsApp:", error);
    return res.sendStatus(200);
  }
});

// ===================== ROTA_PIX_PREMIUM_V2 =====================
app.use(express.json({ limit: "10mb" }));
const IA_PAYMENT_PRICE = Number(process.env.COURSE_PAYMENT_AMOUNT || 39.99);

async function iaCreatePixPayment(req, res) {
  try {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;
    if (!token) return res.status(500).json({ ok: false, message: "Configure a variável MERCADO_PAGO_ACCESS_TOKEN no Railway." });
    
    const amount = Number(req.body?.amount || IA_PAYMENT_PRICE);
    const description = req.body?.description || "Influencer Academy - acesso completo";
    const idempotencyKey = globalThis.crypto && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()) + "-" + Math.random();
    const payerEmail = "cliente+" + Date.now() + "@influenceracademy.com.br";

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST", headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json", "X-Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ transaction_amount: amount, description, payment_method_id: "pix", payer: { email: payerEmail, first_name: "Cliente", last_name: "Influencer Academy" } })
    });
    
    const data = await mpResponse.json();
    if (!mpResponse.ok) return res.status(500).json({ ok: false, message: "Mercado Pago não conseguiu gerar o PIX.", details: data });

    const transaction = data.point_of_interaction?.transaction_data || {};
    return res.json({ ok: true, payment_id: data.id, status: data.status, qr_code: transaction.qr_code, qr_code_base64: transaction.qr_code_base64, ticket_url: transaction.ticket_url });
  } catch (error) { return res.status(500).json({ ok: false, message: "Erro interno ao gerar PIX." }); }
}

async function iaCheckPixPayment(req, res) {
  try {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;
    if (!token) return res.status(500).json({ ok: false, message: "Sem token." });
    
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments/" + req.params.id, { headers: { "Authorization": "Bearer " + token } });
    const data = await mpResponse.json();
    
    if (!mpResponse.ok) return res.status(500).json({ ok: false, message: "Não consegui consultar.", details: data });
    return res.json({ ok: true, payment_id: data.id, status: data.status, status_detail: data.status_detail });
  } catch (error) { return res.status(500).json({ ok: false, message: "Erro interno" }); }
}

app.post("/payments/create-pix", iaCreatePixPayment);
app.post("/api/payments/create-pix", iaCreatePixPayment);
app.get("/payments/status/:id", iaCheckPixPayment);
app.get("/api/payments/status/:id", iaCheckPixPayment);

// ===================== AUTO_RELEASE_AFTER_PAYMENT_V1 =====================
let iaAutoReleasePool = null;
async function iaGetAutoReleasePool() {
  if (iaAutoReleasePool) return iaAutoReleasePool;
  const mysqlModule = await import("mysql2/promise");
  const mysql = mysqlModule.default || mysqlModule;
  iaAutoReleasePool = mysql.createPool({ host: process.env.MYSQLHOST, user: process.env.MYSQLUSER, password: process.env.MYSQLPASSWORD, database: process.env.MYSQL_DATABASE, port: Number(process.env.MYSQLPORT || 3306), waitForConnections: true, connectionLimit: 10, queueLimit: 0 });
  return iaAutoReleasePool;
}

async function iaReleaseAccessRoute(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const paymentId = String(req.body?.payment_id || req.body?.paymentId || "").trim();
    if (!email || !paymentId) return res.status(400).json({ ok: false, message: "Dados incompletos." });

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments/" + encodeURIComponent(paymentId), { headers: { Authorization: "Bearer " + process.env.MERCADO_PAGO_ACCESS_TOKEN } });
    const data = await mpResponse.json();
    
    if (!mpResponse.ok) return res.status(500).json({ ok: false, message: "Erro MP." });
    if (data.status !== "approved") return res.status(402).json({ ok: false, message: "Ainda não aprovado." });
    
    const pool = await iaGetAutoReleasePool();
    await pool.execute("UPDATE users SET access_released = 1, updated_at = NOW() WHERE LOWER(email) = LOWER(?)", [email]);
    return res.json({ ok: true, released: true, email, payment_id: data.id, message: "Acesso liberado." });
  } catch (error) { return res.status(500).json({ ok: false, message: "Erro interno." }); }
}

app.post("/api/payments/release-access", iaReleaseAccessRoute);
app.post("/payments/release-access", iaReleaseAccessRoute);

app.get("/api/payments/release-health", async (req, res) => {
  res.json({ ok: true, message: "Rota de liberação ativa." });
});

async function iaMercadoPagoWebhookFinal(req, res) {
  try {
    const paymentId = req.body?.data?.id || req.body?.id || req.query?.["data.id"] || req.query?.id || req.query?.payment_id;
    if (!paymentId) return res.status(200).json({ ok: true, ignored: true });

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments/" + encodeURIComponent(paymentId), { headers: { Authorization: "Bearer " + process.env.MERCADO_PAGO_ACCESS_TOKEN } });
    const data = await mpResponse.json();
    
    if (data.status === "approved") {
        const email = String(data?.payer?.email || data?.external_reference || "").trim().toLowerCase();
        if(email && email.includes("@")) {
            const pool = await iaGetAutoReleasePool();
            await pool.execute("UPDATE users SET access_released = 1, updated_at = NOW() WHERE LOWER(email) = LOWER(?)", [email]);
        }
    }
    return res.status(200).json({ ok: true, message: "Webhook processado" });
  } catch (error) { return res.status(200).json({ ok: false, message: "Erro" }); }
}

app.post("/api/webhooks/mercadopago", iaMercadoPagoWebhookFinal);
app.post("/webhooks/mercadopago", iaMercadoPagoWebhookFinal);

async function start() {
  try {
    await initDB();
    await ensureTables();
    app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));

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