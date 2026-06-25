(function () {
  const state = {
    images: [],
    index: 0,
    scale: 1,
    x: 0,
    y: 0,
    rotation: 0,
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    selected: new Set(),
    lastAutoOpen: 0
  };

  const SELECTORS = {
    oldModal: [
      ".album-modal",
      ".modal",
      ".lightbox",
      ".gallery-modal",
      ".image-modal",
      ".prints-modal",
      "[class*='modal']",
      "[class*='lightbox']",
      "[class*='gallery']"
    ].join(",")
  };

  function sanitizeFileName(value) {
    return String(value || "print")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\-]+/g, "-")
      .replace(/\-+/g, "-")
      .replace(/^\-|\-$/g, "")
      .toLowerCase();
  }

  function getBestSrc(img) {
    if (!img) return "";
    return img.dataset.full || img.dataset.zoom || img.dataset.large || img.dataset.src || img.currentSrc || img.src || "";
  }

  function extensionFromUrl(url) {
    const clean = String(url || "").split("?")[0].split("#")[0];
    const match = clean.match(/\.(png|jpe?g|webp|gif|avif)$/i);
    return match ? match[1].toLowerCase().replace("jpeg", "jpg") : "png";
  }

  function uniqueImagesFrom(nodes) {
    const seen = new Set();

    return Array.from(nodes)
      .map((img, index) => {
        const src = getBestSrc(img);
        const title =
          img.alt ||
          img.dataset.title ||
          img.getAttribute("aria-label") ||
          img.closest("[data-title]")?.dataset.title ||
          `Print ${index + 1}`;

        return { src, title, original: img };
      })
      .filter(item => {
        if (!item.src || seen.has(item.src)) return false;
        seen.add(item.src);
        return true;
      });
  }

  function isVisible(el) {
    if (!el) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      rect.width > 80 &&
      rect.height > 80
    );
  }

  function ensureModal() {
    let modal = document.getElementById("premiumGallery");

    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "premiumGallery";
    modal.className = "pg-modal";
    modal.innerHTML = `
      <div class="pg-shell" role="dialog" aria-modal="true">
        <div class="pg-header">
          <div>
            <div class="pg-kicker" id="pgKicker">Galeria premium</div>
            <h2 class="pg-title" id="pgTitle">Prints explicativos</h2>
            <div class="pg-subtitle" id="pgSubtitle">Duplo clique para ampliar. Clique e arraste para mover a imagem.</div>
          </div>

          <div class="pg-actions">
            <button class="pg-btn" data-action="zoomOut" title="Diminuir zoom">−</button>
            <button class="pg-btn" data-action="zoomIn" title="Aumentar zoom">+</button>
            <button class="pg-btn" data-action="fit" title="Ajustar na tela">100%</button>
            <button class="pg-btn" data-action="rotate" title="Girar">↻</button>
            <button class="pg-btn" data-action="open" title="Abrir imagem em nova aba">Abrir</button>
            <button class="pg-btn pg-primary" data-action="downloadCurrent" title="Baixar imagem atual">Baixar</button>
            <button class="pg-btn pg-danger" data-action="close" title="Fechar">×</button>
          </div>
        </div>

        <div class="pg-body">
          <div class="pg-stage" id="pgStage">
            <button class="pg-nav pg-prev" data-action="prev">‹</button>
            <img class="pg-image" id="pgImage" alt="Print ampliado" draggable="false" />
            <button class="pg-nav pg-next" data-action="next">›</button>
            <div class="pg-zoom-badge" id="pgZoomBadge">100%</div><div class="pg-scroll-hint">Role para subir/descer</div>
          </div>

          <aside class="pg-side">
            <div>
              <h3 id="pgSideTitle">Álbum da aula</h3>
              <p id="pgSideText">Selecione imagens para baixar juntas ou navegue pelos prints.</p>
            </div>

            <div class="pg-thumbs" id="pgThumbs"></div>

            <div class="pg-select-actions">
              <button class="pg-btn" data-action="selectAll">Selecionar todas</button>
              <button class="pg-btn" data-action="clearSelection">Limpar</button>
              <button class="pg-btn pg-primary" data-action="downloadSelected">Baixar selecionadas</button>
              <button class="pg-btn pg-primary" data-action="downloadAll">Baixar as 4</button>
            </div>
          </aside>
        </div>

        <div class="pg-footer">
          <div class="pg-hint">
            <strong>Atalhos:</strong> ← → navegar · duplo clique amplia · roda do mouse ajusta zoom · ESC fecha.
          </div>
          <div id="pgCounter">1/1</div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener("click", handleActionClick);
    modal.querySelector("#pgStage").addEventListener("wheel", handleWheel, { passive: false });
    modal.querySelector("#pgStage").addEventListener("pointerdown", startDrag);
    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("pointerup", endDrag);
    modal.querySelector("#pgImage").addEventListener("dblclick", toggleDoubleZoom);

    document.addEventListener("keydown", handleKey);

    return modal;
  }

  function showToast(text) {
    let toast = document.querySelector(".pg-toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.className = "pg-toast";
      document.body.appendChild(toast);
    }

    toast.textContent = text;
    toast.classList.add("pg-show");

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("pg-show"), 2300);
  }

  function openPremiumGallery(images, startIndex = 0, title = "Prints explicativos") {
    const normalized = Array.isArray(images) ? images.filter(item => item && item.src) : [];
    if (!normalized.length) return;

    state.images = normalized;
    state.index = Math.max(0, Math.min(startIndex, normalized.length - 1));
    state.selected = new Set(normalized.map((_, index) => index));

    const modal = ensureModal();

    document.body.classList.add("pg-lock-scroll");
    modal.classList.add("pg-show");

    modal.querySelector("#pgTitle").textContent = title;
    modal.querySelector("#pgKicker").textContent = normalized[state.index]?.title?.split(" - ")[0] || "Galeria premium";

    renderThumbs();
    renderImage(true);
  }

  function renderImage(reset = false) {
    const item = state.images[state.index];
    if (!item) return;

    const modal = ensureModal();
    const image = modal.querySelector("#pgImage");

    if (reset) {
      state.scale = 1;
      state.x = 0;
      state.y = 0;
      state.rotation = 0;
    }

    image.src = item.src;
    image.alt = item.title || "Print ampliado";

    modal.querySelector("#pgKicker").textContent = item.title || "Print da aula";
    modal.querySelector("#pgCounter").textContent = `${state.index + 1}/${state.images.length}`;
    modal.querySelector("#pgSideTitle").textContent = item.title || "Álbum da aula";

    applyTransform();
    renderThumbs();
  }

  function applyTransform() {
    const image = document.getElementById("pgImage");
    const badge = document.getElementById("pgZoomBadge");

    if (!image) return;

    image.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale}) rotate(${state.rotation}deg)`;
    if (badge) badge.textContent = `${Math.round(state.scale * 100)}%`;
  }

  function renderThumbs() {
    const thumbs = document.getElementById("pgThumbs");
    if (!thumbs) return;

    thumbs.innerHTML = "";

    state.images.forEach((item, index) => {
      const thumb = document.createElement("div");
      thumb.className = "pg-thumb" + (index === state.index ? " pg-active" : "");
      thumb.dataset.index = String(index);

      thumb.innerHTML = `
        <input class="pg-check" type="checkbox" ${state.selected.has(index) ? "checked" : ""} />
        <img src="${item.src}" alt="${item.title || "Print"}" draggable="false" />
        <div class="pg-thumb-label">${index + 1}. ${item.title || "Print da aula"}</div>
      `;

      thumb.addEventListener("click", event => {
        if (event.target.classList.contains("pg-check")) {
          if (event.target.checked) state.selected.add(index);
          else state.selected.delete(index);
          return;
        }

        state.index = index;
        renderImage(true);
      });

      thumbs.appendChild(thumb);
    });
  }

  function closeGallery() {
    const modal = document.getElementById("premiumGallery");
    if (!modal) return;

    modal.classList.remove("pg-show");
    document.body.classList.remove("pg-lock-scroll");
  }

  function nextImage() {
    if (!state.images.length) return;
    state.index = (state.index + 1) % state.images.length;
    renderImage(true);
  }

  function prevImage() {
    if (!state.images.length) return;
    state.index = (state.index - 1 + state.images.length) % state.images.length;
    renderImage(true);
  }

  function zoom(delta) {
    state.scale = Math.max(0.5, Math.min(6, +(state.scale + delta).toFixed(2)));

    if (state.scale <= 1) {
      state.x = 0;
      state.y = 0;
    }

    applyTransform();
  }

  function fitImage() {
    state.scale = 1;
    state.x = 0;
    state.y = 0;
    state.rotation = 0;
    applyTransform();
  }

  function rotateImage() {
    state.rotation = (state.rotation + 90) % 360;
    applyTransform();
  }

  function handleWheel(event) {
    if (event.ctrlKey) {
      event.preventDefault();
      const direction = event.deltaY > 0 ? -0.12 : 0.12;
      zoom(direction);
      return;
    }

    // Sem Ctrl, deixa a barra de rolagem funcionar normalmente.
    // Use Ctrl + roda do mouse para zoom.
  }

  function toggleDoubleZoom(event) {
    event.preventDefault();

    if (state.scale <= 1.05) {
      state.scale = 2.4;
    } else {
      state.scale = 1;
      state.x = 0;
      state.y = 0;
    }

    applyTransform();
  }

  function startDrag(event) {
    if (!event.target.closest("#pgStage")) return;
    if (event.target.closest("button")) return;

    state.dragging = true;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.originX = state.x;
    state.originY = state.y;

    document.getElementById("pgStage")?.classList.add("pg-dragging");
  }

  function moveDrag(event) {
    if (!state.dragging) return;

    state.x = state.originX + (event.clientX - state.startX);
    state.y = state.originY + (event.clientY - state.startY);

    applyTransform();
  }

  function endDrag() {
    state.dragging = false;
    document.getElementById("pgStage")?.classList.remove("pg-dragging");
  }

  function handleKey(event) {
    const modal = document.getElementById("premiumGallery");
    if (!modal || !modal.classList.contains("pg-show")) return;

    if (event.key === "Escape") closeGallery();
    if (event.key === "ArrowRight") nextImage();
    if (event.key === "ArrowLeft") prevImage();
    if (event.key === "+" || event.key === "=") zoom(0.2);
    if (event.key === "-") zoom(-0.2);
    if (event.key === "0") fitImage();
  }

  function handleActionClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;

    if (action === "close") closeGallery();
    if (action === "next") nextImage();
    if (action === "prev") prevImage();
    if (action === "zoomIn") zoom(0.22);
    if (action === "zoomOut") zoom(-0.22);
    if (action === "fit") fitImage();
    if (action === "rotate") rotateImage();
    if (action === "open") openCurrentInNewTab();
    if (action === "downloadCurrent") downloadCurrent();
    if (action === "downloadSelected") downloadSelected();
    if (action === "downloadAll") downloadAll();
    if (action === "selectAll") {
      state.images.forEach((_, index) => state.selected.add(index));
      renderThumbs();
      showToast("Todas as imagens foram selecionadas.");
    }
    if (action === "clearSelection") {
      state.selected.clear();
      renderThumbs();
      showToast("Seleção limpa.");
    }
  }

  function openCurrentInNewTab() {
    const item = state.images[state.index];
    if (!item) return;
    window.open(item.src, "_blank", "noopener,noreferrer");
  }

  async function downloadUrl(url, filename) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(blobUrl), 1200);
    } catch (error) {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }

  async function downloadItem(item, index) {
    const ext = extensionFromUrl(item.src);
    const name = sanitizeFileName(item.title || `print-${index + 1}`);
    await downloadUrl(item.src, `${String(index + 1).padStart(2, "0")}-${name}.${ext}`);
  }

  async function downloadCurrent() {
    const item = state.images[state.index];
    if (!item) return;

    await downloadItem(item, state.index);
    showToast("Imagem atual enviada para download.");
  }

  async function downloadSelected() {
    const selectedIndexes = Array.from(state.selected).sort((a, b) => a - b);

    if (!selectedIndexes.length) {
      showToast("Selecione pelo menos uma imagem.");
      return;
    }

    showToast(`Baixando ${selectedIndexes.length} imagem(ns)...`);

    for (const index of selectedIndexes) {
      await downloadItem(state.images[index], index);
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }

  async function downloadAll() {
    state.images.forEach((_, index) => state.selected.add(index));
    renderThumbs();
    await downloadSelected();
  }

  function titleFromContext(element) {
    const context =
      element.closest("[data-title]") ||
      element.closest("section") ||
      element.closest("article") ||
      document;

    const title =
      context.dataset?.title ||
      context.querySelector?.("h1,h2,h3")?.textContent ||
      document.title ||
      "Prints explicativos";

    return title.trim();
  }

  function collectImagesNear(element) {
    const priorityContainers = [
      element.closest(".pg-modal"),
      element.closest(SELECTORS.oldModal),
      element.closest("[data-gallery]"),
      element.closest("[data-album]"),
      element.closest(".album"),
      element.closest(".prints"),
      element.closest(".gallery"),
      element.closest("section"),
      element.closest("article")
    ].filter(Boolean);

    for (const container of priorityContainers) {
      const imgs = uniqueImagesFrom(container.querySelectorAll("img"));
      if (imgs.length >= 2) return imgs;
    }

    return uniqueImagesFrom(document.querySelectorAll("img")).slice(0, 12);
  }

  function interceptImageClicks() {
    document.addEventListener("click", event => {
      if (event.target.closest("#premiumGallery")) return;

      const img = event.target.closest("img");
      if (!img) {
        setTimeout(openFromOldModalIfNeeded, 180);
        return;
      }

      const src = getBestSrc(img);
      if (!src) return;

      const images = collectImagesNear(img);
      if (!images.length) return;

      const index = Math.max(0, images.findIndex(item => item.src === src));

      event.preventDefault();
      event.stopPropagation();

      openPremiumGallery(images, index, titleFromContext(img));
    }, true);
  }

  function openFromOldModalIfNeeded() {
    if (Date.now() - state.lastAutoOpen < 900) return;

    const candidates = Array.from(document.querySelectorAll(SELECTORS.oldModal))
      .filter(el => !el.closest("#premiumGallery"))
      .filter(isVisible)
      .sort((a, b) => b.querySelectorAll("img").length - a.querySelectorAll("img").length);

    const modal = candidates.find(el => el.querySelectorAll("img").length >= 2);

    if (!modal || modal.dataset.pgHandled === "true") return;

    const images = uniqueImagesFrom(modal.querySelectorAll("img"));
    if (images.length < 2) return;

    modal.dataset.pgHandled = "true";
    modal.style.display = "none";

    state.lastAutoOpen = Date.now();
    openPremiumGallery(images, 0, titleFromContext(modal));
  }

  function observeOldModal() {
    const observer = new MutationObserver(() => {
      setTimeout(openFromOldModalIfNeeded, 120);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"]
    });
  }

  function exposeApi() {
    window.PremiumGallery = {
      open(images, startIndex = 0, title = "Prints explicativos") {
        const normalized = images.map((item, index) => {
          if (typeof item === "string") {
            return { src: item, title: `Print ${index + 1}` };
          }

          return item;
        });

        openPremiumGallery(normalized, startIndex, title);
      }
    };
  }

  function init() {
    ensureModal();
    interceptImageClicks();
    observeOldModal();
    exposeApi();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

