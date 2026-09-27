import { useCallback, useState } from 'react'
import { comboBonus, replayFactor } from '../games/ear/common'

export type AnswerKind = 'correct' | 'partial' | 'wrong'

/**
 * 耳トレ1ゲーム分のスコア・COMBO・「もう一度聴く」回数を管理する。
 * 得点 = 基本点 × 聴き直し倍率 + COMBO ボーナス (部分正解は 30%、COMBO は途切れる)
 */
export function useEarSession(total: number) {
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [replays, setReplays] = useState(0)
  const [totalReplays, setTotalReplays] = useState(0)

  const commit = useCallback(
    (kind: AnswerKind, basePoints: number) => {
      const factor = replayFactor(replays)
      let gained = 0
      let nextCombo = 0
      if (kind === 'correct') {
        nextCombo = combo + 1
        gained = Math.round(basePoints * factor) + comboBonus(nextCombo)
        setCorrect((c) => c + 1)
      } else if (kind === 'partial') {
        gained = Math.round(basePoints * 0.3 * factor)
      }
      setCombo(nextCombo)
      setMaxCombo((m) => Math.max(m, nextCombo))
      setScore((s) => s + gained)
      return { gained, combo: nextCombo }
    },
    [combo, replays],
  )

  return {
    index,
    total,
    isLast: index >= total - 1,
    score,
    combo,
    maxCombo,
    correct,
    replays,
    totalReplays,
    /** 「もう一度聴く」を押した */
    addReplay: () => {
      setReplays((r) => r + 1)
      setTotalReplays((r) => r + 1)
    },
    commit,
    next: () => {
      setIndex((i) => i + 1)
      setReplays(0)
    },
    reset: () => {
      setIndex(0)
      setScore(0)
      setCombo(0)
      setMaxCombo(0)
      setCorrect(0)
      setReplays(0)
      setTotalReplays(0)
    },
  }
}
