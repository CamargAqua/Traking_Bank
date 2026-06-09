'use client'
import { useState, useEffect } from 'react'

interface RevenusCardProps {
  revenus: number
  netFixeEst: number
  netVarEst: number
  hasBulletin: boolean
  periode: string
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
function fmtShort(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}

export const MISE_DECOTE_KEY = (periode: string) => `miseDecote_${periode}`

export function RevenusCard({ revenus, netFixeEst, netVarEst, hasBulletin, periode }: RevenusCardProps) {
  const key = MISE_DECOTE_KEY(periode)
  const [miseDecote, setMiseDecote] = useState(0)
  const [inputVal, setInputVal] = useState('')
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(key)
    if (saved) {
      const n = parseFloat(saved)
      if (!isNaN(n) && n > 0) { setMiseDecote(n); setInputVal(String(n)) }
    }
  }, [key])

  const commit = (val: string) => {
    const n = parseFloat(val.replace(',', '.'))
    const amount = !isNaN(n) && n > 0 ? n : 0
    setMiseDecote(amount)
    if (amount > 0) localStorage.setItem(key, String(amount))
    else localStorage.removeItem(key)
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: amount > 0 ? String(amount) : null }))
  }

  const disponible = revenus - miseDecote

  return (
    <div className="bg-white border border-[#ebebeb] rounded-xl p-5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-3">Détail revenus</div>

      <div className="flex flex-col gap-2">
        {hasBulletin && netVarEst > 0 ? (
          <>
            <Row label="Fixe net" sub="estimé" value={`+${fmtShort(netFixeEst)}`} color="#00b37e" />
            <Row label="Variable net" sub="estimé" value={`+${fmtShort(netVarEst)}`} color="#059669" />
          </>
        ) : revenus > 0 ? (
          <Row label="Salaire" value={`+${fmt(revenus)}`} color="#00b37e" />
        ) : null}

        <div className="border-t border-[#f2f2f2] mt-0.5 pt-2 flex items-center justify-between">
          <span className="text-[12.5px] font-bold text-[#111]">Reçu</span>
          <span className="text-[14px] font-bold text-[#00b37e]">+{fmt(revenus)}</span>
        </div>

        {/* Séparateur mise de côté */}
        <div className="border-t border-dashed border-[#e5e5e5] mt-1 pt-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[12px] text-[#888]">Épargne variable</span>
              <span className="text-[10px] text-[#bbb] ml-1">mis de côté</span>
            </div>
            <div className={`flex items-center gap-1 border-b transition-colors ${focused ? 'border-[#555]' : 'border-dashed border-[#ccc]'}`}>
              <span className="text-[12px] text-[#888]">−</span>
              <input
                type="number"
                min="0"
                step="50"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={e => { setFocused(false); commit(e.target.value) }}
                onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                placeholder="0"
                className="w-20 text-right bg-transparent outline-none text-[13px] font-semibold text-[#555] tabular-nums py-0.5"
              />
              <span className="text-[11px] text-[#bbb]">€</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-bold text-[#111]">Disponible</span>
            <span className={`text-[14px] font-bold tabular-nums ${disponible >= 0 ? 'text-[#111]' : 'text-[#e53e3e]'}`}>
              {fmt(disponible)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, sub, value, color }: { label: string; sub?: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12.5px] text-[#555]">
        {label}{sub && <span className="text-[10px] text-[#ccc] ml-1">({sub})</span>}
      </span>
      <span className="text-[13px] font-semibold tabular-nums" style={{ color }}>{value}</span>
    </div>
  )
}
