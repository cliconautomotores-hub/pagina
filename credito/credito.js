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

      const listRes = await fetch(`${BASE}/Monetarias`);
      if (!listRes.ok) throw new Error("No se pudo listar variables");
      const listData = await listRes.json();

      const target = listData.results?.find((v) => {
        const d = (v.descripcion || "").toLowerCase();
        return d.includes("tasa de política monetaria") && d.includes("tna");
      });
      if (!target) throw new Error("No se encontró variable TNA");

      const datosRes = await fetch(
        `${BASE}/Monetarias/${encodeURIComponent(target.idVariable)}?limit=1`
      );
      if (!datosRes.ok) throw new Error("No se pudo leer la serie TNA");
      const datos = await datosRes.json();

      const raw = datos.results?.[0]?.valor;
      const valor = Number(String(raw).replace(",", "."));
      if (!isFinite(valor)) throw new Error("Valor TNA inválido");
      return valor;
    } catch (e) {
      console.warn("⚠️ BCRA TNA no disponible:", e.message);
      return null;
    }
  }

  function calcular() {
    const monto = parseFloat($("cr-monto").value) || 0;
    const anticipo = parseFloat($("cr-anticipo").value) || 0;
    const meses = parseInt($("cr-plazo").value, 10) || 1;
    const tasaAnual = parseFloat($("cr-tasa").value) || 0;
    const comision = parseFloat($("cr-comision").value) || 0;

    const base = Math.max(0, monto - anticipo);
    const fee = base * (comision / 100);
    const P = base + fee;
    const r = (tasaAnual / 100) / 12;

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
    const btn = $("cr-calcular");
    const clr = $("cr-limpiar");
    if (!btn || !clr) {
      setTimeout(init, 50);
      return;
    }

    btn.addEventListener("click", calcular);
    clr.addEventListener("click", limpiar);

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

    // 🔹 NUEVO: setea automáticamente la TNA del BCRA y muestra leyenda
    const tna = await getTNAReferenciaBCRA();
    const inputTasa = $("cr-tasa");

    // eliminar leyenda previa si la hubiera
    let nota = document.getElementById("tna-fuente");
    if (nota) nota.remove();

    nota = document.createElement("div");
    nota.id = "tna-fuente";
    nota.style.fontSize = "11px";
    nota.style.color = "#888";
    nota.style.marginTop = "4px";

    if (tna) {
      inputTasa.value = tna.toFixed(2);
      nota.textContent = "(BCRA)";
    } else {
      inputTasa.value = "0";
      nota.textContent = "";
    }

    // Insertar leyenda justo debajo del input
    inputTasa.parentNode.appendChild(nota);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
