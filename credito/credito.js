/* Simulador de crédito (GitHub Pages compatible con datos.gob.ar) */
(function () {
  const $ = (id) => document.getElementById(id);
  const money = (x) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(x || 0);

  // --------- TNA desde datos.gob.ar (compatible con navegador) ----------
  async function getTNAReferencia() {
    try {
      const url = "https://apis.datos.gob.ar/series/api/series/?ids=7917";
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const valor = Number(data?.data?.[0]?.[1]);
      if (isFinite(valor)) return valor;
      throw new Error("Sin valor");
    } catch (e) {
      console.warn("No se pudo obtener TNA del BCRA (datos.gob.ar):", e);
      return null;
    }
  }
  // ----------------------------------------------------------------------

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

    // 🔹 Toma TNA automática (BCRA vía datos.gob.ar)
    const tna = await getTNAReferencia();
    const tasaInput = $("cr-tasa");
    const nota = $("tna-fuente");

    if (tna) {
      tasaInput.value = tna.toFixed(2);
      if (nota) nota.textContent = "(BCRA)";
    } else {
      tasaInput.value = "0";
      if (nota) nota.textContent = "(sin conexión)";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
