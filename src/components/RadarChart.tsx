interface Axis {
  label: string
  value: number | null
  color: string
}

/** 能力値のレーダーチャート (0〜100)。未計測の軸は 0 として点線で示す */
export function RadarChart({ axes, size = 240 }: { axes: Axis[]; size?: number }) {
  const c = size / 2
  const r = size / 2 - 38
  const n = axes.length
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return [c + Math.cos(a) * r * (v / 100), c + Math.sin(a) * r * (v / 100)] as const
  }
  const poly = (v: (i: number) => number) => axes.map((_, i) => pt(i, v(i)).join(',')).join(' ')
  const hasAny = axes.some((a) => a.value !== null)

  return (
    // 左右の軸ラベルが切れないよう横に余白を取る
    <svg viewBox={`-40 0 ${size + 80} ${size}`} className="h-auto w-full max-w-[320px]" role="img" aria-label="能力値チャート">
      {[25, 50, 75, 100].map((lv) => (
        <polygon key={lv} points={poly(() => lv)} fill={lv === 100 ? '#f6f3ff' : 'none'} stroke="#2a2350" strokeOpacity={0.1} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, 100)
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#2a2350" strokeOpacity={0.1} />
      })}
      {hasAny && (
        <polygon
          points={poly((i) => axes[i].value ?? 0)}
          fill="#7c5cff"
          fillOpacity={0.22}
          stroke="#7c5cff"
          strokeWidth={2.5}
          strokeLinejoin="round"
          style={{ transition: 'all 0.6s' }}
        />
      )}
      {axes.map((a, i) => {
        const [x, y] = pt(i, a.value ?? 0)
        const [lx, ly] = pt(i, 128)
        return (
          <g key={a.label}>
            {a.value !== null && <circle cx={x} cy={y} r={4.5} fill={a.color} stroke="white" strokeWidth={2} />}
            <text x={lx} y={ly - 5} textAnchor="middle" fontSize={11} fontWeight={800} fill="#2a2350">
              {a.label}
            </text>
            <text x={lx} y={ly + 10} textAnchor="middle" fontSize={12} fontWeight={800} fill={a.value === null ? '#9a94b8' : a.color}>
              {a.value ?? '—'}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
