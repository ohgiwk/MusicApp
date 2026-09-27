interface Props {
  label: string
  value: number | null
  color: string
  /** 最新の計測での増減 */
  delta?: number | null
  hint?: string
  count?: number
}

export function StatBar({ label, value, color, delta, hint, count }: Props) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-bold">
          {label}
          {count !== undefined && count > 0 && (
            <span className="ml-1.5 text-[10px] font-bold text-ink-soft">計測 {count}回</span>
          )}
        </span>
        <span className="flex shrink-0 items-baseline gap-1.5">
          {delta !== undefined && delta !== null && delta !== 0 && (
            <span className={`text-xs font-extrabold ${delta > 0 ? 'text-mint' : 'text-bubble'}`}>
              {delta > 0 ? '▲' : '▼'}
              {Math.abs(delta)}
            </span>
          )}
          {value === null ? (
            <span className="text-xs font-bold text-ink-soft">未計測</span>
          ) : (
            <span className="text-lg font-extrabold leading-none" style={{ color }}>
              {value}
            </span>
          )}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-cloud">
        {value !== null && (
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{ width: `${Math.max(4, value)}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}
          />
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] leading-snug text-ink-soft">{hint}</p>}
    </div>
  )
}
