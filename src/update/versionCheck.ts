export const APP_VERSION = __APP_VERSION__

const VERSION_URL = `${import.meta.env.BASE_URL}version.json`

/** サーバー上の最新バージョンを取得する。取得できなければ null */
export async function fetchLatestVersion(): Promise<string | null> {
  try {
    // ブラウザ/CDN のキャッシュを避ける
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data: unknown = await res.json()
    return typeof data === 'object' && data !== null && typeof (data as { version?: unknown }).version === 'string'
      ? (data as { version: string }).version
      : null
  } catch {
    return null
  }
}

/**
 * 新しいバージョンを読み込み直す。
 * GitHub Pages は index.html を一定時間キャッシュさせるため、先にキャッシュを更新してからリロードする。
 */
export async function reloadToLatest() {
  try {
    await fetch(window.location.href, { cache: 'reload' })
  } catch {
    // 取得に失敗してもリロードは行う
  }
  window.location.reload()
}

export function formatVersion(v: string) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
