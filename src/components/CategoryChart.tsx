'use client'
import { useState } from 'react'
import { CATEGORIE_COLORS, CATEGORIE_LABELS, type Categorie } from '@/lib/categories'

interface CategoryChartProps {
  data: { categorie: string; total: number }[]
}

const TOP_N = 5

export function CategoryChart({ data }: CategoryChartProps) {
  const [showAll, setShowAll] = useState(false)
  const max = Math.max(...data.map(d => Math.abs(d.total)), 1)

  const visible = showAll ? data : data.slice(0, TOP_N)
  const hiddenCount = data.length - TOP_N

  return (
    <div className="flex flex-col gap-2.5">
      {visible.map(({ categorie, total }) => {
        const isDeduction = total < 0
        const cat = categorie as Categorie
        const color = isDeduction ? '#00b37e' : (CATEGORIE_COLORS[cat] ?? '#d97706')
        const label = isDeduction ? 'Rembt. reçus' : (CATEGORIE_LABELS[cat] ?? categorie)
        const pct = (Math.abs(total) / max) * 100

        return (
          <div key={categorie + (isDeduction ? '_ded' : '')} className="grid items-center gap-3" style={{ gridTemplateColumns: '110px 1fr 64px' }}>
            <span className={`text-[12.5px] font-medium truncate ${isDeduction ? 'text-[#00b37e]' : 'text-[#444]'}`}>{label}</span>
            <div className="h-1.5 bg-[#f2f2f2] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <span className={`text-right text-[12px] font-semibold tabular-nums ${isDeduction ? 'text-[#00b37e]' : 'text-[#111]'}`}>
              {isDeduction ? '−' : ''}{Math.abs(total).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
            </span>
          </div>
        )
      })}

      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(s => !s)}
          className="self-start mt-1 text-[12px] font-medium text-[#00b37e] hover:underline"
        >
          {showAll ? 'Voir moins' : `Voir tout (${hiddenCount} de plus)`}
        </button>
      )}
    </div>
  )
}
