import { useEffect, useState } from 'react'
import { bgm } from '../audio/bgm'
import { useSettingsStore } from '../store/settingsStore'

/**
 * ブラウザはユーザー操作があるまで音を出せないため、最初のタップ/キー入力を待つ。
 * (操作前に AudioContext を作ると警告が出るので、作成自体も操作後にする)
 */
let unlocked = false
const unlockListeners = new Set<() => void>()
function onFirstGesture() {
  if (unlocked) return
  unlocked = true
  window.removeEventListener('pointerdown', onFirstGesture, true)
  window.removeEventListener('keydown', onFirstGesture, true)
  unlockListeners.forEach((fn) => fn())
}
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', onFirstGesture, true)
  window.addEventListener('keydown', onFirstGesture, true)
}

/**
 * active の間だけ BGM を流す (メニュー画面用)。
 * 設定でオフのとき・アプリが裏に回ったとき・ゲーム画面 (マイク判定中) では止める。
 */
export function useBgm(active: boolean) {
  const enabled = useSettingsStore((s) => s.bgmEnabled)
  const volume = useSettingsStore((s) => s.bgmVolume)
  const [ready, setReady] = useState(unlocked)
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible')

  useEffect(() => {
    if (ready) return
    const fn = () => setReady(true)
    unlockListeners.add(fn)
    return () => void unlockListeners.delete(fn)
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
