(function () {
  const state = {
    images: [],
    index: 0,
    selected: new Set(),
    zoom: 1,
    x: 0,
    y: 0,
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    raf: null
  };

  const $ = (id) => document.getElementById(id);

  function norm(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function manifest() {
    return Array.isArray(window.PREMIUM_GALLERY_MANIFEST)
      ? window.PREMIUM_GALLERY_MANIFEST
      : [];
  }

  function titleCase(value) {
    return String(value || "Imagem")
      .replace(/\.(png|jpe?g|webp)$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function lessonTokens() {
    const params = new URLSearchParams(location.search);
    const m = Number(params.get("m") || 0) + 1;
    const l = Number(params.get("l") || 0) + 1;

    return {
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

  function extractImagesFromText(text) {
    const matches = String(text || "").match(/(?:assets|img|images|prints)[^"'()\s]+\.(?:png|jpe?g|webp)/gi);
    return matches || [];
  }

  function imagesFromKey(key, extraText) {
    const list = manifest();
    const a = aliases(key);
    const t = lessonTokens();

    const direct = extractImagesFromText(extraText || "");
    if (direct.length >= 4) {
      return direct.slice(0, 4).map((src, i) => ({
        src,
        title: titleCase(src.split("/").pop() || `Imagem ${i + 1}`)
      }));
    }

    const scored = list.map(src => {
      const n = norm(src);
      let score = 0;

      if (a.some(x => n.includes(norm(x)))) score += 100;
      if (t.lesson.some(x => n.includes(norm(x)))) score += 55;
      if (t.module.some(x => n.includes(norm(x)))) score += 30;
      if (n.includes("print")) score += 8;

      if (n.includes("backup")) score -= 500;
      if (n.includes("logo") || n.includes("icon")) score -= 150;

      return { src, score };
    });

    let chosen = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.src);

    if (chosen.length < 4) {
      chosen = chosen.concat(
        list.filter(src => {
          const n = norm(src);
          return !n.includes("backup") && !n.includes("logo") && !n.includes("icon");
        })
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

  function createModal() {
    if ($("cleanGalleryOverlay")) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div class="clean-gallery-overlay" id="cleanGalleryOverlay">
        <div class="clean-gallery-shell">
          <header class="clean-gallery-header">
            <div>
              <div class="clean-gallery-kicker" id="cleanGalleryKicker">Galeria</div>
              <h2 class="clean-gallery-title" id="cleanGalleryTitle">Galeria premium</h2>
              <div class="clean-gallery-subtitle">
                Duplo clique para dar zoom. Com zoom, clique e arraste a imagem.
              </div>
            </div>

            <div class="clean-gallery-actions">
              <button class="clean-gallery-btn" id="cleanZoomOut" type="button">−</button>
              <button class="clean-gallery-btn" id="cleanZoomIn" type="button">+</button>
              <button class="clean-gallery-btn" id="cleanReset" type="button">100%</button>
              <button class="clean-gallery-btn" id="cleanShare" type="button">Compartilhar</button>
              <button class="clean-gallery-btn primary" id="cleanDownload" type="button">Baixar</button>
              <button class="clean-gallery-btn exit" id="cleanExit" type="button">Sair</button>
              <button class="clean-gallery-btn close" id="cleanClose" type="button">×</button>
            </div>
          </header>

          <main class="clean-gallery-body">
            <section class="clean-gallery-viewer">
              <button class="clean-gallery-nav" id="cleanPrev" type="button">‹</button>

              <div class="clean-gallery-stage" id="cleanStage">
                <img class="clean-gallery-img" id="cleanImage" draggable="false">
                <div class="clean-gallery-zoom" id="cleanZoomBadge">100%</div>
              </div>

              <button class="clean-gallery-nav" id="cleanNext" type="button">›</button>
            </section>

            <aside class="clean-gallery-side">
              <h3>Imagens da galeria</h3>
              <p>Clique na miniatura para destacar. Clique no círculo para selecionar mais de uma imagem.</p>

              <div class="clean-gallery-thumbs" id="cleanThumbs"></div>

              <div class="clean-gallery-side-actions">
                <button class="clean-gallery-btn" id="cleanSelectAll" type="button">Selecionar todas</button>
                <button class="clean-gallery-btn" id="cleanClear" type="button">Limpar seleção</button>
                <button class="clean-gallery-btn primary" id="cleanDownloadSelected" type="button">Baixar selecionadas</button>
                <button class="clean-gallery-btn" id="cleanDownloadAll" type="button">Baixar as 4</button>
              </div>
            </aside>
          </main>

          <footer class="clean-gallery-footer">
            <div><strong>Atalhos:</strong> ESC fecha · setas navegam · duplo clique amplia · arraste move com zoom</div>
            <div id="cleanCounter">1/4</div>
          </footer>
        </div>
      </div>
    `);

    bindEvents();
  }

  function bindEvents() {
    $("cleanClose").onclick = closeGallery;
    $("cleanExit").onclick = closeGallery;
    $("cleanPrev").onclick = () => move(-1);
    $("cleanNext").onclick = () => move(1);
    $("cleanZoomIn").onclick = () => setZoom(state.zoom + 0.35);
    $("cleanZoomOut").onclick = () => setZoom(state.zoom - 0.35);
    $("cleanReset").onclick = resetZoom;
    $("cleanDownload").onclick = () => downloadImage(state.index);
    $("cleanDownloadSelected").onclick = downloadSelected;
    $("cleanDownloadAll").onclick = downloadAll;
    $("cleanShare").onclick = shareCurrent;

    $("cleanSelectAll").onclick = () => {
      state.images.forEach((_, i) => state.selected.add(i));
      renderThumbs();
    };

    $("cleanClear").onclick = () => {
      state.selected.clear();
      renderThumbs();
    };

    $("cleanStage").ondblclick = () => {
      state.zoom <= 1 ? setZoom(2.6) : resetZoom();
    };

    $("cleanStage").onwheel = (event) => {
      event.preventDefault();
      setZoom(state.zoom + (event.deltaY > 0 ? -0.25 : 0.25));
    };

    $("cleanImage").onpointerdown = (event) => {
      if (state.zoom <= 1) return;

      state.dragging = true;
      state.startX = event.clientX;
      state.startY = event.clientY;
      state.originX = state.x;
      state.originY = state.y;

      $("cleanImage").classList.add("dragging");
      try { $("cleanImage").setPointerCapture(event.pointerId); } catch (_) {}
    };

    window.addEventListener("pointermove", (event) => {
      if (!state.dragging) return;

      state.x = state.originX + event.clientX - state.startX;
      state.y = state.originY + event.clientY - state.startY;
      applyTransform();
    });

    window.addEventListener("pointerup", () => {
      state.dragging = false;
      const img = $("cleanImage");
      if (img) img.classList.remove("dragging");
    });

    window.addEventListener("keydown", (event) => {
      const overlay = $("cleanGalleryOverlay");
      if (!overlay || !overlay.classList.contains("is-open")) return;

      if (event.key === "Escape") closeGallery();
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "+") setZoom(state.zoom + 0.35);
      if (event.key === "-") setZoom(state.zoom - 0.35);
      if (event.key === "0") resetZoom();
    });
  }

  function closeOldModals() {
    document.querySelectorAll(".pgx-overlay,.pg-modal,.album-modal,.gallery-modal,.lightbox,.image-modal,.prints-modal,.modal,.final-gallery-overlay").forEach(el => {
      if (el.id !== "cleanGalleryOverlay") {
        el.style.display = "none";
        el.classList.remove("is-open", "show", "active", "pg-show");
      }
    });
  }

  function openCleanGallery(payload, maybeImages) {
    createModal();
    closeOldModals();

    let title = "Galeria premium";
    let key = "";
    let extraText = "";

    if (typeof payload === "string") {
      title = payload;
      key = payload;
      extraText = payload;
    }

    if (payload && typeof payload === "object") {
      title = payload.title || payload.name || title;
      key = payload.key || payload.title || "";
      extraText = JSON.stringify(payload);
    }

    let images = [];

    if (Array.isArray(maybeImages)) {
      images = maybeImages
        .map((item, i) => typeof item === "string" ? { src: item, title: `Imagem ${i + 1}` } : item)
        .filter(item => item && item.src);
    }

    if (!images.length && payload && typeof payload === "object" && Array.isArray(payload.images)) {
      images = payload.images
        .map((item, i) => typeof item === "string" ? { src: item, title: `Imagem ${i + 1}` } : item)
        .filter(item => item && item.src);
    }

    if (!images.length) {
      images = imagesFromKey(key || title, extraText);
    }

    if (!images.length) {
      alert("Não encontrei imagens para esta galeria.");
      return;
    }

    state.images = images.slice(0, 4);
    state.index = 0;
    state.selected = new Set([0]);

    $("cleanGalleryTitle").textContent = title;
    $("cleanGalleryKicker").textContent = (key || title).split(" ")[0] || "Galeria";

    loadCurrent();
    renderThumbs();

    $("cleanGalleryOverlay").classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function loadCurrent() {
    const item = state.images[state.index];
    if (!item) return;

    const img = $("cleanImage");
    img.src = item.src;
    img.alt = item.title || `Imagem ${state.index + 1}`;

    $("cleanCounter").textContent = `${state.index + 1}/${state.images.length}`;

    resetZoom();
  }

  function renderThumbs() {
    const thumbs = $("cleanThumbs");
    thumbs.innerHTML = "";

    state.images.forEach((item, i) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "clean-gallery-thumb" +
        (i === state.index ? " active" : "") +
        (state.selected.has(i) ? " selected" : "");

      button.innerHTML = `
        <img src="${item.src}" alt="${item.title || `Imagem ${i + 1}`}">
        <span class="clean-gallery-select">${state.selected.has(i) ? "✓" : "+"}</span>
      `;

      button.onclick = (event) => {
        if (event.target.classList.contains("clean-gallery-select")) {
          event.preventDefault();
          event.stopPropagation();

          if (state.selected.has(i)) state.selected.delete(i);
          else state.selected.add(i);

          renderThumbs();
          return;
        }

        state.index = i;
        if (!state.selected.has(i)) state.selected.add(i);

        loadCurrent();
        renderThumbs();
      };

      thumbs.appendChild(button);
    });
  }

  function applyTransform() {
    if (state.raf) cancelAnimationFrame(state.raf);

    state.raf = requestAnimationFrame(() => {
      const img = $("cleanImage");
      img.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.zoom})`;
      img.classList.toggle("zoomed", state.zoom > 1);

      $("cleanZoomBadge").textContent = `${Math.round(state.zoom * 100)}%`;
      $("cleanReset").textContent = `${Math.round(state.zoom * 100)}%`;
    });
  }

  function resetZoom() {
    state.zoom = 1;
    state.x = 0;
    state.y = 0;
    applyTransform();
  }

  function setZoom(value) {
    state.zoom = Math.max(1, Math.min(6, value));

    if (state.zoom <= 1) {
      state.zoom = 1;
      state.x = 0;
      state.y = 0;
    }

    applyTransform();
  }

  function move(direction) {
    state.index = (state.index + direction + state.images.length) % state.images.length;
    if (!state.selected.has(state.index)) state.selected.add(state.index);

    loadCurrent();
    renderThumbs();
  }

  function closeGallery() {
    const overlay = $("cleanGalleryOverlay");
    if (overlay) overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function fileName(item, index) {
    const base = String(item.title || `imagem-${index + 1}`)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const extMatch = String(item.src).split("?")[0].match(/\.(png|jpe?g|webp)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase().replace("jpeg", "jpg") : "png";

    return `${base || "imagem"}-${index + 1}.${ext}`;
  }

  function downloadImage(index) {
    const item = state.images[index];
    if (!item) return;

    const link = document.createElement("a");
    link.href = item.src;
    link.download = fileName(item, index);
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function downloadSelected() {
    const list = Array.from(state.selected);

    if (!list.length) {
      downloadImage(state.index);
      return;
    }

    list.forEach((index, order) => {
      setTimeout(() => downloadImage(index), order * 250);
    });
  }

  function downloadAll() {
    state.images.forEach((_, index) => {
      setTimeout(() => downloadImage(index), index * 250);
    });
  }

  async function shareCurrent() {
    const item = state.images[state.index];
    if (!item) return;

    const url = new URL(item.src, window.location.href).href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title || "Imagem da aula",
          text: "Imagem da aula - Influencer Academy",
          url
        });
        return;
      } catch (_) {}
    }

    try {
      await navigator.clipboard.writeText(url);
      alert("Link da imagem copiado.");
    } catch (_) {
      window.open(url, "_blank");
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

  document.addEventListener("click", function (event) {
    const card = event.target.closest("[onclick*='Gallery'],[onclick*='gallery'],[data-gallery],[data-images],.album-card,.print-card,.print-album,.lesson-print-card,.gallery-card");
    if (!card) return;

    const text = norm(card.textContent || "");

    if (!(text.includes("instagram") || text.includes("canva") || text.includes("capcut") || text.includes("ia") || text.includes("prompt"))) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    openCleanGallery(guessKeyFromCard(card), null);
  }, true);

  window.openGallery = openCleanGallery;
  window.openPremiumGallery = openCleanGallery;
  window.openPrintGallery = openCleanGallery;
  window.openLessonGallery = openCleanGallery;
  window.showPremiumGallery = openCleanGallery;
  window.openAlbumGallery = openCleanGallery;
  window.openPrintAlbum = openCleanGallery;
  window.openToolGallery = openCleanGallery;

  document.addEventListener("DOMContentLoaded", createModal);
})();
