(function(){
  "use strict";

  const CONFIG = {
    detailsUrl: "../pages/casamento",
    assets: {
      envelopeFront: "../imagens/envelope-front1.png",
      envelopeBack: "../imagens/envelope-back-filled1.png",
      envelopePiece: "../imagens/envelope-piece.png",
      inviteOuter: "../imagens/outer-front.png",
      innerFront: "../imagens/inner-fron1.png",
      innerBack: "../imagens/inner-back1.png",
      restartIcon: "../imagens/restart.png",
      hintArrow: "../imagens/arrow.png",
      daisies: [
        "../imagens/daisy.png",
        "../imagens/daisy1.png",
        "../imagens/daisy2.png"
      ]
    },
    daisy: {
      maxOnScreen: 18,
      spawnEveryMs: 420,
      fadeInMs: 700,
      holdMs: 2600,
      fadeOutMs: 900,
      minSize: 22,
      maxSize: 64,
      driftPx: 26,
      rotateDeg: 28,
      avoidDistancePx: 54
    }
  };

  function absUrl(rel){
    return new URL(rel, document.baseURI).href;
  }

  function preload(urls){
    urls.forEach((u) => {
      if(!u) return;
      const img = new Image();
      img.src = absUrl(u);
    });
  }

  function prefersReducedMotion(){
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function clamp(n, a, b){
    return Math.max(a, Math.min(b, n));
  }

  function rand(min, max){
    return min + Math.random() * (max - min);
  }

  function pick(list){
    return list[Math.floor(Math.random() * list.length)];
  }

  function safeLocalStorageGet(key){
    try{ return localStorage.getItem(key); }catch(e){ return null; }
  }

  function safeLocalStorageSet(key, val){
    try{ localStorage.setItem(key, val); }catch(e){}
  }

  function safeLocalStorageRemove(key){
    try{ localStorage.removeItem(key); }catch(e){}
  }

  function initDaisies(){
    const layer = document.getElementById("daisy-layer");
    if(!layer) return;

    const sources = (CONFIG.assets.daisies || []).map(absUrl);
    const fallback = absUrl("../imagens/daisy.png");

    const getSrc = () => {
      const c = sources.length ? pick(sources) : fallback;
      return c || fallback;
    };

    const reduced = prefersReducedMotion();
    const spawnEvery = reduced ? 1200 : CONFIG.daisy.spawnEveryMs;
    const maxOnScreen = reduced ? 8 : CONFIG.daisy.maxOnScreen;

    const active = [];
    const positions = [];

    function farEnough(x, y, dist){
      for(let i = 0; i < positions.length; i++){
        const p = positions[i];
        const dx = p.x - x;
        const dy = p.y - y;
        if(Math.hypot(dx, dy) < dist) return false;
      }
      return true;
    }

    function cleanup(){
      const now = performance.now();
      for(let i = active.length - 1; i >= 0; i--){
        const it = active[i];
        if(now >= it.deadAt){
          if(it.el && it.el.parentNode) it.el.parentNode.removeChild(it.el);
          active.splice(i, 1);
          positions.splice(i, 1);
        }
      }
    }

    function spawn(){
      cleanup();
      if(active.length >= maxOnScreen) return;

      const w = window.innerWidth || 1024;
      const h = window.innerHeight || 768;

      const size = rand(CONFIG.daisy.minSize, CONFIG.daisy.maxSize);
      const pad = clamp(size * 0.6, 16, 42);

      let tries = 0;
      let x = 0;
      let y = 0;

      while(tries < 14){
        x = rand(pad, w - pad);
        y = rand(pad, h - pad);
        if(farEnough(x, y, CONFIG.daisy.avoidDistancePx)) break;
        tries += 1;
      }

      const el = document.createElement("img");
      el.className = "daisy";
      el.alt = "";
      el.decoding = "async";
      el.loading = "lazy";
      el.draggable = false;
      el.setAttribute("aria-hidden", "true");
      el.src = getSrc();
      el.style.width = `${Math.round(size)}px`;
      el.style.height = `${Math.round(size)}px`;

      const driftX = rand(-CONFIG.daisy.driftPx, CONFIG.daisy.driftPx);
      const driftY = rand(-CONFIG.daisy.driftPx, CONFIG.daisy.driftPx);
      const rotDir = Math.random() < 0.5 ? -1 : 1;
      const rot = rotDir * rand(CONFIG.daisy.rotateDeg * 0.45, CONFIG.daisy.rotateDeg);

      const fadeIn = reduced ? 1 : CONFIG.daisy.fadeInMs;
      const hold = reduced ? 1 : CONFIG.daisy.holdMs;
      const fadeOut = reduced ? 1 : CONFIG.daisy.fadeOutMs;
      const total = fadeIn + hold + fadeOut;

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;

      layer.appendChild(el);

      const startAt = performance.now();
      const deadAt = startAt + total + 120;

      positions.push({ x, y });

      function tick(now){
        const t = now - startAt;

        let opacity = 1;
        if(t <= fadeIn){
          opacity = fadeIn <= 1 ? 1 : t / fadeIn;
        }else if(t <= fadeIn + hold){
          opacity = 1;
        }else{
          const u = (t - fadeIn - hold) / fadeOut;
          opacity = 1 - clamp(u, 0, 1);
        }

        const p = clamp(t / total, 0, 1);
        const tx = driftX * p;
        const ty = driftY * p;
        const r = rot * p;

        el.style.opacity = String(opacity);
        el.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${r}deg)`;

        if(now < deadAt){
          requestAnimationFrame(tick);
        }
      }

      requestAnimationFrame(tick);
      active.push({ el, deadAt });
    }

    const interval = window.setInterval(spawn, spawnEvery);

    window.addEventListener("resize", () => {
      cleanup();
      if(active.length > maxOnScreen){
        for(let i = active.length - 1; i >= maxOnScreen; i--){
          const it = active[i];
          if(it.el && it.el.parentNode) it.el.parentNode.removeChild(it.el);
          active.splice(i, 1);
          positions.splice(i, 1);
        }
      }
    }, { passive: true });

    for(let i = 0; i < Math.min(6, maxOnScreen); i++){
      window.setTimeout(spawn, i * 90);
    }

    preload([fallback, ...sources]);

    return () => window.clearInterval(interval);
  }

  function initInvite(){
    const root = document.getElementById("interactive-invite");
    if(!root) return;

    if(root.getAttribute("data-details-url") === "../pages/casamento"){
      root.setAttribute("data-details-url", CONFIG.detailsUrl);
    }

    const detailsUrl = root.getAttribute("data-details-url") || "";

    const envelopeBtn = root.querySelector("[data-envelope-btn]");
    const envelopeWrap = root.querySelector(".ii__envelope");
    const openBtn = root.querySelector("[data-open-btn]");
    const openLabel = openBtn ? openBtn.querySelector(".ii__btn-label") : null;
    const restartBtn = root.querySelector("[data-restart-btn]");

    const outerLayer = root.querySelector('[data-draggable="outer"]');
    const innerLayer = root.querySelector('[data-draggable="inner"]');

    const hintDrag = root.querySelector("[data-hint-drag]");
    const hintTap = root.querySelector("[data-hint-tap]");

    const envelopePiece = root.querySelector("[data-envelope-piece]");

    const keyDrag = "ii_invite_hint_drag_done";
    const keyTap  = "ii_invite_hint_tap_done";

    let state = "front";
    let countdownTimer = null;
    let countdownLeft = 0;
    const openTimers = [];

    function clearOpenTimers(){
      while(openTimers.length){
        clearTimeout(openTimers.pop());
      }
    }

    function setState(next){
      state = next;
      root.setAttribute("data-state", next);
      if(next === "ready") applyHintVisibility();
    }

    function clearCountdown(){
      if(countdownTimer){
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }

    function setButton(label, disabled){
      if(openLabel) openLabel.textContent = label;
      if(!openBtn) return;

      if(disabled){
        openBtn.classList.add("is-disabled");
        openBtn.setAttribute("disabled", "disabled");
      }else{
        openBtn.classList.remove("is-disabled");
        openBtn.removeAttribute("disabled");
      }
    }

    function startCountdown(seconds){
      clearCountdown();
      countdownLeft = seconds;
      setButton(`Details (${countdownLeft})`, true);

      countdownTimer = setInterval(() => {
        countdownLeft -= 1;
        if(countdownLeft <= 0){
          clearCountdown();
          setButton("Details", false);
          return;
        }
        setButton(`Details (${countdownLeft})`, true);
      }, 1000);
    }

    function resetTransforms(){
      [outerLayer, innerLayer].forEach((el) => {
        if(!el) return;
        el.style.transform = "";
        el.dataset.tx = "0";
        el.dataset.ty = "0";
      });
      if(innerLayer) innerLayer.classList.remove("is-flipped");
    }

    function applyHintVisibility(forceShow){
      if(!hintDrag || !hintTap) return;

      if(forceShow){
        hintDrag.classList.remove("is-hidden");
        hintTap.classList.remove("is-hidden");
        return;
      }

      const dragDone = safeLocalStorageGet(keyDrag) === "1";
      const tapDone  = safeLocalStorageGet(keyTap) === "1";

      hintDrag.classList.toggle("is-hidden", dragDone);
      hintTap.classList.toggle("is-hidden", tapDone);
    }

    function markDragDone(){
      if(!hintDrag) return;
      hintDrag.classList.add("is-hidden");
      safeLocalStorageSet(keyDrag, "1");
    }

    function markTapDone(){
      if(!hintTap) return;
      hintTap.classList.add("is-hidden");
      safeLocalStorageSet(keyTap, "1");
    }

    function resetHintsOnRestart(){
      safeLocalStorageRemove(keyDrag);
      safeLocalStorageRemove(keyTap);
      applyHintVisibility(true);
    }

    function ensureEnvelopePiece(){
      if(!envelopePiece) return;
      const pieceUrl = envelopePiece.getAttribute("src") || "";
      if(!pieceUrl){
        envelopePiece.classList.add("ii__debug-hide");
        return;
      }
      const img = new Image();
      img.onerror = () => { envelopePiece.classList.add("ii__debug-hide"); };
      img.src = absUrl(pieceUrl);
    }

    function showOpenButton(show){
      if(!openBtn) return;
      openBtn.hidden = !show;
    }

    function setEnvelopeFlipped(flipped){
      if(!envelopeWrap) return;
      envelopeWrap.classList.toggle("is-flipped", !!flipped);
    }

    function goFront(){
      clearOpenTimers();
      clearCountdown();

      setState("front");
      setEnvelopeFlipped(false);
      showOpenButton(false);

      if(envelopeWrap){
        envelopeWrap.classList.remove("ii__debug-hide", "ii__envelope--behind");
        envelopeWrap.style.animation = "none";
        void envelopeWrap.offsetHeight;
        envelopeWrap.style.animation = "";
      }

      resetTransforms();
      resetHintsOnRestart();

      setButton("Open", false);
      if(restartBtn) restartBtn.hidden = true;
    }

    function goBack(){
      setState("back");
      setEnvelopeFlipped(true);
      setButton("Open", false);
      showOpenButton(true);
      if(restartBtn) restartBtn.hidden = true;
    }

    function openEnvelope(){
      clearOpenTimers();

      setState("opening");
      showOpenButton(true);
      setButton("Details (10)", true);

      if(restartBtn) restartBtn.hidden = false;

      startCountdown(10);

      if(envelopeWrap){
        envelopeWrap.classList.remove("ii__debug-hide", "ii__envelope--behind");
        envelopeWrap.style.animation = "none";
        void envelopeWrap.offsetHeight;
        envelopeWrap.style.animation = "";

        openTimers.push(setTimeout(() => {
          envelopeWrap.classList.add("ii__envelope--behind");
        }, 560));

        openTimers.push(setTimeout(() => {
          setState("revealed");
        }, 720));

        openTimers.push(setTimeout(() => {
          envelopeWrap.classList.add("ii__debug-hide");
          envelopeWrap.classList.remove("ii__envelope--behind");
          setState("ready");
          showOpenButton(true);
          setButton("Details", false);
        }, 1500));
      }else{
        setState("ready");
        showOpenButton(true);
        setButton("Details", false);
      }
    }

    function goDetails(){
      if(!detailsUrl) return;
      window.location.href = detailsUrl;
    }

    const DRAG_THRESHOLD = 5;

    function makeDraggable(el, opts){
      if(!el) return;

      const allowTapFlip = !!(opts && opts.allowTapFlip);
      const onTapFlip = (opts && opts.onTapFlip) ? opts.onTapFlip : () => {};
      const onFirstDrag = (opts && opts.onFirstDrag) ? opts.onFirstDrag : () => {};
      const onFirstTap = (opts && opts.onFirstTap) ? opts.onFirstTap : () => {};

      el.dataset.tx = el.dataset.tx || "0";
      el.dataset.ty = el.dataset.ty || "0";

      let pointerId = null;
      let startX = 0, startY = 0;
      let baseX = 0, baseY = 0;
      let isDown = false;
      let isDragging = false;
      let dragNotified = false;

      function applyTransform(x, y){
        el.style.transform = `translate(${x}px, ${y}px)`;
        el.dataset.tx = String(x);
        el.dataset.ty = String(y);
      }

      el.addEventListener("pointerdown", (e) => {
        if(state !== "ready" && state !== "revealed") return;

        pointerId = e.pointerId;
        isDown = true;
        isDragging = false;

        startX = e.clientX;
        startY = e.clientY;

        baseX = parseFloat(el.dataset.tx || "0") || 0;
        baseY = parseFloat(el.dataset.ty || "0") || 0;

        try{ el.setPointerCapture(pointerId); }catch(err){}
      });

      el.addEventListener("pointermove", (e) => {
        if(!isDown) return;
        if(e.pointerId !== pointerId) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if(!isDragging){
          if(Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD){
            isDragging = true;
          }
        }

        if(isDragging){
          e.preventDefault();
          applyTransform(baseX + dx, baseY + dy);

          if(!dragNotified){
            dragNotified = true;
            onFirstDrag();
          }
        }
      }, { passive: false });

      el.addEventListener("pointerup", (e) => {
        if(!isDown) return;
        if(e.pointerId !== pointerId) return;

        isDown = false;

        if(!isDragging && allowTapFlip){
          onFirstTap();
          onTapFlip();
        }
      });

      el.addEventListener("pointercancel", (e) => {
        if(e.pointerId !== pointerId) return;
        isDown = false;
        isDragging = false;
      });
    }

    function wireEnvelopeToggle(){
      if(!envelopeBtn) return;

      envelopeBtn.addEventListener("click", () => {
        if(state === "opening" || state === "revealed" || state === "ready") return;
        if(state === "front"){ goBack(); return; }
        if(state === "back"){ goFront(); return; }
      });

      envelopeBtn.addEventListener("keydown", (e) => {
        if(e.key === "Enter" || e.key === " "){
          e.preventDefault();
          envelopeBtn.click();
        }
      });
    }

    function wireOpenButton(){
      if(!openBtn) return;

      openBtn.addEventListener("click", () => {
        if(openBtn.hasAttribute("disabled")) return;

        if(state === "back"){
          openEnvelope();
          return;
        }

        if(state === "ready"){
          goDetails();
          return;
        }
      });

      openBtn.addEventListener("keydown", (e) => {
        if(e.key === "Enter" || e.key === " "){
          e.preventDefault();
          openBtn.click();
        }
      });
    }

    function wireRestart(){
      if(!restartBtn) return;
      restartBtn.addEventListener("click", () => goFront());
    }

    makeDraggable(outerLayer, {
      allowTapFlip: false,
      onFirstDrag: () => markDragDone()
    });

    makeDraggable(innerLayer, {
      allowTapFlip: true,
      onFirstDrag: () => markDragDone(),
      onFirstTap: () => markTapDone(),
      onTapFlip: () => {
        if(!innerLayer) return;
        innerLayer.classList.toggle("is-flipped");
      }
    });

    ensureEnvelopePiece();

    preload([
      CONFIG.assets.envelopeFront,
      CONFIG.assets.envelopeBack,
      CONFIG.assets.envelopePiece,
      CONFIG.assets.inviteOuter,
      CONFIG.assets.innerFront,
      CONFIG.assets.innerBack,
      CONFIG.assets.restartIcon,
      CONFIG.assets.hintArrow
    ]);

    wireEnvelopeToggle();
    wireOpenButton();
    wireRestart();

    goFront();
  }

  initDaisies();
  initInvite();
})();
