import type { IconName } from '../components/Icon'

export interface GameMeta {
  id: 'target' | 'flight' | 'melody' | 'monitor'
  to: string
  icon: IconName
  title: string
  description: string
  color: string
}

export const GAMES: GameMeta[] = [
  { id: 'target', to: '/target', icon: 'target', title: 'ピッチターゲット', description: '狙った音を声で当てよう', color: '#ff5fa2' },
  { id: 'flight', to: '/flight', icon: 'rocket', title: 'ボイスフライト', description: '声の高さで飛んでみよう', color: '#22b8e8' },
  { id: 'melody', to: '/melody', icon: 'music', title: 'メロディコピー', description: '聞いたメロディを歌い返そう', color: '#ffb020' },
]

export const MONITOR: GameMeta = {
  id: 'monitor', to: '/monitor', icon: 'wave', title: 'ピッチモニター', description: 'マイクと声の高さをチェック', color: '#7c5cff',
}
