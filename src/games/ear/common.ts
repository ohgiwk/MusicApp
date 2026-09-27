import { playMelody, type MelodyHandle } from '../../audio/tonePlayer'

/** 1ゲームの問題数 */
export const QUESTIONS = { highlow: 10, distance: 10, memory: 6 } as const

/**
 * 「もう一度聴く」を使った回数による得点の倍率。
 * 最初の1回で集中して聴くほど得をする (1回ごとに -20%、最低 40%)
 */
export function replayFactor(replays: number): number {
  return Math.max(0.4, 1 - replays * 0.2)
}

/** 連続正解のボーナス */
export function comboBonus(combo: number): number {
  return Math.min(combo, 10) * 10
}

/** 半音数 → 音程の名前 (Lv.4 などで表示) */
export const INTERVAL_NAMES: Record<number, string> = {
  0: '同じ音',
  1: '短2度',
  2: '長2度',
  3: '短3度',
  4: '長3度',
  5: '完全4度',
  6: '増4度',
  7: '完全5度',
  8: '短6度',
  9: '長6度',
  10: '短7度',
  11: '長7度',
  12: 'オクターブ',
}

/** cents を「3半音」「50 cents」のような読みやすい表記に */
export function formatInterval(cents: number): string {
  const a = Math.abs(Math.round(cents))
  if (a >= 100 && a % 100 === 0) return `${a / 100}半音`
  return `${a} cents`
}

/** 問題の基準音 (聴き取りやすい中音域: G3〜G4 あたり) */
export function randomBase(low = 55, high = 67): number {
  return low + Math.floor(Math.random() * (high - low + 1))
}

export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

export function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 問題の音を順番に鳴らす (1音ごとに onNote(index)、終わると onNote(-1)) */
export function playQuestion(midis: number[], noteSec = 0.85, onNote?: (i: number) => void): MelodyHandle {
  return playMelody(midis, noteSec, onNote, 0.15)
}
