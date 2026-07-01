(function () {
  const state = {
    images: [],
    titles: [],
    index: 0,
    scale: 1,
    x: 0,
    y: 0,
    dragging: false,
    sx: 0,
    sy: 0,
    ox: 0,
    oy: 0
  };

  function $(id) {
    return document.getElementById(id);
  }

  function abs(src) {
    return new URL(src, window.location.href).href;
  }

  function makeModal() {
    if ($("studyViewer")) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div id="studyViewer" class="study-viewer study-viewer-hidden">
        <div class="study-viewer-shell">
          <header class="study-viewer-header">
            <div>
              <div class="study-viewer-kicker">Ambiente de estudo</div>
              <h2 id="studyTitle" class="study-viewer-title">Print explicativo</h2>
              <p class="study-viewer-subtitle">
                Duplo clique para ampliar. Com zoom, clique e arraste para ler os detalhes.
              </p>
            </div>

            <div class="study-viewer-toolbar">
              <button id="studyZoomOut" class="study-btn" type="button">−</button>
              <button id="studyZoomIn" class="study-btn" type="button">+</button>
              <button id="studyFit" class="study-btn" type="button">Ajustar</button>
              <button id="studyOpen" class="study-btn spotlight" type="button">🔎 Ver em alta</button>
              <button id="studyDownload" class="study-btn primary" type="button">Baixar imagem</button>
              <button id="studyClose" class="study-btn dark" type="button">Fechar</button>
            </div>
          </header>

          <main class="study-viewer-body">
            <section class="study-stage-wrap">
              <button id="studyPrev" class="study-arrow" type="button">‹</button>

              <div class="study-stage">
                <div id="studyPan" class="study-pan">
                  <img id="studyMain" class="study-main-img" draggable="false" alt="Print da aula">
                </div>
                <div id="studyZoomPill" class="study-pill">100%</div>
                <div id="studyCounter" class="study-counter">1/4</div>
              </div>

              <button id="studyNext" class="study-arrow" type="button">›</button>
            </section>

            <aside class="study-side">
              <div>
                <h3>Prints da aula</h3>
                <p>Clique em uma miniatura para trocar. Use o zoom para estudar letras pequenas.</p>
              </div>

              <div id="studyThumbs" class="study-thumbs"></div>

              <div class="study-box">
                <strong>Como estudar melhor:</strong><br>
                • Clique 1 vez na imagem para aproximar.<br>
                • Duplo clique alterna zoom forte.<br>
                • Arraste a imagem ampliada.<br>
                • Use “Ver em alta” para abrir o arquivo original.
              </div>

              <div class="study-side-actions">
                <button id="studyDownloadAll" class="study-btn primary" type="button">Baixar todos os prints</button>
              </div>
            </aside>
          </main>

          <footer class="study-viewer-footer">
            <strong>Atalhos:</strong> ESC fecha · setas navegam · duplo clique amplia · roda do mouse ajusta zoom · arraste move a imagem
          </footer>
        </div>
      </div>
    `);

    bind();
  }

  function bind() {
    $("studyClose").onclick = close;
    $("studyPrev").onclick = () => move(-1);
    $("studyNext").onclick = () => move(1);
    $("studyZoomIn").onclick = () => setZoom(state.scale + .25);
    $("studyZoomOut").onclick = () => setZoom(state.scale - .25);
    $("studyFit").onclick = fit;
    $("studyOpen").onclick = openOriginal;
    $("studyDownload").onclick = () => download(state.index);
    $("studyDownloadAll").onclick = downloadAll;

    const main = $("studyMain");

    main.addEventListener("dblclick", function (e) {
      e.preventDefault();
      state.scale <= 1 ? setZoom(2.35) : fit();
    });

    main.addEventListener("click", function () {
      if (state.scale <= 1) setZoom(1.75);
    });

    $("studyPan").addEventListener("wheel", function (e) {
      e.preventDefault();
      setZoom(state.scale + (e.deltaY > 0 ? -.18 : .18));
    }, { passive: false });

    main.addEventListener("pointerdown", function (e) {
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
    });

    main.addEventListener("pointermove", function (e) {
      if (!state.dragging) return;

      state.x = state.ox + e.clientX - state.sx;
      state.y = state.oy + e.clientY - state.sy;

      apply();
    });

    main.addEventListener("pointerup", stopDrag);
    main.addEventListener("pointercancel", stopDrag);
    main.addEventListener("pointerleave", stopDrag);

    document.addEventListener("keydown", function (e) {
      const viewer = $("studyViewer");
      if (!viewer || viewer.classList.contains("study-viewer-hidden")) return;

      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "+") setZoom(state.scale + .25);
      if (e.key === "-") setZoom(state.scale - .25);
      if (e.key === "0") fit();
    });
  }

  function stopDrag(e) {
    state.dragging = false;
    $("studyMain").classList.remove("dragging");

    try {
      $("studyMain").releasePointerCapture(e.pointerId);
    } catch (_) {}
  }

  function collectImages(clickedImg) {
    const section =
      clickedImg.closest("section") ||
      clickedImg.closest("main") ||
      document;

    let imgs = Array.from(section.querySelectorAll("img"))
      .filter(img => {
        const src = img.currentSrc || img.src;
        const rect = img.getBoundingClientRect();

        return src &&
          rect.width > 70 &&
          rect.height > 70 &&
          !src.includes("data:image") &&
          !img.closest("#studyViewer");
      });

    const seen = new Set();

    imgs = imgs.filter(img => {
      const src = img.currentSrc || img.src;
      if (seen.has(src)) return false;
      seen.add(src);
      return true;
    });

    let start = imgs.indexOf(clickedImg);

    if (start < 0) {
      imgs.unshift(clickedImg);
      start = 0;
    }

    return {
      images: imgs.map(img => img.currentSrc || img.src),
      titles: imgs.map((img, i) => img.alt || img.closest(".card")?.innerText?.trim() || `Print ${i + 1}`),
      start
    };
  }

  function openFromImage(img) {
    makeModal();

    const data = collectImages(img);

    state.images = data.images;
    state.titles = data.titles;
    state.index = data.start;
    state.scale = 1;
    state.x = 0;
    state.y = 0;

    $("studyViewer").classList.remove("study-viewer-hidden");
    document.body.style.overflow = "hidden";

    renderThumbs();
    renderMain();
  }

  function renderMain() {
    const src = state.images[state.index];
    const title = state.titles[state.index] || `Print ${state.index + 1}`;

    $("studyMain").src = src;
    $("studyMain").alt = title;
    $("studyTitle").textContent = title.split("\n")[0].slice(0, 72);
    $("studyCounter").textContent = `${state.index + 1}/${state.images.length}`;

    fit();
  }

  function renderThumbs() {
    const box = $("studyThumbs");
    box.innerHTML = "";

    state.images.forEach((src, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "study-thumb" + (index === state.index ? " active" : "");
      btn.innerHTML = `<img src="${src}" alt="Miniatura ${index + 1}">`;

      btn.onclick = function () {
        state.index = index;
        renderThumbs();
        renderMain();
      };

      box.appendChild(btn);
    });
  }

  function move(step) {
    state.index = (state.index + step + state.images.length) % state.images.length;
    renderThumbs();
    renderMain();
  }

  function setZoom(value) {
    state.scale = Math.max(1, Math.min(6, Number(value.toFixed(2))));

    if (state.scale === 1) {
      state.x = 0;
      state.y = 0;
    }

    apply();
  }

  function fit() {
    state.scale = 1;
    state.x = 0;
    state.y = 0;
    apply();
  }

  function apply() {
    const main = $("studyMain");

    main.classList.toggle("zoomed", state.scale > 1);
    main.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;

    $("studyZoomPill").textContent = `${Math.round(state.scale * 100)}%`;
  }

  function close() {
    $("studyViewer").classList.add("study-viewer-hidden");
    document.body.style.overflow = "";
  }

  function openOriginal() {
    const src = state.images[state.index];
    if (src) window.open(abs(src), "_blank");
  }

  function download(index) {
    const src = state.images[index];
    if (!src) return;

    const a = document.createElement("a");
    a.href = src;
    a.download = src.split("/").pop() || `print-${index + 1}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadAll() {
    state.images.forEach((_, index) => {
      setTimeout(() => download(index), index * 250);
    });
  }

  document.addEventListener("click", function (e) {
    const img = e.target.closest("img");

    if (!img || img.closest("#studyViewer")) return;

    const src = img.currentSrc || img.src;
    const textAround = img.closest("section, main, article, div")?.innerText?.toLowerCase() || "";

    const isLessonPrint =
      textAround.includes("prints explicativos") ||
      textAround.includes("instagram") ||
      textAround.includes("canva") ||
      textAround.includes("capcut") ||
      textAround.includes("ia");

    if (!isLessonPrint) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    openFromImage(img);
  }, true);

  window.openStudyViewerFromImage = openFromImage;
})();
