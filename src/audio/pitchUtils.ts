export const A4_FREQ = 440
export const A4_MIDI = 69

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

/** 周波数 → 連続値のMIDIノート番号 (小数あり) */
export function freqToMidi(freq: number): number {
  return A4_MIDI + 12 * Math.log2(freq / A4_FREQ)
}

export function midiToFreq(midi: number): number {
  return A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12)
}

/** actual が target に対して何cent高いか (負なら低い) */
export function centsBetween(actualFreq: number, targetFreq: number): number {
  return 1200 * Math.log2(actualFreq / targetFreq)
}

export interface NoteInfo {
  /** 最も近い整数MIDIノート */
  midi: number
  /** 音名 (例: "A") */
  name: string
  octave: number
  /** "A4" */
  label: string
  /** 最も近い音からのcent差 (-50〜+50) */
  cents: number
}

export function noteFromMidi(midi: number): { name: string; octave: number; label: string } {
  const m = Math.round(midi)
  const name = NOTE_NAMES[((m % 12) + 12) % 12]
  const octave = Math.floor(m / 12) - 1
  return { name, octave, label: `${name}${octave}` }
}

export function noteFromFreq(freq: number): NoteInfo {
  const exact = freqToMidi(freq)
  const midi = Math.round(exact)
  return { midi, ...noteFromMidi(midi), cents: (exact - midi) * 100 }
}

/** "A3" / "C#4" → MIDI */
export function parseNote(label: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(label.trim())
  if (!m) throw new Error(`Invalid note: ${label}`)
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1] as 'C']
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0
  return (Number(m[3]) + 1) * 12 + base + acc
}

export function isNatural(midi: number): boolean {
  return !noteFromMidi(midi).name.includes('#')
}

/** cent差 → 状態 */
export type PitchRelation = 'high' | 'low' | 'match'
export function relationOf(cents: number, tolerance = 10): PitchRelation {
  if (Math.abs(cents) <= tolerance) return 'match'
  return cents > 0 ? 'high' : 'low'
}

/** オクターブ違いを許容するcent差 (-600〜+600 に折り畳む) */
export function foldOctave(cents: number): number {
  return ((((cents + 600) % 1200) + 1200) % 1200) - 600
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export function formatCents(c: number): string {
  const r = Math.round(c)
  return `${r > 0 ? '+' : ''}${r} cents`
}
