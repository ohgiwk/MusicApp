import { useEffect, useRef, useState } from 'react'
import { APP_VERSION, fetchLatestVersion, reloadToLatest } from '../update/versionCheck'

const CHECK_INTERVAL_MS = 5 * 60 * 1000

/**
 * 公開中のアプリより新しいバージョンがデプロイされたかを確認する。
 * 定期チェックに加え、タブに戻ってきた時にも確認する。開発サーバーでは動かさない。
 */
export function useAppUpdate({ enabled = import.meta.env.PROD } = {}) {
  const [latest, setLatest] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<string | null>(null)
  const checking = useRef(false)

  useEffect(() => {
    if (!enabled) return
    const check = () => {
      if (checking.current) return
      checking.current = true
      void fetchLatestVersion().then((v) => {
        checking.current = false
        if (v && v !== APP_VERSION) setLatest(v)
      })
    }
    check()
    const id = window.setInterval(check, CHECK_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [enabled])

  // 開発時に通知の見た目を確認するためのスイッチ (例: http://localhost:5173/?preview-update)
  const preview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('preview-update')

  return {
    /** 通知を出すべきか ("あとで" を押したバージョンは再通知しない) */
    available: preview ? dismissed === null : latest !== null && latest !== dismissed,
    latest,
    update: reloadToLatest,
    dismiss: () => setDismissed(latest ?? 'preview'),
  }
}
