(function () {
  const state = {
    images: [],
    currentIndex: 0,
    selected: new Set(),
    zoom: 1,
    panX: 0,
    panY: 0,
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    raf: null
  };

  let els = {};

  function norm(v) {
    return String(v || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function esc(v) {
    return String(v || "").replace(/[&<>"']/g, m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));
  }

  function isImgPath(v) {
    const s = String(v || "").trim();
    return /^(https?:|data:|blob:|\.\/|\/|assets\/|img\/|images\/)/i.test(s) ||
      /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(s);
  }

  function currentLessonInfo() {
    const params = new URLSearchParams(location.search);
    const m = Number(params.get("m") || 0) + 1;
    const l = Number(params.get("l") || 0) + 1;

    return {
      m,
      l,
      moduleTokens: [
        `modulo${String(m).padStart(2, "0")}`,
        `modulo ${String(m).padStart(2, "0")}`,
        `modulo${m}`,
        `modulo ${m}`,
        `module${m}`,
        `module ${m}`
      ],
      lessonTokens: [
        `aula${String(l).padStart(2, "0")}`,
        `aula ${String(l).padStart(2, "0")}`,
        `aula${l}`,
        `aula ${l}`,
        `lesson${l}`,
        `lesson ${l}`
      ]
    };
  }

  function aliasesFor(key) {
    const k = norm(key);

    if (k.includes("instagram") || k.includes("insta")) {
      return ["instagram", "insta", "perfil", "bio", "stories", "insights", "reels"];
    }

    if (k.includes("canva")) {
      return ["canva", "design", "visual", "carrossel", "post", "capa"];
    }

    if (k.includes("capcut")) {
      return ["capcut", "video", "edicao", "corte", "cortes", "legenda", "zoom"];
    }

    if (k === "ia" || k.includes("prompt") || k.includes("inteligencia")) {
      return ["ia", "ai", "prompt", "roteiro", "ideia", "criatividade"];
    }

    return k.split(" ").filter(Boolean);
  }

  function titleFromPath(src, index) {
    const file = String(src || "").split("/").pop() || `Imagem ${index + 1}`;

    return file
      .replace(/\.(png|jpe?g|webp|gif|avif)$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function getManifest() {
    return Array.isArray(window.PREMIUM_GALLERY_MANIFEST)
      ? window.PREMIUM_GALLERY_MANIFEST.filter(Boolean)
      : [];
  }

  function unique(list) {
    const seen = new Set();

    return list.filter(item => {
      const src = typeof item === "string" ? item : item.src;
      if (!src || seen.has(src)) return false;
      seen.add(src);
      return true;
    });
  }

  function findImagesByKey(key) {
    const manifest = getManifest();
    const info = currentLessonInfo();
    const aliases = aliasesFor(key);

    if (!manifest.length) return [];

    const scored = manifest.map(src => {
      const n = norm(src);
      let score = 0;

      if (aliases.some(a => n.includes(norm(a)))) score += 60;
      if (info.lessonTokens.some(t => n.includes(norm(t)))) score += 35;
      if (info.moduleTokens.some(t => n.includes(norm(t)))) score += 25;
      if (n.includes("print")) score += 5;
      if (n.includes("backup")) score -= 100;
      if (n.includes("logo")) score -= 20;
      if (n.includes("icon")) score -= 20;

      return { src, score };
    });

    let result = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.src);

    if (result.length < 4) {
      const lessonImgs = scored
        .filter(item => info.lessonTokens.some(t => norm(item.src).includes(norm(t))))
        .sort((a, b) => b.score - a.score)
        .map(item => item.src);

      result = result.concat(lessonImgs);
    }

    if (result.length < 4) {
      result = result.concat(
        manifest.filter(src => !norm(src).includes("backup"))
      );
    }

    result = unique(result).slice(0, 4);

    return result.map((src, index) => ({
      src,
      title: titleFromPath(src, index),
      description: `Print ${index + 1} da aula`
    }));
  }

  function normalizeImages(input, key) {
    if (!input) return findImagesByKey(key);

    if (Array.isArray(input)) {
      const result = input.map((item, index) => {
        if (!item) return null;

        if (typeof item === "string") {
          if (!isImgPath(item)) return null;
          return {
            src: item,
            title: `Imagem ${index + 1}`,
            description: ""
          };
        }

        const src =
          item.src ||
          item.url ||
          item.image ||
          item.imageUrl ||
          item.path ||
          item.file ||
          item.full ||
          item.large ||
          item.thumb ||
          item.thumbnail ||
          "";

        if (!src || !isImgPath(src)) return null;

        return {
          src,
          title: item.title || item.name || item.label || `Imagem ${index + 1}`,
          description: item.description || item.subtitle || ""
        };
      }).filter(Boolean);

      return result.length ? result.slice(0, 4) : findImagesByKey(key);
    }

    if (typeof input === "object") {
      return normalizeImages(input.images || input.items || input.prints || input.gallery || [input], input.title || key);
    }

    if (typeof input === "string") {
      const raw = input.trim();

      try {
        const parsed = JSON.parse(raw);
        return normalizeImages(parsed, key);
      } catch (_) {}

      if (raw.includes(",") && raw.split(",").some(isImgPath)) {
        return normalizeImages(raw.split(",").map(s => s.trim()), key);
      }

      if (isImgPath(raw)) {
        return [{ src: raw, title: "Imagem 1", description: "" }];
      }

      return findImagesByKey(raw || key);
    }

    return findImagesByKey(key);
  }

  function ensureModal() {
    if (document.getElementById("pgxOverlay")) {
      cache();
      return;
    }

    document.body.insertAdjacentHTML("beforeend", `
      <div class="pgx-overlay" id="pgxOverlay">
        <div class="pgx-shell">
          <div class="pgx-topbar">
            <div>
              <div class="pgx-kicker">Imagem da galeria</div>
              <h2 class="pgx-title" id="pgxTitle">Galeria</h2>
              <div class="pgx-subtitle" id="pgxSubtitle">Clique em uma miniatura para ampliar.</div>
            </div>

            <div class="pgx-toolbar">
              <button class="pgx-btn small" id="pgxZoomOut" type="button">−</button>
              <button class="pgx-btn small" id="pgxZoomIn" type="button">+</button>
              <button class="pgx-btn" id="pgxReset" type="button">100%</button>
              <button class="pgx-btn" id="pgxOpen" type="button">Abrir</button>
              <button class="pgx-btn is-primary" id="pgxDownloadCurrent" type="button">Baixar</button>
              <button class="pgx-btn is-danger small" id="pgxClose" type="button">×</button>
            </div>
          </div>

          <div class="pgx-body">
            <div class="pgx-viewer">
              <button class="pgx-nav" id="pgxPrev" type="button">‹</button>

              <div class="pgx-stage" id="pgxStage">
                <img id="pgxImage" class="pgx-image" alt="Imagem da galeria" draggable="false">
                <div class="pgx-stage-badge" id="pgxZoomBadge">100%</div>
              </div>

              <button class="pgx-nav" id="pgxNext" type="button">›</button>
            </div>

            <aside class="pgx-side">
              <h3>Imagens da galeria</h3>
              <p>As 4 miniaturas ficam visíveis. Clique para destacar, ou selecione para baixar.</p>

              <div class="pgx-thumb-grid" id="pgxThumbGrid"></div>

              <div class="pgx-side-actions">
                <button class="pgx-btn is-soft" id="pgxSelectAll" type="button">Selecionar todas</button>
                <button class="pgx-btn" id="pgxClearSelected" type="button">Limpar seleção</button>
                <button class="pgx-btn is-primary" id="pgxDownloadSelected" type="button">Baixar selecionadas</button>
                <button class="pgx-btn" id="pgxDownloadAll" type="button">Baixar as 4</button>
              </div>
            </aside>
          </div>

          <div class="pgx-footer">
            <div><strong>Atalhos:</strong> duplo clique amplia · clique e arraste move · setas navegam · ESC fecha</div>
            <div class="pgx-counter" id="pgxCounter">1/4</div>
          </div>
        </div>
      </div>
    `);

    cache();
    bind();
  }

  function cache() {
    els.overlay = document.getElementById("pgxOverlay");
    els.title = document.getElementById("pgxTitle");
    els.subtitle = document.getElementById("pgxSubtitle");
    els.image = document.getElementById("pgxImage");
    els.stage = document.getElementById("pgxStage");
    els.badge = document.getElementById("pgxZoomBadge");
    els.counter = document.getElementById("pgxCounter");
    els.thumbs = document.getElementById("pgxThumbGrid");
  }

  function bind() {
    document.getElementById("pgxClose").onclick = close;
    document.getElementById("pgxPrev").onclick = () => move(-1);
    document.getElementById("pgxNext").onclick = () => move(1);
    document.getElementById("pgxZoomIn").onclick = () => setZoom(state.zoom + .25);
    document.getElementById("pgxZoomOut").onclick = () => setZoom(state.zoom - .25);
    document.getElementById("pgxReset").onclick = reset;
    document.getElementById("pgxOpen").onclick = openCurrent;
    document.getElementById("pgxDownloadCurrent").onclick = () => download(state.currentIndex);
    document.getElementById("pgxDownloadSelected").onclick = downloadSelected;
    document.getElementById("pgxDownloadAll").onclick = downloadAll;

    document.getElementById("pgxSelectAll").onclick = () => {
      state.selected = new Set(state.images.map((_, i) => i));
      renderThumbs();
    };

    document.getElementById("pgxClearSelected").onclick = () => {
      state.selected.clear();
      renderThumbs();
    };

    els.overlay.onclick = e => {
      if (e.target === els.overlay) close();
    };

    els.stage.ondblclick = () => {
      if (state.zoom <= 1) setZoom(2.2);
      else reset();
    };

    els.stage.onwheel = e => {
      e.preventDefault();
      setZoom(state.zoom + (e.deltaY > 0 ? -.2 : .2));
    };

    els.stage.onpointerdown = e => {
      if (state.zoom <= 1) return;

      state.dragging = true;
      state.startX = e.clientX;
      state.startY = e.clientY;
      state.originX = state.panX;
      state.originY = state.panY;
      els.image.classList.add("is-dragging");
    };

    window.addEventListener("pointermove", e => {
      if (!state.dragging) return;

      state.panX = state.originX + (e.clientX - state.startX);
      state.panY = state.originY + (e.clientY - state.startY);
      apply();
    });

    window.addEventListener("pointerup", () => {
      state.dragging = false;
      els.image.classList.remove("is-dragging");
    });

    window.addEventListener("keydown", e => {
      if (!els.overlay.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    });
  }

  function apply() {
    if (state.raf) cancelAnimationFrame(state.raf);

    state.raf = requestAnimationFrame(() => {
      els.image.style.transform = `translate3d(${state.panX}px, ${state.panY}px, 0) scale(${state.zoom})`;
      els.badge.textContent = `${Math.round(state.zoom * 100)}%`;
      document.getElementById("pgxReset").textContent = `${Math.round(state.zoom * 100)}%`;
    });
  }

  function reset() {
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    apply();
  }

  function setZoom(v) {
    state.zoom = Math.max(1, Math.min(4, v));

    if (state.zoom <= 1) {
      state.panX = 0;
      state.panY = 0;
    }

    apply();
  }

  function move(dir) {
    if (!state.images.length) return;
    state.currentIndex = (state.currentIndex + dir + state.images.length) % state.images.length;
    loadCurrent();
  }

  function loadCurrent() {
    const item = state.images[state.currentIndex];
    if (!item) return;

    els.image.src = item.src;
    els.image.alt = item.title || `Imagem ${state.currentIndex + 1}`;

    els.title.textContent = item.title || `Imagem ${state.currentIndex + 1}`;
    els.subtitle.textContent = item.description || "Clique em uma miniatura para ampliar.";
    els.counter.textContent = `${state.currentIndex + 1}/${state.images.length}`;

    reset();
    renderThumbs();
  }

  function renderThumbs() {
    els.thumbs.innerHTML = state.images.map((img, i) => `
      <button class="pgx-thumb ${i === state.currentIndex ? "is-active" : ""} ${state.selected.has(i) ? "is-selected" : ""}" data-i="${i}" type="button">
        <img src="${esc(img.src)}" alt="${esc(img.title || `Imagem ${i + 1}`)}">
        <span class="pgx-thumb-check">${state.selected.has(i) ? "✓" : "+"}</span>
      </button>
    `).join("");

    els.thumbs.querySelectorAll(".pgx-thumb").forEach(btn => {
      btn.onclick = e => {
        const i = Number(btn.dataset.i);

        if (e.target.classList.contains("pgx-thumb-check")) {
          if (state.selected.has(i)) state.selected.delete(i);
          else state.selected.add(i);
          renderThumbs();
          return;
        }

        state.currentIndex = i;
        loadCurrent();
      };
    });
  }

  function filename(item, i) {
    const ext = (String(item.src).split(".").pop() || "png").split("?")[0];
    const base = norm(item.title || `imagem-${i + 1}`).replace(/\s+/g, "-") || `imagem-${i + 1}`;
    return `${base}-${i + 1}.${ext}`;
  }

  function download(i) {
    const item = state.images[i];
    if (!item) return;

    const a = document.createElement("a");
    a.href = item.src;
    a.download = filename(item, i);
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadSelected() {
    const list = Array.from(state.selected);
    if (!list.length) return download(state.currentIndex);
    list.forEach((i, idx) => setTimeout(() => download(i), idx * 250));
  }

  function downloadAll() {
    state.images.forEach((_, i) => setTimeout(() => download(i), i * 250));
  }

  function openCurrent() {
    const item = state.images[state.currentIndex];
    if (item) window.open(item.src, "_blank");
  }

  function close() {
    els.overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function openGallery(payload, maybeImages, maybeSubtitle) {
    ensureModal();

    let title = "Galeria da aula";
    let subtitle = "Clique em uma miniatura para ampliar.";
    let images = [];

    if (typeof payload === "object" && payload && payload.images) {
      title = payload.title || title;
      subtitle = payload.subtitle || subtitle;
      images = normalizeImages(payload.images, title);
    } else if (typeof payload === "string" && maybeImages) {
      title = payload;
      subtitle = maybeSubtitle || subtitle;
      images = normalizeImages(maybeImages, payload);
    } else if (typeof payload === "string") {
      title = payload;
      images = normalizeImages(payload, payload);
    } else {
      images = normalizeImages(payload, title);
    }

    if (!images.length) {
      images = findImagesByKey(title);
    }

    if (!images.length) {
      console.warn("Galeria sem imagens encontradas.");
      return;
    }

    state.images = images.slice(0, 4);
    state.currentIndex = 0;
    state.selected = new Set([0]);

    renderThumbs();
    loadCurrent();

    els.overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  window.openGallery = openGallery;
  window.openPremiumGallery = openGallery;
  window.openPrintGallery = openGallery;
  window.openLessonGallery = openGallery;
  window.showPremiumGallery = openGallery;
  window.openAlbumGallery = openGallery;
  window.openPrintAlbum = openGallery;
  window.openToolGallery = openGallery;

  document.addEventListener("DOMContentLoaded", ensureModal);
})();
