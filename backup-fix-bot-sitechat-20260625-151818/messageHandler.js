const COURSE_LINK = "https://gustavosales2001.github.io/curso_novo/";
const COURSE_PRICE = "R$ 39,99";
const OLD_PRICE = "R$ 69,99";
const SUPPORT_WHATSAPP = "5511922198936";

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getFirstName(user) {
  const name = user?.name || user?.nome || "";
  return name ? String(name).split(" ")[0] : "";
}

function hasAny(msg, words) {
  return words.some(word => msg.includes(normalizeText(word)));
}

function mainMenu(name = "") {
  const saudacao = name ? `${name}, ` : "";

  return `${saudacao}oi! 💕 Bem-vinda à Influencer Academy.

Me conta o que você quer entender:

1. Como funciona o curso
2. Como sair do zero no Instagram
3. Reels, stories, Canva, CapCut e IA
4. Valor e pagamento
5. Problema no acesso ou cadastro

Pode responder só com o número.`;
}

function courseMenu(name = "") {
  const saudacao = name ? `${name}, ` : "";

  return `${saudacao}a Influencer Academy é uma trilha prática para quem quer crescer como criadora de conteúdo com mais clareza, estética e estratégia.

Você aprende a organizar seu perfil, criar conteúdo com intenção, melhorar Reels e stories, usar Canva, CapCut e IA, entender métricas e construir uma presença digital mais forte.

Dentro do curso tem:
✨ posicionamento e nicho
✨ bio e primeira impressão
✨ ideias e pilares de conteúdo
✨ Reels com gancho e retenção
✨ stories para conexão
✨ Canva para identidade visual
✨ CapCut para edição
✨ IA para ideias, roteiros e produção
✨ métricas e crescimento
✨ monetização e parcerias

Link do curso:
${COURSE_LINK}`;
}

function growthMenu(name = "") {
  const saudacao = name ? `${name}, ` : "";

  return `${saudacao}para sair do zero no Instagram, você precisa parar de postar no escuro e começar a postar com direção.

O foco inicial é:

✨ definir nicho e público
✨ deixar a bio clara
✨ organizar destaques
✨ criar conteúdos de conexão
✨ fazer Reels com gancho
✨ aparecer nos stories com intenção
✨ acompanhar o que dá resultado

O curso te mostra o caminho do 0 aos 1.000 seguidores e depois dos 1.000 aos 5.000 com uma trilha prática.`;
}

function contentMenu(name = "") {
  const saudacao = name ? `${name}, ` : "";

  return `${saudacao}nessa parte você aprende a produzir conteúdo com mais qualidade, mesmo usando o celular.

Você aprende sobre:

🎥 gravação com celular
💡 iluminação simples
🎙️ áudio mais limpo
✂️ edição no CapCut
🎨 posts, capas e carrosséis no Canva
📝 roteiros para Reels
✨ ideias e prompts com IA
📊 análise de métricas

A ideia é criar vídeos e posts com mais estética, clareza e estratégia, sem depender de achismo.`;
}

function paymentMenu(name = "") {
  const saudacao = name ? `${name}, ` : "";

  return `${saudacao}a condição atual está especial:

De ${OLD_PRICE}
Por ${COURSE_PRICE}

É pagamento único e o acesso é feito pela página do curso.

Link:
${COURSE_LINK}

Depois do pagamento, você acessa a área do aluno para acompanhar os módulos e conteúdos.`;
}

function supportMenu(name = "") {
  const saudacao = name ? `${name}, ` : "";

  return `${saudacao}me diz onde está o problema:

1. Cadastro
2. Login
3. Pagamento
4. Área do aluno não abre
5. Quero falar com suporte humano

Se preferir, envie um print para o suporte:
https://wa.me/${SUPPORT_WHATSAPP}`;
}

export function handleIncomingMessage(text = "", user = null) {
  const msg = normalizeText(text);
  const name = getFirstName(user);

  if (!msg || hasAny(msg, ["oi", "ola", "olá", "opa", "bom dia", "boa tarde", "boa noite", "menu", "voltar", "inicio", "início"])) {
    return { intent: "menu", reply: mainMenu(name) };
  }

  if (msg === "1" || hasAny(msg, ["como funciona", "curso", "saber mais", "entender o curso"])) {
    return { intent: "curso", reply: courseMenu(name) };
  }

  if (msg === "2" || hasAny(msg, ["sair do zero", "crescer", "seguidores", "instagram", "engajamento", "alcance"])) {
    return { intent: "crescimento", reply: growthMenu(name) };
  }

  if (msg === "3" || hasAny(msg, ["reels", "story", "stories", "canva", "capcut", "ia", "conteudo", "conteúdo", "gravar", "video", "vídeo"])) {
    return { intent: "conteudo", reply: contentMenu(name) };
  }

  if (msg === "4" || hasAny(msg, ["valor", "preco", "preço", "quanto custa", "pagamento", "pix", "cartao", "cartão"])) {
    return { intent: "pagamento", reply: paymentMenu(name) };
  }

  if (msg === "5" || hasAny(msg, ["erro", "bug", "login", "senha", "cadastro", "acesso", "paguei", "não liberou", "nao liberou", "suporte"])) {
    return { intent: "suporte", reply: supportMenu(name) };
  }

  return {
    intent: "fallback",
    reply: `${name ? name + ", " : ""}entendi 💕

Para eu te ajudar melhor, escolha uma opção:

1. Curso
2. Crescimento no Instagram
3. Reels, stories, Canva, CapCut e IA
4. Valor e pagamento
5. Acesso ou suporte

Pode responder só com o número.`
  };
}

export default handleIncomingMessage;
