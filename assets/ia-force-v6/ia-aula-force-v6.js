(function () {
  const MODULE4_UNLOCK_DATE = new Date("2026-07-10T00:00:00-03:00");

  function norm(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function blockModule4DirectAccess() {
    const isLocked = new Date() < MODULE4_UNLOCK_DATE;
    if (!isLocked) return;

    const params = new URLSearchParams(location.search);
    const m = Number(params.get("m"));

    if (m === 3) {
      alert("O Módulo 4 será liberado automaticamente em 10/07/2026.");
      location.href = "area.html?tab=classes#" + "classes";
    }
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

  document.addEventListener("DOMContentLoaded", function () {
    blockModule4DirectAccess();
    hideFloatingCompleteCard();

    setTimeout(hideFloatingCompleteCard, 500);
    setTimeout(hideFloatingCompleteCard, 1200);
  });

  if (document.readyState !== "loading") {
    blockModule4DirectAccess();
    hideFloatingCompleteCard();
  }
})();
