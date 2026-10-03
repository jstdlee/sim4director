// Content integrity check. Run: npx -y tsx scripts/check-content.ts
import { buildBank, LEVELS, TERMS, TERM_MAP, SCENES, TARGETS, CAT_MAP } from '../content/index'
import type { Step } from '../shared/types'

const errs: string[] = []
const LINK = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
const links = (s: string) => [...s.matchAll(LINK)].map((m) => m[1].trim())
const termOk = (id: string, where: string) => { if (!TERM_MAP[id]) errs.push(`${where}: unknown term "${id}"`) }
const checkStep = (st: Step, where: string) => {
  const ids = st.choices.map((c) => c.id)
  if (new Set(ids).size !== ids.length) errs.push(`${where}: duplicate choice ids`)
  if (new Set(st.choices.map((c) => c.label)).size !== ids.length) errs.push(`${where}: duplicate choice labels`)
  if (!ids.includes(st.answer)) errs.push(`${where}: answer "${st.answer}" not in choices`)
  if (st.choices.length < 2) errs.push(`${where}: fewer than 2 choices`)
  for (const t of [...links(st.prompt), ...links(st.why)]) termOk(t, where)
}

const tids = TERMS.map((t) => t.id)
for (const id of tids.filter((id, i) => tids.indexOf(id) !== i)) errs.push(`duplicate term id "${id}"`)
for (const t of TERMS) {
  for (const r of t.related) termOk(r, `term ${t.id}.related`)
  if (t.related.includes(t.id)) errs.push(`term ${t.id} relates to itself`)
  if (!CAT_MAP[t.cat]) errs.push(`term ${t.id} has unknown category ${t.cat}`)
}

const bank = buildBank()
const qids = new Set<string>()
for (const { n } of LEVELS) for (const q of bank[n]) {
  if (qids.has(q.id)) errs.push(`duplicate question id ${q.id}`); qids.add(q.id)
  if (q.level !== n) errs.push(`${q.id}: level ${q.level} filed under ${n}`)
  for (const t of q.terms) termOk(t, `${q.id}.terms`)
  for (const t of links(q.scenario)) termOk(t, `${q.id}.scenario`)
  q.steps.forEach((st, i) => checkStep(st, `${q.id} step ${i + 1}`))
}
const mids = new Set<string>()
for (const m of SCENES) {
  if (mids.has(m.id)) errs.push(`duplicate scene id ${m.id}`); mids.add(m.id)
  for (const t of m.terms) termOk(t, `${m.id}.terms`)
  for (const t of links(m.outcome)) termOk(t, `${m.id}.outcome`)
  if (m.checkpoints.length < 2) errs.push(`${m.id}: fewer than 2 checkpoints`)
  m.checkpoints.forEach((c, i) => { checkStep(c.step, `${m.id} checkpoint ${i + 1}`); if (!CAT_MAP[c.dept]) errs.push(`${m.id} checkpoint ${i + 1}: unknown dept ${c.dept}`) })
}

const authored = Object.values(bank).flat().filter((q) => !q.generated).length
console.log(`terms ${TERMS.length} · questions ${qids.size} (authored ${authored}, targets ${Object.values(TARGETS).reduce((a, b) => a + b, 0)}) · scenes ${SCENES.length}`)
if (errs.length) { console.log(`${errs.length} problem(s):\n- ` + errs.slice(0, 80).join('\n- ')); process.exit(1) }
console.log('content OK')
