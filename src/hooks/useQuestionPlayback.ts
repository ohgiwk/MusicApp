import { useCallback, useEffect, useRef, useState } from 'react'
import type { MelodyHandle } from '../audio/tonePlayer'
import { playQuestion } from '../games/ear/common'

/**
 * 耳トレの問題の音を鳴らす。
 * - 新しく鳴らすと、鳴っている音・予約中の音は止める
 * - 画面を離れたら (アンマウント) 自動で止める
 * - play() は最後まで鳴ったら true、途中で止めたら false で resolve する
 *   (false のときは画面のフェーズを進めないこと)
 */
export function useQuestionPlayback() {
  const [activeNote, setActiveNote] = useState(-1)
  const handle = useRef<MelodyHandle | null>(null)
  const timer = useRef(0)
  const pending = useRef<((completed: boolean) => void) | null>(null)

  const stop = useCallback(() => {
    window.clearTimeout(timer.current)
    pending.current?.(false)
    pending.current = null
    handle.current?.cancel()
  }, [])

  useEffect(() => stop, [stop])

  /** delayMs 後に midis を順番に鳴らす */
  const play = useCallback(
    (midis: number[], noteSec: number, delayMs = 0) => {
      stop()
      return new Promise<boolean>((resolve) => {
        const begin = () => {
          pending.current = null
          handle.current = playQuestion(midis, noteSec, setActiveNote)
          void handle.current.done.then(resolve)
        }
        if (delayMs > 0) {
          pending.current = resolve
          timer.current = window.setTimeout(begin, delayMs)
        } else {
          begin()
        }
      })
    },
    [stop],
  )

  return { activeNote, isPlaying: activeNote >= 0, play, stop }
}
