'use client'

export interface EvolutionMonth {
  periode: string
  label: string
  values: Record<string, number>
}

export interface EvolutionCat {
  cat: string
  label: string
  color: string
}

interface VariableEvolutionChartProps {
  months: EvolutionMonth[]
  categories: EvolutionCat[]
  targets: Record<string, number>
}

const OVER_COLOR = '#e24b4a'
const BAR_AREA = 190 // hauteur de la zone de barres en px

export function VariableEvolutionChart({ months, categories, targets }: VariableEvolutionChartProps) {
  // Échelle : max entre toutes les valeurs et toutes les cibles
  const allValues = months.flatMap(m => categories.map(c => m.values[c.cat] ?? 0))
  const allTargets = categories.map(c => targets[c.cat] ?? 0)
  const max = Math.max(...allValues, ...allTargets, 1)

  if (months.length === 0) {
    return <p className="text-[13px] text-[#bbb] text-center py-8">Pas encore de données</p>
  }

  return (
    <div>
      <div className="flex items-end gap-5 px-2" style={{ height: BAR_AREA + 24 }}>
        {months.map(m => (
          <div key={m.periode} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <div className="flex items-end justify-center gap-[3px] w-full" style={{ height: BAR_AREA }}>
              {categories.map(c => {
                const val = m.values[c.cat] ?? 0
                const target = targets[c.cat] ?? 0
                const over = target > 0 && val > target
                const h = (val / max) * BAR_AREA
                const targetTop = target > 0 ? BAR_AREA - (target / max) * BAR_AREA : null
                return (
                  <div
                    key={c.cat}
                    className="relative flex-1 max-w-[14px]"
                    style={{ height: BAR_AREA }}
                    title={`${c.label} · ${Math.round(val)} €${target > 0 ? ` (cible ${Math.round(target)} €)` : ''}`}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-t-[2px] transition-all duration-500"
                      style={{ height: Math.max(h, 1), background: c.color }}
                    />
                    {targetTop != null && (
                      <div
                        className="absolute left-[-1px] right-[-1px] h-[1.5px] bg-[#111]"
                        style={{ top: targetTop }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <span className="text-[11px] text-[#999]">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 px-2 pt-3.5 mt-2 border-t border-[#f2f2f2]">
        {categories.map(c => (
          <span key={c.cat} className="flex items-center gap-1.5 text-[11px] text-[#666]">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
            {c.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[11px] text-[#666] ml-auto">
          <svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke="#111" strokeWidth="1.5" /></svg>
          objectif
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#666]">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: OVER_COLOR }} />
          dépassé
        </span>
      </div>
    </div>
  )
}
