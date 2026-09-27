import { useState } from 'react'
import { getAudioContext } from '../audio/audioEngine'
import { playChime } from '../audio/tonePlayer'
import { Icon } from './Icon'

/**
 * 起動時の「タップしてはじめる」画面。
 * ブラウザは操作前に音を鳴らせないため、このタップで音を解禁して BGM を流し始める。
 */
export function StartScreen({ onStart }: { onStart: () => void }) {
  const [leaving, setLeaving] = useState(false)

  const start = () => {
    if (leaving) return
    try {
      // タップ (ユーザー操作) の中で AudioContext を作成・再開する
      void getAudioContext().resume()
      playChime('success')
    } catch {
      // Web Audio 非対応でもアプリは使えるようにする
    }
    setLeaving(true)
    window.setTimeout(onStart, 350)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="タップしてはじめる"
      onClick={start}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') start()
      }}
      className={`fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center gap-6 bg-page px-6 text-center transition-opacity duration-300 ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{
        backgroundImage:
          'radial-gradient(circle at 0% 30%, #ffe3f1 0, transparent 45%), radial-gradient(circle at 100% 70%, #dff6ff 0, transparent 50%)',
      }}
    >
      <div className="relative">
        <span className="absolute inset-0 rounded-[2rem] bg-grape/25 animate-pulse-ring" />
        <div className="animate-float relative grid h-28 w-28 place-items-center rounded-[2rem] bg-gradient-to-br from-grape to-bubble text-white shadow-xl">
          <Icon name="mic" size={60} />
        </div>
      </div>
      <div>
        <h1 className="text-shine text-5xl font-extrabold tracking-wide">こえあそび</h1>
        <p className="mt-2 font-bold text-ink-soft">声で遊ぶ音程トレーニング</p>
      </div>
      <div className="mt-6 flex flex-col items-center gap-2">
        <span className="btn-primary animate-float px-10 text-lg">
          <Icon name="play" size={18} /> タップしてはじめる
        </span>
        <span className="flex items-center gap-1 text-xs font-bold text-ink-soft">
          <Icon name="speaker" size={14} /> 音が出ます
        </span>
      </div>
    </div>
  )
}
