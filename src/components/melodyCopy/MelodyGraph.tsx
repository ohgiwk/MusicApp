import { noteFromMidi } from '../../audio/pitchUtils'
import type { MelodyScore, PitchSample } from '../../games/melodyCopy/scoring'
import { COLORS } from '../../theme'

interface GraphProps {
  melody: number[]
  activeNote: number
  showTargets: boolean
  samples: PitchSample[]
  cursorT: number | null
  liveMidi: number | null
  result: MelodyScore | null
  countIn: number
  noteMs: number
  okCents: number
}

/** 横方向のピッチバー + 歌声の軌跡 */
export function MelodyGraph({
  melody,
  activeNote,
  showTargets,
  samples,
  cursorT,
  liveMidi,
  result,
  countIn,
  noteMs,
  okCents,
}: GraphProps) {
  const NOTE_MS = noteMs
  const OK_CENTS = okCents
  const W = 600
  const H = 300
  const padL = 44
  const padR = 34
  const lo = Math.min(...melody) - 3
  const hi = Math.max(...melody) + 3
  const totalMs = melody.length * NOTE_MS
  const x = (t: number) => padL + (t / totalMs) * (W - padL - padR)
  const y = (m: number) => H - 16 - ((m - lo) / (hi - lo)) * (H - 32)

  // 軌跡を無声区間で分割
  const paths: string[] = []
  let cur = ''
  for (const s of samples) {
    if (s.midi === null || s.t < 0 || s.t > totalMs * 1.1) {
      if (cur) paths.push(cur)
      cur = ''
      continue
    }
    const my = y(Math.max(lo - 1, Math.min(hi + 1, s.midi)))
    cur += `${cur ? 'L' : 'M'}${x(Math.min(s.t, totalMs)).toFixed(1)},${my.toFixed(1)}`
  }
  if (cur) paths.push(cur)

  const rows: number[] = []
  for (let m = Math.ceil(lo); m <= hi; m++) rows.push(m)

  return (
    <div className="card relative overflow-hidden p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none">
        {rows.map((m) => (
          <g key={m}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(m)}
              y2={y(m)}
              stroke={COLORS.ink}
              strokeOpacity={noteFromMidi(m).name.includes('#') ? 0.03 : 0.08}
            />
            {!noteFromMidi(m).name.includes('#') && (
              <text
                x={padL - 6}
                y={y(m) + 4}
                textAnchor="end"
                fontSize={11}
                fontWeight={700}
                fill={COLORS.ink}
                fillOpacity={0.35}
              >
                {noteFromMidi(m).label}
              </text>
            )}
          </g>
        ))}

        {melody.map((m, i) => {
          const nr = result?.notes[i]
          const color = nr
            ? nr.ok
              ? COLORS.mint
              : nr.cents === null
                ? COLORS.faint
                : COLORS.bubble
            : i === activeNote
              ? COLORS.sun
              : COLORS.grape
          const bandH = ((OK_CENTS / 100) * (H - 32)) / (hi - lo)
          return (
            <g key={i} opacity={showTargets ? 1 : 0.25}>
              <rect
                x={x(i * NOTE_MS) + 3}
                y={y(m) - bandH}
                width={x(NOTE_MS) - padL - 6}
                height={bandH * 2}
                rx={bandH}
                fill={color}
                fillOpacity={0.18}
              />
              <rect
                x={x(i * NOTE_MS) + 3}
                y={y(m) - 4}
                width={x(NOTE_MS) - padL - 6}
                height={8}
                rx={4}
                fill={color}
                style={{ transition: 'fill 0.15s' }}
              />
              <text x={x(i * NOTE_MS) + 8} y={y(m) - 10} fontSize={14} fontWeight={800} fill={color}>
                {showTargets ? noteFromMidi(m).label : '?'}
              </text>
              {i < melody.length - 1 && (
                <line
                  x1={x((i + 1) * NOTE_MS) - 3}
                  y1={y(m)}
                  x2={x((i + 1) * NOTE_MS) + 3}
                  y2={y(melody[i + 1])}
                  stroke={color}
                  strokeOpacity={0.4}
                  strokeWidth={2}
                  strokeDasharray="3 3"
                />
              )}
            </g>
          )
        })}

        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={COLORS.ink}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.75}
          />
        ))}

        {cursorT !== null && cursorT <= totalMs && (
          <line
            x1={x(cursorT)}
            x2={x(cursorT)}
            y1={8}
            y2={H - 8}
            stroke={COLORS.sun}
            strokeWidth={3}
            strokeLinecap="round"
          />
        )}

        {liveMidi !== null && (
          <g>
            <circle
              cx={W - padR / 2}
              cy={y(Math.max(lo, Math.min(hi, liveMidi)))}
              r={9}
              fill={COLORS.bubble}
              stroke="white"
              strokeWidth={3}
            />
          </g>
        )}
      </svg>
      {countIn > 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span key={countIn} className="animate-pop text-7xl font-extrabold text-sun drop-shadow">
            {countIn}
          </span>
        </div>
      )}
    </div>
  )
}
