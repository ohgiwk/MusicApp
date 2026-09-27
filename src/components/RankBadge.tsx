import { Link } from 'react-router'
import type { RankResult, RankedGameId } from '../store/scoreStore'
import { Icon } from './Icon'

/** リザルト画面に出す「自己ベスト更新！」「ランキング 3位」表示 */
export function RankBadge({ result, game }: { result: RankResult | null; game: RankedGameId }) {
  if (!result) return null
  const { rank, isBest } = result
  return (
    <Link
      to={`/ranking?game=${game}`}
      className={`animate-pop mx-auto flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-sm font-extrabold ${
        isBest ? 'bg-sun text-white shadow-[0_4px_12px_-4px_#ffb020]' : rank ? 'bg-grape/10 text-grape' : 'bg-cloud text-ink-soft'
      }`}
    >
      <Icon name="trophy" size={16} />
      {isBest ? '自己ベスト更新！' : rank ? `ランキング ${rank}位` : 'ランキング圏外'}
      <span className="text-xs font-bold opacity-80">ランキングを見る ›</span>
    </Link>
  )
}
