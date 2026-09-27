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
  /** ゲームごとの難易度 (レベル) */
  difficulty: Partial<Record<LevelGameId, string>>
  setDifficulty: (game: LevelGameId, level: string) => void
  /** メニュー画面の BGM */
  bgmEnabled: boolean
  /** 0〜1 */
  bgmVolume: number
  setBgmEnabled: (v: boolean) => void
  setBgmVolume: (v: number) => void
  setRange: (r: VoiceRange) => void
  setNoiseGate: (v: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      range: 'low',
      noiseGate: 0.01,
      difficulty: { target: 'normal', flight: 'normal', melody: 'normal' },
      setDifficulty: (game, d) => set((s) => ({ difficulty: { ...s.difficulty, [game]: d } })),
      bgmEnabled: true,
      bgmVolume: 0.5,
      setBgmEnabled: (bgmEnabled) => set({ bgmEnabled }),
      setBgmVolume: (bgmVolume) => set({ bgmVolume }),
      setRange: (range) => set({ range }),
      setNoiseGate: (noiseGate) => set({ noiseGate }),
    }),
    { name: 'koeasobi-settings' },
  ),
)

/** 声のゲーム (かんたん/ふつう/むずかしい) の難易度 */
export function useDifficulty(game: DifficultyGameId): Difficulty {
  return useSettingsStore((s) => (s.difficulty?.[game] ?? 'normal') as Difficulty)
}

/** 任意のゲームのレベル id */
export function useLevel(game: LevelGameId): string {
  return useSettingsStore((s) => s.difficulty?.[game] ?? DEFAULT_LEVEL[game])
}

export function useVoiceRange() {
  const range = useSettingsStore((s) => s.range)
  return VOICE_RANGES[range]
}
