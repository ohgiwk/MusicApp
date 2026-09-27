import { Link, useSearchParams } from 'react-router'
import { Icon } from '../components/Icon'
import { GAMES, gameMeta, scoreUnit } from '../games/meta'
import { GAME_LEVELS, levelOption } from '../games/difficulty'
import { useLevel } from '../store/settingsStore'
import { RANKED_GAME_IDS, RANKING_SIZE, rankingOf, useScoreStore, type RankedGameId } from '../store/scoreStore'

const MEDALS = ['#ffb020', '#a9a6c4', '#d9905a']

function formatDate(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function isRankedGame(v: string | null): v is RankedGameId {
  return RANKED_GAME_IDS.includes(v as RankedGameId)
}

export function RankingPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('game')
  const game: RankedGameId = isRankedGame(q) ? q : 'target'
  const meta = gameMeta(game)
  // 難易度の指定がなければ、そのゲームで今選んでいる難易度を表示する
  const selected = useLevel(game)
  const qd = params.get('diff')
  const levels = GAME_LEVELS[game]
  const current = levelOption(game, levels.some((l) => l.id === qd) ? qd! : selected)
  const difficulty = current.id
  const all = useScoreStore((s) => s.records[game])
  const records = rankingOf(all, difficulty)
  const lastId = useScoreStore((s) => s.lastIds[game])
  const clear = useScoreStore((s) => s.clear)

  return (
    <div className="flex flex-col gap-4">
      {/* ゲーム切り替えタブ */}
      <div className="card grid grid-cols-3 gap-1 p-1.5" role="tablist">
        {GAMES.map((g) => {
          const active = g.id === game
          return (
            <button
              key={g.id}
              role="tab"
              aria-selected={active}
              onClick={() => setParams({ game: g.id }, { replace: true })}
              className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-xs font-extrabold transition sm:flex-row sm:justify-center sm:text-sm ${
                active ? 'text-white shadow' : 'text-ink-soft'
              }`}
              style={active ? { background: g.color } : undefined}
            >
              <Icon name={g.icon} size={18} />
              <span className="whitespace-nowrap">
                <span className="sm:hidden">{g.shortTitle}</span>
                <span className="hidden sm:inline">{g.title}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* 難易度切り替え */}
      <div
        className="grid gap-1.5 rounded-2xl bg-white/60 p-1"
        style={{ gridTemplateColumns: `repeat(${levels.length}, minmax(0, 1fr))` }}
        role="tablist"
        aria-label="難易度"
      >
        {levels.map(({ id: d, label, color }) => {
          const active = d === difficulty
          const count = rankingOf(all, d).length
          return (
            <button
              key={d}
              role="tab"
              aria-selected={active}
              onClick={() => setParams({ game, diff: d }, { replace: true })}
              className={`whitespace-nowrap rounded-xl py-1.5 text-xs font-extrabold transition ${active ? 'text-white shadow' : 'text-ink-soft'}`}
              style={active ? { background: color } : undefined}
            >
              {label}
              {count > 0 && <span className="ml-1 opacity-75">{count}</span>}
            </button>
          )
        })}
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="font-extrabold">
            自己ベスト TOP{RANKING_SIZE}
            <span className="ml-2 text-xs font-bold" style={{ color: current.color }}>
              {current.label}
            </span>
          </h2>
          <Link to={meta.to} className="chip text-white" style={{ background: meta.color }}>
            <Icon name="play" size={12} /> プレイ
          </Link>
        </div>

        {records.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 pb-8 pt-6 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-cloud text-ink-soft">
              <Icon name="trophy" size={28} />
            </span>
            <p className="font-bold text-ink-soft">「{current.label}」の記録はまだありません</p>
            <Link to={meta.to} className="btn-primary">
              {meta.title}で遊ぶ
            </Link>
          </div>
        ) : (
          <ol className="flex flex-col gap-1.5 px-3 pb-4">
            {records.map((r, i) => {
              const isNew = r.id === lastId
              return (
                <li
                  key={r.id}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${isNew ? 'bg-sun/15 ring-2 ring-sun/60' : i < 3 ? 'bg-cloud' : ''}`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold ${i < 3 ? 'text-white' : 'text-ink-soft'}`}
                    style={i < 3 ? { background: MEDALS[i] } : undefined}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-xs text-ink-soft">
                      {formatDate(r.at)}
                      {isNew && <span className="chip !px-2 !py-0 bg-sun text-[10px] text-white">NEW</span>}
                    </p>
                    {r.detail && <p className="truncate text-sm font-bold">{r.detail}</p>}
                  </div>
                  <p className="shrink-0 text-2xl font-extrabold tabular-nums" style={{ color: i === 0 ? meta.color : undefined }}>
                    {r.score}
                    <span className="ml-0.5 text-xs text-ink-soft">{scoreUnit(game)}</span>
                  </p>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <div className="flex flex-col items-center gap-2 text-center text-xs text-ink-soft">
        <p>記録はこの端末のブラウザにだけ保存されます</p>
        {records.length > 0 && (
          <button
            className="underline"
            onClick={() => {
              if (window.confirm(`${meta.title}（${current.label}）の記録をすべて消去しますか？`)) clear(game, difficulty)
            }}
          >
            {meta.title}（{current.label}）の記録を消去
          </button>
        )}
      </div>
    </div>
  )
}
