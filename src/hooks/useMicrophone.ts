import { useMicStore } from '../store/micStore'

export function useMicrophone() {
  const status = useMicStore((s) => s.status)
  const errorMessage = useMicStore((s) => s.errorMessage)
  const enable = useMicStore((s) => s.enable)
  const disable = useMicStore((s) => s.disable)
  return { status, errorMessage, enable, disable, isReady: status === 'ready' }
}
