import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import MultiSelectDropdown from './MultiSelectDropdown'

export default function FilterBar({
  tab, setTab,
  dark, toggleDark,
  fechaDesde, setFechaDesde,
  fechaHasta, setFechaHasta,
  agentes, setAgentes,
  necesidades, setNecesidades,
  onExport, exporting,
}) {
  const [agentesOpciones, setAgentesOpciones] = useState([])
  const [necesidadesOpciones, setNecesidadesOpciones] = useState([])

  useEffect(() => {
    async function fetchDistinct(column) {
      const PAGE_SIZE = 1000
      const valores = new Set()
      let from = 0
      while (true) {
        const { data } = await supabase
          .from('interacciones')
          .select(column)
          .not(column, 'is', null)
          .range(from, from + PAGE_SIZE - 1)
        ;(data ?? []).forEach(r => valores.add(r[column]))
        if ((data ?? []).length < PAGE_SIZE) break
        from += PAGE_SIZE
      }
      return [...valores].sort()
    }

    async function loadOpciones() {
      const [ags, necs] = await Promise.all([
        fetchDistinct('agente'),
        fetchDistinct('necesidad'),
      ])
      setAgentesOpciones(ags)
      setNecesidadesOpciones(necs)
    }

    loadOpciones()
  }, [])

  const isDashboard = tab === 'dashboard'
  const isComparar = tab === 'comparar'
  const hayFiltrosActivos = agentes.length > 0 || necesidades.length > 0

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">

        {/* Logo */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-sm select-none">
            LUZ
          </div>
          <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm whitespace-nowrap">
            Dashboard Gerencial
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <TabBtn active={isDashboard} onClick={() => setTab('dashboard')}>Dashboard</TabBtn>
          <TabBtn active={isComparar} onClick={() => setTab('comparar')}>Comparar</TabBtn>
          <TabBtn active={tab === 'uploader'} onClick={() => setTab('uploader')}>Cargar Datos</TabBtn>
        </div>

        {/* Filtros */}
        {isDashboard && (
          <>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Desde</label>
              <input
                type="date" value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Hasta</label>
              <input
                type="date" value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {agentesOpciones.length > 0 && (
              <MultiSelectDropdown
                label="Agente"
                opciones={agentesOpciones}
                seleccionados={agentes}
                onChange={setAgentes}
                colorActivo="blue"
                defaultAllSelected={true}
              />
            )}

            {necesidadesOpciones.length > 0 && (
              <MultiSelectDropdown
                label="Necesidad"
                opciones={necesidadesOpciones}
                seleccionados={necesidades}
                onChange={setNecesidades}
                colorActivo="indigo"
              />
            )}

            {hayFiltrosActivos && (
              <button
                onClick={() => { setAgentes([]); setNecesidades([]) }}
                className="text-xs text-gray-400 hover:text-red-500 underline transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </>
        )}

        {/* Exportar PDF */}
        {isDashboard && (
          <button
            onClick={onExport}
            disabled={exporting}
            title="Exportar reporte PDF"
            className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? <IconSpinner /> : <IconPrinter />}
            <span className="hidden sm:inline">{exporting ? 'Generando…' : 'PDF'}</span>
          </button>
        )}

        {/* Toggle dark mode */}
        <button
          onClick={toggleDark}
          title={dark ? 'Modo claro' : 'Modo noche'}
          className={`${isDashboard ? '' : 'ml-auto'} p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
        >
          {dark ? <IconSun /> : <IconMoon />}
        </button>
      </div>
    </header>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
        active
          ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

function IconPrinter() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
    </svg>
  )
}

function IconSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function IconMoon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

function IconSun() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  )
}
