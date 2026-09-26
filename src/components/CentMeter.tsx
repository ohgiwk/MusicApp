import { clamp } from '../audio/pitchUtils'

/** ±50 cents の横メーター */
export function CentMeter({ cents, active }: { cents: number | null; active: boolean }) {
  const c = cents === null ? 0 : clamp(cents, -50, 50)
  const inTune = active && Math.abs(c) <= 10
  return (
    <div className="w-full">
      <div className="relative h-10 rounded-full bg-cloud">
        <div className="absolute inset-y-0 left-[40%] w-[20%] rounded-full bg-mint/20" />
        <div className="absolute inset-y-1 left-1/2 w-0.5 -translate-x-1/2 bg-mint" />
        {active && (
          <div
            className={`absolute top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white shadow-md transition-[left] duration-75 ${inTune ? 'bg-mint' : c > 0 ? 'bg-bubble' : 'bg-sky'}`}
            style={{ left: `${50 + c}%` }}
          />
        )}
      </div>
      <div className="mt-1 flex justify-between text-xs font-bold text-ink-soft">
        <span>-50 低い</span>
        <span>ぴったり</span>
        <span>高い +50</span>
      </div>
    </div>
  )
}
