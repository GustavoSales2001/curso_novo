import express from "express";
import mysql from "mysql2/promise";

const router = express.Router();
const UNLOCK_AMOUNT = 14.99;

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQLUSER || process.env.MYSQL_USER || "root",
  password: process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || process.env.DB_NAME || "railway",
  port: Number(process.env.MYSQLPORT || process.env.MYSQL_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function ensureLessonUnlocksTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lesson_unlocks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL,
      module_index INT NOT NULL,
      lesson_index INT NOT NULL,
      payment_id VARCHAR(120),
      amount DECIMAL(10,2) DEFAULT 14.99,
      status VARCHAR(30) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_lesson_unlock (user_email, module_index, lesson_index)
    )
  `);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function getMercadoPagoPayment(paymentId) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!token) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado.");
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "Erro ao consultar pagamento no Mercado Pago.");
  }

  return data;
}

async function approveUnlockFromPayment(payment) {
  const email = normalizeEmail(payment?.payer?.email || payment?.metadata?.user_email);
  const moduleIndex = Number(payment?.metadata?.module_index);
  const lessonIndex = Number(payment?.metadata?.lesson_index);
  const paymentId = String(payment?.id || "");

  if (!email || Number.isNaN(moduleIndex) || Number.isNaN(lessonIndex) || !paymentId) {
    return;
  }

  await ensureLessonUnlocksTable();

  await pool.query(
    `
      INSERT INTO lesson_unlocks
      (user_email, module_index, lesson_index, payment_id, amount, status)
      VALUES (?, ?, ?, ?, ?, 'approved')
      ON DUPLICATE KEY UPDATE
        payment_id = VALUES(payment_id),
        amount = VALUES(amount),
        status = 'approved',
        updated_at = CURRENT_TIMESTAMP
    `,
    [email, moduleIndex, lessonIndex, paymentId, UNLOCK_AMOUNT]
  );
}

router.get("/lesson-unlocks/health", async (req, res) => {
  try {
    await ensureLessonUnlocksTable();
    res.json({ ok: true, message: "lesson unlocks online" });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get("/lesson-unlocks", async (req, res) => {
  try {
    await ensureLessonUnlocksTable();

    const email = normalizeEmail(req.query.email);

    if (!email) {
      return res.status(400).json({ error: "E-mail obrigatório." });
    }

    const [rows] = await pool.query(
      `
        SELECT module_index, lesson_index, payment_id, status
        FROM lesson_unlocks
        WHERE user_email = ?
          AND status = 'approved'
      `,
      [email]
    );

    res.json({ unlocks: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/lesson-unlocks/pix", async (req, res) => {
  try {
    await ensureLessonUnlocksTable();

    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!token) {
      return res.status(500).json({ error: "MERCADO_PAGO_ACCESS_TOKEN não configurado." });
    }

    const email = normalizeEmail(req.body.email);
    const moduleIndex = Number(req.body.moduleIndex);
    const lessonIndex = Number(req.body.lessonIndex);
    const lessonTitle = String(req.body.lessonTitle || "Aula específica");

    if (!email) {
      return res.status(400).json({ error: "E-mail obrigatório." });
    }

    if (Number.isNaN(moduleIndex) || Number.isNaN(lessonIndex)) {
      return res.status(400).json({ error: "Módulo ou aula inválidos." });
    }

    const notificationUrl = process.env.WEBHOOK_BASE_URL
      ? `${process.env.WEBHOOK_BASE_URL}/api/lesson-unlocks/webhook`
      : undefined;

    const paymentPayload = {
      transaction_amount: UNLOCK_AMOUNT,
      description: `Desbloqueio de aula - ${lessonTitle}`,
      payment_method_id: "pix",
      payer: {
        email
      },
      metadata: {
        purchase_type: "lesson_unlock",
        user_email: email,
        module_index: moduleIndex,
        lesson_index: lessonIndex,
        lesson_title: lessonTitle
      }
    };

    if (notificationUrl) {
      paymentPayload.notification_url = notificationUrl;
    }

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `unlock-${email}-${moduleIndex}-${lessonIndex}-${Date.now()}`
      },
      body: JSON.stringify(paymentPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        error: "Erro ao gerar PIX de desbloqueio.",
        details: data
      });
    }

    const paymentId = String(data.id);
    const qrData = data?.point_of_interaction?.transaction_data || {};

    await pool.query(
      `
        INSERT INTO lesson_unlocks
        (user_email, module_index, lesson_index, payment_id, amount, status)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          payment_id = VALUES(payment_id),
          amount = VALUES(amount),
          status = VALUES(status),
          updated_at = CURRENT_TIMESTAMP
      `,
      [email, moduleIndex, lessonIndex, paymentId, UNLOCK_AMOUNT, data.status || "pending"]
    );

    res.json({
      id: paymentId,
      payment_id: paymentId,
      status: data.status,
      amount: UNLOCK_AMOUNT,
      moduleIndex,
      lessonIndex,
      qr_code: qrData.qr_code,
      qr_code_base64: qrData.qr_code_base64,
      ticket_url: qrData.ticket_url
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/lesson-unlocks/status/:paymentId", async (req, res) => {
  try {
    const payment = await getMercadoPagoPayment(req.params.paymentId);

    if (payment.status === "approved") {
      await approveUnlockFromPayment(payment);
    }

    res.json({
      payment_id: payment.id,
      status: payment.status,
      approved: payment.status === "approved",
      module_index: payment?.metadata?.module_index,
      lesson_index: payment?.metadata?.lesson_index
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/lesson-unlocks/webhook", async (req, res) => {
  try {
    const paymentId =
      req.query["data.id"] ||
      req.query.id ||
      req.body?.data?.id ||
      req.body?.id;

    if (paymentId) {
      const payment = await getMercadoPagoPayment(paymentId);

      if (payment.status === "approved") {
        await approveUnlockFromPayment(payment);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Erro webhook lesson unlock:", error.message);
    res.sendStatus(200);
  }
});

export default router;


