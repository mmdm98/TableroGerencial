function formatDuracion(minutos) {
  if (minutos == null || isNaN(minutos)) return '—'
  const m = Math.floor(minutos)
  const s = Math.round((minutos - m) * 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function calcularKpis(data) {
  const total = data.length

  const duracionPromedio =
    total > 0
      ? data.reduce((acc, r) => acc + (r.duracion_minutos ?? 0), 0) / total
      : null

  const medidos = data.filter(r => r.sentimiento_categoria && r.sentimiento_categoria !== 'No Medido')
  const positivoNeutro = medidos.filter(
    r => r.sentimiento_categoria === 'Positivo' || r.sentimiento_categoria === 'Neutro'
  ).length
  const pctSentimiento = medidos.length > 0 ? (positivoNeutro / medidos.length) * 100 : null

  return { total, duracionPromedio, pctSentimiento, totalMedidos: medidos.length }
}

export default function KpiCards({ data }) {
  const { total, duracionPromedio, pctSentimiento, totalMedidos } = calcularKpis(data)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <KpiCard
        label="Volumen de Interacciones"
        value={total.toLocaleString('es-AR')}
        sub="interacciones en el período"
        icon={<IconChat />}
        color="blue"
      />
      <KpiCard
        label="Duración Promedio"
        value={formatDuracion(duracionPromedio)}
        sub="minutos por interacción"
        icon={<IconClock />}
        color="indigo"
      />
      <KpiCard
        label="Sentimiento Positivo + Neutro"
        value={pctSentimiento != null ? `${pctSentimiento.toFixed(1)}%` : '—'}
        sub={totalMedidos > 0 ? `sobre ${totalMedidos.toLocaleString('es-AR')} medidos` : 'sin datos medidos'}
        icon={<IconSmile />}
        color={pctSentimiento != null && pctSentimiento >= 50 ? 'green' : pctSentimiento != null ? 'red' : 'gray'}
      />
    </div>
  )
}

const colorMap = {
  blue:   { icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',   text: 'text-blue-700 dark:text-blue-400' },
  indigo: { icon: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400', text: 'text-indigo-700 dark:text-indigo-400' },
  green:  { icon: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',  text: 'text-green-700 dark:text-green-400' },
  red:    { icon: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',      text: 'text-red-700 dark:text-red-400' },
  gray:   { icon: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',     text: 'text-gray-700 dark:text-gray-400' },
}

function KpiCard({ label, value, sub, icon, color }) {
  const c = colorMap[color]
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4 shadow-sm transition-colors duration-200">
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${c.icon}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-tight mb-1">{label}</p>
        <p className={`text-2xl font-bold ${c.text} tabular-nums`}>{value}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  )
}

function IconChat() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconSmile() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
