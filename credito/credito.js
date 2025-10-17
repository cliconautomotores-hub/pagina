/* Simulador de crédito (inicializa aunque el script se inyecte después) */
(function () {
  const $ = (id) => document.getElementById(id);
  const money = (x) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(x || 0);

  // --------- TNA BCRA: intenta varias rutas conocidas ----------
  async function fetchJson(url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function getTNAReferenciaBCRA() {
    // Intenta V3 (catálogo + serie)
    try {
      const BASE = "https://api.bcra.gob.ar/estadisticas/v3.0";
      const listData = await fetchJson(`${BASE}/Monetarias`);
      const target = listData.results?.find((v) => {
        const d = (v.descripcion || "").toLowerCase();
        return d.includes("tasa de política monetaria") && d.includes("tna");
      });
      if (target) {
        const datos = await fetchJson(`${BASE}/Monetarias/${encodeURIComponent(target.idVariable)}?limit=1`);
        const raw = datos.results?.[0]?.valor;
        const valor = Number(String(raw).replace(",", "."));
        if (isFinite(valor)) return valor;
      }
      throw new Error("V3 sin valor");
    } catch (_) { /* sigue */ }

    // Intenta V1 serie conocida (comúnmente usada para TPM TNA)
    try {
      const datos = await fetchJson("https://api.bcra.gob.ar/estadisticas/v1/series/7917/datos?limit=1");
      const raw = (datos?.results || datos?.datos || [])[0]?.valor ?? (datos?.[0]?.valor);
      const valor = Number(String(raw).replace(",", "."));
      if (isFinite(valor)) return valor;
      throw new Error("V1/7917 sin valor");
    } catch (_) { /* sigue */ }

    // Intenta principales variables (otra ruta histórica)
    try {
      const pv = await fetchJson("https://api.bcra.gob.ar/estadisticas/v1/principalesvariables");
      const tpm = (pv?.results || pv || []).find((x) => {
        const d = (x.descripcion || x.variable || "").toLowerCase();
        return d.includes("tasa de política monetaria") && d.includes("tna");
      });
      const valor = Number(String(tpm?.valor).replace(",", "."));
      if (isFinite(valor)) return valor;
      throw new Error("PV sin valor");
    } catch (_) { /* nada */ }

    return null;
  }
  // ------------------------------------------------------------

  function calcular() {
    const monto = parseFloat($("cr-monto").value) || 0;
    const anticipo = parseFloat($("cr-anticipo").value) || 0;
    const meses = parseInt($("cr-plazo").value, 10) || 1;
    const tasaAnual = parseFloat($("cr-tasa").value) || 0;

    const P = Math.max(0, monto - anticipo);        // principal financiado (sin comisión)
    const r = (tasaAnual / 100) / 12;               // tasa mensual

    const cuota = r === 0 ? P / meses : P * r / (1 - Math.pow(1 + r, -meses));
    const totalPagar = cuota * meses;
    const interesTotal = totalPagar - P;
    const tasaTotalAprox = `${tasaAnual.toFixed(2)}%`;

    $("cr-res-financiado").textContent = money(P);
    $("cr-res-cuota").textContent = money(Math.round(cuota));
    $("cr-res-interes").textContent = money(Math.round(interesTotal));
    $("cr-res-total").textContent = money(Math.round(totalPagar));
    $("cr-res-tasa").textContent = tasaTotalAprox;
  }

  function limpiar() {
    $("cr-monto").value = "";
    $("cr-anticipo").value = "";
    $("cr-plazo").value = "36";
    $("cr-tasa").value = "0";
    ["cr-res-financiado","cr-res-cuota","cr-res-interes","cr-res-total","cr-res-tasa"]
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

    ["cr-monto","cr-anticipo","cr-plazo","cr-tasa"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); calcular(); }
      });
    });

    // Trae TNA del BCRA: si llega, setea valor y leyenda; si no, deja 0
    const tna = await getTNAReferenciaBCRA();
    const tasaInput = $("cr-tasa");
    const nota = $("tna-fuente");
    if (tna) {
      tasaInput.value = tna.toFixed(2);
      if (nota) nota.textContent = "(BCRA)";
    } else {
      tasaInput.value = "0";
      if (nota) nota.textContent = "";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
