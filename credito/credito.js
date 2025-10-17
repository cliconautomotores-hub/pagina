/* Simulador de crédito */
(function(){
  const $ = id => document.getElementById(id);
  const money = x => new Intl.NumberFormat('es-AR',{
    style:'currency', currency:'ARS', maximumFractionDigits:0
  }).format(x || 0);

  function calcular(){
    const monto     = parseFloat($('cr-monto').value)     || 0;
    const anticipo  = parseFloat($('cr-anticipo').value)  || 0;
    const meses     = parseInt($('cr-plazo').value,10)    || 1;
    const tasaAnual = parseFloat($('cr-tasa').value)      || 0;
    const comision  = parseFloat($('cr-comision').value)  || 0;

    const base = Math.max(0, monto - anticipo);    // monto a financiar sin comisiones
    const fee  = base * (comision/100);            // cargo/comisión
    const P    = base + fee;                       // principal financiado
    const r    = (tasaAnual/100) / 12;             // tasa mensual

    let cuota = 0;
    if (r === 0) { cuota = P / meses; }
    else { cuota = P * r / (1 - Math.pow(1+r, -meses)); }

    const totalPagar   = cuota * meses;
    const interesTotal = totalPagar - P;
    const tasaTotalAprox = (tasaAnual + comision).toFixed(2) + '%';

    $('cr-res-financiado').textContent = money(P);
    $('cr-res-cuota').textContent      = money(Math.round(cuota));
    $('cr-res-interes').textContent    = money(Math.round(interesTotal));
    $('cr-res-total').textContent      = money(Math.round(totalPagar));
    $('cr-res-tasa').textContent       = tasaTotalAprox;
  }

  function limpiar(){
    $('cr-monto').value = '';
    $('cr-anticipo').value = '';
    $('cr-plazo').value = '36';
    $('cr-tasa').value = '36';
    $('cr-comision').value = '2';
    ['cr-res-financiado','cr-res-cuota','cr-res-interes','cr-res-total','cr-res-tasa']
      .forEach(id => $(id).textContent = '-');
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const btn = $('cr-calcular'), clr = $('cr-limpiar');
    if (btn) btn.addEventListener('click', calcular);
    if (clr) clr.addEventListener('click', limpiar);

    // Enter para calcular
    ['cr-monto','cr-anticipo','cr-plazo','cr-tasa','cr-comision'].forEach(id=>{
      const el = $(id);
      if (!el) return;
      el.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); calcular(); }});
    });
  });
})();
