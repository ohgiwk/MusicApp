import { formatCents, relationOf } from '../audio/pitchUtils'
import type { PitchFrame } from '../hooks/usePitchDetection'

const REL = {
  high: { text: '高い', cls: 'bg-bubble/15 text-bubble' },
  low: { text: '低い', cls: 'bg-sky/15 text-sky' },
  match: { text: 'ほぼ一致', cls: 'bg-mint/15 text-mint' },
}

/** "A4 / 438.2Hz / -7 cents" 形式の大きな表示 */
export function PitchReadout({ frame }: { frame: PitchFrame }) {
  if (!frame.voiced || !frame.note || frame.freq === null) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <p className="text-6xl font-extrabold text-ink/20 sm:text-7xl">- -</p>
        <p className="animate-float text-lg font-bold text-ink-soft">声を出してください</p>
      </div>
    )
  }
  const { note, freq } = frame
  const rel = REL[relationOf(note.cents)]
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <p className="text-7xl font-extrabold leading-none text-grape sm:text-8xl">
        {note.name}
        <span className="text-4xl text-ink-soft sm:text-5xl">{note.octave}</span>
      </p>
      <p className="text-lg font-bold tabular-nums">
        {note.label} / {freq.toFixed(1)}Hz / {formatCents(note.cents)}
      </p>
      <span className={`chip text-sm ${rel.cls}`}>{rel.text}</span>
    </div>
  )
}
