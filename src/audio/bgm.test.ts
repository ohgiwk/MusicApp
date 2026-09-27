import { describe, expect, it } from 'vitest'
import { INTRO, LOOP, LOOP_START_BAR, TOTAL_BARS, barAt, nextBarIndex } from './bgm'

describe('BGM の構成 (イントロ + ループ)', () => {
  it('ループの最後の次はイントロではなくループ先頭へ戻る', () => {
    expect(nextBarIndex(TOTAL_BARS - 1)).toBe(LOOP_START_BAR)
    expect(LOOP_START_BAR).toBe(INTRO.length)
    const seq = [0]
    for (let i = 0; i < TOTAL_BARS + 3; i++) seq.push(nextBarIndex(seq[seq.length - 1]))
    expect(seq.filter((b) => b < LOOP_START_BAR)).toEqual([0, 1])
  })

  it('どの小節もメロディが小節内に収まり、音が重ならない', () => {
    for (let i = 0; i < TOTAL_BARS; i++) {
      const melody = barAt(i).melody
      melody.forEach(([pos, , len], k) => {
        expect(pos + len).toBeLessThanOrEqual(16)
        if (k > 0) expect(pos).toBeGreaterThanOrEqual(melody[k - 1][0] + melody[k - 1][2])
      })
    }
  })

  it('ループの継ぎ目は隣の音へ自然につながる (2半音以内)', () => {
    const last = LOOP[LOOP.length - 1].melody.at(-1)!
    const first = LOOP[0].melody[0]
    expect(Math.abs(first[1] - last[1])).toBeLessThanOrEqual(2)
  })
})
