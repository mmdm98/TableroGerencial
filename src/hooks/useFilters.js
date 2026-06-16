import { useState } from 'react'

const today = new Date()
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

const fmt = (d) => d.toISOString().split('T')[0]

export function useFilters() {
  const [fechaDesde, setFechaDesde] = useState(fmt(firstDayOfMonth))
  const [fechaHasta, setFechaHasta] = useState(fmt(today))
  const [agentes, setAgentes] = useState([])
  const [necesidades, setNecesidades] = useState([])

  return {
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
    agentes,
    setAgentes,
    necesidades,
    setNecesidades,
  }
}
