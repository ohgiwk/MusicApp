/**
 * ピッチ値 (MIDI 連続値) の平滑化。
 *  - 中央値フィルタ: 単発のスパイクを除去
 *  - 異常値除外: 急激な跳躍 (オクターブ誤検出など) は数フレーム連続した時だけ採用
 *  - 時間ベースの指数移動平均: フレームレートに依存しない滑らかさ
 *  - 無声区間の短時間ホールド: 息継ぎや子音で表示がちらつかないように
 */
export interface SmootherOptions {
  medianSize?: number
  /** これ以上 (半音) の跳躍は異常値候補 */
  jumpSemitones?: number
  /** 跳躍を本物と認めるまでの連続フレーム数 */
  jumpConfirmFrames?: number
  /** EMA の時定数 (ms) */
  timeConstantMs?: number
  /** 無声になってから値を保持する時間 (ms) */
  holdMs?: number
}

export class PitchSmoother {
  private readonly medianSize: number
  private readonly jumpSemitones: number
  private readonly jumpConfirmFrames: number
  private readonly timeConstantMs: number
  private readonly holdMs: number

  private history: number[] = []
  private pending: number[] = []
  private value: number | null = null
  private lastTime = 0
  private lastVoicedTime = -Infinity

  constructor(opts: SmootherOptions = {}) {
    this.medianSize = opts.medianSize ?? 3
    this.jumpSemitones = opts.jumpSemitones ?? 3
    this.jumpConfirmFrames = opts.jumpConfirmFrames ?? 3
    this.timeConstantMs = opts.timeConstantMs ?? 35
    this.holdMs = opts.holdMs ?? 150
  }

  reset() {
    this.history = []
    this.pending = []
    this.value = null
  }

  /** @param midi 生の推定値。無声なら null */
  push(midi: number | null, now: number): number | null {
    const dt = this.lastTime ? Math.min(100, now - this.lastTime) : 16
    this.lastTime = now

    if (midi === null) {
      if (now - this.lastVoicedTime > this.holdMs) this.reset()
      return this.value
    }
    this.lastVoicedTime = now

    // 異常値除外
    if (this.value !== null && Math.abs(midi - this.value) >= this.jumpSemitones) {
      this.pending.push(midi)
      const consistent =
        this.pending.length >= this.jumpConfirmFrames && Math.max(...this.pending) - Math.min(...this.pending) < 1.5
      if (!consistent) {
        if (this.pending.length > this.jumpConfirmFrames * 2) this.pending.shift()
        return this.value
      }
      // 新しい音域へ移った: 履歴を入れ替えて即座に追従
      this.history = [...this.pending]
      this.pending = []
      this.value = median(this.history)
      return this.value
    }
    this.pending = []

    this.history.push(midi)
    if (this.history.length > this.medianSize) this.history.shift()
    const m = median(this.history)

    if (this.value === null) {
      this.value = m
    } else {
      const alpha = 1 - Math.exp(-dt / this.timeConstantMs)
      this.value += (m - this.value) * alpha
    }
    return this.value
  }
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}
