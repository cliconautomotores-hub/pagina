// Carga automática: ./modelo/auto_N.(png|jpg|jpeg|webp)
document.addEventListener('DOMContentLoaded', () => {
  const thumbs = document.querySelectorAll('.thumb[data-auto]');
  const exts = ['png','jpg','jpeg','webp']; // probamos en este orden
  const base = './modelo/';

  thumbs.forEach(async (el) => {
    const n = el.getAttribute('data-auto');
    const urls = exts.map(ext => `${base}auto_${n}.${ext}`);

    let hit = null;
    for (const u of urls) {
      try {
        const res = await fetch(u, { method: 'HEAD' });
        if (res.ok) { hit = u; break; }
      } catch (_) {}
    }
    if (hit) el.innerHTML = `<img src="${hit}" alt="Auto ${n}">`;
    // Si no hay archivo, deja el texto "Imagen Auto N".
  });
});
