/* Simulador de crédito (GitHub Pages con TNA automática + timeout y fallback 1%) */
(function () {
  const $ = (id) => document.getElementById(id);
  const money = (x) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(x || 0);

  // ---------- Fetch con timeout ----------
  async function fetchWithTimeout(url, ms = 4000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      const r = await fetch(url, { cache: "no-store", signal: controller.signal });
      return r;
    } finally {
      clearTimeout(id);
    }
  }

  // ---------- Obtener TNA desde datos.gob.ar (compatible CORS) ----------
  async function getTNAReferencia() {
    try {
      // 7917 = serie TPM (TNA). Pedimos SOLO el último dato.
      const url = "https://apis.datos.gob.ar/series/api/series/?ids=7917&last=1&format=json";
      const r = await fetchWithTimeout(url, 4000);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      // data.data => [[fechaISO, valor]]
      const fila = data?.data?.[0];
      const fechaISO = fila?.[0];
      const valor = Number(fila?.[1]);
      if (isFinite(valor)) return { valor, fecha: fechaISO };
      throw new Error("Sin valor");
    } catch (e) {
      console.warn("No se pudo obtener TNA (datos.gob.ar):", e?.message || e);
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

    // UI de carga
    const tasaInput = $("cr-tasa");
    const nota = $("tna-fuente");
    tasaInput.value = "";
    if (nota) {
      nota.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px;">
        <span class="spinner" style="width:10px;height:10px;border:2px solid #ccd6e4;border-top:2px solid #3399ff;border-radius:50%;animation:spin 0.8s linear infinite;"></span>
        Cargando BCRA...
      </span>`;
    }

    const data = await getTNAReferencia();

    if (data) {
      tasaInput.value = Number(data.valor).toFixed(2);
      if (nota) nota.textContent = `(BCRA, ${formatearFecha(data.fecha)})`;
    } else {
      // 🔴 Fallback solicitado: 1%
      tasaInput.value = "1.00";
      if (nota) nota.textContent = "(sin conexión)";
    }
  }

  // Pequeña utilidad para fecha AAAA-MM-DD → DD/MM/AAAA (si llega AAAA-MM)
  function formatearFecha(f) {
    if (!f) return "";
    const s = String(f);
    // formato típico: "2025-10-17" o "2025-10"
    const [a, m, d] = s.split("-");
    if (a && m && d) return `${d}/${m}/${a}`;
    if (a && m) return `01/${m}/${a}`;
    return s;
  }

  // Spinner CSS (inyectado)
  const style = document.createElement("style");
  style.textContent = `@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`;
  document.head.appendChild(style);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
