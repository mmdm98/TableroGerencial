import ReactApexChart from 'react-apexcharts'
import ChartCard from '../ChartCard'
import { getNecesidadLineData, getNecesidadPieData } from '../../utils/chartData'
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

export default function NecesidadSection({ data, dark, selectedNecesidad, onSelectNecesidad }) {
  const { series: allSeries, categories } = getNecesidadLineData(data)
  const { series: seriesPie, labels } = getNecesidadPieData(data)

  // Stable color per category: sorted-alphabetical position → palette index
  const catColors = Object.fromEntries(labels.map((l, i) => [l, PALETTE[i % PALETTE.length]]))

  const seriesLinea = selectedNecesidad
    ? allSeries.filter(s => s.name === selectedNecesidad)
    : allSeries
  const lineColors  = seriesLinea.map(s => catColors[s.name] ?? PALETTE[0])
  const pieColors   = labels.map(l => catColors[l] ?? PALETTE[0])

  const base = baseOpts(dark)

  const lineaOpts = {
    ...base,
    chart: {
      ...base.chart,
      type: 'line',
      events: {
        legendClick: (_ctx, seriesIndex) => {
          const name = seriesLinea[seriesIndex]?.name
          if (name) onSelectNecesidad(name)
        },
        dataPointSelection: (_e, _ctx, config) => {
          const name = seriesLinea[config.seriesIndex]?.name
          if (name) onSelectNecesidad(name)
        },
      },
    },
    colors: lineColors,
    stroke: { curve: 'smooth', width: 2.5 },
    markers: { size: categories.length <= 7 ? 4 : 0 },
    xaxis: {
      categories,
      labels: { rotate: -45, style: { fontSize: '10px' } },
      tickAmount: Math.min(categories.length, 15),
    },
    yaxis: {
      min: 0,
      labels: { formatter: v => Math.round(v).toLocaleString('es-AR'), style: { fontSize: '11px' } },
    },
    tooltip: { ...base.tooltip, y: { formatter: v => `${Math.round(v).toLocaleString('es-AR')} interacciones` } },
    legend: {
      position: 'top',
      fontSize: '12px',
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
          if (label) onSelectNecesidad(label)
        },
      },
    },
    colors: pieColors,
    labels,
    legend: { position: 'bottom', fontSize: '12px' },
    tooltip: { ...base.tooltip, y: { formatter: v => `${v} interacciones` } },
    dataLabels: { formatter: v => v.toFixed(1) + '%' },
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
          labels: {
            show: true,
            total: { show: true, label: 'Total', formatter: () => data.length },
          },
        },
      },
    },
  }

  const subtitle = selectedNecesidad
    ? `Mostrando: ${selectedNecesidad} · Clic para deseleccionar`
    : 'Clic en leyenda o en el donut para filtrar el dashboard'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <ChartCard
        title="Evolución Diaria por Necesidad"
        subtitle={subtitle}
        className="lg:col-span-2"
      >
        <ReactApexChart
          key={`nec-line-${selectedNecesidad ?? 'all'}-${dark}`}
          type="line" series={seriesLinea} options={lineaOpts} height={300}
        />
      </ChartCard>

      <ChartCard
        title="Distribución Acumulada"
        subtitle="% total en el período · Clic en un sector para filtrar"
      >
        <ReactApexChart
          key={`nec-pie-${dark}`}
          type="donut" series={seriesPie} options={pieOpts} height={300}
        />
      </ChartCard>
    </div>
  )
}
