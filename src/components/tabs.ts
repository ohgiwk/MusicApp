import type { IconName } from './Icon'

/** 画面下部のタブ (この画面ではタブを表示し、BGM を流す) */
export const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'ホーム', icon: 'home' },
  { to: '/ranking', label: 'ランキング', icon: 'trophy' },
  { to: '/mypage', label: 'マイページ', icon: 'user' },
]
