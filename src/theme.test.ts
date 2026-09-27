import { describe, expect, it } from 'vitest'
import css from './index.css?raw'
import { COLORS } from './theme'

const CSS_NAME: Partial<Record<keyof typeof COLORS, string>> = {
  ink: 'ink',
  inkSoft: 'ink-soft',
  grape: 'grape',
  bubble: 'bubble',
  sky: 'sky',
  sun: 'sun',
  mint: 'mint',
  cloud: 'cloud',
}

describe('色の定義', () => {
  it.each(Object.entries(CSS_NAME))('%s は index.css の --color-%s と同じ', (key, name) => {
    const m = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)
    expect(m?.[1].toLowerCase()).toBe(COLORS[key as keyof typeof COLORS])
  })
})
