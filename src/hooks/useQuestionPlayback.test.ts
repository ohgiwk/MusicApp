// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** 再生を手動で終わらせられる偽物の playQuestion */
const calls = vi.hoisted(() => [] as { midis: number[]; finish: () => void; cancel: ReturnType<typeof vi.fn> }[])
vi.mock('../games/ear/common', () => ({
  playQuestion: (midis: number[]) => {
    let resolve: (v: boolean) => void = () => {}
    const done = new Promise<boolean>((r) => (resolve = r))
    const cancel = vi.fn(() => resolve(false))
    calls.push({ midis, finish: () => resolve(true), cancel })
    return { done, cancel }
  },
}))

const { useQuestionPlayback } = await import('./useQuestionPlayback')

describe('useQuestionPlayback', () => {
  beforeEach(() => {
    calls.length = 0
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('最後まで鳴ったら true', async () => {
    const { result } = renderHook(() => useQuestionPlayback())
    let p!: Promise<boolean>
    act(() => {
      p = result.current.play([60, 64], 0.5)
    })
    calls[0].finish()
    await expect(p).resolves.toBe(true)
  })

  it('次を鳴らすと前の再生は止まり、前の play は false になる', async () => {
    const { result } = renderHook(() => useQuestionPlayback())
    let first!: Promise<boolean>
    act(() => {
      first = result.current.play([60, 64], 0.5)
    })
    act(() => {
      void result.current.play([62, 65], 0.5)
    })
    expect(calls[0].cancel).toHaveBeenCalled()
    await expect(first).resolves.toBe(false)
  })

  it('遅らせて鳴らす予定の間に止めると、鳴らさずに false', async () => {
    const { result } = renderHook(() => useQuestionPlayback())
    let p!: Promise<boolean>
    act(() => {
      p = result.current.play([60, 64], 0.5, 250)
    })
    act(() => result.current.stop())
    vi.advanceTimersByTime(500)
    expect(calls).toHaveLength(0)
    await expect(p).resolves.toBe(false)
  })

  it('画面を離れる (アンマウント) と再生を止める', () => {
    const { result, unmount } = renderHook(() => useQuestionPlayback())
    act(() => {
      void result.current.play([60, 64], 0.5)
    })
    unmount()
    expect(calls[0].cancel).toHaveBeenCalled()
  })
})
