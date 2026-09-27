import { NavLink } from 'react-router'
import { Icon } from './Icon'
import { TABS } from './tabs'

/** 画面下部のタブ切り替え */
export function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/70 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <ul className="mx-auto grid max-w-3xl grid-cols-3">
        {TABS.map((t) => (
          <li key={t.to}>
            <NavLink
              to={t.to}
              end
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[11px] font-extrabold transition active:scale-95 ${
                  isActive ? 'text-grape' : 'text-ink-soft/70'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`grid h-8 w-12 place-items-center rounded-full transition ${isActive ? 'bg-grape/12' : ''}`}
                  >
                    <Icon name={t.icon} size={22} strokeWidth={isActive ? 2.6 : 2.2} />
                  </span>
                  {t.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
