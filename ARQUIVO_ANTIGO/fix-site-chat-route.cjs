const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

if (!code.includes("siteChatRoutes.js")) {
  const lines = code.split(/\r?\n/);
  let lastImport = -1;

  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s+/.test(lines[i])) {
      lastImport = i;
    }
  }

  if (lastImport >= 0) {
    lines.splice(lastImport + 1, 0, 'import siteChatRoutes from "./siteChatRoutes.js";');
    code = lines.join("\n");
  } else {
    code = 'import siteChatRoutes from "./siteChatRoutes.js";\n' + code;
  }
}

if (!code.includes('app.use("/api", siteChatRoutes);')) {
  if (code.includes("app.use(express.json());")) {
    code = code.replace("app.use(express.json());", 'app.use(express.json());\napp.use("/api", siteChatRoutes);');
  } else if (code.includes("app.listen(")) {
    code = code.replace("app.listen(", 'app.use("/api", siteChatRoutes);\n\napp.listen(');
  } else {
    code += '\napp.use("/api", siteChatRoutes);\n';
  }
}

fs.writeFileSync(file, code, "utf8");
console.log("Rota /api/site-chat conectada ao server.js");
