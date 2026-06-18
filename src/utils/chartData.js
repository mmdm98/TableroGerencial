// ─── Formato de fechas en ejes ───────────────────────────────────────────────

const DIAS = ['D', 'L', 'MA', 'MI', 'J', 'V', 'SA']

export function labelFechaConDia(iso) {
  const d = new Date(iso + 'T12:00:00')
  if (isNaN(d)) return iso
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return [`${dd}/${mm}`, DIAS[d.getDay()]]
}

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

function buildLineaSeries(byDate, claves, modo = 'pct') {
  const dates = Object.keys(byDate).sort()
  const series = claves.map(k => ({
    name: k,
    data: dates.map(d => {
      if (modo === 'vol') return byDate[d][k] || 0
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
  return buildLineaSeries(byDate, claves, 'vol')
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
  return buildLineaSeries(byDate, claves, 'vol')
}

export function getMotivosPieData(data) {
  const counts = contarPorClave(data, 'motivo_necesidad', 'Sin Motivo')
  const labels = Object.keys(counts).sort()
  return { series: labels.map(l => counts[l]), labels }
}

export function getMotivosVelocidadData(data, umbral = 20) {
  const byDate = agruparPorFecha(data, 'motivo_necesidad', 'Sin Motivo')
  const dates = Object.keys(byDate).sort()
  if (dates.length < 2) return { series: [], categories: [] }

  const allMotivos = [...new Set(data.map(r => r.motivo_necesidad ?? 'Sin Motivo'))].sort()

  const deltasByMotivo = {}
  allMotivos.forEach(m => {
    deltasByMotivo[m] = dates.slice(1).map((d, i) => {
      const prev = byDate[dates[i]][m] || 0
      const curr = byDate[d][m] || 0
      return curr - prev
    })
  })

  const filteredMotivos = allMotivos.filter(m =>
    deltasByMotivo[m].some(delta => Math.abs(delta) > umbral)
  )

  const series = filteredMotivos.map(m => ({
    name: m,
    data: deltasByMotivo[m],
  }))

  return { series, categories: dates.slice(1) }
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

const FASES_SENTIMIENTO = ['Negativo', 'Neutro', 'Positivo', 'No Medido']

function buildMatriz() {
  const m = {}
  FASES_SENTIMIENTO.forEach(a => {
    m[a] = {}
    FASES_SENTIMIENTO.forEach(b => { m[a][b] = 0 })
  })
  return m
}

export function getSankeyData(data) {
  const matrizA = buildMatriz() // inicio → desarrollo
  const matrizB = buildMatriz() // desarrollo → cierre

  data.forEach(r => {
    const fi = r.fase_inicio
    const fd = r.fase_desarrollo
    const fc = r.fase_cierre

    if (fi && fd && matrizA[fi]?.[fd] !== undefined) matrizA[fi][fd]++
    if (fd && fc && matrizB[fd]?.[fc] !== undefined) matrizB[fd][fc]++
  })

  const links = []

  // Grupo A: Inicio → Desarrollo
  FASES_SENTIMIENTO.forEach(fi => {
    FASES_SENTIMIENTO.forEach(fd => {
      const value = matrizA[fi][fd]
      if (value > 0) links.push({ source: `Inicio: ${fi}`, target: `Desarrollo: ${fd}`, value })
    })
  })

  // Grupo B: Desarrollo → Cierre
  FASES_SENTIMIENTO.forEach(fd => {
    FASES_SENTIMIENTO.forEach(fc => {
      const value = matrizB[fd][fc]
      if (value > 0) links.push({ source: `Desarrollo: ${fd}`, target: `Cierre: ${fc}`, value })
    })
  })

  // Solo incluir nodos que aparecen en algún link
  const usedIds = new Set(links.flatMap(l => [l.source, l.target]))
  const nodes = [
    ...FASES_SENTIMIENTO.map(f => ({ id: `Inicio: ${f}` })),
    ...FASES_SENTIMIENTO.map(f => ({ id: `Desarrollo: ${f}` })),
    ...FASES_SENTIMIENTO.map(f => ({ id: `Cierre: ${f}` })),
  ].filter(n => usedIds.has(n.id))

  return { nodes, links }
}

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
