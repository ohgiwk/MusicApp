import type { ComponentType } from 'react'
import type { GameId } from '../games/meta'
import { DistancePage } from './ear/DistancePage'
import { HighLowPage } from './ear/HighLowPage'
import { MemoryPage } from './ear/MemoryPage'
import { MelodyCopyPage } from './MelodyCopyPage'
import { PitchMonitorPage } from './PitchMonitorPage'
import { PitchTargetPage } from './PitchTargetPage'
import { VoiceFlightPage } from './VoiceFlightPage'

/** ゲームの画面 (パスは games/meta.ts の to を使う)。ゲームを追加して足し忘れると型エラーになる */
export const GAME_PAGES: Record<GameId | 'monitor', ComponentType> = {
  target: PitchTargetPage,
  flight: VoiceFlightPage,
  melody: MelodyCopyPage,
  highlow: HighLowPage,
  distance: DistancePage,
  memory: MemoryPage,
  monitor: PitchMonitorPage,
}
