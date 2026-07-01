(function () {
  console.log("IA_AREA_V7 ativo");

  const MODULE4_UNLOCK_DATE = new Date("2026-07-10T00:00:00-03:00");

  const tabs = ["home", "modules", "classes", "materials", "profile"];

  const routes = [
    { tab: "home", labels: ["inicio", "início", "home"] },
    { tab: "modules", labels: ["modulos", "módulos", "modules"] },
    { tab: "classes", labels: ["aulas", "classes"] },
    { tab: "materials", labels: ["materiais", "materials"] },
    { tab: "profile", labels: ["perfil", "profile"] }
  ];

  const materials = [
    {
      number: "01",
      title: "Checklist de perfil estratégico",
      desc: "Organize sua bio, promessa, posicionamento, destaques e primeiros pontos de confiança antes de atrair novas pessoas.",
      file: "assets/materiais/01_checklist_perfil_estrategico.pdf"
    },
    {
      number: "02",
      title: "Planner de conteúdo 30 dias",
      desc: "Planeje uma rotina de posts com intenção, alternando conteúdo de autoridade, conexão, prova social e venda.",
      file: "assets/materiais/02_planner_conteudo_30_dias.pdf"
    },
    {
      number: "03",
      title: "Roteiro de reels com gancho",
      desc: "Use estruturas prontas de abertura, desenvolvimento e CTA para criar vídeos mais claros e com retenção.",
      file: "assets/materiais/03_roteiro_reels_com_gancho.pdf"
    },
    {
      number: "04",
      title: "Guia Canva + CapCut",
      desc: "Monte um fluxo simples para transformar ideias em artes, vídeos curtos, legendas visuais e conteúdos mais profissionais.",
      file: "assets/materiais/04_guia_canva_capcut.pdf"
    },
    {
      number: "05",
      title: "Prompts de IA para criadoras",
      desc: "Prompts para ideias de posts, roteiros, legendas, calendário editorial, bio, oferta e organização da rotina criativa.",
      file: "assets/materiais/05_prompts_ia_para_criadoras.pdf"
    },
    {
      number: "06",
      title: "Mini media kit para parcerias",
      desc: "Estruture sua apresentação para marcas com posicionamento, entregáveis, formatos, diferenciais e informações comerciais.",
      file: "assets/materiais/06_mini_midia_kit_parcerias.pdf"
    }
  ];

  function norm(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function getTab() {
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get("tab");
    const fromHash = String(location.hash || "").replace("#", "");
    const chosen = fromHash || fromQuery || sessionStorage.getItem("ia_last_tab") || "home";

    return tabs.includes(chosen) ? chosen : "home";
  }

  function section(tab) {
    return document.getElementById(tab) || document.querySelector(`[data-section="${tab}"]`);
  }

  function showTab(tab) {
    if (!tabs.includes(tab)) tab = "home";

    document.body.setAttribute("data-ia-tab", tab);
    sessionStorage.setItem("ia_last_tab", tab);

    tabs.forEach(function (name) {
      const el = section(name);
      if (!el) return;

      if (name === tab) {
        el.hidden = false;
        el.style.display = "";
        el.classList.remove("ia-tab-hidden-v7");
        el.classList.add("ia-tab-active-v7");
      } else {
        el.hidden = true;
        el.style.display = "none";
        el.classList.remove("ia-tab-active-v7");
        el.classList.add("ia-tab-hidden-v7");
      }
    });

    if (tab === "materials") {
      renderMaterials(true);
    }

    hidePrints();
    lockModule4();

    const active = section(tab);
    if (active) {
      setTimeout(function () {
        active.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 40);
    }
  }

  function hardGo(tab) {
    if (!tabs.includes(tab)) tab = "home";

    sessionStorage.setItem("ia_last_tab", tab);

    location.href = "area.html?tab=" + encodeURIComponent(tab) + "&v=" + Date.now() + "#" + tab;
  }

  function routeFromText(text) {
    const t = norm(text);

    return routes.find(function (route) {
      return route.labels.some(function (label) {
        const l = norm(label);
        return t === l || t.includes(l);
      });
    });
  }

  function isMenuElement(el) {
    let node = el;

    for (let i = 0; i < 8 && node; i++) {
      const tag = String(node.tagName || "").toLowerCase();
      const cls = String(node.className || "").toLowerCase();
      const rect = node.getBoundingClientRect && node.getBoundingClientRect();

      if (tag === "aside" || tag === "nav") return true;
      if (cls.includes("sidebar") || cls.includes("side") || cls.includes("menu")) return true;
      if (rect && rect.left < 460 && rect.width < 520) return true;

      node = node.parentElement;
    }

    return false;
  }

  function findRouteFromClick(target) {
    let node = target;

    for (let i = 0; i < 9 && node; i++) {
      const href = node.getAttribute && node.getAttribute("href");

      if (href && href.startsWith("#")) {
        const tab = href.replace("#", "");
        if (tabs.includes(tab)) return { tab };
      }

      const text = node.innerText || node.textContent || "";
      const route = routeFromText(text);

      if (route && isMenuElement(node)) return route;

      node = node.parentElement;
    }

    return null;
  }

  function bindMenu() {
    if (window.__iaAreaV7MenuBound) return;
    window.__iaAreaV7MenuBound = true;

    document.addEventListener("click", function (event) {
      const materialLink = event.target.closest && event.target.closest(".ia-material-card-v7");
      if (materialLink) return;

      const route = findRouteFromClick(event.target);
      if (!route) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      hardGo(route.tab);
    }, true);
  }

  function renderMaterials(force) {
    const target = section("materials");
    if (!target) return;

    const alreadyV7 = target.dataset.iaMaterialsV7 === "1" && target.querySelector(".ia-material-card-v7");

    if (alreadyV7 && !force) return;

    target.dataset.iaMaterialsV7 = "1";

    target.innerHTML = `
      <div class="ia-materials-premium-v7">
        <div class="ia-materials-premium-hero-v7">
          <span class="ia-materials-premium-badge-v7">Resources</span>
          <h2>Materiais premium para executar melhor.</h2>
          <p>
            Checklists, planners e guias práticos para transformar o conteúdo das aulas em ação.
            Clique em qualquer card para abrir o PDF correspondente.
          </p>
        </div>

        <div class="ia-material-grid-v7">
          ${materials.map(function (item) {
            return `
              <a class="ia-material-card-v7" href="${item.file}" target="_blank" rel="noopener noreferrer">
                <div class="ia-material-number-v7">${item.number}</div>
                <h3>${item.title}</h3>
                <p>${item.desc}</p>
                <span class="ia-material-btn-v7">Abrir PDF →</span>
              </a>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function bindMaterialsClick() {
    if (window.__iaAreaV7MaterialsBound) return;
    window.__iaAreaV7MaterialsBound = true;

    document.addEventListener("click", function (event) {
      const card = event.target.closest && event.target.closest(".ia-material-card-v7");
      if (!card) return;

      const href = card.getAttribute("href");
      if (!href) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      window.location.href = href;
    }, true);
  }

  function hidePrints() {
    document.querySelectorAll("a, button, div, span, li").forEach(function (el) {
      const text = norm(el.innerText || el.textContent);
      const href = el.getAttribute ? String(el.getAttribute("href") || "") : "";

      if (text !== "prints" && text !== "capturas" && !href.includes("#tools")) return;

      let target = el.closest("a, button, li") || el;

      for (let i = 0; i < 4; i++) {
        const parent = target.parentElement;
        if (!parent) break;

        const r = parent.getBoundingClientRect();

        if (r.left < 460 && r.width >= 70 && r.width <= 520 && r.height >= 30 && r.height <= 180) {
          target = parent;
        }
      }

      target.classList.add("ia-hide-prints-v7");
      target.style.display = "none";
    });

    const tools = document.querySelector("#tools, section#tools, [data-section='tools']");
    if (tools) tools.style.display = "none";
  }

  function toast(title, message) {
    document.querySelectorAll(".ia-toast-v7").forEach(el => el.remove());

    const box = document.createElement("div");
    box.className = "ia-toast-v7";
    box.innerHTML = `<strong>${title}</strong><p>${message}</p>`;
    document.body.appendChild(box);

    setTimeout(function () {
      box.remove();
    }, 3500);
  }

  function module4Locked() {
    return new Date() < MODULE4_UNLOCK_DATE;
  }

  function lessonNumber(text) {
    const match = String(text || "").match(/aula\s*0?(\d{1,2})/i);
    if (!match) return null;

    const n = Number(match[1]);
    return Number.isFinite(n) ? n : null;
  }

  function lockModule4() {
    if (!module4Locked()) return;

    const areas = [section("modules"), section("classes")].filter(Boolean);

    areas.forEach(function (area) {
      area.querySelectorAll("article, section, div, a, button").forEach(function (card) {
        const raw = card.innerText || card.textContent || "";
        const text = norm(raw);
        const rect = card.getBoundingClientRect();

        if (rect.width < 130 || rect.height < 55 || rect.width > 850 || rect.height > 480) return;

        const n = lessonNumber(raw);

        const isModule4 =
          text.includes("modulo 4") ||
          text.includes("módulo 4") ||
          text.includes("crescimento e profissionalizacao") ||
          text.includes("crescimento e profissionalização") ||
          (n && n >= 13);

        if (!isModule4) return;

        card.classList.add("ia-module4-locked-v7");

        if (card.dataset.iaModule4V7Bound === "1") return;
        card.dataset.iaModule4V7Bound = "1";

        card.addEventListener("click", function (event) {
          if (!module4Locked()) return;

          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          toast("Módulo 4 bloqueado", "Essa etapa será liberada automaticamente em 10/07/2026.");
        }, true);
      });
    });
  }

  function boot() {
    bindMenu();
    bindMaterialsClick();

    const tab = getTab();

    showTab(tab);

    setTimeout(function () { showTab(getTab()); }, 250);
    setTimeout(function () { showTab(getTab()); }, 900);
    setTimeout(function () { showTab(getTab()); }, 1800);
  }

  document.addEventListener("DOMContentLoaded", boot);

  if (document.readyState !== "loading") {
    boot();
  }

  const observer = new MutationObserver(function () {
    const current = getTab();

    if (current === "materials") {
      renderMaterials(false);
    }

    hidePrints();
    lockModule4();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
