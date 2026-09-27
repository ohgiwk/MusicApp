import { describe, expect, it } from 'vitest'
import { fromMelodyCopy, fromPitchTarget, fromVoiceFlight } from './abilityScoring'

describe('プレイ結果 → 能力値', () => {
  it('ピッチターゲット: ずれと揺れから精度・安定性を出す。スキップは精度 0', () => {
    const r = fromPitchTarget([{ meanAbs: 10, stdDev: 4, clearMs: 2000 }])
    expect(r).toEqual({ accuracy: 80, stability: 84 })
    expect(fromPitchTarget([{ meanAbs: null, stdDev: null, clearMs: null }])).toEqual({ accuracy: 0 })
    expect(fromPitchTarget([])).toEqual({})
  })

  it('ボイスフライト: ゲート通過率から音程コントロール', () => {
    expect(fromVoiceFlight({ hits: 12, perfects: 5, misses: 3 })).toEqual({ control: 68 })
    expect(fromVoiceFlight({ hits: 0, perfects: 0, misses: 0 })).toEqual({})
  })

  it('メロディコピー: 音数ボーナス付きのメロディ再現と、ずれからの精度', () => {
    expect(fromMelodyCopy(98, 12, 3)).toEqual({ melody: 98, accuracy: 86 })
    expect(fromMelodyCopy(90, 30, 5).melody).toBe(100)
    expect(fromMelodyCopy(0, null, 3)).toEqual({ melody: 0 })
  })
})
