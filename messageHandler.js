const conversationState = new Map();

const COURSE_LINK = "https://gustavosales2001.github.io/curso_novo/";
const COURSE_PRICE = "R$ 39,99";
const OLD_PRICE = "R$ 69,99";

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getUserKey(user) {
  return String(user?.id || user?.celular || user?.email || "anonymous");
}

function getFirstName(user) {
  return user?.name ? user.name.split(" ")[0] : "";
}

function setStage(userKey, stage) {
  conversationState.set(userKey, { stage, updatedAt: Date.now() });
}

function getStage(userKey) {
  return conversationState.get(userKey)?.stage || "inicio";
}

function isOption(msg, number) {
  const options = {
    1: ["1", "opcao 1", "opção 1", "primeira", "quero a primeira"],
    2: ["2", "opcao 2", "opção 2", "segunda", "quero a segunda"],
    3: ["3", "opcao 3", "opção 3", "terceira", "quero a terceira"],
    4: ["4", "opcao 4", "opção 4", "quarta", "quero a quarta"],
    5: ["5", "opcao 5", "opção 5", "quinta", "quero a quinta"]
  };

  return options[number].some(option => msg === normalizeText(option) || msg.includes(normalizeText(option)));
}

function mainMenu(saudacao = "") {
  return `${saudacao}entendi 😊

Para eu te ajudar melhor, escolha uma opção:

1. Quero saber mais sobre o curso
2. Quero crescer do 0 aos primeiros seguidores
3. Quero aprender a gravar melhor com celular
4. Quero saber valor e pagamento
5. Estou com problema no acesso ou cadastro`;
}

function courseMenu(saudacao = "") {
  return `${saudacao}o Influencer Academy é um curso para mulheres que querem crescer na internet com mais estratégia, estética e consistência.

Você aprende sobre:

- crescimento no Instagram
- criação de conteúdo
- Reels e stories
- posicionamento
- estética do perfil
- métricas e engajamento
- rotina de gravação

Escolha:

1. Quero ver o que aprendo
2. Quero saber se serve para mim
3. Quero o link do curso
4. Quero falar sobre pagamento`;
}

function growthMenu(saudacao = "") {
  return `${saudacao}crescer do zero não é só postar todos os dias.

Você precisa de clareza, consistência e estratégia:

- perfil bem organizado
- bio clara
- nicho ou tema definido
- conteúdos com gancho
- stories para conexão
- Reels com intenção
- análise de métricas

Escolha:

1. Quero sair do 0 aos 1.000 seguidores
2. Quero crescer de 1.000 para 5.000
3. Quero entender métricas e engajamento
4. Quero conhecer o curso`;
}

function contentMenu(saudacao = "") {
  return `${saudacao}para gravar melhor, você não precisa começar com equipamentos caros.

Você precisa entender:

- enquadramento
- iluminação
- cenário
- áudio
- roteiro simples
- postura
- edição básica
- como transformar rotina em conteúdo

Escolha:

1. Quero aprender a gravar Reels
2. Quero melhorar meu setup
3. Quero ideias de conteúdo
4. Quero o link do curso`;
}

function paymentMenu(saudacao = "") {
  return `${saudacao}a condição atual está especial:

De ${OLD_PRICE}
Por ${COURSE_PRICE}

Pagamento único.

Escolha:

1. Quero acessar a página do curso
2. Quero saber o que está incluso
3. Quero tirar dúvida antes de pagar
4. Tive problema no pagamento`;
}

function supportMenu(saudacao = "") {
  return `${saudacao}certo. Para resolver mais rápido, me diga onde está o problema:

1. Cadastro
2. Login
3. Pagamento
4. Área do aluno não abre
5. Quero falar com suporte`;
}

export function handleIncomingMessage(text = "", user = null) {
  const msg = normalizeText(text);
  const userKey = getUserKey(user);
  const nome = getFirstName(user);
  const saudacao = nome ? `${nome}, ` : "";
  const currentStage = getStage(userKey);

  if (msg.includes("menu") || msg.includes("voltar") || msg.includes("inicio")) {
    setStage(userKey, "inicio");
    return { intent: "menu", reply: mainMenu(saudacao) };
  }

  if (msg.includes("oi") || msg.includes("ola") || msg.includes("olá") || msg.includes("opa") || msg.includes("bom dia") || msg.includes("boa tarde") || msg.includes("boa noite")) {
    setStage(userKey, "inicio");
    return { intent: "saudacao", reply: `${saudacao}oi! Tudo bem? 💕\n\n${mainMenu("")}` };
  }

  if (msg.includes("curso") || msg.includes("funciona") || msg.includes("saber mais") || msg.includes("influencer") || msg.includes("influenciadora")) {
    setStage(userKey, "curso");
    return { intent: "curso", reply: courseMenu(saudacao) };
  }

  if (msg.includes("seguidor") || msg.includes("seguidores") || msg.includes("crescer") || msg.includes("engajamento") || msg.includes("alcance") || msg.includes("views") || msg.includes("visualizacao") || msg.includes("visualização")) {
    setStage(userKey, "crescimento");
    return { intent: "crescimento", reply: growthMenu(saudacao) };
  }

  if (msg.includes("gravar") || msg.includes("reels") || msg.includes("story") || msg.includes("stories") || msg.includes("conteudo") || msg.includes("conteúdo") || msg.includes("celular") || msg.includes("setup") || msg.includes("microfone")) {
    setStage(userKey, "conteudo");
    return { intent: "conteudo", reply: contentMenu(saudacao) };
  }

  if (msg.includes("valor") || msg.includes("preco") || msg.includes("preço") || msg.includes("quanto custa") || msg.includes("pagamento") || msg.includes("pix") || msg.includes("cartao") || msg.includes("cartão") || msg.includes("boleto")) {
    setStage(userKey, "pagamento");
    return { intent: "pagamento", reply: paymentMenu(saudacao) };
  }

  if (msg.includes("erro") || msg.includes("bug") || msg.includes("travou") || msg.includes("nao abre") || msg.includes("não abre") || msg.includes("login") || msg.includes("senha") || msg.includes("cadastro") || msg.includes("acesso")) {
    setStage(userKey, "suporte");
    return { intent: "suporte", reply: supportMenu(saudacao) };
  }

  let reply = "";

  if (currentStage === "inicio") {
    if (isOption(msg, 1)) {
      setStage(userKey, "curso");
      reply = courseMenu(saudacao);
    } else if (isOption(msg, 2)) {
      setStage(userKey, "crescimento");
      reply = growthMenu(saudacao);
    } else if (isOption(msg, 3)) {
      setStage(userKey, "conteudo");
      reply = contentMenu(saudacao);
    } else if (isOption(msg, 4)) {
      setStage(userKey, "pagamento");
      reply = paymentMenu(saudacao);
    } else if (isOption(msg, 5)) {
      setStage(userKey, "suporte");
      reply = supportMenu(saudacao);
    }
  }

  if (currentStage === "curso") {
    if (isOption(msg, 1)) {
      reply = `${saudacao}no curso você aprende a organizar seu perfil, criar conteúdos com mais intenção, melhorar Reels, stories, estética, métricas e rotina de postagem.

Escolha:

1. Quero saber se serve para mim
2. Quero o valor
3. Quero acessar a página`;
      setStage(userKey, "curso_detalhe");
    } else if (isOption(msg, 2)) {
      reply = `${saudacao}serve se você quer começar como influenciadora, posta mas sente que não cresce, quer gravar melhor e transformar conteúdo em oportunidade.

Escolha:

1. Sim, esse é meu caso
2. Quero o link
3. Quero saber o valor`;
      setStage(userKey, "curso_caso");
    } else if (isOption(msg, 3)) {
      reply = `${saudacao}claro. A página do curso é essa:

${COURSE_LINK}`;
      setStage(userKey, "link_enviado");
    } else if (isOption(msg, 4)) {
      setStage(userKey, "pagamento");
      reply = paymentMenu(saudacao);
    }
  }

  if (currentStage === "crescimento") {
    if (isOption(msg, 1)) {
      reply = `${saudacao}para sair do 0 aos primeiros 1.000 seguidores, o foco é base: perfil claro, bio bem construída, nicho definido, Reels com gancho e stories para conexão.

Escolha:

1. Quero conhecer o curso
2. Quero saber o valor
3. Quero o link`;
      setStage(userKey, "crescimento_detalhe");
    } else if (isOption(msg, 2)) {
      reply = `${saudacao}de 1.000 para 5.000 seguidores, você precisa entender o que performa, repetir formatos vencedores, aumentar retenção e criar comunidade.

Escolha:

1. Quero aprender isso
2. Quero saber o valor
3. Quero acessar`;
      setStage(userKey, "crescimento_detalhe");
    } else if (isOption(msg, 3)) {
      reply = `${saudacao}métricas mostram o que está funcionando: visualizações, alcance, curtidas, salvamentos, compartilhamentos e seguidores novos.

Escolha:

1. Quero conhecer o curso
2. Quero o link
3. Quero tirar dúvida`;
      setStage(userKey, "crescimento_detalhe");
    }
  }

  if (currentStage === "conteudo") {
    if (isOption(msg, 1)) {
      reply = `${saudacao}para gravar Reels melhores, você precisa de gancho inicial, imagem limpa, roteiro simples e final com intenção.

Escolha:

1. Quero conhecer o curso
2. Quero saber o valor
3. Quero o link`;
      setStage(userKey, "conteudo_detalhe");
    } else if (isOption(msg, 2)) {
      reply = `${saudacao}um setup simples já ajuda muito: celular bem posicionado, luz natural, fundo limpo, áudio claro, apoio/tripé e cenário com identidade.

Escolha:

1. Quero aprender isso
2. Quero o link
3. Quero saber o valor`;
      setStage(userKey, "conteudo_detalhe");
    } else if (isOption(msg, 3)) {
      reply = `${saudacao}ideias para começar: bastidores, rotina, antes e depois, erros comuns, dicas rápidas, tendências adaptadas, prova social e opinião.

Escolha:

1. Quero conhecer o curso
2. Quero o link
3. Quero tirar dúvida`;
      setStage(userKey, "conteudo_detalhe");
    }
  }

  if (currentStage === "pagamento") {
    if (isOption(msg, 1)) {
      reply = `${saudacao}perfeito. Você pode acessar por aqui:

${COURSE_LINK}

A condição atual está de ${OLD_PRICE} por ${COURSE_PRICE}.`;
      setStage(userKey, "link_enviado");
    } else if (isOption(msg, 2)) {
      reply = `${saudacao}o acesso inclui aulas sobre crescimento, posicionamento, criação de conteúdo, Reels, stories, estética, métricas, engajamento e materiais de apoio.

Hoje está de ${OLD_PRICE} por ${COURSE_PRICE}.`;
      setStage(userKey, "pagamento_detalhe");
    } else if (isOption(msg, 3)) {
      reply = `${saudacao}claro. Pode me mandar sua dúvida sobre o curso, pagamento ou acesso.`;
      setStage(userKey, "duvida");
    } else if (isOption(msg, 4)) {
      setStage(userKey, "suporte");
      reply = supportMenu(saudacao);
    }
  }

  if (currentStage === "suporte") {
    reply = `${saudacao}entendi. Para verificar melhor, me envie:

- print da tela
- e-mail usado no cadastro
- em qual parte travou`;
    setStage(userKey, "aguardando_suporte");
  }

  if (!reply) {
    reply = mainMenu(saudacao);
    setStage(userKey, "inicio");
  }

  return { intent: currentStage, reply };
}

export default handleIncomingMessage;
