(function () {
  const state = {
    title: 'Galeria',
    subtitle: 'Selecione a imagem desejada',
    images: [],
    currentIndex: 0,
    selected: new Set(),
    zoom: 1,
    minZoom: 1,
    maxZoom: 4,
    panX: 0,
    panY: 0,
    rafId: null,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragOriginX: 0,
    dragOriginY: 0
  };

  let els = {};

  function esc(str) {
    return String(str || '').replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }

  function normalizeImages(input) {
    if (!input) return [];

    if (typeof input === 'string') {
      const trimmed = input.trim();

      if (!trimmed) return [];

      try {
        const parsed = JSON.parse(trimmed);
        return normalizeImages(parsed);
      } catch (e) {}

      return trimmed
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map((src, i) => ({ src, title: `Imagem ${i + 1}` }));
    }

    if (Array.isArray(input)) {
      return input
        .map((item, i) => {
          if (!item) return null;
          if (typeof item === 'string') return { src: item, title: `Imagem ${i + 1}` };
          return {
            src: item.src || item.url || item.image || '',
            title: item.title || item.name || `Imagem ${i + 1}`,
            description: item.description || ''
          };
        })
        .filter(item => item && item.src);
    }

    if (typeof input === 'object' && input.images) {
      return normalizeImages(input.images);
    }

    return [];
  }

  function ensureModal() {
    if (document.getElementById('pgxOverlay')) {
      cacheEls();
      return;
    }

    const html = `
      <div class="pgx-overlay" id="pgxOverlay">
        <div class="pgx-shell" role="dialog" aria-modal="true" aria-label="Galeria premium">
          <div class="pgx-topbar">
            <div class="pgx-title-wrap">
              <div class="pgx-kicker">Imagem da galeria</div>
              <h2 class="pgx-title" id="pgxTitle">Galeria</h2>
              <div class="pgx-subtitle" id="pgxSubtitle">Selecione a imagem desejada</div>
            </div>

            <div class="pgx-toolbar">
              <button class="pgx-btn small" id="pgxZoomOut" type="button" title="Diminuir">−</button>
              <button class="pgx-btn small" id="pgxZoomIn" type="button" title="Ampliar">+</button>
              <button class="pgx-btn" id="pgxReset" type="button" title="Resetar zoom">100%</button>
              <button class="pgx-btn" id="pgxOpen" type="button">Abrir</button>
              <button class="pgx-btn is-primary" id="pgxDownloadCurrent" type="button">Baixar</button>
              <button class="pgx-btn is-danger small" id="pgxClose" type="button" title="Fechar">×</button>
            </div>
          </div>

          <div class="pgx-body">
            <div class="pgx-viewer">
              <button class="pgx-nav" id="pgxPrev" type="button" aria-label="Anterior">‹</button>

              <div class="pgx-stage" id="pgxStage">
                <img id="pgxImage" class="pgx-image" alt="Imagem da galeria">
                <div class="pgx-stage-badge" id="pgxZoomBadge">100%</div>
              </div>

              <button class="pgx-nav" id="pgxNext" type="button" aria-label="Próxima">›</button>
            </div>

            <aside class="pgx-side">
              <h3>Imagens da galeria</h3>
              <p>As 4 miniaturas ficam visíveis. Clique em uma delas para colocá-la em destaque.</p>

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
            <div>
              <strong>Atalhos:</strong>
              duplo clique amplia · clique e arraste move · setas navegam · ESC fecha
            </div>
            <div class="pgx-counter" id="pgxCounter">1/4</div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    cacheEls();
    bindModalEvents();
  }

  function cacheEls() {
    els.overlay = document.getElementById('pgxOverlay');
    els.title = document.getElementById('pgxTitle');
    els.subtitle = document.getElementById('pgxSubtitle');
    els.thumbGrid = document.getElementById('pgxThumbGrid');
    els.image = document.getElementById('pgxImage');
    els.stage = document.getElementById('pgxStage');
    els.zoomBadge = document.getElementById('pgxZoomBadge');
    els.counter = document.getElementById('pgxCounter');

    els.prev = document.getElementById('pgxPrev');
    els.next = document.getElementById('pgxNext');
    els.close = document.getElementById('pgxClose');
    els.zoomIn = document.getElementById('pgxZoomIn');
    els.zoomOut = document.getElementById('pgxZoomOut');
    els.reset = document.getElementById('pgxReset');
    els.open = document.getElementById('pgxOpen');

    els.downloadCurrent = document.getElementById('pgxDownloadCurrent');
    els.downloadSelected = document.getElementById('pgxDownloadSelected');
    els.downloadAll = document.getElementById('pgxDownloadAll');
    els.selectAll = document.getElementById('pgxSelectAll');
    els.clearSelected = document.getElementById('pgxClearSelected');
  }

  function bindModalEvents() {
    els.close.addEventListener('click', closeGallery);
    els.overlay.addEventListener('click', function (e) {
      if (e.target === els.overlay) closeGallery();
    });

    els.prev.addEventListener('click', () => move(-1));
    els.next.addEventListener('click', () => move(1));
    els.zoomIn.addEventListener('click', () => setZoom(state.zoom + 0.2));
    els.zoomOut.addEventListener('click', () => setZoom(state.zoom - 0.2));
    els.reset.addEventListener('click', resetView);
    els.open.addEventListener('click', openCurrentInNewTab);
    els.downloadCurrent.addEventListener('click', () => downloadImage(state.currentIndex));
    els.downloadSelected.addEventListener('click', downloadSelected);
    els.downloadAll.addEventListener('click', downloadAll);
    els.selectAll.addEventListener('click', () => {
      state.selected = new Set(state.images.map((_, i) => i));
      renderThumbs();
    });
    els.clearSelected.addEventListener('click', () => {
      state.selected.clear();
      renderThumbs();
    });

    els.stage.addEventListener('dblclick', function () {
      if (state.zoom === 1) {
        setZoom(2.2);
      } else {
        resetView();
      }
    });

    els.stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.18 : 0.18;
      setZoom(state.zoom + delta);
    }, { passive: false });

    els.stage.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
  }

  function onKeyDown(e) {
    if (!els.overlay || !els.overlay.classList.contains('is-open')) return;

    if (e.key === 'Escape') closeGallery();
    if (e.key === 'ArrowRight') move(1);
    if (e.key === 'ArrowLeft') move(-1);
  }

  function onPointerDown(e) {
    if (state.zoom <= 1) return;

    state.dragging = true;
    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;
    state.dragOriginX = state.panX;
    state.dragOriginY = state.panY;
    els.image.classList.add('is-dragging');
    try { els.stage.setPointerCapture(e.pointerId); } catch (_) {}
  }

  function onPointerMove(e) {
    if (!state.dragging) return;

    const dx = e.clientX - state.dragStartX;
    const dy = e.clientY - state.dragStartY;

    state.panX = state.dragOriginX + dx;
    state.panY = state.dragOriginY + dy;
    clampPan();
    requestTransform();
  }

  function onPointerUp() {
    if (!state.dragging) return;
    state.dragging = false;
    els.image.classList.remove('is-dragging');
  }

  function requestTransform() {
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = requestAnimationFrame(applyTransform);
  }

  function applyTransform() {
    state.rafId = null;
    els.image.style.transform = `translate3d(${state.panX}px, ${state.panY}px, 0) scale(${state.zoom})`;
    els.zoomBadge.textContent = `${Math.round(state.zoom * 100)}%`;
    els.reset.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  function getNaturalSize() {
    const img = els.image;
    return {
      width: img.naturalWidth || 1200,
      height: img.naturalHeight || 1200
    };
  }

  function clampPan() {
    const stageW = els.stage.clientWidth - 36;
    const stageH = els.stage.clientHeight - 36;

    const natural = getNaturalSize();
    const fitScale = Math.min(stageW / natural.width, stageH / natural.height);
    const viewW = natural.width * fitScale * state.zoom;
    const viewH = natural.height * fitScale * state.zoom;

    const maxX = Math.max(0, (viewW - stageW) / 2);
    const maxY = Math.max(0, (viewH - stageH) / 2);

    state.panX = Math.min(maxX, Math.max(-maxX, state.panX));
    state.panY = Math.min(maxY, Math.max(-maxY, state.panY));
  }

  function setZoom(value) {
    const next = Math.max(state.minZoom, Math.min(state.maxZoom, value));
    state.zoom = next;

    if (state.zoom <= 1) {
      state.panX = 0;
      state.panY = 0;
    } else {
      clampPan();
    }

    requestTransform();
  }

  function resetView() {
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    requestTransform();
  }

  function move(direction) {
    if (!state.images.length) return;
    state.currentIndex = (state.currentIndex + direction + state.images.length) % state.images.length;
    loadCurrent();
    renderThumbs();
  }

  function setCurrent(index) {
    state.currentIndex = index;
    loadCurrent();
    renderThumbs();
  }

  function renderThumbs() {
    els.thumbGrid.innerHTML = state.images.map((img, index) => {
      const active = index === state.currentIndex ? 'is-active' : '';
      const selected = state.selected.has(index) ? 'is-selected' : '';
      return `
        <button class="pgx-thumb ${active} ${selected}" type="button" data-index="${index}" title="${esc(img.title || `Imagem ${index + 1}`)}">
          <img src="${esc(img.src)}" alt="${esc(img.title || `Imagem ${index + 1}`)}">
          <span class="pgx-thumb-check" data-check="${index}">${state.selected.has(index) ? '✓' : '+'}</span>
        </button>
      `;
    }).join('');

    els.thumbGrid.querySelectorAll('.pgx-thumb').forEach(btn => {
      btn.addEventListener('click', function (e) {
        const check = e.target.closest('.pgx-thumb-check');
        const idx = Number(btn.dataset.index);

        if (check) {
          e.stopPropagation();
          toggleSelected(idx);
          return;
        }

        setCurrent(idx);
      });
    });

    els.counter.textContent = `${state.currentIndex + 1}/${state.images.length}`;
  }

  function toggleSelected(index) {
    if (state.selected.has(index)) {
      state.selected.delete(index);
    } else {
      state.selected.add(index);
    }
    renderThumbs();
  }

  function loadCurrent() {
    const current = state.images[state.currentIndex];
    if (!current) return;

    els.image.src = current.src;
    els.image.alt = current.title || `Imagem ${state.currentIndex + 1}`;
    resetView();

    const title = current.title || state.title || 'Imagem da galeria';
    const description = current.description || state.subtitle || 'Selecione uma miniatura para visualizar.';
    els.title.textContent = title;
    els.subtitle.textContent = description;

    els.image.onload = function () {
      clampPan();
      requestTransform();
    };
  }

  function downloadUrl(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'imagem';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function fileNameFor(index) {
    const img = state.images[index];
    const base = (img.title || `imagem-${index + 1}`)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const ext = (img.src.split('.').pop() || 'png').split('?')[0];
    return `${base || 'imagem'}-${index + 1}.${ext}`;
  }

  function downloadImage(index) {
    const img = state.images[index];
    if (!img) return;
    downloadUrl(img.src, fileNameFor(index));
  }

  function downloadSelected() {
    const list = Array.from(state.selected);
    if (!list.length) {
      downloadImage(state.currentIndex);
      return;
    }
    list.forEach((idx, i) => setTimeout(() => downloadImage(idx), i * 240));
  }

  function downloadAll() {
    state.images.forEach((_, i) => setTimeout(() => downloadImage(i), i * 220));
  }

  function openCurrentInNewTab() {
    const current = state.images[state.currentIndex];
    if (!current) return;
    window.open(current.src, '_blank');
  }

  function closeGallery() {
    els.overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function openGallery(payload, maybeImages, maybeSubtitle) {
    ensureModal();

    let title = 'Galeria';
    let subtitle = 'Selecione uma miniatura';
    let images = [];

    if (typeof payload === 'object' && !Array.isArray(payload) && payload !== null && payload.images) {
      title = payload.title || title;
      subtitle = payload.subtitle || subtitle;
      images = normalizeImages(payload.images);
    } else if (typeof payload === 'string' && Array.isArray(maybeImages)) {
      title = payload;
      subtitle = maybeSubtitle || subtitle;
      images = normalizeImages(maybeImages);
    } else if (Array.isArray(payload)) {
      images = normalizeImages(payload);
    } else if (typeof payload === 'string' && !maybeImages) {
      images = normalizeImages(payload);
    } else {
      images = normalizeImages(maybeImages || payload);
    }

    if (!images.length) return;

    state.title = title;
    state.subtitle = subtitle;
    state.images = images.slice(0, 4); // sempre focando nas 4 imagens da aula
    state.currentIndex = 0;
    state.selected = new Set([0]);

    els.title.textContent = title;
    els.subtitle.textContent = subtitle;
    renderThumbs();
    loadCurrent();

    els.overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function parseImagesFromElement(el) {
    const raw = el.dataset.galleryImages || el.dataset.images || el.dataset.gallery || '';
    return normalizeImages(raw);
  }

  function autoBindCards() {
    document.addEventListener('click', function (e) {
      const card = e.target.closest('[data-gallery-images],[data-images],[data-gallery],.js-open-gallery,.gallery-card');
      if (!card) return;

      const hasInline = card.getAttribute('onclick');
      if (hasInline) return;

      const images = parseImagesFromElement(card);
      if (!images.length) return;

      e.preventDefault();
      const title = card.dataset.galleryTitle || card.dataset.title || card.querySelector('h3,h4,strong')?.textContent?.trim() || 'Galeria';
      const subtitle = card.dataset.gallerySubtitle || card.dataset.subtitle || 'Selecione uma miniatura';
      openGallery({ title, subtitle, images });
    });
  }

  window.openPremiumGallery = openGallery;
  window.openGallery = openGallery;
  window.openPrintGallery = openGallery;
  window.openLessonGallery = openGallery;
  window.showPremiumGallery = openGallery;

  document.addEventListener('DOMContentLoaded', function () {
    ensureModal();
    autoBindCards();
  });
})();
