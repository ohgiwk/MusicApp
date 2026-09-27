import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Difficulty } from '../games/difficulty'

export type RankedGameId = 'target' | 'flight' | 'melody'

export interface ScoreRecord {
  id: string
  score: number
  difficulty: Difficulty
  /** ISO 日時 */
  at: string
  /** ランキングに添える補足 (例: "4音", "12/15 ゲート") */
  detail?: string
}

export interface RankResult {
  /** 1始まりの順位 (同じ難易度の中で)。ランキング圏外なら null */
  rank: number | null
  /** 自己ベスト更新 (同じ難易度で初プレイ含む) */
  isBest: boolean
  id: string
  difficulty: Difficulty
}

/** 各ゲーム・各難易度で保持する件数 */
export const RANKING_SIZE = 10

interface ScoreState {
  /** ゲームごとの記録 (難易度が混ざっている。表示時に難易度で絞り込む) */
  records: Record<RankedGameId, ScoreRecord[]>
  /** 直近に記録したスコアの id (ランキング画面で強調表示する) */
  lastIds: Partial<Record<RankedGameId, string>>
  addScore: (game: RankedGameId, difficulty: Difficulty, score: number, detail?: string) => RankResult
  clear: (game: RankedGameId, difficulty: Difficulty) => void
}

const byScore = (a: ScoreRecord, b: ScoreRecord) => b.score - a.score || a.at.localeCompare(b.at)

/** 指定した難易度のランキング (スコア順) */
export function rankingOf(records: ScoreRecord[], difficulty: Difficulty): ScoreRecord[] {
  return records.filter((r) => r.difficulty === difficulty).sort(byScore)
}

/** 端末内 (localStorage) に保存する自己ランキング */
export const useScoreStore = create<ScoreState>()(
  persist(
    (set, get) => ({
      records: { target: [], flight: [], melody: [] },
      lastIds: {},
      addScore: (game, difficulty, score, detail) => {
        const all = get().records[game]
        const same = rankingOf(all, difficulty)
        const rec: ScoreRecord = {
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          score,
          difficulty,
          at: new Date().toISOString(),
          detail,
        }
        const isBest = same.length === 0 || score > same[0].score
        const nextSame = [...same, rec].sort(byScore).slice(0, RANKING_SIZE)
        const idx = nextSame.findIndex((r) => r.id === rec.id)
        const others = all.filter((r) => r.difficulty !== difficulty)
        set((s) => ({
          records: { ...s.records, [game]: [...others, ...nextSame] },
          lastIds: { ...s.lastIds, [game]: rec.id },
        }))
        return { rank: idx === -1 ? null : idx + 1, isBest, id: rec.id, difficulty }
      },
      clear: (game, difficulty) =>
        set((s) => ({ records: { ...s.records, [game]: s.records[game].filter((r) => r.difficulty !== difficulty) } })),
    }),
    {
      name: 'koeasobi-scores',
      version: 1,
      // 難易度導入前の記録は「ふつう」として扱う
      migrate: (old) => {
        const o = (old ?? {}) as { records?: Record<RankedGameId, Omit<ScoreRecord, 'difficulty'>[]>; lastIds?: ScoreState['lastIds'] }
        const fix = (list?: Omit<ScoreRecord, 'difficulty'>[]) => (list ?? []).map((r) => ({ ...r, difficulty: 'normal' as const }))
        return {
          records: { target: fix(o.records?.target), flight: fix(o.records?.flight), melody: fix(o.records?.melody) },
          lastIds: o.lastIds ?? {},
        } as unknown as ScoreState
      },
    },
  ),
)

export function useBestScore(game: RankedGameId, difficulty: Difficulty): number | null {
  return useScoreStore((s) => rankingOf(s.records[game], difficulty)[0]?.score ?? null)
}
