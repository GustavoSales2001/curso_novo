const COURSE_LINK = "https://gustavosales2001.github.io/curso_novo/";
const COURSE_PRICE = "R$ 39,99";
const OLD_PRICE = "R$ 69,99";
const SUPPORT_WHATSAPP = "5511933128628";
const HUMAN_WHATSAPP = "5511922198936";

const conversationState = new Map();

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getUserKey(user) {
  return String(user?.id || user?.celular || user?.email || "anonymous");
}

function getFirstName(user) {
  const name = user?.name || user?.nome || "";
  return name ? String(name).split(" ")[0] : "";
}

function setStage(userKey, stage) {
  conversationState.set(userKey, { stage, updatedAt: Date.now() });
}

function getStage(userKey) {
  return conversationState.get(userKey)?.stage || "inicio";
}

function hasAny(msg, keywords) {
  return keywords.some(keyword => msg.includes(normalizeText(keyword)));
}

function isOption(msg, number) {
  return msg === String(number) || msg.includes(`opcao ${number}`) || msg.includes(`opção ${number}`);
}

function mainMenu(saudacao = "") {
  return `${saudacao}oi! 💕 Bem-vinda à Influencer Academy.

Me conta o que você quer entender:

1. Como funciona o curso
2. Como sair do zero no Instagram
3. Reels, stories, Canva, CapCut e IA
4. Valor e pagamento
5. Problema no acesso ou cadastro

Pode responder só com o número.`;
}

function courseMenu(saudacao = "") {
  return `${saudacao}a Influencer Academy é uma trilha prática para quem quer crescer como criadora de conteúdo com mais clareza, estética e estratégia.

Dentro do curso você aprende:

✨ sair do zero aos primeiros seguidores
✨ organizar bio, perfil e posicionamento
✨ criar Reels e stories com intenção
✨ usar Canva, CapCut e IA
✨ entender métricas sem complicar
✨ criar rotina de conteúdo
✨ se posicionar melhor para marcas e oportunidades

Link do curso:
${COURSE_LINK}`;
}

function growthMenu(saudacao = "") {
  return `${saudacao}crescer do zero não é só postar muito. É postar com direção.

No começo, você precisa ajustar:

✨ nicho e posicionamento
✨ bio e primeira impressão
✨ conteúdos que fazem sentido para sua fase
✨ Reels com gancho
✨ stories para conexão
✨ rotina simples de postagem
✨ análise de métricas

O curso te mostra o caminho do 0 aos 1.000 e depois dos 1.000 aos 5.000 seguidores.`;
}

function contentMenu(saudacao = "") {
  return `${saudacao}para criar conteúdo melhor, você não precisa começar com equipamento caro.

Você aprende:

🎥 gravação com celular
💡 iluminação simples
🎙️ áudio mais limpo
✂️ edição no CapCut
🎨 identidade visual no Canva
📝 roteiro para Reels
✨ ideias com IA
📊 análise de conteúdo

Tudo de forma prática para aplicar no seu perfil.`;
}

function paymentMenu(saudacao = "") {
  return `${saudacao}a condição atual está especial:

De ${OLD_PRICE}
Por ${COURSE_PRICE}

É pagamento único.

Link:
${COURSE_LINK}

Se tiver problema no pagamento ou acesso, me avisa que te direciono.`;
}

function supportMenu(saudacao = "") {
  return `${saudacao}me diz onde está o problema:

1. Cadastro
2. Login
3. Pagamento
4. Área do aluno
5. Quero falar com suporte humano`;
}

function humanSupportMessage(saudacao = "") {
  return `${saudacao}claro 💕

👩‍💼 Dúvidas sobre curso, conteúdo e orientação:
https://wa.me/${HUMAN_WHATSAPP}

👨‍💻 Erro no site, login, pagamento, cadastro ou bug:
https://wa.me/${SUPPORT_WHATSAPP}

Se puder, envie um print junto.`;
}

export function handleIncomingMessage(text = "", user = null) {
  const msg = normalizeText(text);
  const userKey = getUserKey(user);
  const firstName = getFirstName(user);
  const saudacao = firstName ? `${firstName}, ` : "";
  const stage = getStage(userKey);

  // Respostas diretas do menu principal
  if (stage === "suporte" && ["1","2","3","4","5"].includes(msg)) {
    return {
      intent: "suporte_humano",
      reply: `${name ? name + ", " : ""}claro 💕

Para suporte humano, envie sua dúvida com print por aqui:
https://wa.me/5511922198936`
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


  if (!msg || msg.length <= 2) {
    setStage(userKey, "inicio");
    return { intent: "menu", reply: mainMenu(saudacao) };
  }

  if (hasAny(msg, ["menu", "voltar", "inicio", "início", "comecar de novo", "começar de novo"])) {
    setStage(userKey, "inicio");
    return { intent: "menu", reply: mainMenu(saudacao) };
  }

  if (hasAny(msg, ["oi", "ola", "olá", "opa", "bom dia", "boa tarde", "boa noite", "tudo bem"])) {
    setStage(userKey, "inicio");
    return { intent: "saudacao", reply: mainMenu(saudacao) };
  }

  if (hasAny(msg, ["humano", "atendente", "suporte", "pessoa", "falar com alguem", "falar com alguém"])) {
    setStage(userKey, "suporte");
    return { intent: "humano", reply: humanSupportMessage(saudacao) };
  }

  if (hasAny(msg, ["valor", "preco", "preço", "quanto custa", "pagamento", "pix", "cartao", "cartão", "boleto", "desconto"])) {
    setStage(userKey, "pagamento");
    return { intent: "pagamento", reply: paymentMenu(saudacao) };
  }

  if (hasAny(msg, ["curso", "como funciona", "saber mais", "influencer", "influenciadora", "criadora"])) {
    setStage(userKey, "curso");
    return { intent: "curso", reply: courseMenu(saudacao) };
  }

  if (hasAny(msg, ["seguidor", "seguidores", "crescer", "engajamento", "alcance", "views", "instagram"])) {
    setStage(userKey, "crescimento");
    return { intent: "crescimento", reply: growthMenu(saudacao) };
  }

  if (hasAny(msg, ["reels", "story", "stories", "conteudo", "conteúdo", "gravar", "canva", "capcut", "ia", "video", "vídeo"])) {
    setStage(userKey, "conteudo");
    return { intent: "conteudo", reply: contentMenu(saudacao) };
  }

  if (hasAny(msg, ["erro", "bug", "travou", "nao abre", "não abre", "login", "senha", "cadastro", "acesso", "paguei", "nao liberou", "não liberou"])) {
    setStage(userKey, "suporte");
    return { intent: "suporte", reply: supportMenu(saudacao) };
  }

  if (stage === "inicio") {
    if (isOption(msg, 1)) {
      setStage(userKey, "curso");
      return { intent: "curso", reply: courseMenu(saudacao) };
    }

    if (isOption(msg, 2)) {
      setStage(userKey, "crescimento");
      return { intent: "crescimento", reply: growthMenu(saudacao) };
    }

    if (isOption(msg, 3)) {
      setStage(userKey, "conteudo");
      return { intent: "conteudo", reply: contentMenu(saudacao) };
    }

    if (isOption(msg, 4)) {
      setStage(userKey, "pagamento");
      return { intent: "pagamento", reply: paymentMenu(saudacao) };
    }

    if (isOption(msg, 5)) {
      setStage(userKey, "suporte");
      return { intent: "suporte", reply: supportMenu(saudacao) };
    }
  }

  if (stage === "pagamento" && isOption(msg, 1)) {
    return {
      intent: "link",
      reply: `${saudacao}perfeito 💕

Aqui está o link:
${COURSE_LINK}

Condição atual:
De ${OLD_PRICE}
Por ${COURSE_PRICE}`
    };
  }

  if (stage === "suporte" && (isOption(msg, 1) || isOption(msg, 2) || isOption(msg, 3) || isOption(msg, 4) || isOption(msg, 5))) {
    return { intent: "suporte_humano", reply: humanSupportMessage(saudacao) };
  }

  return {
    intent: "fallback",
    reply: `${saudacao}entendi 💕

Para eu te ajudar melhor, me diz se sua dúvida é sobre:

1. Curso
2. Crescimento no Instagram
3. Reels, stories e conteúdo
4. Valor e pagamento
5. Acesso ou suporte

Pode responder só com o número.`
  };
}

export default handleIncomingMessage;
