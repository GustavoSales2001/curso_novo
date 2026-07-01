import express from "express";
import { handleIncomingMessage } from "./messageHandler.js";

const router = express.Router();

router.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

router.get("/site-chat/health", (req, res) => {
  res.json({
    ok: true,
    message: "Chat do site Influencer Academy ativo",
    version: "humanized-v1"
  });
});

router.post("/site-chat", (req, res) => {
  try {
    const message = req.body?.message || "";
    const user = {
      name: req.body?.name || "Visitante",
      email: req.body?.email || "",
      phone: req.body?.phone || req.body?.sessionId || "site-visitante"
    };

    const result = handleIncomingMessage(message, user);

    res.json({
      ok: true,
      intent: result.intent,
      reply: result.reply,
      memory: result.memory
    });
  } catch (error) {
    console.error("Erro no site-chat:", error);
    res.status(500).json({
      ok: false,
      reply: "Tive um problema para responder agora. Tente novamente em instantes."
    });
  }
});

export default router;


