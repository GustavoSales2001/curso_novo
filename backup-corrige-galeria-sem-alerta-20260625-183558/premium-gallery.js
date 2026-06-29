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

  function escapeHtml(v) {
    return String(v || "").replace(/[&<>"']/g, m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));
  }

  function looksLikeImagePath(v) {
    const s = String(v || "").trim();
    return /^(https?:|data:|blob:|\.\/|\/|assets\/|img\/|images\/)/i.test(s) || /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(s);
  }

  function aulaTokens() {
    const params = new URLSearchParams(location.search);
    const m = Number(params.get("m") || 0) + 1;
    const l = Number(params.get("l") || 0) + 1;

    const mm = String(m).padStart(2, "0");
    const ll = String(l).padStart(2, "0");

    return {
      module: m,
      lesson: l,
      moduleTokens: [`modulo${mm}`, `modulo-${mm}`, `modulo_${mm}`, `modulo${m}`, `modulo-${m}`, `modulo_${m}`],
      lessonTokens: [`aula${ll}`, `aula-${ll}`, `aula_${ll}`, `aula${l}`, `aula-${l}`, `aula_${l}`]
    };
  }

  function aliasesFor(key) {
    const k = norm(key);

    if (k.includes("instagram") || k.includes("insta")) return ["instagram", "insta", "perfil", "stories", "insights", "reels"];
    if (k.includes("canva")) return ["canva", "design", "visual", "carrossel", "post", "capa"];
    if (k.includes("capcut")) return ["capcut", "video", "edicao", "cortes", "legenda", "zoom"];
    if (k === "ia" || k.includes("prompt") || k.includes("inteligencia")) return ["ia", "ai", "prompt", "roteiro", "ideia"];

    return k ? k.split(" ").filter(Boolean) : [];
  }

  function titleFromPath(path, index) {
    const file = String(path || "").split("/").pop() || `Imagem ${index + 1}`;
    return file
      .replace(/\.(png|jpe?g|webp|gif|avif)$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function imagesFromManifest(key) {
    const manifest = Array.isArray(window.PREMIUM_GALLERY_MANIFEST) ? window.PREMIUM_GALLERY_MANIFEST : [];
    const info = aulaTokens();

    if (!manifest.length) return [];

    const normalized = manifest.map(src => ({
      src,
      n: norm(src)
    }));

    let aulaImgs = normalized.filter(item => {
      const hasModule = info.moduleTokens.some(t => item.n.includes(norm(t)));
      const hasLesson = info.lessonTokens.some(t => item.n.includes(norm(t)));
      return hasModule && hasLesson;
    });

    if (!aulaImgs.length) {
      aulaImgs = normalized.filter(item => {
        const hasLesson = info.lessonTokens.some(t => item.n.includes(norm(t)));
        return hasLesson;
      });
    }

    let result = aulaImgs;

    const aliases = aliasesFor(key);
    if (aliases.length) {
      const filtered = aulaImgs.filter(item => aliases.some(a => item.n.includes(norm(a))));
      if (filtered.length >= 2) result = filtered;
    }

    if (!result.length) {
      result = normalized.filter(item => aliases.some(a => item.n.includes(norm(a))));
    }

    if (!result.length) {
      result = aulaImgs;
    }

    if (!result.length) {
      result = normalized;
    }

    return result.slice(0, 4).map((item, index) => ({
      src: item.src,
      title: titleFromPath(item.src, index),
      description: `Imagem ${index + 1} da aula ${info.lesson}`
    }));
  }

  function normalizeImages(input, titleKey) {
    if (!input) return imagesFromManifest(titleKey);

    if (Array.isArray(input)) {
      const arr = input.map((item, index) => {
        if (!item) return null;

        if (typeof item === "string") {
          if (!looksLikeImagePath(item)) return null;
          return {
            src: item,
            title: `Imagem ${index + 1}`
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
          item.fullSrc ||
          item.large ||
          item.thumb ||
          item.thumbnail ||
          "";

        if (!src) return null;

        return {
          src,
          title: item.title || item.name || item.label || `Imagem ${index + 1}`,
          description: item.description || item.subtitle || ""
        };
      }).filter(Boolean);

      return arr.length ? arr.slice(0, 4) : imagesFromManifest(titleKey);
    }

    if (typeof input === "object") {
      if (input.images || input.items || input.prints || input.gallery) {
        return normalizeImages(input.images || input.items || input.prints || input.gallery, input.title || titleKey);
      }

      return normalizeImages([input], titleKey);
    }

    if (typeof input === "string") {
      const raw = input.trim();

      if (!raw) return imagesFromManifest(titleKey);

      try {
        const parsed = JSON.parse(raw);
        return normalizeImages(parsed, titleKey);
      } catch (_) {}

      if (raw.includes(",") && raw.split(",").some(looksLikeImagePath)) {
        return normalizeImages(raw.split(",").map(s => s.trim()), titleKey);
      }

      if (looksLikeImagePath(raw)) {
        return [{ src: raw, title: "Imagem 1" }];
      }

      return imagesFromManifest(raw || titleKey);
    }

    return imagesFromManifest(titleKey);
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
              <button class="pgx-btn small" id="pgxZoomOut">−</button>
              <button class="pgx-btn small" id="pgxZoomIn">+</button>
              <button class="pgx-btn" id="pgxReset">100%</button>
              <button class="pgx-btn" id="pgxOpen">Abrir</button>
              <button class="pgx-btn is-primary" id="pgxDownloadCurrent">Baixar</button>
              <button class="pgx-btn is-danger small" id="pgxClose">×</button>
            </div>
          </div>

          <div class="pgx-body">
            <div class="pgx-viewer">
              <button class="pgx-nav" id="pgxPrev">‹</button>

              <div class="pgx-stage" id="pgxStage">
                <img id="pgxImage" class="pgx-image" alt="Imagem da galeria" draggable="false">
                <div class="pgx-stage-badge" id="pgxZoomBadge">100%</div>
              </div>

              <button class="pgx-nav" id="pgxNext">›</button>
            </div>

            <aside class="pgx-side">
              <h3>Imagens da galeria</h3>
              <p>As 4 miniaturas ficam visíveis. Clique para destacar, ou selecione para baixar.</p>

              <div class="pgx-thumb-grid" id="pgxThumbGrid"></div>

              <div class="pgx-side-actions">
                <button class="pgx-btn is-soft" id="pgxSelectAll">Selecionar todas</button>
                <button class="pgx-btn" id="pgxClearSelected">Limpar seleção</button>
                <button class="pgx-btn is-primary" id="pgxDownloadSelected">Baixar selecionadas</button>
                <button class="pgx-btn" id="pgxDownloadAll">Baixar as 4</button>
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

    els.image.onerror = () => {
      const fallback = imagesFromManifest("");
      if (fallback.length && fallback[0].src !== item.src) {
        state.images = fallback;
        state.currentIndex = 0;
        renderThumbs();
        loadCurrent();
      }
    };

    els.image.src = item.src;
    els.image.alt = item.title || `Imagem ${state.currentIndex + 1}`;

    els.title.textContent = item.title || `Imagem ${state.currentIndex + 1}`;
    els.subtitle.textContent = item.description || "Clique em uma miniatura para ampliar.";

    els.counter.textContent = `${state.currentIndex + 1}/${state.images.length}`;
    reset();
    renderThumbs();
  }

  function renderThumbs() {
    els.thumbs.innerHTML = state.images.map((img, i) => {
      const active = i === state.currentIndex ? "is-active" : "";
      const selected = state.selected.has(i) ? "is-selected" : "";

      return `
        <button class="pgx-thumb ${active} ${selected}" data-i="${i}" type="button">
          <img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.title || `Imagem ${i + 1}`)}">
          <span class="pgx-thumb-check">${state.selected.has(i) ? "✓" : "+"}</span>
        </button>
      `;
    }).join("");

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
      images = imagesFromManifest("");
    }

    if (!images.length) {
      alert("Não encontrei imagens para esta aula. Verifique se existem PNGs em assets/prints.");
      return;
    }

    state.images = images.slice(0, 4);
    state.currentIndex = 0;
    state.selected = new Set([0]);

    els.title.textContent = title;
    els.subtitle.textContent = subtitle;

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

  document.addEventListener("DOMContentLoaded", ensureModal);
})();
