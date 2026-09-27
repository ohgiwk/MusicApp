import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type StatKey = 'accuracy' | 'stability' | 'control' | 'melody'

export const STAT_KEYS: StatKey[] = ['accuracy', 'stability', 'control', 'melody']

export const STAT_LABELS: Record<StatKey, string> = {
  accuracy: '音程精度',
  stability: '音程安定性',
  control: '音程コントロール',
  melody: 'メロディ再現',
}

export const STAT_COLORS: Record<StatKey, string> = {
  accuracy: '#ff5fa2',
  stability: '#22c98c',
  control: '#22b8e8',
  melody: '#ffb020',
}

/** 何で計測しているか (マイページの説明用) */
export const STAT_HINTS: Record<StatKey, string> = {
  accuracy: 'ピッチターゲット・メロディコピーで、狙った音にどれだけ近いか',
  stability: 'ピッチターゲットで、声をキープしている間の揺れの小ささ',
  control: 'ボイスフライトで、ゲートを正しい高さで通過できた割合',
  melody: 'メロディコピーのスコア（音数が多いほどボーナス）',
}

export interface StatSample {
  v: number
  at: string
  game: string
}

/** 能力値の計算に使う直近の計測数 */
export const ABILITY_WINDOW = 10
const MAX_SAMPLES = 30

interface StatsState {
  samples: Record<StatKey, StatSample[]>
  plays: number
  /** プレイした日 (YYYY-MM-DD, 重複なし) */
  playDays: string[]
  todayDone: string[]
  /** 1プレイ分の計測値を記録する (プレイ回数も数える) */
  recordPlay: (gameId: string, sample: Partial<Record<StatKey, number>>) => void
  /** 能力値を測らないゲーム (耳トレ) のプレイ回数・今日のトレーニングだけを記録する */
  markPlayed: (gameId: string) => void
  resetStats: () => void
}

const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const emptySamples = (): Record<StatKey, StatSample[]> => ({ accuracy: [], stability: [], control: [], melody: [] })

/** localStorage に保存する部分 */
export type PersistedStats = Pick<StatsState, 'samples' | 'plays' | 'playDays' | 'todayDone'>

/**
 * 保存データの移行。
 * v1 以前: ダミーの能力値を持っていたので破棄し、実測だけで始め直す (今日の進み具合は残す)
 */
export function migrateStats(old: unknown, version: number): PersistedStats {
  const o = (old ?? {}) as Partial<PersistedStats>
  if (version < 2) return { samples: emptySamples(), plays: 0, playDays: [], todayDone: o.todayDone ?? [] }
  return {
    samples: { ...emptySamples(), ...o.samples },
    plays: o.plays ?? 0,
    playDays: o.playDays ?? [],
    todayDone: o.todayDone ?? [],
  }
}

/** プレイ回数・プレイした日・今日のトレーニングの更新 */
function playedUpdate(s: Pick<StatsState, 'plays' | 'playDays' | 'todayDone'>, gameId: string) {
  const day = localDay()
  return {
    plays: s.plays + 1,
    playDays: s.playDays.includes(day) ? s.playDays : [...s.playDays, day].slice(-400),
    todayDone: s.todayDone.filter((d) => d.startsWith(day)).concat(`${day}:${gameId}`),
  }
}

export const useStatsStore = create<StatsState>()(
  persist<StatsState, [], [], PersistedStats>(
    (set) => ({
      samples: emptySamples(),
      plays: 0,
      playDays: [],
      todayDone: [],
      recordPlay: (gameId, sample) =>
        set((s) => {
          const at = new Date().toISOString()
          const samples = { ...s.samples }
          for (const k of STAT_KEYS) {
            const v = sample[k]
            if (v === undefined) continue
            samples[k] = [...samples[k], { v, at, game: gameId }].slice(-MAX_SAMPLES)
          }
          return { samples, ...playedUpdate(s, gameId) }
        }),
      markPlayed: (gameId) => set((s) => playedUpdate(s, gameId)),
      resetStats: () => set({ samples: emptySamples(), plays: 0, playDays: [], todayDone: [] }),
    }),
    {
      name: 'koeasobi-stats',
      version: 2,
      partialize: (s) => ({ samples: s.samples, plays: s.plays, playDays: s.playDays, todayDone: s.todayDone }),
      migrate: migrateStats,
    },
  ),
)

/**
 * 直近の計測値の加重平均 (新しいものほど重い)。計測がなければ null
 */
export function abilityOf(samples: StatSample[]): number | null {
  const recent = samples.slice(-ABILITY_WINDOW)
  if (recent.length === 0) return null
  let sum = 0
  let wsum = 0
  recent.forEach((s, i) => {
    const w = i + 1
    sum += s.v * w
    wsum += w
  })
  return Math.round(sum / wsum)
}

export interface Ability {
  value: number | null
  /** 最新の計測で何点変わったか */
  delta: number | null
  count: number
}

export function computeAbilities(samples: Record<StatKey, StatSample[]>): Record<StatKey, Ability> {
  const out = {} as Record<StatKey, Ability>
  for (const k of STAT_KEYS) {
    const list = samples[k]
    const value = abilityOf(list)
    const before = list.length >= 2 ? abilityOf(list.slice(0, -1)) : null
    out[k] = { value, delta: value !== null && before !== null ? value - before : null, count: list.length }
  }
  return out
}

/** 今日を含む連続プレイ日数 (今日まだなら昨日まで) */
export function streakOf(playDays: string[]): number {
  const set = new Set(playDays)
  const d = new Date()
  if (!set.has(localDay(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (set.has(localDay(d))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

export function isDoneToday(done: string[], gameId: string) {
  return done.includes(`${localDay()}:${gameId}`)
}
