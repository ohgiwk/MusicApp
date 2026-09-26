/**
 * AudioContext / マイクストリーム / AnalyserNode をアプリ全体で1つだけ管理する。
 * React から独立させ、各画面はここから Analyser を借りる。
 */

export type MicErrorKind = 'denied' | 'unsupported' | 'notfound' | 'error'

export class MicError extends Error {
  readonly kind: MicErrorKind
  constructor(kind: MicErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

export const ANALYSER_FFT_SIZE = 2048

let ctx: AudioContext | null = null
let stream: MediaStream | null = null
let source: MediaStreamAudioSourceNode | null = null
let analyser: AnalyserNode | null = null

type AudioContextCtor = typeof AudioContext
function getCtor(): AudioContextCtor | undefined {
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor }
  return w.AudioContext ?? w.webkitAudioContext
}

/** ユーザー操作のハンドラ内で呼ぶこと (iOS Safari の自動再生制限対策) */
export function getAudioContext(): AudioContext {
  if (!ctx) {
    const Ctor = getCtor()
    if (!Ctor) throw new MicError('unsupported', 'このブラウザは Web Audio API に対応していません')
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function getAnalyser(): AnalyserNode | null {
  return analyser
}

export function isMicActive(): boolean {
  return !!stream && stream.getAudioTracks().some((t) => t.readyState === 'live')
}

export async function startMicrophone(): Promise<void> {
  if (isMicActive()) return
  if (!window.isSecureContext) {
    throw new MicError('unsupported', 'マイクは HTTPS または localhost でのみ利用できます')
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new MicError('unsupported', 'このブラウザはマイク入力に対応していません')
  }

  const audioCtx = getAudioContext()
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // 音程が歪まないよう、ブラウザ側の音声処理は切る
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
  } catch (e) {
    const name = e instanceof DOMException ? e.name : ''
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      throw new MicError('denied', 'マイクの使用が許可されませんでした')
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      throw new MicError('notfound', 'マイクが見つかりませんでした')
    }
    throw new MicError('error', `マイクを開始できませんでした (${name || String(e)})`)
  }

  source = audioCtx.createMediaStreamSource(stream)
  analyser = audioCtx.createAnalyser()
  analyser.fftSize = ANALYSER_FFT_SIZE
  analyser.smoothingTimeConstant = 0
  // スピーカーには繋がない (ハウリング防止)
  source.connect(analyser)
  if (audioCtx.state === 'suspended') await audioCtx.resume()
}

export function stopMicrophone() {
  stream?.getTracks().forEach((t) => t.stop())
  source?.disconnect()
  stream = null
  source = null
  analyser = null
}
