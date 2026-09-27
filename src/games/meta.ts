import type { IconName } from '../components/Icon'
import { COLORS } from '../theme'

/**
 * ゲームの ID の一覧 (ここが唯一の定義)。
 * ゲームを追加するときは ここ + GAMES の情報 + router.tsx の PAGES + difficulty.ts のレベル を足す。
 * (PAGES とレベルは Record<GameId, ...> なので、足し忘れると型エラーになる)
 */
export const GAME_IDS = ['target', 'flight', 'melody', 'highlow', 'distance', 'memory'] as const
export type GameId = (typeof GAME_IDS)[number]

/** 鍛える能力 (ホームの分類) */
export type Skill = 'listen' | 'voice' | 'melody'

export const SKILLS: { id: Skill; emoji: string; label: string }[] = [
  { id: 'listen', emoji: '👂', label: '聴く' },
  { id: 'voice', emoji: '🎤', label: '声を出す' },
  { id: 'melody', emoji: '🎵', label: 'メロディ' },
]

export interface GameMeta {
  id: GameId | 'monitor'
  to: string
  icon: IconName
  title: string
  /** 狭い場所で使う短い名前 */
  shortTitle: string
  description: string
  color: string
  /** ear: 耳トレ (マイク不要) / voice: 声を使う */
  category: 'ear' | 'voice'
  skill: Skill
  /** 耳トレのステップ (音の高低 → 音程の距離 → メロディ) */
  step?: number
}

/** 耳トレ: マイク不要。音の高低 → 音程の距離 → メロディ の順にステップアップ */
export const EAR_GAMES: GameMeta[] = [
  {
    id: 'highlow',
    to: '/ear/highlow',
    icon: 'updown',
    title: 'HIGH or LOW',
    shortTitle: 'HIGH/LOW',
    description: 'どっちが高い？',
    color: '#14b8a6',
    category: 'ear',
    skill: 'listen',
    step: 1,
  },
  {
    id: 'distance',
    to: '/ear/distance',
    icon: 'distance',
    title: 'PITCH DISTANCE',
    shortTitle: 'DISTANCE',
    description: 'どこまで動いた？',
    color: '#6366f1',
    category: 'ear',
    skill: 'listen',
    step: 2,
  },
  {
    id: 'memory',
    to: '/ear/memory',
    icon: 'memory',
    title: 'MELODY MEMORY',
    shortTitle: 'MEMORY',
    description: 'メロディを覚えろ！',
    color: '#f97316',
    category: 'ear',
    skill: 'melody',
    step: 3,
  },
]

/** 声を使うゲーム (マイクで音程を判定) */
export const VOICE_GAMES: GameMeta[] = [
  {
    id: 'target',
    to: '/target',
    icon: 'target',
    title: 'ピッチターゲット',
    shortTitle: 'ターゲット',
    description: '狙った音を声で当てよう',
    color: COLORS.bubble,
    category: 'voice',
    skill: 'voice',
  },
  {
    id: 'flight',
    to: '/flight',
    icon: 'rocket',
    title: 'ボイスフライト',
    shortTitle: 'フライト',
    description: '声の高さで飛んでみよう',
    color: COLORS.sky,
    category: 'voice',
    skill: 'voice',
  },
  {
    id: 'melody',
    to: '/melody',
    icon: 'music',
    title: 'メロディコピー',
    shortTitle: 'メロディ',
    description: '聞いたメロディを歌い返そう',
    color: COLORS.sun,
    category: 'voice',
    skill: 'melody',
  },
]

/** スコアを記録する全ゲーム */
export const GAMES: GameMeta[] = [...VOICE_GAMES, ...EAR_GAMES]

export const MONITOR: GameMeta = {
  id: 'monitor',
  to: '/monitor',
  icon: 'wave',
  title: 'ピッチモニター',
  shortTitle: 'モニター',
  description: 'マイクと声の高さをチェック',
  color: COLORS.grape,
  category: 'voice',
  skill: 'voice',
}

export function gameMeta(id: GameId): GameMeta {
  return GAMES.find((g) => g.id === id)!
}

/** スコアの単位 */
export function scoreUnit(id: GameId) {
  return id === 'flight' ? 'pt' : '点'
}
