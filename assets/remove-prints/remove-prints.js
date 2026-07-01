(function () {
  function norm(t) {
    return String(t || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function removePrints() {
    document.querySelectorAll("a, button, div, li").forEach(function (el) {
      const t = norm(el.innerText || el.textContent);
      const href = el.getAttribute ? (el.getAttribute("href") || "") : "";

      if (t === "prints" || t === "capturas" || href === "#tools" || href.includes("#tools")) {
        const r = el.getBoundingClientRect();
        if (r.width >= 80 && r.width <= 380 && r.height >= 30 && r.height <= 120) {
          el.classList.add("ia-remove-prints");
          el.style.display = "none";
        }
      }
    });

    const tools = document.querySelector("#tools, section#tools, [data-section='tools']");
    if (tools) tools.style.display = "none";

    if (location.hash === "#tools") {
      location.hash = "#materials";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    removePrints();
    setTimeout(removePrints, 300);
    setTimeout(removePrints, 900);
    setTimeout(removePrints, 1600);
  });

  window.addEventListener("hashchange", removePrints);
})();
