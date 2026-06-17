export function calcKpis(data) {
  const total = data.length
  const duracionProm = total > 0
    ? data.reduce((s, r) => s + (r.duracion_minutos ?? 0), 0) / total
    : null
  const medidos = data.filter(r => r.sentimiento_categoria && r.sentimiento_categoria !== 'No Medido')
  const posNeutro = medidos.filter(r =>
    r.sentimiento_categoria === 'Positivo' || r.sentimiento_categoria === 'Neutro'
  ).length
  const pctPosNeutro = medidos.length > 0 ? posNeutro / medidos.length * 100 : null
  const sentCount = { Positivo: 0, Neutro: 0, Negativo: 0, 'No Medido': 0 }
  data.forEach(r => {
    const c = r.sentimiento_categoria ?? 'No Medido'
    sentCount[c] = (sentCount[c] ?? 0) + 1
  })
  const pctPositivo = total > 0 ? sentCount.Positivo / total * 100 : null
  const pctNegativo = total > 0 ? sentCount.Negativo / total * 100 : null
  return { total, duracionProm, pctPosNeutro, pctPositivo, pctNegativo, sentCount, medidos: medidos.length }
}

function contarPorKey(dataA, dataB, key, fallback) {
  const counts = {}
  dataA.forEach(r => {
    const k = r[key] ?? fallback
    if (!counts[k]) counts[k] = { a: 0, b: 0 }
    counts[k].a++
  })
  dataB.forEach(r => {
    const k = r[key] ?? fallback
    if (!counts[k]) counts[k] = { a: 0, b: 0 }
    counts[k].b++
  })
  return Object.entries(counts)
    .sort((x, y) => (y[1].a + y[1].b) - (x[1].a + x[1].b))
    .map(([label, { a, b }]) => ({ label, a, b }))
}

export function getNecesidades(dataA, dataB) {
  return contarPorKey(dataA, dataB, 'necesidad', 'Sin Clasificar')
}

export function getTopMotivos(dataA, dataB, n = 5) {
  return contarPorKey(dataA, dataB, 'motivo_necesidad', 'Sin Motivo').slice(0, n)
}
