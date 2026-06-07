'use client'
import { useState } from 'react'
import { CATEGORIE_LABELS, CATEGORIE_COLORS, type Categorie } from '@/lib/categories'

interface ChargeTx {
  libelle: string
  montant: number
}

interface ChargeItem {
  cat: string
  total: number
  txs: ChargeTx[]
}

interface ChargesAccordionProps {
  items: ChargeItem[]
}

function fmtAmount(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export function ChargesAccordion({ items }: ChargesAccordionProps) {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-1.5">
      {items.map(({ cat, total, txs }) => {
        const isOpen = open === cat
        const color = CATEGORIE_COLORS[cat as Categorie] ?? '#ccc'
        const label = CATEGORIE_LABELS[cat as Categorie] ?? cat

        return (
          <div key={cat} className="border border-[#f0f0f0] rounded-lg overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : cat)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-[#fafafa] transition-colors text-left"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[12.5px] font-medium text-[#444] flex-1">{label}</span>
              <span className="text-[12.5px] font-bold text-[#111] tabular-nums">{fmtAmount(total)}</span>
              <span className={`text-[10px] text-[#bbb] transition-transform ml-1 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {isOpen && (
              <div className="border-t border-[#f5f5f5] bg-[#fafafa]">
                {txs.map((t, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-1.5 border-b border-[#f5f5f5] last:border-0">
                    <span className="text-[11.5px] text-[#666] truncate max-w-[65%]">{t.libelle}</span>
                    <span className="text-[11.5px] font-semibold text-[#333] tabular-nums shrink-0">{fmtAmount(Math.abs(t.montant))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
