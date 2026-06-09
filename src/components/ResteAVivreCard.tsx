'use client'
import { useState, useEffect } from 'react'
import { MISE_DECOTE_KEY } from './RevenusCard'

interface ResteAVivreCardProps {
  resteAVivreBase: number
  revenus: number
  tauxCharges: number
  epargne: number
  periode: string
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export function ResteAVivreCard({ resteAVivreBase, revenus, tauxCharges, epargne, periode }: ResteAVivreCardProps) {
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

  const resteAVivre = resteAVivreBase - miseDecote
  const pct = revenus > 0 ? Math.min(Math.round((resteAVivre / revenus) * 100), 100) : 0
  const barColor = resteAVivre >= revenus * 0.5 ? '#00b37e' : resteAVivre >= revenus * 0.3 ? '#f59e0b' : '#e53e3e'

  return (
    <div className="bg-white border border-[#ebebeb] rounded-xl p-5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-2">Reste à vivre</div>
      <div className={`text-[32px] font-bold tracking-[-1px] ${resteAVivre >= 0 ? 'text-[#111]' : 'text-[#e53e3e]'}`}>
        {fmt(resteAVivre)}
      </div>
      <div className="text-[11.5px] text-[#999] mt-1">
        après charges fixes ({tauxCharges}%{miseDecote > 0 ? ` + ${fmt(miseDecote)} épargne` : ''})
      </div>
      <div className="h-2 bg-[#f2f2f2] rounded-full overflow-hidden mt-3">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      {epargne > 0 && (
        <div className="mt-3 text-[11.5px] text-[#999]">dont {fmt(epargne)} en épargne (PEL)</div>
      )}
    </div>
  )
}
