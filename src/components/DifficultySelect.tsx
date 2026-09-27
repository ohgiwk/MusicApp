import { GAME_LEVELS, levelOption, type LevelGameId } from '../games/difficulty'
import { useLevel, useSettingsStore } from '../store/settingsStore'

/** ゲーム開始前の難易度 (レベル) 選択。選んだものはゲームごとに保存される */
export function DifficultySelect({
  game,
  disabled,
  label = '難易度',
}: {
  game: LevelGameId
  disabled?: boolean
  label?: string
}) {
  const level = useLevel(game)
  const setDifficulty = useSettingsStore((s) => s.setDifficulty)
  const options = GAME_LEVELS[game]
  const current = levelOption(game, level)
  return (
    <div className="w-full max-w-sm">
      <p className="mb-2 text-sm font-extrabold">{label}</p>
      <div
        className="grid gap-1.5 rounded-2xl bg-cloud p-1.5"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((o) => {
          const active = o.id === current.id
          return (
            <button
              key={o.id}
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => setDifficulty(game, o.id)}
              className={`whitespace-nowrap rounded-xl px-1 py-2 text-sm font-extrabold transition ${active ? 'text-white shadow' : 'text-ink-soft'}`}
              style={active ? { background: o.color } : undefined}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      <p className="mt-2 min-h-[2.5em] text-xs leading-relaxed text-ink-soft">{current.desc}</p>
    </div>
  )
}

export function DifficultyChip({ game }: { game: LevelGameId }) {
  const o = levelOption(game, useLevel(game))
  return (
    <span className="chip text-white" style={{ background: o.color }}>
      {o.label}
    </span>
  )
}
