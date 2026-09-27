import { useCallback, useEffect, useRef, useState } from 'react'
import { noteFromMidi } from '../audio/pitchUtils'
import { playChime, playNote } from '../audio/tonePlayer'
import { Icon } from '../components/Icon'
import { MicPermissionGate } from '../components/MicPermissionGate'
import { RankBadge } from '../components/RankBadge'
import { ResultModal } from '../components/ResultModal'
import { GRADE_STYLE, pickTarget, type Grade } from '../games/pitchTarget/grading'
import { EMPTY_VIEW, TargetRound, hintFor, type TargetView } from '../games/pitchTarget/round'
import { TargetStage } from '../components/pitchTarget/TargetStage'
import { usePitchDetection, type PitchFrame } from '../hooks/usePitchDetection'
import { LevelChip, LevelSelect } from '../components/LevelSelect'
import { DIFFICULTY_LABELS, TARGET_LEVELS } from '../games/difficulty'
import { useDifficulty, useVoiceRange } from '../store/settingsStore'
import { fromPitchTarget } from '../games/abilityScoring'
import { useScoreStore, type RankResult } from '../store/scoreStore'
import { useStatsStore } from '../store/statsStore'
import { COLORS } from '../theme'

const ROUNDS = 5
const TONE_SEC = 1.2
/** お手本の再生が終わってから判定を始めるまでの余白 (ms) */
const LISTEN_MARGIN_MS = 250

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

  /** 今の問題の判定 (毎フレーム更新する状態はここに閉じ込める) */
  const roundRef = useRef<TargetRound | null>(null)

  // 画面を離れたら、次の問題への切り替えと鳴っているお手本を止める
  const roundTimer = useRef(0)
  const stopTone = useRef<() => void>(() => {})
  useEffect(
    () => () => {
      window.clearTimeout(roundTimer.current)
      stopTone.current()
    },
    [],
  )

  const playReference = useCallback(() => {
    stopTone.current()
    stopTone.current = playNote(target, TONE_SEC)
    // お手本の音をマイクが拾って自動クリアしないよう、再生中は判定を止める
    roundRef.current?.pauseUntil(performance.now() + TONE_SEC * 1000 + LISTEN_MARGIN_MS)
  }, [target])

  const startRound = useCallback(
    (t: number) => {
      const now = performance.now()
      roundRef.current = new TargetRound(t, level, now, now + TONE_SEC * 1000 + LISTEN_MARGIN_MS)
      setTarget(t)
      setLastGrade(null)
      setView(EMPTY_VIEW)
      setPhase('play')
      stopTone.current()
      stopTone.current = playNote(t, TONE_SEC)
    },
    [level],
  )

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
        roundTimer.current = window.setTimeout(() => setPhase('result'), res.grade === 'SKIP' ? 0 : 1100)
      } else {
        roundTimer.current = window.setTimeout(
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
      const r = roundRef.current
      if (!r) return
      const cleared = r.update(f.freq, f.time, phase === 'play')
      setView(r.view(f.time))
      if (!cleared) return
      setLastGrade(cleared.grade)
      setPhase('clear')
      playChime('success')
      finishRound({
        target,
        grade: cleared.grade,
        meanAbs: cleared.meanAbs,
        stdDev: cleared.stdDev,
        clearMs: cleared.clearMs,
      })
    },
    [phase, target, finishRound],
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
        <LevelSelect game="target" />
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

  const inZone = view.cents !== null && Math.abs(view.cents) <= HIT_RANGE
  const hint = hintFor(view, HIT_RANGE)

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
                style={r ? { background: r.grade === 'SKIP' ? COLORS.faint : GRADE_STYLE[r.grade].color } : undefined}
              />
            )
          })}
        </div>
        <span className="flex items-center gap-1.5">
          <LevelChip game="target" />
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

      <TargetStage
        view={view}
        target={target}
        hitRange={HIT_RANGE}
        voiced={frame.voiced}
        clearGrade={phase === 'clear' ? lastGrade : null}
      />

      <div className="flex gap-3">
        <button className="btn-soft flex-1" onClick={playReference}>
          <Icon name="speaker" size={20} /> お手本を聞く
        </button>
        <button
          className="btn-soft"
          disabled={phase !== 'play'}
          onClick={() => {
            roundRef.current?.end()
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
                  style={{ color: r.grade === 'SKIP' ? COLORS.muted : GRADE_STYLE[r.grade].color }}
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
