'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { CATEGORIE_COLORS, CATEGORIE_LABELS, type Categorie } from '@/lib/categories'

interface EvolutionPoint {
  periode: string
  [cat: string]: number | string
}

interface EvolutionChartProps {
  data: EvolutionPoint[]
  categories: string[]
}

const MONTH_FR = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']
function fmtPeriode(p: string) {
  const [, m] = p.split('-')
  return MONTH_FR[parseInt(m) - 1] ?? p
}

export function EvolutionChart({ data, categories }: EvolutionChartProps) {
  if (data.length === 0) return (
    <p className="text-[13px] text-[#bbb] text-center py-8">Pas assez de données</p>
  )

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f2f2f2" vertical={false} />
        <XAxis
          dataKey="periode"
          tickFormatter={fmtPeriode}
          tick={{ fontSize: 11, fill: '#bbb' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#bbb' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}€`}
          width={48}
        />
        <Tooltip
          formatter={(value, name) => [
            `${Number(value).toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €`,
            CATEGORIE_LABELS[String(name) as Categorie] ?? String(name),
          ]}
          labelFormatter={(label) => fmtPeriode(String(label))}
          contentStyle={{ fontSize: 12, border: '1px solid #ebebeb', borderRadius: 8 }}
        />
        <Legend
          formatter={name => CATEGORIE_LABELS[name as Categorie] ?? name}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
        {categories.map(cat => (
          <Bar
            key={cat}
            dataKey={cat}
            stackId="a"
            fill={CATEGORIE_COLORS[cat as Categorie] ?? '#ccc'}
            radius={categories.indexOf(cat) === categories.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
