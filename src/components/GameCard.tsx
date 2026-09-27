import { Link } from 'react-router'
import { Icon, type IconName } from './Icon'

interface Props {
  to: string
  icon: IconName
  title: string
  description: string
  color: string
  done?: boolean
  /** 自己ベスト表示 (例: "ベスト 85点") */
  best?: string
  /** タイトル上の小さなラベル (STEP 1 など) */
  badge?: string
  compact?: boolean
}

export function GameCard({ to, icon, title, description, color, done, best, badge, compact }: Props) {
  return (
    <Link
      to={to}
      className={`card group relative flex items-center gap-4 overflow-hidden transition hover:-translate-y-1 active:scale-[0.98] ${compact ? 'p-3' : 'p-4 sm:flex-col sm:items-start sm:p-5'}`}
    >
      <span
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-15 transition group-hover:scale-125"
        style={{ background: color }}
      />
      <span
        className={`grid shrink-0 place-items-center rounded-2xl text-white shadow-lg ${compact ? 'h-11 w-11' : 'h-14 w-14'}`}
        style={{ background: color, boxShadow: `0 6px 16px -6px ${color}` }}
      >
        <Icon name={icon} size={compact ? 22 : 30} />
      </span>
      <span className="min-w-0 flex-1">
        {badge && (
          <span className="mb-0.5 block text-[10px] font-extrabold tracking-wide" style={{ color }}>
            {badge}
          </span>
        )}
        <span className="flex flex-wrap items-center gap-x-2 font-extrabold">
          <span className="whitespace-nowrap">{title}</span>
          {done && (
            <span className="chip bg-mint/15 text-mint">
              <Icon name="check" size={12} /> 済
            </span>
          )}
        </span>
        <span className="block text-sm text-ink-soft">{description}</span>
        {best && (
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-extrabold" style={{ color }}>
            <Icon name="trophy" size={12} /> {best}
          </span>
        )}
      </span>
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cloud text-grape ${compact ? '' : 'sm:hidden'}`}
      >
        <Icon name="play" size={16} />
      </span>
    </Link>
  )
}
