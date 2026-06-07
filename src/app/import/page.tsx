'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Stage = 'idle' | 'reading' | 'sending' | 'analysing' | 'saving' | 'done' | 'error'
type Tab = 'releve' | 'bulletin'

const RELEVE_STAGES: { key: Stage; label: string; pct: number }[] = [
  { key: 'reading',   label: 'Lecture du PDF…',           pct: 10 },
  { key: 'sending',   label: 'Envoi à Claude…',           pct: 25 },
  { key: 'analysing', label: 'Analyse des transactions…', pct: 85 },
  { key: 'saving',    label: 'Sauvegarde en base…',       pct: 95 },
  { key: 'done',      label: 'Import terminé !',          pct: 100 },
]

const BULLETIN_STAGES: { key: Stage; label: string; pct: number }[] = [
  { key: 'reading',   label: 'Lecture du PDF…',      pct: 15 },
  { key: 'analysing', label: 'Analyse du bulletin…', pct: 80 },
  { key: 'saving',    label: 'Sauvegarde…',          pct: 95 },
  { key: 'done',      label: 'Bulletin importé !',   pct: 100 },
]

function ImportZone({
  apiField, apiRoute, stages, icon, title, hint, onDone,
}: {
  apiField: string
  apiRoute: string
  stages: { key: Stage; label: string; pct: number }[]
  icon: string
  title: string
  hint: string
  onDone: (data: Record<string, unknown>) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const animateTo = (target: number) => {
    if (animRef.current) clearInterval(animRef.current)
    animRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= target) { clearInterval(animRef.current!); return target }
        return Math.min(prev + 0.8, target)
      })
    }, 40)
  }

  useEffect(() => () => { if (animRef.current) clearInterval(animRef.current) }, [])

  const go = (s: Stage) => {
    setStage(s)
    const found = stages.find(x => x.key === s)
    if (found) animateTo(found.pct)
  }

  const handleFile = (f: File) => {
    if (f.type !== 'application/pdf') { setMessage('Seuls les fichiers PDF sont acceptés.'); return }
    setFile(f); setMessage(''); setStage('idle'); setProgress(0)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async () => {
    if (!file) return
    go('reading')
    await new Promise(r => setTimeout(r, 300))
    go('sending')
    const form = new FormData()
    form.append(apiField, file)
    const analysingTimer = setTimeout(() => go('analysing'), 1000)
    try {
      const res = await fetch(apiRoute, { method: 'POST', body: form })
      clearTimeout(analysingTimer)
      const data = await res.json()
      if (!res.ok) { setStage('error'); setProgress(0); setMessage(data.error ?? 'Erreur.'); return }
      go('saving')
      await new Promise(r => setTimeout(r, 400))
      go('done')
      onDone(data)
    } catch {
      clearTimeout(analysingTimer)
      setStage('error'); setProgress(0); setMessage('Erreur réseau.')
    }
  }

  const isRunning = ['reading', 'sending', 'analysing', 'saving'].includes(stage)
  const currentLabel = stages.find(s => s.key === stage)?.label ?? ''

  return (
    <div className="bg-white border border-[#ebebeb] rounded-2xl p-8 shadow-sm">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all mb-6 ${
          isRunning ? 'border-[#c6f0e2] bg-[#f0fdf8] cursor-default' :
          dragging   ? 'border-[#00b37e] bg-[#f0fdf8] cursor-copy' :
          file       ? 'border-[#c6f0e2] bg-[#f0fdf8] cursor-pointer' :
          'border-[#ebebeb] hover:border-[#00b37e] hover:bg-[#f0fdf8] cursor-pointer'
        }`}
        onDragOver={e => { e.preventDefault(); if (!isRunning) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { if (!isRunning) handleDrop(e) }}
        onClick={() => { if (!isRunning) inputRef.current?.click() }}
      >
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        {isRunning ? (
          <><div className="text-3xl mb-3 animate-pulse">⚙️</div>
            <p className="text-[14px] font-semibold text-[#00b37e]">{currentLabel}</p>
            <p className="text-[12px] text-[#999] mt-1">{file?.name}</p></>
        ) : stage === 'done' ? (
          <><div className="text-3xl mb-3">✅</div>
            <p className="text-[14px] font-semibold text-[#00b37e]">Import terminé !</p></>
        ) : file ? (
          <><div className="text-3xl mb-3">📄</div>
            <p className="text-[14px] font-semibold text-[#111]">{file.name}</p>
            <p className="text-[12px] text-[#999] mt-1">{(file.size / 1024).toFixed(0)} Ko · Cliquer pour changer</p></>
        ) : (
          <><div className="text-3xl mb-3">{icon}</div>
            <p className="text-[14px] font-semibold text-[#111]">{title}</p>
            <p className="text-[12px] text-[#999] mt-1">Glisser-déposer ou cliquer</p>
            <p className="text-[11px] text-[#ccc] mt-2">{hint}</p></>
        )}
      </div>

      {(isRunning || stage === 'done') && (
        <div className="mb-6">
          <div className="flex justify-between mb-1.5">
            <span className="text-[12px] text-[#999]">{currentLabel || 'Terminé'}</span>
            <span className="text-[12px] font-semibold tabular-nums text-[#00b37e]">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-[#f2f2f2] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: '#00b37e' }} />
          </div>
          <div className="flex justify-between mt-3">
            {stages.filter(s => s.key !== 'done').map(s => (
              <div key={s.key} className="flex flex-col items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${progress >= s.pct ? 'bg-[#00b37e]' : 'bg-[#e5e5e5]'}`} />
                <span className="text-[10px] text-[#bbb] whitespace-nowrap">{s.label.replace('…', '')}</span>
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
        disabled={!file || isRunning || stage === 'done'}
        className="w-full bg-[#00b37e] text-white rounded-xl py-3.5 text-[14px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isRunning ? currentLabel : stage === 'done' ? '✅ Importé' : '✦ Analyser avec Claude'}
      </button>
      {!isRunning && stage === 'idle' && (
        <p className="text-center text-[11px] text-[#ccc] mt-4">Traitement local · ~15–30 secondes</p>
      )}
    </div>
  )
}

export default function ImportPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('releve')

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

        <div className="bg-white border-b border-[#ebebeb] px-7 flex gap-1">
          {([['releve', '🏦 Relevé bancaire'], ['bulletin', '📋 Bulletin de salaire']] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors -mb-px ${
                tab === key ? 'border-[#00b37e] text-[#00b37e]' : 'border-transparent text-[#999] hover:text-[#111]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-lg">
            {tab === 'releve' ? (
              <>
                <h2 className="text-[20px] font-bold tracking-[-0.4px] mb-1.5">Nouveau relevé</h2>
                <p className="text-[13px] text-[#999] mb-7">Relevé PDF Crédit Agricole — Claude extrait et catégorise toutes les transactions.</p>
                <ImportZone
                  apiField="releve" apiRoute="/api/parse-pdf"
                  stages={RELEVE_STAGES} icon="🏦"
                  title="Relevé bancaire PDF" hint="Crédit Agricole · PDF uniquement"
                  onDone={data => {
                    const d = data as { releve?: { id: string; transactions: unknown[] } }
                    setTimeout(() => router.push(`/?releve=${d.releve?.id}`), 1500)
                  }}
                />
              </>
            ) : (
              <>
                <h2 className="text-[20px] font-bold tracking-[-0.4px] mb-1.5">Bulletin de salaire</h2>
                <p className="text-[13px] text-[#999] mb-7">Claude extrait brut fixe, variable, cotisations et net à payer.</p>
                <ImportZone
                  apiField="bulletin" apiRoute="/api/parse-bulletin"
                  stages={BULLETIN_STAGES} icon="📋"
                  title="Bulletin de salaire PDF" hint="Seres Technologies · PDF uniquement"
                  onDone={() => { setTimeout(() => router.push('/'), 1500) }}
                />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
