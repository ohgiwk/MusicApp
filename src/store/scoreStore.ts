import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type RankedGameId = 'target' | 'flight' | 'melody'

export interface ScoreRecord {
  id: string
  score: number
  /** ISO 日時 */
  at: string
  /** ランキングに添える補足 (例: "4音", "12/15 ゲート") */
  detail?: string
}

export interface RankResult {
  /** 1始まりの順位。ランキング圏外なら null */
  rank: number | null
  /** 自己ベスト更新 (初プレイ含む) */
  isBest: boolean
  id: string
}

/** 各ゲームで保持する件数 */
export const RANKING_SIZE = 10

interface ScoreState {
  records: Record<RankedGameId, ScoreRecord[]>
  /** 直近に記録したスコアの id (ランキング画面で強調表示する) */
  lastIds: Partial<Record<RankedGameId, string>>
  addScore: (game: RankedGameId, score: number, detail?: string) => RankResult
  clear: (game: RankedGameId) => void
}

const byScore = (a: ScoreRecord, b: ScoreRecord) => b.score - a.score || a.at.localeCompare(b.at)

/** 端末内 (localStorage) に保存する自己ランキング */
export const useScoreStore = create<ScoreState>()(
  persist(
    (set, get) => ({
      records: { target: [], flight: [], melody: [] },
      lastIds: {},
      addScore: (game, score, detail) => {
        const prev = get().records[game]
        const rec: ScoreRecord = {
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          score,
          at: new Date().toISOString(),
          detail,
        }
        const isBest = prev.length === 0 || score > prev[0].score
        const next = [...prev, rec].sort(byScore).slice(0, RANKING_SIZE)
        const idx = next.findIndex((r) => r.id === rec.id)
        set((s) => ({
          records: { ...s.records, [game]: next },
          lastIds: { ...s.lastIds, [game]: rec.id },
        }))
        return { rank: idx === -1 ? null : idx + 1, isBest, id: rec.id }
      },
      clear: (game) => set((s) => ({ records: { ...s.records, [game]: [] } })),
    }),
    { name: 'koeasobi-scores' },
  ),
)

export function useBestScore(game: RankedGameId): number | null {
  return useScoreStore((s) => s.records[game][0]?.score ?? null)
}
