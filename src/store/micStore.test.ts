import { beforeEach, describe, expect, it, vi } from 'vitest'

const engine = vi.hoisted(() => ({
  start: vi.fn<() => Promise<void>>(),
  stop: vi.fn(),
}))
vi.mock('../audio/audioEngine', async (orig) => ({
  ...(await orig<typeof import('../audio/audioEngine')>()),
  startMicrophone: engine.start,
  stopMicrophone: engine.stop,
}))

const { useMicStore } = await import('./micStore')
const { MicError } = await import('../audio/audioEngine')

describe('マイクの状態', () => {
  beforeEach(() => {
    engine.start.mockReset().mockResolvedValue(undefined)
    engine.stop.mockReset()
    useMicStore.setState({ status: 'idle', errorMessage: null, granted: false, wanted: false })
  })

  it('有効にすると ready になり、許可済みとして覚える', async () => {
    await useMicStore.getState().enable()
    expect(useMicStore.getState()).toMatchObject({ status: 'ready', granted: true })
  })

  it('マイクを使わない画面に移ったら止める (許可済みの記録は残す)', async () => {
    await useMicStore.getState().enable()
    useMicStore.getState().disable()
    expect(engine.stop).toHaveBeenCalledTimes(1)
    expect(useMicStore.getState()).toMatchObject({ status: 'idle', granted: true })
  })

  it('起動を待っている間に画面を離れたら、起動後すぐに止める', async () => {
    let resolve: () => void = () => {}
    engine.start.mockReturnValue(new Promise<void>((r) => (resolve = r)))
    const p = useMicStore.getState().enable()
    useMicStore.getState().disable()
    resolve()
    await p
    expect(engine.stop).toHaveBeenCalledTimes(1)
    expect(useMicStore.getState().status).toBe('idle')
  })

  it('拒否されたらエラー状態にし、許可済みにはしない', async () => {
    engine.start.mockRejectedValue(new MicError('denied', 'マイクの使用が許可されませんでした'))
    await useMicStore.getState().enable()
    expect(useMicStore.getState()).toMatchObject({ status: 'denied', granted: false })
  })

  it('使っていないときの disable は何もしない', () => {
    useMicStore.getState().disable()
    expect(engine.stop).not.toHaveBeenCalled()
  })
})
