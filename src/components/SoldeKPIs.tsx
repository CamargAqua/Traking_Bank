'use client'
import { useState, useEffect } from 'react'
import { KPICard } from './KPICard'
import { MISE_DECOTE_KEY } from './RevenusCard'

interface SoldeKPIsProps {
  soldeNetBase: number
  soldeFin: number
  periode: string
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export function SoldeKPIs({ soldeNetBase, soldeFin, periode }: SoldeKPIsProps) {
  const [miseDecote, setMiseDecote] = useState(0)

  useEffect(() => {
    const key = MISE_DECOTE_KEY(periode)
    const saved = localStorage.getItem(key)
    if (saved) { const n = parseFloat(saved); if (!isNaN(n)) setMiseDecote(n) }
    const handler = (e: StorageEvent) => {
      if (e.key !== key) return
      setMiseDecote(e.newValue ? parseFloat(e.newValue) || 0 : 0)
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [periode])

  const soldeNet = soldeNetBase - miseDecote
  return (
    <KPICard
      label="Solde net du mois"
      value={fmt(soldeNet)}
      color={soldeNet >= 0 ? 'default' : 'red'}
      sub={`Fin de mois : ${fmt(soldeFin)}`}
    />
  )
}
