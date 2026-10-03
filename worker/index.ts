import { Hono } from 'hono'
import { routeAgentRequest } from 'agents'
import type { Env, Byok } from './env'
import { chat, clef, TUTOR_SYSTEM } from './ai'
import { embed, lookup, store } from './memory'
import { webSearch } from './search'
import { isAuthed, isConfigured, login, logoutCookie } from './auth'
export { TutorAgent } from './agent'

const app = new Hono<{ Bindings: Env }>()

app.get('/api/health', (c) => c.json({ ok: true, llm: c.env.LLM_MODEL, clef: c.env.CLEF_MODEL }))

/** Login with an access token; sets the session cookie. */
app.post('/api/login', async (c) => {
  if (!isConfigured(c.env)) return c.json({ ok: false, error: 'No access token is set on the server.' }, 503)
  const { token } = await c.req.json<{ token?: string }>().catch(() => ({ token: '' }))
  const cookie = await login(token ?? '', c.env)
  if (!cookie) return c.json({ ok: false, error: 'That access token is not valid.' }, 401)
  c.header('set-cookie', cookie)
  return c.json({ ok: true })
})
app.post('/api/logout', (c) => { c.header('set-cookie', logoutCookie); return c.json({ ok: true }) })
app.get('/api/session', async (c) => c.json({ ok: await isAuthed(c.req.raw, c.env) }))

/** Clef sparring director: picks its own answer for a decision step, with probabilities. */
app.post('/api/clef/spar', async (c) => {
  const { scenario, prompt, choices, flash } = await c.req.json<{ scenario: string; prompt: string; choices: { id: string; label: string }[]; flash?: boolean }>()
  const criteria = Object.fromEntries(choices.map((ch) => [ch.id, ch.label]))
  const r = await clef(c.env, `Filmmaking scenario: ${scenario}`, {
    pick: { type: 'choice', instructions: `As an experienced film director and animation supervisor: ${prompt}`, criteria },
    confidence: { type: 'score', instructions: 'How clear-cut is this decision?', criteria: ['Coin flip', 'Leaning', 'Clear', 'Textbook'] },
  }, !!flash)
  return c.json(r)
})

/** Grade a written rationale with Clef (typed, calibrated). */
app.post('/api/clef/grade', async (c) => {
  const { scenario, decision, rationale } = await c.req.json<{ scenario: string; decision: string; rationale: string }>()
  const r = await clef(c.env, `Scenario: ${scenario}\nLearner decision: ${decision}\nLearner rationale: ${rationale}`, {
    story: { type: 'noul', instructions: 'Does the rationale say what the choice does for the story or character?' },
    technique: { type: 'noul', instructions: 'Does it name a concrete film or animation technique (shot, lens, light, edit, timing, tool)?' },
    audience: { type: 'noul', instructions: 'Does it say how the audience will feel or understand the moment?' },
    quality: { type: 'score', instructions: 'Overall reasoning quality', criteria: ['Weak', 'Partial', 'Solid', 'Expert'] },
  })
  return c.json(r)
})

/** LLM explanation of a step, optionally informed by Clef's probabilities. */
app.post('/api/explain', async (c) => {
  const b = await c.req.json<{ scenario: string; prompt: string; choices: string[]; correct: string; picked: string; why: string; clef?: unknown; byok?: Byok }>()
  const user = `Scenario: ${b.scenario}
Question: ${b.prompt}
Choices: ${b.choices.join(' | ')}
Correct: ${b.correct}. Learner picked: ${b.picked}.
Short key: ${b.why}
${b.clef ? `Clef decision model probabilities: ${JSON.stringify(b.clef)}` : ''}
Explain why the correct answer wins, why the learner's pick ${b.picked === b.correct ? 'is right' : 'falls short'}, and one way the answer would change if a variable changed.`
  try {
    // Same question and same pick explained before? Reuse it.
    const key = `${b.prompt}\nCorrect: ${b.correct}\nPicked: ${b.picked}`
    const vec = await embed(c.env, key).catch(() => [] as number[])
    const hit = await lookup(c.env, 'explain', vec).catch(() => null)
    if (hit) return c.json({ ok: true, text: hit.answer, cached: true })
    const text = await chat(c.env, [{ role: 'system', content: TUTOR_SYSTEM }, { role: 'user', content: user }], b.byok)
    await store(c.env, 'explain', key, vec, text).catch(() => {})
    return c.json({ ok: true, text })
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message ?? e) }, 502)
  }
})

/** Web search (Cloudflare Web Search API, Exa as backup). */
app.post('/api/websearch', async (c) => {
  const { query } = await c.req.json<{ query: string }>().catch(() => ({ query: '' }))
  if (!query?.trim()) return c.json({ ok: false, error: 'Empty query' }, 400)
  const r = await webSearch(c.env, `${query} film animation`, 6).catch((e) => ({ provider: 'error', results: [], error: String(e) }))
  return c.json({ ok: true, ...r })
})

/** Progress */
app.post('/api/attempts', async (c) => {
  const a = await c.req.json<{ userId: string; questionId: string; step: number; choice: string; correct: boolean; terms: string[]; rationale?: string; clefScore?: number }>()
  if (!a.userId || a.userId.length > 64) return c.json({ ok: false }, 400)
  const now = Math.floor(Date.now() / 1000)
  const stmts = [
    c.env.DB.prepare('INSERT INTO attempts (user_id, question_id, step, choice, correct, rationale, clef_score) VALUES (?,?,?,?,?,?,?)')
      .bind(a.userId, a.questionId, a.step, a.choice, a.correct ? 1 : 0, a.rationale ?? null, a.clefScore ?? null),
    ...(a.terms ?? []).slice(0, 10).map((t) =>
      c.env.DB.prepare(`INSERT INTO mastery (user_id, term_id, seen, correct, due_at) VALUES (?,?,1,?,?)
        ON CONFLICT(user_id, term_id) DO UPDATE SET seen = seen + 1, correct = correct + excluded.correct, due_at = excluded.due_at`)
        .bind(a.userId, t, a.correct ? 1 : 0, now + (a.correct ? 3 * 86400 : 3600))),
  ]
  await c.env.DB.batch(stmts)
  return c.json({ ok: true })
})

app.get('/api/mastery/:uid', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT term_id, seen, correct, due_at FROM mastery WHERE user_id = ?').bind(c.req.param('uid')).all()
  return c.json({ ok: true, mastery: results })
})

const PUBLIC = new Set(['/api/health', '/api/login', '/api/logout', '/api/session'])

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(req.url)
    const isApi = url.pathname.startsWith('/api/') || url.pathname.startsWith('/agents/')
    if (isApi && !PUBLIC.has(url.pathname) && !(await isAuthed(req, env))) {
      return Response.json({ ok: false, error: 'Sign in with your access token.' }, { status: 401 })
    }
    const agentRes = await routeAgentRequest(req, env)
    if (agentRes) return agentRes
    if (url.pathname.startsWith('/api/')) return app.fetch(req, env, ctx)
    return env.ASSETS.fetch(req)
  },
} satisfies ExportedHandler<Env>
