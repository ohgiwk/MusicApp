import type { MemoryLevel } from '../difficulty'
import { pick, randomBase, shuffle } from './common'

/** メロディ (MIDI の並び) を作る */
export function generateMelody(level: MemoryLevel): number[] {
  const n = level.minNotes + Math.floor(Math.random() * (level.maxNotes - level.minNotes + 1))
  for (let attempt = 0; attempt < 200; attempt++) {
    const out = [randomBase(57, 65)]
    let ok = true
    while (out.length < n) {
      const size = pick(level.steps)
      const step = size === 0 ? 0 : (Math.random() < 0.5 ? 1 : -1) * size
      // 同じ音が続くのは1回まで
      if (step === 0 && out.length >= 2 && out[out.length - 1] === out[out.length - 2]) continue
      out.push(out[out.length - 1] + step)
    }
    const range = Math.max(...out) - Math.min(...out)
    if (range > 12 || range < 2) ok = false
    if (ok) return out
  }
  return [60, 64, 67, 64].slice(0, n)
}

const stepsOf = (m: number[]) => m.slice(1).map((v, i) => v - m[i])
const fromSteps = (first: number, steps: number[]) =>
  steps.reduce((acc, s) => [...acc, acc[acc.length - 1] + s], [first])

/** 2つのメロディの形の違い (始まりをそろえた各音の高さの差の合計) */
export function shapeDistance(a: number[], b: number[]): number {
  let d = 0
  for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - a[0] - (b[i] - b[0]))
  return d
}

/** 正解を少しだけ変えた「ひっかけ」のメロディを作る */
function mutate(melody: number[], level: MemoryLevel): number[] {
  const steps = stepsOf(melody)
  const i = Math.floor(Math.random() * steps.length)
  const kind = pick(['flip', 'resize', 'swap'] as const)
  const s = [...steps]
  if (kind === 'flip' && s[i] !== 0) {
    s[i] = -s[i]
  } else if (kind === 'swap' && s.length >= 2) {
    const j = i === s.length - 1 ? i - 1 : i + 1
    ;[s[i], s[j]] = [s[j], s[i]]
  } else {
    // 大きさを変える (難しいほど小さな違い)
    const delta = pick(level.minNotes >= 6 ? [1, 2] : level.minNotes >= 4 ? [2, 3] : [3, 4, 5])
    s[i] = s[i] + (Math.random() < 0.5 ? delta : -delta)
  }
  // さらに難しいレベルでは、2か所変えることもある (やさしいレベルは違いを大きく)
  if (level.minNotes <= 3 && Math.random() < 0.5) {
    const k = (i + 1) % s.length
    s[k] = -s[k] || 3
  }
  return fromSteps(melody[0], s)
}

export interface MemoryQuestion {
  melody: number[]
  /** 表示する選択肢 (1つが正解) */
  options: number[][]
  answer: number
}

export function makeQuestion(level: MemoryLevel): MemoryQuestion {
  const melody = generateMelody(level)
  // やさしいほど見た目の違いを大きく
  const minDiff = level.minNotes >= 6 ? 2 : level.minNotes >= 4 ? 3 : 4
  const options: number[][] = [melody]
  for (let tries = 0; options.length < level.choices && tries < 500; tries++) {
    const v = mutate(melody, level)
    if (Math.max(...v) - Math.min(...v) > 14) continue
    if (options.every((o) => shapeDistance(o, v) >= minDiff)) options.push(v)
  }
  // 念のため足りなければ別のメロディで埋める
  while (options.length < level.choices) options.push(generateMelody(level))
  const shuffled = shuffle(options)
  return { melody, options: shuffled, answer: shuffled.indexOf(melody) }
}

export const basePoints = (notes: number) => 100 + (notes - 3) * 20
