import type { StatKey } from '../store/statsStore'

/**
 * 各ミニゲームの生の結果から、能力値 (0〜100) の計測値を作る。
 * 計測できなかった項目は含めない (未計測のまま平均を下げないように)。
 */
export type AbilitySample = Partial<Record<StatKey, number>>

const clamp100 = (v: number) => Math.round(Math.max(0, Math.min(100, v)))

export interface TargetRound {
  /** 正解範囲内での平均ズレ (cents)。スキップなら null */
  meanAbs: number | null
  /** 正解範囲内での揺れ (標準偏差 cents)。スキップなら null */
  stdDev: number | null
  /** クリアまでの時間 (ms)。スキップなら null */
  clearMs: number | null
}

/**
 * ピッチターゲット
 * - 音程精度: 狙った音にどれだけ近いか。ズレ 1 cent = -2点、3秒を超えて時間がかかると最大 -30点。スキップは 0点
 * - 音程安定性: 音をキープしている間の揺れの小ささ。揺れ 1 cent = -4点
 */
export function fromPitchTarget(rounds: TargetRound[]): AbilitySample {
  if (rounds.length === 0) return {}
  const accuracy =
    rounds.reduce((a, r) => {
      if (r.meanAbs === null || r.clearMs === null) return a
      const slow = Math.min(30, Math.max(0, (r.clearMs - 3000) / 500))
      return a + clamp100(100 - r.meanAbs * 2 - slow)
    }, 0) / rounds.length
  const held = rounds.filter((r) => r.stdDev !== null)
  const out: AbilitySample = { accuracy: clamp100(accuracy) }
  if (held.length) out.stability = clamp100(100 - (held.reduce((a, r) => a + r.stdDev!, 0) / held.length) * 4)
  return out
}

/**
 * ボイスフライト
 * - 音程コントロール: 声の高さを狙った位置へ動かせるか。ゲート通過率 75% + ど真ん中通過率 25%
 */
export function fromVoiceFlight(s: { hits: number; perfects: number; misses: number }): AbilitySample {
  const total = s.hits + s.misses
  if (total === 0) return {}
  return { control: clamp100(100 * (0.75 * (s.hits / total) + 0.25 * (s.perfects / total))) }
}

/**
 * メロディコピー
 * - メロディ再現: スコア。音数が多いほどボーナス (1音増えるごとに +8%)
 * - 音程精度: 各音の平均ズレ。1 cent = -1.2点 (歌の中なのでピッチターゲットより甘め)
 */
export function fromMelodyCopy(score: number, avgAbsCents: number | null, noteCount: number): AbilitySample {
  const out: AbilitySample = { melody: clamp100(score * (1 + 0.08 * (noteCount - 3))) }
  if (avgAbsCents !== null) out.accuracy = clamp100(100 - avgAbsCents * 1.2)
  return out
}
