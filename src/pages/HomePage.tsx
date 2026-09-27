import { Link } from 'react-router'
import { BgmToggle } from '../components/BgmToggle'
import { GameCard } from '../components/GameCard'
import { Icon } from '../components/Icon'
import { useState } from 'react'
import { EAR_GAMES, GAMES, MONITOR, SKILLS, VOICE_GAMES, gameMeta, scoreUnit, type GameMeta, type Skill } from '../games/meta'
import { levelOption, type LevelGameId } from '../games/difficulty'
import { useSettingsStore } from '../store/settingsStore'
import { rankingOf, useScoreStore } from '../store/scoreStore'
import { isDoneToday, useStatsStore } from '../store/statsStore'

// 今日のトレーニングメニュー: 聴く → 声を出す → メロディ の順 (日替わり)
function todaysMenu(): GameMeta[] {
  const day = new Date().getDate()
  return [EAR_GAMES[day % EAR_GAMES.length], VOICE_GAMES[day % 2], gameMeta('melody')]
}

type Filter = 'all' | Skill

export function HomePage() {
  const todayDone = useStatsStore((s) => s.todayDone)
  const records = useScoreStore((s) => s.records)
  const difficulty = useSettingsStore((s) => s.difficulty)
  const menu = todaysMenu()
  const doneCount = menu.filter((g) => isDoneToday(todayDone, g.id)).length
  const next = menu.find((g) => !isDoneToday(todayDone, g.id))
  const [filter, setFilter] = useState<Filter>('all')

  const card = (g: GameMeta, badge?: string) => {
    if (g.id === 'monitor') return <GameCard key={g.id} {...g} compact />
    // 今選んでいる難易度 (レベル) での自己ベストを出す
    const level = levelOption(g.id as LevelGameId, difficulty?.[g.id as LevelGameId])
    const best = rankingOf(records[g.id], level.id)[0]
    return (
      <GameCard
        key={g.id}
        {...g}
        badge={badge}
        done={isDoneToday(todayDone, g.id)}
        best={best ? `ベスト ${best.score}${scoreUnit(g.id)}（${level.label}）` : undefined}
      />
    )
  }

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

      {/* ミニゲーム (能力別に絞り込める) */}
      <section className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-1.5 rounded-full bg-white/60 p-1" role="tablist" aria-label="ゲームの種類">
          {([{ id: 'all', emoji: '', label: 'すべて' }, ...SKILLS] as { id: Filter; emoji: string; label: string }[]).map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`whitespace-nowrap rounded-full px-1 py-2 text-[13px] font-extrabold transition sm:text-sm ${
                filter === f.id ? 'bg-ink text-white shadow' : 'text-ink-soft'
              }`}
            >
              {f.emoji && <span className="mr-0.5">{f.emoji}</span>}
              {f.label}
            </button>
          ))}
        </div>

        {filter === 'all' ? (
          <>
            <div>
              <div className="mb-2 flex items-baseline gap-2 px-1">
                <h2 className="font-extrabold">👂 耳トレ</h2>
                <span className="text-xs font-bold text-ink-soft">マイク不要・聴く力を鍛える</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">{EAR_GAMES.map((g) => card(g, `STEP ${g.step}`))}</div>
            </div>
            <div>
              <div className="mb-2 flex items-baseline gap-2 px-1">
                <h2 className="font-extrabold">🎤 声トレ</h2>
                <span className="text-xs font-bold text-ink-soft">歌って音程を合わせる</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">{VOICE_GAMES.map((g) => card(g))}</div>
              <div className="mt-3">{card(MONITOR)}</div>
            </div>
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {[...GAMES, MONITOR]
              .filter((g) => g.skill === filter)
              .map((g) => card(g, g.category === 'ear' ? '👂 耳トレ' : '🎤 声トレ'))}
          </div>
        )}
      </section>
    </div>
  )
}
