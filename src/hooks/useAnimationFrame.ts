import { useEffect, useEffectEvent } from 'react'

/** 毎フレーム callback(dtMs, nowMs) を呼ぶ。callback は常に最新のものが使われる */
export function useAnimationFrame(callback: (dt: number, now: number) => void, active = true) {
  const onTick = useEffectEvent(callback)

  useEffect(() => {
    if (!active) return
    let id = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now
      onTick(dt, now)
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [active])
}
