import ReactApexChart from 'react-apexcharts'
import ChartCard from '../ChartCard'
import { getMotivosLineData, getMotivosPieData, getTop5Justificaciones, getMotivosVelocidadData, labelFechaConDia } from '../../utils/chartData'
import { PALETTE } from '../../utils/palette'

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

export default function MotivosSection({ data, dark, selectedMotivo, onSelectMotivo, selectedJustificacion, onSelectJustificacion }) {
  const { series: allSeries, categories } = getMotivosLineData(data)
  const { series: seriesPie, labels } = getMotivosPieData(data)

  // Bar chart uses data further filtered by selected motivo for contextual top 5
  const dataForBar = selectedMotivo
    ? data.filter(r => r.motivo_necesidad === selectedMotivo)
    : data
  const { series: seriesBar, categories: labelsBar } = getTop5Justificaciones(dataForBar)

  // Stable color per motivo category
  const catColors = Object.fromEntries(labels.map((l, i) => [l, PALETTE[i % PALETTE.length]]))

  const seriesLinea = selectedMotivo
    ? allSeries.filter(s => s.name === selectedMotivo)
    : allSeries
  const lineColors = seriesLinea.map(s => catColors[s.name] ?? PALETTE[0])
  const pieColors  = labels.map(l => catColors[l] ?? PALETTE[0])

  const base = baseOpts(dark)

  const lineaOpts = {
    ...base,
    chart: {
      ...base.chart,
      type: 'line',
      events: {
        legendClick: (_ctx, seriesIndex) => {
          const name = seriesLinea[seriesIndex]?.name
          if (name) onSelectMotivo(name)
        },
        dataPointSelection: (_e, _ctx, config) => {
          const name = seriesLinea[config.seriesIndex]?.name
          if (name) onSelectMotivo(name)
        },
      },
    },
    colors: lineColors,
    stroke: { curve: 'smooth', width: 2 },
    markers: { size: categories.length <= 7 ? 3 : 0 },
    xaxis: {
      categories,
      labels: { rotate: 0, formatter: labelFechaConDia, style: { fontSize: '10px' } },
      tickAmount: Math.min(categories.length, 15),
    },
    yaxis: {
      min: 0,
      labels: { formatter: v => Math.round(v).toLocaleString('es-AR'), style: { fontSize: '11px' } },
    },
    tooltip: { ...base.tooltip, y: { formatter: v => `${Math.round(v).toLocaleString('es-AR')} interacciones` } },
    legend: {
      position: 'top',
      fontSize: '11px',
      itemMargin: { horizontal: 8 },
      onItemClick: { toggleDataSeries: false },
    },
  }

  const pieOpts = {
    ...base,
    chart: {
      ...base.chart,
      type: 'donut',
      events: {
        dataPointSelection: (_e, _ctx, { dataPointIndex }) => {
          const label = labels[dataPointIndex]
          if (label) onSelectMotivo(label)
        },
      },
    },
    colors: pieColors,
    labels,
    legend: { position: 'bottom', fontSize: '11px' },
    tooltip: { ...base.tooltip, y: { formatter: v => `${v} interacciones` } },
    dataLabels: { formatter: v => v.toFixed(1) + '%' },
    plotOptions: { pie: { donut: { size: '60%' } } },
  }

  const { series: seriesVel, categories: catVel } = getMotivosVelocidadData(data)
  const velColors = seriesVel.map(s => catColors[s.name] ?? PALETTE[0])

  const velocidadOpts = {
    ...base,
    chart: { ...base.chart, type: 'bar' },
    colors: velColors,
    plotOptions: {
      bar: { horizontal: false, borderRadius: 2, columnWidth: '70%' },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: catVel,
      labels: { rotate: 0, formatter: labelFechaConDia, style: { fontSize: '10px' } },
      tickAmount: Math.min(catVel.length, 15),
    },
    yaxis: {
      labels: { formatter: v => Math.round(v).toLocaleString('es-AR'), style: { fontSize: '11px' } },
    },
    tooltip: {
      ...base.tooltip,
      y: { formatter: v => `${v > 0 ? '+' : ''}${Math.round(v).toLocaleString('es-AR')} interacciones` },
    },
    legend: {
      position: 'top',
      fontSize: '11px',
      itemMargin: { horizontal: 8 },
      onItemClick: { toggleDataSeries: false },
    },
  }

  // Per-bar colors: highlight selected, dim others
  const barColors = labelsBar.map(l => {
    if (!selectedJustificacion) return PALETTE[0]
    return l === selectedJustificacion ? PALETTE[0] : (dark ? '#374151' : '#e5e7eb')
  })

  const barOpts = {
    ...base,
    chart: {
      ...base.chart,
      type: 'bar',
      events: {
        dataPointSelection: (_e, _ctx, { dataPointIndex }) => {
          const label = labelsBar[dataPointIndex]
          if (label) onSelectJustificacion(label)
        },
      },
    },
    colors: barColors,
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        distributed: true,
        dataLabels: { position: 'top' },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: v => v + '%',
      offsetX: 8,
      style: { fontSize: '11px', colors: [dark ? '#d1d5db' : '#374151'] },
    },
    xaxis: {
      categories: labelsBar,
      labels: { formatter: v => v + '%', style: { fontSize: '11px' } },
      max: Math.ceil((Math.max(...(seriesBar[0]?.data ?? [0])) + 5) / 5) * 5,
    },
    yaxis: {
      labels: { style: { fontSize: '11px' }, maxWidth: 200 },
    },
    legend: { show: false },
    tooltip: { ...base.tooltip, x: { show: true } },
  }

  const subtitle = selectedMotivo
    ? `Mostrando: ${selectedMotivo} · Clic para deseleccionar`
    : 'Clic en leyenda o en el donut para filtrar el sentimiento'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Evolución Diaria por Motivo"
          subtitle={subtitle}
          className="lg:col-span-2"
        >
          <ReactApexChart
            key={`mot-line-${selectedMotivo ?? 'all'}-${dark}`}
            type="line" series={seriesLinea} options={lineaOpts} height={300}
          />
        </ChartCard>

        <ChartCard
          title="Distribución por Motivo"
          subtitle="% total en el período · Clic en un sector para filtrar"
        >
          <ReactApexChart
            key={`mot-pie-${dark}`}
            type="donut" series={seriesPie} options={pieOpts} height={300}
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Top 5 Justificaciones"
        subtitle={selectedJustificacion ? `Mostrando: ${selectedJustificacion} · Clic para deseleccionar` : 'Clic en una barra para filtrar el sentimiento'}
      >
        <ReactApexChart
          key={`mot-bar-${selectedMotivo ?? 'all'}-${selectedJustificacion ?? 'all'}-${dark}`}
          type="bar" series={seriesBar} options={barOpts} height={240}
        />
      </ChartCard>

      <ChartCard
        title="Variación Diaria por Motivo"
        subtitle="Cambio en volumen respecto al día anterior · umbral mínimo: ±20 interacciones"
      >
        {seriesVel.length > 0 ? (
          <ReactApexChart
            key={`mot-vel-${dark}`}
            type="bar" series={seriesVel} options={velocidadOpts} height={280}
          />
        ) : (
          <div className="flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm" style={{ height: 280 }}>
            Ningún motivo supera el umbral de ±20 interacciones diarias
          </div>
        )}
      </ChartCard>
    </div>
  )
}
