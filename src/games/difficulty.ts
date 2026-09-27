/**
 * 各ミニゲームの難易度パラメータ。「ふつう」が元々の設定。
 * ランキングは難易度ごとに分けて記録する。
 */
export type Difficulty = 'easy' | 'normal' | 'hard'
export type DifficultyGameId = 'target' | 'flight' | 'melody'

export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'かんたん',
  normal: 'ふつう',
  hard: 'むずかしい',
}

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: '#22c98c',
  normal: '#7c5cff',
  hard: '#ff5fa2',
}

export interface TargetLevel {
  /** 正解範囲 (±cents) */
  hitRange: number
  /** 正解範囲をキープする時間 (ms) */
  holdMs: number
  /** 半音 (#) も出題する */
  sharps: boolean
  /** 音域の上下端から何半音内側だけを使うか (大きいほど出しやすい音) */
  rangeInset: number
  desc: string
}

export const TARGET_LEVELS: Record<Difficulty, TargetLevel> = {
  easy: {
    hitRange: 40,
    holdMs: 1000,
    sharps: false,
    rangeInset: 4,
    desc: '正解範囲 ±40 cents・1秒キープ・出しやすい音だけ',
  },
  normal: { hitRange: 25, holdMs: 1500, sharps: false, rangeInset: 2, desc: '正解範囲 ±25 cents・1.5秒キープ' },
  hard: { hitRange: 15, holdMs: 2000, sharps: true, rangeInset: 0, desc: '正解範囲 ±15 cents・2秒キープ・半音も出題' },
}

export interface FlightLevel {
  /** 画面の高さに割り当てる音域 (中心から ±半音) */
  halfWindow: number
  /** ゲートの隙間の半分 (半音)。開始時 → 終了時 */
  gapStart: number
  gapEnd: number
  speedMul: number
  /** ゲートの出現間隔 (ms)。開始時 → 終了時 */
  spawnStart: number
  spawnEnd: number
  /** 前のゲートからの最大移動 (半音) */
  maxStep: number
  sharps: boolean
  desc: string
}

export const FLIGHT_LEVELS: Record<Difficulty, FlightLevel> = {
  easy: {
    halfWindow: 5,
    gapStart: 1.7,
    gapEnd: 1.3,
    speedMul: 0.8,
    spawnStart: 2600,
    spawnEnd: 2200,
    maxStep: 3,
    sharps: false,
    desc: 'ゲートが広い・ゆっくり・音の移動が小さい',
  },
  normal: {
    halfWindow: 6,
    gapStart: 1.25,
    gapEnd: 0.9,
    speedMul: 1,
    spawnStart: 2100,
    spawnEnd: 1600,
    maxStep: 4,
    sharps: false,
    desc: '標準のゲート幅とスピード',
  },
  hard: {
    halfWindow: 7,
    gapStart: 0.9,
    gapEnd: 0.6,
    speedMul: 1.2,
    spawnStart: 1700,
    spawnEnd: 1300,
    maxStep: 5,
    sharps: true,
    desc: 'ゲートが狭い・速い・半音のゲートも出る',
  },
}

export interface MelodyLevel {
  /** 1音の長さ (ms) */
  noteMs: number
  /** ±この cent 以内なら正解 */
  okCents: number
  /** ここまでは部分点 */
  partialCents: number
  startLength: number
  maxLength: number
  /** 1音ごとの最大の動き (音階の度数) */
  maxStep: number
  /** メロディ全体の最大の幅 (半音) */
  maxSpan: number
  desc: string
}

export const MELODY_LEVELS: Record<Difficulty, MelodyLevel> = {
  easy: {
    noteMs: 1000,
    okCents: 70,
    partialCents: 180,
    startLength: 3,
    maxLength: 4,
    maxStep: 1,
    maxSpan: 5,
    desc: 'ゆっくり・となりの音へ動くだけ・判定ゆるめ（±70 cents）',
  },
  normal: {
    noteMs: 800,
    okCents: 50,
    partialCents: 150,
    startLength: 3,
    maxLength: 5,
    maxStep: 3,
    maxSpan: 7,
    desc: '標準のテンポ・判定 ±50 cents',
  },
  hard: {
    noteMs: 650,
    okCents: 35,
    partialCents: 120,
    startLength: 4,
    maxLength: 6,
    maxStep: 4,
    maxSpan: 9,
    desc: '速い・音の跳躍が大きい・判定きびしめ（±35 cents）',
  },
}

export const DIFFICULTY_DESCRIPTIONS: Record<DifficultyGameId, Record<Difficulty, string>> = {
  target: { easy: TARGET_LEVELS.easy.desc, normal: TARGET_LEVELS.normal.desc, hard: TARGET_LEVELS.hard.desc },
  flight: { easy: FLIGHT_LEVELS.easy.desc, normal: FLIGHT_LEVELS.normal.desc, hard: FLIGHT_LEVELS.hard.desc },
  melody: { easy: MELODY_LEVELS.easy.desc, normal: MELODY_LEVELS.normal.desc, hard: MELODY_LEVELS.hard.desc },
}

// ------------------------------------------------------------------ 耳トレ (マイク不要) のゲーム

export interface HighLowLevel {
  /** 1問目の音程差 (cents) の範囲 */
  startMin: number
  startMax: number
  /** 連続正解で小さくしていく下限 (cents) */
  floor: number
  desc: string
}

/** HIGH or LOW: 連続正解で音程差を小さくし、間違えたら大きくする */
export const HIGHLOW_LEVELS: Record<Difficulty, HighLowLevel> = {
  easy: { startMin: 500, startMax: 1200, floor: 100, desc: '5〜12半音の大きな差から。最小は1半音まで' },
  normal: { startMin: 200, startMax: 500, floor: 30, desc: '2〜5半音の差から。半音より小さい差も出る' },
  hard: { startMin: 100, startMax: 200, floor: 10, desc: '1〜2半音の差から。最小 10 cents まで挑戦' },
}

export interface MemoryLevel {
  minNotes: number
  maxNotes: number
  /** 1音ごとの動き (半音) の候補。0 は同じ音 */
  steps: number[]
  /** 選択肢の数 */
  choices: number
  /** 1音の長さ (秒) */
  noteSec: number
  desc: string
}

export const MEMORY_LEVELS: Record<Difficulty, MemoryLevel> = {
  easy: {
    minNotes: 3,
    maxNotes: 3,
    steps: [3, 4, 5, 7],
    choices: 3,
    noteSec: 0.6,
    desc: '3音・大きく動くメロディ・3択',
  },
  normal: { minNotes: 4, maxNotes: 5, steps: [1, 2, 3, 4, 5], choices: 3, noteSec: 0.5, desc: '4〜5音・3択' },
  hard: {
    minNotes: 6,
    maxNotes: 8,
    steps: [0, 1, 2, 2, 3],
    choices: 4,
    noteSec: 0.42,
    desc: '6〜8音・同じ音や小さな動きも・4択',
  },
}

export type DistanceLevelId = 'lv1' | 'lv2' | 'lv3' | 'lv4'

export const DISTANCE_LEVEL_IDS: DistanceLevelId[] = ['lv1', 'lv2', 'lv3', 'lv4']

/** PITCH DISTANCE: 感覚 → 数字 → 音楽理論 の順に答え方が細かくなる */
export const DISTANCE_LEVELS: Record<DistanceLevelId, { label: string; color: string; desc: string }> = {
  lv1: { label: 'Lv.1', color: '#22c98c', desc: '上がった？下がった？ の2択' },
  lv2: { label: 'Lv.2', color: '#22b8e8', desc: '少し上 / 大きく上 / 少し下 / 大きく下 の4択' },
  lv3: { label: 'Lv.3', color: '#7c5cff', desc: '何半音動いたかを数字で答える' },
  lv4: { label: 'Lv.4', color: '#ff5fa2', desc: '半音の数と音程の名前（長3度など）で答える' },
}

// ------------------------------------------------------------------ ゲームごとのレベル一覧 (共通)

export type LevelGameId = DifficultyGameId | 'highlow' | 'distance' | 'memory'

export interface LevelOption {
  id: string
  label: string
  color: string
  desc: string
}

const difficultyOptions = (descs: Record<Difficulty, string>): LevelOption[] =>
  DIFFICULTIES.map((d) => ({ id: d, label: DIFFICULTY_LABELS[d], color: DIFFICULTY_COLORS[d], desc: descs[d] }))

const descsOf = (levels: Record<Difficulty, { desc: string }>) => ({
  easy: levels.easy.desc,
  normal: levels.normal.desc,
  hard: levels.hard.desc,
})

/** ゲームごとに選べるレベル (ランキングもこの単位で分ける) */
export const GAME_LEVELS: Record<LevelGameId, LevelOption[]> = {
  target: difficultyOptions(DIFFICULTY_DESCRIPTIONS.target),
  flight: difficultyOptions(DIFFICULTY_DESCRIPTIONS.flight),
  melody: difficultyOptions(DIFFICULTY_DESCRIPTIONS.melody),
  highlow: difficultyOptions(descsOf(HIGHLOW_LEVELS)),
  memory: difficultyOptions(descsOf(MEMORY_LEVELS)),
  distance: DISTANCE_LEVEL_IDS.map((id) => ({ id, ...DISTANCE_LEVELS[id] })),
}

export const DEFAULT_LEVEL: Record<LevelGameId, string> = {
  target: 'normal',
  flight: 'normal',
  melody: 'normal',
  highlow: 'easy',
  memory: 'easy',
  distance: 'lv1',
}

export function levelOption(game: LevelGameId, id: string | undefined): LevelOption {
  const list = GAME_LEVELS[game]
  return list.find((l) => l.id === id) ?? list.find((l) => l.id === DEFAULT_LEVEL[game])!
}
