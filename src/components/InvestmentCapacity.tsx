'use client'
import { useState } from 'react'

interface Repartition {
  etf_world: number
  fonds_euros: number
  satellite: number
}

interface Analysis {
  flux_libre_moyen: number
  flux_libre_pire_mois: number
  flux_libre_meilleur_mois: number
  taux_epargne_pct: number
  dca_mensuel_fixe: number
  dca_pire_mois: number
  dca_meilleur_mois: number
  investissement_variable_moyen: number
  repartition: Repartition
  potentiel_annuel_plancher: number
  potentiel_annuel_cible: number
  alerte: string | null
  conseil: string
  conseil_cta: string
}

function fmt(n: number) {
  return Math.round(n).toLocaleString('fr-FR') + ' €'
}

function AllocationBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-[#555] w-32 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-[#f2f2f2] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[12px] font-semibold tabular-nums w-16 text-right">{fmt(value)}</span>
      <span className="text-[11px] text-[#999] w-8 text-right">{pct}%</span>
    </div>
  )
}

const HORIZONS = [
  { value: 5, label: '5 ans' },
  { value: 10, label: '10 ans' },
  { value: 20, label: '20 ans' },
]

export function InvestmentCapacity() {
  const [horizon, setHorizon] = useState(10)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)

  async function analyze() {
    setStatus('loading')
    try {
      const res = await fetch('/api/investment-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horizon }),
      })
      if (!res.ok) throw new Error('api_error')
      const data = await res.json()
      setAnalysis(data)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  const totalRep = analysis
    ? (analysis.repartition.etf_world + analysis.repartition.fonds_euros + analysis.repartition.satellite)
    : 0

  return (
    <div className="bg-white border border-[#ebebeb] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#f2f2f2] flex items-center justify-between">
        <span className="text-[13.5px] font-bold tracking-[-0.2px]">Capacité d&apos;investissement</span>
        <div className="flex items-center gap-2">
          {/* Horizon selector */}
          <div className="flex items-center gap-0.5 bg-[#f7f7f5] rounded-lg p-0.5">
            {HORIZONS.map(h => (
              <button
                key={h.value}
                onClick={() => { setHorizon(h.value); setStatus('idle') }}
                className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-all ${
                  horizon === h.value
                    ? 'bg-white text-[#111] shadow-sm'
                    : 'text-[#999] hover:text-[#555]'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
          <button
            onClick={analyze}
            disabled={status === 'loading'}
            className="flex items-center gap-1.5 bg-[#00b37e] text-white rounded-lg px-3.5 py-1.5 text-[12px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {status === 'loading' ? (
              <>
                <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                Analyse…
              </>
            ) : (
              <>✦ Analyser</>
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {status === 'idle' && (
          <div className="text-center py-8">
            <p className="text-[13px] text-[#bbb]">Clique sur Analyser pour calculer ta capacité d&apos;investissement mensuelle.</p>
            <p className="text-[11.5px] text-[#ccc] mt-1">Analyse réalisée par Claude Opus avec tes données réelles.</p>
          </div>
        )}

        {status === 'loading' && (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-2 border-[#00b37e] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[13px] text-[#999]">Claude analyse tes finances…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-8">
            <p className="text-[13px] text-[#e53e3e]">Erreur lors de l&apos;analyse. Réessaie.</p>
          </div>
        )}

        {status === 'done' && analysis && (
          <div className="flex flex-col gap-5">

            {/* Alerte */}
            {analysis.alerte && (
              <div className="bg-[#fff8f0] border border-[#fed7aa] rounded-xl px-4 py-3 flex items-start gap-2.5">
                <span className="text-base mt-0.5">⚠️</span>
                <p className="text-[12.5px] text-[#92400e]">{analysis.alerte}</p>
              </div>
            )}

            {/* DCA principal */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#f0fdf8] border border-[#c6f0e2] rounded-xl p-4 col-span-1">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#00b37e] mb-1.5">DCA mensuel</div>
                <div className="text-[24px] font-bold tracking-[-0.5px] text-[#111]">{fmt(analysis.dca_mensuel_fixe)}</div>
                <div className="text-[11px] text-[#555] mt-0.5">taux d&apos;épargne {analysis.taux_epargne_pct}%</div>
              </div>
              <div className="bg-[#f7f7f5] border border-[#ebebeb] rounded-xl p-4">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#999] mb-1.5">Pire mois</div>
                <div className="text-[18px] font-bold tracking-[-0.4px]">{fmt(analysis.dca_pire_mois)}</div>
                <div className="text-[11px] text-[#999] mt-0.5">plancher sécurisé</div>
              </div>
              <div className="bg-[#f7f7f5] border border-[#ebebeb] rounded-xl p-4">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#999] mb-1.5">Bon mois</div>
                <div className="text-[18px] font-bold tracking-[-0.4px]">{fmt(analysis.dca_meilleur_mois)}</div>
                <div className="text-[11px] text-[#999] mt-0.5">en bonne passe</div>
              </div>
            </div>

            {/* Allocation */}
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-3">Allocation recommandée · horizon {horizon} ans</div>
              <div className="flex flex-col gap-2.5">
                <AllocationBar label="ETF World" value={analysis.repartition.etf_world} total={totalRep} color="#00b37e" />
                <AllocationBar label="Fonds euros" value={analysis.repartition.fonds_euros} total={totalRep} color="#6366f1" />
                {analysis.repartition.satellite > 0 && (
                  <AllocationBar label="Satellite" value={analysis.repartition.satellite} total={totalRep} color="#f59e0b" />
                )}
              </div>
            </div>

            {/* Variable + potentiel annuel */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#f2f2f2]">
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-1.5">+ Revenus variables</div>
                <div className="text-[16px] font-bold">{fmt(analysis.investissement_variable_moyen)}</div>
                <div className="text-[11px] text-[#999] mt-0.5">à investir dès réception · primes · NDF</div>
              </div>
              <div className="text-right">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-1.5">Potentiel annuel</div>
                <div className="text-[11px] text-[#999]">plancher <span className="font-semibold text-[#111]">{fmt(analysis.potentiel_annuel_plancher)}</span></div>
                <div className="text-[11px] text-[#999] mt-0.5">cible <span className="font-semibold text-[#111]">{fmt(analysis.potentiel_annuel_cible)}</span></div>
              </div>
            </div>

            {/* Conseil + CTA */}
            <div className="bg-[#fafafa] border border-[#f2f2f2] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-[12.5px] text-[#555] flex-1">{analysis.conseil}</p>
              <a
                href="https://www.bourse-direct.fr/pea"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 bg-[#111] text-white rounded-lg px-3.5 py-1.5 text-[12px] font-semibold hover:opacity-80 transition-opacity whitespace-nowrap"
              >
                {analysis.conseil_cta}
              </a>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
