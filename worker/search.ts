import type { Env } from './env'

export interface WebResult { title: string; url: string; text: string }

// Web search: Cloudflare Web Search API (AI binding, through AI Gateway) first, Exa API as backup.
export async function webSearch(env: Env, query: string, limit = 5): Promise<{ provider: string; results: WebResult[] }> {
  const q = query.slice(0, 1000)
  // Try the app's gateway, then the account's "default" gateway.
  let lastErr = ''
  for (const gatewayId of Array.from(new Set([env.AI_GATEWAY_ID, 'default']))) {
    try {
      const res: any = await (env.AI as any).websearch({ gatewayId, query: q, limit })
      const j: any = typeof res?.json === 'function' ? await res.json() : res
      const list: any[] = j?.results ?? j?.result?.results ?? j?.data ?? []
      if (list.length) return { provider: 'cloudflare', results: list.slice(0, limit).map(norm) }
      lastErr = JSON.stringify(j).slice(0, 300)
    } catch (e: any) { lastErr = String(e?.message ?? e) }
  }
  console.warn('websearch failed:', lastErr)
  if (env.EXA_API_KEY) {
    const r = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.EXA_API_KEY },
      body: JSON.stringify({ query: q, numResults: limit, contents: { text: { maxCharacters: 1200 } } }),
    })
    if (r.ok) { const j: any = await r.json(); return { provider: 'exa', results: (j.results ?? []).map(norm) } }
  }
  return { provider: 'none', results: [] }
}

const norm = (x: any): WebResult => ({
  title: String(x.title ?? x.name ?? x.url ?? ''),
  url: String(x.url ?? x.link ?? ''),
  text: String(x.text ?? x.snippet ?? x.content ?? x.description ?? '').slice(0, 1200),
})

/** Questions about recent or factual outside things benefit from search; craft questions usually do not. */
export const wantsSearch = (q: string) =>
  /\b(latest|newest|recent|news|release|version|update|202[4-9]|who (directed|made|animated)|box office|award|oscar|price|download|plugin|add-?on)\b|最新|新闻|ニュース|最近/i.test(q)

export const asContext = (rs: WebResult[]) =>
  rs.map((r, i) => `[${i + 1}] ${r.title} (${r.url})\n${r.text}`).join('\n\n')
