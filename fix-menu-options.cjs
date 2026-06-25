const fs = require("fs");

const file = "messageHandler.js";
let code = fs.readFileSync(file, "utf8");

// Remove a regra que fazia qualquer mensagem curta, tipo "1" ou "3", voltar para o menu
code = code.replace(
  /if\s*\(\s*!msg\s*\|\|\s*msg\.length\s*<=\s*2\s*\|\|\s*hasAny\s*\(msg,\s*\[/,
  'if (!msg || hasAny(msg, ['
);

// Garante respostas diretas para números do menu principal
const marker = 'const stage = getStage(userKey);';

const optionBlock = `
  // Respostas diretas do menu principal
  if (stage === "suporte" && ["1","2","3","4","5"].includes(msg)) {
    return {
      intent: "suporte_humano",
      reply: \`\${name ? name + ", " : ""}claro 💕

Para suporte humano, envie sua dúvida com print por aqui:
https://wa.me/5511922198936\`
    };
  }

  if (msg === "1") {
    setStage(userKey, "curso");
    return { intent: "curso", reply: courseMenu(name) };
  }

  if (msg === "2") {
    setStage(userKey, "crescimento");
    return { intent: "crescimento", reply: growthMenu(name) };
  }

  if (msg === "3") {
    setStage(userKey, "conteudo");
    return { intent: "conteudo", reply: contentMenu(name) };
  }

  if (msg === "4") {
    setStage(userKey, "pagamento");
    return { intent: "pagamento", reply: paymentMenu(name) };
  }

  if (msg === "5") {
    setStage(userKey, "suporte");
    return { intent: "suporte", reply: supportMenu(name) };
  }
`;

if (!code.includes("// Respostas diretas do menu principal")) {
  code = code.replace(marker, marker + "\n" + optionBlock);
}

fs.writeFileSync(file, code, "utf8");

console.log("messageHandler.js corrigido para aceitar opções 1, 2, 3, 4 e 5.");
