(function () {
  const PROGRESS_KEY = "influencer_academy_completed_lessons_v1";
  const LANG_KEY = "influencer_academy_lang_v1";
  const TOTAL_CLASSES = 16;

  const icons = {
    "Início": `<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h14v-9.5"/><path d="M9 20v-6h6v6"/></svg>`,
    "Módulos": `<svg viewBox="0 0 24 24"><path d="M5 5h14v4H5z"/><path d="M5 10h14v4H5z"/><path d="M5 15h14v4H5z"/><path d="M8 7h.01"/><path d="M8 12h.01"/><path d="M8 17h.01"/></svg>`,
    "Prints": `<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="m8 14 2.2-2.2 2.3 2.3 2.5-3.1L19 16"/><circle cx="9" cy="9" r="1"/></svg>`,
    "Aulas": `<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/></svg>`,
    "Materiais": `<svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v5h5"/><path d="M10 13h7"/><path d="M10 17h7"/></svg>`,
    "Perfil": `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.8-4 5-6 8-6s6.2 2 8 6"/></svg>`
  };

  const navKeys = {
    "Início": "Início",
    "Módulos": "Módulos",
    "Prints": "Prints",
    "Aulas": "Aulas",
    "Materiais": "Materiais",
    "Perfil": "Perfil"
  };

  const dict = {
    "Início": { en: "Home", es: "Inicio" },
    "Módulos": { en: "Modules", es: "Módulos" },
    "Prints": { en: "Prints", es: "Capturas" },
    "Aulas": { en: "Classes", es: "Clases" },
    "Materiais": { en: "Materials", es: "Materiales" },
    "Perfil": { en: "Profile", es: "Perfil" },

    "Sua jornada para crescer como criadora estratégica começa agora.": {
      en: "Your journey to grow as a strategic creator starts now.",
      es: "Tu camino para crecer como creadora estratégica empieza ahora."
    },
    "Uma trilha enxuta, profissional e prática para aprender a se posicionar, criar conteúdo, produzir com celular e crescer com mais clareza.": {
      en: "A lean, professional and practical path to learn positioning, content creation, mobile production and clearer growth.",
      es: "Una ruta objetiva, profesional y práctica para aprender posicionamiento, creación de contenido, producción con celular y crecimiento con más claridad."
    },
    "Começar minha trilha": {
      en: "Start my path",
      es: "Empezar mi ruta"
    },
    "Seu progresso": {
      en: "Your progress",
      es: "Tu progreso"
    },
    "Cada aula concluída atualiza sua evolução dentro da trilha.": {
      en: "Each completed class updates your progress inside the path.",
      es: "Cada clase completada actualiza tu evolución dentro de la ruta."
    },

    "16 aulas organizadas por fase.": {
      en: "16 classes organized by stage.",
      es: "16 clases organizadas por etapa."
    },
    "Do posicionamento até crescimento, rotina, IA e monetização.": {
      en: "From positioning to growth, routine, AI and monetization.",
      es: "Desde posicionamiento hasta crecimiento, rutina, IA y monetización."
    },

    "Entendendo sua fase atual": {
      en: "Understanding your current stage",
      es: "Entendiendo tu etapa actual"
    },
    "Nicho, público e posicionamento": {
      en: "Niche, audience and positioning",
      es: "Nicho, público y posicionamiento"
    },
    "Bio, perfil e primeira impressão": {
      en: "Bio, profile and first impression",
      es: "Biografía, perfil y primera impresión"
    },
    "Identidade visual simples": {
      en: "Simple visual identity",
      es: "Identidad visual simple"
    },
    "Pilares de conteúdo": {
      en: "Content pillars",
      es: "Pilares de contenido"
    },
    "Ideias de posts e stories": {
      en: "Post and story ideas",
      es: "Ideas de posts y stories"
    },
    "Reels com gancho": {
      en: "Reels with strong hooks",
      es: "Reels con gancho"
    },
    "Conteúdo que gera conexão": {
      en: "Content that builds connection",
      es: "Contenido que genera conexión"
    },
    "Como gravar melhor": {
      en: "How to record better",
      es: "Cómo grabar mejor"
    },
    "Iluminação, cenário e áudio": {
      en: "Lighting, setting and audio",
      es: "Iluminación, escenario y audio"
    },
    "Edição simples no CapCut": {
      en: "Simple editing in CapCut",
      es: "Edición simple en CapCut"
    },
    "Rotina de gravação": {
      en: "Recording routine",
      es: "Rutina de grabación"
    },
    "IA para ideias e roteiros": {
      en: "AI for ideas and scripts",
      es: "IA para ideas y guiones"
    },
    "Métricas e crescimento": {
      en: "Metrics and growth",
      es: "Métricas y crecimiento"
    },
    "Mídia kit e parcerias": {
      en: "Media kit and partnerships",
      es: "Media kit y alianzas"
    },
    "Monetização e próximos passos": {
      en: "Monetization and next steps",
      es: "Monetización y próximos pasos"
    },

    "Começando do zero": {
      en: "Starting from zero",
      es: "Empezando desde cero"
    },
    "Conteúdo que atrai seguidores": {
      en: "Content that attracts followers",
      es: "Contenido que atrae seguidores"
    },
    "Produção e edição": {
      en: "Production and editing",
      es: "Producción y edición"
    },
    "Crescimento e monetização": {
      en: "Growth and monetization",
      es: "Crecimiento y monetización"
    },

    "Módulo 1: Começando do zero": {
      en: "Module 1: Starting from zero",
      es: "Módulo 1: Empezando desde cero"
    },
    "Módulo 2: Conteúdo que atrai seguidores": {
      en: "Module 2: Content that attracts followers",
      es: "Módulo 2: Contenido que atrae seguidores"
    },
    "Módulo 3: Produção e edição": {
      en: "Module 3: Production and editing",
      es: "Módulo 3: Producción y edición"
    },
    "Módulo 4: Crescimento e monetização": {
      en: "Module 4: Growth and monetization",
      es: "Módulo 4: Crecimiento y monetización"
    },

    "Bloqueada": { en: "Locked", es: "Bloqueada" },
    "Liberada": { en: "Unlocked", es: "Liberada" },
    "Concluída": { en: "Completed", es: "Completada" },
    "Aula concluída": { en: "Class completed", es: "Clase completada" },
    "Finalizar aula": { en: "Finish class", es: "Finalizar clase" },
    "Ir para próxima aula": { en: "Go to next class", es: "Ir a la próxima clase" },
    "Voltar para aulas": { en: "Back to classes", es: "Volver a clases" },

    "Resumo": { en: "Summary", es: "Resumen" },
    "Como estudar": { en: "How to study", es: "Cómo estudiar" },
    "Foco": { en: "Focus", es: "Enfoque" },
    "Prints explicativos desta aula": {
      en: "Explanatory prints for this class",
      es: "Capturas explicativas de esta clase"
    },
    "Use estes 4 prints para estudar a aula com exemplos visuais: Instagram, Canva, CapCut e IA.": {
      en: "Use these 4 prints to study the class with visual examples: Instagram, Canva, CapCut and AI.",
      es: "Usa estas 4 capturas para estudiar la clase con ejemplos visuales: Instagram, Canva, CapCut e IA."
    },
    "Baixar imagem": { en: "Download image", es: "Descargar imagen" },
    "Baixar todos os prints": { en: "Download all prints", es: "Descargar todas las capturas" },
    "Fechar": { en: "Close", es: "Cerrar" },
    "Ver em alta": { en: "View in high quality", es: "Ver en alta calidad" }
  };

  const textMemory = new WeakMap();

  function normalizeText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function getLang() {
    return localStorage.getItem(LANG_KEY) || "pt";
  }

  function setLang(lang) {
    localStorage.setItem(LANG_KEY, lang);
    applyLanguage();
  }

  function translateTextNode(node, lang) {
    if (!textMemory.has(node)) {
      textMemory.set(node, node.nodeValue);
    }

    const original = textMemory.get(node);
    const trimmed = normalizeText(original);

    if (!trimmed) return;

    const entry = dict[trimmed];

    if (!entry) {
      if (lang === "pt") node.nodeValue = original;
      return;
    }

    if (lang === "pt") {
      node.nodeValue = original;
      return;
    }

    const translated = entry[lang];
    if (!translated) return;

    const leading = original.match(/^\s*/)?.[0] || "";
    const trailing = original.match(/\s*$/)?.[0] || "";
    node.nodeValue = leading + translated + trailing;
  }

  function walkTextNodes(root, lang) {
    const blocked = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT"]);

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (blocked.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
          if (parent.closest("[data-no-translate]")) return NodeFilter.FILTER_REJECT;
          if (!normalizeText(node.nodeValue)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => translateTextNode(node, lang));
  }

  function updateLanguageButtons(lang) {
    const buttons = Array.from(document.querySelectorAll("button, a, div, span"));

    buttons.forEach(el => {
      const txt = normalizeText(el.innerText || el.textContent);
      if (!["PT", "EN", "ES"].includes(txt)) return;

      el.classList.toggle("ia-lang-active", txt.toLowerCase() === lang);

      if (!el.dataset.iaLangBound) {
        el.dataset.iaLangBound = "1";
        el.style.cursor = "pointer";
        el.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          setLang(txt.toLowerCase());
        }, true);
      }
    });
  }

  function applyLanguage() {
    const lang = getLang();
    document.documentElement.lang = lang === "pt" ? "pt-BR" : lang;

    document.body.classList.add("ia-lang-switching");
    walkTextNodes(document.body, lang);
    updateLanguageButtons(lang);

    setTimeout(() => document.body.classList.remove("ia-lang-switching"), 340);
  }

  function cleanLabel(text) {
    return normalizeText(text)
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
      .trim();
  }

  function polishSidebar() {
    const labels = Object.keys(icons);
    const candidates = Array.from(document.querySelectorAll("a, button, div"));

    candidates.forEach(el => {
      const text = cleanLabel(el.innerText || el.textContent);
      if (!labels.includes(text)) return;

      const rect = el.getBoundingClientRect();
      if (rect.width < 100 || rect.width > 320 || rect.height < 35 || rect.height > 90) return;

      if (el.dataset.iaPolished) return;
      el.dataset.iaPolished = "1";

      el.classList.add("ia-nav-polished");
      el.innerHTML = `
        <span class="ia-nav-icon">${icons[text]}</span>
        <span class="ia-nav-text">${text}</span>
      `;

      el.addEventListener("mousemove", function (event) {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--x", `${event.clientX - r.left}px`);
        el.style.setProperty("--y", `${event.clientY - r.top}px`);
      });
    });
  }

  function addRipple() {
    document.addEventListener("click", function (event) {
      const btn = event.target.closest("button, a, .ia-nav-polished");
      if (!btn) return;

      const style = getComputedStyle(btn);
      if (style.position === "static") btn.style.position = "relative";
      btn.style.overflow = "hidden";

      const r = btn.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "ia-ripple";
      ripple.style.left = `${event.clientX - r.left}px`;
      ripple.style.top = `${event.clientY - r.top}px`;

      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }, true);
  }

  function setProgressToCurrentModule3Lesson2() {
    const params = new URLSearchParams(location.search);
    const unlockTo = Number(params.get("unlockTo") || 0);

    if (!unlockTo) return;

    const completed = [];
    for (let i = 1; i < unlockTo; i++) {
      completed.push(i);
    }

    localStorage.setItem(PROGRESS_KEY, JSON.stringify(completed));

    params.delete("unlockTo");
    const cleanUrl = location.pathname + (params.toString() ? "?" + params.toString() : "") + location.hash;
    history.replaceState({}, "", cleanUrl);
  }

  document.addEventListener("DOMContentLoaded", function () {
    setProgressToCurrentModule3Lesson2();
    polishSidebar();
    addRipple();
    applyLanguage();

    setTimeout(polishSidebar, 300);
    setTimeout(applyLanguage, 500);
  });

  window.IAAcademyLanguage = {
    pt: () => setLang("pt"),
    en: () => setLang("en"),
    es: () => setLang("es")
  };
})();


