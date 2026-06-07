'use client'
import { CATEGORIE_COLORS, CATEGORIE_LABELS, type Categorie } from '@/lib/categories'

interface CategoryChartProps {
  data: { categorie: string; total: number }[]
}

export function CategoryChart({ data }: CategoryChartProps) {
  const max = Math.max(...data.map(d => Math.abs(d.total)), 1)

  return (
    <div className="flex flex-col gap-2.5">
      {data.map(({ categorie, total }) => {
        const cat = categorie as Categorie
        const color = CATEGORIE_COLORS[cat] ?? '#d97706'
        const label = CATEGORIE_LABELS[cat] ?? categorie
        const pct = (Math.abs(total) / max) * 100

        return (
          <div key={categorie} className="grid items-center gap-3" style={{ gridTemplateColumns: '110px 1fr 64px' }}>
            <span className="text-[12.5px] text-[#444] font-medium truncate">{label}</span>
            <div className="h-1.5 bg-[#f2f2f2] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <span className="text-right text-[12px] font-semibold text-[#111] tabular-nums">
              {Math.abs(total).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
            </span>
          </div>
        )
      })}
    </div>
  )
}
