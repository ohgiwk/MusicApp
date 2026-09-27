import { describe, expect, it } from 'vitest'
import { SingRecorder } from './recorder'

describe('SingRecorder', () => {
  it('経過時間に合わせて今歌う音を進め、最後の音を過ぎても最後の音のまま', () => {
    const r = new SingRecorder(3, 800, 1000)
    expect(r.push(60, 1000)?.activeNote).toBe(0)
    expect(r.push(62, 1000 + 850)?.activeNote).toBe(1)
    expect(r.push(64, 1000 + 1700)?.activeNote).toBe(2)
    expect(r.push(64, 1000 + 2500)?.activeNote).toBe(2)
  })

  it('全音 + 30% の余裕が過ぎたら1回だけ終了を知らせ、その後は記録しない', () => {
    const r = new SingRecorder(3, 800, 0)
    expect(r.push(60, 2640)?.finished).toBe(false)
    expect(r.push(60, 2641)?.finished).toBe(true)
    expect(r.push(60, 3000)).toBeNull()
    expect(r.samples).toHaveLength(2)
    expect(r.samples[1]).toEqual({ t: 2641, midi: 60 })
  })
})
