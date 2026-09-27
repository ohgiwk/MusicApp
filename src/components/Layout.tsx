import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { isAudioUnlocked } from '../audio/audioUnlock'
import { useBgm } from '../hooks/useBgm'
import { Icon } from './Icon'
import { TabBar } from './TabBar'
import { TABS } from './tabs'
import { StartScreen } from './StartScreen'
import { UpdateNotice } from './UpdateNotice'
import { useSettingsStore } from '../store/settingsStore'

const TITLES: Record<string, string> = {
  '/monitor': 'ピッチモニター',
  '/target': 'ピッチターゲット',
  '/flight': 'ボイスフライト',
  '/melody': 'メロディコピー',
  '/ear/highlow': 'HIGH or LOW',
  '/ear/distance': 'PITCH DISTANCE',
  '/ear/memory': 'MELODY MEMORY',
  '/ranking': 'ランキング',
  '/mypage': 'マイページ',
}

export function Layout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  // タブ画面 (ホーム/ランキング/マイページ) では下部タブを出し、ゲーム中は隠して戻るボタンにする
  const isTab = TABS.some((t) => t.to === pathname)
  // BGM はメニュー (タブ画面) だけ。ゲーム画面ではマイクが拾わないよう止める
  useBgm(isTab)
  // 起動時 (メニュー画面を開いたとき) だけスタート画面を出し、そのタップで BGM を鳴らす。
  // BGM オフの人や、ゲーム画面を直接開いたときは出さない
  const bgmEnabled = useSettingsStore((s) => s.bgmEnabled)
  const [showStart, setShowStart] = useState(() => isTab && bgmEnabled && !isAudioUnlocked())

  return (
    <div
      className={`mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pt-[max(env(safe-area-inset-top),12px)] ${
        isTab ? 'pb-[calc(84px+env(safe-area-inset-bottom))]' : 'pb-8'
      }`}
    >
      {!isHome &&
        (isTab ? (
          <header className="mb-4 pt-2">
            <h1 className="text-2xl font-extrabold">{TITLES[pathname]}</h1>
          </header>
        ) : (
          <header className="mb-3 flex items-center gap-3">
            <Link to="/" className="btn-soft !px-3 !py-2" aria-label="ホームへ戻る">
              <Icon name="back" size={20} />
            </Link>
            <h1 className="text-lg font-extrabold">{TITLES[pathname] ?? ''}</h1>
          </header>
        ))}
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      {isTab && <TabBar />}
      <UpdateNotice aboveTabBar={isTab} />
      {showStart && <StartScreen onStart={() => setShowStart(false)} />}
    </div>
  )
}
