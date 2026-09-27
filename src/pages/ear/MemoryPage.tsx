import { useCallback, useEffect, useRef, useState } from 'react'
import { playChime, type MelodyHandle } from '../../audio/tonePlayer'
import { DifficultyChip } from '../../components/DifficultySelect'
import { EarHud } from '../../components/ear/EarHud'
import { EarIntro } from '../../components/ear/EarIntro'
import { FeedbackBanner } from '../../components/ear/FeedbackBanner'
import { MelodyLine } from '../../components/ear/MelodyLine'
import { ReplayButton } from '../../components/ear/ReplayButton'
import { Icon } from '../../components/Icon'
import { RankBadge } from '../../components/RankBadge'
import { ResultModal } from '../../components/ResultModal'
import { MEMORY_LEVELS, levelOption, type Difficulty } from '../../games/difficulty'
import { QUESTIONS, playQuestion } from '../../games/ear/common'
import { basePoints, makeQuestion, type MemoryQuestion } from '../../games/ear/memory'
import { gameMeta } from '../../games/meta'
import { useEarSession, type AnswerKind } from '../../hooks/useEarSession'
import { useEarStore } from '../../store/earStore'
import { useScoreStore, type RankResult } from '../../store/scoreStore'
import { useLevel } from '../../store/settingsStore'
import { useStatsStore } from '../../store/statsStore'

type Phase = 'intro' | 'playing' | 'answer' | 'feedback' | 'result'

const meta = gameMeta('memory')
const LETTERS = ['A', 'B', 'C', 'D']

export function MemoryPage() {
  const levelId = useLevel('memory') as Difficulty
  const level = MEMORY_LEVELS[levelId]
  const session = useEarSession(QUESTIONS.memory)
  const addScore = useScoreStore((s) => s.addScore)
  const recordPlay = useStatsStore((s) => s.recordPlay)
  const recordMemory = useEarStore((s) => s.recordMemory)

  const [phase, setPhase] = useState<Phase>('intro')
  const [question, setQuestion] = useState<MemoryQuestion | null>(null)
  const [activeNote, setActiveNote] = useState(-1)
  const [feedback, setFeedback] = useState<{ kind: AnswerKind; gained: number; combo: number; chosen: number } | null>(
    null,
  )
  const [maxNotes, setMaxNotes] = useState(0)
  const [rank, setRank] = useState<RankResult | null>(null)
  const playback = useRef<MelodyHandle | null>(null)
  const timer = useRef(0)

  useEffect(
    () => () => {
      playback.current?.cancel()
      window.clearTimeout(timer.current)
    },
    [],
  )

  const play = useCallback(
    async (melody: number[], then: Phase) => {
      setPhase(then === 'feedback' ? 'feedback' : 'playing')
      playback.current?.cancel()
      playback.current = playQuestion(melody, level.noteSec, setActiveNote)
      // 途中で止めた (次の問題へ進んだ等) ときはフェーズを変えない
      if (await playback.current.done) setPhase(then)
    },
    [level.noteSec],
  )

  const ask = () => {
    const q = makeQuestion(level)
    setQuestion(q)
    setFeedback(null)
    // 再生が始まるまでの間も「再生中」扱いにして、次の問題の答えを先に見せない
    setPhase('playing')
    timer.current = window.setTimeout(() => void play(q.melody, 'answer'), 300)
  }

  const start = () => {
    session.reset()
    setMaxNotes(0)
    setRank(null)
    ask()
  }

  const answer = (chosen: number) => {
    if (phase !== 'answer' || !question) return
    const ok = chosen === question.answer
    const { gained, combo } = session.commit(ok ? 'correct' : 'wrong', basePoints(question.melody.length))
    if (ok) setMaxNotes((m) => Math.max(m, question.melody.length))
    playChime(ok ? 'success' : 'wrong')
    setFeedback({ kind: ok ? 'correct' : 'wrong', gained, combo, chosen })
    setPhase('feedback')
    // 効果音のあと、正解のメロディを光る点と一緒にもう一度鳴らす
    timer.current = window.setTimeout(() => void play(question.melody, 'feedback'), 700)
  }

  const next = () => {
    playback.current?.cancel()
    window.clearTimeout(timer.current)
    setActiveNote(-1)
    if (session.isLast) {
      const accuracy = (session.correct / session.total) * 100
      setRank(addScore('memory', levelId, session.score, `${session.correct}/${session.total} 正解・最長${maxNotes}音`))
      recordPlay('memory', {})
      recordMemory(maxNotes, accuracy)
      setPhase('result')
      return
    }
    session.next()
    ask()
  }

  if (phase === 'intro') {
    return (
      <EarIntro meta={meta} onStart={start}>
        短いメロディが流れます。
        <br />
        <b>聴いたメロディと同じ動きの線</b>を選ぼう。
        <br />
        楽譜が読めなくても大丈夫。音の上がり下がりを覚えてね。
      </EarIntro>
    )
  }

  const q = question
  // 選択肢どうしで動きの大きさを比べられるよう、1半音の高さをそろえる
  const semitonePx = q ? Math.min(9, 60 / Math.max(1, ...q.options.map((o) => Math.max(...o) - Math.min(...o)))) : 8

  return (
    <div className="flex flex-col gap-3">
      <EarHud
        index={session.index}
        total={session.total}
        combo={session.combo}
        score={session.score}
        color={meta.color}
      />

      {phase === 'playing' && q && (
        <div className="card flex min-h-[220px] flex-col items-center justify-center gap-3 p-5">
          <p className="text-sm font-bold text-ink-soft">
            よく聴いて覚えよう… <DifficultyChip game="memory" />
          </p>
          {/* 再生中は形を見せず、何音目かだけを示す */}
          <div className="w-full max-w-sm">
            <MelodyLine midis={q.melody} semitonePx={semitonePx} hidden active={activeNote} color={meta.color} />
          </div>
          <p className="text-2xl font-extrabold">{q.melody.length}音のメロディ</p>
        </div>
      )}

      {(phase === 'answer' || phase === 'feedback') && q && (
        <>
          {phase === 'feedback' && feedback ? (
            <FeedbackBanner kind={feedback.kind} gained={feedback.gained} combo={feedback.combo}>
              正解は {LETTERS[q.answer]}。光る点と一緒に聴いてみよう
            </FeedbackBanner>
          ) : (
            <p className="text-center text-xl font-extrabold">同じ動きのメロディはどれ？</p>
          )}
          <div className={`grid gap-2 ${q.options.length === 4 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
            {q.options.map((o, i) => {
              const isAnswer = i === q.answer
              const isChosen = feedback?.chosen === i
              const state = phase !== 'feedback' ? 'idle' : isAnswer ? 'answer' : isChosen ? 'wrong' : 'dim'
              return (
                <button
                  key={i}
                  disabled={phase !== 'answer'}
                  onClick={() => answer(i)}
                  className={`card flex items-center gap-2 !rounded-2xl p-2 pr-3 text-left transition active:scale-[0.98] disabled:active:scale-100 ${
                    state === 'answer' ? 'ring-4 ring-mint' : state === 'wrong' ? 'ring-4 ring-bubble/60' : ''
                  } ${state === 'dim' ? 'opacity-40' : ''}`}
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl font-extrabold text-white"
                    style={{ background: state === 'answer' ? '#22c98c' : state === 'wrong' ? '#ff5fa2' : meta.color }}
                  >
                    {LETTERS[i]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <MelodyLine
                      midis={o}
                      semitonePx={semitonePx}
                      color={state === 'answer' ? '#22c98c' : state === 'wrong' ? '#ff5fa2' : meta.color}
                      active={state === 'answer' ? activeNote : -1}
                      height={80}
                    />
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {phase === 'feedback' ? (
        <div className="flex gap-3">
          <button
            className="btn-soft flex-1 whitespace-nowrap !px-3"
            disabled={activeNote >= 0}
            onClick={() => q && void play(q.melody, 'feedback')}
          >
            <Icon name="speaker" size={18} /> もう一度聴く
          </button>
          <button className="btn-primary flex-1 whitespace-nowrap !px-3" onClick={next}>
            {session.isLast ? '結果を見る' : '次へ'} <Icon name="play" size={16} />
          </button>
        </div>
      ) : (
        <div className="flex justify-center">
          <ReplayButton
            replays={session.replays}
            disabled={phase !== 'answer'}
            onClick={() => {
              if (!q) return
              session.addReplay()
              void play(q.melody, 'answer')
            }}
          />
        </div>
      )}

      {phase === 'result' && (
        <ResultModal
          title={
            session.correct >= session.total ? 'PERFECT!' : session.correct >= session.total - 2 ? 'GREAT!' : 'GOOD!'
          }
          subtitle={`${levelOption('memory', levelId).label}・${session.correct} / ${session.total} 正解`}
          score={session.score}
          onRetry={start}
          onChangeDifficulty={() => setPhase('intro')}
          badge={<RankBadge result={rank} game="memory" />}
        >
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-cloud p-2">
              <p className="text-[10px] font-bold text-ink-soft">最大COMBO</p>
              <p className="text-base font-extrabold">{session.maxCombo}</p>
            </div>
            <div className="rounded-xl bg-cloud p-2">
              <p className="text-[10px] font-bold text-ink-soft">覚えられた最長</p>
              <p className="text-base font-extrabold">{maxNotes ? `${maxNotes}音` : '—'}</p>
            </div>
          </div>
        </ResultModal>
      )}
    </div>
  )
}
