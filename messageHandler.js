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

function getMemory(user = {}) {
  const key = getUserKey(user);

  if (!memories.has(key)) {
    memories.set(key, {
      stage: "inicio",
      lastIntent: "",
      lastOffer: "",
      lastReply: "",
      lastUserText: "",
      turns: [],
      used: {},
      known: {
        name: getFirstName(user),
        interest: "",
        objection: "",
        followers: "",
        level: "",
        pain: ""
      }
    });
  }

  const memory = memories.get(key);

  if (!memory.known.name) {
    memory.known.name = getFirstName(user);
  }

  return memory;
}

function hasAny(msg, words) {
  return words.some(word => msg.includes(normalizeText(word)));
}

function pick(memory, group, list) {
  if (!memory.used[group]) memory.used[group] = [];

  let available = list
    .map((text, index) => ({ text, index }))
    .filter(item => !memory.used[group].includes(item.index));

  if (available.length === 0) {
    memory.used[group] = [];
    available = list.map((text, index) => ({ text, index }));
  }

  const selected = available[Math.floor(Math.random() * available.length)];
  memory.used[group].push(selected.index);
  memory.lastReply = selected.text;

  return selected.text;
}

function namePrefix(memory) {
  return memory.known.name ? `${memory.known.name}, ` : "";
}

function remember(memory, text) {
  const msg = normalizeText(text);

  memory.lastUserText = text;

  if (hasAny(msg, ["zero", "iniciante", "comecando", "começando", "nunca postei", "poucos seguidores"])) {
    memory.known.level = "iniciante";
  }

  if (hasAny(msg, ["ja posto", "já posto", "posto mas", "nao cresco", "não cresço", "travada", "perdida"])) {
    memory.known.level = "ja posta";
    memory.known.pain = "posta mas não cresce";
  }

  if (hasAny(msg, ["sem dinheiro", "sem grana", "sem condicoes", "sem condições", "nao tenho dinheiro", "não tenho dinheiro", "caro"])) {
    memory.known.objection = "dinheiro";
  }

  if (hasAny(msg, ["sem tempo", "correria", "trabalho muito", "nao tenho tempo", "não tenho tempo"])) {
    memory.known.objection = "tempo";
  }

  if (hasAny(msg, ["vergonha", "tenho vergonha", "medo de aparecer", "nao gosto de aparecer", "não gosto de aparecer"])) {
    memory.known.objection = "vergonha";
  }

  if (hasAny(msg, ["medo", "vale a pena", "funciona", "garantia", "resultado"])) {
    memory.known.objection = "confiança";
  }

  if (hasAny(msg, ["reels", "stories", "canva", "capcut", "ia", "video", "vídeo", "gravar", "editar"])) {
    memory.known.interest = "conteudo";
  }

  if (hasAny(msg, ["crescer", "seguidores", "engajamento", "alcance", "views", "instagram"])) {
    memory.known.interest = "crescimento";
  }

  const followersMatch = msg.match(/(\d{2,6})\s*(seguidores|seguidor)/);
  if (followersMatch) {
    memory.known.followers = followersMatch[1];
  }
}

function isYes(msg) {
  return hasAny(msg, [
    "sim", "quero", "pode", "me explica", "me explique", "explica",
    "manda", "me manda", "claro", "bora", "vamos", "prosseguir",
    "continuar", "continua", "ok", "ta", "tá", "pode ser"
  ]);
}

function greeting(memory) {
  memory.stage = "inicio";
  memory.lastIntent = "greeting";

  return pick(memory, "greeting", [
    `${namePrefix(memory)}oii! 💕 Tudo bem?

Antes de te mandar qualquer coisa, me conta: você está começando do zero ou já posta e sente que não cresce?

Pode responder:
1. Quero entender o curso
2. Quero crescer
3. Quero melhorar meus conteúdos
4. Quero saber o valor`,

    `${namePrefix(memory)}oi, tudo bem? ✨ Seja bem-vinda à Influencer Academy.

Me diz o que você quer resolver primeiro:

1. Entender como funciona o curso
2. Crescer no Instagram
3. Melhorar Reels, stories, Canva, CapCut e IA
4. Ver valor e pagamento`,

    `${namePrefix(memory)}oii 💕 Que bom te ver por aqui.

Vou te ajudar sem enrolação. Sua dúvida é mais sobre o curso, crescimento, conteúdo ou valor?

1. Curso
2. Crescimento
3. Conteúdo
4. Valor`,

    `${namePrefix(memory)}oi! ✨ Me conta uma coisa: hoje você sente que falta mais direção, ideias de conteúdo ou segurança para aparecer?

1. Quero entender o curso
2. Quero crescer
3. Quero melhorar meus conteúdos
4. Quero saber o valor`,

    `${namePrefix(memory)}oii, tudo certo? 💕

A Influencer Academy é para quem quer crescer como criadora de conteúdo com mais estratégia.

Por onde você quer começar?
1. Curso
2. Crescimento
3. Conteúdo
4. Valor`
  ]);
}

function coursePath(memory) {
  memory.stage = "curso";
  memory.lastIntent = "course";
  memory.lastOffer = "course";

  return pick(memory, "course", [
    `A Influencer Academy é uma trilha prática para quem quer crescer como criadora de conteúdo com mais clareza, estética e estratégia.

Ela te guia por etapas:
1. posicionamento e nicho
2. bio e primeira impressão
3. ideias de conteúdo
4. Reels e stories
5. Canva, CapCut e IA
6. métricas e crescimento
7. parcerias e monetização

A ideia é tirar você do “posto qualquer coisa” e te colocar em um caminho mais profissional.

Quer que eu te explique por onde você começaria dentro do curso?`,

    `Funciona assim: o curso organiza o crescimento em fases.

Primeiro você arruma a base do perfil. Depois aprende a criar conteúdo com intenção. Depois começa a entender métricas, melhorar o que funciona e se preparar para oportunidades.

Não é um curso só de edição. É uma trilha de presença digital.

Você hoje está começando do zero ou já tem perfil ativo?`,

    `O curso foi pensado para quem quer deixar de postar no achismo.

Você aprende:
✨ o que postar
✨ como organizar o perfil
✨ como gravar melhor
✨ como editar no CapCut
✨ como criar no Canva
✨ como usar IA sem parecer artificial
✨ como acompanhar métricas
✨ como se posicionar para parcerias

Quer que eu te mostre o que tem nos módulos?`,

    `A Influencer Academy não é só “aprenda Instagram”. Ela junta estratégia, estética e prática.

Você aprende a transformar seu perfil em uma vitrine mais clara, com conteúdos que fazem sentido para atrair pessoas certas.

O foco é crescer com direção, não depender de sorte ou viral aleatório.

Quer que eu te explique se serve para sua fase?`,

    `O curso é como um mapa.

Você entra talvez sem saber o que postar, como gravar ou como crescer. A trilha vai te mostrando:
• como definir sua mensagem
• como montar seu perfil
• como criar ideias
• como transformar ideias em Reels
• como usar ferramentas
• como medir resultado

Me fala: sua maior dificuldade hoje é ideia, gravação ou crescimento?`,

    `Ele foi criado para quem quer virar criadora de conteúdo/influenciadora com mais profissionalismo.

Você não precisa ter muitos seguidores para começar. O ponto é aprender a construir uma base boa desde o início.

A trilha começa no posicionamento e vai até monetização e parcerias.

Quer que eu te fale o valor atual?`,

    `Pensa no curso como uma área da aluna com aulas organizadas.

Cada parte te ajuda a evoluir:
perfil primeiro, conteúdo depois, ferramentas em seguida e métricas para ajustar.

Assim você não fica pulando de dica em dica sem saber o que aplicar.

Quer que eu te explique o caminho do 0 aos primeiros seguidores?`,

    `A proposta do curso é te deixar menos dependente de “inspiração do dia”.

Você aprende a ter um processo:
planejar, gravar, editar, postar, analisar e repetir o que funciona.

Isso deixa o crescimento mais leve e menos confuso.

Você quer usar isso para crescer como influenciadora de qual nicho?`,

    `Ele é bem direto para quem quer presença digital.

Tem aulas de Instagram, Reels, stories, Canva, CapCut, IA, métricas, posicionamento e parcerias.

O diferencial é que tudo fica conectado: não adianta só editar bonito se o perfil não tem clareza.

Quer que eu te mostre o que está incluso?`,

    `O curso funciona como uma trilha de evolução.

Você começa entendendo quem você é no digital, depois aprende a aparecer melhor, criar conteúdo melhor e analisar o crescimento.

É para quem quer parar de postar no escuro.

Quer que eu te diga qual seria seu primeiro passo dentro da trilha?`
  ]);
}

function growthPath(memory) {
  memory.stage = "crescimento";
  memory.lastIntent = "growth";
  memory.lastOffer = "growth";

  return pick(memory, "growth", [
    `Para crescer no Instagram, o primeiro passo não é postar mais. É postar com direção.

Você precisa alinhar:
1. nicho claro
2. bio objetiva
3. conteúdo que prende
4. stories que conectam
5. constância possível
6. análise do que funciona

O curso te ajuda a sair do improviso e entender o que fazer em cada fase.

Você está no zero ou já posta hoje?`,

    `Crescer do zero exige uma base forte.

Antes de pensar em viralizar, seu perfil precisa responder rápido:
quem é você, o que entrega e por que alguém deveria te seguir.

Depois vem Reels, stories, frequência e métricas.

Quer que eu te passe o caminho do 0 aos 1.000 seguidores?`,

    `Muita gente não cresce porque posta sem estratégia.

O curso trabalha crescimento por etapas:
• atrair pessoas novas
• prender atenção
• gerar conexão
• transformar visitantes em seguidores
• criar rotina de conteúdo

Me diz: você sente que falta ideia ou falta coragem de aparecer?`,

    `Se você quer crescer, precisa parar de tentar agradar todo mundo.

O perfil cresce melhor quando tem clareza:
✨ para quem você fala
✨ qual transformação você entrega
✨ quais temas você repete
✨ como você aparece
✨ o que faz as pessoas voltarem

Quer que eu te ajude a entender seus pilares de conteúdo?`,

    `O caminho do crescimento começa na primeira impressão.

Se a pessoa entra no perfil e não entende nada, ela vai embora. Por isso bio, foto, nome, destaques e posts fixados são tão importantes.

Depois disso, Reels e stories ajudam a trazer alcance e conexão.

Quer que eu te explique como ajustar o perfil primeiro?`,

    `Crescer não é só número. É construir percepção.

Quando você posta com intenção, as pessoas começam a entender sua presença, confiar em você e lembrar do seu conteúdo.

A Influencer Academy ensina essa construção desde a base.

Você quer crescer para fechar parcerias ou para fortalecer sua marca pessoal?`,

    `Se o seu perfil está parado, normalmente o problema está em uma destas áreas:

1. bio confusa
2. nicho amplo demais
3. conteúdo sem gancho
4. stories sem conexão
5. pouca consistência
6. falta de análise

O curso passa por cada uma dessas partes.

Qual dessas você acha que mais pega para você hoje?`,

    `Para sair do zero, não precisa fazer mil coisas. Precisa fazer o básico bem feito.

Um plano simples:
• melhorar perfil
• criar 3 pilares
• gravar Reels curtos
• aparecer nos stories
• repetir formatos que funcionam
• analisar semanalmente

Quer que eu te mande uma rotina simples de conteúdo?`,

    `A fase inicial é sobre clareza e repetição.

Você não precisa ter o conteúdo perfeito. Precisa criar sinais claros para o algoritmo e para as pessoas entenderem seu perfil.

O curso organiza isso em aulas práticas.

Você já tem um nicho definido ou ainda está em dúvida?`,

    `Crescer fica mais fácil quando você entende que cada conteúdo tem uma função.

Alguns atraem, outros conectam, outros educam e outros vendem sua imagem.

A trilha te ensina a misturar esses formatos sem ficar perdida.

Quer que eu te explique os tipos de conteúdo que mais ajudam no começo?`
  ]);
}

function contentPath(memory) {
  memory.stage = "conteudo";
  memory.lastIntent = "content";
  memory.lastOffer = "content";

  return pick(memory, "content", [
    `Para melhorar seus conteúdos, você precisa de método, não só inspiração.

No curso você aprende:
🎥 gravar com celular
💡 iluminação simples
✂️ edição no CapCut
🎨 Canva para posts e capas
✨ IA para ideias e roteiros
📊 métricas para entender o que funcionou

Quer que eu te explique uma rotina semanal de conteúdo?`,

    `Reels, stories, Canva, CapCut e IA precisam trabalhar juntos.

Reels atraem.
Stories conectam.
Canva organiza sua estética.
CapCut melhora o ritmo.
IA acelera ideias e roteiros.

O curso te mostra como usar tudo isso sem parecer artificial.

Hoje você trava mais para gravar ou para ter ideias?`,

    `Conteúdo bom tem estrutura.

Um Reel precisa:
1. gancho forte
2. promessa clara
3. desenvolvimento rápido
4. cortes sem enrolação
5. legenda estratégica
6. CTA natural

Nos stories, o foco é conexão e bastidor.

Quer que eu te mande um exemplo de estrutura de Reel?`,

    `Se seus vídeos não prendem atenção, pode ser por 3 motivos:

• começa devagar
• não tem promessa clara
• demora para chegar no ponto

No curso você aprende a construir conteúdo com gancho e retenção.

Quer que eu te explique como seria um gancho bom?`,

    `Canva ajuda na estética, mas estética sozinha não sustenta crescimento.

Você precisa unir:
✨ identidade visual
✨ mensagem clara
✨ frequência
✨ conteúdo com intenção

A Influencer Academy ensina Canva dentro da estratégia, não só “design bonito”.

Quer que eu te explique como organizar uma identidade simples?`,

    `CapCut entra para deixar o conteúdo mais dinâmico.

Você aprende sobre corte, ritmo, legenda, zoom, áudio e finalização.

Mas antes da edição, vem o roteiro. Se o roteiro é fraco, a edição não salva.

Quer que eu te passe uma estrutura simples de roteiro?`,

    `IA pode te ajudar muito, principalmente se você sente falta de ideias.

Você pode usar IA para:
• criar pautas
• gerar ganchos
• transformar ideia em roteiro
• criar legendas
• montar calendário
• adaptar conteúdo para seu nicho

O curso mostra como usar sem ficar genérico.

Quer que eu te explique um exemplo de prompt?`,

    `Stories são uma parte muito importante.

Eles criam proximidade. Não precisam ser perfeitos, precisam ser reais e intencionais.

Você pode usar:
• bastidor
• rotina
• enquete
• caixinha
• prova social
• indicação
• CTA leve

Quer que eu te mande uma sequência simples de stories?`,

    `Se você quer melhorar vídeos, comece pelo básico:

1. luz de frente
2. celular limpo
3. áudio próximo
4. cenário organizado
5. frase inicial forte
6. cortes curtos
7. legenda legível

O curso aprofunda isso de forma prática.

Você grava mais falando para câmera ou mostrando bastidores?`,

    `O conteúdo que cresce costuma ter uma função clara.

Pode ser para:
• atrair
• ensinar
• conectar
• gerar desejo
• vender sua imagem
• criar autoridade

Quando você entende isso, para de postar aleatoriamente.

Quer que eu te explique os pilares de conteúdo?`
  ]);
}

function pricePath(memory) {
  memory.stage = "pagamento";
  memory.lastIntent = "payment";
  memory.lastOffer = "payment";

  return pick(memory, "payment", [
    `A condição atual está especial:

De ${OLD_PRICE}
Por ${COURSE_PRICE}

É pagamento único.

Link:
${COURSE_LINK}

Antes de decidir, quer que eu te explique tudo que está incluso?`,

    `Hoje o curso está por ${COURSE_PRICE}, pagamento único.

O valor anterior era ${OLD_PRICE}.

Você acessa a página, faz o pagamento e segue para sua área da aluna.

Link:
${COURSE_LINK}

Quer que eu te diga para quem esse curso é mais indicado?`,

    `O investimento atual é ${COURSE_PRICE}.

Ele inclui a trilha da Influencer Academy com aulas sobre Instagram, Reels, stories, Canva, CapCut, IA, métricas, posicionamento e parcerias.

Link:
${COURSE_LINK}

Se sua dúvida for se vale a pena para sua fase, eu posso te ajudar a decidir.`,

    `O valor promocional é ${COURSE_PRICE}.

É um pagamento único para acessar a trilha.

Eu recomendo entrar se você quer realmente aplicar no seu perfil, porque o curso é prático.

Link:
${COURSE_LINK}

Quer saber por qual módulo começar?`,

    `Atualmente está assim:

${OLD_PRICE} → ${COURSE_PRICE}

A proposta é ser acessível para quem está começando e quer organizar melhor sua presença digital.

Link:
${COURSE_LINK}

Se agora não for o momento financeiro, tudo bem. Posso te passar um primeiro passo gratuito também.`,

    `O curso está com oferta de lançamento por ${COURSE_PRICE}.

Você não paga mensalidade. É acesso ao curso/área da aluna.

Link:
${COURSE_LINK}

Quer que eu explique como funciona depois do pagamento?`,

    `O valor hoje é ${COURSE_PRICE}.

O que você recebe não é só uma aula solta, e sim uma trilha organizada para crescer como criadora.

Link:
${COURSE_LINK}

Quer que eu te mostre a estrutura dos módulos?`,

    `A condição atual é de ${OLD_PRICE} por ${COURSE_PRICE}.

O pagamento é único e o foco é te dar direção para aplicar no perfil.

Link:
${COURSE_LINK}

Você está pensando em comprar agora ou ainda quer entender melhor?`,

    `O acesso está por ${COURSE_PRICE}.

Se você comparar com o tempo que se perde tentando descobrir tudo sozinha, a ideia é facilitar seu caminho e organizar o processo.

Link:
${COURSE_LINK}

Quer que eu te explique se serve para iniciante?`,

    `Valor atual: ${COURSE_PRICE}.

Curso indicado para quem quer crescer, melhorar conteúdo, organizar perfil e aprender ferramentas como Canva, CapCut e IA.

Link:
${COURSE_LINK}

Quer que eu te mande um resumo rápido do que você aprende?`
  ]);
}

function continueLastPath(memory) {
  if (memory.lastOffer === "course" || memory.lastIntent === "course") {
    return pick(memory, "course_continue", [
      `Claro. Dentro do curso, eu começaria por posicionamento.

Antes de gravar mais, você precisa entender:
• quem você quer atrair
• qual mensagem quer passar
• quais temas vão sustentar seu perfil
• como transformar isso em conteúdo

Depois disso, Reels e ferramentas ficam muito mais fáceis.`,

      `Vou te explicar a trilha de forma simples:

Primeiro: clareza do perfil.
Segundo: conteúdo com intenção.
Terceiro: ferramentas para produzir melhor.
Quarto: métricas para ajustar.
Quinto: monetização e parcerias.

Assim você não pula etapas.`
    ]);
  }

  if (memory.lastOffer === "growth" || memory.lastIntent === "growth") {
    return pick(memory, "growth_continue", [
      `Para crescer do zero, faça assim:

1. ajuste sua bio
2. escolha 3 pilares de conteúdo
3. poste Reels curtos com gancho
4. apareça nos stories
5. observe o que gera resposta
6. repita o que funcionou

O curso aprofunda cada etapa com mais direção.`,

      `Um caminho bem prático seria:

Semana 1: arrumar perfil.
Semana 2: testar Reels simples.
Semana 3: criar rotina de stories.
Semana 4: analisar métricas e repetir formatos.

Isso já tira você do escuro.`
    ]);
  }

  if (memory.lastOffer === "content" || memory.lastIntent === "content") {
    return pick(memory, "content_continue", [
      `Uma rotina semanal simples seria:

Segunda: escolher 3 ideias.
Terça: gravar tudo em bloco.
Quarta: editar no CapCut.
Quinta: criar capa ou apoio no Canva.
Sexta: postar e responder comentários.
Fim de semana: olhar métricas e salvar ideias novas.

Isso deixa a produção mais leve.`,

      `Exemplo de estrutura de Reel:

1. “Você está errando nisso no seu perfil...”
2. explique o erro
3. mostre o jeito certo
4. finalize com CTA: “salva para revisar depois”

Simples, direto e com intenção.`
    ]);
  }

  if (memory.lastOffer === "payment" || memory.lastIntent === "payment") {
    return pick(memory, "payment_continue", [
      `Depois do pagamento, você acessa a área da aluna e acompanha os módulos.

O ideal é não começar pelo meio. Comece pelo perfil e posicionamento, porque isso sustenta o crescimento depois.`,

      `Está incluso o acesso à trilha com módulos e conteúdos práticos.

A ideia é você estudar e aplicar no seu perfil aos poucos, sem precisar fazer tudo em um dia.`
    ]);
  }

  return coursePath(memory);
}

function moneyObjection(memory) {
  memory.stage = "objection_money";
  memory.lastIntent = "money";
  memory.known.objection = "dinheiro";

  return pick(memory, "money", [
    `Eu te entendo de verdade 💕 Não se aperta por causa disso.

Se agora não é o momento, começa por aqui:
1. ajuste sua bio
2. escolha 3 temas principais
3. poste 3 Reels simples por semana
4. use stories para criar conexão

Quando fizer sentido, o curso está por ${COURSE_PRICE}:
${COURSE_LINK}`,

    `Super entendo. Às vezes a vontade existe, mas o financeiro aperta.

Não vou te pressionar. O que eu recomendo é você começar pelo gratuito: organize seu perfil e poste com mais intenção.

Quando puder investir, o curso te ajuda a acelerar esse caminho.

Quer que eu te ajude com uma ideia de primeiro conteúdo?`,

    `Obrigada por falar com sinceridade 💕

Mesmo sem comprar agora, não para. Seu primeiro passo pode ser revisar sua bio e deixar claro o que você entrega.

Quando você conseguir, o acesso está por ${COURSE_PRICE}:
${COURSE_LINK}

Quer que eu te passe uma tarefa prática para hoje?`
  ]);
}

function timeObjection(memory) {
  memory.stage = "objection_time";
  memory.lastIntent = "time";

  return pick(memory, "time", [
    `Se o problema é tempo, o caminho não é postar mais. É postar melhor.

Uma rotina possível:
• 1 dia para planejar
• 1 dia para gravar
• 1 dia para editar
• stories simples durante a semana

O curso te ajuda justamente a criar esse processo.`,

    `Te entendo. Conteúdo não pode virar um peso.

Por isso a ideia é ter método: gravar em bloco, editar com modelo e reaproveitar ideias.

Você não precisa viver para o Instagram. Precisa ter uma rotina possível.`
  ]);
}

function shameObjection(memory) {
  memory.stage = "objection_shame";
  memory.lastIntent = "shame";

  return pick(memory, "shame", [
    `Ter vergonha de aparecer é muito mais comum do que parece.

Você pode começar sem falar direto para câmera:
• bastidores
• mãos fazendo algo
• tela do celular
• rotina
• narração
• texto na tela

Depois, aos poucos, você vai aparecendo mais.

Quer que eu te mande ideias de Reels sem precisar mostrar o rosto?`,

    `Não precisa começar se expondo de uma vez.

O curso pode te ajudar a construir presença de forma gradual: primeiro com conteúdo de apoio, depois narração, depois stories simples e só depois câmera falando.

O importante é começar com segurança.`
  ]);
}

function trustObjection(memory) {
  memory.stage = "objection_trust";
  memory.lastIntent = "trust";

  return pick(memory, "trust", [
    `Sua dúvida é justa. Nenhum curso sério deve prometer milagre.

O que a Influencer Academy entrega é método:
✨ clareza de perfil
✨ estratégia de conteúdo
✨ ferramentas práticas
✨ rotina
✨ análise de métricas

Resultado vem de aplicar, testar e ajustar.`,

    `Eu prefiro ser bem transparente: o curso não é fórmula mágica.

Ele serve para organizar seu caminho e parar de depender de achismo.

Se você aplicar, consegue entender melhor o que postar, como aparecer e como melhorar seu perfil.`
  ]);
}

function included(memory) {
  memory.stage = "included";
  memory.lastIntent = "included";

  return pick(memory, "included", [
    `Está incluso:

1. Posicionamento e nicho
2. Bio e primeira impressão
3. Ideias e pilares
4. Reels com gancho
5. Stories para conexão
6. Canva
7. CapCut
8. IA
9. Métricas
10. Monetização e parcerias

Quer que eu te explique qual módulo combina mais com sua fase?`,

    `Você aprende a construir presença digital de forma mais completa: perfil, conteúdo, ferramentas, métricas e parcerias.

Não é só edição, nem só Instagram. É a estrutura para crescer com mais direção.`
  ]);
}

function support(memory) {
  memory.stage = "support";
  memory.lastIntent = "support";

  return pick(memory, "support", [
    `Vamos resolver.

Me diz onde está o problema:
1. cadastro
2. login
3. pagamento
4. área da aluna
5. aula bloqueada

Se puder, envie print para o suporte:
https://wa.me/${SUPPORT_WHATSAPP}`,

    `Entendi. Para suporte, preciso saber o ponto exato:

• não consegue cadastrar?
• não consegue logar?
• pagou e não liberou?
• área da aluna não abre?

Se for urgente, chama aqui com print:
https://wa.me/${SUPPORT_WHATSAPP}`
  ]);
}

function buy(memory) {
  memory.stage = "buy";
  memory.lastIntent = "buy";

  return pick(memory, "buy", [
    `Perfeito 💕

Aqui está o link:
${COURSE_LINK}

Condição atual:
De ${OLD_PRICE}
Por ${COURSE_PRICE}

Depois do pagamento, você segue para acessar sua área da aluna.`,

    `Claro! O acesso é por aqui:

${COURSE_LINK}

Valor atual: ${COURSE_PRICE}

Minha sugestão: depois que entrar, comece pelo módulo de posicionamento antes de ir direto para Reels.`
  ]);
}

function thanks(memory) {
  memory.lastIntent = "thanks";

  return pick(memory, "thanks", [
    `Imagina 💕 Fico feliz em ajudar.

Quando quiser, me chama por aqui.`,
    `De nada! ✨ E lembra: começa com direção, não com perfeição.`,
    `Por nada 💕 Se surgir outra dúvida, pode mandar.`
  ]);
}

function fallback(memory) {
  memory.lastIntent = "fallback";

  return pick(memory, "fallback", [
    `Entendi 💕

Para eu te responder melhor, me explica com um pouco mais de detalhe.

Sua dúvida é mais sobre curso, crescimento, conteúdo, valor ou acesso?`,

    `Boa pergunta. Quero te responder do jeito certo.

Você está falando mais sobre como crescer, como funciona o curso ou sobre o valor?`,

    `Certo, deixa eu entender melhor para não te mandar algo genérico.

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

  if (isYes(msg)) {
    return "continue";
  }

  if (hasAny(msg, ["oi", "ola", "olá", "opa", "bom dia", "boa tarde", "boa noite", "tudo bem", "menu", "inicio", "início", "voltar"])) {
    return "greeting";
  }

  if (hasAny(msg, ["obrigada", "obrigado", "valeu", "perfeito", "show", "amei"])) {
    return "thanks";
  }

  if (hasAny(msg, ["quero comprar", "quero entrar", "manda o link", "me manda o link", "link", "acessar agora", "comprar agora"])) {
    return "buy";
  }

  if (hasAny(msg, ["sem dinheiro", "sem grana", "sem condicoes", "sem condições", "caro", "não tenho dinheiro", "nao tenho dinheiro", "não consigo pagar", "nao consigo pagar"])) {
    return "money";
  }

  if (hasAny(msg, ["sem tempo", "não tenho tempo", "nao tenho tempo", "correria", "trabalho muito"])) {
    return "time";
  }

  if (hasAny(msg, ["vergonha", "medo de aparecer", "não gosto de aparecer", "nao gosto de aparecer"])) {
    return "shame";
  }

  if (hasAny(msg, ["funciona mesmo", "vale a pena", "garantia", "resultado", "tenho medo", "medo"])) {
    return "trust";
  }

  if (hasAny(msg, ["o que tem", "incluso", "inclui", "módulos", "modulos", "aulas", "conteúdo do curso", "conteudo do curso"])) {
    return "included";
  }

  if (hasAny(msg, ["valor", "preço", "preco", "quanto custa", "pagamento", "pix", "cartão", "cartao", "boleto", "parcela"])) {
    return "payment";
  }

  if (hasAny(msg, ["reels", "stories", "story", "canva", "capcut", "ia", "conteúdo", "conteudo", "gravar", "vídeo", "video", "editar", "legenda"])) {
    return "content";
  }

  if (hasAny(msg, ["crescer", "seguidores", "instagram", "engajamento", "alcance", "views", "visualização", "visualizacao", "viralizar", "do zero", "zero"])) {
    return "growth";
  }

  if (hasAny(msg, ["curso", "como funciona", "explica", "saber mais", "influencer academy", "serve pra mim", "serve para mim"])) {
    return "course";
  }

  if (hasAny(msg, ["login", "senha", "cadastro", "acesso", "paguei", "não liberou", "nao liberou", "erro", "bug", "travou", "suporte", "humano", "atendente"])) {
    return "support";
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

  if (memory.turns.length > 30) {
    memory.turns = memory.turns.slice(-30);
  }

  const intent = detectIntent(msg, memory);

  let reply;

  if (intent === "greeting") reply = greeting(memory);
  else if (intent === "course") reply = coursePath(memory);
  else if (intent === "growth") reply = growthPath(memory);
  else if (intent === "content") reply = contentPath(memory);
  else if (intent === "payment") reply = pricePath(memory);
  else if (intent === "continue") reply = continueLastPath(memory);
  else if (intent === "money") reply = moneyObjection(memory);
  else if (intent === "time") reply = timeObjection(memory);
  else if (intent === "shame") reply = shameObjection(memory);
  else if (intent === "trust") reply = trustObjection(memory);
  else if (intent === "included") reply = included(memory);
  else if (intent === "support") reply = support(memory);
  else if (intent === "buy") reply = buy(memory);
  else if (intent === "thanks") reply = thanks(memory);
  else reply = fallback(memory);

  memory.turns.push({
    role: "bot",
    intent,
    text: reply,
    at: new Date().toISOString()
  });

  memory.lastIntent = intent === "continue" ? memory.lastIntent : intent;
  memory.lastReply = reply;

  return {
    intent,
    reply,
    memory: {
      stage: memory.stage,
      interest: memory.known.interest,
      objection: memory.known.objection,
      followers: memory.known.followers,
      level: memory.known.level,
      pain: memory.known.pain
    }
  };
}

export default handleIncomingMessage;
