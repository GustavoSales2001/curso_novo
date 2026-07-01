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

  function completedLessons() {
    try {
      return new Set(JSON.parse(localStorage.getItem(COMPLETED_KEY) || "[]").map(Number));
    } catch (_) {
      return new Set();
    }
  }

  function allowedLesson() {
    const done = completedLessons();
    let allowed = 1;

    for (let i = 1; i <= TOTAL_LESSONS; i++) {
      if (done.has(i)) allowed = i + 1;
      else break;
    }

    return Math.min(allowed, TOTAL_LESSONS);
  }

  function removePrintsMenu() {
    document.querySelectorAll("a, button, div, span, li").forEach(function (el) {
      const text = norm(el.innerText || el.textContent);
      const href = el.getAttribute ? (el.getAttribute("href") || "") : "";

      if (text !== "prints" && text !== "capturas" && !href.includes("#tools")) return;

      let target = el.closest("a, button, li") || el;

      for (let i = 0; i < 4; i++) {
        const parent = target.parentElement;
        if (!parent) break;

        const r = parent.getBoundingClientRect();

        if (
          r.left < 370 &&
          r.width >= 100 &&
          r.width <= 390 &&
          r.height >= 38 &&
          r.height <= 150
        ) {
          target = parent;
        }
      }

      target.classList.add("ia-hide-prints-webfix");
      target.style.display = "none";
    });

    const tools = document.querySelector("#tools, section#tools, [data-section='tools']");
    if (tools) tools.style.display = "none";

    if (location.hash === "#tools") location.hash = "#materials";
  }

  function findMaterialsSection() {
    return (
      document.getElementById("materials") ||
      document.querySelector("section[data-section='materials']") ||
      document.querySelector("[data-page='materials']")
    );
  }

  function renderMaterials() {
    const section = findMaterialsSection();
    if (!section) return;

    section.innerHTML = `
      <div class="ia-materials-webfix">
        <section class="ia-materials-webfix-hero">
          <span>Resources</span>
          <h1>Materiais premium para executar melhor.</h1>
          <p>
            Checklists, planners e guias práticos para transformar o conteúdo das aulas em ação.
            Clique em qualquer card para abrir ou baixar o PDF.
          </p>
        </section>

        <section class="ia-materials-webfix-grid">
          ${materials.map(item => `
            <article class="ia-material-webfix-card" style="--glow:${item.glow}" data-file="${item.file}">
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

    section.querySelectorAll(".ia-material-webfix-card").forEach(function (card) {
      card.addEventListener("click", function () {
        const file = card.getAttribute("data-file");
        if (file) window.open(file, "_blank");
      });
    });
  }

  function toast(title, message) {
    document.querySelectorAll(".ia-lock-toast-webfix").forEach(el => el.remove());

    const box = document.createElement("div");
    box.className = "ia-lock-toast-webfix";
    box.innerHTML = `<strong>${title}</strong><p>${message}</p>`;

    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3200);
  }

  function lessonNumberFromCard(card) {
    const text = card.innerText || card.textContent || "";
    const match = text.match(/AULA\s*0?(\d{1,2})/i);

    if (!match) return null;

    const n = Number(match[1]);
    return n >= 1 && n <= TOTAL_LESSONS ? n : null;
  }

  function enhanceLessons() {
    const done = completedLessons();
    const allowed = allowedLesson();

    document.querySelectorAll("article, section, div, a, button").forEach(function (card) {
      const n = lessonNumberFromCard(card);
      if (!n) return;

      const r = card.getBoundingClientRect();
      if (r.width < 170 || r.width > 460 || r.height < 80 || r.height > 290) return;

      card.dataset.iaLesson = String(n);
      card.classList.add("ia-lesson-clickable");

      card.classList.remove("ia-lesson-done", "ia-lesson-current", "ia-lesson-locked");

      if (done.has(n)) card.classList.add("ia-lesson-done");
      else if (n === allowed) card.classList.add("ia-lesson-current");
      else if (n > allowed) card.classList.add("ia-lesson-locked");

      if (card.dataset.iaLessonBound === "1") return;
      card.dataset.iaLessonBound = "1";

      card.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        const lesson = Number(card.dataset.iaLesson);
        const currentAllowed = allowedLesson();

        if (lesson > currentAllowed) {
          toast("Aula bloqueada", "Conclua a aula anterior para liberar esta etapa.");
          return;
        }

        const m = Math.floor((lesson - 1) / LESSONS_PER_MODULE);
        const l = (lesson - 1) % LESSONS_PER_MODULE;

        window.location.href = `aula.html?m=${m}&l=${l}`;
      }, true);
    });
  }

  function enhanceModules() {
    const allowed = allowedLesson();

    document.querySelectorAll("article, section, div, a, button").forEach(function (card) {
      const text = card.innerText || card.textContent || "";
      const match = text.match(/M[oó]dulo\s*0?([1-4])/i);

      if (!match) return;

      const moduleNumber = Number(match[1]);
      const firstLesson = ((moduleNumber - 1) * LESSONS_PER_MODULE) + 1;

      const r = card.getBoundingClientRect();
      if (r.width < 170 || r.width > 700 || r.height < 70 || r.height > 350) return;

      card.classList.add("ia-lesson-clickable");
      card.classList.toggle("ia-lesson-locked", firstLesson > allowed);

      if (card.dataset.iaModuleBound === "1") return;
      card.dataset.iaModuleBound = "1";

      card.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (firstLesson > allowedLesson()) {
          toast("Módulo bloqueado", "Esse módulo será liberado conforme você avança nas aulas.");
          return;
        }

        window.location.href = `aula.html?m=${moduleNumber - 1}&l=0`;
      }, true);
    });
  }

  function boot() {
    removePrintsMenu();

    if (location.hash === "#materials") renderMaterials();
    if (location.hash === "#classes") enhanceLessons();
    if (location.hash === "#modules") enhanceModules();

    setTimeout(removePrintsMenu, 300);
    setTimeout(removePrintsMenu, 900);
  }

  document.addEventListener("DOMContentLoaded", boot);

  window.addEventListener("hashchange", function () {
    setTimeout(boot, 100);
  });
})();
