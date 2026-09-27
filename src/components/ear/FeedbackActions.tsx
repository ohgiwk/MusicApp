import { Icon } from '../Icon'

interface Props {
  onReplay: () => void
  /** 鳴っている間は押せない */
  replayDisabled: boolean
  onNext: () => void
  isLast: boolean
  replayLabel?: string
}

/** 回答後の「聴き直す」「次へ / 結果を見る」 */
export function FeedbackActions({ onReplay, replayDisabled, onNext, isLast, replayLabel = '聴き直す' }: Props) {
  return (
    <div className="flex gap-3">
      <button className="btn-soft flex-1 whitespace-nowrap !px-3" disabled={replayDisabled} onClick={onReplay}>
        <Icon name="speaker" size={18} /> {replayLabel}
      </button>
      <button className="btn-primary flex-1 whitespace-nowrap !px-3" onClick={onNext}>
        {isLast ? '結果を見る' : '次へ'} <Icon name="play" size={16} />
      </button>
    </div>
  )
}
