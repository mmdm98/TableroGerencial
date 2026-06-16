// Convierte "DD-MM-YYYY" → "YYYY-MM-DD"
function parseFecha(raw) {
  if (!raw || typeof raw !== 'string') return null
  const [d, m, y] = raw.trim().split('-')
  if (!d || !m || !y) return null
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

// Limpia un float: devuelve null si es NaN, vacío o inválido
function limpiarFloat(val) {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

// Limpia un string: devuelve null si vacío
function limpiarStr(val) {
  if (val == null) return null
  const s = String(val).trim()
  return s === '' || s.toLowerCase() === 'nan' ? null : s
}

// Deriva sentimiento_categoria desde el score numérico del cliente
// score > 0 → Positivo | score === 0 → Neutro | score < 0 → Negativo | null → No Medido
function mapSentimientoScore(score) {
  if (score === null) return 'No Medido'
  if (score > 0) return 'Positivo'
  if (score < 0) return 'Negativo'
  return 'Neutro'
}

// Mapea una fila cruda del CSV/Excel a la estructura de la tabla `interacciones`
export function mapearFila(raw) {
  const score = limpiarFloat(raw['Sentimiento cliente'])
  return {
    id_llamada:                limpiarStr(raw['Id']),
    fecha_llamada:             parseFecha(raw['Fecha llamada'] ?? raw['Fecha llamada ']),
    agente:                    limpiarStr(raw['Asesor']),
    duracion_minutos:          limpiarFloat(raw['Duración en seg']) != null
                                 ? Math.round((limpiarFloat(raw['Duración en seg']) / 60) * 100) / 100
                                 : null,
    necesidad:                 limpiarStr(raw['Necesidad']),
    motivo_necesidad:          limpiarStr(raw['Motivo necesidad']),
    justificacion_motivo:      limpiarStr(raw['Justificación motivo necesidad']),
    sentimiento_cliente_score: score,
    sentimiento_categoria:     mapSentimientoScore(score),
    fase_inicio:               limpiarStr(raw['Inicio']),
    fase_cierre:               limpiarStr(raw['Cierre']),
  }
}

// Descarta filas que no tengan al menos id_llamada y fecha_llamada válidos
export function filaValida(fila) {
  return !!fila.id_llamada && !!fila.fecha_llamada
}
