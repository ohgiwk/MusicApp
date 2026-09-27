import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type RankedGameId = 'target' | 'flight' | 'melody' | 'highlow' | 'distance' | 'memory'

export const RANKED_GAME_IDS: RankedGameId[] = ['target', 'flight', 'melody', 'highlow', 'distance', 'memory']

const emptyRecords = (): Record<RankedGameId, ScoreRecord[]> => ({
  target: [],
  flight: [],
  melody: [],
  highlow: [],
  distance: [],
  memory: [],
})

export interface ScoreRecord {
  id: string
  score: number
  /** 難易度 / レベルの id (easy, normal, hard, lv1 など) */
  difficulty: string
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
  difficulty: string
}

/** 各ゲーム・各難易度で保持する件数 */
export const RANKING_SIZE = 10

interface ScoreState {
  /** ゲームごとの記録 (難易度が混ざっている。表示時に難易度で絞り込む) */
  records: Record<RankedGameId, ScoreRecord[]>
  /** 直近に記録したスコアの id (ランキング画面で強調表示する) */
  lastIds: Partial<Record<RankedGameId, string>>
  addScore: (game: RankedGameId, difficulty: string, score: number, detail?: string) => RankResult
  clear: (game: RankedGameId, difficulty: string) => void
}

const byScore = (a: ScoreRecord, b: ScoreRecord) => b.score - a.score || a.at.localeCompare(b.at)

/** 指定した難易度のランキング (スコア順) */
export function rankingOf(records: ScoreRecord[] | undefined, difficulty: string): ScoreRecord[] {
  return (records ?? []).filter((r) => r.difficulty === difficulty).sort(byScore)
}

/** 端末内 (localStorage) に保存する自己ランキング */
export const useScoreStore = create<ScoreState>()(
  persist(
    (set, get) => ({
      records: emptyRecords(),
      lastIds: {},
      addScore: (game, difficulty, score, detail) => {
        const all = get().records[game] ?? []
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
        const o = (old ?? {}) as {
          records?: Record<RankedGameId, Omit<ScoreRecord, 'difficulty'>[]>
          lastIds?: ScoreState['lastIds']
        }
        const fix = (list?: Omit<ScoreRecord, 'difficulty'>[]) =>
          (list ?? []).map((r) => ({ ...r, difficulty: 'normal' as const }))
        return {
          records: {
            ...emptyRecords(),
            target: fix(o.records?.target),
            flight: fix(o.records?.flight),
            melody: fix(o.records?.melody),
          },
          lastIds: o.lastIds ?? {},
        } as unknown as ScoreState
      },
      // 後から追加したゲームの記録欄が保存データに無くても壊れないよう、初期値に重ねる
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ScoreState>
        return { ...current, ...p, records: { ...current.records, ...(p.records ?? {}) } }
      },
    },
  ),
)
