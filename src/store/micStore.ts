import { create } from 'zustand'
import { MicError, startMicrophone, stopMicrophone, type MicErrorKind } from '../audio/audioEngine'

export type MicStatus = 'idle' | 'requesting' | 'ready' | MicErrorKind

interface MicState {
  status: MicStatus
  errorMessage: string | null
  enable: () => Promise<void>
  disable: () => void
}

export const useMicStore = create<MicState>((set, get) => ({
  status: 'idle',
  errorMessage: null,
  enable: async () => {
    if (get().status === 'requesting' || get().status === 'ready') return
    set({ status: 'requesting', errorMessage: null })
    try {
      await startMicrophone()
      set({ status: 'ready' })
    } catch (e) {
      if (e instanceof MicError) set({ status: e.kind, errorMessage: e.message })
      else set({ status: 'error', errorMessage: String(e) })
    }
  },
  disable: () => {
    stopMicrophone()
    set({ status: 'idle' })
  },
}))
