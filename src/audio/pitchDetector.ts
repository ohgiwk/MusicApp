/**
 * YIN アルゴリズムによる基本周波数推定。
 *
 * 人の声は倍音が強く、FFTの最大ピークが基音にならないことが多いため、
 * 時間領域の自己相関系手法である YIN を使う。
 *  1. 差分関数 d(τ)
 *  2. 累積平均正規化差分関数 d'(τ) (CMND)
 *  3. 絶対閾値を最初に下回る谷を採用 (→ 倍音/サブハーモニクスの誤検出を抑える)
 *  4. 放物線補間でサブサンプル精度に
 *
 * de Cheveigné & Kawahara (2002) "YIN, a fundamental frequency estimator for speech and music"
 */

export interface PitchDetectorOptions {
  sampleRate: number
  /** 解析対象のサンプル数 (AnalyserNode.fftSize と同じ) */
  bufferSize: number
  minFreq?: number
  maxFreq?: number
  /** CMND の絶対閾値 (0.1〜0.2 程度) */
  threshold?: number
}

export interface PitchEstimate {
  /** 推定周波数。無音・推定不能なら null */
  freq: number | null
  /** 0〜1 の信頼度 (1 - CMND の谷の値) */
  clarity: number
  /** 入力の RMS 音量 */
  rms: number
}

export function computeRms(buf: Float32Array): number {
  let sum = 0
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
  return Math.sqrt(sum / buf.length)
}

export function createPitchDetector(opts: PitchDetectorOptions) {
  const { sampleRate, bufferSize } = opts
  const minFreq = opts.minFreq ?? 70
  const maxFreq = opts.maxFreq ?? 1000
  const threshold = opts.threshold ?? 0.15

  // 窓長 W と探索する τ の範囲。W + tauMax <= bufferSize になるよう調整
  const tauMin = Math.max(2, Math.floor(sampleRate / maxFreq))
  const tauMaxWanted = Math.ceil(sampleRate / minFreq)
  const window = Math.max(bufferSize - tauMaxWanted, Math.floor(bufferSize / 2))
  const tauMax = Math.min(tauMaxWanted, bufferSize - window - 1)

  const diff = new Float32Array(tauMax + 1)
  const cmnd = new Float32Array(tauMax + 1)

  /**
   * @param minRms この音量未満は無音とみなし計算を省略する
   */
  function detect(buf: Float32Array, minRms = 0): PitchEstimate {
    const rms = computeRms(buf)
    if (rms < minRms) return { freq: null, clarity: 0, rms }

    // 1. 差分関数
    for (let tau = 1; tau <= tauMax; tau++) {
      let sum = 0
      for (let i = 0; i < window; i++) {
        const d = buf[i] - buf[i + tau]
        sum += d * d
      }
      diff[tau] = sum
    }

    // 2. 累積平均正規化
    cmnd[0] = 1
    let running = 0
    for (let tau = 1; tau <= tauMax; tau++) {
      running += diff[tau]
      cmnd[tau] = running > 0 ? (diff[tau] * tau) / running : 1
    }

    // 3. 絶対閾値を下回る最初の谷
    let tauEst = -1
    for (let tau = tauMin; tau <= tauMax; tau++) {
      if (cmnd[tau] < threshold) {
        while (tau + 1 <= tauMax && cmnd[tau + 1] < cmnd[tau]) tau++
        tauEst = tau
        break
      }
    }
    // 閾値を下回らなければ全体の最小値 (信頼度は低くなる)
    if (tauEst === -1) {
      let best = tauMin
      for (let tau = tauMin + 1; tau <= tauMax; tau++) {
        if (cmnd[tau] < cmnd[best]) best = tau
      }
      tauEst = best
    }

    // 4. 放物線補間
    let betterTau = tauEst
    if (tauEst > 1 && tauEst < tauMax) {
      const s0 = cmnd[tauEst - 1]
      const s1 = cmnd[tauEst]
      const s2 = cmnd[tauEst + 1]
      const denom = 2 * (2 * s1 - s2 - s0)
      if (denom !== 0) betterTau = tauEst + (s2 - s0) / denom
    }

    const clarity = Math.max(0, Math.min(1, 1 - cmnd[tauEst]))
    const freq = sampleRate / betterTau
    if (!Number.isFinite(freq) || freq < minFreq || freq > maxFreq) {
      return { freq: null, clarity, rms }
    }
    return { freq, clarity, rms }
  }

  return { detect, tauMin, tauMax }
}

export type PitchDetector = ReturnType<typeof createPitchDetector>
