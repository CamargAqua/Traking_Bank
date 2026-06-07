'use client'
import { CATEGORIE_COLORS, CATEGORIE_LABELS, type Categorie } from '@/lib/categories'

export function CategoryBadge({ categorie }: { categorie: string }) {
  const cat = categorie as Categorie
  const label = CATEGORIE_LABELS[cat] ?? categorie
  const color = CATEGORIE_COLORS[cat] ?? '#d97706'
  const isUncategorized = cat === 'NON_CATEGORISE'

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{
        background: isUncategorized ? '#fffbeb' : `${color}18`,
        color: isUncategorized ? '#d97706' : color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: isUncategorized ? '#d97706' : color }}
      />
      {label}
    </span>
  )
}
