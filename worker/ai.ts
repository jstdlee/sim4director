import { TERMS } from '../content/terms'
import { CHARACTER } from '../content/character'
import type { Env, Byok, ChatMsg } from './env'

/** Workers AI through the AI Gateway; if the gateway is not set up yet, call Workers AI directly. */
async function run(env: Env, model: string, input: unknown): Promise<unknown> {
  try {
    return await env.AI.run(model as any, input as any, { gateway: { id: env.AI_GATEWAY_ID } } as any)
  } catch (e: any) {
    if (!/gateway/i.test(String(e?.message ?? e))) throw e
    return env.AI.run(model as any, input as any)
  }
}

// ───────────────────────── Clef decision model
// Clef is Jev-API compatible: { state, questions } → typed answers with probabilities.
export type ClefQuestion =
  | { type: 'noul'; instructions: string }
  | { type: 'choice'; instructions: string; criteria: Record<string, string> }
  | { type: 'score'; instructions: string; criteria: string[] }

export interface ClefResult {
  ok: boolean
  model: string
  ms: number
  fields: Record<string, { value: unknown; probs?: Record<string, number> }>
  raw?: unknown
  error?: string
}

export async function clef(env: Env, state: string, questions: Record<string, ClefQuestion>, flash = false): Promise<ClefResult> {
  const model = flash ? env.CLEF_FLASH_MODEL : env.CLEF_MODEL
  const t0 = Date.now()
  try {
    const raw: any = await run(env, model, { model: flash ? 'clef-flash' : 'clef', state, questions })
    return { ok: true, model, ms: Date.now() - t0, fields: normalizeClef(raw), raw }
  } catch (e: any) {
    return { ok: false, model, ms: Date.now() - t0, fields: {}, error: String(e?.message ?? e) }
  }
}

/** Tolerant parser: accepts {answers:{k:{value,probabilities}}}, {k:{...}}, or {k: value}. */
function normalizeClef(raw: any): ClefResult['fields'] {
  const body = raw?.result ?? raw?.answers ?? raw?.output ?? raw ?? {}
  const out: ClefResult['fields'] = {}
  for (const [k, v] of Object.entries<any>(body)) {
    if (v && typeof v === 'object' && typeof v.noul === 'number') {
      // Yes/no answer: `noul` is P(yes).
      out[k] = { value: v.noul >= 0.5, probs: { yes: v.noul, no: 1 - v.noul } }
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      const probs = v.probabilities ?? v.probs ?? v.distribution ?? v.scores
      let value = v.value ?? v.answer ?? v.choice ?? (probs ? argmax(probs) : undefined)
      // Score answer: show the criterion label, not its index.
      if (v.legend && typeof value === 'string' && value in v.legend) value = v.legend[value]
      out[k] = { value, probs: probs && typeof probs === 'object' ? probs : undefined }
    } else out[k] = { value: v }
  }
  return out
}
const argmax = (p: Record<string, number>) => Object.entries(p).sort((a, b) => b[1] - a[1])[0]?.[0]

// ───────────────────────── LLM (Workers AI default, BYOK via AI Gateway)
export async function chat(env: Env, messages: ChatMsg[], byok?: Byok | null, maxTokens = 700): Promise<string> {
  if (byok?.key && byok.provider === 'openai-compatible') {
    // Any OpenAI-compatible endpoint (OpenRouter, DeepSeek, Groq, Together, a local vLLM / llama.cpp server...).
    const base = (byok.baseUrl ?? '').replace(/\/+$/, '')
    if (!/^https:\/\//.test(base)) throw new Error('BYOK: the base URL must start with https://')
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${byok.key}` },
      body: JSON.stringify({ model: byok.model, messages, max_tokens: maxTokens }),
    })
    if (!res.ok) throw new Error(`BYOK ${base} ${res.status}: ${(await res.text()).slice(0, 300)}`)
    const j: any = await res.json()
    return j.choices?.[0]?.message?.content ?? ''
  }
  if (byok?.key && byok.provider !== 'workers-ai') {
    const url = `https://gateway.ai.cloudflare.com/v1/${env.CF_ACCOUNT_ID}/${env.AI_GATEWAY_ID}/compat/chat/completions`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${byok.key}` },
      body: JSON.stringify({ model: `${byok.provider}/${byok.model}`, messages, max_tokens: maxTokens }),
    })
    if (!res.ok) throw new Error(`BYOK ${byok.provider} ${res.status}: ${(await res.text()).slice(0, 300)}`)
    const j: any = await res.json()
    return j.choices?.[0]?.message?.content ?? ''
  }
  const model = byok?.provider === 'workers-ai' && byok.model ? byok.model : env.LLM_MODEL
  // Kimi K2.x reasons by default and can spend all of max_tokens before it answers; turn thinking off.
  const extra = /kimi/i.test(model) ? { chat_template_kwargs: { thinking: false } } : {}
  const out: any = await run(env, model, { messages, max_tokens: maxTokens, ...extra })
  const text = out?.response || out?.choices?.[0]?.message?.content || (typeof out === 'string' ? out : '')
  if (!text) throw new Error(`${model} returned no text (finish_reason: ${out?.choices?.[0]?.finish_reason ?? 'unknown'})`)
  return text
}

export const TUTOR_SYSTEM = `${CHARACTER.soul}

You are the tutor inside "Director Quest", a learning app for film directing, animation and Blender.
Explain clearly and briefly (under 180 words unless asked). Use short sentences and concrete examples from films, anime or Blender steps.
When you name a key term, give it in English with Chinese and Japanese in brackets, e.g. "close-up (特写 / クローズアップ)".
Reference terms the learner should review as [[term-id]]. Use only these ids: ${TERMS.map((t) => t.id).join(' ')}.
If web search results are given, use them and cite sources as [n] with the link title.
If the learner writes in Chinese or Japanese, answer in that language.`
