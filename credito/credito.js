/* Simulador de crédito (inicializa aunque el script se inyecte después) */
(function () {
  const $ = (id) => document.getElementById(id);
  const money = (x) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(x || 0);

  // 🔹 NUEVO: función para traer TNA desde el BCRA (referencia)
  async function getTNAReferenciaBCRA() {
    try {
      const BASE = "https://api.bcra.gob.ar/estadisticas/v3.0";

      // 1) Catálogo de variables monetarias
      const listRes = await fetch(`${BASE}/Monetarias`);
      if (!listRes.ok) throw new Error("No se pudo listar variables");
      const listData = await listRes.json(); // { status, results: [...] }

      // 2) Buscar “Tasa de Política Monetaria” en TNA
      const target = listData.results?.find((v) => {
        const d = (v.descripcion || "").toLowerCase();
        return d.includes("tasa de política monetaria") && d.includes("tna");
      });
      if (!target) throw new Error("No se encontró variable TNA");

      // 3) Pedir últimos datos de esa variable (limit=1 trae el más reciente)
      const datosRes = await fetch(
        `${BASE}/Monetarias/${encodeURIComponent(target.idVariable)}?limit=1`
      );
      if (!datosRes.ok) throw new Error("No se pudo leer la serie TNA");
      const datos = await datosRes.json(); // { status, results: [{ valor, fecha, ... }] }

      const raw = datos.results?.[0]?.valor;
      const valor = Number(String(raw).replace(",", "."));
      if (!isFinite(valor)) throw new Error("Valor TNA inválido");
      return valor; // ej: 29.00
    } catch (e) {
      console.warn("⚠️ BCRA TNA no disponible:", e.message);
      return null; // permite fallback manual
    }
  }

  function calcular() {
    const monto = parseFloat($("cr-monto").value) || 0;
    const anticipo = parseFloat($("cr-anticipo").value) || 0;
    const meses = parseInt($("cr-plazo").value, 10) || 1;
    const tasaAnual = parseFloat($("cr-tasa").value) || 0;
    const comision = parseFloat($("cr-comision").value) || 0;

    const base = Math.max(0, monto - anticipo);     // monto a financiar sin comisiones
    const fee = base * (comision / 100);            // cargo/comisión
    const P = base + fee;                           // principal financiado
    const r = (tasaAnual / 100) / 12;               // tasa mensual

    const cuota = r === 0 ? P / meses : P * r / (1 - Math.pow(1 + r, -meses));
    const totalPagar = cuota * meses;
    const interesTotal = totalPagar - P;
    const tasaTotalAprox = (tasaAnual + comision).toFixed(2) + "%";

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
    $("cr-tasa").value = "36";
    $("cr-comision").value = "2";
    [
      "cr-res-financiado",
      "cr-res-cuota",
      "cr-res-interes",
      "cr-res-total",
      "cr-res-tasa",
    ].forEach((id) => ($(`${id}`).textContent = "-"));
  }

  async function init() {
    // Si el HTML del módulo aún no fue insertado, reintenta un instante después
    const btn = $("cr-calcular");
    const clr = $("cr-limpiar");
    if (!btn || !clr) {
      setTimeout(init, 50);
      return;
    }

    btn.addEventListener("click", calcular);
    clr.addEventListener("click", limpiar);

    // Enter para calcular
    ["cr-monto", "cr-anticipo", "cr-plazo", "cr-tasa", "cr-comision"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          calcular();
        }
      });
    });

    // 🔹 NUEVO: setea automáticamente la TNA de referencia del BCRA (si está disponible)
    const tna = await getTNAReferenciaBCRA();
    if (tna) $("cr-tasa").value = tna.toFixed(2);
  }

  // Inicializa ya si el documento está listo; si no, espera el DOMContentLoaded.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
