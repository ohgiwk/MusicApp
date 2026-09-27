import { getAudioContext } from './audioEngine'
import { midiToFreq } from './pitchUtils'

/**
 * メニュー画面用の BGM を Web Audio でその場で合成して鳴らす (音声ファイル不要)。
 *
 * 構成は「イントロ (1回だけ) → ループ本体 (A 8小節 + B 8小節) を繰り返し」。
 * ループ本体の最後の小節は先頭へ戻るためのつなぎ (G のターンアラウンド + フィル) になっていて、
 * 最後の音からループ先頭の音へ自然につながる。各音は独立して予約するので、
 * ループの継ぎ目をまたぐ音の余韻も途切れない。
 *
 * マイクで音程を判定している間は鳴らさないこと (マイクが拾って判定が狂う)。
 */

const BPM = 112
const STEPS_PER_BAR = 16
export const STEP_SEC = 60 / BPM / 4
export const BAR_SEC = STEP_SEC * STEPS_PER_BAR
const LOOKAHEAD_SEC = 0.15
const TICK_MS = 25

type Chord = 'C' | 'G' | 'Am' | 'F' | 'Em'
/** [16分の位置, MIDI, 長さ(16分)] */
type Note = [number, number, number]

interface Bar {
  chord: Chord
  melody: Note[]
  /** none: ドラムなし / light: ハイハットだけ / full: 通常 */
  drums: 'none' | 'light' | 'full'
  /** 小節の後半にフィルを入れる (セクションの変わり目) */
  fill?: boolean
  /** hold: 全音符のベース / groove: リズムを刻む */
  bass: 'hold' | 'groove'
}

const CHORD_TONES: Record<Chord, number[]> = {
  C: [60, 64, 67],
  G: [59, 62, 67],
  Am: [60, 64, 69],
  F: [60, 65, 69],
  Em: [59, 64, 67],
}

/** ベースの根音と5度 */
const BASS: Record<Chord, [number, number]> = {
  C: [48, 55],
  G: [43, 50],
  Am: [45, 52],
  F: [41, 48],
  Em: [40, 47],
}

// 楽譜は1小節1行で読めるよう整形しない
// prettier-ignore
const B4 = 71, C5 = 72, D5 = 74, E5 = 76, F5 = 77, G5 = 79, A5 = 81, B5 = 83, C6 = 84, D6 = 86

/** イントロ: 最初に1回だけ。アルペジオで始まり、最後の D5 がループ先頭の E5 へつながる */
// 楽譜は1小節1行で読めるよう整形しない
// prettier-ignore
export const INTRO: Bar[] = [
  { chord: 'C', drums: 'none', bass: 'hold', melody: [[0, C5, 2], [2, E5, 2], [4, G5, 2], [6, C6, 2], [8, G5, 2], [10, E5, 2], [12, G5, 2], [14, C6, 2]] },
  { chord: 'G', drums: 'light', bass: 'hold', fill: true, melody: [[0, B5, 4], [4, A5, 2], [6, G5, 2], [8, G5, 2], [10, A5, 2], [12, B5, 2], [14, D5, 2]] },
]

/** ループ本体 A (8小節): C G Am F / C G F G */
// 楽譜は1小節1行で読めるよう整形しない
// prettier-ignore
const SECTION_A: Bar[] = [
  { chord: 'C', drums: 'full', bass: 'groove', melody: [[0, E5, 2], [2, G5, 2], [4, A5, 2], [6, G5, 2], [8, E5, 3], [12, D5, 2], [14, C5, 2]] },
  { chord: 'G', drums: 'full', bass: 'groove', melody: [[0, D5, 2], [2, B4, 2], [4, D5, 2], [6, G5, 4], [12, A5, 2], [14, G5, 2]] },
  { chord: 'Am', drums: 'full', bass: 'groove', melody: [[0, E5, 2], [2, C5, 2], [4, E5, 2], [6, A5, 3], [10, G5, 2], [12, E5, 4]] },
  { chord: 'F', drums: 'full', bass: 'groove', melody: [[0, F5, 2], [2, A5, 2], [4, C6, 4], [8, A5, 2], [10, G5, 2], [12, F5, 2], [14, E5, 2]] },
  { chord: 'C', drums: 'full', bass: 'groove', melody: [[0, G5, 2], [2, E5, 2], [4, G5, 2], [6, C6, 4], [12, B5, 2], [14, C6, 2]] },
  { chord: 'G', drums: 'full', bass: 'groove', melody: [[0, D6, 3], [4, B5, 2], [6, G5, 2], [8, A5, 2], [10, B5, 2], [12, D6, 4]] },
  { chord: 'F', drums: 'full', bass: 'groove', melody: [[0, C6, 2], [2, A5, 2], [4, F5, 2], [6, A5, 2], [8, G5, 3], [12, F5, 2], [14, E5, 2]] },
  // B へのつなぎ: 最後の G5 → B 先頭の A5
  { chord: 'G', drums: 'full', bass: 'groove', fill: true, melody: [[0, D5, 4], [4, G5, 2], [6, A5, 2], [8, B5, 4], [12, A5, 2], [14, G5, 2]] },
]

/** ループ本体 B (8小節): F G Em Am / F G C G。最後の小節がループ先頭 (A) へのターンアラウンド */
// 楽譜は1小節1行で読めるよう整形しない
// prettier-ignore
const SECTION_B: Bar[] = [
  { chord: 'F', drums: 'full', bass: 'groove', melody: [[0, A5, 4], [4, C6, 2], [6, A5, 2], [8, G5, 4], [12, F5, 2], [14, G5, 2]] },
  { chord: 'G', drums: 'full', bass: 'groove', melody: [[0, B5, 4], [4, D6, 2], [6, B5, 2], [8, A5, 4], [12, G5, 4]] },
  { chord: 'Em', drums: 'full', bass: 'groove', melody: [[0, G5, 2], [2, E5, 2], [4, G5, 2], [6, B5, 4], [10, A5, 2], [12, G5, 4]] },
  { chord: 'Am', drums: 'full', bass: 'groove', melody: [[0, A5, 6], [6, C6, 2], [8, B5, 2], [10, A5, 2], [12, E5, 4]] },
  { chord: 'F', drums: 'full', bass: 'groove', melody: [[0, F5, 2], [2, A5, 2], [4, C6, 2], [6, C6, 2], [8, D6, 4], [12, C6, 2], [14, A5, 2]] },
  { chord: 'G', drums: 'full', bass: 'groove', melody: [[0, B5, 2], [2, D6, 2], [4, D6, 4], [8, B5, 2], [10, G5, 2], [12, A5, 2], [14, B5, 2]] },
  { chord: 'C', drums: 'full', bass: 'groove', melody: [[0, C6, 6], [8, G5, 2], [10, E5, 2], [12, G5, 4]] },
  // ループ先頭へのつなぎ: 最後の D5 → A 先頭の E5
  { chord: 'G', drums: 'full', bass: 'groove', fill: true, melody: [[0, D6, 2], [2, B5, 2], [4, G5, 2], [6, A5, 2], [8, B5, 2], [10, A5, 2], [12, G5, 2], [14, D5, 2]] },
]

export const LOOP: Bar[] = [...SECTION_A, ...SECTION_B]
/** 全体の中でループが始まる小節 */
export const LOOP_START_BAR = INTRO.length
export const TOTAL_BARS = INTRO.length + LOOP.length

/** 小節の並び (イントロ + ループ) の中で、次に鳴らす小節。ループの最後の次はループ先頭に戻る */
export function nextBarIndex(bar: number): number {
  return bar + 1 >= TOTAL_BARS ? LOOP_START_BAR : bar + 1
}

export function barAt(index: number): Bar {
  return index < INTRO.length ? INTRO[index] : LOOP[index - INTRO.length]
}

export class BgmPlayer {
  private ctx: BaseAudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private timer = 0
  private bar = 0
  private step = 0
  private nextTime = 0
  private playing = false
  private stopTimer = 0
  private volume = 0.5
  private readonly getContext: () => BaseAudioContext

  constructor(getContext: () => BaseAudioContext = getAudioContext) {
    this.getContext = getContext
  }

  private setup(): BaseAudioContext {
    const ctx = this.getContext()
    if (this.ctx !== ctx) {
      this.ctx = ctx
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -18
      comp.ratio.value = 4
      comp.connect(ctx.destination)
      this.master = ctx.createGain()
      this.master.gain.value = 0
      this.master.connect(comp)
      const len = ctx.sampleRate
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate)
      const data = this.noise.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    }
    return ctx
  }

  get isPlaying() {
    return this.playing
  }

  /** 0〜1 */
  setVolume(v: number) {
    this.volume = v
    if (this.playing && this.ctx && this.master) {
      this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.1)
    }
  }

  private level() {
    // 聴感に合わせたカーブ (50% で最大の約1/3)
    return Math.pow(this.volume, 1.5) * 0.9
  }

  /** イントロから再生を始める (再生中なら音量を戻すだけ) */
  start() {
    const ctx = this.setup()
    window.clearTimeout(this.stopTimer)
    if (!this.playing) {
      this.playing = true
      this.bar = 0
      this.step = 0
      this.nextTime = ctx.currentTime + 0.1
      window.clearInterval(this.timer)
      this.timer = window.setInterval(() => this.scheduleUntil(ctx.currentTime + LOOKAHEAD_SEC), TICK_MS)
    }
    const g = this.master!.gain
    g.cancelScheduledValues(ctx.currentTime)
    g.setValueAtTime(g.value, ctx.currentTime)
    g.linearRampToValueAtTime(this.level(), ctx.currentTime + 1.2)
  }

  /** フェードアウトして止める */
  stop(fadeSec = 0.6) {
    if (!this.playing || !this.ctx || !this.master) return
    const ctx = this.ctx
    const g = this.master.gain
    g.cancelScheduledValues(ctx.currentTime)
    g.setValueAtTime(g.value, ctx.currentTime)
    g.linearRampToValueAtTime(0, ctx.currentTime + fadeSec)
    window.clearTimeout(this.stopTimer)
    this.stopTimer = window.setTimeout(
      () => {
        window.clearInterval(this.timer)
        this.playing = false
      },
      fadeSec * 1000 + 50,
    )
  }

  /**
   * OfflineAudioContext に指定秒数ぶん書き出す (テスト・確認用)。
   * 返り値の AudioBuffer でループの継ぎ目に隙間がないか等を調べられる。
   */
  static async render(seconds: number, sampleRate = 22050): Promise<AudioBuffer> {
    const offline = new OfflineAudioContext(1, Math.ceil(seconds * sampleRate), sampleRate)
    const p = new BgmPlayer(() => offline)
    p.setup()
    p.master!.gain.value = p.level()
    p.nextTime = 0
    p.scheduleUntil(seconds)
    return offline.startRendering()
  }

  /** until (秒) までの音を予約する。setInterval のぶれに影響されないよう少し先まで予約しておく */
  private scheduleUntil(until: number) {
    const ctx = this.ctx!
    // タブが裏に回っていた等で大きく遅れたら、今に合わせ直す
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05
    while (this.nextTime < until) {
      this.playStep(barAt(this.bar), this.step, this.nextTime)
      this.nextTime += STEP_SEC
      this.step++
      if (this.step >= STEPS_PER_BAR) {
        this.step = 0
        this.bar = nextBarIndex(this.bar)
      }
    }
  }

  private playStep(bar: Bar, s: number, t: number) {
    // ドラム
    if (bar.drums === 'full') {
      if (s === 0 || s === 8 || s === 10) this.kick(t)
      if (s === 4 || s === 12) this.clap(t)
    }
    if (bar.drums !== 'none' && s % 2 === 0) this.hat(t, s % 4 === 2 ? 0.05 : 0.03)
    if (bar.fill && s >= 12) {
      // 変わり目のフィル: 16分のハイハット + クラップ連打
      this.hat(t, 0.045)
      if (bar.drums === 'full' && s >= 13) this.clap(t)
    }

    // ベース
    const [root, fifth] = BASS[bar.chord]
    if (bar.bass === 'hold') {
      if (s === 0) this.bass(root, t, BAR_SEC * 0.95)
    } else {
      const pattern: Record<number, number> = { 0: root, 6: root, 8: fifth, 11: root, 12: root + 12, 14: fifth }
      if (pattern[s] !== undefined) this.bass(pattern[s], t, STEP_SEC * 1.8)
    }

    // 裏拍のコード
    if (s % 4 === 2) this.pluck(CHORD_TONES[bar.chord], t)

    // メロディ
    for (const [pos, midi, len] of bar.melody) {
      if (pos === s) this.marimba(midi, t, len * STEP_SEC)
    }
  }

  // ------------------------------------------------------------ 音色

  private env(t: number, peak: number, attack: number, decay: number): GainNode {
    const g = this.ctx!.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
    g.connect(this.master!)
    return g
  }

  private osc(type: OscillatorType, freq: number, t: number, dur: number, dest: AudioNode) {
    const o = this.ctx!.createOscillator()
    o.type = type
    o.frequency.value = freq
    o.connect(dest)
    o.start(t)
    o.stop(t + dur)
    return o
  }

  private marimba(midi: number, t: number, len: number) {
    const f = midiToFreq(midi)
    const decay = Math.min(0.9, 0.25 + len)
    this.osc('sine', f, t, decay + 0.05, this.env(t, 0.16, 0.004, decay))
    // 木琴らしいアタックの倍音
    this.osc('sine', f * 3.93, t, 0.12, this.env(t, 0.04, 0.002, 0.08))
  }

  private pluck(notes: number[], t: number) {
    const ctx = this.ctx!
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1800
    lp.connect(this.env(t, 0.05, 0.005, 0.22))
    for (const m of notes) this.osc('triangle', midiToFreq(m), t, 0.3, lp)
  }

  private bass(midi: number, t: number, dur: number) {
    const ctx = this.ctx!
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 700
    lp.connect(this.env(t, 0.2, 0.008, dur))
    this.osc('triangle', midiToFreq(midi), t, dur + 0.05, lp)
    this.osc('sine', midiToFreq(midi), t, dur + 0.05, lp)
  }

  private kick(t: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(150, t)
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12)
    o.connect(this.env(t, 0.32, 0.002, 0.16))
    o.start(t)
    o.stop(t + 0.2)
  }

  private noiseHit(t: number, filter: BiquadFilterType, freq: number, peak: number, decay: number) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = filter
    f.frequency.value = freq
    src.connect(f).connect(this.env(t, peak, 0.001, decay))
    src.start(t, Math.random() * 0.5)
    src.stop(t + decay + 0.02)
  }

  private clap(t: number) {
    this.noiseHit(t, 'bandpass', 1600, 0.11, 0.12)
  }

  private hat(t: number, peak: number) {
    this.noiseHit(t, 'highpass', 7000, peak, 0.035)
  }
}

export const bgm = new BgmPlayer()
