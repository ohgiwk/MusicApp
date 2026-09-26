import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ビルドごとに一意なバージョン。アプリに埋め込み、同じ値を version.json として出力する。
// 公開中のアプリは version.json を定期的に取得し、値が変わっていたら更新通知を出す。
const APP_VERSION = new Date().toISOString()

function versionJson(): Plugin {
  return {
    name: 'version-json',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: APP_VERSION }) })
    },
  }
}

// GitHub Pages (https://ohgiwk.github.io/MusicApp/) はサブパス配信のため、
// 本番ビルドだけ base を /MusicApp/ にする
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/MusicApp/' : '/',
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  plugins: [react(), tailwindcss(), versionJson()],
  server: { host: true },
}))
