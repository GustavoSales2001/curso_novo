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
      currentPath: "",
      lastIntent: "",
      lastReply: "",
      lastUserText: "",
      pathIndex: {
        course: 0,
        growth: 0,
        content: 0,
        payment: 0,
        money: 0,
        support: 0,
        fallback: 0
      },
      known: {
        name: getFirstName(user),
        level: "",
        interest: "",
        objection: "",
        pain: "",
        followers: ""
      },
      turns: []
    });
  }

  const memory = memories.get(key);

  if (!memory.known.name) {
    memory.known.name = getFirstName(user);
  }

  return memory;
}

function prefix(memory) {
  return memory.known.name ? `${memory.known.name}, ` : "";
}

function remember(memory, text) {
  const msg = normalizeText(text);
  memory.lastUserText = text;

  if (hasAny(msg, ["zero", "iniciante", "começando", "comecando", "nunca postei", "poucos seguidores"])) {
    memory.known.level = "iniciante";
  }

  if (hasAny(msg, ["ja posto", "já posto", "posto mas", "nao cresco", "não cresço", "travada", "perdida"])) {
    memory.known.level = "ja posta";
    memory.known.pain = "posta mas não cresce";
  }

  if (hasAny(msg, ["sem dinheiro", "sem grana", "sem condições", "sem condicoes", "caro", "não tenho dinheiro", "nao tenho dinheiro"])) {
    memory.known.objection = "dinheiro";
  }

  if (hasAny(msg, ["sem tempo", "correria", "trabalho muito", "não tenho tempo", "nao tenho tempo"])) {
    memory.known.objection = "tempo";
  }

  if (hasAny(msg, ["vergonha", "medo de aparecer", "não gosto de aparecer", "nao gosto de aparecer"])) {
    memory.known.objection = "vergonha";
  }

  if (hasAny(msg, ["reels", "stories", "canva", "capcut", "ia", "video", "vídeo", "gravar", "editar"])) {
    memory.known.interest = "conteudo";
  }

  if (hasAny(msg, ["crescer", "seguidores", "engajamento", "alcance", "instagram", "views"])) {
    memory.known.interest = "crescimento";
  }

  const followersMatch = msg.match(/(\d{2,6})\s*(seguidores|seguidor)/);
  if (followersMatch) {
    memory.known.followers = followersMatch[1];
  }
}

function nextFromPath(memory, pathName, replies) {
  memory.currentPath = pathName;
  memory.lastIntent = pathName;

  if (typeof memory.pathIndex[pathName] !== "number") {
    memory.pathIndex[pathName] = 0;
  }

  const index = memory.pathIndex[pathName] % replies.length;
  memory.pathIndex[pathName] += 1;

  const reply = replies[index];
  memory.lastReply = reply;

  return reply;
}

function isContinue(msg) {
  return hasAny(msg, [
    "sim", "quero", "pode", "me explica", "me explique", "explica",
    "continua", "continuar", "e depois", "proximo", "próximo",
    "me fala mais", "manda mais", "quero saber mais", "ok", "ta", "tá",
    "pode ser", "entendi", "certo", "bora", "vamos"
  ]);
}

const paths = {
  course: [
    `A Influencer Academy é uma trilha prática para quem quer crescer como criadora de conteúdo com mais clareza, estética e estratégia.

Ela não é só sobre postar mais. É sobre entender o que postar, como se posicionar e como transformar seu perfil em uma presença digital mais forte.

Dentro da trilha você aprende perfil, conteúdo, Reels, stories, Canva, CapCut, IA, métricas e parcerias.

Quer que eu te explique por onde a aluna começa dentro do curso?`,

    `A primeira parte do curso é sobre posicionamento.

Antes de pensar em viralizar, você precisa saber:
• quem você quer atrair
• qual mensagem quer passar
• que tipo de conteúdo combina com você
• como seu perfil deve ser percebido

Sem isso, a pessoa posta muito, mas não constrói uma identidade clara.

Quer que eu te explique essa primeira etapa?`,

    `Depois do posicionamento, o curso entra na parte do perfil.

A ideia é melhorar a primeira impressão: bio, foto, nome, destaques, posts fixados e clareza visual.

Quando alguém entra no seu perfil, ela precisa entender em poucos segundos quem você é, o que entrega e por que deveria te seguir.

Quer que eu te mostre o que geralmente trava o perfil de quem quer crescer?`,

    `A terceira parte é sobre ideias e pilares de conteúdo.

Em vez de acordar todo dia pensando “o que eu posto hoje?”, você aprende a criar temas fixos para seu perfil.

Exemplo:
• conteúdo educativo
• bastidores
• prova social
• conexão
• autoridade
• venda leve

Isso cria consistência e facilita muito a produção.

Quer que eu te explique como usar pilares na prática?`,

    `Depois vem Reels.

O curso ensina como criar vídeos curtos com gancho, retenção e CTA.

Um Reel bom precisa prender a atenção logo no início. Não adianta esperar 10 segundos para chegar no ponto.

Você aprende estrutura, roteiro, ritmo e chamada para ação.

Quer que eu te dê um exemplo de Reel simples?`,

    `Também tem uma parte forte de stories.

Stories não servem só para postar qualquer coisa do dia. Eles ajudam a criar conexão.

Você aprende a usar bastidor, enquete, caixinha, rotina, prova social e CTA leve.

É ali que muita gente começa a confiar mais em você.

Quer que eu te explique uma sequência de stories para iniciante?`,

    `A parte de ferramentas entra depois da estratégia.

Canva ajuda na estética.
CapCut ajuda na edição.
IA ajuda nas ideias, roteiros e legendas.

Mas o curso mostra como usar isso com intenção, para não ficar artificial nem genérico.

Quer que eu te explique como cada ferramenta entra no dia a dia?`,

    `Depois o curso entra em métricas.

Você aprende a olhar o que realmente importa:
• alcance
• retenção
• salvamentos
• compartilhamentos
• comentários
• seguidores novos
• tipo de conteúdo que performa

Assim você para de postar no escuro e começa a melhorar com base em dados.

Quer que eu te explique quais métricas uma iniciante deve olhar primeiro?`,

    `Na parte final, a trilha fala sobre monetização e parcerias.

Antes de cobrar ou fechar divulgação, você precisa construir percepção de valor.

Isso envolve perfil organizado, conteúdo consistente, prova social e posicionamento claro.

O curso te prepara para parecer mais profissional para marcas e oportunidades.

Quer que eu te explique como começar a se preparar para parcerias?`,

    `Resumindo: o curso é uma jornada.

Você sai de:
“não sei o que postar”
“meu perfil está parado”
“não sei gravar”
“não entendo métricas”

Para uma rotina com mais direção, estética e estratégia.

O valor atual é ${COURSE_PRICE}, de ${OLD_PRICE}.

Link:
${COURSE_LINK}

Quer que eu te explique se ele serve para sua fase atual?`
  ],

  growth: [
    `Para crescer no Instagram, o primeiro passo não é postar mais. É postar com direção.

Você precisa alinhar:
1. nicho
2. bio
3. conteúdo
4. frequência
5. conexão
6. análise

Quando essas partes não conversam, o perfil fica confuso e o crescimento trava.

Quer que eu te explique o primeiro passo para sair do zero?`,

    `O primeiro passo para sair do zero é deixar seu perfil entendível.

A pessoa entra e precisa saber:
• quem é você
• sobre o que você fala
• por que seguir você
• o que ela vai ganhar acompanhando seu conteúdo

Se isso não está claro, ela pode até gostar de um vídeo, mas não segue.

Quer que eu te explique como ajustar a bio?`,

    `A bio precisa ser objetiva.

Uma boa bio responde:
1. o que você faz
2. para quem você faz
3. qual resultado ou experiência entrega
4. qual ação a pessoa deve tomar

Exemplo:
“Te ajudo a criar conteúdo com mais estratégia, estética e constância.”

Quer que eu te explique como adaptar isso para um nicho?`,

    `Depois da bio, entram os pilares de conteúdo.

Para crescer, você precisa repetir temas. Não dá para falar de tudo ao mesmo tempo.

Uma estrutura simples:
• conteúdo que atrai
• conteúdo que conecta
• conteúdo que ensina
• conteúdo que gera desejo
• conteúdo que vende sua imagem

Quer que eu te explique cada tipo?`,

    `Conteúdo que atrai é aquele que traz gente nova.

Normalmente funciona bem com:
• dicas rápidas
• erros comuns
• listas
• antes e depois
• tendências adaptadas
• frases fortes

Esse tipo de conteúdo precisa ter gancho claro.

Quer que eu te mostre exemplos de ganchos?`,

    `Conteúdo de conexão é o que faz a pessoa sentir que conhece você.

Pode ser:
• bastidor
• rotina
• opinião
• história pessoal
• dificuldade real
• evolução

Esse conteúdo transforma audiência fria em comunidade.

Quer que eu te explique como fazer conexão sem se expor demais?`,

    `Para crescer, Reels ajudam muito, mas eles precisam de estrutura.

Um Reel simples:
1. gancho nos primeiros 2 segundos
2. promessa clara
3. entrega rápida
4. CTA no final

Exemplo:
“Se seu perfil não cresce, talvez o problema esteja na sua bio.”

Quer que eu te mande mais exemplos de ganchos?`,

    `Stories também influenciam no crescimento.

Eles não têm o mesmo papel do Reel. O Reel atrai, o story aproxima.

Nos stories, você pode usar:
• enquete
• bastidor
• caixinha
• opinião
• indicação
• rotina
• prova social

Quer que eu te passe uma sequência de stories para hoje?`,

    `A consistência precisa ser possível.

Não adianta prometer postar todo dia e desistir em uma semana.

Uma rotina realista:
• 3 Reels por semana
• stories simples quase todos os dias
• 1 carrossel ou post educativo
• 1 dia para olhar métricas

Quer que eu te explique como organizar isso na semana?`,

    `O crescimento vem de testar, observar e repetir.

Toda semana você deve olhar:
• qual conteúdo trouxe mais alcance
• qual teve mais salvamentos
• qual gerou seguidores
• qual teve resposta nos stories

Depois você repete o formato com outro tema.

É isso que o curso te ensina a fazer com mais clareza.

Quer saber como a Influencer Academy organiza essa trilha?`
  ],

  content: [
    `Para melhorar seus conteúdos, você precisa de um processo.

Não é só abrir a câmera e gravar. Você precisa saber:
• qual ideia vai usar
• qual gancho abre o vídeo
• qual promessa será entregue
• como editar
• qual CTA usar

Quer que eu te explique a estrutura de um Reel?`,

    `Um Reel bom começa pelo gancho.

O gancho é a primeira frase ou imagem que faz a pessoa parar.

Exemplos:
• “Você está errando nisso no seu perfil”
• “Se você quer crescer, pare de fazer isso”
• “3 coisas que deixam seu conteúdo mais profissional”
• “O motivo do seu Reel não prender atenção”

Quer que eu te mande mais modelos?`,

    `Depois do gancho vem a promessa.

A promessa é o que a pessoa vai ganhar assistindo.

Exemplo:
“Vou te mostrar como melhorar sua bio em 3 passos.”

Sem promessa clara, a pessoa não sabe por que continuar vendo.

Quer que eu te explique como transformar ideias em promessa?`,

    `Depois vem o desenvolvimento.

Aqui você precisa ser direta. Nada de enrolar.

Uma estrutura boa:
1. problema
2. explicação rápida
3. solução
4. exemplo
5. CTA

Isso deixa o vídeo mais fácil de assistir.

Quer que eu te dê um exemplo pronto?`,

    `CapCut entra para melhorar ritmo.

Você pode usar:
• cortes secos
• legendas automáticas
• zoom leve
• remoção de pausas
• ajuste de áudio
• capa final

Mas cuidado: edição demais pode cansar. O ideal é deixar natural e claro.

Quer que eu te explique uma edição simples para iniciante?`,

    `Canva entra na parte visual.

Com Canva você pode criar:
• capas de Reels
• posts 4:5
• carrosséis
• destaques
• mídia kit
• identidade visual

O segredo é manter padrão, mas sem deixar tudo igual.

Quer que eu te explique uma paleta simples para começar?`,

    `IA ajuda muito quando falta ideia.

Você pode pedir:
• 20 ideias de Reels para seu nicho
• ganchos para vídeos curtos
• legendas com CTA
• roteiro de 30 segundos
• calendário semanal
• adaptação de tendência

Mas a IA precisa da sua personalidade. Senão fica genérico.

Quer que eu te mande um modelo de prompt?`,

    `Stories precisam parecer mais leves.

Você pode fazer uma sequência assim:
1. bom dia com contexto
2. bastidor do dia
3. enquete
4. dica rápida
5. CTA para responder no direct

Isso gera conversa e aproxima as pessoas.

Quer que eu te mande uma sequência pronta para copiar?`,

    `Para gravar melhor com celular, comece pelo básico:

• lente limpa
• luz de frente
• áudio próximo
• cenário organizado
• câmera na altura dos olhos
• vídeo curto
• frase inicial forte

Você não precisa de equipamento caro para começar.

Quer que eu te explique um setup simples?`,

    `Um bom conteúdo tem função.

Ele pode:
• atrair
• conectar
• educar
• gerar desejo
• vender
• criar autoridade

Quando você entende a função de cada post, para de postar aleatoriamente.

No curso, você aprende a montar essa estratégia.

Quer que eu te explique como montar um calendário semanal?`
  ],

  payment: [
    `A condição atual está especial:

De ${OLD_PRICE}
Por ${COURSE_PRICE}

É pagamento único.

Link:
${COURSE_LINK}

Antes de decidir, posso te explicar exatamente o que está incluso no curso.`,

    `O valor atual é ${COURSE_PRICE}.

Esse valor libera o acesso à trilha da Influencer Academy, com conteúdos sobre perfil, crescimento, Reels, stories, Canva, CapCut, IA, métricas e parcerias.

Quer que eu te explique para quem o curso é indicado?`,

    `Hoje está de ${OLD_PRICE} por ${COURSE_PRICE}.

A proposta é ser um valor acessível para quem está começando e quer crescer com mais direção.

Não é mensalidade. É pagamento único.

Quer que eu te explique como funciona depois do pagamento?`,

    `Depois do pagamento, você acessa a área da aluna e acompanha os módulos.

Minha sugestão é começar pelo início: posicionamento, perfil e pilares de conteúdo.

Muita gente quer ir direto para Reels, mas o perfil precisa estar preparado antes.

Quer que eu te explique a ordem ideal?`,

    `O curso custa ${COURSE_PRICE} no valor promocional atual.

Ele é indicado para quem:
• quer começar como criadora
• posta mas não cresce
• quer melhorar conteúdo
• quer aprender ferramentas
• quer se preparar para parcerias

Quer que eu te ajude a entender se vale para sua fase?`,

    `Se sua dúvida for segurança, eu entendo.

O curso não promete milagre. Ele entrega método, direção e prática.

Resultado vem com aplicação, constância e ajustes.

Por isso o valor é pensado para ser acessível: ${COURSE_PRICE}.

Quer que eu te explique o que você já consegue aplicar na primeira semana?`,

    `Se o problema for dinheiro agora, tudo bem.

Não precisa se apertar. Você pode começar com passos gratuitos:
1. ajustar bio
2. escolher 3 temas
3. postar Reels simples
4. aparecer nos stories
5. observar métricas

Quando fizer sentido, o link está aqui:
${COURSE_LINK}`,

    `O pagamento é feito pela página do curso.

Link:
${COURSE_LINK}

Valor atual: ${COURSE_PRICE}

Depois, você segue para cadastro/acesso da área da aluna.

Se tiver qualquer problema de acesso, pode chamar o suporte:
https://wa.me/${SUPPORT_WHATSAPP}`,

    `O investimento é ${COURSE_PRICE}, mas o mais importante é: entrar para aplicar.

Se você só assistir e não colocar em prática, não muda muito.

Agora, se você aplicar no perfil, já começa a enxergar melhor o que precisa ajustar.

Quer que eu te explique uma primeira tarefa para fazer hoje?`,

    `Resumo rápido:

Valor atual: ${COURSE_PRICE}
Valor anterior: ${OLD_PRICE}
Pagamento: único
Acesso: área da aluna
Conteúdo: Instagram, Reels, stories, Canva, CapCut, IA, métricas e parcerias

Link:
${COURSE_LINK}

Quer que eu te mande o caminho mais indicado para começar?`
  ]
};

function greeting(memory) {
  memory.currentPath = "inicio";

  return `${prefix(memory)}oii! 💕 Seja bem-vinda à Influencer Academy.

Me conta o que você quer entender primeiro:

1. Quero entender o curso
2. Quero crescer no Instagram
3. Quero melhorar meus conteúdos
4. Quero saber o valor

Pode responder só com o número ou escrever sua dúvida do seu jeito.`;
}

function moneyObjection(memory) {
  const replies = [
    `Eu te entendo de verdade 💕 Não se aperta por causa disso.

Se agora não é o momento, começa por uma ação gratuita: ajuste sua bio para deixar claro quem você ajuda e por que alguém deveria te seguir.

Quando fizer sentido, o curso está por ${COURSE_PRICE}:
${COURSE_LINK}`,

    `Super entendo. Às vezes a vontade existe, mas o financeiro aperta.

Não vou te pressionar. O melhor agora é começar pelo básico: organizar perfil, escolher 3 temas e postar com mais intenção.

Quer que eu te ajude com uma ideia de conteúdo gratuita para hoje?`,

    `Obrigada por falar isso com sinceridade 💕

Mesmo sem comprar agora, você pode começar. O primeiro passo é parar de postar aleatório e escolher uma direção.

Quando puder investir, a trilha te ajuda a acelerar.

Quer que eu te passe um primeiro passo simples?`
  ];

  return nextFromPath(memory, "money", replies);
}

function supportPath(memory) {
  const replies = [
    `Vamos resolver.

Me diz onde está o problema:
1. cadastro
2. login
3. pagamento
4. área da aluna
5. aula bloqueada

Se puder, envie print para:
https://wa.me/${SUPPORT_WHATSAPP}`,

    `Entendi. Para suporte, preciso saber o ponto exato.

É problema no cadastro, login, pagamento ou liberação de aula?

Se for urgente, chama aqui com print:
https://wa.me/${SUPPORT_WHATSAPP}`
  ];

  return nextFromPath(memory, "support", replies);
}

function fallback(memory) {
  const replies = [
    `Entendi 💕

Para eu te responder melhor, me explica com um pouco mais de detalhe.

Sua dúvida é sobre curso, crescimento, conteúdo, valor ou acesso?`,

    `Boa pergunta. Quero te responder do jeito certo.

Você está falando mais sobre como crescer, como funciona o curso ou sobre o valor?`,

    `Certo, deixa eu entender melhor para não te mandar uma resposta genérica.

Você quer ajuda com perfil, conteúdo, pagamento ou acesso?`
  ];

  return nextFromPath(memory, "fallback", replies);
}

function detectIntent(msg, memory) {
  if (!msg) return "greeting";

  if (msg === "1") return "course";
  if (msg === "2") return "growth";
  if (msg === "3") return "content";
  if (msg === "4") return "payment";
  if (msg === "5") return "support";

  if (isContinue(msg) && memory.currentPath && paths[memory.currentPath]) {
    return memory.currentPath;
  }

  if (hasAny(msg, ["oi", "ola", "olá", "opa", "bom dia", "boa tarde", "boa noite", "menu", "inicio", "início"])) {
    return "greeting";
  }

  if (hasAny(msg, ["sem dinheiro", "sem grana", "sem condições", "sem condicoes", "caro", "não tenho dinheiro", "nao tenho dinheiro", "sem pix", "não consigo pagar", "nao consigo pagar"])) {
    return "money";
  }

  if (hasAny(msg, ["valor", "preço", "preco", "quanto custa", "pagamento", "pix", "cartão", "cartao", "boleto", "parcelamento"])) {
    return "payment";
  }

  if (hasAny(msg, ["reels", "stories", "story", "canva", "capcut", "ia", "conteúdo", "conteudo", "gravar", "vídeo", "video", "editar", "legenda", "roteiro"])) {
    return "content";
  }

  if (hasAny(msg, ["crescer", "seguidores", "instagram", "engajamento", "alcance", "views", "viralizar", "do zero", "zero"])) {
    return "growth";
  }

  if (hasAny(msg, ["curso", "como funciona", "explica", "saber mais", "influencer academy", "serve pra mim", "serve para mim", "módulos", "modulos", "aulas", "incluso"])) {
    return "course";
  }

  if (hasAny(msg, ["login", "senha", "cadastro", "acesso", "paguei", "não liberou", "nao liberou", "erro", "bug", "travou", "suporte", "humano", "atendente"])) {
    return "support";
  }

  if (isContinue(msg) && memory.currentPath) {
    return memory.currentPath;
  }

  return "fallback";
}

export function handleIncomingMessage(text = "", user = {}) {
  const memory = getMemory(user);
  const msg = normalizeText(text);

  remember(memory, text);

  memory.turns.push({
    role: "user",
    text: String(text || ""),
    at: new Date().toISOString()
  });

  if (memory.turns.length > 40) {
    memory.turns = memory.turns.slice(-40);
  }

  const intent = detectIntent(msg, memory);
  let reply;

  if (intent === "greeting") {
    reply = greeting(memory);
  } else if (intent === "course") {
    reply = nextFromPath(memory, "course", paths.course);
  } else if (intent === "growth") {
    reply = nextFromPath(memory, "growth", paths.growth);
  } else if (intent === "content") {
    reply = nextFromPath(memory, "content", paths.content);
  } else if (intent === "payment") {
    reply = nextFromPath(memory, "payment", paths.payment);
  } else if (intent === "money") {
    reply = moneyObjection(memory);
  } else if (intent === "support") {
    reply = supportPath(memory);
  } else {
    reply = fallback(memory);
  }

  memory.lastIntent = intent;
  memory.lastReply = reply;

  memory.turns.push({
    role: "bot",
    intent,
    text: reply,
    at: new Date().toISOString()
  });

  return {
    intent,
    reply,
    memory: {
      currentPath: memory.currentPath,
      lastIntent: memory.lastIntent,
      level: memory.known.level,
      interest: memory.known.interest,
      objection: memory.known.objection,
      pain: memory.known.pain,
      followers: memory.known.followers
    }
  };
}

export default handleIncomingMessage;


