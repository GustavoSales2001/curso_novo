(function () {
  const materials = [
    {
      number: 1,
      title: "Checklist de perfil estratégico",
      file: "assets/materials/01_checklist_perfil_estrategico.pdf"
    },
    {
      number: 2,
      title: "Planner de conteúdo",
      file: "assets/materials/02_planner_conteudo_30_dias.pdf"
    },
    {
      number: 3,
      title: "Roteiro de Reels",
      file: "assets/materials/03_roteiro_reels_com_gancho.pdf"
    },
    {
      number: 4,
      title: "Guia Canva + CapCut",
      file: "assets/materials/04_guia_canva_capcut.pdf"
    },
    {
      number: 5,
      title: "Prompts de IA",
      file: "assets/materials/05_prompts_ia_para_criadoras.pdf"
    },
    {
      number: 6,
      title: "Mini mídia kit",
      file: "assets/materials/06_mini_midia_kit_parcerias.pdf"
    }
  ];

  function text(el) {
    return (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function hidePrintsArea() {
    if (location.hash === "#tools") {
      location.hash = "#materials";
    }

    const all = Array.from(document.querySelectorAll("a, button, div, section, article"));

    all.forEach(el => {
      const t = text(el).toLowerCase();

      const isMenuPrints =
        t === "prints" ||
        t.includes("prints principais para apoiar toda a trilha");

      if (isMenuPrints) {
        el.style.display = "none";
      }
    });
  }

  function findMaterialCards() {
    const cards = [];

    const all = Array.from(document.querySelectorAll("article, section, div, a, button"));

    all.forEach(el => {
      const t = text(el);

      materials.forEach(item => {
        const hasMaterialNumber = new RegExp("MATERIAL\\s*0?" + item.number, "i").test(t);
        const hasTitle = t.toLowerCase().includes(item.title.toLowerCase());

        if (!hasMaterialNumber && !hasTitle) return;

        const rect = el.getBoundingClientRect();

        const looksLikeCard =
          rect.width >= 220 &&
          rect.width <= 430 &&
          rect.height >= 90 &&
          rect.height <= 230;

        if (!looksLikeCard) return;

        if (cards.some(c => c.el.contains(el))) return;

        cards.push({ el, item });
      });
    });

    return cards;
  }

  function setupMaterialCards() {
    const cards = findMaterialCards();

    cards.forEach(({ el, item }) => {
      if (el.dataset.materialReady) return;

      el.dataset.materialReady = "1";
      el.classList.add("ia-material-card");

      const note = document.createElement("div");
      note.className = "ia-material-download-note";
      note.textContent = "Clique para abrir ou baixar o PDF.";
      el.appendChild(note);

      el.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        window.open(item.file, "_blank");
      }, true);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    hidePrintsArea();
    setupMaterialCards();

    setTimeout(hidePrintsArea, 400);
    setTimeout(setupMaterialCards, 400);
  });
})();
