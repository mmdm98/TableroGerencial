import ReactApexChart from 'react-apexcharts'
import { ResponsiveSankey } from '@nivo/sankey'
import ChartCard from '../ChartCard'
import {
  getSentimientoDistribucion,
  getSentimientoLineData,
  getSankeyData,
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
  Positivo:    { hex: SENTIMENT_COLORS.Positivo,     text: 'text-emerald-700 dark:text-emerald-400', light: 'bg-emerald-50 dark:bg-emerald-900/30' },
  Neutro:      { hex: SENTIMENT_COLORS.Neutro,       text: 'text-gray-600 dark:text-gray-300',       light: 'bg-gray-100 dark:bg-gray-700/50'      },
  Negativo:    { hex: SENTIMENT_COLORS.Negativo,     text: 'text-red-700 dark:text-red-400',         light: 'bg-red-50 dark:bg-red-900/30'         },
  'No Medido': { hex: SENTIMENT_COLORS['No Medido'], text: 'text-slate-500 dark:text-slate-400',     light: 'bg-slate-50 dark:bg-slate-700/50'     },
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

function SankeyLinkTooltip({ link }) {
  const isDark = document.documentElement.classList.contains('dark')
  const [sourcePrefix, sourceName] = link.source.id.split(': ')
  const targetName = link.target.id.split(': ')[1]
  // Use sourceLinks sum (outgoing) for % — correct for both source and intermediate nodes
  const sourceOutgoing = link.source.sourceLinks?.reduce((s, l) => s + l.value, 0) ?? link.source.value
  const pct = sourceOutgoing > 0 ? ((link.value / sourceOutgoing) * 100).toFixed(1) : '0.0'
  const etapaLabel = sourcePrefix === 'Inicio' ? 'inicio' : 'desarrollo'
  return (
    <div style={{
      background: isDark ? '#1f2937' : '#ffffff',
      color: isDark ? '#f3f4f6' : '#1f2937',
      padding: '8px 12px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      fontSize: '12px',
      lineHeight: 1.7,
      border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
      whiteSpace: 'nowrap',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>
        {sourceName} → {targetName}
      </div>
      <div style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
        {link.value.toLocaleString('es-AR')} llamadas · {pct}% del {etapaLabel} {sourceName}
      </div>
    </div>
  )
}

export default function SentimientoSection({ data, dark }) {
  const distribucion = getSentimientoDistribucion(data)
  const { series: seriesLinea, categories } = getSentimientoLineData(data)
  const sankeyData = getSankeyData(data)

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

  const labelFill = dark ? '#9ca3af' : '#374151'

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
          title="Transición de Sentimiento"
          subtitle="Flujo del estado al Inicio → Desarrollo → Cierre de la llamada"
        >
          {sankeyData.links.length > 0 ? (
            <div style={{ height: 320 }}>
              <ResponsiveSankey
                data={sankeyData}
                margin={{ top: 8, right: 110, bottom: 8, left: 110 }}
                align="justify"
                colors={(node) => SENTIMENT_COLORS[node.id.split(': ')[1]] ?? '#9ca3af'}
                nodeOpacity={1}
                nodeThickness={20}
                nodeInnerPadding={3}
                nodeSpacing={20}
                nodeBorderWidth={0}
                linkOpacity={0.4}
                linkHoverOpacity={0.75}
                linkHoverOthersOpacity={0.1}
                enableLinkGradient={true}
                enableLabels={true}
                label={(node) => node.id.split(': ')[1]}
                labelPosition="outside"
                labelOrientation="horizontal"
                labelPadding={14}
                labelTextColor={labelFill}
                animate={false}
                isInteractive={true}
                linkTooltip={SankeyLinkTooltip}
                theme={{
                  labels: { text: { fontSize: 11, fill: labelFill } },
                  tooltip: {
                    container: {
                      background: dark ? '#1f2937' : '#ffffff',
                      color: dark ? '#f3f4f6' : '#1f2937',
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm" style={{ height: 320 }}>
              Sin datos de transición para el período seleccionado
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
