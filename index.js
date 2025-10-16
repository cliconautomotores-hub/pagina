// === Mantengo TODA tu lógica original + agrego carga de imágenes por posición ===

// Simula envío del formulario
function enviarConsulta(e){
  e.preventDefault();
  const nombre = document.getElementById('nombre').value.trim();
  alert(`¡Gracias ${nombre}! Recibimos tu consulta y te contactaremos a la brevedad.`);
  e.target.reset(); window.scrollTo({top:0, behavior:'smooth'});
}

// Carrusel (botones + drag) original
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

  // Drag
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

// === NUEVO: Cargar imágenes ./modelo/auto_N.* por orden de aparición (1..10) ===
document.addEventListener('DOMContentLoaded', () => {
  const thumbs = document.querySelectorAll('#track .thumb');
  const base = './modelo/';
  const exts = ['png','jpg','jpeg','webp'];

  thumbs.forEach((el, i) => {
    const n = i + 1; // posición natural => auto_1, auto_2, ...
    (async () => {
      for (const ext of exts) {
        const url = `${base}auto_${n}.${ext}`;
        try {
          const res = await fetch(url, { method: 'HEAD' });
          if (res.ok) {
            // Reemplazo SOLO el contenido visual, sin tocar clases/estilos
            el.innerHTML = `<img src="${url}" alt="Auto ${n}" style="width:100%;height:170px;object-fit:cover;border-top-left-radius:18px;border-top-right-radius:18px;">`;
            break;
          }
        } catch(_) {}
      }
    })();
  });
});
