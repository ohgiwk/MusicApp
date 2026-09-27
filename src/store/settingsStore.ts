import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { parseNote } from '../audio/pitchUtils'
import type { Difficulty, DifficultyGameId } from '../games/difficulty'

export type VoiceRange = 'low' | 'high'

export const VOICE_RANGES: Record<VoiceRange, { label: string; sub: string; min: number; max: number }> = {
  low: { label: '低め', sub: 'A2〜E4', min: parseNote('A2'), max: parseNote('E4') },
  high: { label: '高め', sub: 'A3〜E5', min: parseNote('A3'), max: parseNote('E5') },
}

interface SettingsState {
  range: VoiceRange
  /** この音量 (RMS) 未満は無音扱い */
  noiseGate: number
  /** ゲームごとの難易度 */
  difficulty: Record<DifficultyGameId, Difficulty>
  setDifficulty: (game: DifficultyGameId, d: Difficulty) => void
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
      setRange: (range) => set({ range }),
      setNoiseGate: (noiseGate) => set({ noiseGate }),
    }),
    { name: 'koeasobi-settings' },
  ),
)

export function useDifficulty(game: DifficultyGameId) {
  return useSettingsStore((s) => s.difficulty?.[game] ?? 'normal')
}

export function useVoiceRange() {
  const range = useSettingsStore((s) => s.range)
  return VOICE_RANGES[range]
}
