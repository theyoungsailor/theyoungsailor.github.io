diff --git a/script.js b/script.js
index 88685f95fd53f22227efdc9e3ef27426b4f4fba2..2f0549cb3f5e4e85830650ca6600843fdfa02869 100644
--- a/script.js
+++ b/script.js
@@ -962,25 +962,382 @@ function initDaisyBackground(){
         if(idx >= 0) alive.splice(idx, 1);
       }
     }, removeAfter);
   }
 
   (async ()=>{
     resolvedSrc = await resolveDaisySrc();
     start();
   })();
 
   document.addEventListener("visibilitychange", ()=>{
     if(document.hidden){
       stopAndClear();
     }else{
       if(!resolvedSrc){
         (async ()=>{
           resolvedSrc = await resolveDaisySrc();
           start();
         })();
       }else{
         start();
       }
     }
   });
 }
+
+(() => {
+  const root = document.getElementById("interactive-invite");
+  if (!root) return;
+
+  const detailsUrl = root.getAttribute("data-details-url") || "";
+  const mainBtn = root.querySelector("[data-main-btn]");
+  const mainLabel = root.querySelector(".ii__btn-label");
+  const restartBtn = root.querySelector("[data-restart-btn]");
+
+  const envelopeWrap = root.querySelector(".ii__envelope");
+  const outerLayer = root.querySelector('[data-draggable="outer"]');
+  const innerLayer = root.querySelector('[data-draggable="inner"]');
+
+  const hintDrag = root.querySelector("[data-hint-drag]");
+  const hintTap = root.querySelector("[data-hint-tap]");
+
+  let state = "front";
+  let countdownTimer = null;
+  let countdownLeft = 0;
+
+  const keyDrag = "ii_interactive_invite_hint_drag_done";
+  const keyTap = "ii_interactive_invite_hint_tap_done";
+
+  const openTimers = [];
+
+  const clearOpenTimers = () => {
+    while (openTimers.length) {
+      clearTimeout(openTimers.pop());
+    }
+  };
+
+  const setState = (next) => {
+    state = next;
+    root.setAttribute("data-state", next);
+    if (next === "ready") applyHintVisibility();
+  };
+
+  const setButton = (label, disabled) => {
+    if (mainLabel) mainLabel.textContent = label;
+    if (disabled) {
+      mainBtn.classList.add("is-disabled");
+      mainBtn.setAttribute("disabled", "disabled");
+    } else {
+      mainBtn.classList.remove("is-disabled");
+      mainBtn.removeAttribute("disabled");
+    }
+  };
+
+  const clearCountdown = () => {
+    if (countdownTimer) {
+      clearInterval(countdownTimer);
+      countdownTimer = null;
+    }
+  };
+
+  const startCountdown = (seconds) => {
+    clearCountdown();
+    countdownLeft = seconds;
+    setButton(`Detalhes (${countdownLeft})`, true);
+
+    countdownTimer = setInterval(() => {
+      countdownLeft -= 1;
+      if (countdownLeft <= 0) {
+        clearCountdown();
+        setButton("Detalhes", false);
+        return;
+      }
+      setButton(`Detalhes (${countdownLeft})`, true);
+    }, 1000);
+  };
+
+  const resetTransforms = () => {
+    [outerLayer, innerLayer].forEach((el) => {
+      if (!el) return;
+      el.style.transform = "";
+      el.dataset.tx = "0";
+      el.dataset.ty = "0";
+    });
+    if (innerLayer) innerLayer.classList.remove("is-flipped");
+  };
+
+  const applyHintVisibility = (forceShow) => {
+    if (!hintDrag || !hintTap) return;
+
+    if (forceShow) {
+      hintDrag.classList.remove("is-hidden");
+      hintTap.classList.remove("is-hidden");
+      return;
+    }
+
+    let dragDone = false;
+    let tapDone = false;
+    try {
+      dragDone = localStorage.getItem(keyDrag) === "1";
+      tapDone = localStorage.getItem(keyTap) === "1";
+    } catch (error) {
+      dragDone = false;
+      tapDone = false;
+    }
+    hintDrag.classList.toggle("is-hidden", dragDone);
+    hintTap.classList.toggle("is-hidden", tapDone);
+  };
+
+  const markDragDone = () => {
+    if (!hintDrag) return;
+    hintDrag.classList.add("is-hidden");
+    try {
+      localStorage.setItem(keyDrag, "1");
+    } catch (error) {
+      // no-op
+    }
+  };
+
+  const markTapDone = () => {
+    if (!hintTap) return;
+    hintTap.classList.add("is-hidden");
+    try {
+      localStorage.setItem(keyTap, "1");
+    } catch (error) {
+      // no-op
+    }
+  };
+
+  const resetHintsOnRestart = () => {
+    try {
+      localStorage.removeItem(keyDrag);
+      localStorage.removeItem(keyTap);
+    } catch (error) {
+      // no-op
+    }
+    applyHintVisibility(true);
+  };
+
+  const preload = (urls) => {
+    urls.forEach((url) => {
+      if (!url) return;
+      const img = new Image();
+      img.src = url;
+    });
+  };
+
+  preload([
+    "/images/envelope-front1.png",
+    "/images/envelope-back-filled1.png",
+    "/images/outer-front.png",
+    "/images/inner-fron1.png",
+    "/images/inner-back1.png",
+    "/images/restart.png",
+    "/images/arrow.png"
+  ]);
+
+  const goFront = () => {
+    clearOpenTimers();
+    clearCountdown();
+
+    setState("front");
+
+    envelopeWrap.classList.remove("is-flipped");
+    envelopeWrap.classList.remove("ii__debug-hide");
+    envelopeWrap.classList.remove("ii__envelope--behind");
+
+    envelopeWrap.style.animation = "none";
+    envelopeWrap.offsetHeight;
+    envelopeWrap.style.animation = "";
+
+    resetTransforms();
+    resetHintsOnRestart();
+
+    setButton("Virar", false);
+    if (restartBtn) restartBtn.hidden = true;
+  };
+
+  const goBack = () => {
+    setState("back");
+    envelopeWrap.classList.add("is-flipped");
+    setButton("Abrir", false);
+    if (restartBtn) restartBtn.hidden = true;
+  };
+
+  const openEnvelope = () => {
+    clearOpenTimers();
+    setState("opening");
+    if (restartBtn) restartBtn.hidden = false;
+
+    startCountdown(10);
+
+    envelopeWrap.classList.remove("ii__debug-hide");
+    envelopeWrap.classList.remove("ii__envelope--behind");
+
+    envelopeWrap.style.animation = "none";
+    envelopeWrap.offsetHeight;
+    envelopeWrap.style.animation = "";
+
+    openTimers.push(
+      setTimeout(() => {
+        envelopeWrap.classList.add("ii__envelope--behind");
+      }, 560)
+    );
+
+    openTimers.push(
+      setTimeout(() => {
+        setState("revealed");
+      }, 720)
+    );
+
+    openTimers.push(
+      setTimeout(() => {
+        envelopeWrap.classList.add("ii__debug-hide");
+        envelopeWrap.classList.remove("ii__envelope--behind");
+        setState("ready");
+      }, 1500)
+    );
+  };
+
+  const goDetails = () => {
+    if (!detailsUrl) return;
+    window.location.href = detailsUrl;
+  };
+
+  if (mainBtn) {
+    mainBtn.addEventListener("click", () => {
+      if (mainBtn.hasAttribute("disabled")) return;
+
+      if (state === "front") {
+        goBack();
+        return;
+      }
+      if (state === "back") {
+        openEnvelope();
+        return;
+      }
+      if (state === "ready") {
+        goDetails();
+      }
+    });
+  }
+
+  if (restartBtn) {
+    restartBtn.addEventListener("click", () => {
+      goFront();
+    });
+  }
+
+  const DRAG_THRESHOLD = 5;
+
+  const makeDraggable = (el, opts) => {
+    if (!el) return;
+    const allowTapFlip = Boolean(opts && opts.allowTapFlip);
+    const onTapFlip = opts && opts.onTapFlip ? opts.onTapFlip : () => {};
+    const onFirstDrag = opts && opts.onFirstDrag ? opts.onFirstDrag : () => {};
+    const onFirstTap = opts && opts.onFirstTap ? opts.onFirstTap : () => {};
+
+    el.dataset.tx = el.dataset.tx || "0";
+    el.dataset.ty = el.dataset.ty || "0";
+
+    let pointerId = null;
+    let startX = 0;
+    let startY = 0;
+    let baseX = 0;
+    let baseY = 0;
+    let isDown = false;
+    let isDragging = false;
+    let dragNotified = false;
+
+    const applyTransform = (x, y) => {
+      el.style.transform = `translate(${x}px,${y}px)`;
+      el.dataset.tx = String(x);
+      el.dataset.ty = String(y);
+    };
+
+    el.addEventListener("pointerdown", (event) => {
+      if (state !== "ready" && state !== "revealed") return;
+
+      pointerId = event.pointerId;
+      isDown = true;
+      isDragging = false;
+
+      startX = event.clientX;
+      startY = event.clientY;
+
+      baseX = parseFloat(el.dataset.tx || "0") || 0;
+      baseY = parseFloat(el.dataset.ty || "0") || 0;
+
+      el.setPointerCapture(pointerId);
+    });
+
+    el.addEventListener(
+      "pointermove",
+      (event) => {
+        if (!isDown) return;
+        if (event.pointerId !== pointerId) return;
+
+        const dx = event.clientX - startX;
+        const dy = event.clientY - startY;
+
+        if (!isDragging) {
+          if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
+            isDragging = true;
+          }
+        }
+
+        if (isDragging) {
+          event.preventDefault();
+          applyTransform(baseX + dx, baseY + dy);
+
+          if (!dragNotified) {
+            dragNotified = true;
+            onFirstDrag();
+          }
+        }
+      },
+      { passive: false }
+    );
+
+    el.addEventListener("pointerup", (event) => {
+      if (!isDown) return;
+      if (event.pointerId !== pointerId) return;
+
+      isDown = false;
+
+      if (!isDragging && allowTapFlip) {
+        onFirstTap();
+        onTapFlip();
+      }
+    });
+
+    el.addEventListener("pointercancel", (event) => {
+      if (event.pointerId !== pointerId) return;
+      isDown = false;
+      isDragging = false;
+    });
+  };
+
+  makeDraggable(outerLayer, {
+    allowTapFlip: false,
+    onFirstDrag: () => {
+      markDragDone();
+    }
+  });
+
+  makeDraggable(innerLayer, {
+    allowTapFlip: true,
+    onFirstDrag: () => {
+      markDragDone();
+    },
+    onFirstTap: () => {
+      markTapDone();
+    },
+    onTapFlip: () => {
+      if (!innerLayer) return;
+      innerLayer.classList.toggle("is-flipped");
+    }
+  });
+
+  goFront();
+})();

