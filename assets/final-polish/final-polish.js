(function () {
  const materials = [
    {
      n: "01",
      title: "Checklist de Perfil Estratégico",
      desc: "Diagnóstico premium para ajustar bio, nome, foto, destaques, promessa, estética e primeira impressão.",
      file: "assets/materiais/01_checklist_perfil_estrategico.pdf",
      glow: "rgba(216,135,118,.22)"
    },
    {
      n: "02",
      title: "Planner de Conteúdo 30 Dias",
      desc: "Sistema de organização para posts, stories, Reels, rotina semanal, ideias e acompanhamento de consistência.",
      file: "assets/materiais/02_planner_conteudo_30_dias.pdf",
      glow: "rgba(90,161,202,.22)"
    },
    {
      n: "03",
      title: "Roteiro de Reels com Gancho",
      desc: "Modelo para estruturar vídeos com abertura forte, retenção, desenvolvimento e chamada para ação.",
      file: "assets/materiais/03_roteiro_reels_com_gancho.pdf",
      glow: "rgba(244,112,132,.22)"
    },
    {
      n: "04",
      title: "Guia Canva + CapCut",
      desc: "Guia visual para criar artes, editar vídeos, organizar legenda, exportar e manter padrão profissional.",
      file: "assets/materiais/04_guia_canva_capcut.pdf",
      glow: "rgba(66,174,198,.22)"
    },
    {
      n: "05",
      title: "Prompts de IA para Criadoras",
      desc: "Prompts prontos para ideias, roteiros, legendas, calendário editorial, campanhas e planejamento.",
      file: "assets/materiais/05_prompts_ia_para_criadoras.pdf",
      glow: "rgba(139,101,210,.22)"
    },
    {
      n: "06",
      title: "Mini Mídia Kit para Parcerias",
      desc: "Estrutura profissional para apresentar seu perfil, seus formatos, entregas, diferenciais e proposta comercial.",
      file: "assets/materiais/06_mini_midia_kit_parcerias.pdf",
      glow: "rgba(207,159,83,.24)"
    }
  ];

  function norm(text) {
    return String(text || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function removePrintsMenu() {
    document.querySelectorAll("a, button, div, span, li").forEach(function (el) {
      const txt = norm(el.innerText || el.textContent);
      const href = el.getAttribute ? (el.getAttribute("href") || "") : "";

      const isPrints =
        txt === "prints" ||
        txt === "capturas" ||
        href === "#tools" ||
        href.includes("#tools");

      if (!isPrints) return;

      let target = el.closest("a, button, li") || el;

      for (let i = 0; i < 4; i++) {
        const parent = target.parentElement;
        if (!parent) break;

        const r = parent.getBoundingClientRect();

        if (
          r.left < 360 &&
          r.width >= 110 &&
          r.width <= 380 &&
          r.height >= 40 &&
          r.height <= 140
        ) {
          target = parent;
        }
      }

      target.classList.add("ia-force-hide-prints");
      target.style.display = "none";
    });

    const tools = document.querySelector("#tools, section#tools, [data-section='tools']");
    if (tools) tools.style.display = "none";

    if (location.hash === "#tools") {
      location.hash = "#materials";
    }
  }

  function findContentPane() {
    const candidates = Array.from(document.querySelectorAll("main, section, div"))
      .map(el => ({ el, r: el.getBoundingClientRect() }))
      .filter(item => {
        const el = item.el;
        const r = item.r;

        if (el.closest("nav, aside")) return false;
        if (r.left < 300) return false;
        if (r.width < 600) return false;
        if (r.height < 360) return false;

        return true;
      })
      .sort((a, b) => {
        const scoreA = a.r.width * a.r.height;
        const scoreB = b.r.width * b.r.height;
        return scoreB - scoreA;
      });

    return candidates[0]?.el || null;
  }

  function renderMaterials() {
    if (location.hash !== "#materials") return;

    const pane = findContentPane();
    if (!pane) return;

    pane.innerHTML = `
      <div class="ia-materials-page-final">
        <section class="ia-materials-final-hero">
          <span>Resources</span>
          <h1>Materiais premium para executar melhor.</h1>
          <p>
            Checklists, planners e guias práticos para transformar o conteúdo das aulas em ação.
            Clique em qualquer card para abrir ou baixar o PDF.
          </p>
        </section>

        <section class="ia-materials-final-grid">
          ${materials.map(item => `
            <article class="ia-material-final-card" style="--glow:${item.glow}" data-file="${item.file}">
              <div class="material-tag">Material ${item.n}</div>
              <h3>${item.title}</h3>
              <p>${item.desc}</p>
              <span class="material-action">Abrir PDF →</span>
              <span class="material-icon">↗</span>
            </article>
          `).join("")}
        </section>
      </div>
    `;

    pane.querySelectorAll(".ia-material-final-card").forEach(function (card) {
      card.addEventListener("click", function () {
        const file = card.getAttribute("data-file");
        if (file) window.open(file, "_blank");
      });
    });
  }

  function boot() {
    removePrintsMenu();

    if (location.hash === "#materials") {
      renderMaterials();
    }

    setTimeout(removePrintsMenu, 250);
    setTimeout(removePrintsMenu, 800);
  }

  document.addEventListener("DOMContentLoaded", boot);

  window.addEventListener("hashchange", function () {
    setTimeout(function () {
      removePrintsMenu();
      renderMaterials();
    }, 80);
  });
})();
