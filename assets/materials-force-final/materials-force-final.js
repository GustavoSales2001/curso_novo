(function () {
  console.log("MATERIALS_FORCE_FINAL ativo");

  const materials = [
    {
      number: "01",
      title: "Checklist de perfil estratégico",
      desc: "Organize bio, promessa, foto, destaques, primeira impressão e pontos de confiança do seu perfil.",
      file: "assets/materiais/01_checklist_perfil_estrategico.pdf"
    },
    {
      number: "02",
      title: "Planner de conteúdo 30 dias",
      desc: "Planeje posts, stories, Reels e rotina semanal com clareza, frequência e intenção estratégica.",
      file: "assets/materiais/02_planner_conteudo_30_dias.pdf"
    },
    {
      number: "03",
      title: "Roteiro de Reels com gancho",
      desc: "Modelo com abertura forte, desenvolvimento, retenção e CTA para vídeos mais objetivos.",
      file: "assets/materiais/03_roteiro_reels_com_gancho.pdf"
    },
    {
      number: "04",
      title: "Guia Canva + CapCut",
      desc: "Fluxo prático para criar artes, editar vídeos, montar legenda visual e exportar conteúdos.",
      file: "assets/materiais/04_guia_canva_capcut.pdf"
    },
    {
      number: "05",
      title: "Prompts de IA para criadoras",
      desc: "Comandos para ideias, roteiros, legendas, planejamento, conteúdo e melhoria de posicionamento.",
      file: "assets/materiais/05_prompts_ia_para_criadoras.pdf"
    },
    {
      number: "06",
      title: "Mini media kit para parcerias",
      desc: "Estrutura profissional para apresentar seu perfil, formatos, entregáveis e diferenciais para marcas.",
      file: "assets/materiais/06_mini_midia_kit_parcerias.pdf"
    }
  ];

  function getMaterialsSection() {
    return (
      document.getElementById("materials") ||
      document.querySelector("[data-section='materials']")
    );
  }

  function renderMaterialsForce() {
    const section = getMaterialsSection();
    if (!section) return;

    const html = `
      <div class="ia-materials-force-wrap">
        <div class="ia-materials-force-hero">
          <span class="ia-materials-force-badge">Resources</span>
          <h2>Materiais premium para executar melhor.</h2>
          <p>
            Checklists, planners e guias práticos para transformar o conteúdo das aulas em ação.
            Clique em qualquer card para abrir o PDF correspondente.
          </p>
        </div>

        <div class="ia-materials-force-grid">
          ${materials.map(item => `
            <a class="ia-materials-force-card"
               href="${item.file}"
               data-pdf="${item.file}"
               target="_self"
               rel="noopener noreferrer">
              <div class="ia-materials-force-number">${item.number}</div>
              <h3>${item.title}</h3>
              <p>${item.desc}</p>
              <span class="ia-materials-force-btn">Abrir PDF →</span>
            </a>
          `).join("")}
        </div>
      </div>
    `;

    if (!section.querySelector(".ia-materials-force-card")) {
      section.innerHTML = html;
      section.dataset.forceMaterialsFinal = "1";
    }
  }

  function isMaterialsPage() {
    const params = new URLSearchParams(location.search);
    return (
      location.hash === "#materials" ||
      params.get("tab") === "materials" ||
      document.body.getAttribute("data-ia-tab") === "materials"
    );
  }

  function forceClick() {
    if (window.__materialsForceFinalClick) return;
    window.__materialsForceFinalClick = true;

    document.addEventListener("click", function (event) {
      const card = event.target.closest && event.target.closest(".ia-materials-force-card");
      if (!card) return;

      const pdf = card.dataset.pdf || card.getAttribute("href");
      if (!pdf) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      window.location.href = pdf;
    }, true);
  }

  function boot() {
    renderMaterialsForce();
    forceClick();

    let count = 0;

    const timer = setInterval(function () {
      count++;

      if (isMaterialsPage()) {
        const section = getMaterialsSection();

        if (section && !section.querySelector(".ia-materials-force-card")) {
          section.innerHTML = "";
          renderMaterialsForce();
        }
      }

      if (count > 40) {
        clearInterval(timer);
      }
    }, 250);
  }

  const observer = new MutationObserver(function () {
    if (!isMaterialsPage()) return;

    const section = getMaterialsSection();

    if (section && !section.querySelector(".ia-materials-force-card")) {
      renderMaterialsForce();
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    boot();

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  });

  window.addEventListener("hashchange", function () {
    setTimeout(renderMaterialsForce, 100);
    setTimeout(renderMaterialsForce, 500);
  });

  if (document.readyState !== "loading") {
    boot();

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }
})();
