import type { DistanceLevelId } from '../difficulty'
import { INTERVAL_NAMES, pick, randomBase } from './common'

export interface DistanceQuestion {
  first: number
  second: number
  /** 符号付きの半音数 (+ は上) */
  semis: number
}

export interface DistanceOption {
  id: string
  label: string
  /** ボタンの矢印 */
  arrow?: string
  /** Lv.4 の音程名など */
  sub?: string
}

/** 「少し」と「大きく」の境目 (Lv.2) */
export const SMALL_MAX = 3
export const LARGE_MIN = 5

const SIZES: Record<DistanceLevelId, number[]> = {
  lv1: [2, 3, 4, 5, 7, 9, 12],
  lv2: [1, 2, 3, 5, 7, 9, 12], // 4 は「少し/大きく」の境目なので出さない
  lv3: [1, 2, 3, 5, 7],
  lv4: [2, 3, 4, 5, 7, 12],
}

export const levelNumber = (id: DistanceLevelId) => Number(id.slice(2))

export function makeQuestion(level: DistanceLevelId): DistanceQuestion {
  let size: number
  if (level === 'lv2') {
    // 少し / 大きく が半々になるように
    size = Math.random() < 0.5 ? pick([1, 2, 3]) : pick([5, 7, 9, 12])
  } else {
    size = pick(SIZES[level])
  }
  const semis = (Math.random() < 0.5 ? 1 : -1) * size
  // 2音目が聴き取りやすい範囲 (C3〜C6) に収まる基準音を選ぶ
  let first = randomBase(55, 67)
  if (first + semis > 84) first -= 12
  if (first + semis < 48) first += 12
  return { first, second: first + semis, semis }
}

export function optionsFor(level: DistanceLevelId): DistanceOption[] {
  switch (level) {
    case 'lv1':
      return [
        { id: 'up', label: '上がった', arrow: '↑' },
        { id: 'down', label: '下がった', arrow: '↓' },
      ]
    case 'lv2':
      return [
        { id: 'up-small', label: '少し上', arrow: '↗' },
        { id: 'up-big', label: '大きく上', arrow: '⬆' },
        { id: 'down-small', label: '少し下', arrow: '↘' },
        { id: 'down-big', label: '大きく下', arrow: '⬇' },
      ]
    case 'lv3':
      return SIZES.lv3.map((n) => ({ id: String(n), label: `${n}半音` }))
    case 'lv4':
      return SIZES.lv4.map((n) => ({ id: String(n), label: `${n}半音`, sub: INTERVAL_NAMES[n] }))
  }
}

export function answerId(q: DistanceQuestion, level: DistanceLevelId): string {
  const dir = q.semis > 0 ? 'up' : 'down'
  const size = Math.abs(q.semis)
  if (level === 'lv1') return dir
  if (level === 'lv2') return `${dir}-${size <= SMALL_MAX ? 'small' : 'big'}`
  return String(size)
}

/** 正解 / おしい (方向は合っている、または隣の選択肢) / 不正解 */
export function judge(q: DistanceQuestion, level: DistanceLevelId, chosen: string): 'correct' | 'partial' | 'wrong' {
  const ans = answerId(q, level)
  if (chosen === ans) return 'correct'
  if (level === 'lv2' && chosen.split('-')[0] === ans.split('-')[0]) return 'partial'
  if (level === 'lv3' || level === 'lv4') {
    const ids = optionsFor(level).map((o) => o.id)
    if (Math.abs(ids.indexOf(chosen) - ids.indexOf(ans)) === 1) return 'partial'
  }
  return 'wrong'
}

/** 回答後の説明文 */
export function describe(q: DistanceQuestion, level: DistanceLevelId): string {
  const size = Math.abs(q.semis)
  const dir = q.semis > 0 ? '上がった' : '下がった'
  if (level === 'lv1') return `${dir}（${size}半音）`
  if (level === 'lv2') return `${size <= SMALL_MAX ? '少し' : '大きく'}${q.semis > 0 ? '上' : '下'}（${size}半音）`
  if (level === 'lv3') return `${size}半音 ${dir}`
  return `${size}半音 = ${INTERVAL_NAMES[size]} ${dir}`
}

export const BASE_POINTS: Record<DistanceLevelId, number> = { lv1: 100, lv2: 120, lv3: 150, lv4: 180 }
