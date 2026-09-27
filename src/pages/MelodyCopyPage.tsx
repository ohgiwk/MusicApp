import { useCallback, useEffect, useRef, useState } from 'react'
import { playChime, playMelody, playNote, type MelodyHandle } from '../audio/tonePlayer'
import { Icon } from '../components/Icon'
import { MicPermissionGate } from '../components/MicPermissionGate'
import { generateMelody, scoreMelody, type MelodyScore, type PitchSample } from '../games/melodyCopy/scoring'
import { usePitchDetection, type PitchFrame } from '../hooks/usePitchDetection'
import { LevelChip, LevelSelect } from '../components/LevelSelect'
import { DIFFICULTY_LABELS, MELODY_LEVELS } from '../games/difficulty'
import { useDifficulty, useVoiceRange } from '../store/settingsStore'
import { fromMelodyCopy } from '../games/abilityScoring'
import { useScoreStore, type RankResult } from '../store/scoreStore'
import { useStatsStore } from '../store/statsStore'
import { MelodyGraph } from '../components/melodyCopy/MelodyGraph'
import { MelodyResultPanel } from '../components/melodyCopy/MelodyResultPanel'
import { SingRecorder } from '../games/melodyCopy/recorder'

const COUNT_IN = 3

type Phase = 'ready' | 'listening' | 'waiting' | 'countin' | 'singing' | 'result'

export function MelodyCopyPage() {
  return (
    <MicPermissionGate>
      <MelodyCopyGame />
    </MicPermissionGate>
  )
}

function MelodyCopyGame() {
  const range = useVoiceRange()
  const difficulty = useDifficulty('melody')
  const cfg = MELODY_LEVELS[difficulty]
  /** 1音の長さ (難易度で変わる) */
  const NOTE_MS = cfg.noteMs
  const recordPlay = useStatsStore((s) => s.recordPlay)
  const addScore = useScoreStore((s) => s.addScore)
  const [rank, setRank] = useState<RankResult | null>(null)
  /** 今のメロディの音数。クリアすると増える */
  const [level, setLevel] = useState(cfg.startLength)
  const [melody, setMelody] = useState(() => generateMelody(cfg.startLength, range.min, range.max, cfg))
  const [phase, setPhase] = useState<Phase>('ready')
  const [activeNote, setActiveNote] = useState(-1)
  const [countIn, setCountIn] = useState(0)
  const [result, setResult] = useState<MelodyScore | null>(null)

  /** 歌声の記録 (歌っている間だけ) */
  const recorder = useRef<SingRecorder | null>(null)
  /** 画面表示用: 歌声の軌跡と、歌唱開始からの経過時間 (カーソル位置) */
  const [trace, setTrace] = useState<{ samples: PitchSample[]; t: number | null }>({ samples: [], t: null })
  const playback = useRef<MelodyHandle | null>(null)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(
    () => () => {
      clearTimers()
      playback.current?.cancel()
    },
    [],
  )

  // 難易度を変えたら最初の音数からやり直す
  const prevDifficulty = useRef(difficulty)
  useEffect(() => {
    if (prevDifficulty.current === difficulty) return
    prevDifficulty.current = difficulty
    const c = MELODY_LEVELS[difficulty]
    setLevel(c.startLength)
    setMelody(generateMelody(c.startLength, range.min, range.max, c))
    setResult(null)
    setRank(null)
    setPhase('ready')
  }, [difficulty, range.min, range.max])

  const listen = async () => {
    setResult(null)
    setPhase('listening')
    playback.current = playMelody(melody, NOTE_MS / 1000, setActiveNote)
    // 途中で止めた (画面を離れた等) ときは進めない
    if (await playback.current.done) setPhase('waiting')
  }

  const sing = () => {
    clearTimers()
    setResult(null)
    recorder.current = null
    setTrace({ samples: [], t: null })
    setPhase('countin')
    // メロディと同じテンポでカウントイン → 最初の音だけヒントで鳴らす
    for (let i = 0; i < COUNT_IN; i++) {
      timers.current.push(
        window.setTimeout(() => {
          setCountIn(COUNT_IN - i)
          playChime('tick')
        }, i * NOTE_MS),
      )
    }
    timers.current.push(
      window.setTimeout(() => {
        setCountIn(0)
        recorder.current = new SingRecorder(melody.length, NOTE_MS, performance.now())
        setPhase('singing')
      }, COUNT_IN * NOTE_MS),
    )
  }

  const finish = useCallback(() => {
    const r = scoreMelody(melody, recorder.current?.samples ?? [], NOTE_MS, cfg)
    setResult(r)
    setTrace((prev) => ({ ...prev, t: null }))
    setPhase('result')
    setActiveNote(-1)
    if (r.score >= 70) playChime('success')
    recordPlay('melody', fromMelodyCopy(r.score, r.avgAbsCents, melody.length))
    setRank(addScore('melody', difficulty, r.score, `${melody.length}音・${r.correct}/${melody.length} 正解`))
  }, [melody, recordPlay, addScore, NOTE_MS, cfg, difficulty])

  const onFrame = useCallback(
    (f: PitchFrame) => {
      if (phase !== 'singing' || !recorder.current) return
      const step = recorder.current.push(f.midi, f.time)
      if (!step) return
      setTrace({ samples: recorder.current.samples.slice(), t: step.t })
      setActiveNote(step.activeNote)
      if (step.finished) finish()
    },
    [phase, finish],
  )

  const { frame } = usePitchDetection({ onFrame, enabled: phase !== 'listening' })

  const nextMelody = (lv: number) => {
    clearTimers()
    setLevel(lv)
    setMelody(generateMelody(lv, range.min, range.max, cfg))
    setResult(null)
    setPhase('ready')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <LevelChip game="melody" />
          <span className="chip bg-sun text-sm text-white">{level}音</span>
        </span>
        <span className="text-sm font-bold text-ink-soft">
          {phase === 'ready' && 'まずはお手本を聞こう'}
          {phase === 'listening' && 'よく聞いてね…'}
          {phase === 'waiting' && '覚えたら「歌う」を押そう'}
          {phase === 'countin' && 'カウントのあとに歌ってね'}
          {phase === 'singing' && '歌って！'}
          {phase === 'result' && 'けっか'}
        </span>
      </div>

      <MelodyGraph
        melody={melody}
        activeNote={activeNote}
        showTargets={phase !== 'ready'}
        samples={phase === 'singing' || phase === 'result' ? trace.samples : []}
        cursorT={phase === 'singing' ? trace.t : null}
        liveMidi={phase === 'waiting' || phase === 'countin' || phase === 'singing' ? frame.midi : null}
        result={result}
        countIn={phase === 'countin' ? countIn : 0}
        noteMs={NOTE_MS}
        okCents={cfg.okCents}
      />

      {phase === 'ready' && (
        <div className="card flex justify-center p-4">
          <LevelSelect game="melody" />
        </div>
      )}

      {phase !== 'result' ? (
        <div className="flex gap-3">
          <button
            className="btn-soft flex-1 whitespace-nowrap !px-3"
            onClick={() => void listen()}
            disabled={phase === 'listening' || phase === 'countin' || phase === 'singing'}
          >
            <Icon name="speaker" size={20} /> {phase === 'ready' ? 'お手本を聞く' : 'もう一度聞く'}
          </button>
          <button
            className="btn-primary flex-1 whitespace-nowrap !px-3"
            onClick={sing}
            disabled={phase === 'ready' || phase === 'listening' || phase === 'countin' || phase === 'singing'}
          >
            <Icon name="mic" size={20} /> 歌う
          </button>
        </div>
      ) : (
        result && (
          <MelodyResultPanel
            result={result}
            onRetry={sing}
            onListen={() => void listen()}
            onNext={() => nextMelody(result.score >= 70 ? Math.min(cfg.maxLength, level + 1) : level)}
            levelUp={result.score >= 70 && level < cfg.maxLength}
            difficultyLabel={DIFFICULTY_LABELS[difficulty]}
            onChangeDifficulty={() => nextMelody(cfg.startLength)}
            rank={rank}
          />
        )
      )}
      <button className="self-center text-xs text-ink-soft underline" onClick={() => playNote(melody[0], 0.8)}>
        最初の音だけ聞く
      </button>
    </div>
  )
}
