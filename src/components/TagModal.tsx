'use client'
import { useState } from 'react'
import { CATEGORIES, CATEGORIE_LABELS } from '@/lib/categories'
import type { Transaction } from '@prisma/client'

interface TagModalProps {
  transaction: Transaction
  onClose: () => void
  onSaved: () => void
}

export function TagModal({ transaction, onClose, onSaved }: TagModalProps) {
  const [categorie, setCategorie] = useState(transaction.categorie)
  const [memoriser, setMemoriser] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/transactions/${transaction.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categorie,
        memoriser,
        pattern: transaction.libelle.split(' ').slice(0, 3).join(' '),
      }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl border border-[#ebebeb] p-7 w-[460px] shadow-xl">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-[17px] font-bold tracking-[-0.3px]">Catégoriser</h2>
            <p className="text-[12px] text-[#999] mt-0.5">{transaction.libelleRaw}</p>
          </div>
          <button onClick={onClose} className="text-[#bbb] hover:text-[#111] text-lg transition-colors">✕</button>
        </div>

        <div className="mb-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-2">Montant</div>
          <div className={`text-[22px] font-bold tabular-nums ${transaction.montant >= 0 ? 'text-[#00b37e]' : 'text-[#e53e3e]'}`}>
            {transaction.montant >= 0 ? '+' : ''}{transaction.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </div>
        </div>

        <div className="mb-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-2">Catégorie</div>
          <select
            value={categorie}
            onChange={e => setCategorie(e.target.value)}
            className="w-full border border-[#ebebeb] rounded-lg px-3 py-2.5 text-[13px] bg-[#fafafa] outline-none focus:border-[#ccc] focus:bg-white transition-all"
          >
            {CATEGORIES.filter(c => c !== 'NON_CATEGORISE').map(c => (
              <option key={c} value={c}>{CATEGORIE_LABELS[c]}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2.5 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={memoriser}
            onChange={e => setMemoriser(e.target.checked)}
            className="w-4 h-4 accent-[#00b37e]"
          />
          <span className="text-[12.5px] text-[#555]">
            Mémoriser pour les prochains mois
          </span>
        </label>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-[#ebebeb] rounded-lg py-2.5 text-[13px] font-medium text-[#999] hover:text-[#111] hover:border-[#ddd] transition-all"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#00b37e] text-white rounded-lg py-2.5 text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Sauvegarde…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
