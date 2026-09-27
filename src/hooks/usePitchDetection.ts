import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { getAnalyser } from '../audio/audioEngine'
import { createPitchDetector, type PitchDetector } from '../audio/pitchDetector'
import { PitchSmoother, type SmootherOptions } from '../audio/pitchSmoother'
import { freqToMidi, midiToFreq, noteFromFreq, type NoteInfo } from '../audio/pitchUtils'
import { useMicStore } from '../store/micStore'
import { useSettingsStore } from '../store/settingsStore'

export interface PitchFrame {
  time: number
  /** 平滑化後の値が存在するか (= 声として扱うか) */
  voiced: boolean
  /** 平滑化後の周波数 */
  freq: number | null
  /** 平滑化後の MIDI 連続値 */
  midi: number | null
  note: NoteInfo | null
  /** 今フレームの生推定値 (信頼度を満たした場合のみ) */
  rawMidi: number | null
  clarity: number
  rms: number
}

const EMPTY: PitchFrame = {
  time: 0,
  voiced: false,
  freq: null,
  midi: null,
  note: null,
  rawMidi: null,
  clarity: 0,
  rms: 0,
}

export const MIN_CLARITY = 0.8

interface Options {
  enabled?: boolean
  /** false にすると React state を更新しない (Canvas ゲームなどで ref / onFrame だけ使う) */
  reactive?: boolean
  onFrame?: (frame: PitchFrame) => void
  smoothing?: SmootherOptions
}

/**
 * マイク入力を毎フレーム解析して音程を返す。
 * 音量しきい値 → YIN 信頼度 → 異常値除外 + 平滑化 の順でノイズを落とす。
 */
export function usePitchDetection({ enabled = true, reactive = true, onFrame, smoothing }: Options = {}) {
  const micReady = useMicStore((s) => s.status === 'ready')
  const noiseGate = useSettingsStore((s) => s.noiseGate)
  const [frame, setFrame] = useState<PitchFrame>(EMPTY)
  const frameRef = useRef<PitchFrame>(EMPTY)
  // 毎フレームの処理から最新の props / 設定を読む (解析ループを作り直さずに済む)
  const emitFrame = useEffectEvent((f: PitchFrame) => onFrame?.(f))
  const currentGate = useEffectEvent(() => noiseGate)
  const smoothingRef = useRef(smoothing)

  useEffect(() => {
    if (!enabled || !micReady) return
    const analyser = getAnalyser()
    if (!analyser) return

    const buf = new Float32Array(analyser.fftSize)
    const detector: PitchDetector = createPitchDetector({
      sampleRate: analyser.context.sampleRate,
      bufferSize: analyser.fftSize,
    })
    const smoother = new PitchSmoother(smoothingRef.current)
    let id = 0

    const tick = () => {
      analyser.getFloatTimeDomainData(buf)
      const now = performance.now()
      const est = detector.detect(buf, currentGate())
      const ok = est.freq !== null && est.clarity >= MIN_CLARITY
      const rawMidi = ok ? freqToMidi(est.freq!) : null
      const midi = smoother.push(rawMidi, now)
      const freq = midi !== null ? midiToFreq(midi) : null
      const f: PitchFrame = {
        time: now,
        voiced: midi !== null,
        freq,
        midi,
        note: freq !== null ? noteFromFreq(freq) : null,
        rawMidi,
        clarity: est.clarity,
        rms: est.rms,
      }
      frameRef.current = f
      emitFrame(f)
      if (reactive) setFrame(f)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(id)
      frameRef.current = EMPTY
    }
  }, [enabled, micReady, reactive])

  return { frame, frameRef }
}
