import { useEffect, useRef, useState } from 'react'
import { playChime } from '../../audio/tonePlayer'
import { LevelChip } from '../../components/LevelSelect'
import { EarHud } from '../../components/ear/EarHud'
import { EarIntro } from '../../components/ear/EarIntro'
import { FeedbackActions } from '../../components/ear/FeedbackActions'
import { FeedbackBanner } from '../../components/ear/FeedbackBanner'
import { IntervalVisual } from '../../components/ear/IntervalVisual'
import { ReplayButton } from '../../components/ear/ReplayButton'
import { ResultStats } from '../../components/ear/ResultStats'
import { TwoTones } from '../../components/ear/TwoTones'
import { RankBadge } from '../../components/RankBadge'
import { ResultModal } from '../../components/ResultModal'
import { HIGHLOW_LEVELS, levelOption, type Difficulty } from '../../games/difficulty'
import { QUESTIONS, formatInterval } from '../../games/ear/common'
import { basePoints, initialDiff, makeQuestion, nextDiff, type HighLowQuestion } from '../../games/ear/highlow'
import { gameMeta } from '../../games/meta'
import { useEarSession, type AnswerKind } from '../../hooks/useEarSession'
import { useQuestionPlayback } from '../../hooks/useQuestionPlayback'
import { useEarStore } from '../../store/earStore'
import { useScoreStore, type RankResult } from '../../store/scoreStore'
import { useLevel } from '../../store/settingsStore'
import { useStatsStore } from '../../store/statsStore'
import { COLORS } from '../../theme'

type Phase = 'intro' | 'playing' | 'answer' | 'feedback' | 'result'

const meta = gameMeta('highlow')
const NOTE_SEC = 0.85

export function HighLowPage() {
  const levelId = useLevel('highlow') as Difficulty
  const level = HIGHLOW_LEVELS[levelId]
  const session = useEarSession(QUESTIONS.highlow)
  const addScore = useScoreStore((s) => s.addScore)
  const markPlayed = useStatsStore((s) => s.markPlayed)
  const recordHighLow = useEarStore((s) => s.recordHighLow)
  const bestEver = useEarStore((s) => s.minDiffCents)

  const [phase, setPhase] = useState<Phase>('intro')
  const [question, setQuestion] = useState<HighLowQuestion | null>(null)
  const [feedback, setFeedback] = useState<{ kind: AnswerKind; gained: number; combo: number; chose: 1 | -1 } | null>(
    null,
  )
  const [sessionMin, setSessionMin] = useState<number | null>(null)
  const [rank, setRank] = useState<RankResult | null>(null)
  const prevCorrectDiff = useRef<number | null>(null)
  const playback = useQuestionPlayback()

  /** 問題の2音を鳴らし、最後まで鳴ったら then へ (回答後の聴き直しは結果表示のまま鳴らす) */
  const play = async (q: HighLowQuestion, then: Phase, delayMs = 0) => {
    setPhase(then === 'feedback' ? 'feedback' : 'playing')
    if (await playback.play([q.first, q.second], NOTE_SEC, delayMs)) setPhase(then)
  }

  const ask = (diff: number) => {
    const q = makeQuestion(diff)
    setQuestion(q)
    setFeedback(null)
    // 前の効果音と重ならないよう少し間をあける (その間も「再生中」扱いで答えを見せない)
    void play(q, 'answer', 250)
  }

  const start = () => {
    session.reset()
    setSessionMin(null)
    setRank(null)
    prevCorrectDiff.current = null
    ask(initialDiff(level))
  }

  const answer = (chose: 1 | -1) => {
    if (phase !== 'answer' || !question) return
    const ok = chose === question.dir
    const { gained, combo } = session.commit(ok ? 'correct' : 'wrong', basePoints(question.diffCents))
    // 2問連続で正解できた音程差を「聞き分けられた」とみなす
    if (ok && prevCorrectDiff.current !== null) {
      const candidate = Math.max(prevCorrectDiff.current, question.diffCents)
      setSessionMin((m) => (m === null ? candidate : Math.min(m, candidate)))
    }
    prevCorrectDiff.current = ok ? question.diffCents : null
    playChime(ok ? 'success' : 'wrong')
    setFeedback({ kind: ok ? 'correct' : 'wrong', gained, combo, chose })
    setPhase('feedback')
  }

  const next = () => {
    if (!question || !feedback) return
    // 聴き直し中でも止めて次へ
    playback.stop()
    if (session.isLast) {
      finish()
      return
    }
    session.next()
    ask(nextDiff(question.diffCents, feedback.kind === 'correct', feedback.combo, level))
  }

  const finish = () => {
    const detail = `${session.correct}/${session.total} 正解${sessionMin !== null ? `・最小 ${formatInterval(sessionMin)}` : ''}`
    setRank(addScore('highlow', levelId, session.score, detail))
    markPlayed('highlow')
    recordHighLow(sessionMin)
    setPhase('result')
  }

  // キーボード操作 (↑ / ↓)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') answer(1)
      if (e.key === 'ArrowDown') answer(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (phase === 'intro') {
    return (
      <EarIntro meta={meta} onStart={start}>
        2つの音を順番に鳴らします。
        <br />
        <b>2つ目の音が高いか低いか</b>を当てよう。
        <br />
        連続で正解すると、音の差がだんだん小さくなるよ。
      </EarIntro>
    )
  }

  const q = question
  const semisText = q ? formatInterval(q.diffCents) : ''

  return (
    <div className="flex flex-col gap-3">
      <EarHud
        index={session.index}
        total={session.total}
        combo={session.combo}
        score={session.score}
        color={meta.color}
      />

      <div className="card flex min-h-[270px] flex-col items-center justify-center gap-3 p-5">
        {phase === 'feedback' && feedback && q ? (
          <>
            <FeedbackBanner kind={feedback.kind} gained={feedback.gained} combo={feedback.combo}>
              2音目は <span style={{ color: meta.color }}>{semisText}</span> {q.dir > 0 ? '高い' : '低い'}
            </FeedbackBanner>
            <IntervalVisual
              from={q.first}
              to={q.second}
              label={semisText}
              sublabel={q.dir > 0 ? '高い ↑' : '低い ↓'}
              showNames={q.diffCents % 100 === 0}
              color={meta.color}
            />
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-ink-soft">{phase === 'playing' ? 'よく聴いて…' : 'どっちが高い？'}</p>
            <TwoTones activeNote={playback.activeNote} color={meta.color} />
            <p className="text-2xl font-extrabold">2つ目の音は？</p>
            <p className="text-xs font-bold text-ink-soft">
              今の音の差: {semisText || '—'} <LevelChip game="highlow" />
            </p>
          </>
        )}
      </div>

      {phase === 'feedback' ? (
        <FeedbackActions
          onReplay={() => q && void play(q, 'feedback')}
          replayDisabled={playback.isPlaying}
          onNext={next}
          isLast={session.isLast}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {([1, -1] as const).map((d) => (
              <button
                key={d}
                disabled={phase !== 'answer'}
                onClick={() => answer(d)}
                className="btn flex-col !gap-0 !py-5 text-2xl text-white shadow-[0_6px_0_rgba(0,0,0,0.15)] disabled:!opacity-40"
                style={{ background: d > 0 ? COLORS.bubble : COLORS.sky }}
              >
                <span className="text-3xl leading-none">{d > 0 ? '↑' : '↓'}</span>
                {d > 0 ? '高い' : '低い'}
              </button>
            ))}
          </div>
          <div className="flex justify-center">
            <ReplayButton
              replays={session.replays}
              disabled={phase !== 'answer'}
              onClick={() => {
                if (!q) return
                session.addReplay()
                void play(q, 'answer')
              }}
            />
          </div>
        </>
      )}

      {phase === 'result' && (
        <ResultModal
          title={session.correct >= 9 ? 'PERFECT EAR!' : session.correct >= 7 ? 'GREAT!' : 'GOOD!'}
          subtitle={`${levelOption('highlow', levelId).label}・${session.correct} / ${session.total} 正解`}
          score={session.score}
          onRetry={start}
          onChangeDifficulty={() => setPhase('intro')}
          badge={<RankBadge result={rank} game="highlow" />}
        >
          <ResultStats
            items={[
              { label: '最大COMBO', value: String(session.maxCombo) },
              { label: '聞き分けた最小', value: sessionMin !== null ? formatInterval(sessionMin) : '—' },
              { label: '自己記録', value: bestEver !== null ? formatInterval(bestEver) : '—' },
            ]}
          />
          <p className="mt-2 text-center text-[11px] text-ink-soft">「聞き分けた」= 2問連続で正解できた音の差</p>
        </ResultModal>
      )}
    </div>
  )
}
