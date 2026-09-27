import { describe, expect, it } from 'vitest'
import { DISTANCE_LEVEL_IDS } from '../difficulty'
import { answerId, describe as describeQ, judge, makeQuestion, optionsFor } from './distance'

const C4_G4 = { first: 60, second: 67, semis: 7 }

describe('PITCH DISTANCE', () => {
  it.each(DISTANCE_LEVEL_IDS)('%s: 正解は必ず選択肢にあり、音は聴きやすい範囲に収まる', (lv) => {
    const ids = optionsFor(lv).map((o) => o.id)
    for (let i = 0; i < 300; i++) {
      const q = makeQuestion(lv)
      expect(ids).toContain(answerId(q, lv))
      expect(q.second).toBeGreaterThanOrEqual(48)
      expect(q.second).toBeLessThanOrEqual(84)
    }
  })

  it('レベルごとの正解の表し方 (感覚 → 数字 → 用語)', () => {
    expect(answerId(C4_G4, 'lv1')).toBe('up')
    expect(answerId(C4_G4, 'lv2')).toBe('up-big')
    expect(answerId(C4_G4, 'lv3')).toBe('7')
    expect(describeQ(C4_G4, 'lv4')).toBe('7半音 = 完全5度 上がった')
  })

  it('方向だけ合っている / 隣の選択肢 は「おしい」', () => {
    expect(judge(C4_G4, 'lv2', 'up-small')).toBe('partial')
    expect(judge(C4_G4, 'lv2', 'down-big')).toBe('wrong')
    expect(judge(C4_G4, 'lv3', '5')).toBe('partial')
    expect(judge(C4_G4, 'lv3', '1')).toBe('wrong')
    expect(judge(C4_G4, 'lv4', '7')).toBe('correct')
  })
})
