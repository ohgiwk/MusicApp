import { describe, expect, it } from 'vitest'
import { centsBetween, foldOctave, freqToMidi, midiToFreq, noteFromFreq, parseNote, relationOf } from './pitchUtils'

describe('pitchUtils', () => {
  it('周波数と MIDI を相互に変換できる', () => {
    expect(freqToMidi(440)).toBe(69)
    expect(midiToFreq(60)).toBeCloseTo(261.626, 3)
    expect(freqToMidi(midiToFreq(57.5))).toBeCloseTo(57.5, 10)
  })

  it('cent 差を計算できる (半音 = 100 cents)', () => {
    expect(centsBetween(midiToFreq(70), midiToFreq(69))).toBeCloseTo(100, 6)
    expect(centsBetween(220, 440)).toBeCloseTo(-1200, 6)
  })

  it('最も近い音名と cent のずれを返す', () => {
    const n = noteFromFreq(438.2)
    expect(n.label).toBe('A4')
    expect(n.midi).toBe(69)
    expect(n.cents).toBeCloseTo(-7.1, 1)
  })

  it('音名を MIDI に変換できる', () => {
    expect(parseNote('A2')).toBe(45)
    expect(parseNote('C#4')).toBe(61)
    expect(parseNote('Bb3')).toBe(58)
    expect(() => parseNote('H2')).toThrow()
  })

  it('オクターブ違いを ±600 cents に折り畳む', () => {
    expect(foldOctave(1250)).toBe(50)
    expect(foldOctave(-1180)).toBe(20)
    expect(foldOctave(30)).toBe(30)
  })

  it('高い / 低い / ほぼ一致 を判定する', () => {
    expect(relationOf(5)).toBe('match')
    expect(relationOf(30)).toBe('high')
    expect(relationOf(-30)).toBe('low')
  })
})
