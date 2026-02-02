(function(){
  "use strict";

  const ASSETS = {
    envelopeFront: "../imagens/envelope-front1.png",
    envelopeBack: "../imagens/envelope-back-filled1.png",
    envelopePiece: "../imagens/envelope-piece.png",
    innerFront: "../imagens/inner-front1.png",
    innerBack: "../imagens/inner-back1.png",
    outerFront: "../imagens/invite-composite.png"
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

  function safeGet(key){
    try{ return localStorage.getItem(key); }catch(e){ return null; }
  }

  function safeSet(key, val){
    try{ localStorage.setItem(key, val); }catch(e){}
  }

  function safeRemove(key){
    try{ localStorage.removeItem(key); }catch(e){}
  }

  const DRAG_THRESHOLD = 5;

  function makeDraggable(el, getState, onFirstDrag){
    if(!el) return;

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

    function applyTransform(x, y){
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.dataset.tx = String(x);
      el.dataset.ty = String(y);
    }

    el.addEventListener("pointerdown", (e) => {
      const state = getState();
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
          if(onFirstDrag) onFirstDrag();
        }
      }
    }, { passive: false });

    el.addEventListener("pointerup", (e) => {
      if(!isDown) return;
      if(e.pointerId !== pointerId) return;
      isDown = false;
    });

    el.addEventListener("pointercancel", (e) => {
      if(e.pointerId !== pointerId) return;
      isDown = false;
      isDragging = false;
    });
  }

  function init(){
    const root = document.getElementById("interactive-invite");
    if(!root) return;

    const detailsUrl = root.getAttribute("data-details-url") || "http://ocasamento.website/";
    const mainBtn = root.querySelector("[data-main-btn]");
    const mainLabel = root.querySelector(".ii__btn-label");

    const envelopeWrap = root.querySelector(".ii__envelope");
    const envelopeFlip = root.querySelector("[data-envelope-flip]");

    const outerLayer = root.querySelector('[data-draggable="outer"]');
    const innerLayer = root.querySelector('[data-draggable="inner"]');

    const cardFlip = root.querySelector("[data-card-flip]");

    const restartBtn = root.querySelector("[data-restart-btn]");

    let state = "front";
    let countdownTimer = null;
    let countdownLeft = 0;

    const keyDrag = "ii_invite_drag_done";

    function setState(next){
      state = next;
      root.setAttribute("data-state", next);
    }

    function setButton(label, disabled){
      if(mainLabel) mainLabel.textContent = label;

      if(!mainBtn) return;
      if(disabled){
        mainBtn.classList.add("is-disabled");
        mainBtn.setAttribute("disabled","disabled");
      }else{
        mainBtn.classList.remove("is-disabled");
        mainBtn.removeAttribute("disabled");
      }
    }

    function clearCountdown(){
      if(countdownTimer){
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }

    function startCountdown(seconds){
      clearCountdown();
      countdownLeft = seconds;
      setButton(`Detalhes (${countdownLeft})`, true);

      countdownTimer = setInterval(() => {
        countdownLeft -= 1;
        if(countdownLeft <= 0){
          clearCountdown();
          setButton("Detalhes", false);
          return;
        }
        setButton(`Detalhes (${countdownLeft})`, true);
      }, 1000);
    }

    function resetTransforms(){
      [outerLayer, innerLayer].forEach((el) => {
        if(!el) return;
        el.style.transform = "";
        el.dataset.tx = "0";
        el.dataset.ty = "0";
      });
    }

    function goFront(){
      clearCountdown();
      setState("front");
      if(envelopeWrap) envelopeWrap.classList.remove("is-flipped", "ii__envelope--behind", "ii__debug-hide");
      if(envelopeWrap){
        envelopeWrap.style.animation = "none";
        void envelopeWrap.offsetHeight;
        envelopeWrap.style.animation = "";
      }
      if(innerLayer) innerLayer.classList.remove("is-flipped");
      if(cardFlip) cardFlip.style.transform = "";
      resetTransforms();
      setButton("Virar", false);
      if(restartBtn) restartBtn.hidden = true;
    }

    function goBack(){
      setState("back");
      if(envelopeWrap) envelopeWrap.classList.add("is-flipped");
      setButton("Abrir", false);
      if(restartBtn) restartBtn.hidden = true;
    }

    function openEnvelope(){
      setState("opening");
      if(restartBtn) restartBtn.hidden = false;

      startCountdown(10);

      if(envelopeWrap){
        envelopeWrap.classList.remove("ii__debug-hide");
        envelopeWrap.classList.remove("ii__envelope--behind");

        envelopeWrap.style.animation = "none";
        void envelopeWrap.offsetHeight;
        envelopeWrap.style.animation = "";
      }

      setTimeout(() => {
        if(envelopeWrap) envelopeWrap.classList.add("ii__envelope--behind");
      }, 560);

      setTimeout(() => {
        setState("revealed");
      }, 720);

      setTimeout(() => {
        if(envelopeWrap){
          envelopeWrap.classList.add("ii__debug-hide");
          envelopeWrap.classList.remove("ii__envelope--behind");
        }
        setState("ready");
      }, 1500);
    }

    function goDetails(){
      window.location.href = detailsUrl;
    }

    mainBtn.addEventListener("click", () => {
      if(mainBtn.hasAttribute("disabled")) return;

      if(state === "front"){
        goBack();
        return;
      }

      if(state === "back"){
        openEnvelope();
        return;
      }

      if(state === "ready"){
        goDetails();
        return;
      }
    });

    if(restartBtn){
      restartBtn.addEventListener("click", () => goFront());
    }

    function markDragDone(){
      safeSet(keyDrag, "1");
    }

    makeDraggable(outerLayer, () => state, () => markDragDone());
    makeDraggable(innerLayer, () => state, () => markDragDone());

    function enableInnerFlip(){
      if(!innerLayer) return;
      innerLayer.addEventListener("click", (e) => {
        if(state !== "ready" && state !== "revealed") return;
        if(innerLayer.classList.contains("is-flipped")){
          innerLayer.classList.remove("is-flipped");
        }else{
          innerLayer.classList.add("is-flipped");
        }
      });

      innerLayer.addEventListener("keydown", (e) => {
        if(e.key === "Enter" || e.key === " "){
          e.preventDefault();
          innerLayer.click();
        }
      });
    }

    enableInnerFlip();

    preload([
      ASSETS.envelopeFront,
      ASSETS.envelopeBack,
      ASSETS.envelopePiece,
      ASSETS.innerFront,
      ASSETS.innerBack,
      ASSETS.outerFront
    ]);

    goFront();
  }

  init();
})();
