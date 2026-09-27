import { describe, expect, it } from 'vitest'
import { HIGHLOW_LEVELS } from '../difficulty'
import { initialDiff, makeQuestion, nextDiff, quantizeDiff } from './highlow'

describe('HIGH or LOW', () => {
  it('1半音以上は半音単位、それ未満は 5 cents 単位に丸める', () => {
    expect(quantizeDiff(250)).toBe(300)
    expect(quantizeDiff(47)).toBe(45)
    expect(quantizeDiff(2)).toBe(5)
  })

  it('最初の差はレベルの範囲内', () => {
    for (const [, L] of Object.entries(HIGHLOW_LEVELS)) {
      for (let i = 0; i < 100; i++) {
        const d = initialDiff(L)
        expect(d).toBeGreaterThanOrEqual(L.startMin)
        expect(d).toBeLessThanOrEqual(L.startMax)
      }
    }
  })

  it('2問連続正解から差が小さくなり、下限で止まる', () => {
    const L = HIGHLOW_LEVELS.hard
    expect(nextDiff(200, true, 1, L)).toBe(200)
    expect(nextDiff(200, true, 2, L)).toBeLessThan(200)
    let d = 200
    for (let combo = 2; combo < 30; combo++) d = nextDiff(d, true, combo, L)
    expect(d).toBe(L.floor)
  })

  it('間違えると差が大きくなる (上限あり)', () => {
    const L = HIGHLOW_LEVELS.easy
    expect(nextDiff(500, false, 0, L)).toBe(700)
    expect(nextDiff(1200, false, 0, L)).toBe(L.startMax)
  })

  it('2音目は指定した差だけ上か下にずれる', () => {
    const q = makeQuestion(300)
    expect(Math.abs(q.second - q.first)).toBeCloseTo(3)
    expect(Math.sign(q.second - q.first)).toBe(q.dir)
  })
})
