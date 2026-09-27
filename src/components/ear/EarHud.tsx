import { COLORS } from '../../theme'

/** 問題番号・COMBO・スコア */
export function EarHud({
  index,
  total,
  combo,
  score,
  color,
}: {
  index: number
  total: number
  combo: number
  score: number
  color: string
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className="h-2 flex-1 rounded-full transition-colors"
            style={{ background: i < index ? color : i === index ? `${color}66` : COLORS.track }}
          />
        ))}
      </div>
      <span
        key={combo}
        className={`chip shrink-0 tabular-nums ${combo >= 2 ? 'animate-pop text-white' : 'bg-white text-ink-soft'}`}
        style={combo >= 2 ? { background: combo >= 8 ? COLORS.bubble : combo >= 5 ? COLORS.sun : color } : undefined}
      >
        {combo} COMBO
      </span>
      <span className="chip shrink-0 bg-white text-base tabular-nums text-ink">{score}</span>
    </div>
  )
}
