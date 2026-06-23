'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { TagModal } from './TagModal'
import { CATEGORIE_LABELS, CATEGORIE_COLORS, type Categorie } from '@/lib/categories'
import type { Transaction } from '@prisma/client'

interface TransactionListProps {
  transactions: Transaction[]
  // Ids de loyers en doublon : exclus des totaux/actives, visibles sous "Exclus"
  redundantIds?: string[]
}

const CAT_ORDER = [
  'SALAIRE','PRIME','NOTE_FRAIS','REMBOURSEMENT_COLOC','REMBOURSEMENT_DIVERS','REVENU_EXCEPTIONNEL',
  'LOGEMENT','ENERGIE','CREDIT','REMBOURSEMENT_DETTE','ASSURANCE','ABONNEMENT','EPARGNE',
  'RESTOS_BARS','ALIMENTATION','TRANSPORT','VOYAGE_SORTIES','SHOPPING','SANTE','CASH_DAB',
  'IMPOTS','EXCEPTIONNEL','NON_CATEGORISE',
]

function fmt(m: number) {
  return `${m >= 0 ? '+' : ''}${m.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

function fmtShort(d: Date | string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function fmtDayLabel(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function TransactionList({ transactions, redundantIds = [] }: TransactionListProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'cat' | 'date'>('cat')
  const [openCats, setOpenCats] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [showExclus, setShowExclus] = useState(false)
  const [tagTarget, setTagTarget] = useState<Transaction | null>(null)

  const redundant = useMemo(() => new Set(redundantIds), [redundantIds])
  const isExcluded = (t: Transaction) => t.exclure || redundant.has(t.id)
  const actives = useMemo(() => transactions.filter(t => !isExcluded(t)), [transactions, redundant])
  const excluded = useMemo(() => transactions.filter(t => isExcluded(t)), [transactions, redundant])
  const displayList = useMemo(() => showExclus ? transactions : actives, [showExclus, transactions, actives])
  const uncategorizedCount = useMemo(() => actives.filter(t => t.categorie === 'NON_CATEGORISE').length, [actives])

  const filtered = useMemo(() => {
    if (!search) return displayList
    const q = search.toLowerCase()
    return displayList.filter(t =>
      t.libelle.toLowerCase().includes(q) ||
      (t.libelleRaw ?? '').toLowerCase().includes(q)
    )
  }, [displayList, search])

  const groups = useMemo(() => {
    if (search || viewMode === 'date') return null
    const map = new Map<string, Transaction[]>()
    for (const t of filtered.filter(t => !isExcluded(t))) {
      const g = map.get(t.categorie) ?? []
      g.push(t)
      map.set(t.categorie, g)
    }
    return CAT_ORDER
      .filter(cat => map.has(cat))
      .map(cat => {
        const txs = (map.get(cat) ?? []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        return { cat, txs, total: txs.reduce((s, t) => s + t.montant, 0) }
      })
  }, [filtered, search, viewMode, redundant])

  const dateGroups = useMemo(() => {
    if (search || viewMode !== 'date') return null
    const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const map = new Map<string, Transaction[]>()
    for (const t of sorted) {
      const day = new Date(t.date).toISOString().slice(0, 10)
      const g = map.get(day) ?? []
      g.push(t)
      map.set(day, g)
    }
    return [...map.entries()].map(([day, txs]) => ({ day, txs }))
  }, [filtered, search, viewMode])

  const allOpen = groups != null && openCats.size >= groups.length

  const toggleCat = (cat: string) => {
    setOpenCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const toggleAll = () => {
    setOpenCats(allOpen ? new Set() : new Set(groups?.map(g => g.cat) ?? []))
  }

  const renderTxRow = (t: Transaction) => (
    <div
      key={t.id}
      onClick={() => setTagTarget(t)}
      style={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        cursor: 'pointer',
        borderLeft: `3px solid ${CATEGORIE_COLORS[t.categorie as Categorie] ?? '#ccc'}`,
        opacity: isExcluded(t) ? 0.45 : 1,
      }}
      className="tx-row"
    >
      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11, color: 'var(--color-text-tertiary)', padding: '8px 10px', width: 38, flexShrink: 0 }}>
        {fmtShort(t.date)}
      </span>
      <span style={{ flex: 1, fontSize: 13, padding: '8px 8px 8px 0', color: t.categorie === 'NON_CATEGORISE' ? '#d97706' : 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
        {t.categorie === 'NON_CATEGORISE' && <span style={{ marginRight: 4 }}>⚠</span>}
        {t.libelle}
      </span>
      {t.confiance !== 'haute' && (
        <span
          title={`Confiance ${t.confiance}`}
          style={{ width: 6, height: 6, borderRadius: '50%', background: t.confiance === 'basse' ? '#d97706' : '#94a3b8', flexShrink: 0, marginRight: 10 }}
        />
      )}
      <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums', padding: '8px 14px 8px 0', textAlign: 'right', flexShrink: 0, minWidth: 100, color: t.montant > 0 ? '#00b37e' : t.categorie === 'NON_CATEGORISE' ? '#d97706' : 'var(--color-text-primary)' }}>
        {fmt(t.montant)}
      </span>
    </div>
  )

  return (
    <>
      <style>{`
        .tx-row:hover { background: var(--color-background-secondary) !important; }
        .tx-cat-head:hover { background: var(--color-background-secondary) !important; }
        .tx-date-row:hover { background: var(--color-background-secondary) !important; }
      `}</style>

      {/* Toolbar */}
      <div style={{ padding: '8px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', border: '0.5px solid var(--color-border-secondary)', borderRadius: 7, overflow: 'hidden', flexShrink: 0 }}>
          <button
            onClick={() => setViewMode('cat')}
            style={{ padding: '5px 11px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', background: viewMode === 'cat' ? 'var(--color-text-primary)' : 'transparent', color: viewMode === 'cat' ? 'var(--color-background-primary)' : 'var(--color-text-secondary)', borderRight: '0.5px solid var(--color-border-secondary)' }}
          >
            Par catégorie
          </button>
          <button
            onClick={() => setViewMode('date')}
            style={{ padding: '5px 11px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', background: viewMode === 'date' ? 'var(--color-text-primary)' : 'transparent', color: viewMode === 'date' ? 'var(--color-background-primary)' : 'var(--color-text-secondary)' }}
          >
            Par date
          </button>
        </div>

        {viewMode === 'cat' && !search && groups && (
          <button
            onClick={toggleAll}
            style={{ padding: '5px 10px', fontSize: 11, border: '0.5px solid var(--color-border-secondary)', borderRadius: 6, background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', flexShrink: 0 }}
          >
            {allOpen ? 'Tout réduire' : 'Tout ouvrir'}
          </button>
        )}

        {uncategorizedCount > 0 && (
          <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 500, background: '#fffbeb', color: '#d97706', border: '0.5px solid #fde68a', flexShrink: 0 }}>
            ⚠ {uncategorizedCount} à taguer
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {excluded.length > 0 && (
            <button
              onClick={() => setShowExclus(s => !s)}
              style={{ padding: '5px 10px', fontSize: 11, fontWeight: 500, border: '0.5px solid var(--color-border-secondary)', borderRadius: 6, cursor: 'pointer', background: showExclus ? '#fff5f5' : 'transparent', color: showExclus ? '#e53e3e' : 'var(--color-text-tertiary)', flexShrink: 0 }}
            >
              ⊘ Exclus ({excluded.length})
            </button>
          )}
          <input
            style={{ border: '0.5px solid var(--color-border-secondary)', borderRadius: 6, padding: '5px 10px', fontSize: 12, background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', outline: 'none', width: 140 }}
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Corps */}
      <div style={{ maxHeight: 540, overflowY: 'auto' }}>

        {/* Recherche → liste plate */}
        {search && (
          <>
            {filtered.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', fontSize: 13, color: 'var(--color-text-tertiary)' }}>Aucun résultat</div>
            ) : filtered.map(renderTxRow)}
          </>
        )}

        {/* Vue par catégorie — accordéon */}
        {!search && viewMode === 'cat' && groups && groups.map(({ cat, txs, total }) => {
          const isOpen = openCats.has(cat)
          const color = CATEGORIE_COLORS[cat as Categorie] ?? '#ccc'
          const isPositive = total >= 0
          return (
            <div key={cat} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <div
                className="tx-cat-head"
                onClick={() => toggleCat(cat)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>
                  {CATEGORIE_LABELS[cat as Categorie] ?? cat}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginRight: 12 }}>
                  {txs.length} op.
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: isPositive ? '#00b37e' : 'var(--color-text-primary)', minWidth: 100, textAlign: 'right' }}>
                  {fmt(total)}
                </span>
                <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginLeft: 10, display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                  ▾
                </span>
              </div>
              {isOpen && (
                <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                  {txs.map(renderTxRow)}
                </div>
              )}
            </div>
          )
        })}

        {/* Vue par date */}
        {!search && viewMode === 'date' && dateGroups && dateGroups.map(({ day, txs }) => (
          <div key={day} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            <div style={{ padding: '5px 14px', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', color: 'var(--color-text-tertiary)', background: 'var(--color-background-secondary)', textTransform: 'capitalize' }}>
              {fmtDayLabel(day)}
            </div>
            {txs.map(t => (
              <div
                key={t.id}
                className="tx-date-row"
                onClick={() => setTagTarget(t)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)', cursor: 'pointer' }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORIE_COLORS[t.categorie as Categorie] ?? '#ccc', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: t.categorie === 'NON_CATEGORISE' ? '#d97706' : 'var(--color-text-primary)' }}>
                    {t.libelle}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                    {CATEGORIE_LABELS[t.categorie as Categorie] ?? t.categorie}
                  </div>
                </div>
                {t.confiance !== 'haute' && (
                  <span
                    title={`Confiance ${t.confiance}`}
                    style={{ width: 6, height: 6, borderRadius: '50%', background: t.confiance === 'basse' ? '#d97706' : '#94a3b8', flexShrink: 0 }}
                  />
                )}
                <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: t.montant > 0 ? '#00b37e' : 'var(--color-text-primary)', flexShrink: 0 }}>
                  {fmt(t.montant)}
                </span>
              </div>
            ))}
          </div>
        ))}

      </div>

      {tagTarget && (
        <TagModal
          transaction={tagTarget}
          onClose={() => setTagTarget(null)}
          onSaved={() => { setTagTarget(null); router.refresh() }}
        />
      )}
    </>
  )
}
