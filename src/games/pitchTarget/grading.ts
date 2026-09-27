import type { TargetLevel } from '../difficulty'
import { COLORS } from '../../theme'

export type Grade = 'PERFECT' | 'GREAT' | 'GOOD'

export const GRADE_STYLE: Record<Grade, { color: string; points: number }> = {
  PERFECT: { color: COLORS.bubble, points: 100 },
  GREAT: { color: COLORS.sun, points: 80 },
  GOOD: { color: COLORS.sky, points: 60 },
}

export interface HoldStats {
  meanAbs: number
  stdDev: number
}

export function summarize(samples: number[]): HoldStats {
  if (samples.length === 0) return { meanAbs: 25, stdDev: 25 }
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

/** 目標音を選ぶ (同じ音が続かないように)。難易度で音域の端と半音の有無を変える */
export function pickTarget(min: number, max: number, level: TargetLevel, prev?: number): number {
  const candidates: number[] = []
  for (let m = min + level.rangeInset; m <= max - level.rangeInset; m++) {
    const pc = ((m % 12) + 12) % 12
    if ((level.sharps || [0, 2, 4, 5, 7, 9, 11].includes(pc)) && m !== prev) candidates.push(m)
  }
  return candidates[Math.floor(Math.random() * candidates.length)]
}
