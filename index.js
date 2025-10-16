// === Mantengo tu lógica original ===
function enviarConsulta(e){
  e.preventDefault();
  const nombre = document.getElementById('nombre').value.trim();
  alert(`¡Gracias ${nombre}! Recibimos tu consulta y te contactaremos a la brevedad.`);
  e.target.reset(); window.scrollTo({top:0, behavior:'smooth'});
}

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

  function scrollByCards(n){ track.scrollBy({left: cardWidth()*n, behavior:'smooth'}); }
  function visibleCount(){ const cw = cardWidth(); return Math.max(1, Math.floor(track.clientWidth / cw)); }
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

// === Banner auto: ./banner/banner.png ===
document.addEventListener('DOMContentLoaded', () => {
  const bannerEl = document.querySelector('.hero-banner');
  const bannerURL = './banner/banner.png';
  if (!bannerEl) return;
  fetch(bannerURL, { method:'HEAD' })
    .then(r => { if (r.ok) bannerEl.innerHTML = `<img src="${bannerURL}" alt="Banner principal">`; })
    .catch(()=>{});
});

// ========= NUEVO: Carga por carpetas y galería =========
// Estructura esperada: /pagina/modelo/models.json describe auto1..auto10
// Cada "autoN" incluye "principal" y "galeria" (array de rutas).
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

  // Fallback por si no hay JSON: seguimos soportando ./modelo/auto_N.*
  const fallbackExts = ['png','jpg','jpeg','webp'];

  for (const card of cards){
    const slot = Number(card.getAttribute('data-slot'));
    const thumb = card.querySelector('.thumb');
    let principal = null;
    let galeria = [];

    // Con JSON
    if (data && data[`auto${slot}`]){
      const info = data[`auto${slot}`];
      principal = info.principal || null;
      galeria = Array.isArray(info.galeria) ? info.galeria : [];
    }

    // Fallback: principal = ./modelo/auto_slot.ext si existe
    if (!principal){
      for (const ext of fallbackExts){
        const url = `./modelo/auto_${slot}.${ext}`;
        try { const r = await fetch(url,{method:'HEAD'}); if (r.ok){ principal = url; break; } } catch(_){}
      }
    }

    if (principal){
      thumb.innerHTML = `<img src="${principal}" alt="Auto ${slot}">`;
    }

    // Guardamos galería (siempre incluye principal como primera)
    const imgs = [principal, ...galeria.filter(Boolean)];
    galleryMap.set(slot, imgs.filter(Boolean));

    // Abrir modal al clickear la imagen o la parte superior de la card
    thumb.style.cursor = 'zoom-in';
    thumb.addEventListener('click', () => openGallery(slot, 0));
    // Evitar que el botón "Me interesa" abra la galería
    card.querySelector('.btn')?.addEventListener('click', e => e.stopPropagation());
  }
});

// ===== Modal =====
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
  // miniaturas
  thumbsEl.innerHTML = '';
  currentList.forEach((src,i)=>{
    const t = document.createElement('img');
    t.src = src; if (i===currentIndex) t.classList.add('is-active');
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
