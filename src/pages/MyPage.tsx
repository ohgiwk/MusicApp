import { useMemo } from 'react'
import { Link } from 'react-router'
import { Icon } from '../components/Icon'
import { RadarChart } from '../components/RadarChart'
import { StatBar } from '../components/StatBar'
import { GAMES } from '../games/meta'
import { useScoreStore } from '../store/scoreStore'
import { VOICE_RANGES, useSettingsStore, type VoiceRange } from '../store/settingsStore'
import {
  STAT_COLORS, STAT_HINTS, STAT_KEYS, STAT_LABELS, computeAbilities, streakOf, useStatsStore,
} from '../store/statsStore'
import { APP_VERSION, formatVersion } from '../update/versionCheck'

export function MyPage() {
  const samples = useStatsStore((s) => s.samples)
  const plays = useStatsStore((s) => s.plays)
  const playDays = useStatsStore((s) => s.playDays)
  const resetStats = useStatsStore((s) => s.resetStats)
  const records = useScoreStore((s) => s.records)
  const range = useSettingsStore((s) => s.range)
  const setRange = useSettingsStore((s) => s.setRange)

  const abilities = useMemo(() => computeAbilities(samples), [samples])
  const measured = STAT_KEYS.filter((k) => abilities[k].value !== null)
  const overall = measured.length
    ? Math.round(measured.reduce((a, k) => a + abilities[k].value!, 0) / measured.length)
    : null
  // まだ計測していない能力値を測れるゲームを案内する
  const unmeasuredKey = (['control', 'melody', 'stability', 'accuracy'] as const).find((k) => abilities[k].value === null)
  const unmeasuredGame = unmeasuredKey
    ? GAMES.find((g) => g.id === ({ control: 'flight', melody: 'melody', stability: 'target', accuracy: 'target' } as const)[unmeasuredKey])
    : undefined

  return (
    <div className="flex flex-col gap-4">
      {/* サマリー */}
      <section className="card flex items-center gap-4 p-5">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-grape to-bubble text-white shadow-lg">
          <div className="text-center leading-none">
            <p className="text-[10px] font-bold opacity-90">総合</p>
            <p className="mt-1 text-3xl font-extrabold">{overall ?? '—'}</p>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-2 text-center">
          <Summary label="プレイ回数" value={plays} unit="回" />
          <Summary label="プレイ日数" value={playDays.length} unit="日" />
          <Summary label="連続" value={streakOf(playDays)} unit="日" />
        </div>
      </section>

      {/* 能力値 */}
      <section className="card p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-extrabold">あなたの能力値</h2>
          <span className="text-[11px] font-bold text-ink-soft">直近のプレイから計算</span>
        </div>
        <div className="grid items-center gap-4 sm:grid-cols-[260px_1fr]">
          <div className="flex justify-center">
            <RadarChart axes={STAT_KEYS.map((k) => ({ label: STAT_LABELS[k], value: abilities[k].value, color: STAT_COLORS[k] }))} />
          </div>
          <div className="flex flex-col gap-4">
            {STAT_KEYS.map((k) => (
              <StatBar
                key={k}
                label={STAT_LABELS[k]}
                value={abilities[k].value}
                delta={abilities[k].delta}
                count={abilities[k].count}
                color={STAT_COLORS[k]}
                hint={STAT_HINTS[k]}
              />
            ))}
          </div>
        </div>
        {unmeasuredGame && (
          <Link
            to={unmeasuredGame.to}
            className="mt-4 flex items-center gap-3 rounded-2xl bg-cloud px-4 py-3 text-sm font-bold transition active:scale-[0.98]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: unmeasuredGame.color }}>
              <Icon name={unmeasuredGame.icon} size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block">「{STAT_LABELS[unmeasuredKey!]}」を測ろう</span>
              <span className="block text-xs text-ink-soft">{unmeasuredGame.title}で計測できます</span>
            </span>
            <Icon name="play" size={14} className="text-grape" />
          </Link>
        )}
      </section>

      {/* 自己ベスト */}
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-extrabold">自己ベスト</h2>
          <Link to="/ranking" className="text-xs font-bold text-grape">
            ランキングを見る ›
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {GAMES.map((g) => {
            const best = g.id !== 'monitor' ? records[g.id][0] : undefined
            return (
              <Link key={g.id} to={`/ranking?game=${g.id}`} className="rounded-2xl bg-cloud px-2 py-3 text-center">
                <span className="mx-auto mb-1 grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: g.color }}>
                  <Icon name={g.icon} size={16} />
                </span>
                <p className="truncate text-[11px] font-bold text-ink-soft">{g.title}</p>
                <p className="text-xl font-extrabold" style={{ color: best ? g.color : '#9a94b8' }}>
                  {best?.score ?? '—'}
                </p>
              </Link>
            )
          })}
        </div>
      </section>

      {/* 設定 */}
      <section className="card p-5">
        <h2 className="mb-1 font-extrabold">声の高さ</h2>
        <p className="mb-3 text-xs text-ink-soft">ゲームで出題される音の高さの範囲です</p>
        <div className="grid grid-cols-2 gap-2">
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
      </section>

      <div className="flex flex-col items-center gap-2 pb-2 text-center text-xs text-ink-soft">
        <p>成績はこの端末のブラウザにだけ保存されます</p>
        {plays > 0 && (
          <button
            className="underline"
            onClick={() => {
              if (window.confirm('能力値とプレイ記録をリセットしますか？（ランキングは残ります）')) resetStats()
            }}
          >
            能力値をリセット
          </button>
        )}
        <p className="text-ink-soft/70">ver. {formatVersion(APP_VERSION)}</p>
      </div>
    </div>
  )
}

function Summary({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-2xl bg-cloud px-1 py-2">
      <p className="text-[10px] font-bold text-ink-soft">{label}</p>
      <p className="text-xl font-extrabold leading-tight">
        {value}
        <span className="ml-0.5 text-[10px] text-ink-soft">{unit}</span>
      </p>
    </div>
  )
}
