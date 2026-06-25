const conversationState = new Map();

const COURSE_LINK = "https://gustavosales2001.github.io/curso_novo/";
const COURSE_PRICE = "R$ 39,99";
const OLD_PRICE = "R$ 69,99";
const SUPPORT_WHATSAPP = "5511933128628";
const HUMAN_WHATSAPP = "5511922198936";

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
  conversationState.set(userKey, {
    stage,
    updatedAt: Date.now()
  });
}

function getStage(userKey) {
  return conversationState.get(userKey)?.stage || "inicio";
}

function hasAny(msg, keywords) {
  return keywords.some(keyword => msg.includes(normalizeText(keyword)));
}

function isOption(msg, number) {
  const options = {
    1: ["1", "opcao 1", "opção 1", "primeira", "primeiro", "quero a primeira"],
    2: ["2", "opcao 2", "opção 2", "segunda", "segundo", "quero a segunda"],
    3: ["3", "opcao 3", "opção 3", "terceira", "terceiro", "quero a terceira"],
    4: ["4", "opcao 4", "opção 4", "quarta", "quarto", "quero a quarta"],
    5: ["5", "opcao 5", "opção 5", "quinta", "quinto", "quero a quinta"]
  };

  return options[number].some(option => msg === normalizeText(option) || msg.includes(normalizeText(option)));
}

function mainMenu(saudacao = "") {
  return `${saudacao}oi! 💕 Bem-vinda à Influencer Academy.

Me conta o que você quer entender:

1. Quero saber como funciona o curso
2. Quero sair do zero e crescer no Instagram
3. Quero aprender a gravar Reels e stories melhores
4. Quero saber valor e pagamento
5. Estou com problema no acesso ou cadastro

Pode responder só com o número.`;
}

function courseMenu(saudacao = "") {
  return `${saudacao}a Influencer Academy é uma trilha prática para quem quer crescer como criadora de conteúdo com mais clareza, estética e estratégia.

Dentro do curso você aprende:

✨ como sair do zero aos primeiros seguidores
✨ como organizar bio, perfil e posicionamento
✨ como criar Reels, stories e conteúdos com intenção
✨ como usar Canva, CapCut e IA
✨ como entender métricas sem complicar
✨ como criar uma rotina de conteúdo possível
✨ como transformar sua presença digital em oportunidade

O foco é parar de postar no escuro e começar a crescer com direção.

Escolha:

1. Ver o que está incluso
2. Saber se serve para mim
3. Receber o link do curso
4. Saber o valor`;
}

function growthMenu(saudacao = "") {
  return `${saudacao}crescer do zero não é só postar muito. É postar com clareza.

No começo, você precisa entender:

✨ qual público quer atrair
✨ quais conteúdos fazem sentido para sua fase
✨ como deixar o perfil mais confiável
✨ como criar Reels com gancho
✨ como usar stories para conexão
✨ como acompanhar métricas sem surtar

A ideia do curso é te mostrar o caminho do 0 aos 1.000 e depois dos 1.000 aos 5.000 seguidores.

Escolha:

1. Quero entender a primeira fase
2. Quero melhorar meu perfil
3. Quero aprender Reels
4. Quero acessar o curso`;
}

function contentMenu(saudacao = "") {
  return `${saudacao}para gravar melhor, você não precisa começar com equipamento caro.

Você precisa aprender:

🎥 enquadramento
💡 iluminação
🎙️ áudio
📱 gravação com celular
✂️ edição no CapCut
📝 roteiro simples
✨ ideias com IA
📊 análise do que performa melhor

O curso te guia nesse processo com aulas e materiais práticos.

Escolha:

1. Quero aprender Reels
2. Quero melhorar stories
3. Quero usar Canva e CapCut
4. Quero o link do curso`;
}

function paymentMenu(saudacao = "") {
  return `${saudacao}a condição atual está especial:

De ${OLD_PRICE}
Por ${COURSE_PRICE}

É pagamento único e o acesso é feito pela página do curso.

Link:
${COURSE_LINK}

Escolha:

1. Quero acessar agora
2. Quero saber o que está incluso
3. Tenho dúvida antes de pagar
4. Tive problema no pagamento`;
}

function supportMenu(saudacao = "") {
  return `${saudacao}certo. Para resolver mais rápido, me diga onde está o problema:

1. Cadastro
2. Login
3. Pagamento
4. Área do aluno não abre
5. Quero falar com suporte humano`;
}

function humanSupportMessage(saudacao = "") {
  return `${saudacao}claro 💕

Para falar com uma pessoa:

👩‍💼 Dúvidas sobre o curso, conteúdo e orientação:
https://wa.me/${HUMAN_WHATSAPP}

👨‍💻 Erro no site, login, pagamento, cadastro ou bug:
https://wa.me/${SUPPORT_WHATSAPP}

Se puder, envie um print junto para resolver mais rápido.`;
}

export function handleIncomingMessage(text = "", user = null) {
  const msg = normalizeText(text);
  const userKey = getUserKey(user);
  const firstName = getFirstName(user);
  const saudacao = firstName ? `${firstName}, ` : "";
  const currentStage = getStage(userKey);

  if (!msg || msg.length <= 2) {
    return {
      intent: "menu",
      reply: mainMenu(saudacao)
    };
  }

  if (
    hasAny(msg, ["menu", "voltar", "inicio", "início", "começar de novo", "comecar de novo"])
  ) {
    setStage(userKey, "inicio");
    return {
      intent: "menu",
      reply: mainMenu(saudacao)
    };
  }

  if (
    hasAny(msg, ["oi", "ola", "olá", "opa", "bom dia", "boa tarde", "boa noite", "tudo bem"])
  ) {
    setStage(userKey, "inicio");
    return {
      intent: "saudacao",
      reply: mainMenu(saudacao)
    };
  }

  if (
    hasAny(msg, ["humano", "atendente", "suporte", "pessoa", "falar com alguem", "falar com alguém"])
  ) {
    setStage(userKey, "suporte");
    return {
      intent: "humano",
      reply: humanSupportMessage(saudacao)
    };
  }

  if (
    hasAny(msg, ["curso", "como funciona", "saber mais", "influencer academy", "influenciadora", "criadora"])
  ) {
    setStage(userKey, "curso");
    return {
      intent: "curso",
      reply: courseMenu(saudacao)
    };
  }

  if (
    hasAny(msg, ["seguidor", "seguidores", "crescer", "engajamento", "alcance", "views", "visualizacao", "visualização", "instagram"])
  ) {
    setStage(userKey, "crescimento");
    return {
      intent: "crescimento",
      reply: growthMenu(saudacao)
    };
  }

  if (
    hasAny(msg, ["gravar", "reels", "story", "stories", "conteudo", "conteúdo", "celular", "setup", "microfone", "camera", "câmera", "capcut", "canva", "ia"])
  ) {
    setStage(userKey, "conteudo");
    return {
      intent: "conteudo",
      reply: contentMenu(saudacao)
    };
  }

  if (
    hasAny(msg, ["valor", "preco", "preço", "quanto custa", "pagamento", "pix", "cartao", "cartão", "boleto", "desconto", "promocao", "promoção"])
  ) {
    setStage(userKey, "pagamento");
    return {
      intent: "pagamento",
      reply: paymentMenu(saudacao)
    };
  }

  if (
    hasAny(msg, ["erro", "bug", "travou", "nao abre", "não abre", "login", "senha", "cadastro", "acesso", "paguei", "não liberou", "nao liberou"])
  ) {
    setStage(userKey, "suporte");
    return {
      intent: "suporte",
      reply: supportMenu(saudacao)
    };
  }

  if (currentStage === "inicio") {
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

  if (currentStage === "curso") {
    if (isOption(msg, 1)) {
      return {
        intent: "curso_incluso",
        reply: `${saudacao}dentro do curso você encontra:

✨ módulos de posicionamento e nicho
✨ bio, estética e primeira impressão
✨ ideias e pilares de conteúdo
✨ Reels com gancho e retenção
✨ stories para conexão
✨ Canva para identidade visual
✨ CapCut para edição dinâmica
✨ IA para roteiro e vídeo
✨ métricas e crescimento
✨ monetização e parcerias

Link do curso:
${COURSE_LINK}`
      };
    }

    if (isOption(msg, 2)) {
      return {
        intent: "curso_para_mim",
        reply: `${saudacao}serve muito se você:

✨ quer começar como criadora
✨ posta, mas sente que não cresce
✨ quer um perfil mais profissional
✨ quer aprender Reels, stories e edição
✨ quer usar Canva, CapCut e IA
✨ quer parar de depender de achismo

Se esse é seu momento, o curso foi feito para te dar direção.`
      };
    }

    if (isOption(msg, 3)) {
      return {
        intent: "link",
        reply: `${saudacao}claro 💕

Aqui está o link do curso:
${COURSE_LINK}

A condição atual é de ${OLD_PRICE} por ${COURSE_PRICE}.`
      };
    }

    if (isOption(msg, 4)) {
      setStage(userKey, "pagamento");
      return { intent: "pagamento", reply: paymentMenu(saudacao) };
    }
  }

  if (currentStage === "crescimento") {
    if (isOption(msg, 1)) {
      return {
        intent: "fase_0_1000",
        reply: `${saudacao}na fase do 0 aos 1.000 seguidores, o foco é construir base.

Você precisa ajustar:
✨ nicho
✨ bio
✨ foto e nome
✨ pilares de conteúdo
✨ rotina simples
✨ Reels com gancho
✨ stories para conexão

Não é sobre postar qualquer coisa. É sobre deixar claro por que alguém deve te seguir.`
      };
    }

    if (isOption(msg, 2)) {
      return {
        intent: "perfil",
        reply: `${saudacao}para melhorar o perfil, comece por:

✨ nome pesquisável
✨ bio com promessa clara
✨ destaques organizados
✨ foto com boa presença
✨ identidade visual simples
✨ CTA direto

Seu perfil precisa responder rápido: quem é você, o que entrega e por que seguir.`
      };
    }

    if (isOption(msg, 3)) {
      setStage(userKey, "conteudo");
      return { intent: "conteudo", reply: contentMenu(saudacao) };
    }

    if (isOption(msg, 4)) {
      return {
        intent: "link",
        reply: `${saudacao}aqui está o link da Influencer Academy:
${COURSE_LINK}`
      };
    }
  }

  if (currentStage === "conteudo") {
    if (isOption(msg, 1)) {
      return {
        intent: "reels",
        reply: `${saudacao}para um Reel funcionar melhor, pense nessa estrutura:

1. gancho forte nos primeiros segundos
2. promessa clara
3. desenvolvimento direto
4. cortes sem enrolação
5. legenda fácil de acompanhar
6. CTA no final

No curso, você aprende isso com exemplos e passo a passo.`
      };
    }

    if (isOption(msg, 2)) {
      return {
        intent: "stories",
        reply: `${saudacao}stories bons criam conexão.

Use:
✨ bastidores
✨ rotina real
✨ enquetes
✨ caixinhas
✨ prova social
✨ indicação de conteúdo
✨ CTA leve

A ideia é fazer as pessoas sentirem que acompanham você de perto.`
      };
    }

    if (isOption(msg, 3)) {
      return {
        intent: "ferramentas",
        reply: `${saudacao}Canva, CapCut e IA ajudam muito quando você sabe o que está fazendo.

Canva: identidade visual, capas e carrosséis.
CapCut: edição, cortes, legendas e ritmo.
IA: ideias, roteiros, ganchos e organização.

O curso mostra como usar essas ferramentas sem deixar tudo artificial.`
      };
    }

    if (isOption(msg, 4)) {
      return {
        intent: "link",
        reply: `${saudacao}link do curso:
${COURSE_LINK}`
      };
    }
  }

  if (currentStage === "pagamento") {
    if (isOption(msg, 1)) {
      return {
        intent: "link_pagamento",
        reply: `${saudacao}perfeito 💕

Você pode acessar por aqui:
${COURSE_LINK}

Condição atual:
De ${OLD_PRICE}
Por ${COURSE_PRICE}`
      };
    }

    if (isOption(msg, 2)) {
      return {
        intent: "incluso",
        reply: `${saudacao}está incluso:

✨ acesso ao curso
✨ área do aluno
✨ módulos práticos
✨ materiais de apoio
✨ aulas sobre Instagram, Canva, CapCut e IA
✨ trilha de crescimento
✨ conteúdo para aplicar no seu perfil`
      };
    }

    if (isOption(msg, 3)) {
      return {
        intent: "duvida_pagamento",
        reply: `${saudacao}me manda sua dúvida com calma.

Pode ser sobre valor, PIX, cartão, acesso, cadastro ou liberação do curso.`
      };
    }

    if (isOption(msg, 4)) {
      setStage(userKey, "suporte");
      return {
        intent: "problema_pagamento",
        reply: supportMenu(saudacao)
      };
    }
  }

  if (currentStage === "suporte") {
    if (isOption(msg, 1) || isOption(msg, 2) || isOption(msg, 3) || isOption(msg, 4) || isOption(msg, 5)) {
      return {
        intent: "suporte_humano",
        reply: humanSupportMessage(saudacao)
      };
    }
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
