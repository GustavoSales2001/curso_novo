(function () {
  const materials = [
    {
      n: "01",
      title: "Checklist de Perfil Estratégico",
      desc: "Bio, nome, destaques, promessa, estética e primeira impressão.",
      file: "assets/materiais/01_checklist_perfil_estrategico.pdf",
      glow: "rgba(216,135,118,.18)"
    },
    {
      n: "02",
      title: "Planner de Conteúdo 30 Dias",
      desc: "Organização semanal para posts, stories, Reels e rotina criativa.",
      file: "assets/materiais/02_planner_conteudo_30_dias.pdf",
      glow: "rgba(86,153,198,.18)"
    },
    {
      n: "03",
      title: "Roteiro de Reels com Gancho",
      desc: "Estrutura pronta com gancho, desenvolvimento, CTA e retenção.",
      file: "assets/materiais/03_roteiro_reels_com_gancho.pdf",
      glow: "rgba(249,112,132,.18)"
    },
    {
      n: "04",
      title: "Guia Canva + CapCut",
      desc: "Apoio prático para design, edição, legenda e exportação.",
      file: "assets/materiais/04_guia_canva_capcut.pdf",
      glow: "rgba(66,174,198,.18)"
    },
    {
      n: "05",
      title: "Prompts de IA para Criadoras",
      desc: "Comandos para ideias, roteiros, legendas e planejamento.",
      file: "assets/materiais/05_prompts_ia_para_criadoras.pdf",
      glow: "rgba(139,101,210,.18)"
    },
    {
      n: "06",
      title: "Mini Mídia Kit para Parcerias",
      desc: "Estrutura inicial para apresentar seu perfil para marcas.",
      file: "assets/materiais/06_mini_midia_kit_parcerias.pdf",
      glow: "rgba(207,159,83,.20)"
    }
  ];

  function norm(t) {
    return String(t || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function removePrintsButton() {
    document.querySelectorAll("a, button, div, span, li").forEach(function (el) {
      const t = norm(el.innerText || el.textContent);
      const href = el.getAttribute ? (el.getAttribute("href") || "") : "";

      const isPrints =
        t === "prints" ||
        t === "capturas" ||
        href === "#tools" ||
        href.includes("#tools");

      if (!isPrints) return;

      const target = el.closest("a,button,li") || el.closest("div") || el;
      const rect = target.getBoundingClientRect();

      const isMenuArea =
        rect.left < 380 &&
        rect.width >= 70 &&
        rect.width <= 360 &&
        rect.height >= 25 &&
        rect.height <= 130;

      if (isMenuArea) {
        target.classList.add("ia-hide-prints-menu");
        target.style.display = "none";
      }
    });

    document.querySelectorAll('[href="#tools"], [href*="#tools"]').forEach(function (el) {
      el.classList.add("ia-hide-prints-menu");
      el.style.display = "none";
    });

    const tools = document.querySelector("#tools, section#tools, [data-section='tools']");
    if (tools) tools.style.display = "none";

    if (location.hash === "#tools") {
      location.hash = "#materials";
    }
  }

  function findMainPane() {
    const candidates = Array.from(document.querySelectorAll("main, section, .content, .main, .page, .dashboard, div"))
      .map(el => ({ el, r: el.getBoundingClientRect() }))
      .filter(x =>
        x.r.left > 300 &&
        x.r.width > 500 &&
        x.r.height > 350 &&
        !x.el.closest(".sidebar") &&
        !x.el.closest("nav")
      )
      .sort((a, b) => (b.r.width * b.r.height) - (a.r.width * a.r.height));

    return candidates[0]?.el || null;
  }

  function renderMaterialsIfNeeded() {
    if (location.hash !== "#materials") return;

    const pane = findMainPane();
    if (!pane) return;

    if (pane.dataset.iaMaterialsRendered === "1") return;
    pane.dataset.iaMaterialsRendered = "1";

    pane.innerHTML = `
      <div class="ia-forced-materials">
        <div class="ia-materials-hero">
          <small>Resources</small>
          <h1>Materiais premium para executar melhor.</h1>
          <p>Checklists, planners e guias práticos para transformar o conteúdo das aulas em ação. Clique em qualquer card para abrir o PDF.</p>
        </div>

        <div class="ia-material-grid">
          ${materials.map(item => `
            <article class="ia-material-premium-card" style="--glow:${item.glow}" data-file="${item.file}">
              <span class="tag">Material ${item.n}</span>
              <h3>${item.title}</h3>
              <p>${item.desc}</p>
              <span class="open">Abrir PDF →</span>
            </article>
          `).join("")}
        </div>
      </div>
    `;

    pane.querySelectorAll(".ia-material-premium-card").forEach(card => {
      card.addEventListener("click", function () {
        window.open(card.dataset.file, "_blank");
      });
    });
  }

  function boot() {
    removePrintsButton();
    renderMaterialsIfNeeded();

    setTimeout(removePrintsButton, 300);
    setTimeout(removePrintsButton, 900);
    setTimeout(removePrintsButton, 1500);
    setTimeout(renderMaterialsIfNeeded, 300);
  }

  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("hashchange", function () {
    setTimeout(function () {
      removePrintsButton();
      renderMaterialsIfNeeded();
    }, 100);
  });

  const obs = new MutationObserver(function () {
    removePrintsButton();
    renderMaterialsIfNeeded();
  });

  obs.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
