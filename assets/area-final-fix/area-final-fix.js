(function () {
  const MODULE4_UNLOCK_DATE = new Date("2026-07-10T00:00:00-03:00");

  const materials = [
    {
      keys: ["checklist", "perfil estratégico", "perfil estrategico"],
      file: "assets/materiais/01_checklist_perfil_estrategico.pdf"
    },
    {
      keys: ["planner", "conteúdo", "conteudo", "30 dias"],
      file: "assets/materiais/02_planner_conteudo_30_dias.pdf"
    },
    {
      keys: ["roteiro", "reels", "gancho"],
      file: "assets/materiais/03_roteiro_reels_com_gancho.pdf"
    },
    {
      keys: ["canva", "capcut", "guia"],
      file: "assets/materiais/04_guia_canva_capcut.pdf"
    },
    {
      keys: ["prompts", "ia", "criadoras"],
      file: "assets/materiais/05_prompts_ia_para_criadoras.pdf"
    },
    {
      keys: ["mídia kit", "midia kit", "parcerias"],
      file: "assets/materiais/06_mini_midia_kit_parcerias.pdf"
    }
  ];

  function norm(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function toast(title, message) {
    document.querySelectorAll(".ia-course-toast").forEach(el => el.remove());

    const box = document.createElement("div");
    box.className = "ia-course-toast";
    box.innerHTML = `<strong>${title}</strong><p>${message}</p>`;

    document.body.appendChild(box);

    setTimeout(() => {
      box.style.opacity = "0";
      box.style.transform = "translateY(12px)";
      setTimeout(() => box.remove(), 220);
    }, 3300);
  }

  function module4IsLocked() {
    return new Date() < MODULE4_UNLOCK_DATE;
  }

  function goToSection(hash) {
    const cleanHash = hash.startsWith("#") ? hash : "#" + hash;
    const el = document.querySelector(cleanHash);

    history.replaceState(null, "", cleanHash);

    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  function fixMobileMenu() {
    const map = [
      { words: ["inicio", "início"], hash: "#home" },
      { words: ["modulos", "módulos"], hash: "#modules" },
      { words: ["aulas"], hash: "#classes" },
      { words: ["materiais"], hash: "#materials" },
      { words: ["perfil"], hash: "#profile" }
    ];

    document.querySelectorAll("a, button, div, li").forEach(function (el) {
      const text = norm(el.innerText || el.textContent);
      if (!text) return;

      const item = map.find(item => item.words.some(word => text === norm(word)));
      if (!item) return;

      if (el.dataset.iaMenuSmooth === "1") return;
      el.dataset.iaMenuSmooth = "1";

      el.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        goToSection(item.hash);
      }, true);
    });
  }

  function bindMaterialCards() {
    const area = document.querySelector("#materials, [data-section='materials'], [data-page='materials']");
    if (!area) return;

    const possibleCards = Array.from(area.querySelectorAll("article, section, div, a, button"));

    possibleCards.forEach(function (card) {
      const text = norm(card.innerText || card.textContent);
      if (!text) return;

      const rect = card.getBoundingClientRect();

      const looksLikeCard =
        rect.width >= 190 &&
        rect.width <= 480 &&
        rect.height >= 95 &&
        rect.height <= 310;

      if (!looksLikeCard) return;

      const material = materials.find(item =>
        item.keys.every(key => text.includes(norm(key))) ||
        item.keys.some(key => text.includes(norm(key)))
      );

      if (!material) return;

      card.classList.add("ia-material-clickable");
      card.dataset.materialFile = material.file;

      if (!card.querySelector(".ia-material-open-btn")) {
        const btn = document.createElement("div");
        btn.className = "ia-material-open-btn";
        btn.textContent = "Abrir PDF →";
        card.appendChild(btn);
      }

      if (card.dataset.iaMaterialBound === "1") return;
      card.dataset.iaMaterialBound = "1";

      card.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        window.open(material.file, "_blank");
      }, true);
    });
  }

  function getLessonNumberFromText(text) {
    const match = text.match(/aula\s*0?(\d{1,2})/i);
    if (!match) return null;

    const n = Number(match[1]);
    return Number.isFinite(n) ? n : null;
  }

  function lockModule4Cards() {
    if (!module4IsLocked()) return;

    document.querySelectorAll("article, section, div, a, button").forEach(function (card) {
      const text = norm(card.innerText || card.textContent);
      if (!text) return;

      const rect = card.getBoundingClientRect();

      const looksLikeCard =
        rect.width >= 170 &&
        rect.width <= 720 &&
        rect.height >= 70 &&
        rect.height <= 360;

      if (!looksLikeCard) return;

      const lesson = getLessonNumberFromText(text);
      const isModule4 =
        text.includes("modulo 4") ||
        text.includes("módulo 4") ||
        text.includes("crescimento e profissionalizacao") ||
        text.includes("crescimento e profissionalização") ||
        (lesson && lesson >= 13);

      if (!isModule4) return;

      card.classList.add("ia-module4-locked");

      if (card.dataset.iaModule4Locked === "1") return;
      card.dataset.iaModule4Locked = "1";

      card.addEventListener("click", function (event) {
        if (!module4IsLocked()) return;

        event.preventDefault();
        event.stopPropagation();

        toast(
          "Módulo 4 bloqueado",
          "Essa etapa será liberada automaticamente em 10/07/2026."
        );
      }, true);
    });
  }

  function blockDirectAccessToModule4() {
    if (!module4IsLocked()) return;

    const params = new URLSearchParams(window.location.search);
    const m = Number(params.get("m"));
    const l = Number(params.get("l"));

    if (m === 3 || m >= 4 || (m === 3 && l >= 0)) {
      alert("O Módulo 4 será liberado automaticamente em 10/07/2026.");
      window.location.href = "area.html#classes";
    }
  }

  function boot() {
    fixMobileMenu();
    bindMaterialCards();
    lockModule4Cards();
    blockDirectAccessToModule4();

    setTimeout(fixMobileMenu, 300);
    setTimeout(bindMaterialCards, 400);
    setTimeout(lockModule4Cards, 500);

    setTimeout(fixMobileMenu, 1000);
    setTimeout(bindMaterialCards, 1100);
    setTimeout(lockModule4Cards, 1200);
  }

  document.addEventListener("DOMContentLoaded", boot);

  window.addEventListener("hashchange", function () {
    setTimeout(boot, 120);
  });

  const observer = new MutationObserver(function () {
    fixMobileMenu();
    bindMaterialCards();
    lockModule4Cards();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
