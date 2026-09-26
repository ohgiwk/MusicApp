import { CentMeter } from '../components/CentMeter'
import { MicPermissionGate } from '../components/MicPermissionGate'
import { PitchReadout } from '../components/PitchReadout'
import { MIN_CLARITY, usePitchDetection } from '../hooks/usePitchDetection'
import { useSettingsStore } from '../store/settingsStore'

export function PitchMonitorPage() {
  return (
    <MicPermissionGate>
      <Monitor />
    </MicPermissionGate>
  )
}

function Monitor() {
  const { frame } = usePitchDetection()
  const noiseGate = useSettingsStore((s) => s.noiseGate)
  const setNoiseGate = useSettingsStore((s) => s.setNoiseGate)
  const level = Math.min(1, frame.rms / 0.2)
  const note = frame.note

  return (
    <div className="flex flex-col gap-4">
      <section className="card p-5">
        <PitchReadout frame={frame} />
        <CentMeter cents={note?.cents ?? null} active={frame.voiced} />
      </section>

      <section className="card grid grid-cols-2 gap-3 p-5 text-center sm:grid-cols-4">
        <Stat label="周波数" value={frame.freq ? `${frame.freq.toFixed(1)} Hz` : '—'} />
        <Stat label="音名 / オクターブ" value={note ? `${note.name} / ${note.octave}` : '—'} />
        <Stat label="MIDIノート" value={note ? String(note.midi) : '—'} />
        <Stat label="cent差" value={note ? `${note.cents > 0 ? '+' : ''}${Math.round(note.cents)}` : '—'} />
      </section>

      <section className="card flex flex-col gap-4 p-5">
        <Meter label="音量" value={level} marker={Math.min(1, noiseGate / 0.2)} color="#22b8e8" />
        <Meter label="ピッチ信頼度" value={frame.clarity} marker={MIN_CLARITY} color="#22c98c" />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-bold">
            マイク感度 <span className="text-ink-soft">（反応しにくい時は右へ）</span>
          </span>
          <input
            type="range"
            min={0.002}
            max={0.05}
            step={0.001}
            value={0.052 - noiseGate}
            onChange={(e) => setNoiseGate(0.052 - Number(e.target.value))}
            className="accent-grape"
          />
        </label>
        <p className="text-xs text-ink-soft">
          縦線はしきい値です。音量・信頼度の両方が縦線を超えたときだけ音程を判定します。
        </p>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cloud p-3">
      <p className="text-xs font-bold text-ink-soft">{label}</p>
      <p className="text-lg font-extrabold tabular-nums">{value}</p>
    </div>
  )
}

function Meter({ label, value, marker, color }: { label: string; value: number; marker: number; color: string }) {
  return (
    <div>
      <p className="mb-1 text-sm font-bold">{label}</p>
      <div className="relative h-3 overflow-hidden rounded-full bg-cloud">
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, background: color }} />
        <div className="absolute inset-y-0 w-0.5 bg-ink/50" style={{ left: `${marker * 100}%` }} />
      </div>
    </div>
  )
}
