import { noteFromMidi } from '../../audio/pitchUtils'
import { GRADE_STYLE, VIEW_RANGE_CENTS, centsToView, type Grade } from '../../games/pitchTarget/grading'
import { TRAIL_LEN, type TargetView } from '../../games/pitchTarget/round'
import { COLORS } from '../../theme'

interface Props {
  view: TargetView
  /** 目標の音 (MIDI) */
  target: number
  hitRange: number
  /** 今、声が出ているか */
  voiced: boolean
  /** クリア直後に大きく出す判定 */
  clearGrade: Grade | null
}

/**
 * ピッチターゲットのステージ。
 * 中央の横線が目標の音、光る玉が自分の声 (上にあるほど高い)。目標付近は拡大して見せる。
 */
export function TargetStage({ view, target, hitRange, voiced, clearGrade }: Props) {
  const { cents } = view
  const label = noteFromMidi(target).label
  const inZone = cents !== null && Math.abs(cents) <= hitRange
  const out = cents !== null && Math.abs(cents) > VIEW_RANGE_CENTS
  return (
    <div className="card relative h-[48vh] min-h-[300px] max-h-[440px] overflow-hidden bg-gradient-to-b from-[#fff0f7] via-white to-[#eaf8ff]">
      {/* 半音ごとのガイド線 */}
      {[-300, -200, -100, 100, 200, 300].map((c) => (
        <div
          key={c}
          className="absolute inset-x-0 border-t border-dashed border-ink/10"
          style={{ top: `${50 - centsToView(c) * 50}%` }}
        >
          <span className="absolute right-2 -translate-y-1/2 bg-white/70 px-1 text-[10px] font-bold text-ink/35">
            {noteFromMidi(target + c / 100).label}
          </span>
        </div>
      ))}
      {/* 正解ゾーン */}
      <div
        className={`absolute inset-x-0 transition-colors ${inZone ? 'bg-mint/30' : 'bg-bubble/10'}`}
        style={{ top: `${50 - centsToView(hitRange) * 50}%`, bottom: `${50 - centsToView(hitRange) * 50}%` }}
      />
      {/* ターゲットライン */}
      <div className={`absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 ${inZone ? 'bg-mint' : 'bg-bubble'}`} />
      <span
        className={`absolute left-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-sm font-extrabold text-white shadow ${inZone ? 'bg-mint' : 'bg-bubble'}`}
      >
        {label}
      </span>

      {/* 軌跡 */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {view.trail.map((c, i) =>
          c === null || i % 2 ? null : (
            <circle
              key={i}
              cx={62 - i * 1.1}
              cy={50 - centsToView(c) * 50}
              r={0.9}
              fill={Math.abs(c) <= hitRange ? COLORS.mint : COLORS.grape}
              opacity={1 - i / TRAIL_LEN}
              vectorEffect="non-scaling-stroke"
            />
          ),
        )}
      </svg>

      {/* 自分の声 */}
      {cents !== null && voiced && (
        <div
          className="absolute left-[62%] -translate-x-1/2 -translate-y-1/2"
          style={{ top: `${50 - centsToView(cents) * 50}%` }}
        >
          <HoldRing progress={view.hold} color={inZone ? COLORS.mint : cents > 0 ? COLORS.bubble : COLORS.sky} />
          {out && (
            <span
              className="absolute left-1/2 -translate-x-1/2 text-2xl font-extrabold text-ink/60"
              style={{ top: cents > 0 ? 44 : -40 }}
            >
              {cents > 0 ? '▼' : '▲'}
            </span>
          )}
        </div>
      )}
      {cents !== null && (
        <span className="absolute bottom-2 right-3 chip bg-white/80 tabular-nums text-ink">
          {cents > 0 ? '+' : ''}
          {Math.round(cents)} cents
        </span>
      )}

      {/* ホールドゲージ */}
      <div className="absolute inset-x-3 top-3 h-2 overflow-hidden rounded-full bg-white/80">
        <div
          className="h-full rounded-full bg-mint transition-[width] duration-75"
          style={{ width: `${view.hold * 100}%` }}
        />
      </div>

      {clearGrade && (
        <div className="absolute inset-0 grid place-items-center bg-white/40">
          <p
            className="animate-pop text-5xl font-extrabold sm:text-6xl"
            style={{ color: GRADE_STYLE[clearGrade].color }}
          >
            {clearGrade}
          </p>
        </div>
      )}
    </div>
  )
}

function HoldRing({ progress, color }: { progress: number; color: string }) {
  const r = 22
  const circ = 2 * Math.PI * r
  return (
    <svg width={60} height={60} viewBox="0 0 60 60" className="drop-shadow-md">
      <circle cx={30} cy={30} r={r} fill="none" stroke="white" strokeWidth={6} />
      <circle
        cx={30}
        cy={30}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - progress)}
        transform="rotate(-90 30 30)"
      />
      <circle cx={30} cy={30} r={14} fill={color} />
      <circle cx={25} cy={25} r={4} fill="white" opacity={0.6} />
    </svg>
  )
}
