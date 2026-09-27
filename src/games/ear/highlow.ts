import type { HighLowLevel } from '../difficulty'
import { randomBase } from './common'

/**
 * 音程差 (cents) を出題しやすい値に丸める。
 * 1半音以上は半音単位 (「3半音」と言える)、それ未満は 5 cents 単位。
 */
export function quantizeDiff(cents: number): number {
  return cents >= 100 ? Math.round(cents / 100) * 100 : Math.max(5, Math.round(cents / 5) * 5)
}

export function initialDiff(level: HighLowLevel): number {
  return quantizeDiff(level.startMin + Math.random() * (level.startMax - level.startMin))
}

/**
 * 次の問題の音程差。
 * 2問連続正解から 1問ごとに 25% ずつ小さく、間違えたら 40% 大きくする (下限・上限あり)。
 */
export function nextDiff(diff: number, correct: boolean, combo: number, level: HighLowLevel): number {
  if (!correct) return Math.min(level.startMax, quantizeDiff(diff * 1.4))
  if (combo < 2) return diff
  let next = quantizeDiff(diff * 0.75)
  // 丸めで変わらなかったら1段階だけ下げる
  if (next >= diff) next = diff >= 200 ? diff - 100 : diff > 100 ? 100 : diff - 5
  return Math.max(level.floor, next)
}

export interface HighLowQuestion {
  first: number
  second: number
  /** 2音目が高いなら 1、低いなら -1 */
  dir: 1 | -1
  diffCents: number
}

export function makeQuestion(diffCents: number): HighLowQuestion {
  const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1
  const first = randomBase(55, 67)
  return { first, second: first + (dir * diffCents) / 100, dir, diffCents }
}

/** 差が小さいほど高得点 (100〜200点) */
export function basePoints(diffCents: number): number {
  return 100 + Math.round(100 * (1 - Math.min(diffCents, 1200) / 1200))
}
