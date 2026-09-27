import { Link } from 'react-router'
import { BgmToggle } from '../components/BgmToggle'
import { GameCard } from '../components/GameCard'
import { Icon } from '../components/Icon'
import { GAMES, MONITOR } from '../games/meta'
import { DIFFICULTY_LABELS } from '../games/difficulty'
import { useSettingsStore } from '../store/settingsStore'
import { rankingOf, useScoreStore } from '../store/scoreStore'
import { isDoneToday, useStatsStore } from '../store/statsStore'

// 今日のトレーニングメニュー (日替わりで順番を変える)
function todaysMenu() {
  const day = new Date().getDate()
  const order = [...GAMES]
  for (let i = 0; i < day % 3; i++) order.push(order.shift()!)
  return order
}

export function HomePage() {
  const todayDone = useStatsStore((s) => s.todayDone)
  const records = useScoreStore((s) => s.records)
  const difficulty = useSettingsStore((s) => s.difficulty)
  const menu = todaysMenu()
  const doneCount = menu.filter((g) => isDoneToday(todayDone, g.id)).length
  const next = menu.find((g) => !isDoneToday(todayDone, g.id))

  return (
    <div className="flex flex-col gap-5 pt-2">
      <section className="flex items-center gap-3 sm:gap-4">
        <div className="animate-float grid h-14 w-14 shrink-0 place-items-center rounded-3xl sm:h-16 sm:w-16 bg-gradient-to-br from-grape to-bubble text-white shadow-lg">
          <Icon name="mic" size={30} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-soft">こえあそび</p>
          <h1 className="whitespace-nowrap text-[22px] font-extrabold sm:text-3xl">今日も声で遊ぼう！</h1>
        </div>
        <BgmToggle />
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
          {GAMES.map((g) => {
            // 今選んでいる難易度での自己ベストを出す
            const d = g.id !== 'monitor' ? (difficulty?.[g.id] ?? 'normal') : 'normal'
            const best = g.id !== 'monitor' ? rankingOf(records[g.id], d)[0] : undefined
            return (
              <GameCard
                key={g.id}
                {...g}
                done={isDoneToday(todayDone, g.id)}
                best={best ? `ベスト ${best.score}${g.id === 'flight' ? 'pt' : '点'}（${DIFFICULTY_LABELS[d]}）` : undefined}
              />
            )
          })}
        </div>
        <div className="mt-3">
          <GameCard {...MONITOR} compact />
        </div>
      </section>

    </div>
  )
}
