/* Simulador de crédito (GitHub Pages con TNA automática del BCRA) */
(function () {
  const $ = (id) => document.getElementById(id);
  const money = (x) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(x || 0);

  // --------- Obtener TNA desde datos.gob.ar ----------
  async function getTNAReferencia() {
    try {
      const url = "https://apis.datos.gob.ar/series/api/series/?ids=7917";
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const valor = Number(data?.data?.[0]?.[1]);
      const fecha = data?.data?.[0]?.[0];
      if (isFinite(valor)) return { valor, fecha };
      throw new Error("Sin valor");
    } catch (e) {
      console.warn("No se pudo obtener TNA del BCRA (datos.gob.ar):", e);
      return null;
    }
  }
  // ----------------------------------------------------

  function calcular() {
    const monto = parseFloat($("cr-monto").value) || 0;
    const anticipo = parseFloat($("cr-anticipo").value) || 0;
    const meses = parseInt($("cr-plazo").value, 10) || 1;
    const tasaAnual = parseFloat($("cr-tasa").value) || 0;

    const P = Math.max(0, monto - anticipo);
    const r = (tasaAnual / 100) / 12;

    const cuota = r === 0 ? P / meses : P * r / (1 - Math.pow(1 + r, -meses));
    const totalPagar = cuota * meses;
    const interesTotal = totalPagar - P;

    $("cr-res-financiado").textContent = money(P);
    $("cr-res-cuota").textContent = money(Math.round(cuota));
    $("cr-res-interes").textContent = money(Math.round(interesTotal));
    $("cr-res-total").textContent = money(Math.round(totalPagar));
    $("cr-res-tasa").textContent = `${tasaAnual.toFixed(2)}%`;
  }

  function limpiar() {
    $("cr-monto").value = "";
    $("cr-anticipo").value = "";
    $("cr-plazo").value = "36";
    $("cr-tasa").value = "0";
    ["cr-res-financiado", "cr-res-cuota", "cr-res-interes", "cr-res-total", "cr-res-tasa"]
      .forEach((id) => ($(`${id}`).textContent = "-"));
    const nota = $("tna-fuente");
    if (nota) nota.textContent = "";
  }

  async function init() {
    const btn = $("cr-calcular");
    const clr = $("cr-limpiar");
    if (!btn || !clr) { setTimeout(init, 50); return; }

    btn.addEventListener("click", calcular);
    clr.addEventListener("click", limpiar);

    ["cr-monto", "cr-anticipo", "cr-plazo", "cr-tasa"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); calcular(); }
      });
    });

    // 🔹 Estado inicial mientras busca la TNA
    const tasaInput = $("cr-tasa");
    const nota = $("tna-fuente");
    tasaInput.value = "";
    if (nota) {
      nota.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px;">
        <span class="spinner" style="width:10px;height:10px;border:2px solid #ccc;border-top:2px solid #3399ff;border-radius:50%;animation:spin 0.8s linear infinite;"></span>
        Cargando BCRA...
      </span>`;
    }

    const data = await getTNAReferencia();
    if (data) {
      tasaInput.value = data.valor.toFixed(2);
      if (nota) nota.textContent = `(BCRA, ${data.fecha})`;
    } else {
      tasaInput.value = "1.00";
      if (nota) nota.textContent = "(sin conexión)";
    }
  }

  // 🔹 Animación CSS del spinner (por JS para no requerir hoja adicional)
  const style = document.createElement("style");
  style.textContent = `
  @keyframes spin { from {transform:rotate(0deg);} to {transform:rotate(360deg);} }
  `;
  document.head.appendChild(style);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
