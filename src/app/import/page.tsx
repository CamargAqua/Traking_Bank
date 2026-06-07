'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Stage = 'idle' | 'reading' | 'analysing' | 'saving' | 'done' | 'error'

const STAGES: { key: Stage; label: string; pct: number }[] = [
  { key: 'reading',   label: 'Lecture des PDF…',            pct: 10 },
  { key: 'analysing', label: 'Analyse avec Claude…',        pct: 80 },
  { key: 'saving',    label: 'Sauvegarde en base…',         pct: 95 },
  { key: 'done',      label: 'Import terminé !',            pct: 100 },
]

function DropZone({
  label, hint, file, onFile, disabled, secondary,
}: {
  label: string
  hint: string
  file: File | null
  onFile: (f: File) => void
  disabled: boolean
  secondary?: boolean
}) {
  const [dragging, setDragging] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.type === 'application/pdf') onFile(f)
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl text-center transition-all cursor-pointer ${
        secondary ? 'p-4' : 'p-7'
      } ${
        disabled   ? 'border-[#e5e5e5] bg-[#fafafa] cursor-default' :
        dragging   ? 'border-[#00b37e] bg-[#f0fdf8]' :
        file       ? 'border-[#c6f0e2] bg-[#f0fdf8]' :
        'border-[#ebebeb] hover:border-[#00b37e] hover:bg-[#f0fdf8]'
      }`}
      onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { if (!disabled) handleDrop(e) }}
      onClick={() => { if (!disabled) ref.current?.click() }}
    >
      <input ref={ref} type="file" accept="application/pdf" className="hidden"
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
      {file ? (
        <div className={`flex items-center gap-2 justify-center ${secondary ? '' : 'flex-col'}`}>
          <span className={secondary ? 'text-base' : 'text-2xl mb-1'}>📄</span>
          <div>
            <p className={`font-semibold text-[#111] ${secondary ? 'text-[12.5px]' : 'text-[14px]'}`}>{file.name}</p>
            <p className="text-[11px] text-[#999]">{(file.size / 1024).toFixed(0)} Ko · cliquer pour changer</p>
          </div>
        </div>
      ) : (
        <>
          <div className={secondary ? 'text-xl mb-1' : 'text-3xl mb-2'}>{secondary ? '📋' : '🏦'}</div>
          <p className={`font-semibold text-[#111] ${secondary ? 'text-[12.5px]' : 'text-[14px]'}`}>{label}</p>
          <p className="text-[11.5px] text-[#999] mt-0.5">{hint}</p>
        </>
      )}
    </div>
  )
}

export default function ImportPage() {
  const router = useRouter()
  const [releve, setReleve] = useState<File | null>(null)
  const [bulletin, setBulletin] = useState<File | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [reconciliation, setReconciliation] = useState<{ match: boolean; netBulletin: number; netReleve: number } | null>(null)
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const animateTo = (target: number) => {
    if (animRef.current) clearInterval(animRef.current)
    animRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= target) { clearInterval(animRef.current!); return target }
        return Math.min(prev + 1, target)
      })
    }, 40)
  }

  useEffect(() => () => { if (animRef.current) clearInterval(animRef.current) }, [])

  const go = (s: Stage) => {
    setStage(s)
    const found = STAGES.find(x => x.key === s)
    if (found) animateTo(found.pct)
  }

  const handleSubmit = async () => {
    if (!releve) return
    go('reading')
    await new Promise(r => setTimeout(r, 400))
    go('analysing')

    const form = new FormData()
    form.append('releve', releve)
    if (bulletin) form.append('bulletin', bulletin)

    try {
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) { setStage('error'); setProgress(0); setMessage(data.error ?? 'Erreur.'); return }

      go('saving')
      await new Promise(r => setTimeout(r, 300))
      go('done')

      const txCount = data.releve?.transactions?.length ?? 0
      setMessage(`${txCount} transactions importées.`)
      if (data.reconciliation) setReconciliation(data.reconciliation)

      setTimeout(() => router.push(`/?releve=${data.releve?.id}`), 2500)
    } catch {
      setStage('error'); setProgress(0); setMessage('Erreur réseau.')
    }
  }

  const isRunning = ['reading', 'analysing', 'saving'].includes(stage)
  const currentLabel = STAGES.find(s => s.key === stage)?.label ?? ''
  const fmtAmount = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  return (
    <div className="flex min-h-screen">
      <aside className="w-[210px] bg-white border-r border-[#ebebeb] flex flex-col sticky top-0 h-screen shrink-0">
        <div className="px-5 py-5 border-b border-[#f2f2f2] flex items-center gap-2">
          <div className="w-7 h-7 bg-[#f0fdf8] border border-[#c6f0e2] rounded-lg flex items-center justify-center text-[11px] font-bold text-[#00b37e]">VM</div>
          <span className="text-[15px] font-bold tracking-[-0.3px]">mes<span className="text-[#00b37e]">finances</span></span>
        </div>
        <nav className="px-2.5 py-3">
          <Link href="/" className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] font-medium text-[#999] hover:bg-[#f7f7f5] hover:text-[#111] transition-all mb-0.5">
            <span className="w-4 text-center opacity-70">▦</span> Dashboard
          </Link>
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] font-semibold bg-[#f0fdf8] text-[#00b37e] mb-0.5">
            <span className="w-4 text-center opacity-70">↑</span> Import PDF
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="bg-white border-b border-[#ebebeb] px-7 py-3.5">
          <h1 className="text-[16px] font-bold tracking-[-0.3px]">Importer un document</h1>
        </div>

        <div className="flex-1 flex items-start justify-center p-8">
          <div className="w-full max-w-lg">

            {stage !== 'done' ? (
              <>
                <h2 className="text-[20px] font-bold tracking-[-0.4px] mb-1.5">Nouveau relevé</h2>
                <p className="text-[13px] text-[#999] mb-6">
                  Importez le relevé bancaire PDF. Ajoutez le bulletin de salaire pour que Claude vérifie que le montant reçu correspond au net.
                </p>

                {/* Relevé (requis) */}
                <div className="mb-3">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#bbb] mb-1.5 block">
                    Relevé bancaire <span className="text-[#e53e3e]">*</span>
                  </label>
                  <DropZone
                    label="Relevé Crédit Agricole PDF"
                    hint="Glisser-déposer ou cliquer · PDF uniquement"
                    file={releve}
                    onFile={setReleve}
                    disabled={isRunning}
                  />
                </div>

                {/* Bulletin (optionnel) */}
                <div className="mb-6">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#bbb] mb-1.5 flex items-center gap-2">
                    Bulletin de salaire
                    <span className="text-[10px] font-normal normal-case tracking-normal text-[#bbb] bg-[#f5f5f5] px-1.5 py-0.5 rounded">optionnel</span>
                  </label>
                  <DropZone
                    label="Bulletin Seres Technologies"
                    hint="Pour vérifier que le net à payer correspond"
                    file={bulletin}
                    onFile={setBulletin}
                    disabled={isRunning}
                    secondary
                  />
                  {bulletin && (
                    <p className="text-[11.5px] text-[#00b37e] mt-1.5">
                      ✓ Cross-validation activée — Claude comparera le net bulletin avec le virement reçu
                    </p>
                  )}
                </div>

                {/* Progress */}
                {isRunning && (
                  <div className="mb-5">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[12px] text-[#999]">{currentLabel}</span>
                      <span className="text-[12px] font-semibold text-[#00b37e] tabular-nums">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-[#f2f2f2] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${progress}%`, background: '#00b37e' }} />
                    </div>
                    <div className="flex justify-between mt-2">
                      {STAGES.filter(s => s.key !== 'done').map(s => (
                        <div key={s.key} className="flex flex-col items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${progress >= s.pct ? 'bg-[#00b37e]' : 'bg-[#e5e5e5]'}`} />
                          <span className="text-[10px] text-[#bbb] whitespace-nowrap">{s.label.replace('…','')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stage === 'error' && message && (
                  <div className="rounded-xl px-4 py-3 mb-5 text-[13px] font-medium bg-[#fff5f5] text-[#e53e3e] border border-[#fecaca]">
                    {message}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!releve || isRunning}
                  className="w-full bg-[#00b37e] text-white rounded-xl py-3.5 text-[14px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isRunning ? currentLabel : `✦ Analyser avec Claude${bulletin ? ' + vérifier bulletin' : ''}`}
                </button>
                {!isRunning && (
                  <p className="text-center text-[11px] text-[#ccc] mt-3">
                    {bulletin ? 'Relevé + bulletin · ~20–40 secondes' : 'Relevé seul · ~15–30 secondes'}
                  </p>
                )}
              </>
            ) : (
              /* Done state */
              <div className="bg-white border border-[#ebebeb] rounded-2xl p-8 text-center">
                <div className="text-4xl mb-4">✅</div>
                <h2 className="text-[18px] font-bold mb-2">Import terminé !</h2>
                <p className="text-[13px] text-[#999] mb-5">{message}</p>

                {reconciliation && (
                  <div className={`rounded-xl px-4 py-3 mb-5 border text-left ${
                    reconciliation.match
                      ? 'bg-[#f0fdf8] border-[#c6f0e2]'
                      : 'bg-[#fffbeb] border-[#fde68a]'
                  }`}>
                    <p className={`text-[13px] font-semibold mb-1 ${reconciliation.match ? 'text-[#00b37e]' : 'text-[#d97706]'}`}>
                      {reconciliation.match ? '✓ Salaire conforme au bulletin' : '⚠ Écart détecté avec le bulletin'}
                    </p>
                    <div className="flex gap-6 text-[12px] text-[#555]">
                      <span>Net bulletin : <strong>{fmtAmount(reconciliation.netBulletin)}</strong></span>
                      <span>Reçu banque : <strong>{fmtAmount(reconciliation.netReleve)}</strong></span>
                    </div>
                  </div>
                )}

                <p className="text-[12px] text-[#bbb]">Redirection vers le dashboard…</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
