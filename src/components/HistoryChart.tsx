'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface HistoryChartProps {
  data: { periode: string; soldeFin: number }[]
}

function formatPeriode(p: string) {
  const [y, m] = p.split('-')
  const months = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`
}

export function HistoryChart({ data }: HistoryChartProps) {
  const chartData = [...data].reverse().map(d => ({
    name: formatPeriode(d.periode),
    solde: d.soldeFin,
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#bbb', fontFamily: 'DM Sans' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#bbb', fontFamily: 'DM Sans' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #ebebeb',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'DM Sans',
          }}
          labelStyle={{ color: '#999', fontSize: 11, fontWeight: 400 }}
          formatter={(v) => [`${Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`, 'Solde']}
        />
        <Line
          type="monotone"
          dataKey="solde"
          stroke="#00b37e"
          strokeWidth={2}
          dot={{ r: 4, fill: '#fff', stroke: '#00b37e', strokeWidth: 2 }}
          activeDot={{ r: 5, fill: '#00b37e' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
