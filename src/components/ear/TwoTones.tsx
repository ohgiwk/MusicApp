/** 2つの音のどちらが鳴っているかだけを示す (音の高さは見せない) */
export function TwoTones({ activeNote, color }: { activeNote: number; color: string }) {
  return (
    <div className="flex items-center gap-6">
      {[0, 1].map((i) => (
        <span
          key={i}
          className={`grid h-16 w-16 place-items-center rounded-full text-2xl font-extrabold transition ${
            activeNote === i ? 'scale-110 text-white shadow-lg' : 'bg-cloud text-ink-soft'
          }`}
          style={activeNote === i ? { background: color } : undefined}
        >
          {i + 1}
        </span>
      ))}
    </div>
  )
}
