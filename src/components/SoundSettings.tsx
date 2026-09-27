import { useSettingsStore } from '../store/settingsStore'
import { Icon } from './Icon'

export function SoundSettings() {
  const enabled = useSettingsStore((s) => s.bgmEnabled)
  const volume = useSettingsStore((s) => s.bgmVolume)
  const setEnabled = useSettingsStore((s) => s.setBgmEnabled)
  const setVolume = useSettingsStore((s) => s.setBgmVolume)

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-extrabold">BGM</h2>
          <p className="text-xs text-ink-soft">メニュー画面で流れます</p>
        </div>
        <button
          role="switch"
          aria-checked={enabled}
          aria-label="BGM"
          onClick={() => setEnabled(!enabled)}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${enabled ? 'bg-grape' : 'bg-ink/15'}`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left] ${enabled ? 'left-7' : 'left-1'}`}
          />
        </button>
      </div>
      <label className={`mt-4 flex items-center gap-3 ${enabled ? '' : 'opacity-40'}`}>
        <Icon name="mute" size={18} className="shrink-0 text-ink-soft" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          disabled={!enabled}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full accent-grape"
          aria-label="BGMの音量"
        />
        <Icon name="speaker" size={18} className="shrink-0 text-ink-soft" />
      </label>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        <span className="block">ゲーム中は声の判定のため BGM を止めます。</span>
        <span className="block">iPhone では消音モードのとき鳴らないことがあります。</span>
      </p>
    </section>
  )
}
