(function () {
  const state = {
    images: [],
    index: 0,
    selected: new Set(),
    zoom: 1,
    x: 0,
    y: 0,
    dragging: false,
    sx: 0,
    sy: 0,
    ox: 0,
    oy: 0,
    raf: null
  };

  function norm(v) {
    return String(v || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function titleCase(v) {
    return String(v || "")
      .replace(/\.(png|jpe?g|webp)$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function manifest() {
    return Array.isArray(window.PREMIUM_GALLERY_MANIFEST)
      ? window.PREMIUM_GALLERY_MANIFEST
      : [];
  }

  function aliases(key) {
    const k = norm(key);

    if (k.includes("instagram") || k.includes("insta")) {
      return ["instagram", "insta", "perfil", "bio", "stories", "insights", "reels"];
    }

    if (k.includes("canva")) {
      return ["canva", "design", "visual", "carrossel", "post", "capa"];
    }

    if (k.includes("capcut")) {
      return ["capcut", "video", "edicao", "corte", "legenda", "zoom", "ritmo"];
    }

    if (k.includes("ia") || k.includes("prompt")) {
      return ["ia", "prompt", "roteiro", "ideia", "ai"];
    }

    return k.split(" ").filter(Boolean);
  }

  function currentLessonTokens() {
    const params = new URLSearchParams(location.search);
    const m = Number(params.get("m") || 0) + 1;
    const l = Number(params.get("l") || 0) + 1;

    return {
      m,
      l,
      module: [
        `modulo${String(m).padStart(2, "0")}`,
        `modulo ${String(m).padStart(2, "0")}`,
        `modulo${m}`,
        `modulo ${m}`
      ],
      lesson: [
        `aula${String(l).padStart(2, "0")}`,
        `aula ${String(l).padStart(2, "0")}`,
        `aula${l}`,
        `aula ${l}`
      ]
    };
  }

  function imagesByKey(key) {
    const list = manifest();
    const a = aliases(key);
    const lesson = currentLessonTokens();

    const scored = list.map(src => {
      const n = norm(src);
      let score = 0;

      if (a.some(x => n.includes(norm(x)))) score += 90;
      if (lesson.lesson.some(x => n.includes(norm(x)))) score += 40;
      if (lesson.module.some(x => n.includes(norm(x)))) score += 25;
      if (n.includes("print")) score += 8;

      if (n.includes("backup")) score -= 300;
      if (n.includes("logo") || n.includes("icon")) score -= 100;

      return { src, score };
    });

    let chosen = scored
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.src);

    if (chosen.length < 4) {
      chosen = chosen.concat(
        list.filter(src => !norm(src).includes("backup"))
      );
    }

    const seen = new Set();

    chosen = chosen.filter(src => {
      if (!src || seen.has(src)) return false;
      seen.add(src);
      return true;
    }).slice(0, 4);

    return chosen.map((src, i) => ({
      src,
      title: titleCase(src.split("/").pop() || `Imagem ${i + 1}`)
    }));
  }

  function makeModal() {
    let overlay = document.getElementById("finalGalleryOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "finalGalleryOverlay";
    overlay.className = "final-gallery-overlay";

    overlay.innerHTML = `
      <div class="final-gallery-shell">
        <header class="final-gallery-header">
          <div>
            <div class="final-gallery-kicker" id="fgKicker">Galeria</div>
            <h2 class="final-gallery-title" id="fgTitle">Galeria premium</h2>
            <div class="final-gallery-subtitle">
              Duplo clique na imagem para ampliar. Com zoom, clique e arraste para mover sem perder definição.
            </div>
          </div>

          <div class="final-gallery-actions">
            <button class="final-gallery-btn" id="fgZoomOut" type="button">−</button>
            <button class="final-gallery-btn" id="fgZoomIn" type="button">+</button>
            <button class="final-gallery-btn" id="fgReset" type="button">100%</button>
            <button class="final-gallery-btn" id="fgShare" type="button">Compartilhar</button>
            <button class="final-gallery-btn primary" id="fgDownload" type="button">Baixar</button>
            <button class="final-gallery-btn close" id="fgClose" type="button">×</button>
          </div>
        </header>

        <main class="final-gallery-body">
          <section class="final-gallery-main">
            <button class="final-gallery-nav" id="fgPrev" type="button">‹</button>

            <div class="final-gallery-stage" id="fgStage">
              <img class="final-gallery-image" id="fgImage" draggable="false">
              <div class="final-gallery-zoom" id="fgZoomBadge">100%</div>
            </div>

            <button class="final-gallery-nav" id="fgNext" type="button">›</button>
          </section>

          <aside class="final-gallery-side">
            <h3>Imagens da galeria</h3>
            <p>Clique na miniatura para destacar. Use o círculo para selecionar mais de uma imagem.</p>
            <div class="final-gallery-thumbs" id="fgThumbs"></div>

            <div class="final-gallery-side-actions">
              <button class="final-gallery-btn" id="fgSelectAll" type="button">Selecionar todas</button>
              <button class="final-gallery-btn" id="fgClear" type="button">Limpar seleção</button>
              <button class="final-gallery-btn primary" id="fgDownloadSelected" type="button">Baixar selecionadas</button>
              <button class="final-gallery-btn" id="fgDownloadAll" type="button">Baixar as 4</button>
            </div>
          </aside>
        </main>

        <footer class="final-gallery-footer">
          <div><strong>Atalhos:</strong> setas navegam · ESC fecha · duplo clique amplia · arraste move com zoom</div>
          <div id="fgCounter">1/4</div>
        </footer>
      </div>
    `;

    document.body.appendChild(overlay);
    bind();
    return overlay;
  }

  function el(id) {
    return document.getElementById(id);
  }

  function bind() {
    el("fgClose").onclick = close;
    el("fgPrev").onclick = () => move(-1);
    el("fgNext").onclick = () => move(1);
    el("fgZoomIn").onclick = () => setZoom(state.zoom + .35);
    el("fgZoomOut").onclick = () => setZoom(state.zoom - .35);
    el("fgReset").onclick = reset;
    el("fgDownload").onclick = () => download(state.index);
    el("fgDownloadSelected").onclick = downloadSelected;
    el("fgDownloadAll").onclick = downloadAll;
    el("fgShare").onclick = shareCurrent;

    el("fgSelectAll").onclick = () => {
      state.images.forEach((_, i) => state.selected.add(i));
      render();
    };

    el("fgClear").onclick = () => {
      state.selected.clear();
      render();
    };

    el("fgStage").ondblclick = () => {
      state.zoom <= 1 ? setZoom(2.6) : reset();
    };

    el("fgStage").onwheel = e => {
      e.preventDefault();
      setZoom(state.zoom + (e.deltaY > 0 ? -.25 : .25));
    };

    el("fgImage").onpointerdown = e => {
      if (state.zoom <= 1) return;

      state.dragging = true;
      state.sx = e.clientX;
      state.sy = e.clientY;
      state.ox = state.x;
      state.oy = state.y;

      el("fgImage").classList.add("dragging");
      try { el("fgImage").setPointerCapture(e.pointerId); } catch (_) {}
    };

    window.addEventListener("pointermove", e => {
      if (!state.dragging) return;

      state.x = state.ox + e.clientX - state.sx;
      state.y = state.oy + e.clientY - state.sy;

      apply();
    });

    window.addEventListener("pointerup", () => {
      state.dragging = false;
      const img = el("fgImage");
      if (img) img.classList.remove("dragging");
    });

    window.addEventListener("keydown", e => {
      const overlay = el("finalGalleryOverlay");
      if (!overlay || !overlay.classList.contains("is-open")) return;

      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "+") setZoom(state.zoom + .35);
      if (e.key === "-") setZoom(state.zoom - .35);
      if (e.key === "0") reset();
    });
  }

  function closeOldModals() {
    document.querySelectorAll(".pgx-overlay,.pg-modal,.album-modal,.gallery-modal,.lightbox,.image-modal,.prints-modal,.modal").forEach(m => {
      if (m.id !== "finalGalleryOverlay") {
        m.style.display = "none";
        m.classList.remove("is-open", "pg-show", "show", "active");
      }
    });
  }

  function openGallery(payload, maybeImages) {
    closeOldModals();
    makeModal();

    let title = "Galeria premium";
    let key = "";

    if (typeof payload === "string") {
      title = payload;
      key = payload;
    }

    if (payload && typeof payload === "object") {
      title = payload.title || title;
      key = payload.key || payload.title || "";
    }

    let imgs = [];

    if (Array.isArray(maybeImages)) {
      imgs = maybeImages
        .map((x, i) => typeof x === "string" ? { src: x, title: `Imagem ${i + 1}` } : x)
        .filter(x => x && x.src);
    }

    if (!imgs.length && payload && typeof payload === "object" && Array.isArray(payload.images)) {
      imgs = payload.images
        .map((x, i) => typeof x === "string" ? { src: x, title: `Imagem ${i + 1}` } : x)
        .filter(x => x && x.src);
    }

    if (!imgs.length) {
      imgs = imagesByKey(key || title);
    }

    if (!imgs.length) return;

    state.images = imgs.slice(0, 4);
    state.index = 0;
    state.selected = new Set([0]);

    el("fgTitle").textContent = title;
    el("fgKicker").textContent = (key || title).split(" ")[0] || "Galeria";

    load();
    render();

    el("finalGalleryOverlay").classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function load() {
    const item = state.images[state.index];
    if (!item) return;

    const img = el("fgImage");

    img.src = item.src;
    img.alt = item.title || `Imagem ${state.index + 1}`;

    el("fgCounter").textContent = `${state.index + 1}/${state.images.length}`;

    reset();
  }

  function render() {
    const thumbs = el("fgThumbs");
    thumbs.innerHTML = "";

    state.images.forEach((item, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "final-gallery-thumb" +
        (i === state.index ? " active" : "") +
        (state.selected.has(i) ? " selected" : "");

      btn.innerHTML = `
        <img src="${item.src}" alt="${item.title || `Imagem ${i + 1}`}">
        <span class="final-gallery-select-dot">${state.selected.has(i) ? "✓" : "+"}</span>
      `;

      btn.onclick = e => {
        if (e.target.classList.contains("final-gallery-select-dot")) {
          e.preventDefault();
          e.stopPropagation();

          if (state.selected.has(i)) state.selected.delete(i);
          else state.selected.add(i);

          render();
          return;
        }

        state.index = i;
        if (!state.selected.has(i)) state.selected.add(i);

        load();
        render();
      };

      thumbs.appendChild(btn);
    });
  }

  function apply() {
    if (state.raf) cancelAnimationFrame(state.raf);

    state.raf = requestAnimationFrame(() => {
      const img = el("fgImage");

      img.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.zoom})`;
      img.classList.toggle("zoomed", state.zoom > 1);

      el("fgZoomBadge").textContent = `${Math.round(state.zoom * 100)}%`;
      el("fgReset").textContent = `${Math.round(state.zoom * 100)}%`;
    });
  }

  function reset() {
    state.zoom = 1;
    state.x = 0;
    state.y = 0;
    apply();
  }

  function setZoom(v) {
    state.zoom = Math.max(1, Math.min(6, v));

    if (state.zoom <= 1) {
      state.zoom = 1;
      state.x = 0;
      state.y = 0;
    }

    apply();
  }

  function move(dir) {
    state.index = (state.index + dir + state.images.length) % state.images.length;
    if (!state.selected.has(state.index)) state.selected.add(state.index);
    load();
    render();
  }

  function close() {
    el("finalGalleryOverlay").classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function fileName(item, i) {
    const clean = (item.title || `imagem-${i + 1}`)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const extMatch = String(item.src).split("?")[0].match(/\.(png|jpe?g|webp)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase().replace("jpeg", "jpg") : "png";

    return `${clean || "imagem"}-${i + 1}.${ext}`;
  }

  function download(i) {
    const item = state.images[i];
    if (!item) return;

    const a = document.createElement("a");
    a.href = item.src;
    a.download = fileName(item, i);
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadSelected() {
    const list = Array.from(state.selected);

    if (!list.length) {
      download(state.index);
      return;
    }

    list.forEach((i, k) => setTimeout(() => download(i), k * 250));
  }

  function downloadAll() {
    state.images.forEach((_, i) => setTimeout(() => download(i), i * 250));
  }

  async function shareCurrent() {
    const item = state.images[state.index];
    if (!item) return;

    const absoluteUrl = new URL(item.src, window.location.href).href;
    const title = item.title || "Imagem da galeria";

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: "Imagem da aula - Influencer Academy",
          url: absoluteUrl
        });
        return;
      } catch (_) {}
    }

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      alert("Link da imagem copiado para a área de transferência.");
    } catch (_) {
      window.open(absoluteUrl, "_blank");
    }
  }

  function guessKeyFromCard(card) {
    const text = norm(card.textContent || "");

    if (text.includes("instagram")) return "Instagram - aplicação prática";
    if (text.includes("canva")) return "Canva - modelo visual";
    if (text.includes("capcut")) return "CapCut - vídeo passo a passo";
    if (text.includes("ia") || text.includes("prompt")) return "IA - prompt da aula";

    return card.textContent.trim().split("\n")[0] || "Galeria premium";
  }

  document.addEventListener("click", function (e) {
    const card = e.target.closest("[onclick*='Gallery'],[onclick*='gallery'],[data-gallery],[data-images],.album-card,.print-card,.print-album,.lesson-print-card,.gallery-card");
    if (!card) return;

    const text = norm(card.textContent || "");

    if (!(text.includes("instagram") || text.includes("canva") || text.includes("capcut") || text.includes("ia") || text.includes("prompt"))) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    openGallery(guessKeyFromCard(card));
  }, true);

  window.openGallery = openGallery;
  window.openPremiumGallery = openGallery;
  window.openPrintGallery = openGallery;
  window.openLessonGallery = openGallery;
  window.showPremiumGallery = openGallery;
  window.openAlbumGallery = openGallery;
  window.openPrintAlbum = openGallery;
  window.openToolGallery = openGallery;

  document.addEventListener("DOMContentLoaded", makeModal);
})();
