import { describe, expect, it } from 'vitest'
import { abilityOf, computeAbilities, migrateStats, streakOf, type StatSample } from './statsStore'

const samples = (vs: number[]): StatSample[] => vs.map((v) => ({ v, at: '', game: 'target' }))

const day = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('能力値の計算', () => {
  it('新しい計測ほど重い加重平均 (直近 10 回)', () => {
    expect(abilityOf(samples([40, 60, 80]))).toBe(67)
    expect(abilityOf(samples([0, 0, ...Array(10).fill(50)]))).toBe(50)
    expect(abilityOf([])).toBeNull()
  })

  it('最新の計測での増減と計測回数を返す', () => {
    const a = computeAbilities({ accuracy: samples([50, 80]), stability: [], control: [], melody: [] })
    expect(a.accuracy).toEqual({ value: 70, delta: 20, count: 2 })
    expect(a.stability).toEqual({ value: null, delta: null, count: 0 })
  })
})

describe('連続プレイ日数', () => {
  it('今日を含めて数える。今日まだなら昨日から数える', () => {
    expect(streakOf([day(-2), day(-1), day(0)])).toBe(3)
    expect(streakOf([day(-2), day(-1)])).toBe(2)
    expect(streakOf([day(-3), day(0)])).toBe(1)
    expect(streakOf([])).toBe(0)
  })
})

describe('能力値の保存データ移行', () => {
  it('v1 以前のダミーの能力値は捨て、今日の進み具合だけ残す', () => {
    const out = migrateStats({ stats: { accuracy: 42 }, plays: 3, todayDone: ['x'] }, 1)
    expect(out).toEqual({
      samples: { accuracy: [], stability: [], control: [], melody: [] },
      plays: 0,
      playDays: [],
      todayDone: ['x'],
    })
  })

  it('v2 のデータはそのまま使う', () => {
    const v2 = { samples: { accuracy: samples([70]) }, plays: 5, playDays: ['2026-09-27'], todayDone: [] }
    const out = migrateStats(v2, 2)
    expect(out.plays).toBe(5)
    expect(out.samples.accuracy).toHaveLength(1)
    expect(out.samples.melody).toEqual([])
  })
})
