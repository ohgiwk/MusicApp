import { replayFactor } from '../../games/ear/common'
import { Icon } from '../Icon'

/** もう一度聴く。聴き直すほどこの問題の得点が下がる */
export function ReplayButton({ onClick, replays, disabled }: { onClick: () => void; replays: number; disabled?: boolean }) {
  const next = Math.round(replayFactor(replays + 1) * 100)
  return (
    <button className="btn-soft flex-col !gap-0 !px-4 !py-2" onClick={onClick} disabled={disabled}>
      <span className="flex items-center gap-1.5 whitespace-nowrap text-sm">
        <Icon name="retry" size={16} /> もう一度聴く
      </span>
      <span className="text-[10px] font-bold text-ink-soft">得点 {next}% になる</span>
    </button>
  )
}
