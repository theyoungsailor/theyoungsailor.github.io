(function(){
  const root = document.getElementById("interactive-invite");
  if(!root) return;

  const detailsUrl = root.getAttribute("data-details-url") || "";
  const mainBtn = root.querySelector("[data-main-btn]");
  const mainLabel = root.querySelector(".ii__btn-label");
  const restartBtn = root.querySelector("[data-restart-btn]");

  const envelopeWrap = root.querySelector(".ii__envelope");
  const outerLayer = root.querySelector('[data-draggable="outer"]');
  const innerLayer = root.querySelector('[data-draggable="inner"]');

  const hintDrag = root.querySelector("[data-hint-drag]");
  const hintTap = root.querySelector("[data-hint-tap]");

  let state = "front";
  let countdownTimer = null;
  let countdownLeft = 0;

  const keyDrag = "ii_invite_hint_drag_done";
  const keyTap  = "ii_invite_hint_tap_done";

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

  function setButton(label, disabled){
    mainLabel.textContent = label;
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
    setButton("Detalhes (" + countdownLeft + ")", true);

    countdownTimer = setInterval(function(){
      countdownLeft -= 1;
      if(countdownLeft <= 0){
        clearCountdown();
        setButton("Detalhes", false);
        return;
      }
      setButton("Detalhes (" + countdownLeft + ")", true);
    }, 1000);
  }

  function resetTransforms(){
    [outerLayer, innerLayer].forEach(function(el){
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

    let dragDone = false;
    let tapDone = false;
    try{
      dragDone = localStorage.getItem(keyDrag) === "1";
      tapDone  = localStorage.getItem(keyTap) === "1";
    }catch(e){}

    hintDrag.classList.toggle("is-hidden", dragDone);
    hintTap.classList.toggle("is-hidden", tapDone);
  }

  function markDragDone(){
    if(!hintDrag) return;
    hintDrag.classList.add("is-hidden");
    try{ localStorage.setItem(keyDrag, "1"); }catch(e){}
  }

  function markTapDone(){
    if(!hintTap) return;
    hintTap.classList.add("is-hidden");
    try{ localStorage.setItem(keyTap, "1"); }catch(e){}
  }

  function resetHintsOnRestart(){
    try{
      localStorage.removeItem(keyDrag);
      localStorage.removeItem(keyTap);
    }catch(e){}
    applyHintVisibility(true);
  }

  function preload(urls){
    urls.forEach(function(u){
      if(!u) return;
      const img = new Image();
      img.src = u;
    });
  }

  preload([
    "https://cdn.shopify.com/s/files/1/0818/0554/1723/files/envelope-front1.png?v=1769340601",
    "https://cdn.shopify.com/s/files/1/0818/0554/1723/files/envelope-back-filled1.png?v=1769267591",
    "https://cdn.shopify.com/s/files/1/0818/0554/1723/files/outer-front.png?v=1769338027",
    "https://cdn.shopify.com/s/files/1/0818/0554/1723/files/inner-fron1.png?v=1769267589",
    "https://cdn.shopify.com/s/files/1/0818/0554/1723/files/inner-back1.png?v=1769267590",
    "https://cdn.shopify.com/s/files/1/0818/0554/1723/files/restart.png?v=1769338353",
    "https://cdn.shopify.com/s/files/1/0818/0554/1723/files/arrow.png?v=1769340866"
  ]);

  function goFront(){
    clearOpenTimers();
    clearCountdown();

    setState("front");

    envelopeWrap.classList.remove("is-flipped");
    envelopeWrap.classList.remove("ii__debug-hide");
    envelopeWrap.classList.remove("ii__envelope--behind");

    envelopeWrap.style.animation = "none";
    envelopeWrap.offsetHeight;
    envelopeWrap.style.animation = "";

    resetTransforms();
    resetHintsOnRestart();

    setButton("Virar", false);
    if(restartBtn) restartBtn.hidden = true;
  }

  function goBack(){
    setState("back");
    envelopeWrap.classList.add("is-flipped");
    setButton("Abrir", false);
    if(restartBtn) restartBtn.hidden = true;
  }

  function openEnvelope(){
    clearOpenTimers();
    setState("opening");
    if(restartBtn) restartBtn.hidden = false;

    startCountdown(10);

    envelopeWrap.classList.remove("ii__debug-hide");
    envelopeWrap.classList.remove("ii__envelope--behind");

    envelopeWrap.style.animation = "none";
    envelopeWrap.offsetHeight;
    envelopeWrap.style.animation = "";

    openTimers.push(setTimeout(function(){
      envelopeWrap.classList.add("ii__envelope--behind");
    }, 560));

    openTimers.push(setTimeout(function(){
      setState("revealed");
    }, 720));

    openTimers.push(setTimeout(function(){
      envelopeWrap.classList.add("ii__debug-hide");
      envelopeWrap.classList.remove("ii__envelope--behind");
      setState("ready");
    }, 1500));
  }

  function goDetails(){
    if(!detailsUrl) return;
    window.location.href = detailsUrl;
  }

  mainBtn.addEventListener("click", function(){
    if(mainBtn.hasAttribute("disabled")) return;

    if(state === "front"){ goBack(); return; }
    if(state === "back"){ openEnvelope(); return; }
    if(state === "ready"){ goDetails(); return; }
  });

  if(restartBtn){
    restartBtn.addEventListener("click", function(){
      goFront();
    });
  }

  const DRAG_THRESHOLD = 5;

  function makeDraggable(el, opts){
    if(!el) return;

    const allowTapFlip = !!(opts && opts.allowTapFlip);
    const onTapFlip = (opts && opts.onTapFlip) ? opts.onTapFlip : function(){};
    const onFirstDrag = (opts && opts.onFirstDrag) ? opts.onFirstDrag : function(){};
    const onFirstTap = (opts && opts.onFirstTap) ? opts.onFirstTap : function(){};

    el.dataset.tx = el.dataset.tx || "0";
    el.dataset.ty = el.dataset.ty || "0";

    let pointerId = null;
    let startX = 0, startY = 0;
    let baseX = 0, baseY = 0;
    let isDown = false;
    let isDragging = false;
    let dragNotified = false;

    function applyTransform(x, y){
      el.style.transform = "translate(" + x + "px," + y + "px)";
      el.dataset.tx = String(x);
      el.dataset.ty = String(y);
    }

    el.addEventListener("pointerdown", function(e){
      if(state !== "ready" && state !== "revealed") return;

      pointerId = e.pointerId;
      isDown = true;
      isDragging = false;

      startX = e.clientX;
      startY = e.clientY;

      baseX = parseFloat(el.dataset.tx || "0") || 0;
      baseY = parseFloat(el.dataset.ty || "0") || 0;

      el.setPointerCapture(pointerId);
    });

    el.addEventListener("pointermove", function(e){
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

    el.addEventListener("pointerup", function(e){
      if(!isDown) return;
      if(e.pointerId !== pointerId) return;

      isDown = false;

      if(!isDragging && allowTapFlip){
        onFirstTap();
        onTapFlip();
      }
    });

    el.addEventListener("pointercancel", function(e){
      if(e.pointerId !== pointerId) return;
      isDown = false;
      isDragging = false;
    });
  }

  makeDraggable(outerLayer, {
    allowTapFlip: false,
    onFirstDrag: function(){ markDragDone(); }
  });

  makeDraggable(innerLayer, {
    allowTapFlip: true,
    onFirstDrag: function(){ markDragDone(); },
    onFirstTap: function(){ markTapDone(); },
    onTapFlip: function(){
      if(!innerLayer) return;
      innerLayer.classList.toggle("is-flipped");
    }
  });

  goFront();
})();
