import { clamp, isNatural, noteFromMidi } from '../../audio/pitchUtils'
import type { FlightLevel } from '../difficulty'
import { COLORS } from '../../theme'

/**
 * ボイスフライトのゲームロジックと Canvas 描画。React からは独立。
 * 座標は CSS ピクセル。音程 (MIDI) の窓 [lowMidi, highMidi] を画面の Y にマッピングする。
 */

export interface FlightConfig {
  lowMidi: number
  highMidi: number
  durationMs: number
  level: FlightLevel
}

interface Gate {
  x: number
  midi: number
  /** 隙間の半分の幅 (半音) */
  halfGap: number
  state: 'pending' | 'hit' | 'perfect' | 'miss'
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

interface Popup {
  x: number
  y: number
  text: string
  color: string
  life: number
}

export interface FlightStats {
  score: number
  combo: number
  maxCombo: number
  hits: number
  perfects: number
  misses: number
  remainingMs: number
  finished: boolean
}

/** 通過時に飛び散る粒の色 */
const PARTICLE_COLORS = [COLORS.bubble, COLORS.sun, COLORS.mint, COLORS.sky, COLORS.grape]

export class VoiceFlightEngine {
  private w = 320
  private h = 400
  private cfg: FlightConfig
  private elapsed = 0
  private charY: number
  private charVy = 0
  private gates: Gate[] = []
  private particles: Particle[] = []
  private popups: Popup[] = []
  private trail: { x: number; y: number }[] = []
  private clouds: { x: number; y: number; r: number; speed: number }[] = []
  private spawnTimer = 1200
  private lastGateMidi: number
  private voiced = false
  private shake = 0
  private flap = 0
  stats: FlightStats

  constructor(cfg: FlightConfig) {
    this.cfg = cfg
    this.lastGateMidi = Math.round((cfg.lowMidi + cfg.highMidi) / 2)
    this.charY = this.h / 2
    this.stats = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      hits: 0,
      perfects: 0,
      misses: 0,
      remainingMs: cfg.durationMs,
      finished: false,
    }
    for (let i = 0; i < 6; i++) {
      this.clouds.push({
        x: Math.random() * 1.2,
        y: Math.random(),
        r: 20 + Math.random() * 30,
        speed: 0.2 + Math.random() * 0.3,
      })
    }
  }

  resize(w: number, h: number) {
    const ratio = h / this.h
    this.charY *= ratio
    this.w = w
    this.h = h
  }

  private get charX() {
    return Math.min(this.w * 0.28, 160)
  }
  private get pad() {
    return this.h * 0.08
  }
  /** 横スクロール速度 (px/s)。後半ほど少し速く */
  private get speed() {
    const t = this.elapsed / this.cfg.durationMs
    return clamp(this.w / 4.2, 90, 220) * (1 + t * 0.35) * this.cfg.level.speedMul
  }

  midiToY(midi: number): number {
    const { lowMidi, highMidi } = this.cfg
    const n = (midi - lowMidi) / (highMidi - lowMidi)
    return this.pad + (1 - n) * (this.h - this.pad * 2)
  }

  private semitonePx() {
    return (this.h - this.pad * 2) / (this.cfg.highMidi - this.cfg.lowMidi)
  }

  update(dtMs: number, midi: number | null) {
    if (this.stats.finished) return
    const dt = dtMs / 1000
    this.elapsed += dtMs
    this.stats.remainingMs = Math.max(0, this.cfg.durationMs - this.elapsed)

    // --- キャラクターの移動 ---
    // 音程→目標Y。急な変化でも瞬間移動しないよう、追従(指数補間)＋最高速度で制限
    this.voiced = midi !== null
    if (midi !== null) {
      const targetY = clamp(this.midiToY(midi), this.pad * 0.5, this.h - this.pad * 0.5)
      const follow = 1 - Math.exp(-dtMs / 70)
      let step = (targetY - this.charY) * follow
      const maxStep = this.h * 2.2 * dt
      step = clamp(step, -maxStep, maxStep)
      this.charVy = step / Math.max(dt, 0.001)
      this.charY += step
      this.flap += dt * 14
    } else {
      // 無声時はその場でふわふわホバー (落下させない)
      this.charVy *= 0.9
      this.charY += Math.sin(this.elapsed / 300) * 0.25
      this.flap += dt * 4
    }

    const sp = this.speed
    // 軌跡
    for (const p of this.trail) p.x -= sp * dt
    this.trail.unshift({ x: this.charX, y: this.charY })
    if (this.trail.length > 40) this.trail.pop()

    for (const c of this.clouds) {
      c.x -= c.speed * dt * 0.25
      if (c.x < -0.3) {
        c.x = 1.2
        c.y = Math.random()
      }
    }

    // --- ゲート ---
    this.spawnTimer -= dtMs
    if (this.spawnTimer <= 0 && this.stats.remainingMs > 2500) {
      this.spawnGate()
      const { spawnStart, spawnEnd } = this.cfg.level
      this.spawnTimer = spawnStart + (spawnEnd - spawnStart) * (this.elapsed / this.cfg.durationMs)
    }
    for (const g of this.gates) {
      g.x -= sp * dt
      if (g.state === 'pending' && g.x <= this.charX) this.judgeGate(g)
    }
    this.gates = this.gates.filter((g) => g.x > -80)

    // --- エフェクト ---
    for (const p of this.particles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 300 * dt
      p.life -= dt
    }
    this.particles = this.particles.filter((p) => p.life > 0)
    for (const p of this.popups) {
      p.y -= 40 * dt
      p.life -= dt
    }
    this.popups = this.popups.filter((p) => p.life > 0)
    this.shake = Math.max(0, this.shake - dt * 3)

    if (this.elapsed >= this.cfg.durationMs) this.stats.finished = true
  }

  private spawnGate() {
    const { lowMidi, highMidi } = this.cfg
    // 前のゲートから ±4 半音以内で次の音を選ぶ (幹音を優先)
    const candidates: number[] = []
    for (let m = Math.ceil(lowMidi + 1); m <= highMidi - 1; m++) {
      const { maxStep, sharps } = this.cfg.level
      if (Math.abs(m - this.lastGateMidi) <= maxStep && m !== this.lastGateMidi && (sharps || isNatural(m)))
        candidates.push(m)
    }
    const midi = candidates.length
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : Math.round((lowMidi + highMidi) / 2)
    this.lastGateMidi = midi
    const t = this.elapsed / this.cfg.durationMs
    const { gapStart, gapEnd } = this.cfg.level
    this.gates.push({ x: this.w + 40, midi, halfGap: gapStart + (gapEnd - gapStart) * t, state: 'pending' })
  }

  private judgeGate(g: Gate) {
    const cy = this.midiToY(g.midi)
    const diffSemis = Math.abs(this.charY - cy) / this.semitonePx()
    const s = this.stats
    if (diffSemis <= g.halfGap) {
      const perfect = diffSemis <= 0.35
      g.state = perfect ? 'perfect' : 'hit'
      s.combo++
      s.maxCombo = Math.max(s.maxCombo, s.combo)
      s.hits++
      if (perfect) s.perfects++
      const pts = (perfect ? 150 : 100) + Math.min(10, s.combo - 1) * 10
      s.score += pts
      this.burst(this.charX, this.charY, perfect ? 26 : 14)
      this.popups.push({
        x: this.charX,
        y: this.charY - 30,
        text: perfect ? `PERFECT +${pts}` : `+${pts}`,
        color: perfect ? COLORS.bubble : COLORS.mint,
        life: 0.9,
      })
    } else {
      g.state = 'miss'
      s.combo = 0
      s.misses++
      this.shake = 1
      this.popups.push({
        x: this.charX,
        y: this.charY - 30,
        text: this.charY > cy ? 'もっと高く！' : 'もっと低く！',
        color: COLORS.muted,
        life: 0.9,
      })
    }
  }

  private burst(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const v = 80 + Math.random() * 180
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 80,
        life: 0.6 + Math.random() * 0.4,
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      })
    }
  }

  // ------------------------------------------------------------------ 描画
  draw(ctx: CanvasRenderingContext2D, currentMidi: number | null) {
    const { w, h } = this
    ctx.save()
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * 8 * this.shake, 0)

    const sky = ctx.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#dff3ff')
    sky.addColorStop(1, '#fff3fa')
    ctx.fillStyle = sky
    ctx.fillRect(-10, 0, w + 20, h)

    // 雲
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    for (const c of this.clouds) {
      const x = c.x * w
      const y = c.y * h
      ctx.beginPath()
      ctx.arc(x, y, c.r, 0, Math.PI * 2)
      ctx.arc(x + c.r * 0.9, y + 4, c.r * 0.75, 0, Math.PI * 2)
      ctx.arc(x - c.r * 0.9, y + 6, c.r * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }

    // 音名ガイド線
    const { lowMidi, highMidi } = this.cfg
    ctx.font = '700 11px "M PLUS Rounded 1c", sans-serif'
    ctx.textBaseline = 'middle'
    for (let m = Math.ceil(lowMidi); m <= highMidi; m++) {
      const y = this.midiToY(m)
      const natural = isNatural(m)
      const near = currentMidi !== null && Math.abs(currentMidi - m) < 0.5
      ctx.strokeStyle = near ? 'rgba(124,92,255,0.35)' : natural ? 'rgba(42,35,80,0.09)' : 'rgba(42,35,80,0.04)'
      ctx.lineWidth = near ? 2 : 1
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
      if (natural) {
        ctx.fillStyle = near ? COLORS.grape : 'rgba(42,35,80,0.35)'
        ctx.fillText(noteFromMidi(m).label, 6, y)
      }
    }

    // ゲート
    const semi = this.semitonePx()
    for (const g of this.gates) this.drawGate(ctx, g, semi)

    // 軌跡
    ctx.lineCap = 'round'
    for (let i = 1; i < this.trail.length; i++) {
      const a = this.trail[i - 1]
      const b = this.trail[i]
      ctx.strokeStyle = `rgba(124,92,255,${0.35 * (1 - i / this.trail.length)})`
      ctx.lineWidth = 10 * (1 - i / this.trail.length) + 2
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }

    this.drawCharacter(ctx)

    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.font = '800 16px "M PLUS Rounded 1c", sans-serif'
    ctx.textAlign = 'center'
    for (const p of this.popups) {
      ctx.globalAlpha = Math.min(1, p.life * 2)
      ctx.fillStyle = p.color
      ctx.fillText(p.text, p.x + 30, p.y)
    }
    ctx.globalAlpha = 1
    ctx.textAlign = 'left'
    ctx.restore()
  }

  private drawGate(ctx: CanvasRenderingContext2D, g: Gate, semi: number) {
    const cy = this.midiToY(g.midi)
    const top = cy - g.halfGap * semi
    const bottom = cy + g.halfGap * semi
    const pw = 26
    const color =
      g.state === 'miss'
        ? COLORS.faint
        : g.state === 'pending'
          ? COLORS.sun
          : g.state === 'perfect'
            ? COLORS.bubble
            : COLORS.mint

    ctx.fillStyle = color
    roundRect(ctx, g.x - pw / 2, -20, pw, top + 20, 12)
    roundRect(ctx, g.x - pw / 2, bottom, pw, this.h - bottom + 20, 12)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(g.x - pw / 2 + 5, 0, 5, top - 10)
    ctx.fillRect(g.x - pw / 2 + 5, bottom + 10, 5, this.h - bottom)

    // 隙間の中心マーカー (星)
    if (g.state === 'pending') {
      drawStar(ctx, g.x, cy, 9, '#ffffff', color)
    }
    ctx.font = '800 12px "M PLUS Rounded 1c", sans-serif'
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.fillText(noteFromMidi(g.midi).label, g.x, top - 12 < 10 ? bottom + 14 : top - 12)
    ctx.textAlign = 'left'
  }

  private drawCharacter(ctx: CanvasRenderingContext2D) {
    const x = this.charX
    const y = this.charY
    const tilt = clamp(-this.charVy / 900, -0.5, 0.5)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(tilt)

    // 声を出している間は後ろに炎
    if (this.voiced) {
      const f = 10 + Math.sin(this.flap * 2) * 4
      const flame = ctx.createLinearGradient(-22 - f, 0, -14, 0)
      flame.addColorStop(0, 'rgba(255,176,32,0)')
      flame.addColorStop(1, COLORS.sun)
      ctx.fillStyle = flame
      ctx.beginPath()
      ctx.moveTo(-14, -7)
      ctx.quadraticCurveTo(-24 - f, 0, -14, 7)
      ctx.fill()
    }

    // 体
    ctx.fillStyle = COLORS.grape
    ctx.beginPath()
    ctx.ellipse(0, 0, 20, 17, 0, 0, Math.PI * 2)
    ctx.fill()
    // お腹
    ctx.fillStyle = '#b8a8ff'
    ctx.beginPath()
    ctx.ellipse(2, 6, 12, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    // 羽
    const wing = Math.sin(this.flap) * 7
    ctx.fillStyle = COLORS.bubble
    ctx.beginPath()
    ctx.ellipse(-5, -2 + wing * 0.3, 9, 5 + Math.abs(wing) * 0.4, -0.4 + wing * 0.05, 0, Math.PI * 2)
    ctx.fill()
    // 目
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(9, -5, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = COLORS.ink
    ctx.beginPath()
    ctx.arc(10.5, -5, 3, 0, Math.PI * 2)
    ctx.fill()
    // くちばし
    ctx.fillStyle = COLORS.sun
    ctx.beginPath()
    ctx.moveTo(18, -1)
    ctx.lineTo(27, 2)
    ctx.lineTo(18, 5)
    ctx.fill()
    ctx.restore()
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, Math.min(r, h / 2))
  ctx.fill()
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke: string) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const rr = i % 2 ? r * 0.45 : r
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 2
  ctx.stroke()
}
