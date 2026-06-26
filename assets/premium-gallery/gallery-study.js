(function () {
  const manifest = window.GALLERY_MANIFEST || {};

  const state = {
    app: "",
    title: "",
    images: [],
    current: 0,
    selected: new Set(),
    scale: 1,
    x: 0,
    y: 0,
    rotate: 0,
    dragging: false,
    sx: 0,
    sy: 0,
    ox: 0,
    oy: 0
  };

  function $(id) {
    return document.getElementById(id);
  }

  function params() {
    const url = new URL(window.location.href);
    return {
      m: Number(url.searchParams.get("m") || 0),
      l: Number(url.searchParams.get("l") || 0)
    };
  }

  function lower(text) {
    return String(text || "").toLowerCase();
  }

  function appLabel(app) {
    return {
      instagram: "Instagram",
      canva: "Canva",
      capcut: "CapCut",
      ia: "IA"
    }[app] || "Galeria";
  }

  function detectApps(text) {
    const t = lower(text);
    const apps = [];

    if (t.includes("instagram") || t.includes("insta")) apps.push("instagram");
    if (t.includes("canva")) apps.push("canva");
    if (t.includes("capcut")) apps.push("capcut");
    if (t.includes("ia") || t.includes("prompt")) apps.push("ia");

    return apps;
  }

  function getImages(app) {
    const p = params();

    const keys = [
      `${p.m}-${p.l}-${app}`,
      `${p.m + 1}-${p.l + 1}-${app}`
    ];

    for (const key of keys) {
      if (Array.isArray(manifest[key]) && manifest[key].length) {
        return manifest[key].slice(0, 4);
      }
    }

    return [];
  }

  function findCorrectCard(target) {
    let el = target;

    while (el && el !== document.body) {
      const text = el.innerText || "";
      const apps = detectApps(text);
      const rect = el.getBoundingClientRect();

      const looksLikeCard =
        apps.length === 1 &&
        rect.width >= 180 &&
        rect.width <= 460 &&
        rect.height >= 120 &&
        rect.height <= 430 &&
        lower(text).includes("clique");

      if (looksLikeCard) {
        return {
          card: el,
          app: apps[0]
        };
      }

      el = el.parentElement;
    }

    return null;
  }

  function getTitle(card, app) {
    const heading = card.querySelector("h2,h3,h4,strong");

    if (heading && heading.textContent.trim()) {
      return heading.textContent.trim();
    }

    const lines = String(card.innerText || "")
      .split("\n")
      .map(v => v.trim())
      .filter(Boolean);

    return lines[0] || appLabel(app);
  }

  function ensureModal() {
    if ($("gpOverlay")) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div id="gpOverlay" class="gp-overlay gp-hidden">
        <div class="gp-shell">
          <header class="gp-header">
            <div>
              <div id="gpKicker" class="gp-kicker">Galeria</div>
              <h2 id="gpTitle" class="gp-title">Galeria</h2>
              <p class="gp-subtitle">Clique na imagem principal para estudar com zoom. Arraste para navegar nos detalhes.</p>
            </div>

            <div class="gp-toolbar">
              <button class="gp-btn" id="gpZoomOut" type="button">−</button>
              <button class="gp-btn" id="gpZoomIn" type="button">+</button>
              <button class="gp-btn" id="gpFit" type="button">Ajustar</button>
              <button class="gp-btn" id="gp200" type="button">200%</button>
              <button class="gp-btn" id="gpRotate" type="button">Girar</button>
              <button class="gp-btn" id="gpOpen" type="button">Abrir</button>
              <button class="gp-btn" id="gpShare" type="button">Compartilhar</button>
              <button class="gp-btn primary" id="gpDownloadOne" type="button">Baixar</button>
              <button class="gp-btn dark" id="gpCloseSoft" type="button">Sair</button>
              <button class="gp-btn primary" id="gpClose" type="button">×</button>
            </div>
          </header>

          <main class="gp-body">
            <section class="gp-view">
              <button class="gp-arrow" id="gpPrev" type="button">‹</button>

              <div class="gp-stage">
                <div class="gp-pan">
                  <img id="gpMain" class="gp-main" alt="Imagem principal" draggable="false">
                </div>
                <div id="gpZoomPill" class="gp-pill">100%</div>
                <div id="gpCounter" class="gp-counter">1/4</div>
              </div>

              <button class="gp-arrow" id="gpNext" type="button">›</button>
            </section>

            <aside class="gp-side">
              <div>
                <h3>Ferramentas de estudo</h3>
                <p>Clique na miniatura para trocar. Clique no círculo para selecionar mais de uma imagem.</p>
              </div>

              <div id="gpGrid" class="gp-grid"></div>

              <div class="gp-study-box">
                <strong>Modo estudo:</strong><br>
                • Clique na imagem grande para aproximar.<br>
                • Arraste com zoom para ler detalhes.<br>
                • Use 200%, Girar, Abrir e Baixar para estudar melhor.
              </div>

              <div class="gp-tools">
                <button class="gp-btn" id="gpSelectAll" type="button">Selecionar todas</button>
                <button class="gp-btn" id="gpClear" type="button">Limpar seleção</button>
                <button class="gp-btn primary" id="gpDownloadSelected" type="button">Baixar selecionadas</button>
                <button class="gp-btn" id="gpDownloadAll" type="button">Baixar as 4</button>
              </div>
            </aside>
          </main>

          <footer class="gp-footer">
            <strong>Atalhos:</strong> ESC fecha · setas navegam · clique na imagem amplia · arraste move · duplo clique alterna zoom
          </footer>
        </div>
      </div>
    `);

    bindModal();
  }

  function bindModal() {
    $("gpClose").onclick = closeGallery;
    $("gpCloseSoft").onclick = closeGallery;
    $("gpPrev").onclick = () => move(-1);
    $("gpNext").onclick = () => move(1);
    $("gpZoomIn").onclick = () => setZoom(state.scale + .25);
    $("gpZoomOut").onclick = () => setZoom(state.scale - .25);
    $("gpFit").onclick = fitImage;
    $("gp200").onclick = () => setZoom(2);
    $("gpRotate").onclick = rotateImage;
    $("gpOpen").onclick = openCurrent;
    $("gpShare").onclick = shareCurrent;
    $("gpDownloadOne").onclick = () => downloadList([state.current]);
    $("gpDownloadSelected").onclick = downloadSelected;
    $("gpDownloadAll").onclick = () => downloadList(state.images.map((_, i) => i));
    $("gpSelectAll").onclick = selectAll;
    $("gpClear").onclick = clearSelection;

    const main = $("gpMain");

    main.onclick = function () {
      if (state.scale <= 1) setZoom(1.8);
    };

    main.ondblclick = function (e) {
      e.preventDefault();
      state.scale <= 1 ? setZoom(2.5) : fitImage();
    };

    main.onwheel = function (e) {
      e.preventDefault();
      setZoom(state.scale + (e.deltaY > 0 ? -.18 : .18));
    };

    main.onpointerdown = function (e) {
      if (state.scale <= 1) return;

      state.dragging = true;
      state.sx = e.clientX;
      state.sy = e.clientY;
      state.ox = state.x;
      state.oy = state.y;

      main.classList.add("dragging");

      try {
        main.setPointerCapture(e.pointerId);
      } catch (_) {}
    };

    main.onpointermove = function (e) {
      if (!state.dragging) return;

      state.x = state.ox + e.clientX - state.sx;
      state.y = state.oy + e.clientY - state.sy;

      applyTransform();
    };

    main.onpointerup = stopDrag;
    main.onpointercancel = stopDrag;
    main.onpointerleave = stopDrag;

    document.addEventListener("keydown", function (e) {
      const overlay = $("gpOverlay");
      if (!overlay || overlay.classList.contains("gp-hidden")) return;

      if (e.key === "Escape") closeGallery();
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "+") setZoom(state.scale + .25);
      if (e.key === "-") setZoom(state.scale - .25);
      if (e.key === "0") fitImage();
    });
  }

  function stopDrag(e) {
    state.dragging = false;
    $("gpMain").classList.remove("dragging");

    try {
      $("gpMain").releasePointerCapture(e.pointerId);
    } catch (_) {}
  }

  function openGallery(app, title) {
    ensureModal();

    const images = getImages(app);

    if (!images.length) {
      alert("Não encontrei as imagens desta aula para " + appLabel(app) + ".");
      return;
    }

    state.app = app;
    state.title = title || appLabel(app);
    state.images = images;
    state.current = 0;
    state.selected = new Set([0]);
    state.scale = 1;
    state.x = 0;
    state.y = 0;
    state.rotate = 0;

    $("gpKicker").textContent = appLabel(app).toUpperCase();
    $("gpTitle").textContent = state.title;
    $("gpOverlay").classList.remove("gp-hidden");
    document.body.style.overflow = "hidden";

    renderThumbs();
    renderMain();
  }

  function closeGallery() {
    $("gpOverlay").classList.add("gp-hidden");
    document.body.style.overflow = "";
  }

  function renderMain() {
    const main = $("gpMain");

    main.src = state.images[state.current];
    main.alt = `${state.title} - imagem ${state.current + 1}`;

    $("gpCounter").textContent = `${state.current + 1}/${state.images.length}`;

    fitImage();
  }

  function renderThumbs() {
    const grid = $("gpGrid");
    grid.innerHTML = "";

    state.images.forEach((src, index) => {
      const thumb = document.createElement("div");

      thumb.className =
        "gp-thumb" +
        (index === state.current ? " active" : "") +
        (state.selected.has(index) ? " selected" : "");

      thumb.innerHTML = `
        <button class="gp-check" type="button">${state.selected.has(index) ? "✓" : "+"}</button>
        <img src="${src}" alt="Imagem ${index + 1}">
      `;

      thumb.onclick = function (e) {
        if (e.target.closest(".gp-check")) {
          e.preventDefault();
          e.stopPropagation();
          toggleSelection(index);
          return;
        }

        state.current = index;
        renderThumbs();
        renderMain();
      };

      grid.appendChild(thumb);
    });
  }

  function toggleSelection(index) {
    if (state.selected.has(index)) state.selected.delete(index);
    else state.selected.add(index);

    renderThumbs();
  }

  function selectAll() {
    state.selected = new Set(state.images.map((_, i) => i));
    renderThumbs();
  }

  function clearSelection() {
    state.selected = new Set([state.current]);
    renderThumbs();
  }

  function move(step) {
    state.current = (state.current + step + state.images.length) % state.images.length;

    if (!state.selected.has(state.current)) {
      state.selected.add(state.current);
    }

    renderThumbs();
    renderMain();
  }

  function setZoom(value) {
    state.scale = Math.max(1, Math.min(5, Number(value.toFixed(2))));

    if (state.scale === 1) {
      state.x = 0;
      state.y = 0;
    }

    applyTransform();
  }

  function fitImage() {
    state.scale = 1;
    state.x = 0;
    state.y = 0;
    applyTransform();
  }

  function rotateImage() {
    state.rotate = (state.rotate + 90) % 360;
    applyTransform();
  }

  function applyTransform() {
    const main = $("gpMain");

    main.classList.toggle("zoomed", state.scale > 1);
    main.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale}) rotate(${state.rotate}deg)`;

    $("gpZoomPill").textContent = `${Math.round(state.scale * 100)}%`;
  }

  function downloadList(indices) {
    indices.forEach((index, order) => {
      const src = state.images[index];
      if (!src) return;

      setTimeout(function () {
        const a = document.createElement("a");
        a.href = src;
        a.download = src.split("/").pop() || `imagem-${index + 1}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, order * 250);
    });
  }

  function downloadSelected() {
    const indices = Array.from(state.selected);

    if (!indices.length) {
      downloadList([state.current]);
      return;
    }

    downloadList(indices);
  }

  function openCurrent() {
    const src = state.images[state.current];
    if (src) window.open(src, "_blank");
  }

  async function shareCurrent() {
    const src = state.images[state.current];
    if (!src) return;

    const url = new URL(src, window.location.href).href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: state.title,
          text: state.title,
          url
        });
        return;
      } catch (_) {}
    }

    try {
      await navigator.clipboard.writeText(url);
      alert("Link copiado.");
    } catch (_) {
      window.open(url, "_blank");
    }
  }

  document.addEventListener("click", function (event) {
    if (event.target.closest("#gpOverlay")) return;

    const found = findCorrectCard(event.target);
    if (!found) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const title = getTitle(found.card, found.app);
    openGallery(found.app, title);
  }, true);

  window.openGallery = function (title) {
    const apps = detectApps(title);
    openGallery(apps[0] || "instagram", title);
  };

  window.openPremiumGallery = window.openGallery;
  window.openPrintGallery = window.openGallery;
  window.openLessonGallery = window.openGallery;
})();
