import { foldOctave } from '../../audio/pitchUtils'

export interface PitchSample {
  /** 歌唱開始からの経過 ms */
  t: number
  midi: number | null
}

export interface NoteScore {
  target: number
  /** その区間で歌った音の中央値 (MIDI) */
  sung: number | null
  /** オクターブ違いを許容した cent 誤差 */
  cents: number | null
  /** 0〜1 */
  points: number
  ok: boolean
}

export interface MelodyScore {
  notes: NoteScore[]
  score: number
  correct: number
  avgAbsCents: number | null
}

export interface Tolerance {
  /** ±この cent 以内なら「正解」 (人の歌として自然な揺れを許容) */
  okCents: number
  /** ここまでは部分点 */
  partialCents: number
}

/** 1音の点数: ±okCents 以内は満点、±partialCents にかけて 0 へ */
export function notePoints(absCents: number, { okCents, partialCents }: Tolerance): number {
  if (absCents <= okCents) return 1
  if (absCents >= partialCents) return 0
  return 1 - (absCents - okCents) / (partialCents - okCents)
}

function median(v: number[]) {
  const s = [...v].sort((a, b) => a - b)
  return s[s.length >> 1]
}

/**
 * 各音の区間から歌声の代表値を取り出して採点する。
 * 歌い出しの遅れや音の移り変わりを考慮して、区間の頭 25% を捨て、後ろに少し延長する。
 */
export function scoreMelody(targets: number[], samples: PitchSample[], noteMs: number, tol: Tolerance): MelodyScore {
  const { okCents, partialCents } = tol
  const notes: NoteScore[] = targets.map((target, i) => {
    const from = i * noteMs + noteMs * 0.25
    const to = (i + 1) * noteMs + noteMs * 0.15
    const inWin = samples.filter((s) => s.t >= from && s.t < to)
    const voiced = inWin.filter((s) => s.midi !== null).map((s) => s.midi as number)
    if (voiced.length < 5 || voiced.length < inWin.length * 0.3) {
      return { target, sung: null, cents: null, points: 0, ok: false }
    }
    const sung = median(voiced)
    const cents = foldOctave((sung - target) * 100)
    const points = notePoints(Math.abs(cents), tol)
    return { target, sung, cents, points, ok: Math.abs(cents) <= okCents }
  })

  const sungNotes = notes.filter((n) => n.cents !== null)
  const avgAbsCents = sungNotes.length
    ? sungNotes.reduce((a, n) => a + Math.abs(n.cents!), 0) / sungNotes.length
    : null
  const pointRate = notes.reduce((a, n) => a + n.points, 0) / notes.length
  // 歌えなかった音は誤差 partialCents 扱い
  const errForScore =
    notes.reduce((a, n) => a + (n.cents === null ? partialCents : Math.min(partialCents, Math.abs(n.cents))), 0) /
    notes.length
  const precision = 1 - errForScore / partialCents
  const score = Math.round(100 * (0.7 * pointRate + 0.3 * precision))

  return { notes, score, correct: notes.filter((n) => n.ok).length, avgAbsCents }
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11]

/**
 * 音域内の幹音でメロディを作る。
 * maxStep: 1音ごとの最大の動き (音階の度数)、maxSpan: 全体の最大の幅 (半音)
 */
export function generateMelody(
  length: number, min: number, max: number, { maxStep, maxSpan }: { maxStep: number; maxSpan: number },
): number[] {
  const scale: number[] = []
  for (let m = min + 2; m <= max - 3; m++) if (MAJOR.includes(((m % 12) + 12) % 12)) scale.push(m)
  // 中央付近から始める
  let idx = Math.floor(scale.length / 2 + (Math.random() - 0.5) * scale.length * 0.4)
  const out = [scale[idx]]
  // 小さい動きほど出やすくする
  const steps: number[] = []
  for (let st = 1; st <= maxStep; st++) for (let w = 0; w <= maxStep - st; w++) steps.push(st, -st)
  let guard = 0
  while (out.length < length && guard++ < 500) {
    const step = steps[Math.floor(Math.random() * steps.length)]
    const next = idx + step
    if (next < 0 || next >= scale.length || scale[next] === out[out.length - 1]) continue
    const cand = [...out, scale[next]]
    if (Math.max(...cand) - Math.min(...cand) > maxSpan) continue
    idx = next
    out.push(scale[idx])
  }
  return out
}
