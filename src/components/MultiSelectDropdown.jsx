import { useState, useRef, useEffect } from 'react'

export default function MultiSelectDropdown({
  label, opciones, seleccionados, onChange,
  colorActivo = 'blue',
  defaultAllSelected = false,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const estaChecked = (op) =>
    defaultAllSelected
      ? seleccionados.length === 0 || seleccionados.includes(op)
      : seleccionados.includes(op)

  const todosActivos = seleccionados.length === 0

  const labelBoton = todosActivos
    ? `Todos (${opciones.length})`
    : seleccionados.length === 1
      ? seleccionados[0]
      : defaultAllSelected
        ? `${seleccionados.length} de ${opciones.length}`
        : `${seleccionados.length} seleccionados`

  function toggleTodos() { onChange([]); setOpen(false) }

  function toggleOpcion(op) {
    if (defaultAllSelected && seleccionados.length === 0) {
      onChange(opciones.filter(o => o !== op)); return
    }
    if (seleccionados.includes(op)) {
      onChange(seleccionados.filter(i => i !== op))
    } else {
      const nuevos = [...seleccionados, op]
      onChange(defaultAllSelected && nuevos.length === opciones.length ? [] : nuevos)
    }
  }

  const activeText = {
    blue:   'text-blue-600 dark:text-blue-400 font-semibold',
    indigo: 'text-indigo-600 dark:text-indigo-400 font-semibold',
  }
  const checkColor = {
    blue:   'bg-blue-600 border-blue-600',
    indigo: 'bg-indigo-600 border-indigo-600',
  }
  const btnText = !todosActivos ? activeText[colorActivo] : 'text-gray-600 dark:text-gray-300'

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      {label && (
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}</span>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-800 flex items-center gap-1.5 hover:border-blue-400 dark:hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors min-w-[160px] justify-between"
      >
        <span className={`truncate max-w-[160px] ${btnText}`}>{labelBoton}</span>
        <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[220px] max-h-72 overflow-y-auto py-1">
          <button
            onClick={toggleTodos}
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
              todosActivos ? activeText[colorActivo] : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <Checkbox checked={todosActivos} color={checkColor[colorActivo]} />
            <span className="font-medium">Todos</span>
          </button>

          <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-2" />

          {opciones.map(op => {
            const checked = estaChecked(op)
            return (
              <button
                key={op}
                onClick={() => toggleOpcion(op)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  checked ? activeText[colorActivo] : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <Checkbox checked={checked} color={checkColor[colorActivo]} />
                <span className="truncate">{op}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Checkbox({ checked, color }) {
  return (
    <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
      checked ? color : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
    }`}>
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </span>
  )
}
