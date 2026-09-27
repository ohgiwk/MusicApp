import { Link, Outlet, useLocation } from 'react-router'
import { Icon } from './Icon'
import { UpdateNotice } from './UpdateNotice'

const TITLES: Record<string, string> = {
  '/monitor': 'ピッチモニター',
  '/target': 'ピッチターゲット',
  '/flight': 'ボイスフライト',
  '/melody': 'メロディコピー',
  '/ranking': 'ランキング',
}

export function Layout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-8 pt-[max(env(safe-area-inset-top),12px)]">
      {!isHome && (
        <header className="mb-3 flex items-center gap-3">
          <Link to="/" className="btn-soft !px-3 !py-2" aria-label="ホームへ戻る">
            <Icon name="back" size={20} />
          </Link>
          <h1 className="text-lg font-extrabold">{TITLES[pathname] ?? ''}</h1>
        </header>
      )}
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <UpdateNotice />
    </div>
  )
}
