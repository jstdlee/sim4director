<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { TERMS, BANK, SCENES, CAT_MAP, LEVELS, SOURCES, EXPLORE } from '../lib/content'
import { useApp } from '../stores/app'

// One search box for terms (en / 中文 / 日本語), questions and scenes. Ctrl+K or / opens it.
const app = useApp(), router = useRouter()
const q = ref(''), cur = ref(0), input = ref<HTMLInputElement>()

type Hit = { kind: 'Term' | 'Question' | 'Scene' | 'Level' | 'Page' | 'Source' | 'Topic' | 'Web' | 'Ask'; title: string; sub: string; go: () => void; score: number }
const plain = (s: string) => s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, id, l) => l ?? id)
const questions = Object.entries(BANK).flatMap(([lv, qs]) => qs.map((x, i) => ({ x, lv: Number(lv), i })))
const PAGES: [string, string, string][] = [['/', 'Journey', 'levels, progress'], ['/cards', 'Concept cards', 'flashcards, all terms'], ['/map', 'Knowledge map', 'atlas, term cloud, connections'],
  ['/scenes', 'Build a scene', 'final test, 100+ virtual scenes'], ['/lab', 'Lab', 'shot calculator, depth of field, field of view, bouncing ball timing'], ['/sources', 'Sources', 'books, channels, tools'], ['/settings', 'Settings', 'AI model, BYOK, OpenAI-compatible, progress, sign out']]
const web = ref<{ title: string; url: string; text: string }[]>([]), webBusy = ref(false), webErr = ref('')
async function searchWeb(query: string) {
  webBusy.value = true; webErr.value = ''; web.value = []
  try {
    const r = await fetch('/api/websearch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) })
    const j: any = await r.json()
    web.value = j.results ?? []
    if (!web.value.length) webErr.value = 'No web results. The server may need web search set up (see Settings).'
  } catch { webErr.value = 'Web search failed.' }
  webBusy.value = false
}

const hits = computed<Hit[]>(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return []
  const rank = (title: string, body: string) => (title.toLowerCase().startsWith(s) ? 3 : title.toLowerCase().includes(s) ? 2 : body.toLowerCase().includes(s) ? 1 : 0)
  const out: Hit[] = []
  for (const t of TERMS) {
    const score = Math.max(rank(t.name, t.short), rank(t.zh, ''), rank(t.ja, ''))
    if (score) out.push({ kind: 'Term', title: t.name, sub: `${t.zh} · ${t.ja} · ${CAT_MAP[t.cat].name}`, score: score + 1, go: () => (app.openTerm = t.id) })
  }
  for (const { x, lv, i } of questions) {
    const score = rank(x.title, plain(x.scenario) + ' ' + x.steps.map((st) => plain(st.prompt) + ' ' + st.choices.map((c) => c.label).join(' ')).join(' '))
    if (score) out.push({ kind: 'Question', title: x.title, sub: `Level ${lv} · ${plain(x.scenario).slice(0, 90)}`, score: score - (x.generated ? 0.5 : 0), go: () => router.push(`/quest/${lv}/${i}`) })
  }
  for (const l of LEVELS) { const score = Math.max(rank(l.name, l.blurb), rank(l.zh, ''), rank(l.ja, '')); if (score) out.push({ kind: 'Level', title: `Level ${l.n}: ${l.name}`, sub: `${l.zh} · ${l.ja} · ${l.blurb}`, score: score + 0.5, go: () => router.push(`/quest/${l.n}/0`) }) }
  for (const [to, name, kw] of PAGES) { const score = rank(name, kw); if (score) out.push({ kind: 'Page', title: name, sub: kw, score: score + 0.5, go: () => router.push(to) }) }
  for (const g of SOURCES) for (const l of g.links) { const score = rank(l.name, g.group); if (score) out.push({ kind: 'Source', title: l.name, sub: g.group, score, go: () => window.open(l.url, '_blank', 'noopener') }) }
  for (const x of EXPLORE) { const score = rank(x, ''); if (score) out.push({ kind: 'Topic', title: x, sub: 'Not in the deck yet · ask the tutor', score, go: () => { app.chatContext = `Explain: ${x}`; app.chatOpen = true } }) }
  for (const m of SCENES) {
    const score = rank(m.title, m.genre + ' ' + m.setup)
    if (score) out.push({ kind: 'Scene', title: m.title, sub: `${m.genre} · ${m.setup.slice(0, 90)}`, score, go: () => router.push(`/scenes/${m.id}`) })
  }
  const top = out.sort((a, b) => b.score - a.score).slice(0, 40)
  top.push({ kind: 'Ask', title: `Ask the tutor: “${q.value.trim()}”`, sub: 'Saved answers come back at once; new ones use the AI', score: 0, go: () => { app.chatContext = ''; app.chatOpen = true; app.chatDraft = q.value.trim() } })
  top.push({ kind: 'Web', title: `Search the web: “${q.value.trim()}”`, sub: 'Cloudflare Web Search, Exa as backup', score: 0, go: () => searchWeb(q.value.trim()) })
  return top
})
watch(q, () => { cur.value = 0; web.value = []; webErr.value = '' })
watch(() => app.searchOpen, (o) => { if (o) { q.value = ''; nextTick(() => input.value?.focus()) } })

function choose(h?: Hit) { if (!h) return; if (h.kind !== 'Web') app.searchOpen = false; h.go() }
function onList(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') { cur.value = Math.min(cur.value + 1, hits.value.length - 1); e.preventDefault() }
  else if (e.key === 'ArrowUp') { cur.value = Math.max(cur.value - 1, 0); e.preventDefault() }
  else if (e.key === 'Enter') choose(hits.value[cur.value])
  else if (e.key === 'Escape') app.searchOpen = false
}
const onGlobal = (e: KeyboardEvent) => {
  const typing = (e.target as HTMLElement)?.closest('input,textarea,select')
  if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) { e.preventDefault(); app.searchOpen = true }
}
onMounted(() => window.addEventListener('keydown', onGlobal))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobal))
</script>

<template>
  <div v-if="app.searchOpen" class="scrim" @click.self="app.searchOpen = false">
    <section class="box" role="dialog" aria-modal="true" aria-label="Search">
      <input ref="input" v-model="q" placeholder="Search everything · 搜索 · 検索" aria-label="Search" @keydown="onList" />
      <ul v-if="hits.length" class="list">
        <li v-for="(h, i) in hits" :key="h.kind + h.title + i">
          <button :class="{ cur: i === cur }" @mouseenter="cur = i" @click="choose(h)">
            <span class="kind">{{ h.kind }}</span><span class="grow"><b>{{ h.title }}</b><br /><span class="muted small" translate="no">{{ h.sub }}</span></span>
          </button>
        </li>
      </ul>
      <p v-if="webBusy" class="muted empty">Searching the web…</p>
      <p v-else-if="webErr" class="muted empty">{{ webErr }}</p>
      <ol v-if="web.length" class="webres"><li v-for="w in web" :key="w.url"><a :href="w.url" target="_blank" rel="noopener">{{ w.title || w.url }}</a><p class="muted small">{{ w.text.slice(0, 180) }}</p></li></ol>
      <p v-else-if="!q" class="muted empty">Type to search. ↑ ↓ to move, Enter to open, Esc to close.</p>
    </section>
  </div>
</template>

<style scoped>
.scrim { position: fixed; inset: 0; background: rgb(8 10 20 / .6); z-index: 50; display: flex; justify-content: center; align-items: flex-start; padding: 12vh 1rem 1rem; }
.box { width: min(640px, 100%); background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: .8rem; box-shadow: 0 20px 50px rgb(0 0 0 / .45); }
input { font-size: 1.05rem; }
.list { list-style: none; margin: .6rem 0 0; padding: 0; max-height: 55vh; overflow: auto; }
.list button { display: flex; gap: .8rem; align-items: flex-start; width: 100%; text-align: left; background: none; border: 0; border-radius: 10px; padding: .55rem .6rem; }
.list button.cur { background: var(--ink); }
.kind { font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: var(--vol); min-width: 4.8rem; padding-top: .2rem; }
.small { font-size: .84rem; }
.empty { margin: .8rem .3rem .3rem; }
.webres { margin: .6rem 0 0; padding-left: 1.2rem; max-height: 35vh; overflow: auto; }
.webres a { color: var(--vol); }
.webres p { margin: .1rem 0 .5rem; }
</style>
