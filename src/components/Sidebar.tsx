'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Releve } from '@prisma/client'

interface SidebarProps {
  releves: Releve[]
  selectedId?: string
}

const MONTH_FR = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']

function formatPeriode(p: string) {
  const [y, m] = p.split('-')
  return `${MONTH_FR[parseInt(m) - 1]} ${y}`
}

export function Sidebar({ releves, selectedId }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-[210px] bg-white border-r border-[#ebebeb] flex flex-col sticky top-0 h-screen shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#f2f2f2] flex items-center gap-2">
        <div className="w-7 h-7 bg-[#f0fdf8] border border-[#c6f0e2] rounded-lg flex items-center justify-center text-[11px] font-bold text-[#00b37e]">
          VM
        </div>
        <span className="text-[15px] font-bold tracking-[-0.3px]">
          mes<span className="text-[#00b37e]">finances</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="px-2.5 py-3 flex-1 overflow-y-auto">
        <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#bbb] px-2 mb-1">Menu</div>

        <Link
          href="/"
          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] font-medium mb-0.5 transition-all ${
            pathname === '/' && !selectedId ? 'bg-[#f0fdf8] text-[#00b37e] font-semibold' : 'text-[#999] hover:bg-[#f7f7f5] hover:text-[#111]'
          }`}
        >
          <span className="w-4 text-center text-sm opacity-70">▦</span> Dashboard
        </Link>

        <Link
          href="/import"
          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] font-medium mb-0.5 transition-all ${
            pathname === '/import' ? 'bg-[#f0fdf8] text-[#00b37e] font-semibold' : 'text-[#999] hover:bg-[#f7f7f5] hover:text-[#111]'
          }`}
        >
          <span className="w-4 text-center text-sm opacity-70">↑</span> Import PDF
        </Link>

        {releves.length > 0 && (
          <>
            <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#bbb] px-2 mt-4 mb-1">Relevés</div>
            {releves.map(r => (
              <Link
                key={r.id}
                href={`/?releve=${r.id}`}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12.5px] mb-0.5 transition-all ${
                  selectedId === r.id ? 'text-[#111] font-semibold' : 'text-[#999] hover:bg-[#f7f7f5] hover:text-[#111]'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: selectedId === r.id ? '#00b37e' : '#e2e8f0' }}
                />
                {formatPeriode(r.periode)}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-2.5 border-t border-[#f2f2f2]">
        <Link
          href="/import"
          className="w-full bg-[#00b37e] text-white rounded-lg py-2.5 text-[13px] font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          + Importer un relevé
        </Link>
      </div>
    </aside>
  )
}
