import type { ReactNode } from 'react'
import type { LevelGameId } from '../../games/difficulty'
import type { GameMeta } from '../../games/meta'
import { DifficultySelect } from '../DifficultySelect'
import { Icon } from '../Icon'

/** 耳トレ共通のスタート画面 */
export function EarIntro({
  meta,
  children,
  onStart,
  levelLabel,
  footer,
}: {
  meta: GameMeta
  children: ReactNode
  onStart: () => void
  levelLabel?: string
  footer?: ReactNode
}) {
  return (
    <div className="card flex flex-col items-center gap-4 p-6 text-center">
      <div className="flex items-center gap-2">
        {meta.step && (
          <span className="chip text-white" style={{ background: meta.color }}>
            STEP {meta.step}
          </span>
        )}
        <span className="chip bg-cloud text-ink-soft">
          <Icon name="ear" size={12} /> 耳トレ・マイク不要
        </span>
      </div>
      <div
        className="grid h-20 w-20 place-items-center rounded-3xl text-white shadow-lg"
        style={{ background: meta.color }}
      >
        <Icon name={meta.icon} size={44} />
      </div>
      <div>
        <h2 className="text-3xl font-extrabold tracking-wide" style={{ color: meta.color }}>
          {meta.title}
        </h2>
        <p className="text-lg font-extrabold">{meta.description}</p>
      </div>
      <div className="text-sm leading-relaxed text-ink-soft">{children}</div>
      <DifficultySelect game={meta.id as LevelGameId} label={levelLabel} />
      <button className="btn-primary w-full max-w-xs text-lg" onClick={onStart}>
        <Icon name="play" size={18} /> スタート
      </button>
      {footer}
      <p className="text-xs text-ink-soft">イヤホンだと聴き取りやすいよ</p>
    </div>
  )
}
