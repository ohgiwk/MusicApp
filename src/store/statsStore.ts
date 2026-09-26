import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type StatKey = 'accuracy' | 'stability' | 'control' | 'melody'

export const STAT_LABELS: Record<StatKey, string> = {
  accuracy: '音程精度',
  stability: '音程安定性',
  control: '音程コントロール',
  melody: 'メロディ再現',
}

interface StatsState {
  stats: Record<StatKey, number>
  plays: number
  todayDone: string[]
  /** 0〜100 のプレイ結果を能力値へ反映 (直近の結果を重めに) */
  record: (updates: Partial<Record<StatKey, number>>, gameId: string) => void
}

const today = () => new Date().toISOString().slice(0, 10)

export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      // プロトタイプ用のダミー初期値
      stats: { accuracy: 42, stability: 55, control: 38, melody: 47 },
      plays: 0,
      todayDone: [],
      record: (updates, gameId) =>
        set((s) => {
          const stats = { ...s.stats }
          for (const [k, v] of Object.entries(updates) as [StatKey, number][]) {
            stats[k] = Math.round(stats[k] * 0.7 + v * 0.3)
          }
          const key = `${today()}:${gameId}`
          return {
            stats,
            plays: s.plays + 1,
            todayDone: s.todayDone.filter((d) => d.startsWith(today())).concat(key),
          }
        }),
    }),
    { name: 'koeasobi-stats' },
  ),
)

export function isDoneToday(done: string[], gameId: string) {
  return done.includes(`${today()}:${gameId}`)
}
