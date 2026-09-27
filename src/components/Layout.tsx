import { Link, Outlet, useLocation } from 'react-router'
import { Icon } from './Icon'
import { TABS, TabBar } from './TabBar'
import { UpdateNotice } from './UpdateNotice'

const TITLES: Record<string, string> = {
  '/monitor': 'ピッチモニター',
  '/target': 'ピッチターゲット',
  '/flight': 'ボイスフライト',
  '/melody': 'メロディコピー',
  '/ranking': 'ランキング',
  '/mypage': 'マイページ',
}

export function Layout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  // タブ画面 (ホーム/ランキング/マイページ) では下部タブを出し、ゲーム中は隠して戻るボタンにする
  const isTab = TABS.some((t) => t.to === pathname)

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
    </div>
  )
}
