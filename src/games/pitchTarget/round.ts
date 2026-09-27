import { centsBetween, foldOctave, midiToFreq } from '../../audio/pitchUtils'
import type { TargetLevel } from '../difficulty'
import { gradeOf, summarize, type Grade, type HoldStats } from './grading'

/** 画面に残す声の軌跡の長さ (フレーム) */
export const TRAIL_LEN = 50

/** 画面表示用のスナップショット */
export interface TargetView {
  /** 目標からのずれ (cents)。声がなければ null */
  cents: number | null
  /** 正解範囲のキープ具合 (0〜1) */
  hold: number
  /** 新しい順の軌跡 */
  trail: (number | null)[]
  /** お手本の再生が終わり、判定中か */
  listening: boolean
}

export const EMPTY_VIEW: TargetView = { cents: null, hold: 0, trail: [], listening: false }

export interface RoundClear extends HoldStats {
  grade: Grade
  /** 問題開始からクリアまでの時間 (ms) */
  clearMs: number
}

/**
 * ピッチターゲット1問分の判定 (React に依存しない)。毎フレーム update() を呼ぶ。
 * - 正解範囲 (±hitRange cents) にいる間はゲージが増え、holdMs で満タンになるとクリア
 * - 外れるとゆっくり減る (声が途切れたときはさらにゆっくり)。一瞬のブレで全部失わないように
 * - お手本の再生中はマイクが拾ってしまうので判定しない
 */
export class TargetRound {
  private hold = 0
  private inZone: number[] = []
  private trail: (number | null)[] = []
  private cents: number | null = null
  private lastTime = 0
  private cleared = false
  private listenAfter: number
  private readonly targetFreq: number
  private readonly level: Pick<TargetLevel, 'hitRange' | 'holdMs'>
  private readonly startedAt: number

  constructor(target: number, level: Pick<TargetLevel, 'hitRange' | 'holdMs'>, startedAt: number, listenAfter: number) {
    this.targetFreq = midiToFreq(target)
    this.level = level
    this.startedAt = startedAt
    this.listenAfter = listenAfter
  }

  /** この問題の判定を終える (スキップしたとき。以降はクリアしない) */
  end() {
    this.cleared = true
  }

  /** この時刻まで判定しない (お手本を鳴らし直したとき) */
  pauseUntil(t: number) {
    this.listenAfter = t
  }

  /**
   * 1フレーム分の更新。クリアした瞬間だけ結果を返す。
   * @param judging false のとき (クリア演出中など) は軌跡だけ更新する
   */
  update(freq: number | null, now: number, judging = true): RoundClear | null {
    const cents = freq !== null ? centsBetween(freq, this.targetFreq) : null
    this.cents = cents
    this.trail.unshift(cents)
    if (this.trail.length > TRAIL_LEN) this.trail.pop()
    const dt = this.lastTime ? Math.min(50, now - this.lastTime) : 16
    this.lastTime = now
    if (!judging || this.cleared || now < this.listenAfter) return null

    const { hitRange, holdMs } = this.level
    if (cents !== null && Math.abs(cents) <= hitRange) {
      this.hold = Math.min(1, this.hold + dt / holdMs)
      this.inZone.push(cents)
    } else {
      this.hold = Math.max(0, this.hold - dt / (holdMs * (cents === null ? 3 : 1.5)))
    }
    if (this.hold < 1) return null

    this.cleared = true
    const stats = summarize(this.inZone.slice(-90))
    const clearMs = now - this.startedAt
    return { ...stats, grade: gradeOf(stats, clearMs), clearMs }
  }

  view(now: number): TargetView {
    return { cents: this.cents, hold: this.hold, trail: this.trail.slice(), listening: now >= this.listenAfter }
  }
}

/** 今の声に合わせたひとこと (高い/低い、オクターブ違いかも など) */
export function hintFor(view: TargetView, hitRange: number): string {
  const { cents } = view
  if (!view.listening) return 'お手本を聞いてね…'
  if (cents === null) return '声を出してください'
  if (Math.abs(cents) <= hitRange) return 'キープ！'
  // ほぼ1オクターブずれている (声域の違いでよくある)
  if (Math.abs(cents) > 900 && Math.abs(foldOctave(cents)) < 150) {
    return cents > 0 ? '1オクターブ上かも？ 低く！' : '1オクターブ下かも？ 高く！'
  }
  if (cents > 0) return cents > 100 ? 'もっと下！' : 'もう少し下'
  return cents < -100 ? 'もっと上！' : 'もう少し上'
}
