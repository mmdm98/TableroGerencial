import { useState, useMemo } from 'react'
import ReactApexChart from 'react-apexcharts'
import ChartCard from './ChartCard'
import { useComparacion } from '../hooks/useComparacion'
import { calcKpis, getNecesidades, getTopMotivos } from '../utils/comparacionData'
import { SENTIMENT_COLORS } from '../utils/palette'

// ─── Utilidades de rango ─────────────────────────────────────────────────────

function isoDate(offset) {
  const d = new Date(); d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

function isoMonth(offset) {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function semanaARango(inicio) {
  const fin = new Date(inicio + 'T12:00:00'); fin.setDate(fin.getDate() + 6)
  return { desde: inicio, hasta: fin.toISOString().slice(0, 10) }
}

function mesARango(ym) {
  const [y, m] = ym.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return { desde: `${ym}-01`, hasta: `${ym}-${String(lastDay).padStart(2, '0')}` }
}

const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio',
                  'julio','agosto','septiembre','octubre','noviembre','diciembre']

function labelSemana(desde, hasta) {
  const d = new Date(desde + 'T12:00:00')
  const h = new Date(hasta + 'T12:00:00')
  return `${d.getDate()}/${d.getMonth()+1} – ${h.getDate()}/${h.getMonth()+1}/${h.getFullYear()}`
}

function labelMes(ym) {
  const [y, m] = ym.split('-').map(Number)
  const n = MESES_ES[m - 1]
  return `${n.charAt(0).toUpperCase() + n.slice(1)} ${y}`
}

function formatDuracion(min) {
  if (min == null || isNaN(min)) return '—'
  const m = Math.floor(min)
  const s = Math.round((min - m) * 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Delta badge ─────────────────────────────────────────────────────────────

function DeltaBadge({ a, b, type = 'rel', lowerIsBetter = false }) {
  if (a == null || b == null) return <span className="text-gray-400 dark:text-gray-500">—</span>
  let value, unit
  if (type === 'rel') {
    if (a === 0) return <span className="text-gray-400 dark:text-gray-500">—</span>
    value = (b - a) / a * 100; unit = '%'
  } else {
    value = b - a; unit = 'pp'
  }
  const abs = Math.abs(value)
  const arrow = abs < 0.05 ? '=' : value > 0 ? '▲' : '▼'
  const isGood = abs < 0.05 ? null : (value > 0) !== lowerIsBetter
  const color = isGood === null
    ? 'text-gray-400 dark:text-gray-500'
    : isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
  return (
    <span className={`font-semibold tabular-nums ${color}`}>
      {arrow} {value > 0 ? '+' : ''}{value.toFixed(1)}{unit}
    </span>
  )
}

// ─── KPI table ───────────────────────────────────────────────────────────────

const KPI_DEFS = [
  { label: 'Volumen de interacciones', getVal: k => k.total,        fmt: v => v.toLocaleString('es-AR'),          type: 'rel', lowerIsBetter: false },
  { label: 'Duración promedio',        getVal: k => k.duracionProm, fmt: v => formatDuracion(v),                  type: 'rel', lowerIsBetter: true  },
  { label: 'Sent. Pos+Neutro',         getVal: k => k.pctPosNeutro, fmt: v => v != null ? `${v.toFixed(1)}%` : '—', type: 'pp',  lowerIsBetter: false },
  { label: '% Positivo',               getVal: k => k.pctPositivo,  fmt: v => v != null ? `${v.toFixed(1)}%` : '—', type: 'pp',  lowerIsBetter: false },
  { label: '% Negativo',               getVal: k => k.pctNegativo,  fmt: v => v != null ? `${v.toFixed(1)}%` : '—', type: 'pp',  lowerIsBetter: true  },
]

function KpiTable({ kpisA, kpisB, labelA, labelB }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-700">
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide w-1/3">Indicador</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-blue-500 uppercase tracking-wide w-1/4">{labelA}</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-violet-500 uppercase tracking-wide w-1/4">{labelB}</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide w-1/6">Variación</th>
          </tr>
        </thead>
        <tbody>
          {KPI_DEFS.map(({ label, getVal, fmt, type, lowerIsBetter }) => {
            const a = getVal(kpisA), b = getVal(kpisB)
            return (
              <tr key={label} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300 font-medium">{label}</td>
                <td className="px-5 py-3.5 text-right font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{fmt(a)}</td>
                <td className="px-5 py-3.5 text-right font-semibold text-violet-600 dark:text-violet-400 tabular-nums">{fmt(b)}</td>
                <td className="px-5 py-3.5 text-right">
                  <DeltaBadge a={a} b={b} type={type} lowerIsBetter={lowerIsBetter} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Sentiment chart ─────────────────────────────────────────────────────────

const SENT_LABELS = ['Positivo', 'Negativo']

function SentimientoChart({ kpisA, kpisB, labelA, labelB, dark }) {
  const pct = (kpis, label) => kpis.total > 0
    ? +((kpis.sentCount[label] / kpis.total) * 100).toFixed(1)
    : 0

  const opts = {
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent', animations: { enabled: false } },
    theme: { mode: dark ? 'dark' : 'light' },
    plotOptions: { bar: { horizontal: false, columnWidth: '55%', borderRadius: 3 } },
    dataLabels: { enabled: false },
    xaxis: { categories: SENT_LABELS, labels: { style: { fontSize: '11px' } } },
    yaxis: { max: 100, labels: { formatter: v => v + '%', style: { fontSize: '11px' } } },
    colors: ['#3b82f6', '#8b5cf6'],
    tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: v => v + '%' } },
    legend: { position: 'top', fontSize: '12px' },
    grid: { borderColor: dark ? '#374151' : '#f3f4f6' },
    noData: { text: 'Sin datos', style: { color: '#9ca3af' } },
  }

  const series = [
    { name: labelA, data: SENT_LABELS.map(l => pct(kpisA, l)) },
    { name: labelB, data: SENT_LABELS.map(l => pct(kpisB, l)) },
  ]

  return (
    <ChartCard title="Distribución de Sentimiento" subtitle="% por categoría — comparación de períodos">
      <ReactApexChart
        key={`sent-comp-${dark}`}
        type="bar" series={series} options={opts} height={260}
      />
    </ChartCard>
  )
}

// ─── Necesidades chart ───────────────────────────────────────────────────────

function NecesidadesChart({ necesidades, totalA, totalB, labelA, labelB, dark }) {
  if (necesidades.length === 0) {
    return (
      <ChartCard title="Distribución por Necesidad" subtitle="% Técnico y Comercial por período">
        <div className="flex items-center justify-center h-[260px] text-gray-400 dark:text-gray-500 text-sm">
          Sin datos de necesidades
        </div>
      </ChartCard>
    )
  }

  const categories = necesidades.map(n => n.label)
  const pctA = necesidades.map(n => totalA > 0 ? +((n.a / totalA) * 100).toFixed(1) : 0)
  const pctB = necesidades.map(n => totalB > 0 ? +((n.b / totalB) * 100).toFixed(1) : 0)

  const opts = {
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent', animations: { enabled: false } },
    theme: { mode: dark ? 'dark' : 'light' },
    plotOptions: { bar: { horizontal: true, barHeight: '60%', borderRadius: 3 } },
    dataLabels: { enabled: true, formatter: v => v > 0 ? v + '%' : '', style: { fontSize: '11px' } },
    xaxis: { categories, labels: { style: { fontSize: '12px' } } },
    yaxis: { labels: { style: { fontSize: '11px' } } },
    colors: ['#3b82f6', '#8b5cf6'],
    tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: v => v + '%' } },
    legend: { position: 'top', fontSize: '12px' },
    grid: { borderColor: dark ? '#374151' : '#f3f4f6' },
    noData: { text: 'Sin datos', style: { color: '#9ca3af' } },
  }

  const series = [
    { name: labelA, data: pctA },
    { name: labelB, data: pctB },
  ]

  return (
    <ChartCard title="Distribución por Necesidad" subtitle="% sobre el total de cada período">
      <ReactApexChart
        key={`nec-comp-${dark}`}
        type="bar" series={series} options={opts} height={260}
      />
    </ChartCard>
  )
}

// ─── Motivos chart ────────────────────────────────────────────────────────────

function MotivosChart({ topMotivos, totalA, totalB, labelA, labelB, dark }) {
  if (topMotivos.length === 0) {
    return (
      <ChartCard title="Top 5 Motivos" subtitle="% sobre el total de cada período">
        <div className="flex items-center justify-center h-[260px] text-gray-400 dark:text-gray-500 text-sm">
          Sin datos de motivos
        </div>
      </ChartCard>
    )
  }

  const categories = topMotivos.map(m => m.label)
  const pctA = topMotivos.map(m => totalA > 0 ? +((m.a / totalA) * 100).toFixed(1) : 0)
  const pctB = topMotivos.map(m => totalB > 0 ? +((m.b / totalB) * 100).toFixed(1) : 0)

  const opts = {
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent', animations: { enabled: false } },
    theme: { mode: dark ? 'dark' : 'light' },
    plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 3 } },
    dataLabels: { enabled: true, formatter: v => v > 0 ? v + '%' : '', style: { fontSize: '11px' } },
    xaxis: { categories, labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { style: { fontSize: '11px' } } },
    colors: ['#3b82f6', '#8b5cf6'],
    tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: v => v + '%' } },
    legend: { position: 'top', fontSize: '12px' },
    grid: { borderColor: dark ? '#374151' : '#f3f4f6' },
    noData: { text: 'Sin datos', style: { color: '#9ca3af' } },
  }

  const series = [
    { name: labelA, data: pctA },
    { name: labelB, data: pctB },
  ]

  return (
    <ChartCard title="Top 5 Motivos" subtitle="% sobre el total de cada período">
      <ReactApexChart
        key={`mot-comp-${dark}`}
        type="bar" series={series} options={opts} height={260}
      />
    </ChartCard>
  )
}

// ─── Period selectors ────────────────────────────────────────────────────────

function inputClass() {
  return 'text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors'
}

function PeriodoSelectors({ modo, semA, setSemA, semB, setSemB, mesA, setMesA, mesB, setMesB }) {
  const labelColorA = 'text-blue-600 dark:text-blue-400 font-semibold'
  const labelColorB = 'text-violet-600 dark:text-violet-400 font-semibold'

  if (modo === 'semanas') {
    return (
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <span className={`text-xs ${labelColorA}`}>Período A — semana del</span>
          <input type="date" value={semA} onChange={e => setSemA(e.target.value)} className={inputClass()} />
        </div>
        <div className="text-gray-300 dark:text-gray-600 text-lg font-light">vs</div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${labelColorB}`}>Período B — semana del</span>
          <input type="date" value={semB} onChange={e => setSemB(e.target.value)} className={inputClass()} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex items-center gap-2">
        <span className={`text-xs ${labelColorA}`}>Período A</span>
        <input type="month" value={mesA} onChange={e => setMesA(e.target.value)} className={inputClass()} />
      </div>
      <div className="text-gray-300 dark:text-gray-600 text-lg font-light">vs</div>
      <div className="flex items-center gap-2">
        <span className={`text-xs ${labelColorB}`}>Período B</span>
        <input type="month" value={mesB} onChange={e => setMesB(e.target.value)} className={inputClass()} />
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ComparacionTab({ dark }) {
  const [modo, setModo] = useState('meses')

  // Semanas defaults: últimas 2 semanas completas
  const [semA, setSemA] = useState(() => isoDate(-14))
  const [semB, setSemB] = useState(() => isoDate(-7))

  // Meses defaults: mes anterior y mes actual
  const [mesA, setMesA] = useState(() => isoMonth(-1))
  const [mesB, setMesB] = useState(() => isoMonth(0))

  const rangoA = modo === 'semanas' ? semanaARango(semA) : mesARango(mesA)
  const rangoB = modo === 'semanas' ? semanaARango(semB) : mesARango(mesB)

  const { dataA, dataB, loading, error } = useComparacion(rangoA, rangoB)

  const kpisA = useMemo(() => calcKpis(dataA), [dataA])
  const kpisB = useMemo(() => calcKpis(dataB), [dataB])
  const necesidades = useMemo(() => getNecesidades(dataA, dataB), [dataA, dataB])
  const topMotivos = useMemo(() => getTopMotivos(dataA, dataB), [dataA, dataB])

  const labelA = modo === 'semanas' ? labelSemana(rangoA.desde, rangoA.hasta) : labelMes(mesA)
  const labelB = modo === 'semanas' ? labelSemana(rangoB.desde, rangoB.hasta) : labelMes(mesB)

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm px-5 py-4 flex flex-wrap items-center gap-5">
        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex-shrink-0">
          {['meses', 'semanas'].map(m => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors capitalize ${
                modo === m
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <PeriodoSelectors
          modo={modo}
          semA={semA} setSemA={setSemA} semB={semB} setSemB={setSemB}
          mesA={mesA} setMesA={setMesA} mesB={mesB} setMesB={setMesB}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading */}
      {loading && <ComparacionSkeleton />}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Period labels + volume summary */}
          <div className="grid grid-cols-2 gap-4">
            <PeriodoHeader label={labelA} count={kpisA.total} color="blue" />
            <PeriodoHeader label={labelB} count={kpisB.total} color="violet" />
          </div>

          <KpiTable kpisA={kpisA} kpisB={kpisB} labelA={labelA} labelB={labelB} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SentimientoChart
              kpisA={kpisA} kpisB={kpisB}
              labelA={labelA} labelB={labelB}
              dark={dark}
            />
            <NecesidadesChart
              necesidades={necesidades}
              totalA={kpisA.total} totalB={kpisB.total}
              labelA={labelA} labelB={labelB}
              dark={dark}
            />
          </div>
          <MotivosChart
            topMotivos={topMotivos}
            totalA={kpisA.total} totalB={kpisB.total}
            labelA={labelA} labelB={labelB}
            dark={dark}
          />
        </>
      )}
    </div>
  )
}

// ─── Helpers UI ──────────────────────────────────────────────────────────────

function PeriodoHeader({ label, count, color }) {
  const colors = {
    blue:   'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20',
    violet: 'border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20',
  }
  const textColors = {
    blue:   'text-blue-700 dark:text-blue-300',
    violet: 'text-violet-700 dark:text-violet-300',
  }
  return (
    <div className={`rounded-xl border px-5 py-3.5 ${colors[color]}`}>
      <p className={`text-sm font-semibold ${textColors[color]}`}>{label}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 tabular-nums mt-0.5">
        {count.toLocaleString('es-AR')}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500">interacciones</p>
    </div>
  )
}

function ComparacionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 gap-4">
        <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
      <div className="h-52 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-72 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        <div className="h-72 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
    </div>
  )
}
