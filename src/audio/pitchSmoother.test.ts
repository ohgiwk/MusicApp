import { describe, expect, it } from 'vitest'
import { PitchSmoother } from './pitchSmoother'

/** 16ms ごとに値を入れて、最後の出力を返す */
function feed(s: PitchSmoother, values: (number | null)[], start = 0) {
  let out: number | null = null
  values.forEach((v, i) => (out = s.push(v, start + i * 16)))
  return out
}

describe('PitchSmoother', () => {
  it('一定の音はそのまま追従する', () => {
    const s = new PitchSmoother()
    expect(feed(s, Array(20).fill(60))).toBeCloseTo(60, 3)
  })

  it('単発のスパイク (オクターブ誤検出など) は無視する', () => {
    const s = new PitchSmoother()
    feed(s, Array(10).fill(60))
    expect(s.push(72, 200)).toBeCloseTo(60, 1)
    expect(s.push(60, 216)).toBeCloseTo(60, 1)
  })

  it('大きく跳んでも数フレーム続けば新しい音へ移る', () => {
    const s = new PitchSmoother()
    feed(s, Array(10).fill(60))
    const out = feed(s, [72, 72, 72], 200)
    expect(out).toBeCloseTo(72, 1)
  })

  it('息継ぎなどの短い無音では値を保持し、長く続けば消す', () => {
    const s = new PitchSmoother({ holdMs: 150 })
    feed(s, Array(10).fill(64))
    expect(s.push(null, 200)).toBeCloseTo(64, 1)
    expect(s.push(null, 500)).toBeNull()
  })
})
