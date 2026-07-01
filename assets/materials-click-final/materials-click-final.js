(function () {
  const materials = [
    {
      title: "Checklist de perfil estratégico",
      desc: "Organize bio, promessa, foto, destaques, primeira impressão e pontos de confiança do seu perfil.",
      number: "01",
      file: "assets/materiais/01_checklist_perfil_estrategico.pdf"
    },
    {
      title: "Planner de conteúdo 30 dias",
      desc: "Planeje posts, stories, Reels e rotina semanal com clareza, frequência e intenção estratégica.",
      number: "02",
      file: "assets/materiais/02_planner_conteudo_30_dias.pdf"
    },
    {
      title: "Roteiro de Reels com gancho",
      desc: "Modelo com abertura forte, desenvolvimento, retenção e CTA para vídeos mais objetivos.",
      number: "03",
      file: "assets/materiais/03_roteiro_reels_com_gancho.pdf"
    },
    {
      title: "Guia Canva + CapCut",
      desc: "Fluxo prático para criar artes, editar vídeos, montar legenda visual e exportar conteúdos.",
      number: "04",
      file: "assets/materiais/04_guia_canva_capcut.pdf"
    },
    {
      title: "Prompts de IA para criadoras",
      desc: "Comandos para ideias, roteiros, legendas, planejamento, conteúdo e melhoria de posicionamento.",
      number: "05",
      file: "assets/materiais/05_prompts_ia_para_criadoras.pdf"
    },
    {
      title: "Mini media kit para parcerias",
      desc: "Estrutura profissional para apresentar seu perfil, formatos, entregáveis e diferenciais para marcas.",
      number: "06",
      file: "assets/materiais/06_mini_midia_kit_parcerias.pdf"
    }
  ];

  function renderMaterialsFinal() {
    const section =
      document.getElementById("materials") ||
      document.querySelector("[data-section='materials']");

    if (!section) return;

    section.innerHTML = `
      <div class="ia-materials-final-wrap">
        <div class="ia-materials-final-hero">
          <span class="ia-materials-final-badge">Resources</span>
          <h2>Materiais premium para executar melhor.</h2>
          <p>
            Checklists, planners e guias práticos para transformar o conteúdo das aulas em ação.
            Clique em qualquer card para abrir o PDF correspondente.
          </p>
        </div>

        <div class="ia-materials-final-grid">
          ${materials.map(item => `
            <a class="ia-materials-final-card" href="${item.file}" target="_blank" rel="noopener noreferrer">
              <div class="ia-materials-final-number">${item.number}</div>
              <h3>${item.title}</h3>
              <p>${item.desc}</p>
              <span class="ia-materials-final-btn">Abrir PDF →</span>
            </a>
          `).join("")}
        </div>
      </div>
    `;

    section.dataset.materialsFinalReady = "1";
  }

  function forcePdfClicks() {
    document.addEventListener("click", function (event) {
      const card = event.target.closest && event.target.closest(".ia-materials-final-card");
      if (!card) return;

      const href = card.getAttribute("href");
      if (!href) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      window.open(href, "_blank");
    }, true);
  }

  function boot() {
    renderMaterialsFinal();
    forcePdfClicks();

    setTimeout(renderMaterialsFinal, 300);
    setTimeout(renderMaterialsFinal, 900);
    setTimeout(renderMaterialsFinal, 1600);
  }

  document.addEventListener("DOMContentLoaded", boot);

  if (document.readyState !== "loading") {
    boot();
  }

  window.addEventListener("hashchange", function () {
    if (location.hash === "#materials") {
      setTimeout(renderMaterialsFinal, 100);
      setTimeout(renderMaterialsFinal, 500);
    }
  });
})();
