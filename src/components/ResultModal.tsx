import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon } from './Icon'

interface Props {
  title: string
  subtitle?: string
  score?: number
  children?: ReactNode
  /** スコアの下に出す表示 (ランキング順位など) */
  badge?: ReactNode
  onRetry: () => void
  retryLabel?: string
}

export function ResultModal({ title, subtitle, score, children, badge, onRetry, retryLabel = 'もう一回' }: Props) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="card animate-pop w-full max-w-sm p-6 text-center">
        <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-full bg-sun text-white">
          <Icon name="trophy" size={30} />
        </div>
        <h2 className="text-shine text-4xl font-extrabold tracking-wide">{title}</h2>
        {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}
        {score !== undefined && (
          <p className="mt-3 text-6xl font-extrabold text-grape">
            {score}
            <span className="ml-1 text-xl text-ink-soft">点</span>
          </p>
        )}
        {badge && <div className="mt-3">{badge}</div>}
        {children && <div className="mt-4 text-left">{children}</div>}
        <div className="mt-6 flex flex-col gap-3">
          <button className="btn-primary" onClick={onRetry}>
            <Icon name="retry" size={18} /> {retryLabel}
          </button>
          <Link to="/" className="btn-soft">
            ホームへ
          </Link>
        </div>
      </div>
    </div>
  )
}
