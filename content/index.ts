import { AUTHORED, LEVELS } from './questions'
import { TERMS } from './terms'
import { generate } from '../shared/generator'
import type { Question } from '../shared/types'

// Target counts per level. Authored questions first; generated drills fill the rest.
export const TARGETS: Record<number, number> = { 1: 60, 2: 80, 3: 50, 4: 60, 5: 90, 6: 90, 7: 70, 8: 70 }

export function buildBank(seed = 42): Record<number, Question[]> {
  const out: Record<number, Question[]> = {}
  for (const l of LEVELS) {
    const a = AUTHORED.filter((q) => q.level === l.n)
    out[l.n] = [...a, ...generate(l.n, l.cats, TERMS, Math.max(0, TARGETS[l.n] - a.length), seed)]
  }
  return out
}

export { LEVELS }
export { TERMS, TERM_MAP, CATS, CAT_MAP } from './terms'
export { ALL_SCENES as SCENES } from './scenes_more'
export { SOURCES, EXPLORE } from './sources'
