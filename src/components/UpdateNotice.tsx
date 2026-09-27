import { useState } from 'react'
import { useAppUpdate } from '../hooks/useAppUpdate'
import { Icon } from './Icon'

/** 新しいバージョンがあるときに画面下に出す通知。更新はユーザーが押したときだけ行う */
export function UpdateNotice({ aboveTabBar = false }: { aboveTabBar?: boolean }) {
  const { available, update, dismiss } = useAppUpdate()
  const [updating, setUpdating] = useState(false)
  if (!available) return null

  return (
    <div
      role="status"
      className={`fixed inset-x-0 z-40 flex justify-center px-4 ${
        aboveTabBar ? 'bottom-[calc(64px+env(safe-area-inset-bottom))] pb-3' : 'bottom-0 pb-[max(env(safe-area-inset-bottom),16px)]'
      }`}
    >
      {/* スマホ幅では 文言 / ボタン の2段、広い画面では1行 (文言が途中で折り返さないように) */}
      <div className="card animate-pop flex w-full max-w-md flex-col gap-3 !bg-white p-4 sm:max-w-lg sm:flex-row sm:items-center sm:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint text-white">
            <Icon name="retry" size={20} />
          </span>
          <div className="min-w-0">
            <p className="whitespace-nowrap font-extrabold">新しいバージョンがあります</p>
            <p className="whitespace-nowrap text-xs text-ink-soft">更新するとページを読み込み直します</p>
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2">
          <button className="btn-soft !px-4 !py-2 text-sm" onClick={dismiss}>
            あとで
          </button>
          <button
            className="btn-primary !px-5 !py-2 text-sm"
            disabled={updating}
            onClick={() => {
              setUpdating(true)
              void update()
            }}
          >
            {updating ? '更新中…' : '今すぐ更新'}
          </button>
        </div>
      </div>
    </div>
  )
}
