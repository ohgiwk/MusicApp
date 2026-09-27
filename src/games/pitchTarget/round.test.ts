import { describe, expect, it } from 'vitest'
import { midiToFreq } from '../../audio/pitchUtils'
import { EMPTY_VIEW, TRAIL_LEN, TargetRound, hintFor } from './round'

const LEVEL = { hitRange: 25, holdMs: 1500 }
const A3 = 57
/** 目標から cents だけずらした周波数 */
const off = (cents: number) => midiToFreq(A3 + cents / 100)

/** 16ms ごとに freq を入れて、クリアしたらその結果とフレーム数を返す */
function run(round: TargetRound, freqs: (number | null)[], start = 1000) {
  for (let i = 0; i < freqs.length; i++) {
    const r = round.update(freqs[i], start + i * 16)
    if (r) return { clear: r, frame: i }
  }
  return null
}

describe('ピッチターゲットの1問', () => {
  it('正解範囲を holdMs キープするとクリアし、ずれが小さければ PERFECT', () => {
    const round = new TargetRound(A3, LEVEL, 1000, 1000)
    const res = run(round, Array(200).fill(off(3)))
    expect(res).not.toBeNull()
    expect(res!.frame * 16).toBeGreaterThanOrEqual(LEVEL.holdMs - 32)
    expect(res!.frame * 16).toBeLessThanOrEqual(LEVEL.holdMs + 32)
    expect(res!.clear.grade).toBe('PERFECT')
    expect(res!.clear.meanAbs).toBeCloseTo(3, 0)
  })

  it('正解範囲の外ではクリアしない', () => {
    const round = new TargetRound(A3, LEVEL, 1000, 1000)
    expect(run(round, Array(300).fill(off(40)))).toBeNull()
    expect(round.view(6000).hold).toBe(0)
  })

  it('お手本の再生中 (listenAfter まで) は判定しない', () => {
    const round = new TargetRound(A3, LEVEL, 1000, 1000 + 2000)
    // 2秒間はずっと正解の高さでも数えない
    expect(run(round, Array(120).fill(off(0)))).toBeNull()
    expect(round.view(2900)).toMatchObject({ hold: 0, listening: false })
  })

  it('外れるとゲージは減るが、声が途切れたときはよりゆっくり減る', () => {
    const a = new TargetRound(A3, LEVEL, 0, 0)
    const b = new TargetRound(A3, LEVEL, 0, 0)
    run(a, [...Array(40).fill(off(0)), ...Array(20).fill(off(60))], 0)
    run(b, [...Array(40).fill(off(0)), ...Array(20).fill(null)], 0)
    expect(a.view(0).hold).toBeLessThan(b.view(0).hold)
    expect(b.view(0).hold).toBeGreaterThan(0)
  })

  it('スキップ (end) した問題はクリアしない', () => {
    const round = new TargetRound(A3, LEVEL, 0, 0)
    round.end()
    expect(run(round, Array(200).fill(off(0)), 0)).toBeNull()
  })

  it('クリアは1回だけ。判定を止めている間も軌跡は更新する', () => {
    const round = new TargetRound(A3, LEVEL, 0, 0)
    run(round, Array(200).fill(off(0)), 0)
    expect(round.update(off(0), 10_000)).toBeNull()
    for (let i = 0; i < 80; i++) round.update(i % 2 ? null : off(10), 20_000 + i * 16, false)
    expect(round.view(30_000).trail).toHaveLength(TRAIL_LEN)
    expect(round.view(30_000).trail[0]).toBeNull()
  })
})

describe('声に合わせたひとこと', () => {
  const at = (cents: number | null) => ({ ...EMPTY_VIEW, cents, listening: true })

  it.each([
    [0, 'キープ！'],
    [60, 'もう少し下'],
    [250, 'もっと下！'],
    [-60, 'もう少し上'],
    [-250, 'もっと上！'],
    [1190, '1オクターブ上かも？ 低く！'],
    [-1210, '1オクターブ下かも？ 高く！'],
  ])('%s cents → %s', (cents, text) => {
    expect(hintFor(at(cents), 25)).toBe(text)
  })

  it('お手本の再生中・声がないとき', () => {
    expect(hintFor({ ...EMPTY_VIEW, listening: false }, 25)).toBe('お手本を聞いてね…')
    expect(hintFor(at(null), 25)).toBe('声を出してください')
  })
})
