import { describe, expect, it } from 'vitest'
import { createPitchDetector } from './pitchDetector'
import { centsBetween } from './pitchUtils'

const SR = 48000
const N = 2048

/** 倍音を含む波形 (amps[k] = 第 k+1 倍音の強さ) */
function wave(f0: number, amps: number[], noise = 0): Float32Array {
  const b = new Float32Array(N)
  let seed = 1
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
  for (let i = 0; i < N; i++) {
    let s = 0
    amps.forEach((a, k) => (s += a * Math.sin((2 * Math.PI * f0 * (k + 1) * i) / SR + k)))
    b[i] = 0.2 * s + noise * rand()
  }
  return b
}

describe('YIN による基本周波数の推定', () => {
  const detector = createPitchDetector({ sampleRate: SR, bufferSize: N })

  it.each([
    ['純音 110Hz', 110, [1]],
    ['2倍音の方が強い声 220Hz', 220, [0.3, 1, 0.6, 0.4]],
    ['基音がかなり弱い声 98Hz', 98, [0.1, 1, 0.8, 0.6, 0.5]],
    ['高い声 880Hz', 880, [1, 0.3]],
  ])('%s: 倍音ではなく基音を返す (±10 cents)', (_, f0, amps) => {
    const r = detector.detect(wave(f0, amps, 0.02), 0.005)
    expect(r.freq).not.toBeNull()
    expect(Math.abs(centsBetween(r.freq!, f0))).toBeLessThan(10)
    expect(r.clarity).toBeGreaterThan(0.9)
  })

  it('無音 (しきい値未満) では推定しない', () => {
    const r = detector.detect(new Float32Array(N), 0.005)
    expect(r.freq).toBeNull()
  })
})
