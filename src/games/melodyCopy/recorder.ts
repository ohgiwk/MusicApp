import type { PitchSample } from './scoring'

export interface RecordStep {
  /** 歌い始めからの経過 (ms) */
  t: number
  /** 今歌うべき音 (最後の音を過ぎても最後の音のまま) */
  activeNote: number
  /** 歌う時間が終わった (この1回だけ true) */
  finished: boolean
}

/**
 * メロディコピーの歌声を記録する (React に依存しない)。歌っている間、毎フレーム push() を呼ぶ。
 * 全音の長さ + 少しの余裕 (歌い終わりの遅れ分) が過ぎたら終了する。
 */
export class SingRecorder {
  readonly samples: PitchSample[] = []
  private done = false
  private readonly noteCount: number
  private readonly noteMs: number
  private readonly startedAt: number

  constructor(noteCount: number, noteMs: number, startedAt: number) {
    this.noteCount = noteCount
    this.noteMs = noteMs
    this.startedAt = startedAt
  }

  get endMs() {
    return this.noteCount * this.noteMs + this.noteMs * 0.3
  }

  /** 1フレーム記録する。終了後は null */
  push(midi: number | null, now: number): RecordStep | null {
    if (this.done) return null
    const t = now - this.startedAt
    this.samples.push({ t, midi })
    const finished = t > this.endMs
    if (finished) this.done = true
    return { t, activeNote: Math.min(Math.floor(t / this.noteMs), this.noteCount - 1), finished }
  }
}
