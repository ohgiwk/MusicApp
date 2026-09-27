import { useEffect, useRef, useState, type ReactNode } from 'react'
import { noteFromMidi } from '../audio/pitchUtils'
import { Icon } from '../components/Icon'
import { MicPermissionGate } from '../components/MicPermissionGate'
import { RankBadge } from '../components/RankBadge'
import { ResultModal } from '../components/ResultModal'
import { VoiceFlightEngine, type FlightStats } from '../games/voiceFlight/engine'
import { useAnimationFrame } from '../hooks/useAnimationFrame'
import { usePitchDetection } from '../hooks/usePitchDetection'
import { DifficultyChip, DifficultySelect } from '../components/DifficultySelect'
import { DIFFICULTY_LABELS, FLIGHT_LEVELS } from '../games/difficulty'
import { useDifficulty, useVoiceRange } from '../store/settingsStore'
import { fromVoiceFlight } from '../games/abilityScoring'
import { useScoreStore, type RankResult } from '../store/scoreStore'
import { useStatsStore } from '../store/statsStore'

const DURATION_MS = 60_000
const CALIBRATION_SAMPLES = 50

type Phase = 'intro' | 'calibrate' | 'countdown' | 'play' | 'result'

export function VoiceFlightPage() {
  return (
    <MicPermissionGate>
      <VoiceFlightGame />
    </MicPermissionGate>
  )
}

function VoiceFlightGame() {
  const range = useVoiceRange()
  const difficulty = useDifficulty('flight')
  const level = FLIGHT_LEVELS[difficulty]
  /** 画面の高さに割り当てる音域 (中心から ±半音) */
  const HALF_WINDOW = level.halfWindow
  const recordPlay = useStatsStore((s) => s.recordPlay)
  const addScore = useScoreStore((s) => s.addScore)
  const [rank, setRank] = useState<RankResult | null>(null)
  const [phase, setPhase] = useState<Phase>('intro')
  const [center, setCenter] = useState(() => Math.round((range.min + range.max) / 2))
  const [calib, setCalib] = useState(0)
  const [count, setCount] = useState(3)
  const [hud, setHud] = useState<FlightStats | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<VoiceFlightEngine | null>(null)
  const calibSamples = useRef<number[]>([])
  const hudTimer = useRef(0)
  const countdownId = useRef(0)
  // setState 反映前に次フレームが来ても二重に遷移しないよう、ループ内では ref で判定する
  const phaseRef = useRef<Phase>('intro')
  phaseRef.current = phase

  // ボイスフライトは操作感重視: 平滑化は軽めにして、キャラ側の追従で滑らかにする
  const { frameRef } = usePitchDetection({
    reactive: false,
    enabled: phase !== 'result',
    smoothing: { timeConstantMs: 25, medianSize: 3 },
  })

  const newEngine = (c: number) => {
    const e = new VoiceFlightEngine({ lowMidi: c - HALF_WINDOW, highMidi: c + HALF_WINDOW, durationMs: DURATION_MS, level })
    const el = containerRef.current
    if (el) e.resize(el.clientWidth, el.clientHeight)
    engineRef.current = e
    setHud({ ...e.stats })
  }

  // Canvas を親要素サイズ + devicePixelRatio に追従させる
  useEffect(() => {
    const el = containerRef.current
    const canvas = canvasRef.current
    if (!el || !canvas) return
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = el.clientWidth * dpr
      canvas.height = el.clientHeight * dpr
      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
      engineRef.current?.resize(el.clientWidth, el.clientHeight)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    newEngine(center)
    return () => window.clearInterval(countdownId.current)
  }, [])

  useAnimationFrame((dt) => {
    const e = engineRef.current
    const ctx = canvasRef.current?.getContext('2d')
    if (!e || !ctx) return
    const f = frameRef.current

    if (phaseRef.current === 'calibrate' && f.rawMidi !== null) {
      calibSamples.current.push(f.rawMidi)
      setCalib(calibSamples.current.length / CALIBRATION_SAMPLES)
      if (calibSamples.current.length >= CALIBRATION_SAMPLES) {
        const sorted = [...calibSamples.current].sort((a, b) => a - b)
        const c = Math.round(sorted[sorted.length >> 1])
        setCenter(c)
        newEngine(c)
        startCountdown()
      }
    }

    if (phaseRef.current === 'play') {
      e.update(dt, f.midi)
      hudTimer.current += dt
      if (hudTimer.current > 100 || e.stats.finished) {
        hudTimer.current = 0
        setHud({ ...e.stats })
      }
      if (e.stats.finished) {
        const s = e.stats
        const total = s.hits + s.misses
        recordPlay('flight', fromVoiceFlight(s))
        setRank(addScore('flight', difficulty, s.score, `${s.hits}/${total} ゲート・最大${s.maxCombo}コンボ`))
        phaseRef.current = 'result'
        setPhase('result')
      }
    }
    e.draw(ctx, f.midi)
  })

  const startCountdown = () => {
    phaseRef.current = 'countdown'
    setPhase('countdown')
    setCount(3)
    let n = 3
    window.clearInterval(countdownId.current)
    countdownId.current = window.setInterval(() => {
      n--
      if (n <= 0) {
        window.clearInterval(countdownId.current)
        setPhase('play')
      } else setCount(n)
    }, 700)
  }

  const startCalibration = () => {
    calibSamples.current = []
    setCalib(0)
    setPhase('calibrate')
  }

  const retry = () => {
    newEngine(center)
    startCountdown()
  }

  const s = hud
  const total = s ? s.hits + s.misses : 0

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="chip bg-white text-base text-ink tabular-nums">
          <Icon name="trophy" size={16} className="text-sun" /> {s?.score ?? 0}
        </span>
        <span className={`chip text-base tabular-nums ${s && s.combo >= 3 ? 'bg-bubble text-white' : 'bg-white text-ink'}`}>
          {s?.combo ?? 0} コンボ
        </span>
        <span className="chip bg-white text-base text-ink tabular-nums">
          残り {Math.ceil((s?.remainingMs ?? DURATION_MS) / 1000)} 秒
        </span>
      </div>

      <div
        ref={containerRef}
        className="card relative h-[62vh] min-h-[320px] max-h-[560px] touch-none overflow-hidden !bg-transparent"
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {phase === 'intro' && (
          <Overlay>
            <div className="grid h-16 w-16 place-items-center rounded-full bg-sky text-white">
              <Icon name="rocket" size={36} />
            </div>
            <h2 className="text-2xl font-extrabold">声で空を飛ぼう！</h2>
            <p className="leading-relaxed text-ink-soft">
              声を<b className="text-bubble">高く</b>すると上へ、<b className="text-sky">低く</b>すると下へ。
              <br />
              ゲートの隙間（☆）をくぐってポイントを集めよう。
            </p>
            <DifficultySelect game="flight" />
            <button className="btn-primary w-full max-w-xs text-lg" onClick={startCalibration}>
              <Icon name="play" size={18} /> はじめる
            </button>
          </Overlay>
        )}

        {phase === 'calibrate' && (
          <Overlay>
            <h2 className="text-xl font-extrabold">楽な高さで「あー」と声を出してね</h2>
            <p className="text-sm text-ink-soft">その高さが画面の真ん中になります</p>
            <div className="h-4 w-full max-w-xs overflow-hidden rounded-full bg-cloud">
              <div className="h-full rounded-full bg-sky transition-[width]" style={{ width: `${Math.min(1, calib) * 100}%` }} />
            </div>
            <button
              className="btn-soft text-sm"
              onClick={() => {
                const c = Math.round((range.min + range.max) / 2)
                setCenter(c)
                newEngine(c)
                startCountdown()
              }}
            >
              スキップ（{noteFromMidi(Math.round((range.min + range.max) / 2)).label} を中心にする）
            </button>
          </Overlay>
        )}

        {phase === 'countdown' && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span key={count} className="animate-pop text-8xl font-extrabold text-grape drop-shadow">
              {count}
            </span>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-ink-soft">
        <DifficultyChip game="flight" /> 音域: {noteFromMidi(center - HALF_WINDOW).label} 〜 {noteFromMidi(center + HALF_WINDOW).label}（中心 {noteFromMidi(center).label}）
        {phase === 'play' || phase === 'result' ? (
          <button className="ml-2 underline" onClick={startCalibration}>
            中心を測り直す
          </button>
        ) : null}
      </p>

      {phase === 'result' && s && (
        <ResultModal
          title={s.hits / Math.max(1, total) >= 0.8 ? 'GREAT FLIGHT!' : 'NICE FLIGHT!'}
          subtitle={`${DIFFICULTY_LABELS[difficulty]}・${s.hits} / ${total} ゲート通過`}
          score={s.score}
          onRetry={retry}
          onChangeDifficulty={() => {
            newEngine(center)
            setPhase('intro')
          }}
          badge={<RankBadge result={rank} game="flight" />}
        >
          <div className="grid grid-cols-3 gap-2 text-center">
            <Mini label="PERFECT" value={s.perfects} />
            <Mini label="最大コンボ" value={s.maxCombo} />
            <Mini label="ミス" value={s.misses} />
          </div>
        </ResultModal>
      )}
    </div>
  )
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-white/75 p-5 backdrop-blur-sm">
      <div className="flex min-h-full flex-col items-center justify-center gap-4 text-center">{children}</div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-cloud p-2">
      <p className="text-[10px] font-bold text-ink-soft">{label}</p>
      <p className="text-xl font-extrabold">{value}</p>
    </div>
  )
}
