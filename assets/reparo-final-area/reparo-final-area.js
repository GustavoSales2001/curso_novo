(function () {
  const COMPLETED_KEY = "influencer_academy_completed_lessons_v1";
  const TOTAL_LESSONS = 16;
  const LESSONS_PER_MODULE = 4;

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

  function getCompleted() {
    try {
      return new Set(JSON.parse(localStorage.getItem(COMPLETED_KEY) || "[]").map(Number));
    } catch (_) {
      return new Set();
    }
  }

  function getAllowedLesson() {
    const completed = getCompleted();
    let allowed = 1;

    for (let i = 1; i <= TOTAL_LESSONS; i++) {
      if (completed.has(i)) {
        allowed = i + 1;
      } else {
        break;
      }
    }

    return Math.min(allowed, TOTAL_LESSONS);
  }

  function showToast(title, message) {
    document.querySelectorAll(".ia-lock-toast").forEach(el => el.remove());

    const toast = document.createElement("div");
    toast.className = "ia-lock-toast";
    toast.innerHTML = `
      <strong>${title}</strong>
      <p>${message}</p>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(12px)";
      setTimeout(() => toast.remove(), 220);
    }, 3200);
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
          r.width >= 100 &&
          r.width <= 390 &&
          r.height >= 38 &&
          r.height <= 150
        ) {
          target = parent;
        }
      }

      target.classList.add("ia-hide-prints-final");
      target.style.display = "none";
    });

    const tools = document.querySelector("#tools, section#tools, [data-section='tools']");
    if (tools) tools.style.display = "none";

    if (location.hash === "#tools") {
      location.hash = "#materials";
    }
  }

  function findMaterialsSection() {
    return (
      document.getElementById("materials") ||
      document.querySelector("section[data-section='materials']") ||
      document.querySelector("[data-page='materials']") ||
      null
    );
  }

  function renderMaterials() {
    const section = findMaterialsSection();
    if (!section) return;

    if (section.dataset.iaMaterialsOk === "1") return;
    section.dataset.iaMaterialsOk = "1";

    section.innerHTML = `
      <div class="ia-materials-premium-wrap">
        <section class="ia-materials-premium-hero">
          <span>Resources</span>
          <h1>Materiais premium para executar melhor.</h1>
          <p>
            Checklists, planners e guias práticos para transformar o conteúdo das aulas em ação.
            Clique em qualquer card para abrir ou baixar o PDF.
          </p>
        </section>

        <section class="ia-materials-premium-grid">
          ${materials.map(item => `
            <article class="ia-material-card-final" style="--glow:${item.glow}" data-file="${item.file}">
              <div class="tag">Material ${item.n}</div>
              <h3>${item.title}</h3>
              <p>${item.desc}</p>
              <span class="action">Abrir PDF →</span>
              <span class="icon">↗</span>
            </article>
          `).join("")}
        </section>
      </div>
    `;

    section.querySelectorAll(".ia-material-card-final").forEach(function (card) {
      card.addEventListener("click", function () {
        const file = card.getAttribute("data-file");
        if (file) window.open(file, "_blank");
      });
    });
  }

  function getLessonNumberFromCard(card) {
    const text = card.innerText || card.textContent || "";
    const match = text.match(/AULA\s*0?(\d{1,2})/i);

    if (match) {
      const n = Number(match[1]);
      if (n >= 1 && n <= TOTAL_LESSONS) return n;
    }

    return null;
  }

  function enhanceLessonCards() {
    const completed = getCompleted();
    const allowed = getAllowedLesson();

    const candidates = Array.from(document.querySelectorAll("article, section, div, a, button"));

    candidates.forEach(function (card) {
      const lessonNumber = getLessonNumberFromCard(card);
      if (!lessonNumber) return;

      const r = card.getBoundingClientRect();

      const looksLikeCard =
        r.width >= 180 &&
        r.width <= 430 &&
        r.height >= 90 &&
        r.height <= 260;

      if (!looksLikeCard) return;

      if (card.querySelector("article, section, div[data-ia-child-card='1']")) return;

      card.dataset.iaLesson = String(lessonNumber);
      card.classList.add("ia-lesson-clickable");

      card.classList.remove("ia-lesson-locked", "ia-lesson-done", "ia-lesson-current");

      if (completed.has(lessonNumber)) {
        card.classList.add("ia-lesson-done");
      } else if (lessonNumber === allowed) {
        card.classList.add("ia-lesson-current");
      } else if (lessonNumber > allowed) {
        card.classList.add("ia-lesson-locked");
      }

      if (card.dataset.iaLessonBound === "1") return;
      card.dataset.iaLessonBound = "1";

      card.addEventListener("click", function (event) {
        const n = Number(card.dataset.iaLesson);
        const allowedNow = getAllowedLesson();

        event.preventDefault();
        event.stopPropagation();

        if (n > allowedNow) {
          showToast(
            "Aula bloqueada",
            "Conclua a aula anterior para liberar esta etapa da trilha."
          );
          return;
        }

        const moduleIndex = Math.floor((n - 1) / LESSONS_PER_MODULE);
        const lessonIndex = (n - 1) % LESSONS_PER_MODULE;

        window.location.href = `aula.html?m=${moduleIndex}&l=${lessonIndex}`;
      }, true);
    });
  }

  function enhanceModuleCards() {
    const allowed = getAllowedLesson();
    const candidates = Array.from(document.querySelectorAll("article, section, div, a, button"));

    candidates.forEach(function (card) {
      const text = card.innerText || card.textContent || "";
      const match = text.match(/M[oó]dulo\s*0?([1-4])/i);
      if (!match) return;

      const moduleNumber = Number(match[1]);
      const firstLesson = ((moduleNumber - 1) * LESSONS_PER_MODULE) + 1;

      const r = card.getBoundingClientRect();
      if (r.width < 180 || r.width > 650 || r.height < 80 || r.height > 330) return;

      if (card.dataset.iaModuleBound === "1") return;
      card.dataset.iaModuleBound = "1";
      card.classList.add("ia-lesson-clickable");

      if (firstLesson > allowed) {
        card.classList.add("ia-lesson-locked");
      }

      card.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        const allowedNow = getAllowedLesson();

        if (firstLesson > allowedNow) {
          showToast(
            "Módulo bloqueado",
            "Esse módulo será liberado quando você avançar na sequência das aulas."
          );
          return;
        }

        window.location.href = `aula.html?m=${moduleNumber - 1}&l=0`;
      }, true);
    });
  }

  function fixMenuNavigation() {
    document.querySelectorAll("a, button, div, li").forEach(function (el) {
      const txt = norm(el.innerText || el.textContent);
      if (!["início", "inicio", "módulos", "modulos", "aulas", "materiais", "perfil"].includes(txt)) return;

      const target =
        txt.includes("início") || txt.includes("inicio") ? "#home" :
        txt.includes("módulos") || txt.includes("modulos") ? "#modules" :
        txt.includes("aulas") ? "#classes" :
        txt.includes("materiais") ? "#materials" :
        txt.includes("perfil") ? "#profile" :
        "";

      if (!target) return;

      if (el.dataset.iaMenuFixed === "1") return;
      el.dataset.iaMenuFixed = "1";

      el.addEventListener("click", function () {
        setTimeout(function () {
          removePrintsMenu();

          if (target === "#materials") {
            renderMaterials();
          }

          if (target === "#classes") {
            enhanceLessonCards();
          }

          if (target === "#modules") {
            enhanceModuleCards();
          }
        }, 140);
      }, false);
    });
  }

  function hideFloatingCompleteCard() {
    document.querySelectorAll("div, section, article").forEach(function (el) {
      const txt = norm(el.innerText || el.textContent);

      const isCompleteCard =
        txt.includes("aula já concluída") ||
        txt.includes("aula ja concluida") ||
        txt.includes("esta etapa já está salva") ||
        txt.includes("esta etapa ja esta salva");

      if (!isCompleteCard) return;

      const style = getComputedStyle(el);
      const r = el.getBoundingClientRect();

      const looksFloating =
        style.position === "fixed" ||
        r.right > window.innerWidth - 420 ||
        r.bottom > window.innerHeight - 260;

      if (looksFloating) {
        el.classList.add("ia-floating-complete-card");
      }
    });
  }

  function boot() {
    removePrintsMenu();
    fixMenuNavigation();

    if (location.hash === "#materials") renderMaterials();
    if (location.hash === "#classes") enhanceLessonCards();
    if (location.hash === "#modules") enhanceModuleCards();

    hideFloatingCompleteCard();

    setTimeout(removePrintsMenu, 300);
    setTimeout(removePrintsMenu, 900);
    setTimeout(fixMenuNavigation, 500);
    setTimeout(enhanceLessonCards, 700);
    setTimeout(enhanceModuleCards, 700);
    setTimeout(hideFloatingCompleteCard, 500);
    setTimeout(hideFloatingCompleteCard, 1200);
  }

  document.addEventListener("DOMContentLoaded", boot);

  window.addEventListener("hashchange", function () {
    setTimeout(boot, 120);
  });

  const observer = new MutationObserver(function () {
    removePrintsMenu();
    hideFloatingCompleteCard();

    if (location.hash === "#classes") enhanceLessonCards();
    if (location.hash === "#modules") enhanceModuleCards();
    if (location.hash === "#materials") renderMaterials();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
