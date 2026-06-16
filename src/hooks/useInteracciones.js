import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const PAGE_SIZE = 1000

export function useInteracciones({ fechaDesde, fechaHasta, agentes, necesidades }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    // Construye la query base con los filtros activos (sin range, para reusar por página)
    function buildQuery() {
      let q = supabase
        .from('interacciones')
        .select('*')
        .gte('fecha_llamada', fechaDesde)
        .lte('fecha_llamada', fechaHasta)

      if (agentes.length > 0)    q = q.in('agente', agentes)
      if (necesidades.length > 0) q = q.in('necesidad', necesidades)

      return q
    }

    // Pagina hasta traer todos los registros
    let all = []
    let from = 0
    let fetchError = null

    while (true) {
      const { data: page, error: err } = await buildQuery().range(from, from + PAGE_SIZE - 1)

      if (err) { fetchError = err.message; break }

      all = [...all, ...(page ?? [])]

      // Si la página vino incompleta, no hay más registros
      if ((page ?? []).length < PAGE_SIZE) break

      from += PAGE_SIZE
    }

    if (fetchError) {
      setError(fetchError)
      setData([])
    } else {
      setData(all)
    }

    setLoading(false)
  }, [fechaDesde, fechaHasta, agentes, necesidades])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
