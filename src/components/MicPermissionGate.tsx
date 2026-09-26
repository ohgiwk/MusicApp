import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useMicrophone } from '../hooks/useMicrophone'
import { Icon } from './Icon'

/**
 * マイクが有効になるまで説明画面を出す。
 * ボタンを押すまで getUserMedia は呼ばない。
 */
export function MicPermissionGate({ children }: { children: ReactNode }) {
  const { status, errorMessage, enable } = useMicrophone()
  if (status === 'ready') return <>{children}</>

  const failed = status === 'denied' || status === 'unsupported' || status === 'notfound' || status === 'error'

  return (
    <div className="card mx-auto mt-4 flex w-full max-w-md flex-col items-center gap-5 p-6 text-center sm:p-8">
      <div className="relative grid h-24 w-24 place-items-center">
        {!failed && <span className="absolute inset-0 rounded-full bg-grape/30 animate-pulse-ring" />}
        <span className={`relative grid h-20 w-20 place-items-center rounded-full text-white ${failed ? 'bg-bubble' : 'bg-grape'}`}>
          <Icon name="mic" size={40} />
        </span>
      </div>

      {!failed ? (
        <>
          <h2 className="text-xl font-extrabold">マイクを使って遊ぼう</h2>
          <p className="leading-relaxed text-ink-soft">
            このアプリでは、あなたの声の音程を判定するためにマイクを使用します。
            <br />
            音声は端末の中だけで解析され、録音や送信はしません。
          </p>
          <p className="rounded-2xl bg-cloud px-4 py-2 text-sm text-ink-soft">
            静かな場所で、できればイヤホンを使うと判定が安定します
          </p>
          <button className="btn-primary w-full text-lg" onClick={() => void enable()} disabled={status === 'requesting'}>
            <Icon name="mic" size={20} />
            {status === 'requesting' ? '許可を待っています…' : 'マイクを有効にする'}
          </button>
        </>
      ) : (
        <>
          <h2 className="text-xl font-extrabold">マイクが使えませんでした</h2>
          <p className="text-ink-soft">{errorMessage}</p>
          {status === 'denied' && (
            <p className="rounded-2xl bg-cloud px-4 py-3 text-left text-sm leading-relaxed text-ink-soft">
              アドレスバーの鍵アイコン（またはサイト設定）からマイクを「許可」に変更して、もう一度お試しください。
            </p>
          )}
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button className="btn-primary flex-1" onClick={() => void enable()}>
              <Icon name="retry" size={18} />
              もう一度試す
            </button>
            <Link to="/" className="btn-soft flex-1">
              ホームへ
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
