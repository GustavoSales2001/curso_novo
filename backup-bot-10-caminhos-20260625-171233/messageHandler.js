const COURSE_LINK = "https://gustavosales2001.github.io/curso_novo/";
const COURSE_PRICE = "R$ 39,99";
const OLD_PRICE = "R$ 69,99";
const SUPPORT_WHATSAPP = "5511922198936";

const memories = new Map();

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getFirstName(user = {}) {
  const rawName = user.name || user.nome || "";
  return rawName ? String(rawName).split(" ")[0] : "";
}

function getUserKey(user = {}) {
  return String(
    user.phone ||
    user.celular ||
    user.whatsapp ||
    user.id ||
    user.email ||
    user.name ||
    "visitante"
  ).toLowerCase();
}

function hasAny(msg, words) {
  return words.some(word => msg.includes(normalizeText(word)));
}

function getMemory(user = {}) {
  const key = getUserKey(user);

  if (!memories.has(key)) {
    memories.set(key, {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stage: "inicio",
      lastIntent: "",
      lastReply: "",
      turns: [],
      usedVariants: {},
      known: {
        name: getFirstName(user),
        interest: "",
        objection: "",
        followers: "",
        pain: ""
      }
    });
  }

  const memory = memories.get(key);
  memory.updatedAt = Date.now();

  if (!memory.known.name) {
    memory.known.name = getFirstName(user);
  }

  return memory;
}

function rememberUserText(memory, text) {
  const msg = normalizeText(text);

  if (hasAny(msg, ["sem dinheiro", "sem grana", "sem condições", "sem condicoes", "caro", "não tenho dinheiro", "nao tenho dinheiro"])) {
    memory.known.objection = "dinheiro";
  }

  if (hasAny(msg, ["sem tempo", "correria", "trabalho muito", "não tenho tempo", "nao tenho tempo"])) {
    memory.known.objection = "tempo";
  }

  if (hasAny(msg, ["tenho medo", "medo", "não sei se funciona", "nao sei se funciona", "vale a pena"])) {
    memory.known.objection = "confiança";
  }

  if (hasAny(msg, ["zero", "começando", "comecando", "iniciante", "primeiros seguidores"])) {
    memory.known.interest = "começar do zero";
  }

  if (hasAny(msg, ["reels", "stories", "canva", "capcut", "ia", "video", "vídeo", "gravar"])) {
    memory.known.interest = "produção de conteúdo";
  }

  if (hasAny(msg, ["engajamento", "alcance", "seguidores", "crescer", "instagram"])) {
    memory.known.interest = "crescimento";
  }

  const followersMatch = msg.match(/(\d{2,6})\s*(seguidores|seguidor)/);
  if (followersMatch) {
    memory.known.followers = followersMatch[1];
  }

  if (hasAny(msg, ["não sei postar", "nao sei postar", "travada", "perdida", "postar no escuro", "não cresço", "nao cresco"])) {
    memory.known.pain = "sem direção";
  }
}

function pick(memory, intent, options) {
  if (!memory.usedVariants[intent]) {
    memory.usedVariants[intent] = [];
  }

  const used = memory.usedVariants[intent];
  let available = options.filter((_, index) => !used.includes(index));

  if (available.length === 0) {
    memory.usedVariants[intent] = [];
    available = options;
  }

  const selectedText = available[Math.floor(Math.random() * available.length)];
  const selectedIndex = options.indexOf(selectedText);

  memory.usedVariants[intent].push(selectedIndex);
  memory.lastReply = selectedText;
  memory.lastIntent = intent;

  return selectedText;
}

function greeting(memory) {
  const name = memory.known.name;
  const saudacao = name ? `${name}, ` : "";

  return pick(memory, "greeting", [
    `${saudacao}oii! 💕 Tudo bem?

Me conta rapidinho: você quer entender o curso, crescer no Instagram, melhorar seus vídeos ou saber o valor?

1. Como funciona o curso
2. Como sair do zero no Instagram
3. Reels, stories, Canva, CapCut e IA
4. Valor e pagamento
5. Problema no acesso ou cadastro`,

    `${saudacao}oi, tudo bem? ✨

Que bom te ver por aqui. Vou te ajudar de um jeito bem simples.

Hoje sua maior dúvida é sobre:
1. O curso
2. Crescimento no Instagram
3. Conteúdo, Reels e edição
4. Valor
5. Acesso ou suporte`,

    `${saudacao}oii 💕 Seja bem-vinda à Influencer Academy.

Antes de te mandar qualquer coisa, me diz uma coisa: você está começando do zero ou já posta e sente que não cresce?

Pode responder com:
1. Quero entender o curso
2. Quero crescer
3. Quero melhorar meus conteúdos
4. Quero saber o valor`
  ]);
}

function course(memory) {
  memory.stage = "curso";

  return pick(memory, "course", [
    `A Influencer Academy é uma trilha prática para quem quer crescer como criadora de conteúdo com mais clareza, estética e estratégia.

Você aprende desde a base até uma presença mais profissional:

✨ posicionamento e nicho
✨ bio e perfil que passam confiança
✨ ideias de conteúdo
✨ Reels com gancho e retenção
✨ stories para conexão
✨ Canva, CapCut e IA
✨ métricas simples
✨ monetização e parcerias

A ideia não é só “postar mais”. É entender o que postar, por que postar e como melhorar.

Quer que eu te explique a trilha por fases?`,

    `Funciona assim: o curso te leva por uma jornada de crescimento.

Primeiro você ajusta sua base: nicho, perfil, bio e posicionamento.
Depois entra em conteúdo: Reels, stories, Canva, CapCut e IA.
E depois aprende a olhar métricas e se preparar para parcerias.

É bem prático, para aplicar no perfil sem ficar perdida.

Me conta: hoje você sente mais dificuldade em crescer, gravar ou organizar o perfil?`,

    `O curso foi pensado para quem quer crescer na internet com mais direção.

Você não precisa ter equipamento caro nem milhares de seguidores para começar. O foco é aprender a construir presença digital com estratégia.

Ele te ajuda a responder:
• o que postar
• como aparecer
• como organizar seu perfil
• como gravar melhor
• como usar ferramentas
• como acompanhar resultado

Quer que eu te diga se ele faz sentido para a sua fase?`
  ]);
}

function growth(memory) {
  memory.stage = "growth";

  const followers = memory.known.followers
    ? `Como você comentou sobre ${memory.known.followers} seguidores, dá para pensar em uma estratégia mais ajustada para sua fase.`
    : `Para crescer, primeiro precisamos entender sua fase atual.`;

  return pick(memory, "growth", [
    `${followers}

Crescer no Instagram não é só postar todo dia. É alinhar 4 coisas:

1. perfil claro
2. conteúdo com intenção
3. Reels com gancho
4. constância possível

No começo, o maior erro é tentar copiar todo mundo. O curso te ajuda a criar uma direção para o seu nicho e transformar seu perfil em algo mais forte.

Você está começando do zero ou já tem um perfil ativo?`,

    `Sair do zero exige uma base simples, mas bem feita.

Você precisa:
✨ escolher uma mensagem clara
✨ deixar a bio mais objetiva
✨ criar conteúdos que prendem atenção
✨ aparecer nos stories com intenção
✨ repetir o que funciona
✨ parar de depender de sorte

A Influencer Academy organiza isso em etapas: 0 a 1.000, 1.000 a 5.000 e depois uma presença mais forte.

Quer que eu te passe o caminho do 0 aos primeiros seguidores?`,

    `Muita gente trava porque acha que precisa viralizar. Mas antes de viralizar, o perfil precisa estar preparado.

O curso trabalha isso:
• primeira impressão
• conteúdo que conecta
• vídeos curtos
• identidade visual
• rotina de postagem
• análise de métricas

Me diz uma coisa: você tem mais dificuldade em ter ideias ou em gravar?`
  ]);
}

function content(memory) {
  memory.stage = "content";

  return pick(memory, "content", [
    `Para melhorar Reels, stories, Canva, CapCut e IA, você precisa de um processo simples.

No curso você aprende:

🎥 gravar melhor com celular
💡 usar iluminação simples
✂️ editar no CapCut
🎨 criar visual no Canva
📝 montar roteiro de Reels
✨ usar IA para ideias e legendas
📊 entender o que performa

O objetivo é deixar seu conteúdo mais bonito, claro e estratégico, sem parecer artificial.

Hoje sua maior dificuldade é gravar ou editar?`,

    `Conteúdo bom não nasce só de inspiração. Ele nasce de estrutura.

Um Reel, por exemplo, precisa de:
1. gancho
2. promessa
3. desenvolvimento rápido
4. legenda fácil
5. CTA natural

Nos stories, a lógica muda: é mais conexão, bastidor e presença.

O curso mostra como usar cada formato sem ficar perdida.

Você quer melhorar mais seus vídeos ou sua estética visual?`,

    `Canva, CapCut e IA ajudam muito, mas só funcionam bem quando você sabe o que quer comunicar.

Por isso a trilha junta estratégia + ferramenta.

Canva: capas, posts, carrosséis e identidade.
CapCut: cortes, legendas, ritmo e acabamento.
IA: ideias, roteiros, legendas e planejamento.

Se quiser, eu posso te explicar como seria uma rotina semanal de conteúdo para uma iniciante.`
  ]);
}

function payment(memory) {
  memory.stage = "payment";

  return pick(memory, "payment", [
    `A condição atual está assim:

De ${OLD_PRICE}
Por ${COURSE_PRICE}

É pagamento único.

Link:
${COURSE_LINK}

O acesso é pela área da aluna, com os módulos organizados para você seguir a trilha.

Quer que eu te explique o que está incluso antes de você decidir?`,

    `Hoje o curso está com valor promocional:

${OLD_PRICE} → ${COURSE_PRICE}

É um acesso único para a trilha da Influencer Academy.

O link é:
${COURSE_LINK}

E sendo bem transparente: o curso é para quem quer aplicar. Não é promessa mágica, é direção e prática.

Quer saber se ele serve para sua fase?`,

    `O investimento atual é ${COURSE_PRICE}, pagamento único.

O que você recebe:
✨ trilha de módulos
✨ área da aluna
✨ aulas sobre Instagram, Reels, stories, Canva, CapCut e IA
✨ conteúdos de posicionamento e crescimento
✨ materiais para aplicar no perfil

Link:
${COURSE_LINK}

Se o seu receio for dinheiro agora, me fala com sinceridade que eu te oriento sem pressão.`
  ]);
}

function moneyObjection(memory) {
  memory.stage = "objection_money";
  memory.known.objection = "dinheiro";

  return pick(memory, "money", [
    `Eu te entendo de verdade 💕 Não se aperta por causa disso.

O curso está por ${COURSE_PRICE}, mas só vale entrar quando fizer sentido para você.

Enquanto isso, já começa por 3 coisas gratuitas:
1. ajuste sua bio para deixar claro o que você entrega
2. poste 3 Reels com gancho direto nos primeiros segundos
3. use stories para mostrar bastidor e criar conexão

Quando você conseguir investir, o link fica aqui:
${COURSE_LINK}

Quer que eu te ajude com uma ideia de bio agora?`,

    `Super entendo. Às vezes a pessoa quer começar, mas o momento financeiro aperta mesmo.

Não vou te empurrar nada. O melhor é você começar com o básico:
✨ organizar o perfil
✨ escolher 3 temas principais
✨ postar com mais intenção
✨ observar quais conteúdos trazem resposta

Quando der, o curso está por ${COURSE_PRICE} e pode acelerar esse processo.

Me diz: seu perfil hoje é sobre qual assunto?`,

    `Obrigada por falar isso com sinceridade 💕

Se agora não é o momento de comprar, tudo bem. Só não para.

Começa por uma tarefa simples hoje:
olhe sua bio e veja se uma pessoa nova entende em 5 segundos por que deveria te seguir.

Quando você puder, a Influencer Academy entra como um guia completo por ${COURSE_PRICE}.

Quer me mandar o tema do seu perfil para eu te sugerir um caminho inicial?`
  ]);
}

function timeObjection(memory) {
  memory.stage = "objection_time";

  return pick(memory, "time", [
    `Te entendo. E justamente por isso o curso não é para complicar sua rotina.

A ideia é criar um método possível, mesmo com pouco tempo:
• 1 dia para planejar
• 1 dia para gravar
• 1 dia para editar/agendar
• stories simples no dia a dia

Você não precisa viver para o conteúdo. Precisa criar um processo.

Quantos dias por semana você consegue se dedicar hoje?`,

    `Se o problema é tempo, o caminho não é postar mais. É postar melhor.

Uma rotina simples já ajuda:
✨ 3 Reels por semana
✨ stories rápidos todos os dias possíveis
✨ 1 momento para revisar métricas
✨ reaproveitar ideias

O curso te ajuda a montar essa estrutura.

Você tem mais tempo de manhã, tarde ou noite?`
  ]);
}

function trustObjection(memory) {
  memory.stage = "objection_trust";

  return pick(memory, "trust", [
    `É normal ficar em dúvida. E eu prefiro ser honesta: nenhum curso sério consegue prometer resultado mágico.

O que a Influencer Academy entrega é método:
✨ clareza de posicionamento
✨ roteiro para conteúdo
✨ melhoria de perfil
✨ ferramentas práticas
✨ análise de métricas
✨ direção para crescer com consistência

Resultado depende de aplicar, testar e ajustar.

Quer que eu te explique qual seria seu primeiro passo?`,

    `Sua dúvida faz sentido. O curso não é sobre fórmula milagrosa, é sobre tirar você do achismo.

Ele te mostra o que fazer em cada fase:
0 a 1.000 seguidores, depois 1.000 a 5.000 e depois presença mais profissional.

Se você aplicar, você para de postar perdida e começa a entender o que melhorar.

Me conta: você já posta hoje ou ainda está começando?`
  ]);
}

function included(memory) {
  memory.stage = "included";

  return pick(memory, "included", [
    `Está incluso na trilha:

1. Posicionamento e nicho
2. Bio, estética e primeira impressão
3. Ideias e pilares de conteúdo
4. Reels com gancho e retenção
5. Stories para conexão
6. Canva para identidade visual
7. CapCut para edição dinâmica
8. IA para roteiro e vídeo
9. Métricas e crescimento
10. Monetização e parcerias

Além disso, a área da aluna tem conteúdos organizados por módulos e aulas.

Quer que eu te explique qual módulo você deveria começar primeiro?`,

    `Dentro do curso você aprende a construir presença digital de forma mais profissional.

Não é só “como editar vídeo”. É a junção de:
✨ estratégia
✨ estética
✨ conteúdo
✨ ferramentas
✨ métricas
✨ monetização

Por isso ele serve tanto para quem está começando quanto para quem já posta, mas sente que não cresce.

Quer saber o valor ou o link de acesso?`
  ]);
}

function suitability(memory) {
  memory.stage = "suitability";

  return pick(memory, "suitability", [
    `Pelo que você está me dizendo, parece que ele pode fazer sentido sim.

Ele é indicado para quem:
✨ está começando do zero
✨ posta, mas não cresce
✨ quer melhorar Reels e stories
✨ quer deixar o perfil mais profissional
✨ quer aprender Canva, CapCut e IA
✨ quer criar presença para fechar oportunidades

Agora, para eu ser mais certeira: você quer crescer como influenciadora de qual nicho?`,

    `Serve principalmente se você quer parar de postar no improviso.

Mesmo que você ainda tenha poucos seguidores, o curso ajuda a organizar:
• perfil
• nicho
• conteúdo
• rotina
• vídeos
• métricas

Se você já tem perfil ativo, ele ajuda a corrigir o que pode estar travando seu crescimento.

Você está no zero ou já posta há algum tempo?`
  ]);
}

function accessSupport(memory) {
  memory.stage = "support";

  return pick(memory, "support", [
    `Entendi. Para acesso, me diz exatamente onde está o problema:

1. Não consigo criar cadastro
2. Não consigo fazer login
3. Paguei e não liberou
4. Aula aparece bloqueada
5. Página não abre

Se puder, envie um print para o suporte:
https://wa.me/${SUPPORT_WHATSAPP}`,

    `Vamos resolver isso.

Me responde com o número:
1. Cadastro
2. Login
3. Pagamento
4. Área da aluna
5. Aula bloqueada

Se for algo urgente, chama o suporte com print:
https://wa.me/${SUPPORT_WHATSAPP}`
  ]);
}

function buy(memory) {
  memory.stage = "buy";

  return pick(memory, "buy", [
    `Perfeito 💕 Aqui está o link para acessar:

${COURSE_LINK}

A condição atual é:
De ${OLD_PRICE}
Por ${COURSE_PRICE}

Depois do pagamento, você segue para criar/acessar sua área da aluna.`,

    `Claro! O link é esse aqui:

${COURSE_LINK}

Valor atual: ${COURSE_PRICE}

Minha sugestão: depois que entrar, comece pela parte de posicionamento e perfil antes de ir direto para Reels. Isso deixa seu crescimento mais estratégico.`
  ]);
}

function thanks(memory) {
  return pick(memory, "thanks", [
    `Imagina 💕 Fico feliz em ajudar.

Quando quiser, me chama por aqui e eu te explico o próximo passo.`,
    `De nada! ✨

E lembra: o importante é começar com direção, não com perfeição.`,
    `Por nada 💕 Se surgir outra dúvida sobre o curso, conteúdo ou acesso, pode me mandar.`
  ]);
}

function fallback(memory, text) {
  return pick(memory, "fallback", [
    `Entendi 💕

Para eu te responder melhor, me explica com um pouco mais de detalhe.

Sua dúvida é mais sobre:
1. o curso
2. crescimento no Instagram
3. Reels, stories e conteúdo
4. valor e pagamento
5. acesso ou suporte`,

    `Boa pergunta. Quero te responder do jeito certo.

Você está perguntando mais sobre como crescer, como funciona o curso ou sobre o valor?`,

    `Certo, deixa eu entender melhor para não te mandar uma resposta genérica.

Você quer ajuda com perfil, conteúdo, pagamento ou acesso?`
  ]);
}

function detectIntent(msg, memory) {
  if (!msg) return "greeting";

  if (["1", "2", "3", "4", "5"].includes(msg)) {
    return {
      "1": "course",
      "2": "growth",
      "3": "content",
      "4": "payment",
      "5": "support"
    }[msg];
  }

  if (hasAny(msg, ["oi", "ola", "olá", "opa", "bom dia", "boa tarde", "boa noite", "tudo bem", "menu", "inicio", "início", "voltar"])) {
    return "greeting";
  }

  if (hasAny(msg, ["obrigada", "obrigado", "valeu", "perfeito", "entendi", "show"])) {
    return "thanks";
  }

  if (hasAny(msg, ["quero comprar", "quero entrar", "manda o link", "me manda o link", "link", "acessar agora", "comprar agora"])) {
    return "buy";
  }

  if (hasAny(msg, ["sem dinheiro", "sem grana", "sem condições", "sem condicoes", "sem condição", "sem condicao", "caro", "não tenho dinheiro", "nao tenho dinheiro", "sem pix", "não consigo pagar", "nao consigo pagar"])) {
    return "money";
  }

  if (hasAny(msg, ["sem tempo", "não tenho tempo", "nao tenho tempo", "correria", "trabalho muito", "não consigo postar", "nao consigo postar"])) {
    return "time";
  }

  if (hasAny(msg, ["funciona mesmo", "vale a pena", "tenho medo", "medo", "garantia", "resultado", "não sei se funciona", "nao sei se funciona"])) {
    return "trust";
  }

  if (hasAny(msg, ["o que tem", "incluso", "inclui", "módulos", "modulos", "aulas", "conteúdo do curso", "conteudo do curso", "aprendo o que"])) {
    return "included";
  }

  if (hasAny(msg, ["serve pra mim", "serve para mim", "sou iniciante", "iniciante", "começando", "comecando", "do zero", "zero seguidores"])) {
    return "suitability";
  }

  if (hasAny(msg, ["valor", "preço", "preco", "quanto custa", "pagamento", "pix", "cartão", "cartao", "boleto", "parcela", "parcelamento"])) {
    return "payment";
  }

  if (hasAny(msg, ["reels", "stories", "story", "canva", "capcut", "ia", "conteúdo", "conteudo", "gravar", "vídeo", "video", "editar", "legenda"])) {
    return "content";
  }

  if (hasAny(msg, ["crescer", "seguidores", "instagram", "engajamento", "alcance", "views", "visualização", "visualizacao", "viralizar"])) {
    return "growth";
  }

  if (hasAny(msg, ["curso", "como funciona", "explica", "saber mais", "influencer academy"])) {
    return "course";
  }

  if (hasAny(msg, ["login", "senha", "cadastro", "acesso", "paguei", "não liberou", "nao liberou", "erro", "bug", "travou", "suporte", "humano", "atendente"])) {
    return "support";
  }

  if (hasAny(msg, ["sim", "quero", "pode", "me mostra", "manda"]) && ["payment", "money", "course", "suitability"].includes(memory.lastIntent)) {
    return "buy";
  }

  return "fallback";
}

export function handleIncomingMessage(text = "", user = {}) {
  const memory = getMemory(user);
  const msg = normalizeText(text);

  rememberUserText(memory, text);

  memory.turns.push({
    role: "user",
    text: String(text || ""),
    at: new Date().toISOString()
  });

  if (memory.turns.length > 20) {
    memory.turns = memory.turns.slice(-20);
  }

  const intent = detectIntent(msg, memory);

  let reply;

  if (intent === "greeting") reply = greeting(memory);
  else if (intent === "course") reply = course(memory);
  else if (intent === "growth") reply = growth(memory);
  else if (intent === "content") reply = content(memory);
  else if (intent === "payment") reply = payment(memory);
  else if (intent === "money") reply = moneyObjection(memory);
  else if (intent === "time") reply = timeObjection(memory);
  else if (intent === "trust") reply = trustObjection(memory);
  else if (intent === "included") reply = included(memory);
  else if (intent === "suitability") reply = suitability(memory);
  else if (intent === "support") reply = accessSupport(memory);
  else if (intent === "buy") reply = buy(memory);
  else if (intent === "thanks") reply = thanks(memory);
  else reply = fallback(memory, text);

  memory.turns.push({
    role: "bot",
    intent,
    text: reply,
    at: new Date().toISOString()
  });

  memory.lastIntent = intent;
  memory.lastReply = reply;

  return {
    intent,
    reply,
    memory: {
      stage: memory.stage,
      interest: memory.known.interest,
      objection: memory.known.objection,
      followers: memory.known.followers,
      pain: memory.known.pain
    }
  };
}

export default handleIncomingMessage;
