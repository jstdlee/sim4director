import type { Env } from './env'

// Similarity cache for tutor and explanation answers. Embeddings come from bge-m3 (multilingual: en / zh / ja).
// Rows are compared in the Worker with cosine similarity; fine for a few thousand cached answers.
const EMB_MODEL = '@cf/baai/bge-m3'
export const HIT = 0.9          // cosine needed to reuse an answer
const SCAN = 3000               // newest rows compared per lookup

export async function embed(env: Env, text: string): Promise<number[]> {
  const out: any = await env.AI.run(EMB_MODEL as any, { text: [text.slice(0, 2000)] } as any)
  return out?.data?.[0] ?? []
}

const cos = (a: number[], b: number[]) => {
  let d = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  return d / (Math.sqrt(na * nb) || 1)
}

export interface CacheHit { id: number; answer: string; sources: { title: string; url: string }[]; score: number; question: string }

export async function lookup(env: Env, kind: string, vec: number[]): Promise<CacheHit | null> {
  if (!vec.length) return null
  const { results } = await env.DB.prepare('SELECT id, question, answer, emb, sources FROM qa_cache WHERE kind = ? ORDER BY id DESC LIMIT ?').bind(kind, SCAN).all<any>()
  let best: CacheHit | null = null
  for (const r of results ?? []) {
    const score = cos(vec, JSON.parse(r.emb))
    if (score >= HIT && (!best || score > best.score)) best = { id: r.id, answer: r.answer, sources: r.sources ? JSON.parse(r.sources) : [], score, question: r.question }
  }
  if (best) await env.DB.prepare('UPDATE qa_cache SET hits = hits + 1 WHERE id = ?').bind(best.id).run()
  return best
}

export async function store(env: Env, kind: string, question: string, vec: number[], answer: string, sources: { title: string; url: string }[] = []) {
  if (!vec.length || !answer) return
  await env.DB.prepare('INSERT INTO qa_cache (kind, question, answer, emb, sources) VALUES (?,?,?,?,?)')
    .bind(kind, question.slice(0, 2000), answer, JSON.stringify(vec), sources.length ? JSON.stringify(sources) : null).run()
}
