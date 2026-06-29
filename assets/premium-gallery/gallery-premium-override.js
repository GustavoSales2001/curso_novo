(() => {
  const processed = new WeakSet();

  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const visible = (el) => {
    if (!el || !(el instanceof Element)) return false;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && r.width > 20 && r.height > 20;
  };
  const area = (el) => {
    const r = el.getBoundingClientRect();
    return r.width * r.height;
  };

  const uniqueBy = (arr, fn) => arr.filter((item, idx) => arr.findIndex(x => fn(x) === fn(item)) === idx);

  function downloadFile(url, name) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name || 'imagem.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function shareImage(url, title) {
    if (navigator.share) {
      try {
        await navigator.share({ title: title || 'Imagem', url });
        return;
      } catch (_) {}
    }
    try {
      await navigator.clipboard.writeText(url);
      alert('Link da imagem copiado.');
    } catch (_) {
      window.open(url, '_blank');
    }
  }

  function findGalleryRoot() {
    const candidates = qsa('body *').filter(el => visible(el) && el.querySelectorAll('img').length >= 5);
    if (!candidates.length) return null;

    const scored = candidates.map(el => {
      const rect = el.getBoundingClientRect();
      const imgCount = el.querySelectorAll('img').length;
      const text = (el.textContent || '').toLowerCase();
      const hasControls = /imagem|galeria|baixar|selecionar/.test(text);
      return {
        el,
        score: (hasControls ? 6000 : 0) + (imgCount * 50) + ((rect.width * rect.height) / 1000)
      };
    }).sort((a, b) => b.score - a.score);

    return scored[0]?.el || null;
  }

  function pickMainAndThumbs(root) {
    const imgs = qsa('img', root).filter(visible);
    if (imgs.length < 2) return null;

    const main = imgs.slice().sort((a, b) => area(b) - area(a))[0];
    const stage = main.parentElement || main;

    const stageRect = stage.getBoundingClientRect();

    let thumbs = imgs.filter(img => img !== main).map(img => ({
      el: img,
      rect: img.getBoundingClientRect(),
      key: img.dataset.full || img.currentSrc || img.src || '',
      full: img.dataset.full || img.currentSrc || img.src || '',
      thumb: img.currentSrc || img.src || '',
      alt: img.alt || ''
    }))
    .filter(item => item.rect.width < 230 && item.rect.height < 260);

    thumbs.sort((a, b) => {
      const ad = Math.abs(a.rect.top - stageRect.bottom) + Math.abs(a.rect.left - stageRect.left);
      const bd = Math.abs(b.rect.top - stageRect.bottom) + Math.abs(b.rect.left - stageRect.left);
      return ad - bd;
    });

    thumbs = uniqueBy(thumbs, x => x.key).slice(0, 4);

    if (!thumbs.length) return null;

    return { main, stage, thumbs };
  }

  function bindZoom(main, stage) {
    const state = { scale: 1, x: 0, y: 0, dragging: false, startX: 0, startY: 0 };

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    function apply(animate = false) {
      main.style.transition = animate ? 'transform .18s ease' : 'none';
      main.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`;
      main.classList.toggle('pg-zoomed', state.scale > 1.01);
      const badge = stage.querySelector('.pg-zoom-badge');
      if (badge) badge.textContent = `${Math.round(state.scale * 100)}%`;
    }

    function reset(animate = true) {
      state.scale = 1;
      state.x = 0;
      state.y = 0;
      apply(animate);
    }

    function zoomIn() {
      state.scale = clamp(state.scale + 0.2, 1, 4);
      apply(true);
    }

    function zoomOut() {
      state.scale = clamp(state.scale - 0.2, 1, 4);
      if (state.scale <= 1) {
        state.scale = 1;
        state.x = 0;
        state.y = 0;
      }
      apply(true);
    }

    stage.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (state.scale > 1.01) reset();
      else {
        state.scale = 2.2;
        state.x = 0;
        state.y = 0;
        apply(true);
      }
    });

    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    }, { passive: false });

    stage.addEventListener('mousedown', (e) => {
      if (state.scale <= 1.01) return;
      state.dragging = true;
      state.startX = e.clientX - state.x;
      state.startY = e.clientY - state.y;
      stage.classList.add('pg-dragging');
    });

    window.addEventListener('mousemove', (e) => {
      if (!state.dragging) return;
      state.x = e.clientX - state.startX;
      state.y = e.clientY - state.startY;
      apply(false);
    });

    window.addEventListener('mouseup', () => {
      if (!state.dragging) return;
      state.dragging = false;
      stage.classList.remove('pg-dragging');
    });

    return { reset, zoomIn, zoomOut };
  }

  function closeGallery(root) {
    const closeEl = qsa('button, a, div, span', root).find(el => ['×', 'x', 'X'].includes((el.textContent || '').trim()));
    if (closeEl) {
      closeEl.click();
      return;
    }
    if (window.history.length > 1) {
      history.back();
      return;
    }
    root.remove();
  }

  function enhance(root) {
    if (!root || processed.has(root)) return;

    const data = pickMainAndThumbs(root);
    if (!data) return;

    processed.add(root);
    root.classList.add('pg-premium-root');

    const titleEl = root.querySelector('h1, h2') || root.querySelector('strong');
    if (titleEl) titleEl.classList.add('pg-premium-main-title');

    data.stage.classList.add('pg-stage');
    data.main.classList.add('pg-main-image');
    data.main.draggable = false;

    const badge = document.createElement('div');
    badge.className = 'pg-zoom-badge';
    badge.textContent = '100%';
    if (!data.stage.querySelector('.pg-zoom-badge')) {
      data.stage.appendChild(badge);
    }

    const items = data.thumbs.map((item, index) => ({
      index,
      thumb: item.thumb,
      full: item.full || item.thumb,
      title: item.alt || `Imagem ${index + 1}`
    }));

    data.thumbs.forEach(item => {
      item.el.classList.add('pg-original-thumb-hidden');
      const parent = item.el.parentElement;
      if (parent && parent !== root && parent !== data.stage && parent.children.length <= 3) {
        parent.classList.add('pg-original-thumb-hidden');
      }
    });

    const zoom = bindZoom(data.main, data.stage);

    const actionBar = document.createElement('div');
    actionBar.className = 'pg-premium-actions';
    actionBar.innerHTML = `
      <button type="button" class="pg-premium-action" data-pg="share">Compartilhar</button>
      <button type="button" class="pg-premium-action is-primary" data-pg="download-current">Baixar</button>
      <button type="button" class="pg-premium-action" data-pg="exit">Sair</button>
    `;
    root.appendChild(actionBar);

    const sep = document.createElement('div');
    sep.className = 'pg-fade-sep';
    data.stage.after(sep);

    const thumbBar = document.createElement('div');
    thumbBar.className = 'pg-thumb-bar';

    const bottomActions = document.createElement('div');
    bottomActions.className = 'pg-bottom-actions';
    bottomActions.innerHTML = `
      <button type="button" class="pg-premium-action" data-pg="select-all">Selecionar todas</button>
      <button type="button" class="pg-premium-action" data-pg="clear">Limpar seleção</button>
      <button type="button" class="pg-premium-action is-primary" data-pg="download-selected">Baixar selecionadas</button>
    `;

    const help = document.createElement('div');
    help.className = 'pg-help-line';
    help.textContent = 'Dica: duplo clique amplia, clique e arraste move a imagem, ESC fecha.';

    data.stage.after(help);
    data.stage.after(bottomActions);
    data.stage.after(thumbBar);

    const state = {
      active: 0,
      selected: new Set(),
      items,
      root,
      main: data.main,
      zoom
    };

    function setMain(index) {
      const item = state.items[index];
      if (!item) return;
      state.active = index;
      state.main.src = item.full || item.thumb;
      state.main.alt = item.title || `Imagem ${index + 1}`;
      state.zoom.reset();
      renderThumbs();
    }

    function toggleSelected(index) {
      if (state.selected.has(index)) state.selected.delete(index);
      else state.selected.add(index);
      renderThumbs();
    }

    function renderThumbs() {
      thumbBar.innerHTML = '';
      state.items.forEach((item, index) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'pg-thumb-card' +
          (index === state.active ? ' is-active' : '') +
          (state.selected.has(index) ? ' is-selected' : '');

        const img = document.createElement('img');
        img.src = item.thumb;
        img.alt = item.title || `Imagem ${index + 1}`;
        img.draggable = false;

        const sel = document.createElement('button');
        sel.type = 'button';
        sel.className = 'pg-thumb-select';
        sel.textContent = state.selected.has(index) ? '✓' : '+';

        sel.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleSelected(index);
        });

        card.addEventListener('click', () => setMain(index));

        card.appendChild(img);
        card.appendChild(sel);
        thumbBar.appendChild(card);
      });
    }

    renderThumbs();

    const existingButtons = qsa('button, div, span', root);
    const minus = existingButtons.find(el => (el.textContent || '').trim() === '-');
    const plus = existingButtons.find(el => (el.textContent || '').trim() === '+');
    const close = existingButtons.find(el => ['×', 'x', 'X'].includes((el.textContent || '').trim()));

    if (minus && !minus.dataset.pgBound) {
      minus.dataset.pgBound = '1';
      minus.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); zoom.zoomOut(); });
    }

    if (plus && !plus.dataset.pgBound) {
      plus.dataset.pgBound = '1';
      plus.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); zoom.zoomIn(); });
    }

    if (close && !close.dataset.pgBound) {
      close.dataset.pgBound = '1';
      close.addEventListener('click', () => {});
    }

    actionBar.querySelector('[data-pg="exit"]').addEventListener('click', () => closeGallery(root));

    actionBar.querySelector('[data-pg="share"]').addEventListener('click', () => {
      const current = state.items[state.active];
      shareImage(current.full || current.thumb, current.title);
    });

    actionBar.querySelector('[data-pg="download-current"]').addEventListener('click', () => {
      const current = state.items[state.active];
      downloadFile(current.full || current.thumb, `imagem-${state.active + 1}.png`);
    });

    bottomActions.querySelector('[data-pg="select-all"]').addEventListener('click', () => {
      state.items.forEach((_, index) => state.selected.add(index));
      renderThumbs();
    });

    bottomActions.querySelector('[data-pg="clear"]').addEventListener('click', () => {
      state.selected.clear();
      renderThumbs();
    });

    bottomActions.querySelector('[data-pg="download-selected"]').addEventListener('click', () => {
      const list = [...state.selected];
      if (!list.length) {
        alert('Selecione pelo menos uma imagem.');
        return;
      }
      list.forEach(index => {
        const item = state.items[index];
        downloadFile(item.full || item.thumb, `imagem-${index + 1}.png`);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeGallery(root);
    });

    state.main.src = state.items[0].full || state.items[0].thumb;
  }

  function boot() {
    const root = findGalleryRoot();
    if (root) enhance(root);
  }

  window.addEventListener('load', () => setTimeout(boot, 300));
  setTimeout(boot, 600);

  const observer = new MutationObserver(() => {
    setTimeout(boot, 80);
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
