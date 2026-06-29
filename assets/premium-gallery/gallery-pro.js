(function(){
  const state = {
    open: false,
    m: 0,
    l: 0,
    app: "",
    title: "",
    images: [],
    current: 0,
    selected: new Set(),
    scale: 1,
    tx: 0,
    ty: 0,
    dragging: false,
    startX: 0,
    startY: 0,
    startTx: 0,
    startTy: 0
  };

  const manifest = window.GALLERY_MANIFEST || {};

  function qp(name){
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(name);
    return Number.isFinite(Number(raw)) ? Number(raw) : 0;
  }

  function detectApp(text){
    const t = (text || "").toLowerCase();
    if (t.includes("instagram") || t.includes("insta")) return "instagram";
    if (t.includes("canva")) return "canva";
    if (t.includes("capcut")) return "capcut";
    if (t.includes(" ia ") || t.includes("prompt") || t.includes("ia -") || t.includes("ia ")) return "ia";
    return "";
  }

  function titleCase(str){
    return (str || "").replace(/\s+/g," ").trim();
  }

  function getImages(m,l,app){
    const tryKeys = [
      `${m}-${l}-${app}`,
      `${m+1}-${l+1}-${app}`
    ];
    for(const key of tryKeys){
      if(Array.isArray(manifest[key]) && manifest[key].length){
        return manifest[key].slice(0,4);
      }
    }
    return [];
  }

  function getCardTitle(card, app){
    const titleEl = card.querySelector("h2,h3,h4,strong");
    if(titleEl && titleEl.textContent.trim()) return titleCase(titleEl.textContent);
    const lines = (card.innerText || "").split("\n").map(v=>v.trim()).filter(Boolean);
    return lines[0] || app;
  }

  function isGalleryCard(el){
    const txt = (el.innerText || "").toLowerCase();
    return (
      (txt.includes("clique para abrir o álbum") || txt.includes("clique para abrir o album")) &&
      (txt.includes("instagram") || txt.includes("canva") || txt.includes("capcut") || txt.includes("ia"))
    );
  }

  function bindCards(){
    const all = Array.from(document.querySelectorAll("div,article,a,button"));
    const cards = [];

    all.forEach(el => {
      if(!isGalleryCard(el)) return;

      let root = el;
      while(root.parentElement && root.parentElement !== document.body){
        const rect = root.getBoundingClientRect();
        const txt = (root.innerText || "").toLowerCase();
        if(rect.width > 220 && rect.height > 120 && txt.includes("clique para abrir")) break;
        root = root.parentElement;
      }

      if(!cards.includes(root)) cards.push(root);
    });

    cards.forEach(card => {
      const app = detectApp(card.innerText);
      if(!app) return;

      const title = getCardTitle(card, app);
      card.style.cursor = "pointer";
      card.onclick = function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        openGallery(app, title);
        return false;
      };
    });
  }

  function ensureModal(){
    if(document.getElementById("gpOverlay")) return;

    const html = `
      <div id="gpOverlay" class="gp-overlay gp-hidden">
        <div class="gp-shell">
          <div class="gp-header">
            <div>
              <div class="gp-kicker" id="gpKicker">GALERIA</div>
              <h2 class="gp-title" id="gpTitle">Galeria</h2>
              <p class="gp-subtitle">Duplo clique para dar zoom. Com zoom, clique e arraste a imagem.</p>
            </div>

            <div class="gp-toolbar">
              <button class="gp-btn" id="gpZoomOut">−</button>
              <button class="gp-btn" id="gpZoomIn">+</button>
              <button class="gp-btn" id="gpZoomReset">100%</button>
              <button class="gp-btn" id="gpShare">Compartilhar</button>
              <button class="gp-btn primary" id="gpDownloadOne">Baixar</button>
              <button class="gp-btn dark" id="gpCloseSoft">Sair</button>
              <button class="gp-btn primary" id="gpClose">×</button>
            </div>
          </div>

          <div class="gp-body">
            <div class="gp-view-wrap">
              <button class="gp-arrow" id="gpPrev">‹</button>

              <div class="gp-stage">
                <div class="gp-pan" id="gpPan">
                  <img id="gpMain" class="gp-main" alt="Imagem principal">
                </div>
                <div class="gp-zoom-pill" id="gpZoomPill">100%</div>
                <div class="gp-counter" id="gpCounter">1/4</div>
              </div>

              <button class="gp-arrow" id="gpNext">›</button>
            </div>

            <aside class="gp-side">
              <div>
                <h3>Imagens da galeria</h3>
                <p>Clique na miniatura para destacar. Clique no círculo para selecionar mais de uma imagem.</p>
              </div>

              <div class="gp-grid" id="gpThumbGrid"></div>

              <div class="gp-actions">
                <button class="gp-btn" id="gpSelectAll">Selecionar todas</button>
                <button class="gp-btn" id="gpClearSelection">Limpar seleção</button>
                <button class="gp-btn primary" id="gpDownloadSelected">Baixar selecionadas</button>
              </div>
            </aside>
          </div>

          <div class="gp-footer">
            <strong>Atalhos:</strong> ESC fecha · duplo clique amplia · clique e arraste move a imagem
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", html);

    document.getElementById("gpClose").addEventListener("click", closeGallery);
    document.getElementById("gpCloseSoft").addEventListener("click", closeGallery);
    document.getElementById("gpPrev").addEventListener("click", ()=>changeImage(-1));
    document.getElementById("gpNext").addEventListener("click", ()=>changeImage(1));
    document.getElementById("gpZoomIn").addEventListener("click", ()=>setZoom(state.scale + 0.25));
    document.getElementById("gpZoomOut").addEventListener("click", ()=>setZoom(state.scale - 0.25));
    document.getElementById("gpZoomReset").addEventListener("click", resetZoom);
    document.getElementById("gpDownloadOne").addEventListener("click", ()=>downloadFiles([state.current]));
    document.getElementById("gpDownloadSelected").addEventListener("click", ()=>downloadSelected());
    document.getElementById("gpSelectAll").addEventListener("click", selectAll);
    document.getElementById("gpClearSelection").addEventListener("click", clearSelection);
    document.getElementById("gpShare").addEventListener("click", shareCurrent);

    const main = document.getElementById("gpMain");

    main.addEventListener("dblclick", function(e){
      e.preventDefault();
      if(state.scale === 1){
        setZoom(2);
      } else {
        resetZoom();
      }
    });

    main.addEventListener("pointerdown", function(e){
      if(state.scale <= 1) return;
      state.dragging = true;
      state.startX = e.clientX;
      state.startY = e.clientY;
      state.startTx = state.tx;
      state.startTy = state.ty;
      main.classList.add("dragging");
      main.setPointerCapture(e.pointerId);
    });

    main.addEventListener("pointermove", function(e){
      if(!state.dragging) return;
      state.tx = state.startTx + (e.clientX - state.startX);
      state.ty = state.startTy + (e.clientY - state.startY);
      applyTransform();
    });

    function endDrag(e){
      state.dragging = false;
      main.classList.remove("dragging");
      try { main.releasePointerCapture(e.pointerId); } catch(_) {}
    }

    main.addEventListener("pointerup", endDrag);
    main.addEventListener("pointercancel", endDrag);
    main.addEventListener("pointerleave", endDrag);

    document.addEventListener("keydown", function(e){
      const overlay = document.getElementById("gpOverlay");
      if(!overlay || overlay.classList.contains("gp-hidden")) return;
      if(e.key === "Escape") closeGallery();
      if(e.key === "ArrowLeft") changeImage(-1);
      if(e.key === "ArrowRight") changeImage(1);
    });
  }

  function openGallery(app, title){
    ensureModal();

    state.m = qp("m");
    state.l = qp("l");
    state.app = app;
    state.title = title || app;
    state.images = getImages(state.m, state.l, app);
    state.current = 0;
    state.selected = new Set([0]);
    state.scale = 1;
    state.tx = 0;
    state.ty = 0;

    if(!state.images.length){
      alert("Não encontrei imagens para esta aula. Verifique se existem PNGs em assets/prints.");
      return;
    }

    document.getElementById("gpOverlay").classList.remove("gp-hidden");
    document.getElementById("gpKicker").textContent = app.toUpperCase();
    document.getElementById("gpTitle").textContent = state.title;

    renderThumbs();
    renderMain();
  }

  function closeGallery(){
    const overlay = document.getElementById("gpOverlay");
    if(overlay) overlay.classList.add("gp-hidden");
  }

  function renderThumbs(){
    const grid = document.getElementById("gpThumbGrid");
    grid.innerHTML = "";

    state.images.forEach((src, idx) => {
      const selected = state.selected.has(idx) ? "selected" : "";
      const active = state.current === idx ? "active" : "";
      const html = `
        <div class="gp-thumb ${selected} ${active}" data-index="${idx}">
          <button class="gp-check" data-select="${idx}">${state.selected.has(idx) ? "✓" : "+"}</button>
          <img src="${src}" alt="Imagem ${idx+1}" loading="eager">
        </div>
      `;
      grid.insertAdjacentHTML("beforeend", html);
    });

    grid.querySelectorAll(".gp-thumb").forEach(el => {
      el.addEventListener("click", function(e){
        if(e.target.closest(".gp-check")) return;
        state.current = Number(el.dataset.index);
        resetZoom(false);
        renderThumbs();
        renderMain();
      });
    });

    grid.querySelectorAll(".gp-check").forEach(btn => {
      btn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        const idx = Number(btn.dataset.select);
        if(state.selected.has(idx)){
          state.selected.delete(idx);
        } else {
          state.selected.add(idx);
        }
        renderThumbs();
      });
    });
  }

  function renderMain(){
    const main = document.getElementById("gpMain");
    const src = state.images[state.current];
    main.classList.add("is-loading");
    main.onload = ()=> main.classList.remove("is-loading");
    main.onerror = ()=> main.classList.remove("is-loading");
    main.src = src;
    applyTransform();
    document.getElementById("gpCounter").textContent = `${state.current + 1}/${state.images.length}`;
    document.getElementById("gpZoomPill").textContent = `${Math.round(state.scale * 100)}%`;
  }

  function changeImage(step){
    if(!state.images.length) return;
    state.current = (state.current + step + state.images.length) % state.images.length;
    resetZoom(false);
    renderThumbs();
    renderMain();
  }

  function setZoom(v){
    const next = Math.max(1, Math.min(4, Number(v.toFixed(2))));
    state.scale = next;
    if(state.scale === 1){
      state.tx = 0;
      state.ty = 0;
    }
    applyTransform();
  }

  function resetZoom(updateMain=true){
    state.scale = 1;
    state.tx = 0;
    state.ty = 0;
    applyTransform();
    if(updateMain){
      document.getElementById("gpZoomPill").textContent = "100%";
    }
  }

  function applyTransform(){
    const main = document.getElementById("gpMain");
    if(!main) return;
    main.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
    document.getElementById("gpZoomPill").textContent = `${Math.round(state.scale * 100)}%`;
  }

  function absoluteUrl(src){
    return new URL(src, window.location.href).href;
  }

  function downloadFiles(indices){
    const list = indices.map(i => state.images[i]).filter(Boolean);
    if(!list.length) return;

    list.forEach((src, i) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = src;
        a.download = src.split("/").pop() || `imagem-${i+1}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, i * 250);
    });
  }

  function downloadSelected(){
    const indices = Array.from(state.selected.values());
    if(!indices.length){
      downloadFiles([state.current]);
      return;
    }
    downloadFiles(indices);
  }

  function selectAll(){
    state.selected = new Set(state.images.map((_, i) => i));
    renderThumbs();
  }

  function clearSelection(){
    state.selected = new Set([state.current]);
    renderThumbs();
  }

  async function shareCurrent(){
    const src = absoluteUrl(state.images[state.current]);
    const title = state.title || "Imagem da galeria";

    if(navigator.share){
      try{
        await navigator.share({
          title,
          text: title,
          url: src
        });
      } catch(_) {}
      return;
    }

    try{
      await navigator.clipboard.writeText(src);
      alert("Link da imagem copiado.");
    } catch(_) {
      window.open(src, "_blank");
    }
  }

  document.addEventListener("DOMContentLoaded", function(){
    bindCards();
  });
})();
