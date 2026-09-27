import { noteFromMidi } from '../../audio/pitchUtils'
import type { MelodyScore } from '../../games/melodyCopy/scoring'
import type { RankResult } from '../../store/scoreStore'
import { Icon } from '../Icon'
import { RankBadge } from '../RankBadge'

/** メロディコピーの結果 (点数・各音のずれ・次の操作) */
export function MelodyResultPanel({
  result,
  onRetry,
  onListen,
  onNext,
  levelUp,
  rank,
  difficultyLabel,
  onChangeDifficulty,
}: {
  difficultyLabel: string
  onChangeDifficulty: () => void
  result: MelodyScore
  onRetry: () => void
  onListen: () => void
  onNext: () => void
  levelUp: boolean
  rank: RankResult | null
}) {
  const title =
    result.score >= 90 ? 'PERFECT!' : result.score >= 70 ? 'GREAT!' : result.score >= 40 ? 'GOOD!' : 'おしい！'
  return (
    <div className="card animate-pop flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-shine text-3xl font-extrabold">{title}</p>
          <p className="text-sm text-ink-soft">
            <span className="whitespace-nowrap">
              {difficultyLabel}・{result.correct} / {result.notes.length} 音正解
            </span>
            {result.avgAbsCents !== null && (
              <span className="block whitespace-nowrap sm:ml-2 sm:inline">
                平均誤差 {Math.round(result.avgAbsCents)} cents
              </span>
            )}
          </p>
        </div>
        <p className="shrink-0 whitespace-nowrap text-5xl font-extrabold text-grape">
          {result.score}
          <span className="text-base text-ink-soft">点</span>
        </p>
      </div>
      <RankBadge result={rank} game="melody" />
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
      <button className="self-center text-xs font-bold text-ink-soft underline" onClick={onChangeDifficulty}>
        難易度を変える
      </button>
    </div>
  )
}
