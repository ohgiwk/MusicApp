/** 結果画面の数字のタイル */
export function ResultStats({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid gap-2 text-center" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it) => (
        <div key={it.label} className="rounded-xl bg-cloud p-2">
          <p className="text-[10px] font-bold text-ink-soft">{it.label}</p>
          <p className="text-base font-extrabold">{it.value}</p>
        </div>
      ))}
    </div>
  )
}
