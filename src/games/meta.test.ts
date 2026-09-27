import { describe, expect, it } from 'vitest'
import { DEFAULT_LEVEL, GAME_LEVELS } from './difficulty'
import { GAMES, GAME_IDS, MONITOR } from './meta'

describe('ゲームの登録', () => {
  it('GAME_IDS のゲームがちょうど1回ずつ GAMES にある', () => {
    expect(GAMES.map((g) => g.id).sort()).toEqual([...GAME_IDS].sort())
  })

  it('画面のパスは重複しない', () => {
    const paths = [...GAMES, MONITOR].map((g) => g.to)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('各ゲームのレベル一覧があり、初期レベルはその中にある', () => {
    for (const id of GAME_IDS) {
      const ids = GAME_LEVELS[id].map((l) => l.id)
      expect(ids.length).toBeGreaterThan(0)
      expect(ids).toContain(DEFAULT_LEVEL[id])
    }
  })
})
