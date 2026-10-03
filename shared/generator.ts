// Seeded practice generator. Term drills come from the glossary; number drills recompute film math.
import type { Question, Step, Term } from './types'

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
type R = () => number
const pick = <T,>(r: R, a: T[]) => a[Math.floor(r() * a.length)]
const int = (r: R, lo: number, hi: number) => Math.floor(lo + r() * (hi - lo + 1))
function shuffle<T>(r: R, a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] }
  return b
}

/** Multiple-choice step from labels; the first label is the answer. */
function mc(r: R, prompt: string, answer: string, distract: string[], why: string): Step {
  const labels = Array.from(new Set([answer, ...distract.filter((d) => d !== answer)])).slice(0, 4)
  const choices = shuffle(r, labels).map((label, i) => ({ id: `c${i}`, label }))
  return { prompt, choices, answer: choices.find((c) => c.label === answer)!.id, why }
}
const numStep = (r: R, prompt: string, answer: number, distract: number[], why: string, fmt: (n: number) => string) =>
  mc(r, prompt, fmt(answer), distract.map(fmt), why)

// ───────────────────────── term drills
type TermTpl = (r: R, t: Term, pool: Term[], all: Term[]) => { title: string; scenario: string; steps: Step[]; terms: string[] }

const others = (r: R, t: Term, pool: Term[], n: number) => shuffle(r, pool.filter((x) => x.id !== t.id)).slice(0, n)

const TERM_TPL: TermTpl[] = [
  (r, t, pool) => ({ title: `Name it: ${t.name}`, terms: [t.id],
    scenario: `A crew member describes this idea: “${t.short}”`,
    steps: [mc(r, 'Which concept is it?', t.name, others(r, t, pool, 3).map((x) => x.name), `This is [[${t.id}]] (${t.zh} / ${t.ja}).`)] }),
  (r, t, pool) => ({ title: `中文 → English: ${t.zh}`, terms: [t.id],
    scenario: `A Chinese crew member says 「${t.zh}」.`,
    steps: [mc(r, 'Which English term is it?', t.name, others(r, t, pool, 3).map((x) => x.name), `「${t.zh}」 = [[${t.id}]]. 日本語: ${t.ja}.`)] }),
  (r, t, pool) => ({ title: `日本語 → English: ${t.ja}`, terms: [t.id],
    scenario: `A Japanese animator writes 「${t.ja}」 on the sheet.`,
    steps: [mc(r, 'What does it mean?', t.short, others(r, t, pool, 3).map((x) => x.short), `「${t.ja}」 = [[${t.id}]] (${t.zh}).`)] }),
  (r, t, pool, all) => {
    const rel = t.related.map((id) => all.find((x) => x.id === id)).filter(Boolean) as Term[]
    if (!rel.length) return TERM_TPL[0](r, t, pool, all)
    const ans = pick(r, rel)
    const far = shuffle(r, all.filter((x) => x.cat !== t.cat && !t.related.includes(x.id) && x.id !== t.id)).slice(0, 3)
    return { title: `Connect: ${t.name}`, terms: [t.id, ans.id],
      scenario: `You study [[${t.id}]]: ${t.short}`,
      steps: [mc(r, 'Which concept is most closely linked?', ans.name, far.map((x) => x.name), `[[${t.id}]] connects to [[${ans.id}]]. Open the term map to see more links.`)] }
  },
]

// ───────────────────────── number drills, per level
type NumTpl = (r: R) => { title: string; scenario: string; steps: Step[]; terms: string[] }
const f1 = (n: number) => (Math.round(n * 10) / 10).toString()
const NUM: Record<number, NumTpl[]> = {
  1: [(r) => {
    const len = pick(r, [90, 100, 110, 120])
    return { title: 'Act timing', terms: ['three_act', 'midpoint'], scenario: `A ${len}-minute feature in [[three_act|three acts]].`,
      steps: [
        numStep(r, 'Act 1 ends near minute…', len * 0.25, [len * 0.1, len * 0.5, len * 0.75], '≈ 25 % of the running time.', (n) => `${Math.round(n)}`),
        numStep(r, 'The [[midpoint]] is near minute…', len * 0.5, [len * 0.25, len * 0.75, len * 0.9], 'Half way.', (n) => `${Math.round(n)}`),
      ] }
  }],
  2: [
    (r) => {
      const fps = pick(r, [24, 25, 30, 48, 60]), ang = pick(r, [180, 90, 45, 360])
      const t = (ang / 360) / fps
      return { title: 'Shutter angle math', terms: ['shutter', 'frame_rate', 'motion_blur'], scenario: `Camera at ${fps} fps with a ${ang}° shutter.`,
        steps: [numStep(r, 'Shutter speed?', 1 / t, [fps, 2 / t, 1 / t / 2], `Exposure = (angle / 360) / fps = 1/${Math.round(1 / t)} s.`, (n) => `1/${Math.round(n)} s`)] }
    },
    (r) => {
      const f = pick(r, [18, 24, 35, 50, 85, 135]), w = pick(r, [36, 24.9])
      const fov = (2 * Math.atan(w / (2 * f)) * 180) / Math.PI
      return { title: 'Field of view', terms: ['focal_length', 'field_of_view', 'sensor_size'],
        scenario: `A ${f} mm lens on a ${w === 36 ? 'full-frame (36 mm wide)' : 'Super 35 (24.9 mm wide)'} sensor.`,
        steps: [numStep(r, 'Horizontal field of view?', fov, [fov * 0.5, fov * 1.6, fov * 2.2], 'FOV = 2 · atan(sensor width / 2f).', (n) => `${Math.round(n)}°`)] }
    },
  ],
  3: [(r) => {
    const st = int(r, 1, 4)
    return { title: 'Stops to ratio', terms: ['contrast_ratio', 'key_light', 'fill_light'], scenario: `The fill is ${st} stop(s) darker than the key.`,
      steps: [numStep(r, 'Key : fill ratio?', 2 ** st, [st, 2 ** st * 2, 2 ** st + 1], 'Each stop doubles the light.', (n) => `${n}:1`)] }
  },
  (r) => {
    const [a, b] = shuffle(r, [[1900, 'candle'], [3200, 'tungsten lamp'], [5600, 'daylight'], [7500, 'blue sky shade']] as [number, string][]).slice(0, 2)
    const warm = a[0] < b[0] ? a : b
    return { title: 'Warmer light', terms: ['color_temp'], scenario: `Light A: ${a[1]} (${a[0]} K). Light B: ${b[1]} (${b[0]} K).`,
      steps: [mc(r, 'Which looks warmer (more orange)?', `${warm[1]} (${warm[0]} K)`, [`${(warm === a ? b : a)[1]} (${(warm === a ? b : a)[0]} K)`, 'They look the same'], 'Lower Kelvin = warmer.')] }
  }],
  4: [(r) => {
    const min = pick(r, [5, 10, 15, 20]), asl = pick(r, [2, 3, 4, 6])
    return { title: 'Shot count', terms: ['pacing'], scenario: `A ${min}-minute sequence. Average shot length ${asl} s.`,
      steps: [numStep(r, 'About how many shots?', (min * 60) / asl, [min * asl, (min * 60) / asl / 2, (min * 60) / asl * 2], 'Shots = duration / average shot length.', (n) => `${Math.round(n)}`)] }
  },
  (r) => {
    const pages = pick(r, [8, 12, 25, 90, 110])
    return { title: 'Page count', terms: ['screenplay_format'], scenario: `A screenplay of ${pages} pages in standard format.`,
      steps: [numStep(r, 'Rough running time?', pages, [pages / 2, pages * 2, pages * 3], 'About one page per minute.', (n) => `${Math.round(n)} min`)] }
  }],
  6: [
    (r) => {
      const s = pick(r, [0.5, 1, 1.5, 2, 3]), fps = pick(r, [24, 30])
      return { title: 'Frames for an action', terms: ['timing', 'frame_rate'], scenario: `A gesture lasts ${s} s at ${fps} fps.`,
        steps: [numStep(r, 'How many frames?', s * fps, [s * fps / 2, s * fps * 2, s * 10], 'Frames = seconds × fps.', (n) => `${Math.round(n)}`)] }
    },
    (r) => {
      const s = pick(r, [2, 4, 5, 10]), on = pick(r, [1, 2, 3])
      return { title: 'Drawings needed', terms: ['on_twos', 'limited_animation'], scenario: `${s} s of 2D animation at 24 fps, animated on ${on === 1 ? 'ones' : on === 2 ? 'twos' : 'threes'}.`,
        steps: [numStep(r, 'How many drawings?', (s * 24) / on, [s * 24, (s * 24) / on / 2, s * 12 * on], 'Drawings = frames / exposure.', (n) => `${Math.round(n)}`)] }
    },
  ],
  7: [(r) => {
    const q = pick(r, [6, 100, 500, 1200]), lv = int(r, 1, 3)
    return { title: 'Subdivision cost', terms: ['subdivision', 'polygon'], scenario: `A mesh with ${q} quads gets Subdivision level ${lv}.`,
      steps: [numStep(r, 'Quads after subdivision?', q * 4 ** lv, [q * 2 ** lv, q * lv, q * 4 ** (lv + 1)], 'Each level splits one quad into four.', (n) => n.toLocaleString('en-US'))] }
  }],
  8: [
    (r) => {
      const frames = pick(r, [240, 720, 1440, 3000]), spf = pick(r, [30, 60, 120, 300])
      const h = (frames * spf) / 3600
      return { title: 'Render time', terms: ['output_settings', 'cycles', 'render_farm'], scenario: `${frames} frames, each takes ${spf} s to render on one machine.`,
        steps: [numStep(r, 'Total render time?', h, [h / 2, h * 2, h * 10], 'Frames × seconds per frame / 3600.', (n) => `${f1(n)} h`)] }
    },
    (r) => {
      const d = pick(r, [10, 30, 90]), fps = pick(r, [24, 30, 60])
      return { title: 'Frame range', terms: ['output_settings', 'frame_rate'], scenario: `A ${d}-second shot at ${fps} fps, starting at frame 1.`,
        steps: [numStep(r, 'End frame?', d * fps, [d * fps - fps, d * 24 === d * fps ? d * 30 : d * 24, d * fps * 2], 'Duration × fps.', (n) => `${n}`)] }
    },
  ],
}

export function generate(level: number, cats: string[], all: Term[], count: number, seed = 42): Question[] {
  const r = rng(seed * 100 + level)
  const pool = all.filter((t) => cats.includes(t.cat))
  const out: Question[] = []
  const nums = NUM[level] ?? []
  const order = shuffle(r, pool)
  for (let i = 0; out.length < count && pool.length; i++) {
    const id = `g${level}-${String(i + 1).padStart(3, '0')}`
    const useNum = nums.length && i % 5 === 4
    const q = useNum ? pick(r, nums)(r) : TERM_TPL[Math.floor(i / order.length) % TERM_TPL.length](r, order[i % order.length], pool.length >= 4 ? pool : all, all)
    out.push({ id, level, title: q.title, scenario: q.scenario, terms: q.terms, tags: [all.find((t) => t.id === q.terms[0])?.cat ?? 'practice'], steps: q.steps, generated: true })
  }
  return out
}
