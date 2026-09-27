import { describe, expect, it } from 'vitest'
import { TARGET_LEVELS } from '../difficulty'
import { gradeOf, pickTarget, summarize } from './grading'

describe('ピッチターゲットの判定', () => {
  it('キープ中の平均のずれで PERFECT / GREAT / GOOD を決める', () => {
    expect(gradeOf({ meanAbs: 5, stdDev: 2 }, 2000)).toBe('PERFECT')
    expect(gradeOf({ meanAbs: 12, stdDev: 2 }, 2000)).toBe('GREAT')
    expect(gradeOf({ meanAbs: 20, stdDev: 2 }, 2000)).toBe('GOOD')
  })

  it('クリアに時間がかかると1段階下がりうる', () => {
    expect(gradeOf({ meanAbs: 5, stdDev: 2 }, 9000)).toBe('GREAT')
  })

  it('平均と揺れを計算する', () => {
    const s = summarize([10, -10, 10, -10])
    expect(s.meanAbs).toBe(10)
    expect(s.stdDev).toBe(10)
  })

  it('出題はレベルの音域・半音の有無に従い、同じ音は続かない', () => {
    const [min, max] = [45, 64]
    for (let i = 0; i < 300; i++) {
      const normal = pickTarget(min, max, TARGET_LEVELS.normal, 55)
      expect(normal).not.toBe(55)
      expect(normal).toBeGreaterThanOrEqual(min + 2)
      expect(normal).toBeLessThanOrEqual(max - 2)
      expect([1, 3, 6, 8, 10]).not.toContain(normal % 12)
    }
    const hardPicks = Array.from({ length: 500 }, () => pickTarget(min, max, TARGET_LEVELS.hard))
    expect(hardPicks.some((m) => [1, 3, 6, 8, 10].includes(m % 12))).toBe(true)
  })
})
