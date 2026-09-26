import { useState } from 'react'
import { useAppUpdate } from '../hooks/useAppUpdate'
import { Icon } from './Icon'

/** 新しいバージョンがあるときに画面下に出す通知。更新はユーザーが押したときだけ行う */
export function UpdateNotice() {
  const { available, update, dismiss } = useAppUpdate()
  const [updating, setUpdating] = useState(false)
  if (!available) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),16px)]"
    >
      <div className="card animate-pop flex w-full max-w-md items-center gap-3 !bg-white p-3 pl-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint text-white">
          <Icon name="retry" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">新しいバージョンがあります</p>
          <p className="text-xs text-ink-soft">更新するとページを読み込み直します</p>
        </div>
        <button className="shrink-0 px-2 text-sm font-bold text-ink-soft" onClick={dismiss}>
          あとで
        </button>
        <button
          className="btn-primary shrink-0 !px-4 !py-2 text-sm"
          disabled={updating}
          onClick={() => {
            setUpdating(true)
            void update()
          }}
        >
          {updating ? '更新中…' : '更新'}
        </button>
      </div>
    </div>
  )
}
