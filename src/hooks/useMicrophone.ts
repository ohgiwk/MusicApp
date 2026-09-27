import { useEffect } from 'react'
import { useMicStore } from '../store/micStore'

export function useMicrophone() {
  const status = useMicStore((s) => s.status)
  const errorMessage = useMicStore((s) => s.errorMessage)
  const granted = useMicStore((s) => s.granted)
  const enable = useMicStore((s) => s.enable)
  const disable = useMicStore((s) => s.disable)
  return { status, errorMessage, granted, enable, disable, isReady: status === 'ready' }
}

/** マイクを使わない画面ではマイクを止める */
export function useMicLifecycle(needsMic: boolean) {
  useEffect(() => {
    if (!needsMic) useMicStore.getState().disable()
  }, [needsMic])
}
