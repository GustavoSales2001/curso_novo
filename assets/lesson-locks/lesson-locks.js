(function () {
  const TOTAL_CLASSES = 16;
  const LESSONS_PER_MODULE = 4;
  const STORAGE_KEY = "influencer_academy_completed_lessons_v1";

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

  function sequentialCompleted() {
    const completed = getCompleted();
    let count = 0;

    for (let i = 1; i <= TOTAL_CLASSES; i++) {
      if (completed.has(i)) count = i;
      else break;
    }

    return count;
  }

  function unlockedUntil() {
    return Math.min(TOTAL_CLASSES, sequentialCompleted() + 1);
  }

  function lessonUrl(number) {
    const moduleIndex = Math.floor((number - 1) / LESSONS_PER_MODULE);
    const lessonIndex = (number - 1) % LESSONS_PER_MODULE;
    return `aula.html?m=${moduleIndex}&l=${lessonIndex}`;
  }

  function lessonNumberFromUrl() {
    const url = new URL(window.location.href);
    const m = Number(url.searchParams.get("m") || 0);
    const l = Number(url.searchParams.get("l") || 0);
    return (m * LESSONS_PER_MODULE) + l + 1;
  }

  function toast(message) {
    const old = document.querySelector(".ia-toast");
    if (old) old.remove();

    const el = document.createElement("div");
    el.className = "ia-toast";
    el.textContent = message;
    document.body.appendChild(el);

    setTimeout(() => el.remove(), 3200);
  }

  function findLessonCards() {
    const all = Array.from(document.querySelectorAll("article, section, div, a, button"));
    const found = [];

    for (const el of all) {
      const text = (el.innerText || "").trim();
      const match = text.match(/\bAULA\s*0?(\d{1,2})\b/i);

      if (!match) continue;

      const number = Number(match[1]);
      if (!number || number < 1 || number > TOTAL_CLASSES) continue;

      const rect = el.getBoundingClientRect();

      const isCard =
        rect.width >= 210 &&
        rect.width <= 430 &&
        rect.height >= 90 &&
        rect.height <= 260;

      if (!isCard) continue;

      const alreadyInside = found.some(item => item.card.contains(el));
      const containsOld = found.find(item => el.contains(item.card));

      if (containsOld) {
        containsOld.card = el;
        containsOld.number = number;
      } else if (!alreadyInside) {
        found.push({ card: el, number });
      }
    }

    const unique = [];
    const seen = new Set();

    for (const item of found) {
      if (seen.has(item.number)) continue;
      seen.add(item.number);
      unique.push(item);
    }

    return unique.sort((a, b) => a.number - b.number);
  }

  function addBadge(card, text) {
    let badge = card.querySelector(":scope > .ia-lesson-badge");

    if (!badge) {
      badge = document.createElement("div");
      badge.className = "ia-lesson-badge";
      card.appendChild(badge);
    }

    badge.textContent = text;
  }

  function injectProgressPanel(cards) {
    if (document.querySelector(".ia-progress-panel")) return;
    if (!cards.length) return;

    const completedCount = sequentialCompleted();
    const percent = Math.round((completedCount / TOTAL_CLASSES) * 100);

    const panel = document.createElement("div");
    panel.className = "ia-progress-panel";
    panel.innerHTML = `
      <strong>Seu progresso na trilha</strong>
      <p>${completedCount} de ${TOTAL_CLASSES} aulas concluídas. A próxima aula é liberada automaticamente ao concluir a atual.</p>
      <div class="ia-progress-bar">
        <div class="ia-progress-fill" style="width:${percent}%"></div>
      </div>
    `;

    const first = cards[0].card;
    const parent = first.parentElement;

    if (parent) {
      parent.insertBefore(panel, first);
    }
  }

  function setupAreaPage() {
    const isArea = location.pathname.toLowerCase().includes("area.html");
    if (!isArea) return;

    const cards = findLessonCards();
    if (!cards.length) return;

    injectProgressPanel(cards);

    const completed = getCompleted();
    const limit = unlockedUntil();

    for (const item of cards) {
      const card = item.card;
      const number = item.number;

      card.classList.add("ia-lesson-card-ready");
      card.classList.remove("ia-lesson-done", "ia-lesson-next", "ia-lesson-locked");

      if (completed.has(number)) {
        card.classList.add("ia-lesson-done");
        addBadge(card, "Concluída ✓");
      } else if (number <= limit) {
        card.classList.add("ia-lesson-next");
        addBadge(card, "Liberada");
      } else {
        card.classList.add("ia-lesson-locked");
        addBadge(card, "🔒 Bloqueada");
      }

      card.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const nowLimit = unlockedUntil();

        if (number > nowLimit) {
          toast(`Essa aula ainda está bloqueada. Conclua a Aula ${number - 1} para liberar.`);
          return false;
        }

        window.location.href = lessonUrl(number);
        return false;
      }, true);
    }
  }

  function blockIfNeeded() {
    const isLesson = location.pathname.toLowerCase().includes("aula.html");
    if (!isLesson) return false;

    const current = lessonNumberFromUrl();
    const limit = unlockedUntil();

    if (current <= limit) return false;

    document.body.insertAdjacentHTML("beforeend", `
      <div class="ia-block-overlay">
        <div class="ia-block-box">
          <h2>Aula bloqueada 🔒</h2>
          <p>Para manter a evolução em ordem, conclua primeiro a Aula ${current - 1}. Depois essa aula será liberada automaticamente.</p>
          <a href="area.html#classes">Voltar para minhas aulas</a>
        </div>
      </div>
    `);

    return true;
  }

  function markCurrentCompleted(goNext) {
    const current = lessonNumberFromUrl();

    if (current < 1 || current > TOTAL_CLASSES) return;

    const completed = getCompleted();
    completed.add(current);
    saveCompleted(completed);

    toast(`Aula ${current} concluída. Próxima aula liberada!`);

    if (goNext) {
      const next = current + 1;

      setTimeout(() => {
        if (next <= TOTAL_CLASSES) {
          window.location.href = lessonUrl(next);
        } else {
          window.location.href = "area.html#classes";
        }
      }, 650);
    }
  }

  function injectCompletePanel() {
    const isLesson = location.pathname.toLowerCase().includes("aula.html");
    if (!isLesson) return;

    if (document.querySelector(".ia-block-overlay")) return;
    if (document.querySelector(".ia-complete-panel")) return;

    const current = lessonNumberFromUrl();
    const completed = getCompleted();
    const done = completed.has(current);

    const panel = document.createElement("div");
    panel.className = "ia-complete-panel";
    panel.innerHTML = `
      <strong>${done ? "Aula já concluída ✓" : "Finalizar aula"}</strong>
      <p>${done ? "Essa etapa já está salva no seu progresso." : "Quando terminar de assistir e estudar os prints, marque como concluída para liberar a próxima aula."}</p>
      <div class="ia-complete-actions">
        <button class="ia-complete-btn" id="iaCompleteAndNext">${done ? "Ir para próxima aula" : "Concluir e liberar próxima"}</button>
        <button class="ia-complete-btn secondary" id="iaBackToClasses">Voltar para aulas</button>
      </div>
    `;

    document.body.appendChild(panel);

    document.getElementById("iaCompleteAndNext").onclick = function () {
      markCurrentCompleted(true);
    };

    document.getElementById("iaBackToClasses").onclick = function () {
      window.location.href = "area.html#classes";
    };
  }

  function interceptExistingButtons() {
    const isLesson = location.pathname.toLowerCase().includes("aula.html");
    if (!isLesson) return;

    document.addEventListener("click", function (event) {
      const btn = event.target.closest("button, a");
      if (!btn) return;

      const text = (btn.innerText || "").toLowerCase();

      const isComplete =
        text.includes("aula concluída") ||
        text.includes("aula concluida") ||
        text.includes("concluir aula") ||
        text.includes("finalizar aula") ||
        text.includes("marcar como concluída") ||
        text.includes("marcar como concluida");

      const isNext =
        text.includes("próxima aula") ||
        text.includes("proxima aula");

      if (!isComplete && !isNext) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      markCurrentCompleted(isNext || isComplete);
    }, true);
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupAreaPage();

    const blocked = blockIfNeeded();
    if (!blocked) {
      injectCompletePanel();
      interceptExistingButtons();
    }
  });

  window.IAAcademyProgress = {
    reset: function () {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    },
    unlockUntil: function (number) {
      const completed = new Set();
      for (let i = 1; i < number; i++) completed.add(i);
      saveCompleted(completed);
      location.reload();
    },
    complete: function (number) {
      const completed = getCompleted();
      completed.add(Number(number));
      saveCompleted(completed);
      location.reload();
    }
  };
})();
