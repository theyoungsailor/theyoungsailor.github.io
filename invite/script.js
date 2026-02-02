(function(){
  "use strict";

  function absUrl(rel){
    return new URL(rel, document.baseURI).href;
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

  function safeGet(key){
    try{ return localStorage.getItem(key); }catch(e){ return null; }
  }
  function safeSet(key, val){
    try{ localStorage.setItem(key, val); }catch(e){}
  }
  function safeRemove(key){
    try{ localStorage.removeItem(key); }catch(e){}
  }

  function initDaisies(){
    var layer = document.getElementById("daisy-layer");
    if(!layer) return;

    var reduced = prefersReducedMotion();
    var spawnEvery = reduced ? 1200 : 420;
    var maxOnScreen = reduced ? 8 : 18;

    var sources = [
      "../imagens/daisy.png",
      "../imagens/daisy1.png",
      "../imagens/daisy2.png"
    ].map(absUrl);

    var active = [];
    var positions = [];

    function farEnough(x, y, dist){
      for(var i = 0; i < positions.length; i++){
        var p = positions[i];
        var dx = p.x - x;
        var dy = p.y - y;
        if(Math.sqrt(dx*dx + dy*dy) < dist) return false;
      }
      return true;
    }

    function cleanup(){
      var now = performance.now();
      for(var i = active.length - 1; i >= 0; i--){
        if(now >= active[i].deadAt){
          var el = active[i].el;
          if(el && el.parentNode) el.parentNode.removeChild(el);
          active.splice(i, 1);
          positions.splice(i, 1);
        }
      }
    }

    function spawn(){
      cleanup();
      if(active.length >= maxOnScreen) return;

      var w = window.innerWidth || 1024;
      var h = window.innerHeight || 768;

      var size = rand(22, 64);
      var pad = clamp(size * 0.6, 16, 42);

      var tries = 0;
      var x = 0;
      var y = 0;

      while(tries < 14){
        x = rand(pad, w - pad);
        y = rand(pad, h - pad);
        if(farEnough(x, y, 54)) break;
        tries += 1;
      }

      var el = document.createElement("img");
      el.className = "daisy";
      el.alt = "";
      el.setAttribute("aria-hidden","true");
      el.decoding = "async";
      el.loading = "lazy";
      el.draggable = false;
      el.src = pick(sources);

      el.style.width = Math.round(size) + "px";
      el.style.height = Math.round(size) + "px";
      el.style.left = x + "px";
      el.style.top = y + "px";

      layer.appendChild(el);

      var driftX = rand(-26, 26);
      var driftY = rand(-26, 26);
      var rotDir = Math.random() < 0.5 ? -1 : 1;
      var rot = rotDir * rand(12, 28);

      var fadeIn = reduced ? 1 : 700;
      var hold = reduced ? 1 : 2600;
      var fadeOut = reduced ? 1 : 900;
      var total = fadeIn + hold + fadeOut;

      var startAt = performance.now();
      var deadAt = startAt + total + 120;

      positions.push({ x: x, y: y });

      function tick(now){
        var t = now - startAt;

        var opacity = 1;
        if(t <= fadeIn){
          opacity = fadeIn <= 1 ? 1 : (t / fadeIn);
        }else if(t <= fadeIn + hold){
          opacity = 1;
        }else{
          var u = (t - fadeIn - hold) / fadeOut;
          u = clamp(u, 0, 1);
          opacity = 1 - u;
        }

        var p = clamp(t / total, 0, 1);
        var tx = driftX * p;
        var ty = driftY * p;
        var r = rot * p;

        el.style.opacity = String(opacity);
        el.style.transform = "translate3d(" + tx + "px," + ty + "px,0) rotate(" + r + "deg)";

        if(now < deadAt) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
      active.push({ el: el, deadAt: deadAt });
    }

    setInterval(spawn, spawnEvery);

    for(var i = 0; i < Math.min(6, maxOnScreen); i++){
      setTimeout(spawn, i * 90);
    }
  }

  function initInvite(){
    var root = document.getElementById("interactive-invite");
    if(!root) return;

    var detailsUrl = root.getAttribute("data-details-url") || "";
    var mainBtn = root.querySelector("[data-main-btn]");
    var mainLabel = root.querySelector(".ii__btn-label");
    var restartBtn = root.querySelector("[data-restart-btn]");

    var envelopeWrap = root.querySelector(".ii__envelope");
    var outerLayer = root.querySelector('[data-draggable="outer"]');
    var innerLayer = root.querySelector('[data-draggable="inner"]');

    var hintDrag = root.querySelector("[data-hint-drag]");
    var hintTap = root.querySelector("[data-hint-tap]");

    var state = "front";
    var countdownTimer = null;
    var countdownLeft = 0;

    var keyDrag = "ii_invite_hint_drag_done";
    var keyTap  = "ii_invite_hint_tap_done";

    var openTimers = [];

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

      var dragDone = safeGet(keyDrag) === "1";
      var tapDone = safeGet(keyTap) === "1";
      hintDrag.classList.toggle("is-hidden", dragDone);
      hintTap.classList.toggle("is-hidden", tapDone);
    }

    function markDragDone(){
      if(!hintDrag) return;
      hintDrag.classList.add("is-hidden");
      safeSet(keyDrag, "1");
    }

    function markTapDone(){
      if(!hintTap) return;
      hintTap.classList.add("is-hidden");
      safeSet(keyTap, "1");
    }

    function resetHintsOnRestart(){
      safeRemove(keyDrag);
      safeRemove(keyTap);
      applyHintVisibility(true);
    }

    function preload(urls){
      urls.forEach(function(u){
        if(!u) return;
        var img = new Image();
        img.src = u;
      });
    }

    preload([
      absUrl("../imagens/envelope-front1.png"),
      absUrl("../imagens/envelope-back-filled1.png"),
      absUrl("../imagens/envelope-piece.png"),
      absUrl("../imagens/outer-front.png"),
      absUrl("../imagens/inner-front.png"),
      absUrl("../imagens/inner-back.png"),
      absUrl("../imagens/restart.png"),
      absUrl("../imagens/arrow.png")
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
      restartBtn.addEventListener("click", function(){
        goFront();
      });
    }

    var DRAG_THRESHOLD = 5;

    function makeDraggable(el, opts){
      if(!el) return;
      var allowTapFlip = !!(opts && opts.allowTapFlip);
      var onTapFlip = (opts && opts.onTapFlip) ? opts.onTapFlip : function(){};
      var onFirstDrag = (opts && opts.onFirstDrag) ? opts.onFirstDrag : function(){};
      var onFirstTap = (opts && opts.onFirstTap) ? opts.onFirstTap : function(){};

      el.dataset.tx = el.dataset.tx || "0";
      el.dataset.ty = el.dataset.ty || "0";

      var pointerId = null;
      var startX = 0, startY = 0;
      var baseX = 0, baseY = 0;
      var isDown = false;
      var isDragging = false;
      var dragNotified = false;

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

        var dx = e.clientX - startX;
        var dy = e.clientY - startY;

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
  }

  initDaisies();
  initInvite();
})();
