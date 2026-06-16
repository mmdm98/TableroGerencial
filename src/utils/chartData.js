// ─── Helpers ────────────────────────────────────────────────────────────────

function contarPorClave(arr, key, fallback = 'Sin Clasificar') {
  const counts = {}
  arr.forEach(r => {
    const k = (r[key] && String(r[key]).trim()) ? r[key] : fallback
    counts[k] = (counts[k] || 0) + 1
  })
  return counts
}

function agruparPorFecha(data, key, fallback = 'Sin Clasificar') {
  const byDate = {}
  data.forEach(r => {
    const d = r.fecha_llamada ?? 'Sin fecha'
    if (!byDate[d]) byDate[d] = {}
    const k = (r[key] && String(r[key]).trim()) ? r[key] : fallback
    byDate[d][k] = (byDate[d][k] || 0) + 1
  })
  return byDate
}

function buildLineaSeries(byDate, claves) {
  const dates = Object.keys(byDate).sort()
  const series = claves.map(k => ({
    name: k,
    data: dates.map(d => {
      const total = Object.values(byDate[d]).reduce((a, b) => a + b, 0)
      return total > 0 ? +((byDate[d][k] || 0) / total * 100).toFixed(1) : 0
    }),
  }))
  return { series, categories: dates }
}

// ─── Sección A: Necesidad ───────────────────────────────────────────────────

export function getNecesidadLineData(data) {
  const byDate = agruparPorFecha(data, 'necesidad', 'Sin Clasificar')
  const claves = [...new Set(data.map(r => r.necesidad ?? 'Sin Clasificar'))].sort()
  return buildLineaSeries(byDate, claves)
}

export function getNecesidadPieData(data) {
  const counts = contarPorClave(data, 'necesidad')
  const labels = Object.keys(counts).sort()
  return { series: labels.map(l => counts[l]), labels }
}

// ─── Sección B: Motivos ─────────────────────────────────────────────────────

export function getMotivosLineData(data) {
  const byDate = agruparPorFecha(data, 'motivo_necesidad', 'Sin Motivo')
  const claves = [...new Set(data.map(r => r.motivo_necesidad ?? 'Sin Motivo'))].sort()
  return buildLineaSeries(byDate, claves)
}

export function getMotivosPieData(data) {
  const counts = contarPorClave(data, 'motivo_necesidad', 'Sin Motivo')
  const labels = Object.keys(counts).sort()
  return { series: labels.map(l => counts[l]), labels }
}

export function getTop5Justificaciones(data) {
  const counts = {}
  data.forEach(r => {
    const j = r.justificacion_motivo
    if (j && String(j).trim()) counts[j] = (counts[j] || 0) + 1
  })
  const total = data.length || 1
  const top5 = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return {
    categories: top5.map(([k]) => k),
    series: [{ name: '% del total', data: top5.map(([, v]) => +(v / total * 100).toFixed(1)) }],
  }
}

// ─── Sección C: Sentimiento ─────────────────────────────────────────────────

const CATS_SENTIMIENTO = ['Positivo', 'Neutro', 'Negativo', 'No Medido']

export function getSentimientoDistribucion(data) {
  const total = data.length || 1
  const counts = { Positivo: 0, Neutro: 0, Negativo: 0, 'No Medido': 0 }
  data.forEach(r => {
    const cat = r.sentimiento_categoria
    if (cat && counts[cat] !== undefined) counts[cat]++
    else counts['No Medido']++
  })
  return CATS_SENTIMIENTO.map(k => ({
    label: k,
    count: counts[k],
    pct: +(counts[k] / total * 100).toFixed(1),
  }))
}

export function getSentimientoLineData(data) {
  const byDate = {}
  data.forEach(r => {
    const d = r.fecha_llamada ?? 'Sin fecha'
    if (!byDate[d]) byDate[d] = { total: 0, positivo: 0 }
    byDate[d].total++
    if (r.sentimiento_categoria === 'Positivo') byDate[d].positivo++
  })
  const dates = Object.keys(byDate).sort()
  return {
    categories: dates,
    series: [{
      name: '% Positivo',
      data: dates.map(d => {
        const { total, positivo } = byDate[d]
        return total > 0 ? +(positivo / total * 100).toFixed(1) : 0
      }),
    }],
  }
}

const FASES_ORDEN = ['Negativo', 'Neutro', 'Positivo']

export function getHeatmapData(data) {
  const matrix = {}
  FASES_ORDEN.forEach(fi => {
    matrix[fi] = {}
    FASES_ORDEN.forEach(fc => { matrix[fi][fc] = 0 })
  })

  let totalValido = 0
  data.forEach(r => {
    const fi = r.fase_inicio
    const fc = r.fase_cierre
    if (fi && fc && matrix[fi]?.[fc] !== undefined) {
      matrix[fi][fc]++
      totalValido++
    }
  })

  const div = totalValido || 1
  // Filas = Inicio (de peor a mejor); Columnas = Cierre
  return FASES_ORDEN.map(fi => ({
    name: `Inicio: ${fi}`,
    data: FASES_ORDEN.map(fc => ({
      x: `Cierre: ${fc}`,
      y: +(matrix[fi][fc] / div * 100).toFixed(1),
    })),
  }))
}
