import { describe, expect, it } from 'vitest'
import { MELODY_LEVELS } from '../difficulty'
import { generateMelody, notePoints, scoreMelody, type PitchSample } from './scoring'

const tol = MELODY_LEVELS.normal
const NOTE_MS = 800

/** 各音を指定の高さ (null は無声) で歌ったときの記録 */
function sing(notes: (number | null)[]): PitchSample[] {
  const out: PitchSample[] = []
  notes.forEach((m, i) => {
    for (let t = i * NOTE_MS; t < (i + 1) * NOTE_MS; t += 16) out.push({ t, midi: m })
  })
  return out
}

describe('メロディコピーの採点', () => {
  it('±50 cents 以内は満点、±150 cents にかけて 0 へ', () => {
    expect(notePoints(40, tol)).toBe(1)
    expect(notePoints(100, tol)).toBeCloseTo(0.5)
    expect(notePoints(200, tol)).toBe(0)
  })

  it('完全に歌えれば 100 点', () => {
    const r = scoreMelody([60, 64, 62], sing([60, 64, 62]), NOTE_MS, tol)
    expect(r.score).toBe(100)
    expect(r.correct).toBe(3)
  })

  it('オクターブ違いで歌っても正解にする', () => {
    const r = scoreMelody([60, 64, 62], sing([72, 76, 74]), NOTE_MS, tol)
    expect(r.correct).toBe(3)
  })

  it('歌わなかった音は「聞き取れず」で 0 点、少しずれた音は部分点', () => {
    const r = scoreMelody([60, 64, 62], sing([60, null, 63]), NOTE_MS, tol)
    expect(r.notes[1].sung).toBeNull()
    expect(r.notes[1].points).toBe(0)
    expect(r.notes[2].ok).toBe(false)
    expect(r.notes[2].points).toBeGreaterThan(0)
    expect(r.correct).toBe(1)
  })

  it('メロディはレベルの動きの大きさ・幅に収まる', () => {
    const easy = MELODY_LEVELS.easy
    for (let i = 0; i < 300; i++) {
      const m = generateMelody(4, 45, 64, easy)
      expect(m).toHaveLength(4)
      expect(Math.max(...m) - Math.min(...m)).toBeLessThanOrEqual(easy.maxSpan)
      for (let k = 1; k < m.length; k++) expect(Math.abs(m[k] - m[k - 1])).toBeLessThanOrEqual(2)
    }
  })
})
