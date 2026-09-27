import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { parseNote } from '../audio/pitchUtils'
import { DEFAULT_LEVEL, type Difficulty, type DifficultyGameId, type LevelGameId } from '../games/difficulty'

export type VoiceRange = 'low' | 'high'

export const VOICE_RANGES: Record<VoiceRange, { label: string; sub: string; min: number; max: number }> = {
  low: { label: '低め', sub: 'A2〜E4', min: parseNote('A2'), max: parseNote('E4') },
  high: { label: '高め', sub: 'A3〜E5', min: parseNote('A3'), max: parseNote('E5') },
}

interface SettingsState {
  range: VoiceRange
  /** この音量 (RMS) 未満は無音扱い */
  noiseGate: number
  /** ゲームごとに選んでいるレベル (難易度) の id */
  levels: Partial<Record<LevelGameId, string>>
  setLevel: (game: LevelGameId, level: string) => void
  /** メニュー画面の BGM */
  bgmEnabled: boolean
  /** 0〜1 */
  bgmVolume: number
  setBgmEnabled: (v: boolean) => void
  setBgmVolume: (v: number) => void
  setRange: (r: VoiceRange) => void
  setNoiseGate: (v: number) => void
}

/** localStorage に保存する部分 */
export type PersistedSettings = Pick<SettingsState, 'range' | 'noiseGate' | 'levels' | 'bgmEnabled' | 'bgmVolume'>

const DEFAULT_SETTINGS: PersistedSettings = {
  range: 'low',
  noiseGate: 0.01,
  levels: {},
  bgmEnabled: true,
  bgmVolume: 0.5,
}

/**
 * 保存データの移行。
 * v0: レベルを difficulty という名前で保存していた → levels へ
 */
export function migrateSettings(old: unknown, version: number): PersistedSettings {
  const o = (old ?? {}) as Partial<PersistedSettings> & { difficulty?: PersistedSettings['levels'] }
  const { difficulty, ...rest } = o
  const levels = version < 1 ? { ...difficulty, ...rest.levels } : (rest.levels ?? {})
  return { ...DEFAULT_SETTINGS, ...rest, levels }
}

export const useSettingsStore = create<SettingsState>()(
  persist<SettingsState, [], [], PersistedSettings>(
    (set) => ({
      range: 'low',
      noiseGate: 0.01,
      levels: {},
      setLevel: (game, level) => set((s) => ({ levels: { ...s.levels, [game]: level } })),
      bgmEnabled: true,
      bgmVolume: 0.5,
      setBgmEnabled: (bgmEnabled) => set({ bgmEnabled }),
      setBgmVolume: (bgmVolume) => set({ bgmVolume }),
      setRange: (range) => set({ range }),
      setNoiseGate: (noiseGate) => set({ noiseGate }),
    }),
    {
      name: 'koeasobi-settings',
      version: 1,
      partialize: (s) => ({
        range: s.range,
        noiseGate: s.noiseGate,
        levels: s.levels,
        bgmEnabled: s.bgmEnabled,
        bgmVolume: s.bgmVolume,
      }),
      migrate: migrateSettings,
    },
  ),
)

/** 声のゲーム (かんたん/ふつう/むずかしい) の難易度 */
export function useDifficulty(game: DifficultyGameId): Difficulty {
  return useSettingsStore((s) => (s.levels?.[game] ?? DEFAULT_LEVEL[game]) as Difficulty)
}

/** 任意のゲームのレベル id */
export function useLevel(game: LevelGameId): string {
  return useSettingsStore((s) => s.levels?.[game] ?? DEFAULT_LEVEL[game])
}

export function useVoiceRange() {
  const range = useSettingsStore((s) => s.range)
  return VOICE_RANGES[range]
}
