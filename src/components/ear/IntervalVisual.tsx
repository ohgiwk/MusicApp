import { noteFromMidi } from '../../audio/pitchUtils'

interface Props {
  from: number
  to: number
  /** 縦線の横に出す説明 (例: "7半音") */
  label: string
  sublabel?: string
  showNames?: boolean
  color?: string
}

/**
 * 2つの音を縦方向の位置で表示する。
 *            ● G4
 *            ↑ 7半音
 *   ● C4 ────┘
 */
export function IntervalVisual({ from, to, label, sublabel, showNames = true, color = '#7c5cff' }: Props) {
  const semis = to - from
  const PX = 9 // 1半音の高さ
  const h = semis === 0 ? 0 : Math.sign(semis) * Math.min(130, Math.max(34, Math.abs(semis) * PX))
  const cy = 85
  const y1 = cy + h / 2
  const y2 = cy - h / 2
  const x1 = 55
  const x2 = 165
  const up = semis > 0
  return (
    <svg viewBox="0 0 260 170" className="h-auto w-full max-w-[320px]" role="img" aria-label={`${label}${sublabel ? ` ${sublabel}` : ''}`}>
      <line x1={x1} y1={y1} x2={x2} y2={y1} stroke="#2a2350" strokeOpacity={0.25} strokeWidth={2} strokeDasharray="4 4" />
      {semis !== 0 && (
        <>
          {/* 矢印の先は2音目の点の手前で止める */}
          <line x1={x2} y1={y1} x2={x2} y2={y2 + (up ? 17 : -17)} stroke={color} strokeWidth={4} strokeLinecap="round" />
          <path
            d={up ? `M${x2 - 7} ${y2 + 24} L${x2} ${y2 + 16} L${x2 + 7} ${y2 + 24}` : `M${x2 - 7} ${y2 - 24} L${x2} ${y2 - 16} L${x2 + 7} ${y2 - 24}`}
            fill="none"
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      <circle cx={x1} cy={y1} r={10} fill="#9a94b8" />
      <circle cx={x2} cy={y2} r={11} fill={color} className="animate-pop" style={{ transformOrigin: `${x2}px ${y2}px` }} />
      {showNames && (
        <>
          <text x={x1} y={y1 + (up || semis === 0 ? 28 : -18)} textAnchor="middle" fontSize={13} fontWeight={800} fill="#6b6590">
            1音目 {noteFromMidi(from).label}
          </text>
          <text x={x2} y={y2 + (up ? -18 : 30)} textAnchor="middle" fontSize={13} fontWeight={800} fill={color}>
            2音目 {noteFromMidi(to).label}
          </text>
        </>
      )}
      <text x={x2 + 18} y={cy + (sublabel ? -2 : 5)} fontSize={15} fontWeight={800} fill="#2a2350">
        {label}
      </text>
      {sublabel && (
        <text x={x2 + 18} y={cy + 16} fontSize={12} fontWeight={800} fill={color}>
          {sublabel}
        </text>
      )}
    </svg>
  )
}
