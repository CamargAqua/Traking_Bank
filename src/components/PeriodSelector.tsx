'use client'
import { useRouter } from 'next/navigation'
import type { Releve } from '@prisma/client'

const MONTH_FR = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']
function fmtPeriode(p: string) {
  const [y, m] = p.split('-')
  return `${MONTH_FR[parseInt(m) - 1]} ${y}`
}

interface PeriodSelectorProps {
  releves: Releve[]
  activeId: string
}

export function PeriodSelector({ releves, activeId }: PeriodSelectorProps) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-2 border border-[#ebebeb] rounded-lg px-3 py-2 bg-white text-[12.5px] font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-[#00b37e]" />
      <select
        className="border-none bg-transparent outline-none font-[inherit] text-[12.5px] cursor-pointer"
        value={activeId}
        onChange={e => router.push(`/?releve=${e.target.value}`)}
      >
        {releves.map(r => (
          <option key={r.id} value={r.id}>
            {fmtPeriode(r.periode)}
          </option>
        ))}
      </select>
      ▾
    </div>
  )
}
