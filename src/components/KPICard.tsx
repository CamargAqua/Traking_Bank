'use client'

interface KPICardProps {
  label: string
  value: string
  sub?: string
  trend?: { value: string; up: boolean }
  color?: 'green' | 'red' | 'default'
}

export function KPICard({ label, value, sub, trend, color = 'default' }: KPICardProps) {
  const valueColor =
    color === 'green' ? 'text-[#00b37e]' :
    color === 'red'   ? 'text-[#e53e3e]' :
    'text-[#111]'

  return (
    <div className="bg-white border border-[#ebebeb] rounded-xl p-5 hover:border-[#ddd] hover:shadow-sm transition-all">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-2.5">
        {label}
      </div>
      <div className={`text-[26px] font-bold tracking-[-1px] leading-none mb-2 ${valueColor}`}>
        {value}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap text-[11.5px] text-[#999]">
        {trend && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold"
            style={{
              background: trend.up ? '#f0fdf8' : '#fff5f5',
              color: trend.up ? '#00b37e' : '#e53e3e',
            }}
          >
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
        )}
        {sub && <span>{sub}</span>}
      </div>
    </div>
  )
}
