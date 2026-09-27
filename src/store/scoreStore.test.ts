import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RANKING_SIZE, mergeScores, migrateScores, rankingOf, useScoreStore } from './scoreStore'

const add = (score: number, level = 'normal') => useScoreStore.getState().addScore('target', level, score)

describe('ランキング', () => {
  beforeEach(() => useScoreStore.setState(migrateScores({})))
  afterEach(() => vi.useRealTimers())

  it('初回は自己ベスト・1位', () => {
    expect(add(70)).toMatchObject({ rank: 1, isBest: true })
    expect(add(50)).toMatchObject({ rank: 2, isBest: false })
    expect(add(90)).toMatchObject({ rank: 1, isBest: true })
  })

  it('同点は先に出した記録が上', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-27T10:00:00Z'))
    add(80)
    vi.setSystemTime(new Date('2026-09-27T10:05:00Z'))
    const later = add(80)
    expect(later).toMatchObject({ rank: 2, isBest: false })
    // 保存順に関係なく、日時で並ぶこと
    const [first, second] = rankingOf(useScoreStore.getState().records.target, 'normal')
    expect(first.at < second.at).toBe(true)
  })

  it(`レベルごとに上位 ${RANKING_SIZE} 件だけ残し、圏外は rank = null`, () => {
    for (let i = 0; i < RANKING_SIZE; i++) add(100 - i)
    expect(add(1).rank).toBeNull()
    expect(rankingOf(useScoreStore.getState().records.target, 'normal')).toHaveLength(RANKING_SIZE)
  })

  it('レベルが違えば別のランキング', () => {
    add(90, 'normal')
    expect(add(10, 'easy')).toMatchObject({ rank: 1, isBest: true })
    useScoreStore.getState().clear('target', 'easy')
    expect(rankingOf(useScoreStore.getState().records.target, 'easy')).toHaveLength(0)
    expect(rankingOf(useScoreStore.getState().records.target, 'normal')).toHaveLength(1)
  })
})

describe('ランキングの保存データ移行', () => {
  it('v0 (難易度なし) の記録は「ふつう」として引き継ぎ、全ゲームの欄を用意する', () => {
    const v0 = { records: { target: [{ id: 'a', score: 88, at: '2026-09-26T10:00:00Z' }] }, lastIds: { target: 'a' } }
    const out = migrateScores(v0)
    expect(out.records.target[0]).toMatchObject({ id: 'a', difficulty: 'normal' })
    expect(out.records.memory).toEqual([])
    expect(out.lastIds).toEqual({ target: 'a' })
  })

  it('後から追加したゲームの欄が保存データに無くても初期値で埋める', () => {
    const current = useScoreStore.getState()
    const merged = mergeScores({ records: { target: [] } }, current)
    expect(merged.records.highlow).toEqual([])
    expect(typeof merged.addScore).toBe('function')
  })
})
