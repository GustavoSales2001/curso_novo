const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

// Remove import/uso antigo para evitar duplicado
code = code.replace(/^\s*import\s+siteChatRoutes\s+from\s+["']\.\/siteChatRoutes\.js["'];\s*$/gm, "");
code = code.replace(/\s*app\.use\(["']\/api["'],\s*siteChatRoutes\);\s*/g, "\n");

// Adiciona import depois do último import
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

// Adiciona app.use("/api", siteChatRoutes)
if (/app\.use\(express\.json\(\)\);/.test(code)) {
  code = code.replace(/app\.use\(express\.json\(\)\);/, 'app.use(express.json());\napp.use("/api", siteChatRoutes);');
} else if (/const\s+app\s*=\s*express\(\);?/.test(code)) {
  code = code.replace(/const\s+app\s*=\s*express\(\);?/, 'const app = express();\napp.use(express.json());\napp.use("/api", siteChatRoutes);');
} else if (/app\.listen\(/.test(code)) {
  code = code.replace(/app\.listen\(/, 'app.use("/api", siteChatRoutes);\n\napp.listen(');
} else {
  code += '\napp.use("/api", siteChatRoutes);\n';
}

fs.writeFileSync(file, code, "utf8");
console.log("siteChatRoutes conectado no server.js");
