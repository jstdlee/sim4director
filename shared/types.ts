export interface Choice { id: string; label: string }

export interface Step {
  prompt: string          // may contain [[term]] or [[term|label]] links
  choices: Choice[]
  answer: string          // choice id
  why: string             // short static explanation (AI expands on demand)
  brief?: Brief           // scenes: the situation on set at this checkpoint
}

/** Situation at a scene checkpoint: what is on set now. */
export interface Brief { label: string; date: string; facts: string[]; note?: string }

export interface Question {
  id: string
  level: number           // 1..8
  title: string
  scenario: string        // text with [[term]] links
  terms: string[]
  tags: string[]
  steps: Step[]           // multi-step decision chain
  generated?: boolean
}

export interface Term {
  id: string
  name: string            // English
  zh: string              // 中文
  ja: string              // 日本語
  cat: string             // category id, see CATS
  short: string
  related: string[]
}

export interface Category { id: string; name: string; zh: string; ja: string; color: string }

/** One decision while building a scene: which department, what is on set now, then the choice. */
export interface Checkpoint {
  label: string           // e.g. "Story beat", "Shot", "Light"
  dept: string            // category id from CATS
  context: string         // what the virtual set looks like at this moment
  step: Step
}

/** A virtual scene the learner builds from the concepts, decision by decision (final test). */
export interface Scene {
  id: string
  title: string
  genre: string
  setup: string           // the story context: who, where, what is at stake
  goal: string            // what the audience must feel or understand
  terms: string[]
  tags: string[]
  checkpoints: Checkpoint[]
  outcome: string         // the "director's cut": why these choices work together
  ref?: string            // optional real film to watch afterwards
}

export interface Level { n: number; name: string; zh: string; ja: string; blurb: string; cats: string[] }
