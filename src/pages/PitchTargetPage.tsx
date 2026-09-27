import { useCallback, useRef, useState } from 'react'
import { centsBetween, foldOctave, midiToFreq, noteFromMidi } from '../audio/pitchUtils'
import { playChime, playNote } from '../audio/tonePlayer'
import { Icon } from '../components/Icon'
import { MicPermissionGate } from '../components/MicPermissionGate'
import { RankBadge } from '../components/RankBadge'
import { ResultModal } from '../components/ResultModal'
import {
  GRADE_STYLE,
  VIEW_RANGE_CENTS,
  centsToView,
  gradeOf,
  pickTarget,
  summarize,
  type Grade,
} from '../games/pitchTarget/grading'
import { usePitchDetection, type PitchFrame } from '../hooks/usePitchDetection'
import { DifficultyChip, DifficultySelect } from '../components/DifficultySelect'
import { DIFFICULTY_LABELS, TARGET_LEVELS } from '../games/difficulty'
import { useDifficulty, useVoiceRange } from '../store/settingsStore'
import { fromPitchTarget } from '../games/abilityScoring'
import { useScoreStore, type RankResult } from '../store/scoreStore'
import { useStatsStore } from '../store/statsStore'

const ROUNDS = 5
const TONE_SEC = 1.2
const TRAIL_LEN = 50

type Phase = 'intro' | 'play' | 'clear' | 'result'

interface RoundResult {
  target: number
  grade: Grade | 'SKIP'
  meanAbs: number
  stdDev: number
  /** クリアまでの時間 (ms)。スキップなら null */
  clearMs: number | null
}

export function PitchTargetPage() {
  return (
    <MicPermissionGate>
      <PitchTargetGame />
    </MicPermissionGate>
  )
}

interface TargetView {
  cents: number | null
  hold: number
  trail: (number | null)[]
  /** お手本の再生が終わり、判定中か */
  listening: boolean
}

const EMPTY_VIEW: TargetView = { cents: null, hold: 0, trail: [], listening: false }

function PitchTargetGame() {
  const range = useVoiceRange()
  const difficulty = useDifficulty('target')
  const level = TARGET_LEVELS[difficulty]
  const HIT_RANGE = level.hitRange
  const HOLD_MS = level.holdMs
  const recordPlay = useStatsStore((s) => s.recordPlay)
  const addScore = useScoreStore((s) => s.addScore)
  const [rank, setRank] = useState<RankResult | null>(null)
  const [phase, setPhase] = useState<Phase>('intro')
  const [round, setRound] = useState(0)
  const [target, setTarget] = useState(() => pickTarget(range.min, range.max, level))
  const [results, setResults] = useState<RoundResult[]>([])
  const [lastGrade, setLastGrade] = useState<Grade | null>(null)

  /** 画面表示用のスナップショット (毎フレーム onFrame から更新。レンダー中に ref を読まないため) */
  const [view, setView] = useState<TargetView>(EMPTY_VIEW)

  // 毎フレーム更新するゲーム状態は ref で持つ
  const g = useRef({
    hold: 0, // 0〜1
    inZoneSamples: [] as number[],
    startedAt: 0,
    listenAfter: 0,
    trail: [] as (number | null)[],
    cents: null as number | null,
    lastTime: 0,
    done: false,
  })

  const playReference = useCallback(() => {
    playNote(target, TONE_SEC)
    // お手本の音をマイクが拾って自動クリアしないよう、再生中は判定を止める
    g.current.listenAfter = performance.now() + TONE_SEC * 1000 + 250
  }, [target])

  const startRound = useCallback((t: number) => {
    Object.assign(g.current, {
      hold: 0,
      inZoneSamples: [],
      trail: [],
      cents: null,
      startedAt: performance.now(),
      done: false,
    })
    setTarget(t)
    setLastGrade(null)
    setView(EMPTY_VIEW)
    setPhase('play')
    playNote(t, TONE_SEC)
    g.current.listenAfter = performance.now() + TONE_SEC * 1000 + 250
  }, [])

  const finishRound = useCallback(
    (res: RoundResult) => {
      const all = [...results, res]
      setResults(all)
      if (all.length >= ROUNDS) {
        const pts = all.reduce((a, r) => a + (r.grade === 'SKIP' ? 0 : GRADE_STYLE[r.grade].points), 0) / ROUNDS
        recordPlay(
          'target',
          fromPitchTarget(
            all.map((r) =>
              r.grade === 'SKIP'
                ? { meanAbs: null, stdDev: null, clearMs: null }
                : { meanAbs: r.meanAbs, stdDev: r.stdDev, clearMs: r.clearMs },
            ),
          ),
        )
        const perfects = all.filter((r) => r.grade === 'PERFECT').length
        setRank(addScore('target', difficulty, Math.round(pts), `${range.label}・PERFECT ×${perfects}`))
        window.setTimeout(() => setPhase('result'), res.grade === 'SKIP' ? 0 : 1100)
      } else {
        window.setTimeout(
          () => {
            setRound((r) => r + 1)
            startRound(pickTarget(range.min, range.max, level, res.target))
          },
          res.grade === 'SKIP' ? 0 : 1100,
        )
      }
    },
    [results, recordPlay, addScore, startRound, range.min, range.max, range.label, difficulty, level],
  )

  const onFrame = useCallback(
    (f: PitchFrame) => {
      const s = g.current
      const now = f.time
      const cents = f.freq !== null ? centsBetween(f.freq, midiToFreq(target)) : null
      s.cents = cents
      s.trail.unshift(cents)
      if (s.trail.length > TRAIL_LEN) s.trail.pop()
      const dt = s.lastTime ? Math.min(50, now - s.lastTime) : 16
      s.lastTime = now
      const publish = () => setView({ cents, hold: s.hold, trail: s.trail.slice(), listening: now >= s.listenAfter })
      if (phase !== 'play' || s.done || now < s.listenAfter) {
        publish()
        return
      }

      if (cents !== null && Math.abs(cents) <= HIT_RANGE) {
        s.hold = Math.min(1, s.hold + dt / HOLD_MS)
        s.inZoneSamples.push(cents)
      } else {
        // 外れたらゆっくり減る (一瞬のブレで全部失わないように)
        s.hold = Math.max(0, s.hold - dt / (HOLD_MS * (cents === null ? 3 : 1.5)))
      }

      publish()
      if (s.hold >= 1) {
        s.done = true
        const st = summarize(s.inZoneSamples.slice(-90))
        const grade = gradeOf(st, now - s.startedAt)
        setLastGrade(grade)
        setPhase('clear')
        playChime('success')
        finishRound({ target, grade, ...st, clearMs: now - s.startedAt })
      }
    },
    [phase, target, finishRound, HIT_RANGE, HOLD_MS],
  )

  const { frame } = usePitchDetection({ onFrame, enabled: phase !== 'result' })

  const restart = () => {
    setRank(null)
    setResults([])
    setRound(0)
    startRound(pickTarget(range.min, range.max, level))
  }

  const backToIntro = () => {
    setRank(null)
    setResults([])
    setRound(0)
    setPhase('intro')
  }

  const totalScore = Math.round(
    results.reduce((a, r) => a + (r.grade === 'SKIP' ? 0 : GRADE_STYLE[r.grade].points), 0) / ROUNDS,
  )
  const label = noteFromMidi(target).label

  if (phase === 'intro') {
    return (
      <div className="card flex flex-col items-center gap-4 p-6 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-bubble text-white">
          <Icon name="target" size={44} />
        </div>
        <h2 className="text-2xl font-extrabold">声でターゲットを射抜け！</h2>
        <p className="leading-relaxed text-ink-soft">
          お手本の音を聞いて、同じ高さの声を出そう。
          <br />
          光るゾーン（±{HIT_RANGE} cents）に声を <b>{HOLD_MS / 1000}秒</b> キープでクリア！
        </p>
        <p className="text-sm text-ink-soft">
          全{ROUNDS}問 / 声の高さ: {range.label}（{range.sub}）
        </p>
        <DifficultySelect game="target" />
        <button
          className="btn-primary w-full max-w-xs text-lg"
          onClick={() => {
            setResults([])
            setRound(0)
            startRound(pickTarget(range.min, range.max, level))
          }}
        >
          <Icon name="play" size={18} /> スタート
        </button>
      </div>
    )
  }

  const s = view
  const { cents, listening } = view
  const inZone = cents !== null && Math.abs(cents) <= HIT_RANGE
  const out = cents !== null && Math.abs(cents) > VIEW_RANGE_CENTS
  const hint = !listening
    ? 'お手本を聞いてね…'
    : cents === null
      ? '声を出してください'
      : inZone
        ? 'キープ！'
        : Math.abs(cents) > 900 && Math.abs(foldOctave(cents)) < 150
          ? cents > 0
            ? '1オクターブ上かも？ 低く！'
            : '1オクターブ下かも？ 高く！'
          : cents > 0
            ? cents > 100
              ? 'もっと下！'
              : 'もう少し下'
            : cents < -100
              ? 'もっと上！'
              : 'もう少し上'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {Array.from({ length: ROUNDS }, (_, i) => {
            const r = results[i]
            return (
              <span
                key={i}
                className={`h-3 w-7 rounded-full ${i === round && !r ? 'bg-grape/50' : 'bg-cloud'}`}
                style={r ? { background: r.grade === 'SKIP' ? '#c9c3e0' : GRADE_STYLE[r.grade].color } : undefined}
              />
            )
          })}
        </div>
        <span className="flex items-center gap-1.5">
          <DifficultyChip game="target" />
          <span className="chip bg-white text-ink">
            {round + 1} / {ROUNDS}
          </span>
        </span>
      </div>

      <div className="text-center">
        <p className="text-3xl font-extrabold sm:text-4xl">
          <span className="text-bubble">{label}</span> を狙え！
        </p>
        <p className={`mt-1 h-6 font-bold ${inZone ? 'text-mint' : 'text-ink-soft'}`}>{hint}</p>
      </div>

      {/* ステージ */}
      <div className="card relative h-[48vh] min-h-[300px] max-h-[440px] overflow-hidden bg-gradient-to-b from-[#fff0f7] via-white to-[#eaf8ff]">
        {/* 半音ごとのガイド線 */}
        {[-300, -200, -100, 100, 200, 300].map((c) => (
          <div
            key={c}
            className="absolute inset-x-0 border-t border-dashed border-ink/10"
            style={{ top: `${50 - centsToView(c) * 50}%` }}
          >
            <span className="absolute right-2 -translate-y-1/2 bg-white/70 px-1 text-[10px] font-bold text-ink/35">
              {noteFromMidi(target + c / 100).label}
            </span>
          </div>
        ))}
        {/* 正解ゾーン */}
        <div
          className={`absolute inset-x-0 transition-colors ${inZone ? 'bg-mint/30' : 'bg-bubble/10'}`}
          style={{ top: `${50 - centsToView(HIT_RANGE) * 50}%`, bottom: `${50 - centsToView(HIT_RANGE) * 50}%` }}
        />
        {/* ターゲットライン */}
        <div className={`absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 ${inZone ? 'bg-mint' : 'bg-bubble'}`} />
        <span
          className={`absolute left-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-sm font-extrabold text-white shadow ${inZone ? 'bg-mint' : 'bg-bubble'}`}
        >
          {label}
        </span>

        {/* 軌跡 */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {s.trail.map((c, i) =>
            c === null || i % 2 ? null : (
              <circle
                key={i}
                cx={62 - i * 1.1}
                cy={50 - centsToView(c) * 50}
                r={0.9}
                fill={Math.abs(c) <= HIT_RANGE ? '#22c98c' : '#7c5cff'}
                opacity={1 - i / TRAIL_LEN}
                vectorEffect="non-scaling-stroke"
              />
            ),
          )}
        </svg>

        {/* 自分の声 */}
        {cents !== null && frame.voiced && (
          <div
            className="absolute left-[62%] -translate-x-1/2 -translate-y-1/2"
            style={{ top: `${50 - centsToView(cents) * 50}%` }}
          >
            <HoldRing progress={s.hold} color={inZone ? '#22c98c' : cents > 0 ? '#ff5fa2' : '#22b8e8'} />
            {out && (
              <span
                className="absolute left-1/2 -translate-x-1/2 text-2xl font-extrabold text-ink/60"
                style={{ top: cents > 0 ? 44 : -40 }}
              >
                {cents > 0 ? '▼' : '▲'}
              </span>
            )}
          </div>
        )}
        {cents !== null && (
          <span className="absolute bottom-2 right-3 chip bg-white/80 tabular-nums text-ink">
            {cents > 0 ? '+' : ''}
            {Math.round(cents)} cents
          </span>
        )}

        {/* ホールドゲージ */}
        <div className="absolute inset-x-3 top-3 h-2 overflow-hidden rounded-full bg-white/80">
          <div
            className="h-full rounded-full bg-mint transition-[width] duration-75"
            style={{ width: `${s.hold * 100}%` }}
          />
        </div>

        {phase === 'clear' && lastGrade && (
          <div className="absolute inset-0 grid place-items-center bg-white/40">
            <p
              className="animate-pop text-5xl font-extrabold sm:text-6xl"
              style={{ color: GRADE_STYLE[lastGrade].color }}
            >
              {lastGrade}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button className="btn-soft flex-1" onClick={playReference}>
          <Icon name="speaker" size={20} /> お手本を聞く
        </button>
        <button
          className="btn-soft"
          disabled={phase !== 'play'}
          onClick={() => {
            g.current.done = true
            setPhase('clear')
            finishRound({ target, grade: 'SKIP', meanAbs: 100, stdDev: 50, clearMs: null })
          }}
        >
          スキップ
        </button>
      </div>

      {phase === 'result' && (
        <ResultModal
          title={totalScore >= 90 ? 'PERFECT!' : totalScore >= 70 ? 'GREAT!' : 'GOOD!'}
          score={totalScore}
          onRetry={restart}
          onChangeDifficulty={backToIntro}
          subtitle={DIFFICULTY_LABELS[difficulty]}
          badge={<RankBadge result={rank} game="target" />}
        >
          <ul className="flex flex-col gap-1.5">
            {results.map((r, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl bg-cloud px-3 py-1.5 text-sm">
                <span className="font-bold">{noteFromMidi(r.target).label}</span>
                <span className="text-ink-soft">{r.grade === 'SKIP' ? '—' : `平均 ${r.meanAbs.toFixed(0)} cents`}</span>
                <span
                  className="font-extrabold"
                  style={{ color: r.grade === 'SKIP' ? '#9a94b8' : GRADE_STYLE[r.grade].color }}
                >
                  {r.grade}
                </span>
              </li>
            ))}
          </ul>
        </ResultModal>
      )}
    </div>
  )
}

function HoldRing({ progress, color }: { progress: number; color: string }) {
  const r = 22
  const circ = 2 * Math.PI * r
  return (
    <svg width={60} height={60} viewBox="0 0 60 60" className="drop-shadow-md">
      <circle cx={30} cy={30} r={r} fill="none" stroke="white" strokeWidth={6} />
      <circle
        cx={30}
        cy={30}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - progress)}
        transform="rotate(-90 30 30)"
      />
      <circle cx={30} cy={30} r={14} fill={color} />
      <circle cx={25} cy={25} r={4} fill="white" opacity={0.6} />
    </svg>
  )
}
