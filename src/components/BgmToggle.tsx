import { useSettingsStore } from '../store/settingsStore'
import { Icon } from './Icon'

/** BGM のオン/オフをすぐ切り替えるボタン */
export function BgmToggle() {
  const enabled = useSettingsStore((s) => s.bgmEnabled)
  const setEnabled = useSettingsStore((s) => s.setBgmEnabled)
  return (
    <button
      onClick={() => setEnabled(!enabled)}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 transition active:scale-95 ${
        enabled ? 'border-grape/20 bg-white text-grape' : 'border-cloud bg-white/70 text-ink-soft/60'
      }`}
      aria-label={enabled ? 'BGMをオフにする' : 'BGMをオンにする'}
      aria-pressed={enabled}
    >
      <Icon name={enabled ? 'speaker' : 'mute'} size={20} />
    </button>
  )
}
