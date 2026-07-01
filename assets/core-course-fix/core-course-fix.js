(function () {
  const COMPLETED_KEY = "influencer_academy_completed_lessons_v1";
  const TOTAL_LESSONS = 16;
  const LESSONS_PER_MODULE = 4;

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
    const done = getCompleted();
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

      target.classList.add("ia-hide-prints-core");
      target.style.display = "none";
    });

    const tools = document.querySelector("#tools, section#tools, [data-section='tools']");
    if (tools) tools.style.display = "none";

    if (location.hash === "#tools") location.hash = "#materials";
  }

  function toast(title, message) {
    document.querySelectorAll(".ia-lock-toast-core").forEach(el => el.remove());

    const box = document.createElement("div");
    box.className = "ia-lock-toast-core";
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
    const done = getCompleted();
    const allowed = getAllowedLesson();

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
        const currentAllowed = getAllowedLesson();

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
    const allowed = getAllowedLesson();

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

        if (firstLesson > getAllowedLesson()) {
          toast("Módulo bloqueado", "Esse módulo será liberado conforme você avança nas aulas.");
          return;
        }

        window.location.href = `aula.html?m=${moduleNumber - 1}&l=0`;
      }, true);
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

    if (location.hash === "#classes") enhanceLessons();
    if (location.hash === "#modules") enhanceModules();

    hideFloatingCompleteCard();

    setTimeout(removePrintsMenu, 300);
    setTimeout(enhanceLessons, 500);
    setTimeout(enhanceModules, 500);
    setTimeout(hideFloatingCompleteCard, 500);
  }

  document.addEventListener("DOMContentLoaded", boot);

  window.addEventListener("hashchange", function () {
    setTimeout(boot, 120);
  });

  const observer = new MutationObserver(function () {
    removePrintsMenu();
    hideFloatingCompleteCard();

    if (location.hash === "#classes") enhanceLessons();
    if (location.hash === "#modules") enhanceModules();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
