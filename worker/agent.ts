import { Agent, type Connection, type WSMessage } from 'agents'
import type { Env, Byok, ChatMsg } from './env'
import { chat, clef, TUTOR_SYSTEM } from './ai'
import { embed, lookup, store } from './memory'
import { webSearch, wantsSearch, asContext } from './search'

interface TutorState { history: ChatMsg[] }

/** One Durable Object per learner: persistent tutor memory. */
export class TutorAgent extends Agent<Env, TutorState> {
  initialState: TutorState = { history: [] }

  async onMessage(conn: Connection, message: WSMessage) {
    let data: any
    try { data = JSON.parse(String(message)) } catch { return }

    if (data.type === 'reset') { this.setState({ history: [] }); return }
    if (data.type !== 'ask') return

    const text = String(data.text).slice(0, 4000)
    const ctx: string = data.context ? `\n\nCurrent screen context:\n${String(data.context).slice(0, 4000)}` : ''
    const history: ChatMsg[] = [...this.state.history, { role: 'user' as const, content: text }].slice(-16)
    const remember = (reply: string) => this.setState({ history: [...history, { role: 'assistant' as const, content: reply }].slice(-16) })

    try {
      // 1. Similar question answered before? Reuse it (skip when the learner asks for a fresh answer).
      const key = `${text}${data.context ? `\n${String(data.context).slice(0, 500)}` : ''}`
      const vec = await embed(this.env, key).catch(() => [] as number[])
      if (!data.fresh) {
        const hit = await lookup(this.env, 'tutor', vec).catch(() => null)
        if (hit) {
          remember(hit.answer)
          conn.send(JSON.stringify({ type: 'answer', id: data.id, text: hit.answer, cached: { score: hit.score, question: hit.question }, sources: hit.sources }))
          return
        }
      }

      // 2. Web search when asked for, or when the question needs outside facts.
      let sources: { title: string; url: string }[] = [], web = '', provider = ''
      if (data.web || wantsSearch(text)) {
        const s = await webSearch(this.env, text).catch(() => ({ provider: 'none', results: [] }))
        provider = s.provider
        sources = s.results.map((r) => ({ title: r.title, url: r.url }))
        if (s.results.length) web = `\n\nWeb search results (${s.provider}):\n${asContext(s.results)}`
      }

      // Fast intent routing with Clef-flash: which department the learner asks about.
      const route = await clef(this.env, `${text}${ctx}`.slice(0, 6000), {
        topic: {
          type: 'choice', instructions: 'Which area is the learner mainly asking about?',
          criteria: { story: 'structure, character, conflict, theme', camera: 'shots, lenses, composition, movement, light, color', editing: 'cuts, montage, sound, pacing', animation: '12 principles, timing, acting, rigs', blender: 'modeling, shading, rendering, Blender tools', other: 'anything else' },
        },
      }, true)

      // 3. LLM answer, then cache it.
      const reply = await chat(this.env, [{ role: 'system', content: TUTOR_SYSTEM + ctx + web }, ...history], data.byok as Byok | undefined)
      remember(reply)
      await store(this.env, 'tutor', key, vec, reply, sources).catch(() => {})
      conn.send(JSON.stringify({ type: 'answer', id: data.id, text: reply, sources, provider, topic: route.ok ? route.fields.topic?.value : null }))
    } catch (e: any) {
      conn.send(JSON.stringify({ type: 'error', id: data.id, text: String(e?.message ?? e) }))
    }
  }
}
