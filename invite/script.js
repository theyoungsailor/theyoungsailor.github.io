(() => {
  const root = document.getElementById("interactive-invite");
  if (!root) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const detailsUrl = root.getAttribute("data-details-url") || "";
  const mainBtn = root.querySelector("[data-main-btn]");
  const mainLabel = root.querySelector(".ii__btn-label");
  const restartBtn = root.querySelector("[data-restart-btn]");

  const envelopeWrap = root.querySelector(".ii__envelope");
  const outerLayer = root.querySelector('[data-draggable="outer"]');
  const innerLayer = root.querySelector('[data-draggable="inner"]');

  const hintDrag = root.querySelector("[data-hint-drag]");
  const hintTap = root.querySelector("[data-hint-tap]");

  const daisyLayer = document.querySelector(".daisy-layer");

  let state = "front";
  let countdownTimer = null;
  let countdownLeft = 0;

  const keyDrag = "invite_hint_drag_done";
  const keyTap = "invite_hint_tap_done";

  const openTimers = [];

  const assets = [
    "../imagens/envelope-front1.png",
    "../imagens/envelope-back-filled1.png",
    "../imagens/outer-front2.png",
    "../imagens/inner-fron1.png.png",
    "../imagens/inner-back1.png",
    "../imagens/arrow.png",
    "../imagens/outline1.png",
    "../imagens/daisy.png",
  ];

  function clearOpenTimers() {
    while (openTimers.length) {
      clearTimeout(openTimers.pop());
    }
  }

  function setState(next) {
    state = next;
    root.setAttribute("data-state", next);
    if (next === "ready") applyHintVisibility();
  }

  function setButton(label, disabled) {
    if (!mainLabel || !mainBtn) return;
    mainLabel.textContent = label;
    if (disabled) {
      mainBtn.classList.add("is-disabled");
      mainBtn.setAttribute("disabled", "disabled");
    } else {
      mainBtn.classList.remove("is-disabled");
      mainBtn.removeAttribute("disabled");
    }
  }

  function clearCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function startCountdown(seconds) {
    clearCountdown();
    countdownLeft = seconds;
    setButton(`Detalhes (${countdownLeft})`, true);

    countdownTimer = setInterval(() => {
      countdownLeft -= 1;
      if (countdownLeft <= 0) {
        clearCountdown();
        setButton("Detalhes", false);
        return;
      }
      setButton(`Detalhes (${countdownLeft})`, true);
    }, 1000);
  }

  function resetTransforms() {
    [outerLayer, innerLayer].forEach((el) => {
      if (!el) return;
      el.style.transform = "";
      el.dataset.tx = "0";
      el.dataset.ty = "0";
    });
    if (innerLayer) innerLayer.classList.remove("is-flipped");
  }

  function applyHintVisibility(forceShow = false) {
    if (!hintDrag || !hintTap) return;

    if (forceShow) {
      hintDrag.classList.remove("is-hidden");
      hintTap.classList.remove("is-hidden");
      return;
    }

    let dragDone = false;
    let tapDone = false;
    try {
      dragDone = localStorage.getItem(keyDrag) === "1";
      tapDone = localStorage.getItem(keyTap) === "1";
    } catch (error) {
      dragDone = false;
      tapDone = false;
    }
    hintDrag.classList.toggle("is-hidden", dragDone);
    hintTap.classList.toggle("is-hidden", tapDone);
  }

  function markDragDone() {
    if (!hintDrag) return;
    hintDrag.classList.add("is-hidden");
    try {
      localStorage.setItem(keyDrag, "1");
    } catch (error) {
      return;
    }
  }

  function markTapDone() {
    if (!hintTap) return;
    hintTap.classList.add("is-hidden");
    try {
      localStorage.setItem(keyTap, "1");
    } catch (error) {
      return;
    }
  }

  function resetHintsOnRestart() {
    try {
      localStorage.removeItem(keyDrag);
      localStorage.removeItem(keyTap);
    } catch (error) {
      return;
    }
    applyHintVisibility(true);
  }

  function preload(urls) {
    urls.forEach((url) => {
      if (!url) return;
      const img = new Image();
      img.src = new URL(url, document.baseURI).href;
    });
  }

  function goFront() {
    clearOpenTimers();
    clearCountdown();

    setState("front");

    envelopeWrap?.classList.remove("is-flipped");
    envelopeWrap?.classList.remove("ii__debug-hide");
    envelopeWrap?.classList.remove("ii__envelope--behind");

    if (envelopeWrap) {
      envelopeWrap.style.animation = "none";
      envelopeWrap.offsetHeight;
      envelopeWrap.style.animation = "";
    }

    resetTransforms();
    resetHintsOnRestart();

    setButton("Virar", false);
    if (restartBtn) restartBtn.hidden = true;
  }

  function goBack() {
    setState("back");
    envelopeWrap?.classList.add("is-flipped");
    setButton("Abrir", false);
    if (restartBtn) restartBtn.hidden = true;
  }

  function openEnvelope() {
    clearOpenTimers();

    if (prefersReducedMotion) {
      setState("ready");
      envelopeWrap?.classList.add("ii__debug-hide");
      setButton("Detalhes", false);
      if (restartBtn) restartBtn.hidden = false;
      return;
    }

    setState("opening");
    if (restartBtn) restartBtn.hidden = false;

    startCountdown(10);

    if (envelopeWrap) {
      envelopeWrap.classList.remove("ii__debug-hide");
      envelopeWrap.classList.remove("ii__envelope--behind");

      envelopeWrap.style.animation = "none";
      envelopeWrap.offsetHeight;
      envelopeWrap.style.animation = "";
    }

    openTimers.push(
      setTimeout(() => {
        envelopeWrap?.classList.add("ii__envelope--behind");
      }, 560)
    );

    openTimers.push(
      setTimeout(() => {
        setState("revealed");
      }, 720)
    );

    openTimers.push(
      setTimeout(() => {
        envelopeWrap?.classList.add("ii__debug-hide");
        envelopeWrap?.classList.remove("ii__envelope--behind");
        setState("ready");
      }, 1500)
    );
  }

  function goDetails() {
    if (!detailsUrl) return;
    window.location.href = detailsUrl;
  }

  function handleMainClick() {
    if (mainBtn?.hasAttribute("disabled")) return;

    if (state === "front") {
      goBack();
      return;
    }
    if (state === "back") {
      openEnvelope();
      return;
    }
    if (state === "ready") {
      goDetails();
    }
  }

  function makeDraggable(el, opts = {}) {
    if (!el) return;
    const allowTapFlip = Boolean(opts.allowTapFlip);
    const onTapFlip = opts.onTapFlip || (() => {});
    const onFirstDrag = opts.onFirstDrag || (() => {});
    const onFirstTap = opts.onFirstTap || (() => {});

    el.dataset.tx = el.dataset.tx || "0";
    el.dataset.ty = el.dataset.ty || "0";

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let baseX = 0;
    let baseY = 0;
    let isDown = false;
    let isDragging = false;
    let dragNotified = false;

    const DRAG_THRESHOLD = 5;

    function applyTransform(x, y) {
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.dataset.tx = String(x);
      el.dataset.ty = String(y);
    }

    el.addEventListener("pointerdown", (event) => {
      if (state !== "ready" && state !== "revealed") return;

      pointerId = event.pointerId;
      isDown = true;
      isDragging = false;

      startX = event.clientX;
      startY = event.clientY;

      baseX = parseFloat(el.dataset.tx || "0") || 0;
      baseY = parseFloat(el.dataset.ty || "0") || 0;

      el.setPointerCapture(pointerId);
    });

    el.addEventListener(
      "pointermove",
      (event) => {
        if (!isDown) return;
        if (event.pointerId !== pointerId) return;

        const dx = event.clientX - startX;
        const dy = event.clientY - startY;

        if (!isDragging) {
          if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
            isDragging = true;
          }
        }

        if (isDragging) {
          event.preventDefault();
          applyTransform(baseX + dx, baseY + dy);

          if (!dragNotified) {
            dragNotified = true;
            onFirstDrag();
          }
        }
      },
      { passive: false }
    );

    el.addEventListener("pointerup", (event) => {
      if (!isDown) return;
      if (event.pointerId !== pointerId) return;

      isDown = false;

      if (!isDragging && allowTapFlip) {
        onFirstTap();
        onTapFlip();
      }
    });

    el.addEventListener("pointercancel", (event) => {
      if (event.pointerId !== pointerId) return;
      isDown = false;
      isDragging = false;
    });
  }

  function createDaisies() {
    if (!daisyLayer) return;
    const count = 10;

    for (let i = 0; i < count; i += 1) {
      const img = document.createElement("img");
      img.src = new URL("../imagens/daisy.png", document.baseURI).href;
      img.alt = "";
      img.className = "daisy-layer__item";
      img.style.left = `${Math.random() * 100}%`;
      img.style.top = `${Math.random() * 100}%`;
      img.style.animationDelay = `${Math.random() * 6}s`;
      img.style.animationDuration = `${12 + Math.random() * 10}s`;
      daisyLayer.appendChild(img);
    }
  }

  if (mainBtn) {
    mainBtn.addEventListener("click", handleMainClick);
  }

  if (restartBtn) {
    restartBtn.addEventListener("click", goFront);
  }

  makeDraggable(outerLayer, {
    allowTapFlip: false,
    onFirstDrag: () => markDragDone(),
  });

  makeDraggable(innerLayer, {
    allowTapFlip: true,
    onFirstDrag: () => markDragDone(),
    onFirstTap: () => markTapDone(),
    onTapFlip: () => {
      if (!innerLayer) return;
      innerLayer.classList.toggle("is-flipped");
    },
  });

  createDaisies();

  preload(assets);
  goFront();
})();
