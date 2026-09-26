export function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-bold">{label}</span>
        <span className="font-extrabold" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-cloud">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${Math.max(4, value)}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}
        />
      </div>
    </div>
  )
}
