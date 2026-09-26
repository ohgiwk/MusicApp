import { useCallback, useEffect, useRef, useState } from 'react'
import { noteFromMidi } from '../audio/pitchUtils'
import { playChime, playMelody, playNote, type MelodyHandle } from '../audio/tonePlayer'
import { Icon } from '../components/Icon'
import { MicPermissionGate } from '../components/MicPermissionGate'
import { OK_CENTS, generateMelody, scoreMelody, type MelodyScore, type PitchSample } from '../games/melodyCopy/scoring'
import { usePitchDetection, type PitchFrame } from '../hooks/usePitchDetection'
import { useVoiceRange } from '../store/settingsStore'
import { useStatsStore } from '../store/statsStore'

const NOTE_MS = 800
const COUNT_IN = 3

type Phase = 'ready' | 'listening' | 'waiting' | 'countin' | 'singing' | 'result'

export function MelodyCopyPage() {
  return (
    <MicPermissionGate>
      <MelodyCopyGame />
    </MicPermissionGate>
  )
}

function MelodyCopyGame() {
  const range = useVoiceRange()
  const record = useStatsStore((s) => s.record)
  const [level, setLevel] = useState(3)
  const [melody, setMelody] = useState(() => generateMelody(3, range.min, range.max))
  const [phase, setPhase] = useState<Phase>('ready')
  const [activeNote, setActiveNote] = useState(-1)
  const [countIn, setCountIn] = useState(0)
  const [result, setResult] = useState<MelodyScore | null>(null)

  const samples = useRef<PitchSample[]>([])
  const singStart = useRef(0)
  const finished = useRef(false)
  const playback = useRef<MelodyHandle | null>(null)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(() => () => {
    clearTimers()
    playback.current?.cancel()
  }, [])

  const listen = async () => {
    setResult(null)
    setPhase('listening')
    playback.current = playMelody(melody, NOTE_MS / 1000, setActiveNote)
    await playback.current.done
    setPhase('waiting')
  }

  const sing = () => {
    clearTimers()
    setResult(null)
    samples.current = []
    finished.current = false
    setPhase('countin')
    // メロディと同じテンポでカウントイン → 最初の音だけヒントで鳴らす
    for (let i = 0; i < COUNT_IN; i++) {
      timers.current.push(
        window.setTimeout(() => {
          setCountIn(COUNT_IN - i)
          playChime('tick')
        }, i * NOTE_MS),
      )
    }
    timers.current.push(
      window.setTimeout(() => {
        setCountIn(0)
        singStart.current = performance.now()
        setPhase('singing')
      }, COUNT_IN * NOTE_MS),
    )
  }

  const finish = useCallback(() => {
    const r = scoreMelody(melody, samples.current, NOTE_MS)
    setResult(r)
    setPhase('result')
    setActiveNote(-1)
    if (r.score >= 70) playChime('success')
    record({ melody: r.score, accuracy: r.avgAbsCents === null ? 0 : Math.round(Math.max(0, 100 - r.avgAbsCents)) }, 'melody')
  }, [melody, record])

  const onFrame = useCallback(
    (f: PitchFrame) => {
      if (phase !== 'singing' || finished.current) return
      const t = f.time - singStart.current
      samples.current.push({ t, midi: f.midi })
      const idx = Math.floor(t / NOTE_MS)
      if (idx !== activeNote && idx < melody.length) setActiveNote(idx)
      if (t > melody.length * NOTE_MS + NOTE_MS * 0.3) {
        finished.current = true
        finish()
      }
    },
    [phase, activeNote, melody.length, finish],
  )

  const { frame } = usePitchDetection({ onFrame, enabled: phase !== 'listening' })

  const nextMelody = (lv: number) => {
    clearTimers()
    setLevel(lv)
    setMelody(generateMelody(lv, range.min, range.max))
    setResult(null)
    setPhase('ready')
  }

  const now = performance.now()
  const cursorT = phase === 'singing' ? now - singStart.current : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="chip bg-sun text-sm text-white">レベル {level - 2}（{level}音）</span>
        <span className="text-sm font-bold text-ink-soft">
          {phase === 'ready' && 'まずはお手本を聞こう'}
          {phase === 'listening' && 'よく聞いてね…'}
          {phase === 'waiting' && '覚えたら「歌う」を押そう'}
          {phase === 'countin' && 'カウントのあとに歌ってね'}
          {phase === 'singing' && '歌って！'}
          {phase === 'result' && 'けっか'}
        </span>
      </div>

      <MelodyGraph
        melody={melody}
        activeNote={activeNote}
        showTargets={phase !== 'ready'}
        samples={phase === 'singing' || phase === 'result' ? samples.current : []}
        cursorT={cursorT}
        liveMidi={phase === 'waiting' || phase === 'countin' || phase === 'singing' ? frame.midi : null}
        result={result}
        countIn={phase === 'countin' ? countIn : 0}
      />

      {phase !== 'result' ? (
        <div className="flex gap-3">
          <button className="btn-soft flex-1" onClick={() => void listen()} disabled={phase === 'listening' || phase === 'countin' || phase === 'singing'}>
            <Icon name="speaker" size={20} /> {phase === 'ready' ? 'お手本を聞く' : 'もう一度聞く'}
          </button>
          <button
            className="btn-primary flex-1"
            onClick={sing}
            disabled={phase === 'ready' || phase === 'listening' || phase === 'countin' || phase === 'singing'}
          >
            <Icon name="mic" size={20} /> 歌う
          </button>
        </div>
      ) : (
        result && (
          <ResultPanel
            result={result}
            onRetry={sing}
            onListen={() => void listen()}
            onNext={() => nextMelody(result.score >= 70 ? Math.min(5, level + 1) : level)}
            levelUp={result.score >= 70 && level < 5}
          />
        )
      )}
      <button className="self-center text-xs text-ink-soft underline" onClick={() => playNote(melody[0], 0.8)}>
        最初の音だけ聞く
      </button>
    </div>
  )
}

interface GraphProps {
  melody: number[]
  activeNote: number
  showTargets: boolean
  samples: PitchSample[]
  cursorT: number | null
  liveMidi: number | null
  result: MelodyScore | null
  countIn: number
}

/** 横方向のピッチバー + 歌声の軌跡 */
function MelodyGraph({ melody, activeNote, showTargets, samples, cursorT, liveMidi, result, countIn }: GraphProps) {
  const W = 600
  const H = 300
  const padL = 44
  const padR = 34
  const lo = Math.min(...melody) - 3
  const hi = Math.max(...melody) + 3
  const totalMs = melody.length * NOTE_MS
  const x = (t: number) => padL + (t / totalMs) * (W - padL - padR)
  const y = (m: number) => H - 16 - ((m - lo) / (hi - lo)) * (H - 32)

  // 軌跡を無声区間で分割
  const paths: string[] = []
  let cur = ''
  for (const s of samples) {
    if (s.midi === null || s.t < 0 || s.t > totalMs * 1.1) {
      if (cur) paths.push(cur)
      cur = ''
      continue
    }
    const my = y(Math.max(lo - 1, Math.min(hi + 1, s.midi)))
    cur += `${cur ? 'L' : 'M'}${x(Math.min(s.t, totalMs)).toFixed(1)},${my.toFixed(1)}`
  }
  if (cur) paths.push(cur)

  const rows: number[] = []
  for (let m = Math.ceil(lo); m <= hi; m++) rows.push(m)

  return (
    <div className="card relative overflow-hidden p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none">
        {rows.map((m) => (
          <g key={m}>
            <line x1={padL} x2={W - padR} y1={y(m)} y2={y(m)} stroke="#2a2350" strokeOpacity={noteFromMidi(m).name.includes('#') ? 0.03 : 0.08} />
            {!noteFromMidi(m).name.includes('#') && (
              <text x={padL - 6} y={y(m) + 4} textAnchor="end" fontSize={11} fontWeight={700} fill="#2a2350" fillOpacity={0.35}>
                {noteFromMidi(m).label}
              </text>
            )}
          </g>
        ))}

        {melody.map((m, i) => {
          const nr = result?.notes[i]
          const color = nr ? (nr.ok ? '#22c98c' : nr.cents === null ? '#c9c3e0' : '#ff5fa2') : i === activeNote ? '#ffb020' : '#7c5cff'
          const bandH = ((OK_CENTS / 100) * (H - 32)) / (hi - lo)
          return (
            <g key={i} opacity={showTargets ? 1 : 0.25}>
              <rect x={x(i * NOTE_MS) + 3} y={y(m) - bandH} width={x(NOTE_MS) - padL - 6} height={bandH * 2} rx={bandH} fill={color} fillOpacity={0.18} />
              <rect
                x={x(i * NOTE_MS) + 3}
                y={y(m) - 4}
                width={x(NOTE_MS) - padL - 6}
                height={8}
                rx={4}
                fill={color}
                style={{ transition: 'fill 0.15s' }}
              />
              <text x={x(i * NOTE_MS) + 8} y={y(m) - 10} fontSize={14} fontWeight={800} fill={color}>
                {showTargets ? noteFromMidi(m).label : '?'}
              </text>
              {i < melody.length - 1 && (
                <line
                  x1={x((i + 1) * NOTE_MS) - 3}
                  y1={y(m)}
                  x2={x((i + 1) * NOTE_MS) + 3}
                  y2={y(melody[i + 1])}
                  stroke={color}
                  strokeOpacity={0.4}
                  strokeWidth={2}
                  strokeDasharray="3 3"
                />
              )}
            </g>
          )
        })}

        {paths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#2a2350" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.75} />
        ))}

        {cursorT !== null && cursorT <= totalMs && (
          <line x1={x(cursorT)} x2={x(cursorT)} y1={8} y2={H - 8} stroke="#ffb020" strokeWidth={3} strokeLinecap="round" />
        )}

        {liveMidi !== null && (
          <g>
            <circle cx={W - padR / 2} cy={y(Math.max(lo, Math.min(hi, liveMidi)))} r={9} fill="#ff5fa2" stroke="white" strokeWidth={3} />
          </g>
        )}
      </svg>
      {countIn > 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span key={countIn} className="animate-pop text-7xl font-extrabold text-sun drop-shadow">
            {countIn}
          </span>
        </div>
      )}
    </div>
  )
}

function ResultPanel({
  result, onRetry, onListen, onNext, levelUp,
}: { result: MelodyScore; onRetry: () => void; onListen: () => void; onNext: () => void; levelUp: boolean }) {
  const title = result.score >= 90 ? 'PERFECT!' : result.score >= 70 ? 'GREAT!' : result.score >= 40 ? 'GOOD!' : 'おしい！'
  return (
    <div className="card animate-pop flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-shine text-3xl font-extrabold">{title}</p>
          <p className="text-sm text-ink-soft">
            {result.correct} / {result.notes.length} 音正解
            {result.avgAbsCents !== null && ` ・ 平均誤差 ${Math.round(result.avgAbsCents)} cents`}
          </p>
        </div>
        <p className="text-5xl font-extrabold text-grape">
          {result.score}
          <span className="text-base text-ink-soft">点</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {result.notes.map((n, i) => (
          <div
            key={i}
            className={`flex-1 rounded-2xl px-3 py-2 text-center ${n.ok ? 'bg-mint/15 text-mint' : n.cents === null ? 'bg-cloud text-ink-soft' : 'bg-bubble/10 text-bubble'}`}
          >
            <p className="text-sm font-extrabold">{noteFromMidi(n.target).label}</p>
            <p className="text-xs font-bold">
              {n.cents === null ? '聞き取れず' : `${n.cents > 0 ? '+' : ''}${Math.round(n.cents)}c`}
            </p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <button className="btn-soft" onClick={onListen}>
          <Icon name="speaker" size={18} /> 聞き直す
        </button>
        <button className="btn-soft" onClick={onRetry}>
          <Icon name="retry" size={18} /> もう一回
        </button>
        <button className="btn-primary col-span-2 sm:col-span-1" onClick={onNext}>
          {levelUp ? 'レベルアップ！' : '次のメロディ'}
        </button>
      </div>
    </div>
  )
}
