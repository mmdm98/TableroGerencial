import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const PAGE_SIZE = 1000

async function fetchRango(desde, hasta) {
  let all = [], from = 0
  while (true) {
    const { data: page, error } = await supabase
      .from('interacciones')
      .select('*')
      .gte('fecha_llamada', desde)
      .lte('fecha_llamada', hasta)
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    all = [...all, ...(page ?? [])]
    if ((page ?? []).length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}

export function useComparacion(rangoA, rangoB) {
  const [state, setState] = useState({ dataA: [], dataB: [], loading: false, error: null })

  const fetchAll = useCallback(async () => {
    if (!rangoA?.desde || !rangoA?.hasta || !rangoB?.desde || !rangoB?.hasta) return
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const [dataA, dataB] = await Promise.all([
        fetchRango(rangoA.desde, rangoA.hasta),
        fetchRango(rangoB.desde, rangoB.hasta),
      ])
      setState({ dataA, dataB, loading: false, error: null })
    } catch (e) {
      setState({ dataA: [], dataB: [], loading: false, error: e.message })
    }
  }, [rangoA?.desde, rangoA?.hasta, rangoB?.desde, rangoB?.hasta])

  useEffect(() => { fetchAll() }, [fetchAll])

  return state
}
