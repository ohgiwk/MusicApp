interface Props {
  /** 音の高さ (MIDI。絶対値は使わず、動きだけを描く) */
  midis: number[]
  /** 1半音の高さ (px)。選択肢どうしで同じ値にすると動きの大きさを比べられる */
  semitonePx: number
  color?: string
  /** 今鳴っている音 (-1 でなし) */
  active?: number
  /** 形を隠して音の数だけ見せる (再生中) */
  hidden?: boolean
  height?: number
}

/** 楽譜を使わずにメロディの上下の動きを線で描く */
export function MelodyLine({ midis, semitonePx, color = '#7c5cff', active = -1, hidden, height = 90 }: Props) {
  const W = 300
  const H = height
  const pad = 22
  const mid = (Math.max(...midis) + Math.min(...midis)) / 2
  const x = (i: number) => pad + (midis.length === 1 ? 0 : (i * (W - pad * 2)) / (midis.length - 1))
  const y = (m: number) => (hidden ? H / 2 : H / 2 - (m - mid) * semitonePx)
  const points = midis.map((m, i) => `${x(i)},${y(m)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-hidden>
      {!hidden && <polyline points={points} fill="none" stroke={color} strokeOpacity={0.45} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />}
      {midis.map((m, i) => (
        <g key={i}>
          {i === active && <circle cx={x(i)} cy={y(m)} r={17} fill={color} opacity={0.25} className="animate-pulse-ring" style={{ transformOrigin: `${x(i)}px ${y(m)}px` }} />}
          <circle
            cx={x(i)}
            cy={y(m)}
            r={i === active ? 11 : 7}
            fill={hidden ? (i === active ? color : '#d9d3f0') : color}
            stroke="white"
            strokeWidth={3}
            style={{ transition: 'r 0.15s' }}
          />
        </g>
      ))}
    </svg>
  )
}
