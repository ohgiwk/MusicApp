import { getAudioContext } from './audioEngine'

/**
 * ブラウザはユーザー操作があるまで音を出せない (自動再生の制限)。
 * 音の再生を許可する「ユーザー操作」になるのは指を離したとき (pointerup / touchend / click) や
 * キー入力で、指が触れた瞬間の pointerdown / touchstart は数えられない。
 * そのため、これらのイベントで AudioContext を作成・再開し、実際に running になるまで毎回試す。
 * iOS で電話や他アプリにより音声が中断 (interrupted) された後も、次の操作で再開する。
 */
const EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const

let unlocked = false
const subscribers = new Set<() => void>()

function markUnlocked() {
  if (unlocked) return
  unlocked = true
  subscribers.forEach((fn) => fn())
}

function onGesture(e: Event) {
  if (e instanceof KeyboardEvent && e.key === 'Escape') return
  let ctx: AudioContext
  try {
    ctx = getAudioContext()
  } catch {
    return // Web Audio 非対応
  }
  if (ctx.state === 'running') {
    markUnlocked()
    return
  }
  // 古い iOS はユーザー操作の中で実際に何か再生しないと解除されないので、無音を1サンプル鳴らす
  const src = ctx.createBufferSource()
  src.buffer = ctx.createBuffer(1, 1, 22050)
  src.connect(ctx.destination)
  src.start(0)
  void ctx.resume().then(() => {
    if (ctx.state === 'running') markUnlocked()
  })
}

if (typeof window !== 'undefined') {
  for (const ev of EVENTS) window.addEventListener(ev, onGesture, { capture: true, passive: true })
}

export function isAudioUnlocked() {
  return unlocked
}

/** 音の再生が許可されたときに呼ばれる。解除関数を返す */
export function onAudioUnlocked(fn: () => void): () => void {
  subscribers.add(fn)
  return () => void subscribers.delete(fn)
}
