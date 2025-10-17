// === Mantengo tu lógica original + soporte completo para PNG/JPG/JPEG/WEBP ===

// Simula envío del formulario
function enviarConsulta(e){
  e.preventDefault();
  const nombre = document.getElementById('nombre').value.trim();
  alert(`¡Gracias ${nombre}! Recibimos tu consulta y te contactaremos a la brevedad.`);
  e.target.reset();
  window.scrollTo({top:0, behavior:'smooth'});
}

// Carrusel (botones + drag)
(function(){
  const track = document.getElementById('track');
  const prev = document.querySelector('.prev');
  const next = document.querySelector('.next');

  const cardWidth = () => {
    const first = track.querySelector('.card');
    const gap = parseInt(getComputedStyle(track).gap||'18',10);
    return first ? first.getBoundingClientRect().width + gap : 320;
  };

  function updateArrows(){
    const maxScroll = track.scrollWidth - track.clientWidth - 4;
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft >= maxScroll;
  }

  function scrollByCards(n){
    track.scrollBy({left: cardWidth()*n, behavior:'smooth'});
  }

  function visibleCount(){
    const cw = cardWidth();
    return Math.max(1, Math.floor(track.clientWidth / cw));
  }

  prev.addEventListener('click', ()=>scrollByCards(-1*visibleCount()));
  next.addEventListener('click', ()=>scrollByCards(visibleCount()));

  let isDown=false,startX,scrollStart;
  const start = (x)=>{isDown=true;startX=x;scrollStart=track.scrollLeft;track.classList.add('dragging')}
  const move  = (x)=>{ if(!isDown) return; track.scrollLeft = scrollStart - (x-startX) }
  const end   = ()=>{isDown=false;track.classList.remove('dragging')}

  track.addEventListener('mousedown',e=>start(e.pageX));
  window.addEventListener('mousemove',e=>move(e.pageX));
  window.addEventListener('mouseup',end);

  track.addEventListener('touchstart',e=>start(e.touches[0].pageX),{passive:true});
  track.addEventListener('touchmove',e=>move(e.touches[0].pageX),{passive:true});
  track.addEventListener('touchend',end);

  track.addEventListener('keydown',e=>{
    if(e.key==='ArrowRight'){ e.preventDefault(); scrollByCards(1); }
    if(e.key==='ArrowLeft'){  e.preventDefault(); scrollByCards(-1); }
  });

  track.setAttribute('tabindex','0');
  track.addEventListener('scroll', updateArrows, {passive:true});
  window.addEventListener('resize', updateArrows);
  updateArrows();
})();

// === Banner automático ./banner/banner.png ===
document.addEventListener('DOMContentLoaded', () => {
  const bannerEl = document.querySelector('.hero-banner');
  const bannerURL = './banner/banner.png';
  if (!bannerEl) return;
  fetch(bannerURL, { method:'HEAD' })
    .then(r => { if (r.ok) bannerEl.innerHTML = `<img src="${bannerURL}" alt="Banner principal">`; })
    .catch(()=>{});
});

// ========= NUEVO SISTEMA DE IMÁGENES UNIVERSAL =========
const TRY_EXTS = ['png','jpg','jpeg','webp'];

// Test real con <img> para evitar fallos de HEAD o caché
function imgExists(url){
  return new Promise(resolve=>{
    const i = new Image();
    i.onload = () => resolve(true);
    i.onerror = () => resolve(false);
    i.src = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
  });
}

// Verifica incluso si viene con extensión incorrecta o sin extensión
async function resolvePath(pathOrBase){
  const hasExt = /\.(png|jpe?g|webp)$/i.test(pathOrBase);

  // Si tiene extensión, probamos primero tal cual
  if (hasExt) {
    if (await imgExists(pathOrBase)) return pathOrBase;

    // Si no existe, probamos las otras variantes
    const base = pathOrBase.replace(/\.(png|jpe?g|webp)$/i, '');
    for (const ext of TRY_EXTS){
      const alt = `${base}.${ext}`;
      if (alt.toLowerCase() !== pathOrBase.toLowerCase() && await imgExists(alt)) return alt;
    }
    return null;
  }

  // Si no tiene extensión, probamos todas
  for (const ext of TRY_EXTS){
    const u = `${pathOrBase}.${ext}`;
    if (await imgExists(u)) return u;
  }
  return null;
}

// ========= Carga por carpetas + galería =========
const MODELS_JSON = './modelo/models.json';
const galleryMap = new Map(); // slot -> array de imágenes

document.addEventListener('DOMContentLoaded', async () => {
  const track = document.getElementById('track');
  const cards = track.querySelectorAll('.card[data-slot]');
  let data = null;

  try {
    const res = await fetch(MODELS_JSON, {cache:'no-store'});
    if (res.ok) data = await res.json();
  } catch(_){}

  for (const card of cards){
    const slot = Number(card.getAttribute('data-slot'));
    const thumb = card.querySelector('.thumb');
    let principal = null;
    let galeria = [];

    // JSON definido
    if (data && data[`auto${slot}`]){
      const info = data[`auto${slot}`];
      principal = info.principal ? await resolvePath(info.principal) : null;
      galeria = Array.isArray(info.galeria)
        ? (await Promise.all(info.galeria.map(p => resolvePath(p)))).filter(Boolean)
        : [];
    }

    // Fallback si no hay JSON
    if (!principal){
      for (const ext of TRY_EXTS){
        const url = `./modelo/auto_${slot}.${ext}`;
        if (await imgExists(url)) { principal = url; break; }
      }
    }

    // === AGREGADO: aplicar object-position desde JSON (si existe) ===
    const pos =
      (data && data[`auto${slot}`] && data[`auto${slot}`].pos) || 'center';

    if (principal){
      thumb.innerHTML = `<img src="${principal}" alt="Auto ${slot}" style="object-position:${pos}">`;
    }

    const imgs = [principal, ...galeria.filter(Boolean)];
    galleryMap.set(slot, imgs.filter(Boolean));

    // Abrir galería al click
    thumb.style.cursor = 'zoom-in';
    thumb.addEventListener('click', () => openGallery(slot, 0));
    card.querySelector('.btn')?.addEventListener('click', e => e.stopPropagation());
  }
});

// ===== Modal Galería =====
const modal = document.getElementById('galeriaModal');
const imgEl = document.getElementById('galeriaImg');
const thumbsEl = document.getElementById('galeriaThumbs');
const btnPrev = document.getElementById('galPrev');
const btnNext = document.getElementById('galNext');

let currentList = [];
let currentIndex = 0;

function openGallery(slot, index=0){
  currentList = galleryMap.get(slot) || [];
  if (!currentList.length) return;
  currentIndex = Math.max(0, Math.min(index, currentList.length-1));
  renderGallery();
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden','false');
}

function closeGallery(){
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden','true');
}

function renderGallery(){
  imgEl.src = currentList[currentIndex];
  thumbsEl.innerHTML = '';
  currentList.forEach((src,i)=>{
    const t = document.createElement('img');
    t.src = src;
    if (i===currentIndex) t.classList.add('is-active');
    t.addEventListener('click', ()=>{ currentIndex=i; renderGallery(); });
    thumbsEl.appendChild(t);
  });
}

function next(){ currentIndex = (currentIndex+1)%currentList.length; renderGallery(); }
function prev(){ currentIndex = (currentIndex-1+currentList.length)%currentList.length; renderGallery(); }

btnNext.addEventListener('click', next);
btnPrev.addEventListener('click', prev);
modal.addEventListener('click', e=>{ if (e.target.hasAttribute('data-close')) closeGallery(); });
document.addEventListener('keydown', e=>{
  if (!modal.classList.contains('is-open')) return;
  if (e.key==='Escape') closeGallery();
  if (e.key==='ArrowRight') next();
  if (e.key==='ArrowLeft') prev();
});

// === Contacto por WhatsApp (configurable por JSON) ===
(function () {
  const BTN_ID = 'btnContactarme';
  const CONFIG_URL = './config/contacto.json';
  const FALLBACK_NUMBER = '5491122334455';
  const FALLBACK_MESSAGE = 'Hola! Vi los modelos y quiero más info.';

  function buildWAUrl(number, message) {
    const n = String(number).replace(/[^\d]/g, '');
    const txt = encodeURIComponent(message || '');
    return `https://wa.me/${n}${txt ? `?text=${txt}` : ''}`;
  }

  async function getConfig() {
    try {
      const r = await fetch(CONFIG_URL, { cache: 'no-store' });
      if (!r.ok) throw 0;
      return await r.json();
    } catch {
      return { whatsapp_number: FALLBACK_NUMBER, default_message: FALLBACK_MESSAGE };
    }
  }

  // ✅ Versión corregida: redirección directa (funciona en móviles)
  async function handleClick() {
    const cfg = await getConfig();
    const url = buildWAUrl(cfg.whatsapp_number, cfg.default_message);
    window.location.href = url; // redirección directa, no bloqueada por móviles
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById(BTN_ID);
    if (btn) btn.addEventListener('click', handleClick);
  });
})();
