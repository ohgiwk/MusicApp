import { Link } from 'react-router'
import { GameCard } from '../components/GameCard'
import { Icon } from '../components/Icon'
import { StatBar } from '../components/StatBar'
import { GAMES, MONITOR } from '../games/meta'
import { VOICE_RANGES, useSettingsStore, type VoiceRange } from '../store/settingsStore'
import { STAT_LABELS, isDoneToday, useStatsStore, type StatKey } from '../store/statsStore'

const STAT_COLORS: Record<StatKey, string> = {
  accuracy: '#ff5fa2',
  stability: '#22c98c',
  control: '#22b8e8',
  melody: '#ffb020',
}

// 今日のトレーニングメニュー (日替わりで順番を変える)
function todaysMenu() {
  const day = new Date().getDate()
  const order = [...GAMES]
  for (let i = 0; i < day % 3; i++) order.push(order.shift()!)
  return order
}

export function HomePage() {
  const stats = useStatsStore((s) => s.stats)
  const todayDone = useStatsStore((s) => s.todayDone)
  const range = useSettingsStore((s) => s.range)
  const setRange = useSettingsStore((s) => s.setRange)
  const menu = todaysMenu()
  const doneCount = menu.filter((g) => isDoneToday(todayDone, g.id)).length
  const next = menu.find((g) => !isDoneToday(todayDone, g.id))

  return (
    <div className="flex flex-col gap-5 pt-2">
      <section className="flex items-center gap-4">
        <div className="animate-float grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-grape to-bubble text-white shadow-lg">
          <Icon name="mic" size={34} />
        </div>
        <div>
          <p className="text-sm font-bold text-ink-soft">こえあそび</p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">今日も声で遊ぼう！</h1>
        </div>
      </section>

      {/* 今日のトレーニング */}
      <section className="card overflow-hidden p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-extrabold">今日のトレーニング</h2>
          <span className="chip bg-grape/10 text-grape">
            {doneCount} / {menu.length} クリア
          </span>
        </div>
        <ol className="mb-4 flex items-center gap-2">
          {menu.map((g, i) => {
            const done = isDoneToday(todayDone, g.id)
            return (
              <li key={g.id} className="flex flex-1 items-center gap-2">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition ${done ? '' : 'opacity-40'}`}
                  style={{ background: g.color }}
                >
                  <Icon name={done ? 'check' : g.icon} size={20} />
                </span>
                <span className="hidden text-xs font-bold text-ink-soft sm:inline">{g.title}</span>
                {i < menu.length - 1 && <span className="h-1 flex-1 rounded-full bg-cloud" />}
              </li>
            )
          })}
        </ol>
        {next ? (
          <Link to={next.to} className="btn-primary w-full">
            <Icon name="play" size={18} /> {next.title}からスタート
          </Link>
        ) : (
          <p className="rounded-2xl bg-mint/15 py-3 text-center font-extrabold text-mint">今日のメニューは全部クリア！ おつかれさま</p>
        )}
      </section>

      {/* ミニゲーム */}
      <section>
        <h2 className="mb-3 px-1 font-extrabold">ミニゲーム</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {GAMES.map((g) => (
            <GameCard key={g.id} {...g} done={isDoneToday(todayDone, g.id)} />
          ))}
        </div>
        <div className="mt-3">
          <GameCard {...MONITOR} compact />
        </div>
      </section>

      {/* 能力値 */}
      <section className="card grid gap-5 p-5 sm:grid-cols-[1fr_auto]">
        <div>
          <h2 className="mb-3 font-extrabold">あなたの能力値</h2>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-x-6">
            {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => (
              <StatBar key={k} label={STAT_LABELS[k]} value={stats[k]} color={STAT_COLORS[k]} />
            ))}
          </div>
        </div>
        <div className="sm:w-40">
          <h2 className="mb-3 font-extrabold">声の高さ</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
            {(Object.keys(VOICE_RANGES) as VoiceRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-2xl border-2 px-3 py-2 text-left transition ${range === r ? 'border-grape bg-grape/10' : 'border-cloud bg-white'}`}
              >
                <span className="block font-extrabold">{VOICE_RANGES[r].label}</span>
                <span className="text-xs text-ink-soft">{VOICE_RANGES[r].sub}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
