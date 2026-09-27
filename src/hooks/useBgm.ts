import { useEffect, useState } from 'react'
import { isAudioUnlocked, onAudioUnlocked } from '../audio/audioUnlock'
import { bgm } from '../audio/bgm'
import { useSettingsStore } from '../store/settingsStore'

/**
 * active の間だけ BGM を流す (メニュー画面用)。
 * 設定でオフのとき・アプリが裏に回ったとき・ゲーム画面 (マイク判定中) では止める。
 */
export function useBgm(active: boolean) {
  const enabled = useSettingsStore((s) => s.bgmEnabled)
  const volume = useSettingsStore((s) => s.bgmVolume)
  // ブラウザの自動再生制限: 最初のタップ等で音が解禁されるまで待つ
  const [ready, setReady] = useState(isAudioUnlocked)
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible')

  useEffect(() => {
    if (ready) return
    return onAudioUnlocked(() => setReady(true))
  }, [ready])

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const shouldPlay = active && enabled && ready && visible && volume > 0

  useEffect(() => {
    if (shouldPlay) bgm.start()
    else bgm.stop(active ? 0.4 : 0.6)
  }, [shouldPlay, active])

  useEffect(() => {
    bgm.setVolume(volume)
  }, [volume])
}
