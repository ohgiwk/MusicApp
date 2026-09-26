export type Grade = 'PERFECT' | 'GREAT' | 'GOOD'

/** 正解範囲 (cents) */
export const HIT_RANGE = 25
/** 正解範囲をこの時間 (ms) 維持するとクリア */
export const HOLD_MS = 1500

export const GRADE_STYLE: Record<Grade, { color: string; points: number }> = {
  PERFECT: { color: '#ff5fa2', points: 100 },
  GREAT: { color: '#ffb020', points: 80 },
  GOOD: { color: '#22b8e8', points: 60 },
}

export interface HoldStats {
  meanAbs: number
  stdDev: number
}

export function summarize(samples: number[]): HoldStats {
  if (samples.length === 0) return { meanAbs: HIT_RANGE, stdDev: HIT_RANGE }
  const meanAbs = samples.reduce((a, c) => a + Math.abs(c), 0) / samples.length
  const mean = samples.reduce((a, c) => a + c, 0) / samples.length
  const variance = samples.reduce((a, c) => a + (c - mean) ** 2, 0) / samples.length
  return { meanAbs, stdDev: Math.sqrt(variance) }
}

/** 正解範囲内での平均ズレと、クリアまでにかかった時間から判定 */
export function gradeOf(stats: HoldStats, elapsedMs: number): Grade {
  const slowPenalty = elapsedMs > 8000 ? 5 : 0
  const v = stats.meanAbs + slowPenalty
  if (v <= 8) return 'PERFECT'
  if (v <= 15) return 'GREAT'
  return 'GOOD'
}

/**
 * 画面表示用: cent差を -1〜1 に圧縮変換。
 * ターゲット付近を拡大して見せるため、べき乗で非線形にする。
 */
export const VIEW_RANGE_CENTS = 400
export function centsToView(cents: number): number {
  const n = Math.min(1, Math.abs(cents) / VIEW_RANGE_CENTS)
  return Math.sign(cents) * Math.pow(n, 0.65)
}

/** 目標音の候補 (幹音のみ、同じ音が続かないように) */
export function pickTarget(min: number, max: number, prev?: number): number {
  const candidates: number[] = []
  for (let m = min + 2; m <= max - 2; m++) {
    const pc = ((m % 12) + 12) % 12
    if ([0, 2, 4, 5, 7, 9, 11].includes(pc) && m !== prev) candidates.push(m)
  }
  return candidates[Math.floor(Math.random() * candidates.length)]
}
