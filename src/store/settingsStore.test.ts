import { describe, expect, it } from 'vitest'
import { migrateSettings } from './settingsStore'

describe('設定の保存データ移行', () => {
  it('v0 の difficulty を levels に移し、無い項目は初期値で埋める', () => {
    const out = migrateSettings({ range: 'high', difficulty: { highlow: 'hard', distance: 'lv3' } }, 0)
    expect(out.levels).toEqual({ highlow: 'hard', distance: 'lv3' })
    expect(out.range).toBe('high')
    expect(out.bgmEnabled).toBe(true)
    expect(out).not.toHaveProperty('difficulty')
  })

  it('v1 のデータはそのまま使う', () => {
    const out = migrateSettings({ levels: { target: 'easy' }, noiseGate: 0.02 }, 1)
    expect(out.levels).toEqual({ target: 'easy' })
    expect(out.noiseGate).toBe(0.02)
  })
})
