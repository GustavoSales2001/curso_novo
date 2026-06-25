const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

// 1. Garante que BOT_VERSION exista depois dos imports
if (!/const\s+BOT_VERSION\s*=/.test(code)) {
  const lines = code.split(/\r?\n/);
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s+/.test(lines[i])) {
      lastImportIndex = i;
    }
  }

  const constants = [
    "",
    'const BOT_VERSION = "influencer-academy-whatsapp-v4";',
    'const COURSE_NAME_SAFE = "Influencer Academy";',
    'const COURSE_URL_SAFE = "https://gustavosales2001.github.io/curso_novo/";',
    'const COURSE_PRICE_SAFE = "R$ 39,99";',
    ""
  ];

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, ...constants);
    code = lines.join("\n");
  } else {
    code = constants.join("\n") + "\n" + code;
  }
}

// 2. Remove rota antiga /api/bot-version quebrada
code = code.replace(
  /\s*app\.get\(["']\/api\/bot-version["'][\s\S]*?\n\s*\}\);\s*/g,
  "\n"
);

// 3. Cria rota nova sem depender de variável quebrada
const safeRoute = `
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

`;

// 4. Insere a rota depois do express.json
if (code.includes("app.use(express.json());")) {
  code = code.replace("app.use(express.json());", "app.use(express.json());\n\n" + safeRoute);
} else if (code.includes('app.post("/api/webhooks/whatsapp"')) {
  code = code.replace('app.post("/api/webhooks/whatsapp"', safeRoute + 'app.post("/api/webhooks/whatsapp"');
} else {
  code += "\n\n" + safeRoute;
}

// 5. Garante log seguro no webhook
if (!code.includes("BOT_VERSION ativo no webhook")) {
  code = code.replace(
    'console.log("Webhook WhatsApp payload recebido.");',
    'console.log("Webhook WhatsApp payload recebido.");\n    console.log("BOT_VERSION ativo no webhook:", BOT_VERSION);'
  );
}

fs.writeFileSync(file, code, "utf8");
console.log("server.js corrigido com BOT_VERSION seguro.");
