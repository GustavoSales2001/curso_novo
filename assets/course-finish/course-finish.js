(function () {
  const TOTAL_CLASSES = 16;
  const LESSONS_PER_MODULE = 4;
  const STORAGE_KEY = "influencer_academy_completed_lessons_v1";

  function isLessonPage() {
    return location.pathname.toLowerCase().includes("aula.html");
  }

  function currentLessonNumber() {
    const params = new URLSearchParams(location.search);
    const m = Number(params.get("m") || 0);
    const l = Number(params.get("l") || 0);
    return (m * LESSONS_PER_MODULE) + l + 1;
  }

  function isLastLesson() {
    return isLessonPage() && currentLessonNumber() >= TOTAL_CLASSES;
  }

  function getCompleted() {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").map(Number));
    } catch (_) {
      return new Set();
    }
  }

  function saveCompleted(set) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set).sort((a, b) => a - b)));
  }

  function markCourseCompleted() {
    const completed = getCompleted();

    for (let i = 1; i <= TOTAL_CLASSES; i++) {
      completed.add(i);
    }

    saveCompleted(completed);
    localStorage.setItem("influencer_academy_course_finished", "1");
  }

  function confetti(container) {
    const colors = ["#d88776", "#432d27", "#f4c9bf", "#caa06f", "#fff1eb"];

    for (let i = 0; i < 34; i++) {
      const piece = document.createElement("span");
      piece.className = "ia-finish-confetti";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = Math.random() * .8 + "s";
      piece.style.animationDuration = (2.2 + Math.random() * 1.4) + "s";
      container.appendChild(piece);

      setTimeout(() => piece.remove(), 4200);
    }
  }

  function showFinishCard() {
    if (document.querySelector(".ia-finish-overlay")) return;

    markCourseCompleted();

    const overlay = document.createElement("div");
    overlay.className = "ia-finish-overlay";
    overlay.innerHTML = `
      <section class="ia-finish-card">
        <div class="ia-finish-icon">✓</div>

        <div class="ia-finish-kicker">Curso concluído</div>

        <h2>Parabéns, você finalizou a trilha!</h2>

        <p>
          Obrigado por participar da Influencer Academy. Você completou a jornada principal e agora pode revisar as aulas,
          acessar os materiais de apoio e continuar aplicando tudo no seu perfil.
        </p>

        <div class="ia-finish-stats">
          <div class="ia-finish-stat">
            <strong>16</strong>
            <span>aulas concluídas</span>
          </div>
          <div class="ia-finish-stat">
            <strong>4</strong>
            <span>módulos finalizados</span>
          </div>
          <div class="ia-finish-stat">
            <strong>100%</strong>
            <span>progresso salvo</span>
          </div>
        </div>

        <div class="ia-finish-actions">
          <a class="ia-finish-btn primary" href="area.html#materials">Ver materiais</a>
          <a class="ia-finish-btn dark" href="area.html#home">Voltar ao início</a>
          <a class="ia-finish-btn" href="area.html#modules">Revisar módulos</a>
          <button class="ia-finish-btn" type="button" id="iaCloseFinish">Continuar nesta aula</button>
        </div>
      </section>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    confetti(overlay);

    const closeBtn = document.getElementById("iaCloseFinish");
    if (closeBtn) {
      closeBtn.onclick = function () {
        overlay.remove();
        document.body.style.overflow = "";
      };
    }
  }

  function updateLastLessonTexts() {
    if (!isLastLesson()) return;

    const elements = Array.from(document.querySelectorAll("button, a"));

    elements.forEach(function (el) {
      const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();

      const isNext =
        text.includes("ir para próxima aula") ||
        text.includes("ir para proxima aula") ||
        text.includes("próxima aula") ||
        text.includes("proxima aula") ||
        text.includes("concluir e liberar próxima") ||
        text.includes("concluir e liberar proxima");

      if (isNext) {
        el.textContent = "Concluir curso";
        el.classList.add("ia-course-complete-button");
      }
    });

    const finalTitles = Array.from(document.querySelectorAll("h1, h2, h3, strong"));
    finalTitles.forEach(function (el) {
      const t = (el.innerText || "").trim().toLowerCase();

      if (t === "finalizar aula") {
        el.textContent = "Finalizar curso";
      }
    });
  }

  function interceptLastLessonButtons() {
    if (!isLastLesson()) return;

    document.addEventListener("click", function (event) {
      const btn = event.target.closest("button, a");
      if (!btn) return;

      const text = (btn.innerText || btn.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();

      const isFinish =
        text.includes("concluir curso") ||
        text.includes("ir para próxima aula") ||
        text.includes("ir para proxima aula") ||
        text.includes("concluir e liberar próxima") ||
        text.includes("concluir e liberar proxima");

      if (!isFinish) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      showFinishCard();

      return false;
    }, true);
  }

  function boot() {
    if (!isLastLesson()) return;

    updateLastLessonTexts();
    interceptLastLessonButtons();

    setTimeout(updateLastLessonTexts, 300);
    setTimeout(updateLastLessonTexts, 900);
    setTimeout(updateLastLessonTexts, 1600);
  }

  document.addEventListener("DOMContentLoaded", boot);

  window.addEventListener("iaCourseFinished", function () {
    showFinishCard();
  });

  window.IAAcademyFinishCourse = showFinishCard;
})();
