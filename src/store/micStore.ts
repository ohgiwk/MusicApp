import { create } from 'zustand'
import { MicError, startMicrophone, stopMicrophone, type MicErrorKind } from '../audio/audioEngine'

export type MicStatus = 'idle' | 'requesting' | 'ready' | MicErrorKind

interface MicState {
  status: MicStatus
  errorMessage: string | null
  /** このセッションで一度マイクの使用が許可されたか (2回目以降は説明画面を出さずに再開する) */
  granted: boolean
  /** マイクを使いたい画面にいるか (起動中に画面を離れたら、起動後すぐ止めるため) */
  wanted: boolean
  enable: () => Promise<void>
  disable: () => void
}

/**
 * マイクの状態。マイクはそれを使う画面 (声トレ・ピッチモニター) にいる間だけ動かし、
 * メニューや耳トレでは止める (マイク使用中の表示を消し、iPhone で BGM が小さくなるのを防ぐ)。
 */
export const useMicStore = create<MicState>((set, get) => ({
  status: 'idle',
  errorMessage: null,
  granted: false,
  wanted: false,
  enable: async () => {
    set({ wanted: true })
    if (get().status === 'requesting' || get().status === 'ready') return
    set({ status: 'requesting', errorMessage: null })
    try {
      await startMicrophone()
      if (!get().wanted) {
        // 起動を待つ間に画面を離れた
        stopMicrophone()
        set({ status: 'idle', granted: true })
        return
      }
      set({ status: 'ready', granted: true })
    } catch (e) {
      if (e instanceof MicError) set({ status: e.kind, errorMessage: e.message })
      else set({ status: 'error', errorMessage: String(e) })
    }
  },
  disable: () => {
    set({ wanted: false })
    if (get().status !== 'ready') return
    stopMicrophone()
    set({ status: 'idle' })
  },
}))
