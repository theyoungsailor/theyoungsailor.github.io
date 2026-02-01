/* script.js */

const SUPABASE_URL = "https://ofllnwwpyhhvyzuhwzzc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8iHaCkyT6RdrOF4Dcrf5VQ_ZLgr8zm6";
const SUPABASE_BUCKET = "wedding-uploads";
const SUPABASE_TABLE = "wedding_photos";

const WEDDING_DATE_ISO = "2026-07-18T15:30:00+01:00";
const MAX_FILE_MB = 10;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function pad2(n){ return String(n).padStart(2,"0"); }

function setStatus(msg, type){
  const el = $("#ugcStatus");
  if(!el) return;
  el.classList.remove("is-error","is-ok");
  if(type === "error") el.classList.add("is-error");
  if(type === "ok") el.classList.add("is-ok");
  el.textContent = msg || "";
}

function openModal(modal){
  if(!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden","false");
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}

function closeModal(modal){
  if(!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden","true");
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
}

function initReveal(){
  const sections = $all(".reveal-on");
  if(!sections.length) return;

  if(!("IntersectionObserver" in window)){
    sections.forEach(s => s.classList.add("is-visible"));
    return;
  }

  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add("is-visible");
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.18 });

  sections.forEach(s => obs.observe(s));
}

function initImgSwap(){
  const wrap = $("#swapWrap-2");
  if(!wrap) return;

  const toggle = ()=> wrap.classList.toggle("is-alt");
  wrap.addEventListener("click", toggle);
  wrap.addEventListener("keydown", (e)=>{
    if(e.key === "Enter" || e.key === " "){
      e.preventDefault();
      toggle();
    }
  });
}

function initCountdown(){
  const daysEl = $("#cd-days-2");
  const hoursEl = $("#cd-hours-2");
  const minsEl = $("#cd-mins-2");
  const secsEl = $("#cd-secs-2");
  if(!daysEl || !hoursEl || !minsEl || !secsEl) return;

  const target = new Date(WEDDING_DATE_ISO).getTime();

  function tick(){
    const now = Date.now();
    let diff = Math.max(0, target - now);

    const d = Math.floor(diff / (1000*60*60*24));
    diff -= d * (1000*60*60*24);
    const h = Math.floor(diff / (1000*60*60));
    diff -= h * (1000*60*60);
    const m = Math.floor(diff / (1000*60));
    diff -= m * (1000*60);
    const s = Math.floor(diff / 1000);

    daysEl.textContent = pad2(d);
    hoursEl.textContent = pad2(h);
    minsEl.textContent = pad2(m);
    secsEl.textContent = pad2(s);
  }

  tick();
  setInterval(tick, 1000);
}

function initQuintaModal(){
  const section = $("#quinta-falesia");
  const modal = $("#quintaModal");
  if(!section || !modal) return;

  const imgEl = $(".quinta-modal-img", modal);
  const closeBtn = $(".quinta-modal-close", modal);
  if(!imgEl || !closeBtn) return;

  const thumbs = $all(".quinta-grid-item img", section);

  function open(src, alt){
    imgEl.src = src;
    imgEl.alt = alt || "";
    openModal(modal);
  }

  function close(){
    closeModal(modal);
    imgEl.src = "";
    imgEl.alt = "";
  }

  thumbs.forEach(img=>{
    img.addEventListener("click", ()=>{
      open(img.currentSrc || img.src, img.alt);
    });
  });

  closeBtn.addEventListener("click", (e)=>{
    e.stopPropagation();
    close();
  });

  modal.addEventListener("click", ()=> close());
  const inner = $(".quinta-modal-inner", modal);
  if(inner) inner.addEventListener("click", (e)=> e.stopPropagation());

  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape" && modal.classList.contains("is-open")) close();
  });
}

function initAccommodationCarousel(){
  const root = $("#alojamento");
  if(!root) return;

  const track = $(".acco-track", root);
  const slides = $all(".acco-slide", root);
  const prev = $(".acco-prev", root);
  const next = $(".acco-next", root);

  if(!track || slides.length === 0 || !prev || !next) return;

  let index = 0;

  function update(){
    track.style.transform = `translateX(${index * -100}%)`;
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
  }

  prev.addEventListener("click", ()=>{
    index = Math.max(0, index - 1);
    update();
  });

  next.addEventListener("click", ()=>{
    index = Math.min(slides.length - 1, index + 1);
    update();
  });

  update();
}

async function supabaseFetch(path, { method = "GET", headers = {}, body = null } = {}){
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      ...headers
    },
    body
  });

  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const payload = isJson ? await res.json().catch(()=> ({})) : await res.text().catch(()=> "");

  if(!res.ok){
    let msg = "";
    if(typeof payload === "string") msg = payload;
    else msg = payload?.message || payload?.error || JSON.stringify(payload);
    throw new Error(msg || `Supabase error (${res.status})`);
  }

  return payload;
}

function safeFileName(name){
  return (name || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.\-_]/g, "")
    .replace(/\-+/g, "-")
    .slice(0, 140);
}

function getExt(file){
  const n = (file?.name || "").trim();
  const dot = n.lastIndexOf(".");
  if(dot === -1) return "";
  return n.slice(dot + 1).toLowerCase();
}

async function uploadFileToBucket(file){
  if(!file) throw new Error("Nenhum ficheiro selecionado.");

  const sizeMb = file.size / (1024 * 1024);
  if(sizeMb > MAX_FILE_MB) throw new Error(`Ficheiro demasiado grande. Máximo ${MAX_FILE_MB}MB.`);

  if(ACCEPTED_TYPES.length && file.type && !ACCEPTED_TYPES.includes(file.type)){
    throw new Error("Formato não suportado. Usa JPG, PNG, WEBP ou HEIC.");
  }

  const ext = getExt(file) || (file.type === "image/png" ? "png" : "jpg");
  const base = safeFileName(file.name.replace(/\.[^/.]+$/, ""));
  const path = `uploads/${Date.now()}-${base}.${ext}`;

  await supabaseFetch(`/storage/v1/object/${SUPABASE_BUCKET}/${encodeURIComponent(path)}`, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false"
    },
    body: file
  });

  return path;
}

function publicUrlFor(path){
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${path}`;
}

/* UPDATED: now stores public_url as well */
async function insertPhotoRow({ path, title, public_url }){
  const body = [{
    path,
    title: title || null,
    public_url: public_url || null
  }];

  const data = await supabaseFetch(`/rest/v1/${SUPABASE_TABLE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify(body)
  });

  return Array.isArray(data) ? data[0] : data;
}

async function fetchPhotos({ order = "latest" } = {}){
  const orderBy = order === "latest" ? "created_at.desc" : "created_at.asc";
  const data = await supabaseFetch(`/rest/v1/${SUPABASE_TABLE}?select=*&order=${encodeURIComponent(orderBy)}`, {
    method: "GET"
  });
  return Array.isArray(data) ? data : [];
}

function renderGallery(items){
  const grid = $("#ugcGrid");
  const count = $("#ugcCount");
  const tpl = $("#ugcCardTpl");
  if(!grid || !count) return;

  grid.innerHTML = "";
  count.textContent = String(items.length);

  items.forEach(item=>{
    const url = item.public_url || publicUrlFor(item.path);
    const title = item.title || "";

    let node;
    if(tpl && tpl.content){
      node = tpl.content.firstElementChild.cloneNode(true);
      const img = $(".ugc-card-img", node);
      const t = $(".ugc-card-title", node);
      const a = $(".ugc-card-link", node);

      if(img){
        img.src = url;
        img.alt = title || "Foto";
        img.loading = "lazy";
        img.decoding = "async";
      }
      if(t) t.textContent = title;
      if(a){
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
      }
    }else{
      node = document.createElement("a");
      node.href = url;
      node.target = "_blank";
      node.rel = "noopener";
      node.className = "ugc-card-link";
      const img = document.createElement("img");
      img.src = url;
      img.alt = title || "Foto";
      img.loading = "lazy";
      img.decoding = "async";
      node.appendChild(img);
    }

    grid.appendChild(node);
  });
}

function initUGC(){
  const openBtn = $("[data-open-upload]");
  const modal = $("#ugcModal");
  const closeBtn = $("[data-close-ugc]");
  const drop = $("#ugcDrop");
  const fileInput = $("#ugcFile");
  const orderSelect = $("#ugcOrder");
  const refreshBtn = $("#ugcRefresh");
  const clearBtn = $("#ugcClear");
  const saveBtn = $("#ugcSave");
  const titleInput = $("#ugcTitle");

  if(!modal || !fileInput) return;

  let selectedFiles = [];

  function syncSaveState(){
    if(saveBtn) saveBtn.disabled = selectedFiles.length === 0;
  }

  function open(){
    openModal(modal);
    setStatus("", "");
  }

  function close(){
    closeModal(modal);
    selectedFiles = [];
    if(fileInput) fileInput.value = "";
    if(titleInput) titleInput.value = "";
    syncSaveState();
  }

  openBtn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);

  modal.addEventListener("click", (e)=>{
    if(e.target === modal) close();
  });

  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape" && modal.classList.contains("is-open")) close();
  });

  if(drop){
    drop.addEventListener("click", ()=> fileInput.click());

    drop.addEventListener("dragover", (e)=>{
      e.preventDefault();
      drop.classList.add("is-drag");
    });

    drop.addEventListener("dragleave", ()=>{
      drop.classList.remove("is-drag");
    });

    drop.addEventListener("drop", (e)=>{
      e.preventDefault();
      drop.classList.remove("is-drag");
      const files = Array.from(e.dataTransfer.files || []);
      if(files.length){
        selectedFiles = files;
        setStatus(`${files.length} ficheiro(s) selecionado(s).`, "ok");
        syncSaveState();
      }
    });
  }

  fileInput.addEventListener("change", ()=>{
    selectedFiles = Array.from(fileInput.files || []);
    if(selectedFiles.length) setStatus(`${selectedFiles.length} ficheiro(s) selecionado(s).`, "ok");
    else setStatus("", "");
    syncSaveState();
  });

  async function refresh(){
    try{
      const order = orderSelect?.value || "latest";
      const items = await fetchPhotos({ order });
      renderGallery(items);
    }catch(err){
      console.error(err);
      setStatus("Não foi possível carregar a galeria. Confirma a tabela e permissões.", "error");
    }
  }

  refreshBtn?.addEventListener("click", refresh);
  clearBtn?.addEventListener("click", ()=>{
    selectedFiles = [];
    if(fileInput) fileInput.value = "";
    if(titleInput) titleInput.value = "";
    setStatus("", "");
    syncSaveState();
  });

  saveBtn?.addEventListener("click", async ()=>{
    if(selectedFiles.length === 0) return;

    setStatus("A enviar...", "");
    saveBtn.disabled = true;

    try{
      for(const file of selectedFiles){
        const path = await uploadFileToBucket(file);
        const publicUrl = publicUrlFor(path);
        await insertPhotoRow({ path, title: titleInput?.value || "", public_url: publicUrl });
      }

      selectedFiles = [];
      if(fileInput) fileInput.value = "";
      if(titleInput) titleInput.value = "";

      setStatus("Enviado com sucesso. A atualizar galeria...", "ok");
      await refresh();
      setStatus("Obrigado. A foto já está na galeria.", "ok");
    }catch(err){
      console.error(err);
      setStatus(`Falha no envio: ${err.message || err}`, "error");
    }finally{
      syncSaveState();
    }
  });

  refresh();
}

document.addEventListener("DOMContentLoaded", ()=>{
  initReveal();
  initImgSwap();
  initCountdown();
  initQuintaModal();
  initAccommodationCarousel();
  initUGC();
});
