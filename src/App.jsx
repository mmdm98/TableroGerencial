import { useState, useMemo } from 'react'
import FilterBar from './components/FilterBar'
import KpiCards from './components/KpiCards'
import NecesidadSection from './components/charts/NecesidadSection'
import MotivosSection from './components/charts/MotivosSection'
import SentimientoSection from './components/charts/SentimientoSection'
import ComparacionTab from './components/ComparacionTab'
import Uploader from './components/Uploader'
import LoginForm from './components/LoginForm'
import { useFilters } from './hooks/useFilters'
import { useInteracciones } from './hooks/useInteracciones'
import { useDarkMode } from './hooks/useDarkMode'
import { useAuth } from './hooks/useAuth'
import { exportDashboardPdf } from './utils/exportPdf'

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [dark, toggleDark] = useDarkMode()
  const { session, loading: authLoading, signIn, signOut } = useAuth()
  const filters = useFilters()
  const { data, loading, error } = useInteracciones(filters)

  // ── Cross-filter state ────────────────────────────────────────────────────
  const [xFilter, setXFilter] = useState({ necesidad: null, motivo: null, justificacion: null })

  const filteredByNecesidad = useMemo(() =>
    xFilter.necesidad ? data.filter(r => r.necesidad === xFilter.necesidad) : data
  , [data, xFilter.necesidad])

  const filteredByMotivo = useMemo(() =>
    xFilter.motivo
      ? filteredByNecesidad.filter(r => r.motivo_necesidad === xFilter.motivo)
      : filteredByNecesidad
  , [filteredByNecesidad, xFilter.motivo])

  const fullyFiltered = useMemo(() =>
    xFilter.justificacion
      ? filteredByMotivo.filter(r => r.justificacion_motivo === xFilter.justificacion)
      : filteredByMotivo
  , [filteredByMotivo, xFilter.justificacion])

  function selectNecesidad(val) {
    setXFilter(prev => ({
      necesidad: val === prev.necesidad ? null : val,
      motivo: null,
      justificacion: null,
    }))
  }
  function selectMotivo(val) {
    setXFilter(prev => ({
      ...prev,
      motivo: val === prev.motivo ? null : val,
      justificacion: null,
    }))
  }
  function selectJustificacion(val) {
    setXFilter(prev => ({ ...prev, justificacion: val === prev.justificacion ? null : val }))
  }
  function clearXFilter() { setXFilter({ necesidad: null, motivo: null, justificacion: null }) }

  const hasXFilter = !!(xFilter.necesidad || xFilter.motivo || xFilter.justificacion)

  const [exporting, setExporting] = useState(false)
  async function handleExport() {
    setExporting(true)
    try { await exportDashboardPdf() }
    finally { setExporting(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <FilterBar
        tab={tab} setTab={setTab}
        dark={dark} toggleDark={toggleDark}
        fechaDesde={filters.fechaDesde} setFechaDesde={filters.setFechaDesde}
        fechaHasta={filters.fechaHasta} setFechaHasta={filters.setFechaHasta}
        agentes={filters.agentes} setAgentes={filters.setAgentes}
        necesidades={filters.necesidades} setNecesidades={filters.setNecesidades}
        onExport={handleExport} exporting={exporting}
      />

      <main className="max-w-screen-2xl mx-auto px-4 py-6">
        {tab === 'comparar' && (
          <ComparacionTab dark={dark} />
        )}

        {tab === 'uploader' && (
          authLoading ? null : !session ? (
            <LoginForm onLogin={signIn} />
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <SectionTitle>Cargar reporte mensual</SectionTitle>
                <div className="flex items-center gap-2 pb-3">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {session.user.email}
                  </span>
                  <button
                    onClick={signOut}
                    className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 underline transition-colors"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
              <Uploader />
            </div>
          )
        )}

        {tab === 'dashboard' && (
          <div className="space-y-8">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
                <strong>Error al conectar con Supabase:</strong> {error}
              </div>
            )}

            {loading && <Skeleton />}

            {!loading && !error && (
              <div id="dashboard-content">
                {hasXFilter && (
                  <ActiveFilters
                    xFilter={xFilter}
                    onClearNecesidad={() => selectNecesidad(xFilter.necesidad)}
                    onClearMotivo={() => selectMotivo(xFilter.motivo)}
                    onClearJustificacion={() => selectJustificacion(xFilter.justificacion)}
                    onClearAll={clearXFilter}
                    total={data.length}
                    filtered={fullyFiltered.length}
                  />
                )}

                <section>
                  <SectionTitle>KPIs Principales</SectionTitle>
                  <KpiCards data={fullyFiltered} />
                </section>

                <section>
                  <SectionTitle>Segmentación por Necesidad</SectionTitle>
                  <NecesidadSection
                    data={data}
                    dark={dark}
                    selectedNecesidad={xFilter.necesidad}
                    onSelectNecesidad={selectNecesidad}
                  />
                </section>

                <section>
                  <SectionTitle>Análisis de Motivos y Justificaciones</SectionTitle>
                  <MotivosSection
                    data={filteredByNecesidad}
                    dark={dark}
                    selectedMotivo={xFilter.motivo}
                    onSelectMotivo={selectMotivo}
                    selectedJustificacion={xFilter.justificacion}
                    onSelectJustificacion={selectJustificacion}
                  />
                </section>

                <section>
                  <SectionTitle>Análisis de Sentimiento (EVA)</SectionTitle>
                  <SentimientoSection data={fullyFiltered} dark={dark} />
                </section>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Active cross-filter indicator ──────────────────────────────────────────

function ActiveFilters({ xFilter, onClearNecesidad, onClearMotivo, onClearJustificacion, onClearAll, total, filtered }) {
  const pct = total > 0 ? Math.round((filtered / total) * 100) : 0
  return (
    <div className="flex flex-wrap items-center gap-2 -mt-4 mb-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Filtro activo:</span>
      {xFilter.necesidad && (
        <FilterChip color="blue" label={`Necesidad: ${xFilter.necesidad}`} onRemove={onClearNecesidad} />
      )}
      {xFilter.motivo && (
        <FilterChip color="violet" label={`Motivo: ${xFilter.motivo}`} onRemove={onClearMotivo} />
      )}
      {xFilter.justificacion && (
        <FilterChip color="amber" label={`Justificación: ${xFilter.justificacion}`} onRemove={onClearJustificacion} />
      )}
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {filtered.toLocaleString('es-AR')} de {total.toLocaleString('es-AR')} interacciones ({pct}%)
      </span>
      <button
        onClick={onClearAll}
        className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 underline transition-colors"
      >
        Limpiar todo
      </button>
    </div>
  )
}

function FilterChip({ color, label, onRemove }) {
  const colors = {
    blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    amber:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colors[color]}`}>
      {label}
      <button onClick={onRemove} className="opacity-60 hover:opacity-100 text-base leading-none">&times;</button>
    </span>
  )
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
      {children}
    </p>
  )
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 h-24 p-5">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 h-72 lg:col-span-2" />
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 h-72" />
      </div>
    </div>
  )
}
