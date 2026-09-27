import {
  DIFFICULTIES, DIFFICULTY_COLORS, DIFFICULTY_DESCRIPTIONS, DIFFICULTY_LABELS, type DifficultyGameId,
} from '../games/difficulty'
import { useDifficulty, useSettingsStore } from '../store/settingsStore'

/** ゲーム開始前の難易度選択。選んだ難易度はゲームごとに保存される */
export function DifficultySelect({ game, disabled }: { game: DifficultyGameId; disabled?: boolean }) {
  const difficulty = useDifficulty(game)
  const setDifficulty = useSettingsStore((s) => s.setDifficulty)
  return (
    <div className="w-full max-w-sm">
      <p className="mb-2 text-sm font-extrabold">難易度</p>
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-cloud p-1.5" role="radiogroup" aria-label="難易度">
        {DIFFICULTIES.map((d) => {
          const active = d === difficulty
          return (
            <button
              key={d}
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => setDifficulty(game, d)}
              className={`whitespace-nowrap rounded-xl px-1 py-2 text-sm font-extrabold transition ${active ? 'text-white shadow' : 'text-ink-soft'}`}
              style={active ? { background: DIFFICULTY_COLORS[d] } : undefined}
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          )
        })}
      </div>
      <p className="mt-2 min-h-[2.5em] text-xs leading-relaxed text-ink-soft">{DIFFICULTY_DESCRIPTIONS[game][difficulty]}</p>
    </div>
  )
}

export function DifficultyChip({ game }: { game: DifficultyGameId }) {
  const d = useDifficulty(game)
  return (
    <span className="chip text-white" style={{ background: DIFFICULTY_COLORS[d] }}>
      {DIFFICULTY_LABELS[d]}
    </span>
  )
}
