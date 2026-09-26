import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages (https://ohgiwk.github.io/MusicApp/) はサブパス配信のため、
// 本番ビルドだけ base を /MusicApp/ にする
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/MusicApp/' : '/',
  plugins: [react(), tailwindcss()],
  server: { host: true },
}))
