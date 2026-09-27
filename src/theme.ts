/**
 * アプリの色 (SVG・Canvas・インラインスタイル用)。
 * index.css の @theme と同じ値にすること (theme.test.ts で一致を確認している)。
 * Tailwind のクラスで書ける所はクラス (text-grape など) を使う。
 */
export const COLORS = {
  ink: '#2a2350',
  inkSoft: '#6b6590',
  grape: '#7c5cff',
  bubble: '#ff5fa2',
  sky: '#22b8e8',
  sun: '#ffb020',
  mint: '#22c98c',
  cloud: '#f6f3ff',
  /** 無効・未計測の文字色 */
  muted: '#9a94b8',
  /** 無効・未計測の図形 */
  faint: '#c9c3e0',
  /** ゲージの下地 */
  track: '#ece7fb',
} as const
