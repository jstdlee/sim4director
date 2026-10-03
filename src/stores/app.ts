import { defineStore } from 'pinia'
import { load, save } from '../lib/storage'

export interface ByokCfg { provider: 'workers-ai' | 'openai' | 'anthropic' | 'google-ai-studio' | 'openai-compatible'; model: string; key: string; baseUrl?: string }
type Result = { correct: number; total: number; at: number }

export const useApp = defineStore('app', {
  state: () => ({
    uid: load<string>('sd.uid', '') || (() => { const id = crypto.randomUUID(); save('sd.uid', id); return id })(),
    results: load<Record<string, Result>>('sd.results', {}),
    termStats: load<Record<string, { seen: number; correct: number }>>('sd.terms', {}),
    byok: load<ByokCfg>('sd.byok', { provider: 'workers-ai', model: '', key: '' }),
    openTerm: null as string | null,
    chatOpen: false,
    searchOpen: false,
    chatDraft: '',
    chatContext: '',
    /** null until /api/session has answered. */
    authed: null as boolean | null,
  }),
  getters: {
    levelProgress: (s) => (ids: string[]) => ids.filter((id) => s.results[id]).length,
    mastery: (s) => (term: string) => { const t = s.termStats[term]; return t ? t.correct / Math.max(t.seen, 1) : null },
    byokPayload: (s) => (s.byok.key || s.byok.provider === 'workers-ai' && s.byok.model ? { ...s.byok } : null),
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
    reset() { this.results = {}; this.termStats = {}; save('sd.results', {}); save('sd.terms', {}) },
  },
})
