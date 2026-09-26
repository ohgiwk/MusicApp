import { getAudioContext } from './audioEngine'
import { midiToFreq } from './pitchUtils'

/**
 * お手本音の再生。純音だと音高がつかみにくいので、
 * 三角波 + 少しの倍音 + 柔らかいエンベロープで「声っぽい」音にする。
 */
export function playNote(midi: number, durationSec = 1, startAt?: number, volume = 0.25): void {
  const ctx = getAudioContext()
  const t0 = startAt ?? ctx.currentTime + 0.02
  const freq = midiToFreq(midi)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.04)
  gain.gain.setTargetAtTime(volume * 0.7, t0 + 0.08, 0.15)
  gain.gain.setTargetAtTime(0, t0 + durationSec - 0.08, 0.04)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = Math.min(4000, freq * 6)
  filter.connect(gain)
  gain.connect(ctx.destination)

  const oscs: [OscillatorType, number, number][] = [
    ['triangle', 1, 1],
    ['sine', 2, 0.25],
  ]
  for (const [type, mult, level] of oscs) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq * mult
    g.gain.value = level
    osc.connect(g).connect(filter)
    osc.start(t0)
    osc.stop(t0 + durationSec + 0.2)
  }
}

export interface MelodyHandle {
  /** 再生完了で resolve */
  done: Promise<void>
  cancel: () => void
}

/**
 * メロディを順番に再生。各音の開始時に onNote(index) を呼ぶ (UIハイライト用)。
 */
export function playMelody(
  midis: number[],
  noteSec: number,
  onNote?: (index: number) => void,
  gapSec = 0.08,
): MelodyHandle {
  const ctx = getAudioContext()
  const start = ctx.currentTime + 0.1
  const timers: number[] = []
  let resolveDone: () => void = () => {}
  const done = new Promise<void>((r) => (resolveDone = r))

  midis.forEach((m, i) => {
    const at = start + i * noteSec
    playNote(m, noteSec - gapSec, at)
    timers.push(window.setTimeout(() => onNote?.(i), (at - ctx.currentTime) * 1000))
  })
  timers.push(
    window.setTimeout(() => {
      onNote?.(-1)
      resolveDone()
    }, (start + midis.length * noteSec - ctx.currentTime) * 1000 + 50),
  )

  return {
    done,
    cancel: () => {
      timers.forEach(clearTimeout)
      resolveDone()
    },
  }
}

/** 短い効果音 (クリア時など) */
export function playChime(kind: 'success' | 'tick' = 'success') {
  const ctx = getAudioContext()
  const t = ctx.currentTime + 0.01
  const notes = kind === 'success' ? [84, 88, 91] : [96]
  notes.forEach((m, i) => {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = midiToFreq(m)
    g.gain.setValueAtTime(0, t + i * 0.07)
    g.gain.linearRampToValueAtTime(0.12, t + i * 0.07 + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.3)
    osc.connect(g).connect(ctx.destination)
    osc.start(t + i * 0.07)
    osc.stop(t + i * 0.07 + 0.35)
  })
}
