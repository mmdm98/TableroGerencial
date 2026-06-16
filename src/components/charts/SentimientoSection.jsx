import ReactApexChart from 'react-apexcharts'
import ChartCard from '../ChartCard'
import {
  getSentimientoDistribucion,
  getSentimientoLineData,
  getHeatmapData,
} from '../../utils/chartData'
import { SENTIMENT_COLORS } from '../../utils/palette'

function baseOpts(dark) {
  return {
    chart: {
      toolbar: { show: false },
      animations: { enabled: false },
      background: 'transparent',
      foreColor: dark ? '#9ca3af' : '#6b7280',
    },
    theme: { mode: dark ? 'dark' : 'light' },
    grid: { borderColor: dark ? '#374151' : '#f3f4f6' },
    noData: { text: 'Sin datos para el período seleccionado', style: { color: '#9ca3af' } },
    tooltip: { theme: dark ? 'dark' : 'light' },
  }
}

const COLOR_MAP = {
  Positivo:    { hex: SENTIMENT_COLORS.Positivo,    text: 'text-emerald-700 dark:text-emerald-400', light: 'bg-emerald-50 dark:bg-emerald-900/30' },
  Neutro:      { hex: SENTIMENT_COLORS.Neutro,      text: 'text-gray-600 dark:text-gray-300',       light: 'bg-gray-100 dark:bg-gray-700/50'      },
  Negativo:    { hex: SENTIMENT_COLORS.Negativo,    text: 'text-red-700 dark:text-red-400',         light: 'bg-red-50 dark:bg-red-900/30'         },
  'No Medido': { hex: SENTIMENT_COLORS['No Medido'], text: 'text-slate-500 dark:text-slate-400',    light: 'bg-slate-50 dark:bg-slate-700/50'     },
}

function BarraApilada({ distribucion }) {
  if (!distribucion || distribucion.every(d => d.count === 0)) {
    return (
      <div className="flex items-center justify-center h-16 text-gray-400 text-sm">
        Sin datos medidos
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Barra visual */}
      <div className="flex w-full h-10 rounded-lg overflow-hidden">
        {distribucion.map(({ label, pct }) =>
          pct > 0 ? (
            <div
              key={label}
              className="flex items-center justify-center transition-all"
              style={{ width: `${pct}%`, backgroundColor: COLOR_MAP[label]?.hex ?? '#d1d5db' }}
              title={`${label}: ${pct}%`}
            >
              {pct >= 8 && (
                <span className="text-white text-xs font-semibold drop-shadow">{pct}%</span>
              )}
            </div>
          ) : null
        )}
      </div>

      {/* Leyenda con detalle */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {distribucion.map(({ label, count, pct }) => {
          const c = COLOR_MAP[label] ?? COLOR_MAP['No Medido']
          return (
            <div key={label} className={`${c.light} rounded-lg px-3 py-2 flex items-center gap-2`}>
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.hex }} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{label}</p>
                <p className={`text-lg font-bold ${c.text} tabular-nums`}>{pct}%</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{count.toLocaleString('es-AR')} int.</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function SentimientoSection({ data, dark }) {
  const distribucion = getSentimientoDistribucion(data)
  const { series: seriesLinea, categories } = getSentimientoLineData(data)
  const seriesHeatmap = getHeatmapData(data)

  const base = baseOpts(dark)

  const lineaOpts = {
    ...base,
    chart: { ...base.chart, type: 'area' },
    colors: [SENTIMENT_COLORS.Positivo],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
    stroke: { curve: 'smooth', width: 2.5 },
    markers: { size: categories.length <= 7 ? 4 : 0, colors: [SENTIMENT_COLORS.Positivo] },
    xaxis: {
      categories,
      labels: { rotate: -45, style: { fontSize: '10px' } },
      tickAmount: Math.min(categories.length, 15),
    },
    yaxis: {
      min: 0,
      max: 100,
      labels: { formatter: v => v + '%', style: { fontSize: '11px' } },
    },
    tooltip: { ...base.tooltip, y: { formatter: v => v + '%' } },
    legend: { show: false },
  }

  const heatmapOpts = {
    ...base,
    chart: { ...base.chart, type: 'heatmap' },
    dataLabels: {
      enabled: true,
      formatter: v => (v > 0 ? v + '%' : ''),
      style: { fontSize: '12px', fontWeight: '600', colors: [dark ? '#f9fafb' : '#1f2937'] },
    },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.6,
        radius: 4,
        colorScale: {
          ranges: [
            { from: 0,  to: 0,  color: dark ? '#1f2937' : '#f9fafb', name: '0%' },
            { from: 1,  to: 10, color: '#bfdbfe', name: '1–10%' },
            { from: 11, to: 25, color: '#60a5fa', name: '11–25%' },
            { from: 26, to: 50, color: '#2563eb', name: '26–50%' },
            { from: 51, to: 100, color: '#1e3a8a', name: '>50%' },
          ],
        },
      },
    },
    xaxis: { labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { style: { fontSize: '11px' } } },
    tooltip: { ...base.tooltip, y: { formatter: v => v + '% de las interacciones' } },
  }

  return (
    <div className="space-y-4">
      <ChartCard
        title="Distribución Global de Sentimiento"
        subtitle="Volumen total clasificado por categoría"
      >
        <BarraApilada distribucion={distribucion} />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Evolución Diaria — % Positivo"
          subtitle="Porcentaje de interacciones clasificadas como Positivas"
        >
          <ReactApexChart type="area" series={seriesLinea} options={lineaOpts} height={280} />
        </ChartCard>

        <ChartCard
          title="Mapa de Mutación de Sentimiento"
          subtitle="De estado al Inicio → estado al Cierre (% del total con dato)"
        >
          <ReactApexChart type="heatmap" series={seriesHeatmap} options={heatmapOpts} height={280} />
        </ChartCard>
      </div>
    </div>
  )
}
