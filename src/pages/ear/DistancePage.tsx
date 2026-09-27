import { useState } from 'react'
import { playChime } from '../../audio/tonePlayer'
import { LevelChip } from '../../components/LevelSelect'
import { EarHud } from '../../components/ear/EarHud'
import { EarIntro } from '../../components/ear/EarIntro'
import { FeedbackActions } from '../../components/ear/FeedbackActions'
import { FeedbackBanner } from '../../components/ear/FeedbackBanner'
import { IntervalVisual } from '../../components/ear/IntervalVisual'
import { ReplayButton } from '../../components/ear/ReplayButton'
import { TwoTones } from '../../components/ear/TwoTones'
import { RankBadge } from '../../components/RankBadge'
import { ResultModal } from '../../components/ResultModal'
import { DISTANCE_LEVEL_IDS, DISTANCE_LEVELS, type DistanceLevelId } from '../../games/difficulty'
import { INTERVAL_NAMES, QUESTIONS } from '../../games/ear/common'
import {
  BASE_POINTS,
  LARGE_MIN,
  SMALL_MAX,
  answerId,
  describe,
  judge,
  levelNumber,
  makeQuestion,
  optionsFor,
  type DistanceQuestion,
} from '../../games/ear/distance'
import { gameMeta } from '../../games/meta'
import { useEarSession, type AnswerKind } from '../../hooks/useEarSession'
import { useQuestionPlayback } from '../../hooks/useQuestionPlayback'
import { useEarStore } from '../../store/earStore'
import { useScoreStore, type RankResult } from '../../store/scoreStore'
import { useLevel, useSettingsStore } from '../../store/settingsStore'
import { useStatsStore } from '../../store/statsStore'

type Phase = 'intro' | 'playing' | 'answer' | 'feedback' | 'result'

const meta = gameMeta('distance')
const NOTE_SEC = 0.9

export function DistancePage() {
  const level = useLevel('distance') as DistanceLevelId
  const setLevel = useSettingsStore((s) => s.setLevel)
  const session = useEarSession(QUESTIONS.distance)
  const addScore = useScoreStore((s) => s.addScore)
  const markPlayed = useStatsStore((s) => s.markPlayed)
  const recordDistance = useEarStore((s) => s.recordDistance)

  const [phase, setPhase] = useState<Phase>('intro')
  const [question, setQuestion] = useState<DistanceQuestion | null>(null)
  const [feedback, setFeedback] = useState<{ kind: AnswerKind; gained: number; combo: number; chosen: string } | null>(
    null,
  )
  const [rank, setRank] = useState<RankResult | null>(null)
  const playback = useQuestionPlayback()

  /** 問題の2音を鳴らし、最後まで鳴ったら then へ (回答後の聴き直しは結果表示のまま鳴らす) */
  const play = async (q: DistanceQuestion, then: Phase, delayMs = 0) => {
    setPhase(then === 'feedback' ? 'feedback' : 'playing')
    if (await playback.play([q.first, q.second], NOTE_SEC, delayMs)) setPhase(then)
  }

  const ask = () => {
    const q = makeQuestion(level)
    setQuestion(q)
    setFeedback(null)
    // 前の効果音と重ならないよう少し間をあける (その間も「再生中」扱いで答えを見せない)
    void play(q, 'answer', 250)
  }

  const start = () => {
    session.reset()
    setRank(null)
    ask()
  }

  const answer = (chosen: string) => {
    if (phase !== 'answer' || !question) return
    const kind = judge(question, level, chosen)
    const { gained, combo } = session.commit(kind, BASE_POINTS[level])
    playChime(kind === 'wrong' ? 'wrong' : 'success')
    setFeedback({ kind, gained, combo, chosen })
    setPhase('feedback')
  }

  const next = () => {
    // 聴き直し中でも止めて次へ
    playback.stop()
    if (session.isLast) {
      const accuracy = (session.correct / session.total) * 100
      setRank(
        addScore(
          'distance',
          level,
          session.score,
          `${session.correct}/${session.total} 正解・最大${session.maxCombo}COMBO`,
        ),
      )
      markPlayed('distance')
      recordDistance(levelNumber(level), accuracy)
      setPhase('result')
      return
    }
    session.next()
    ask()
  }

  if (phase === 'intro') {
    return (
      <EarIntro meta={meta} onStart={start} levelLabel="レベル">
        2つの音を順番に鳴らします。
        <br />
        <b>音がどのくらい動いたか</b>を当てよう。
        <br />
        レベルが上がると「感覚 → 数字 → 音楽の用語」で答えるようになるよ。
      </EarIntro>
    )
  }

  const q = question
  const options = optionsFor(level)
  const lv = levelNumber(level)
  const correctId = q ? answerId(q, level) : ''
  const nextLevel = DISTANCE_LEVEL_IDS[lv] as DistanceLevelId | undefined
  const accuracy = Math.round((session.correct / session.total) * 100)

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
              {describe(q, level)}
            </FeedbackBanner>
            <IntervalVisual
              from={q.first}
              to={q.second}
              label={`${Math.abs(q.semis)}半音`}
              sublabel={lv >= 4 ? INTERVAL_NAMES[Math.abs(q.semis)] : q.semis > 0 ? '上がった' : '下がった'}
              color={meta.color}
            />
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-ink-soft">
              {phase === 'playing' ? 'よく聴いて…' : '音はどう動いた？'}
            </p>
            <TwoTones activeNote={playback.activeNote} color={meta.color} />
            <p className="text-2xl font-extrabold">{lv >= 3 ? '何半音動いた？' : '音はどう動いた？'}</p>
            <p className="flex items-center gap-2 text-xs font-bold text-ink-soft">
              <LevelChip game="distance" />
              {lv === 2 && `少し = ${SMALL_MAX}半音以内 / 大きく = ${LARGE_MIN}半音以上`}
              {lv >= 3 && '上か下かは気にせず、動いた幅を答えよう'}
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
          <div
            className={`grid gap-2 ${options.length === 2 ? 'grid-cols-2' : options.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}
          >
            {options.map((o) => (
              <button
                key={o.id}
                disabled={phase !== 'answer'}
                onClick={() => answer(o.id)}
                className="btn-soft flex-col !gap-0 !px-2 !py-3 disabled:!opacity-40"
              >
                {o.arrow && (
                  <span className="text-2xl leading-none" style={{ color: meta.color }}>
                    {o.arrow}
                  </span>
                )}
                <span className="whitespace-nowrap text-base">{o.label}</span>
                {o.sub && (
                  <span className="text-xs font-bold" style={{ color: meta.color }}>
                    {o.sub}
                  </span>
                )}
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

      {phase === 'feedback' && feedback && feedback.kind !== 'correct' && (
        <p className="text-center text-xs font-bold text-ink-soft">
          正解は「{options.find((o) => o.id === correctId)?.label}」
        </p>
      )}

      {phase === 'result' && (
        <ResultModal
          title={accuracy >= 90 ? 'PERFECT!' : accuracy >= 70 ? 'GREAT!' : 'GOOD!'}
          subtitle={`${DISTANCE_LEVELS[level].label}・${session.correct} / ${session.total} 正解`}
          score={session.score}
          onRetry={start}
          onChangeDifficulty={() => setPhase('intro')}
          badge={<RankBadge result={rank} game="distance" />}
        >
          {accuracy >= 80 && nextLevel ? (
            <button
              className="btn w-full text-white"
              style={{ background: DISTANCE_LEVELS[nextLevel].color }}
              onClick={() => {
                setLevel('distance', nextLevel)
                setPhase('intro')
              }}
            >
              レベルアップ！ {DISTANCE_LEVELS[nextLevel].label} に挑戦
            </button>
          ) : (
            <p className="text-center text-xs text-ink-soft">
              {nextLevel ? '8問以上正解で次のレベルに進めます' : '最高レベルです！'}
            </p>
          )}
        </ResultModal>
      )}
    </div>
  )
}
