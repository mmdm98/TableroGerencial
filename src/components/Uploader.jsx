import { useState, useRef, useCallback } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'
import { mapearFila, filaValida } from '../utils/mapearFila'

const BATCH_SIZE = 500

// ─── Parseo de archivo ───────────────────────────────────────────────────────

function parsearArchivo(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase()

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: r => resolve(r.data),
        error: e => reject(e.message),
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          resolve(XLSX.utils.sheet_to_json(ws, { defval: '' }))
        } catch (err) {
          reject(err.message)
        }
      }
      reader.onerror = () => reject('Error al leer el archivo')
      reader.readAsArrayBuffer(file)
    } else {
      reject('Formato no soportado. Usá .csv, .xlsx o .xls')
    }
  })
}

// ─── Estados del flujo ───────────────────────────────────────────────────────
// idle → parsed → uploading → done

export default function Uploader() {
  const [estado, setEstado]       = useState('idle')
  const [dragging, setDragging]   = useState(false)
  const [archivo, setArchivo]     = useState(null)
  const [filas, setFilas]         = useState([])
  const [descartadas, setDescartadas] = useState(0)
  const [progreso, setProgreso]   = useState({ actual: 0, total: 0, errores: 0 })
  const [resultado, setResultado] = useState(null)
  const [parseError, setParseError] = useState(null)
  const inputRef = useRef()

  // ── Procesamiento tras seleccionar archivo ─────────────────────────────────
  const procesarArchivo = useCallback(async (file) => {
    setParseError(null)
    setArchivo(file)
    try {
      const rawRows = await parsearArchivo(file)
      const mapeadas = rawRows.map(mapearFila)
      const validas = mapeadas.filter(filaValida)
      setFilas(validas)
      setDescartadas(rawRows.length - validas.length)
      setEstado('parsed')
    } catch (err) {
      setParseError(String(err))
      setEstado('idle')
    }
  }, [])

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const onDrop = useCallback(e => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) procesarArchivo(file)
  }, [procesarArchivo])

  const onDragOver = e => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onInputChange = e => { if (e.target.files[0]) procesarArchivo(e.target.files[0]) }

  // ── Carga a Supabase ───────────────────────────────────────────────────────
  async function cargarDatos() {
    setEstado('uploading')
    const batches = []
    for (let i = 0; i < filas.length; i += BATCH_SIZE) {
      batches.push(filas.slice(i, i + BATCH_SIZE))
    }

    let insertadas = 0
    let totalFallidas = 0
    const filasFallidas = []
    setProgreso({ actual: 0, total: batches.length, errores: 0, fase: 'cargando' })

    for (let i = 0; i < batches.length; i++) {
      const { error } = await supabase
        .from('interacciones')
        .upsert(batches[i], { onConflict: 'id_llamada' })

      if (!error) {
        insertadas += batches[i].length
      } else {
        const errInfo = { code: error.code, message: error.message, details: error.details, hint: error.hint }
        console.error(`[Lote ${i + 1}/${batches.length}] Falló el lote completo:`, errInfo)

        setProgreso(p => ({ ...p, fase: `reintentando lote ${i + 1} fila por fila...` }))
        for (const fila of batches[i]) {
          const { error: rowErr } = await supabase
            .from('interacciones')
            .upsert([fila], { onConflict: 'id_llamada' })

          if (rowErr) {
            totalFallidas++
            const rowErrInfo = { code: rowErr.code, message: rowErr.message, details: rowErr.details, hint: rowErr.hint }
            console.error(`  ❌ Fila fallida [id_llamada=${fila.id_llamada}]:`, rowErrInfo, '\n  Datos:', fila)
            filasFallidas.push({ lote: i + 1, fila, error: rowErrInfo })
          } else {
            insertadas++
          }
        }
      }

      setProgreso({ actual: i + 1, total: batches.length, errores: filasFallidas.length, fase: 'cargando' })
    }

    const reporte = {
      archivo: archivo?.name,
      timestamp: new Date().toISOString(),
      resumen: { total: filas.length, insertadas, fallidas: totalFallidas },
      filasFallidas,
    }
    if (filasFallidas.length > 0) {
      console.error('══ REPORTE COMPLETO DE ERRORES ══', JSON.stringify(reporte, null, 2))
    }

    setResultado({ insertadas, totalFallidas, reporte })
    setEstado('done')
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  function reset() {
    setEstado('idle')
    setArchivo(null)
    setFilas([])
    setDescartadas(0)
    setProgreso({ actual: 0, total: 0, errores: 0 })
    setResultado(null)
    setParseError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Zona drag & drop */}
      {estado === 'idle' && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            dragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={onInputChange}
          />
          <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
            <IconUpload />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
            {dragging ? 'Soltá el archivo acá' : 'Arrastrá tu archivo o hacé clic para seleccionar'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Formatos soportados: CSV, XLSX, XLS</p>
          {parseError && (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400 font-medium">{parseError}</p>
          )}
        </div>
      )}

      {/* Vista previa */}
      {estado === 'parsed' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5 transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <IconCheck />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{archivo?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {filas.length.toLocaleString('es-AR')} filas listas para cargar
                {descartadas > 0 && (
                  <span className="text-amber-600 dark:text-amber-400"> · {descartadas} descartadas (sin ID o fecha)</span>
                )}
              </p>
            </div>
          </div>

          {/* Tabla preview: primeras 5 filas */}
          <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
            <table className="text-xs w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <tr>
                  {['Fecha', 'Agente', 'Necesidad', 'Motivo', 'Duración (min)', 'Sentimiento', 'Inicio', 'Cierre'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filas.slice(0, 5).map((f, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 text-gray-700 dark:text-gray-300">
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap">{f.fecha_llamada}</td>
                    <td className="px-3 py-2 max-w-[120px] truncate">{f.agente ?? '—'}</td>
                    <td className="px-3 py-2">{f.necesidad ?? '—'}</td>
                    <td className="px-3 py-2 max-w-[120px] truncate">{f.motivo_necesidad ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{f.duracion_minutos?.toFixed(2) ?? '—'}</td>
                    <td className="px-3 py-2">
                      <SentimientoBadge cat={f.sentimiento_categoria} />
                    </td>
                    <td className="px-3 py-2">{f.fase_inicio ?? '—'}</td>
                    <td className="px-3 py-2">{f.fase_cierre ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filas.length > 5 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-right">Mostrando 5 de {filas.length.toLocaleString('es-AR')} filas</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={cargarDatos}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              Cargar {filas.length.toLocaleString('es-AR')} registros a Supabase
            </button>
            <button
              onClick={reset}
              className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Progreso de carga */}
      {estado === 'uploading' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 space-y-5 text-center transition-colors">
          <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
            <IconSpinner />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
              {progreso.fase?.startsWith('reintentando')
                ? 'Identificando filas con error...'
                : 'Cargando datos...'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {progreso.fase?.startsWith('reintentando')
                ? progreso.fase
                : `Lote ${progreso.actual} de ${progreso.total}`}
              {progreso.errores > 0 && (
                <span className="text-red-500 dark:text-red-400"> · {progreso.errores} filas con error</span>
              )}
            </p>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: progreso.total > 0 ? `${(progreso.actual / progreso.total) * 100}%` : '0%' }}
            />
          </div>
        </div>
      )}

      {/* Resultado final */}
      {estado === 'done' && resultado && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5 transition-colors">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
              resultado.totalFallidas === 0 ? 'bg-green-50 dark:bg-green-900/30' : 'bg-amber-50 dark:bg-amber-900/30'
            }`}>
              {resultado.totalFallidas === 0 ? <IconCheckBig /> : <IconWarn />}
            </div>
            <div>
              <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                {resultado.totalFallidas === 0 ? '¡Carga completada!' : 'Carga completada con errores'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                <span className="text-green-600 dark:text-green-400 font-medium">{resultado.insertadas.toLocaleString('es-AR')} insertados/actualizados</span>
                {resultado.totalFallidas > 0 && (
                  <span className="text-red-500 dark:text-red-400 font-medium"> · {resultado.totalFallidas.toLocaleString('es-AR')} fallidos</span>
                )}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Registros duplicados (mismo ID) fueron actualizados con upsert.</p>
            </div>
          </div>

          {/* Tabla de filas fallidas */}
          {resultado.reporte.filasFallidas.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
                  Filas con error ({resultado.reporte.filasFallidas.length})
                </p>
                <button
                  onClick={() => descargarErrores(resultado.reporte)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  <IconDownload />
                  Descargar errores_carga.json
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-red-100 dark:border-red-900/50 max-h-64 overflow-y-auto">
                <table className="text-xs w-full">
                  <thead className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 uppercase tracking-wide sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">ID Llamada</th>
                      <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                      <th className="px-3 py-2 text-left font-semibold">Código</th>
                      <th className="px-3 py-2 text-left font-semibold">Error Supabase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-50 dark:divide-red-900/30">
                    {resultado.reporte.filasFallidas.map((item, idx) => (
                      <tr key={idx} className="hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-300">
                        <td className="px-3 py-2 font-mono max-w-[160px] truncate" title={item.fila.id_llamada}>
                          {item.fila.id_llamada}
                        </td>
                        <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                          {item.fila.fecha_llamada}
                        </td>
                        <td className="px-3 py-2 font-mono text-amber-700 dark:text-amber-400 whitespace-nowrap">
                          {item.error.code ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-red-700 dark:text-red-400 max-w-[280px] truncate" title={item.error.message}>
                          {item.error.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button
            onClick={reset}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            Cargar otro archivo
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Descarga del reporte de errores ────────────────────────────────────────

function descargarErrores(reporte) {
  const json = JSON.stringify(reporte, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'errores_carga.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function SentimientoBadge({ cat }) {
  const MAP = {
    Positivo:    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    Neutro:      'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    Negativo:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    'No Medido': 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
  }
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${MAP[cat] ?? MAP['No Medido']}`}>
      {cat ?? 'No Medido'}
    </span>
  )
}

function IconUpload() {
  return (
    <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}
function IconCheck() {
  return (
    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function IconCheckBig() {
  return (
    <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function IconWarn() {
  return (
    <svg className="w-7 h-7 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}
function IconDownload() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}
function IconSpinner() {
  return (
    <svg className="w-7 h-7 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
