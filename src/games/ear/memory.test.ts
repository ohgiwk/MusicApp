import { describe, expect, it } from 'vitest'
import { MEMORY_LEVELS } from '../difficulty'
import { makeQuestion, shapeDistance } from './memory'

describe('MELODY MEMORY', () => {
  it.each(Object.entries(MEMORY_LEVELS))('%s: 音数・選択肢数がレベルどおりで、選択肢どうしは見分けがつく', (_, L) => {
    const minDiff = L.minNotes >= 6 ? 2 : L.minNotes >= 4 ? 3 : 4
    for (let i = 0; i < 200; i++) {
      const q = makeQuestion(L)
      expect(q.melody.length).toBeGreaterThanOrEqual(L.minNotes)
      expect(q.melody.length).toBeLessThanOrEqual(L.maxNotes)
      expect(q.options).toHaveLength(L.choices)
      expect(q.options[q.answer]).toBe(q.melody)
      for (let a = 0; a < q.options.length; a++)
        for (let b = a + 1; b < q.options.length; b++)
          expect(shapeDistance(q.options[a], q.options[b])).toBeGreaterThanOrEqual(minDiff)
    }
  })

  it('同じ音の連続は「むずかしい」でだけ出る', () => {
    const hasRepeat = (m: number[]) => m.some((v, i) => i > 0 && v === m[i - 1])
    const count = (L: (typeof MEMORY_LEVELS)['easy']) =>
      Array.from({ length: 300 }, () => makeQuestion(L).melody).filter(hasRepeat).length
    expect(count(MEMORY_LEVELS.easy)).toBe(0)
    expect(count(MEMORY_LEVELS.normal)).toBe(0)
    expect(count(MEMORY_LEVELS.hard)).toBeGreaterThan(0)
  })
})
