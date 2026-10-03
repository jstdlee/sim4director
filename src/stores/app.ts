import { defineStore } from 'pinia'
import { load, save } from '../lib/storage'

export interface ByokCfg { provider: 'workers-ai' | 'openai' | 'anthropic' | 'google-ai-studio' | 'openai-compatible'; model: string; key: string; baseUrl?: string; thinking?: 'off' | 'low' | 'high' }
/** Web search options. Empty fields use the server defaults (Cloudflare Web Search, server Exa key). */
export interface SearchCfg { mode: 'auto' | 'always' | 'off'; cfProvider: '' | 'ceramic' | 'exa' | 'linkup'; exaKey: string; numResults: number; exaType: 'auto' | 'fast' | 'neural' | 'keyword' }
export const SEARCH_DEFAULTS: SearchCfg = { mode: 'auto', cfProvider: '', exaKey: '', numResults: 5, exaType: 'auto' }
type Result = { correct: number; total: number; at: number }

/** What Hikari sees: a short label for the chip and the full text sent with each message. */
export interface ScreenContext {
  kind: 'question' | 'term' | 'scene' | 'lab' | 'page'
  label: string
  text: string
  /** Question state, used to pick the quick prompts. */
  answered?: boolean
}

export const useApp = defineStore('app', {
  state: () => ({
    uid: load<string>('sd.uid', '') || (() => { const id = crypto.randomUUID(); save('sd.uid', id); return id })(),
    results: load<Record<string, Result>>('sd.results', {}),
    termStats: load<Record<string, { seen: number; correct: number }>>('sd.terms', {}),
    byok: load<ByokCfg>('sd.byok', { provider: 'workers-ai', model: '', key: '', thinking: 'off' }),
    search: { ...SEARCH_DEFAULTS, ...load<Partial<SearchCfg>>('sd.search', {}) } as SearchCfg,
    openTerm: null as string | null,
    /** Term at the center of the knowledge-map modal. */
    mapTerm: null as string | null,
    chatOpen: false,
    /** Text to put in the chat box when the chat opens (from search or Explore chips). */
    chatDraft: '',
    /** Hikari's outfit on the home banner ('' = default wave pose). */
    outfit: load<string>('sd.outfit', ''),
    /** Active page language (Google Translate); 'en' = original. */
    lang: 'en',
    /** Set by the current page (question, simulator, …). */
    pageContext: null as ScreenContext | null,
    /** Set while a term card is open, or kept when the learner asks Hikari from it. Wins over pageContext. */
    pinnedContext: null as ScreenContext | null,
    /** null until /api/session has answered. */
    authed: null as boolean | null,
  }),
  getters: {
    levelProgress: (s) => (ids: string[]) => ids.filter((id) => s.results[id]).length,
    mastery: (s) => (term: string) => { const t = s.termStats[term]; return t ? t.correct / Math.max(t.seen, 1) : null },
    byokPayload: (s) => (s.byok.provider === 'openai-compatible' ? (s.byok.baseUrl && s.byok.model ? { ...s.byok } : null)
      : s.byok.key || (s.byok.provider === 'workers-ai' && (s.byok.model || (s.byok.thinking ?? 'off') !== 'off')) ? { ...s.byok } : null),
    searchPayload: (s) => ({ mode: s.search.mode, cfProvider: s.search.cfProvider || undefined, exaKey: s.search.exaKey || undefined, numResults: s.search.numResults, exaType: s.search.exaType }),
  },
  actions: {
    record(qid: string, correct: number, total: number, terms: string[]) {
      this.results[qid] = { correct, total, at: Date.now() }
      for (const t of terms) {
        const cur = this.termStats[t] ?? { seen: 0, correct: 0 }
        this.termStats[t] = { seen: cur.seen + 1, correct: cur.correct + (correct === total ? 1 : 0) }
      }
      save('sd.results', this.results); save('sd.terms', this.termStats)
    },
    setByok(cfg: ByokCfg) { this.byok = cfg; save('sd.byok', cfg) },
    setSearch(cfg: SearchCfg) { this.search = cfg; save('sd.search', cfg) },
    setOutfit(o: string) { this.outfit = o; save('sd.outfit', o) },
    reset() { this.results = {}; this.termStats = {}; save('sd.results', {}); save('sd.terms', {}) },
  },
})
