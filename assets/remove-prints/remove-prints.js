(function () {
  function normalize(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function removePrintsButton() {
    const items = Array.from(document.querySelectorAll("a, button, div, li, section"));

    items.forEach(function (el) {
      const text = normalize(el.innerText || el.textContent);
      const href = el.getAttribute && (el.getAttribute("href") || "");

      const isPrintsButton =
        text === "prints" ||
        text === "capturas" ||
        href === "#tools" ||
        href.includes("#tools");

      const rect = el.getBoundingClientRect();

      const looksLikeMenuItem =
        rect.width >= 120 &&
        rect.width <= 360 &&
        rect.height >= 40 &&
        rect.height <= 100;

      if (isPrintsButton && looksLikeMenuItem) {
        el.classList.add("ia-remove-prints");
        el.style.display = "none";
      }
    });

    const toolsSection = document.querySelector("#tools, [data-section='tools']");
    if (toolsSection) {
      toolsSection.style.display = "none";
    }

    if (location.hash === "#tools") {
      location.hash = "#materials";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    removePrintsButton();
    setTimeout(removePrintsButton, 300);
    setTimeout(removePrintsButton, 900);
  });

  window.addEventListener("hashchange", function () {
    if (location.hash === "#tools") {
      location.hash = "#materials";
    }
    removePrintsButton();
  });
})();
