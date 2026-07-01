(function () {
  function norm(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function removePrintsButton() {
    document.querySelectorAll("a, button, div, span, li").forEach(function (el) {
      const txt = norm(el.innerText || el.textContent);
      const href = el.getAttribute ? (el.getAttribute("href") || "") : "";

      if (txt === "prints" || txt === "capturas" || href.includes("#tools")) {
        let target = el;

        for (let i = 0; i < 5; i++) {
          if (!target.parentElement) break;

          const r = target.getBoundingClientRect();
          const parent = target.parentElement;
          const pr = parent.getBoundingClientRect();

          if (
            pr.left < 380 &&
            pr.width >= 120 &&
            pr.width <= 380 &&
            pr.height >= 45 &&
            pr.height <= 140
          ) {
            target = parent;
          } else {
            break;
          }
        }

        target.classList.add("ia-force-hide-prints");
        target.style.display = "none";
      }
    });

    const tools = document.querySelector("#tools, section#tools, [data-section='tools']");
    if (tools) tools.style.display = "none";

    if (location.hash === "#tools") {
      location.hash = "#materials";
    }
  }

  function cleanDuplicatedMaterialText() {
    document.querySelectorAll(".ia-material-download-note").forEach(function (el) {
      el.remove();
    });

    document.querySelectorAll(".ia-material-premium-card").forEach(function (card) {
      const opens = Array.from(card.querySelectorAll(".open"));

      opens.forEach(function (el, index) {
        if (index > 0) el.remove();
      });

      if (opens.length === 0) {
        const btn = document.createElement("span");
        btn.className = "open";
        btn.textContent = "Abrir PDF →";
        card.appendChild(btn);
      } else {
        opens[0].textContent = "Abrir PDF →";
      }

      Array.from(card.childNodes).forEach(function (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          const t = norm(node.nodeValue);
          if (t.includes("clique para abrir") || t.includes("abrir pdf")) {
            node.nodeValue = "";
          }
        }
      });
    });
  }

  function boot() {
    removePrintsButton();
    cleanDuplicatedMaterialText();

    setTimeout(removePrintsButton, 300);
    setTimeout(removePrintsButton, 900);
    setTimeout(cleanDuplicatedMaterialText, 300);
    setTimeout(cleanDuplicatedMaterialText, 900);
  }

  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("hashchange", boot);

  const obs = new MutationObserver(function () {
    removePrintsButton();
    cleanDuplicatedMaterialText();
  });

  obs.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
