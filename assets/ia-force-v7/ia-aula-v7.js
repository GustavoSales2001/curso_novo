(function () {
  console.log("IA_AULA_V7 ativo");

  const MODULE4_UNLOCK_DATE = new Date("2026-07-10T00:00:00-03:00");

  function norm(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function params() {
    return new URLSearchParams(location.search);
  }

  function currentModule() {
    return Number(params().get("m") || 0);
  }

  function currentLesson() {
    return Number(params().get("l") || 0);
  }

  function isFinalLesson() {
    return currentModule() === 3 && currentLesson() === 3;
  }

  function blockModule4DirectAccess() {
    const isLocked = new Date() < MODULE4_UNLOCK_DATE;
    if (!isLocked) return;

    if (currentModule() === 3) {
      alert("O Módulo 4 será liberado automaticamente em 10/07/2026.");
      location.href = "area.html?tab=classes#classes";
    }
  }

  function removeWrongCourseModal() {
    if (isFinalLesson()) return;

    document.querySelectorAll("div, section, article").forEach(function (el) {
      const text = norm(el.innerText || el.textContent);

      if (
        text.includes("parabens, voce finalizou") ||
        text.includes("parabéns, você finalizou") ||
        text.includes("curso concluido") ||
        text.includes("curso concluído")
      ) {
        const style = getComputedStyle(el);
        const r = el.getBoundingClientRect();

        if (
          style.position === "fixed" ||
          r.width > window.innerWidth * .5 ||
          r.height > window.innerHeight * .4
        ) {
          el.remove();
        }
      }
    });
  }

  function showFinalModal() {
    if (!isFinalLesson()) return;

    document.querySelectorAll(".ia-course-complete-overlay-v7").forEach(el => el.remove());

    const overlay = document.createElement("div");
    overlay.className = "ia-course-complete-overlay-v7";

    overlay.innerHTML = `
      <div class="ia-course-complete-card-v7">
        <div class="ia-course-complete-icon-v7">✓</div>
        <div class="ia-course-complete-badge-v7">Curso concluído</div>
        <h2>Parabéns, você finalizou a trilha!</h2>
        <p>
          Obrigado por participar da Influencer Academy. Você completou a jornada principal
          e agora pode revisar as aulas, acessar os materiais de apoio e continuar aplicando tudo no seu perfil.
        </p>

        <div class="ia-course-stats-v7">
          <div>16<span>aulas concluídas</span></div>
          <div>4<span>módulos finalizados</span></div>
          <div>100%<span>progresso salvo</span></div>
        </div>

        <div class="ia-course-actions-v7">
          <button class="primary" data-go="materials">Ver materiais</button>
          <button class="dark" data-go="home">Voltar ao início</button>
          <button data-go="modules">Revisar módulos</button>
          <button data-go="close">Continuar nesta aula</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (event) {
      const btn = event.target.closest("button");
      if (!btn) return;

      const go = btn.dataset.go;

      if (go === "close") {
        overlay.remove();
        return;
      }

      if (go === "materials") {
        location.href = "area.html?tab=materials#materials";
        return;
      }

      if (go === "home") {
        location.href = "area.html?tab=home#home";
        return;
      }

      if (go === "modules") {
        location.href = "area.html?tab=modules#modules";
      }
    });
  }

  function nextLessonUrl() {
    const m = currentModule();
    const l = currentLesson();

    if (m === 3 && l === 3) return null;

    let nextM = m;
    let nextL = l + 1;

    if (nextL > 3) {
      nextM += 1;
      nextL = 0;
    }

    return "aula.html?m=" + nextM + "&l=" + nextL;
  }

  function bindLessonButtons() {
    if (window.__iaAulaV7ButtonsBound) return;
    window.__iaAulaV7ButtonsBound = true;

    document.addEventListener("click", function (event) {
      const btn = event.target.closest("button, a");
      if (!btn) return;

      const text = norm(btn.innerText || btn.textContent || btn.value);

      if (text.includes("voltar para aulas")) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        location.href = "area.html?tab=classes#classes";
        return;
      }

      if (text.includes("ver materiais")) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        location.href = "area.html?tab=materials#materials";
        return;
      }

      if (
        text.includes("ir para proxima aula") ||
        text.includes("ir para próxima aula") ||
        text.includes("concluir curso")
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (isFinalLesson()) {
          showFinalModal();
          return;
        }

        const url = nextLessonUrl();

        if (url) {
          location.href = url;
        }

        return;
      }
    }, true);
  }

  function adjustFinalButtonText() {
    const final = isFinalLesson();

    document.querySelectorAll("button, a").forEach(function (btn) {
      const text = norm(btn.innerText || btn.textContent || btn.value);

      if (
        final &&
        (
          text.includes("ir para proxima aula") ||
          text.includes("ir para próxima aula")
        )
      ) {
        btn.innerText = "Concluir curso";
      }
    });
  }

  function hideFloatingCompleteCard() {
    document.querySelectorAll("div, section, article").forEach(function (el) {
      const txt = norm(el.innerText || el.textContent);

      const isCard =
        txt.includes("aula ja concluida") ||
        txt.includes("aula já concluída") ||
        txt.includes("esta etapa ja esta salva") ||
        txt.includes("esta etapa já está salva");

      if (!isCard) return;

      const style = getComputedStyle(el);
      const r = el.getBoundingClientRect();

      const floating =
        style.position === "fixed" ||
        r.right > window.innerWidth - 420 ||
        r.bottom > window.innerHeight - 260;

      if (floating) {
        el.classList.add("ia-floating-complete-card");
      }
    });
  }

  function boot() {
    blockModule4DirectAccess();
    bindLessonButtons();
    adjustFinalButtonText();
    hideFloatingCompleteCard();
    removeWrongCourseModal();

    setTimeout(adjustFinalButtonText, 400);
    setTimeout(hideFloatingCompleteCard, 600);
    setTimeout(removeWrongCourseModal, 800);
    setTimeout(removeWrongCourseModal, 1600);
  }

  document.addEventListener("DOMContentLoaded", boot);

  if (document.readyState !== "loading") {
    boot();
  }

  const observer = new MutationObserver(function () {
    adjustFinalButtonText();
    hideFloatingCompleteCard();
    removeWrongCourseModal();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
