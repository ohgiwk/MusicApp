import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 耳トレの記録 (端末内に保存) */
interface EarState {
  /** HIGH or LOW: 2問連続で正解できた最小の音程差 (cents) */
  minDiffCents: number | null
  /** PITCH DISTANCE: 正答率 80% 以上でクリアした最高レベル (0 = なし) */
  distanceLevelCleared: number
  /** PITCH DISTANCE: 直近の正答率 (%) */
  distanceRecent: number[]
  /** MELODY MEMORY: 正解できた最長のメロディ (音数) */
  memoryMaxNotes: number
  /** MELODY MEMORY: 直近の正答率 (%) */
  memoryRecent: number[]
  recordHighLow: (minCents: number | null) => void
  recordDistance: (level: number, accuracy: number) => void
  recordMemory: (maxNotes: number, accuracy: number) => void
}

const pushRecent = (list: number[], v: number) => [...list, Math.round(v)].slice(-10)

export const useEarStore = create<EarState>()(
  persist(
    (set) => ({
      minDiffCents: null,
      distanceLevelCleared: 0,
      distanceRecent: [],
      memoryMaxNotes: 0,
      memoryRecent: [],
      recordHighLow: (minCents) =>
        set((s) => ({
          minDiffCents:
            minCents === null
              ? s.minDiffCents
              : s.minDiffCents === null
                ? minCents
                : Math.min(s.minDiffCents, minCents),
        })),
      recordDistance: (level, accuracy) =>
        set((s) => ({
          distanceLevelCleared: accuracy >= 80 ? Math.max(s.distanceLevelCleared, level) : s.distanceLevelCleared,
          distanceRecent: pushRecent(s.distanceRecent, accuracy),
        })),
      recordMemory: (maxNotes, accuracy) =>
        set((s) => ({
          memoryMaxNotes: Math.max(s.memoryMaxNotes, maxNotes),
          memoryRecent: pushRecent(s.memoryRecent, accuracy),
        })),
    }),
    {
      name: 'koeasobi-ear',
      version: 0,
      partialize: ({ minDiffCents, distanceLevelCleared, distanceRecent, memoryMaxNotes, memoryRecent }) => ({
        minDiffCents,
        distanceLevelCleared,
        distanceRecent,
        memoryMaxNotes,
        memoryRecent,
      }),
    },
  ),
)

export const average = (list: number[]) =>
  list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : null
