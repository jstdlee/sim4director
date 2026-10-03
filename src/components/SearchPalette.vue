<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { BANK, LEVELS, SCENES, TERMS, CAT_MAP, SOURCES, EXPLORE } from '../lib/content'
import { plain } from '../lib/api'
import { useApp } from '../stores/app'

// One search for everything: pages, terms (en / 中文 / 日本語), questions, scenes, levels, sources, topics, and the web.
// Opens with the search icon, Ctrl+K or Ctrl+P. No open/close animation (keyboard, many times a day).
type Item = { group: string; icon: string; title: string; sub: string; hay: string; go: () => void }

const app = useApp()
const router = useRouter()
const open = ref(false)
const q = ref('')
const sel = ref(0)
const input = ref<HTMLInputElement>()
const list = ref<HTMLElement>()
let returnTo: HTMLElement | null = null

const low = (s: string) => s.toLowerCase()
const PAGES: [string, string, string, string][] = [['/', 'Journey', 'fa-route', 'levels progress'], ['/cards', 'Concept cards', 'fa-layer-group', 'flashcards glossary'], ['/map', 'Knowledge map', 'fa-diagram-project', 'atlas graph cloud'], ['/scenes', 'Build a scene', 'fa-clapperboard', 'final test'], ['/lab', 'Lab', 'fa-camera', 'shot calculator depth of field fov lens bouncing ball timing'], ['/gallery', 'Gallery', 'fa-images', 'hikari art outfits poses'], ['/sources', 'Sources', 'fa-book-open', 'books channels tools'], ['/settings', 'Settings', 'fa-gear', 'model byok openai compatible search exa']]

const index: Item[] = [
  ...PAGES.map(([to, title, icon, kw]) => ({ group: 'Pages', icon, title, sub: '', hay: low(`${title} ${kw}`), go: () => router.push(to) })),
  ...LEVELS.map((l) => ({ group: 'Levels', icon: 'fa-stairs', title: `Level ${l.n}: ${l.name}`, sub: `${l.zh} · ${l.ja} · ${l.blurb}`, hay: low(`${l.name} ${l.zh} ${l.ja} ${l.blurb} level ${l.n}`), go: () => router.push(`/quest/${l.n}/0`) })),
  ...TERMS.map((t) => ({ group: 'Terms', icon: 'fa-book', title: t.name, sub: `${t.zh} · ${t.ja} · ${t.short}`, hay: low(`${t.name} ${t.id} ${t.zh} ${t.ja} ${CAT_MAP[t.cat].name} ${t.short}`), go: () => { app.openTerm = t.id } })),
  ...SCENES.map((m) => ({ group: 'Scenes', icon: 'fa-clapperboard', title: m.title, sub: `${m.genre} · ${m.setup}`, hay: low(`${m.title} ${m.genre} ${m.setup} ${m.goal} ${m.tags.join(' ')} ${m.terms.join(' ')}`), go: () => router.push(`/scenes/${m.id}`) })),
  ...SOURCES.flatMap((g) => g.links.map((l) => ({ group: 'Sources', icon: 'fa-book-open', title: l.name, sub: g.group, hay: low(`${l.name} ${g.group}`), go: () => window.open(l.url, '_blank', 'noopener') }))),
  ...EXPLORE.map((x) => ({ group: 'Topics', icon: 'fa-compass', title: x, sub: 'Not in the deck yet · ask Hikari', hay: low(x), go: () => askHikari(`Explain: ${x}`) })),
  ...LEVELS.flatMap((l) => BANK[l.n].map((qq, i) => ({
    group: 'Questions', icon: 'fa-circle-question', title: qq.title, sub: `Level ${l.n} · ${plain(qq.scenario)}`,
    hay: low(`${qq.title} ${plain(qq.scenario)} ${qq.steps.map((st) => plain(st.prompt)).join(' ')} ${qq.terms.join(' ')} ${qq.tags.join(' ')} level ${l.n} ${l.name}`),
    go: () => router.push(`/quest/${l.n}/${i}`),
  }))),
]
const LIMIT: Record<string, number> = { Pages: 4, Levels: 3, Terms: 8, Scenes: 6, Questions: 8, Sources: 4, Topics: 3 }

// Every word must match; titles that start with the query rank first.
const results = computed(() => {
  const words = low(q.value).split(/\s+/).filter(Boolean)
  if (!words.length) return [] as Item[]
  const scored = index
    .filter((it) => words.every((w) => it.hay.includes(w)))
    .map((it) => { const t = low(it.title); return { it, score: (t.startsWith(words[0]) ? 3 : 0) + (words.every((w) => t.includes(w)) ? 2 : 0) - t.length / 200 } })
    .sort((a, b) => b.score - a.score)
  const out: Item[] = []
  for (const g of Object.keys(LIMIT)) out.push(...scored.filter((x) => x.it.group === g).slice(0, LIMIT[g]).map((x) => x.it))
  // Always offer: ask Hikari, or search the web.
  const text = q.value.trim()
  out.push({ group: 'More', icon: 'fa-comment-dots', title: `Ask Hikari: “${text}”`, sub: 'Saved answers come back at once; new ones use the AI', hay: '', go: () => askHikari(text) })
  out.push({ group: 'More', icon: 'fa-globe', title: `Search the web: “${text}”`, sub: 'Cloudflare Web Search, Exa as backup', hay: '', go: () => searchWeb(text) })
  return out
})
function askHikari(text: string) { app.chatDraft = text; app.chatOpen = true }
const web = ref<{ title: string; url: string; text: string }[]>([]), webBusy = ref(false), webErr = ref('')
async function searchWeb(query: string) {
  open.value = true; webBusy.value = true; webErr.value = ''; web.value = []
  try {
    const j: any = await fetch('/api/websearch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) }).then((r) => r.json())
    web.value = j.results ?? []
    if (!web.value.length) webErr.value = j.error ?? 'No web results. Web search may need credits or an Exa key (Settings).'
  } catch { webErr.value = 'Web search failed.' }
  webBusy.value = false
}
const counts = computed(() => {
  const words = low(q.value).split(/\s+/).filter(Boolean)
  const c: Record<string, number> = {}
  if (words.length) for (const it of index) if (words.every((w) => it.hay.includes(w))) c[it.group] = (c[it.group] ?? 0) + 1
  return c
})
watch(q, () => { sel.value = 0; web.value = []; webErr.value = '' })

async function show() {
  returnTo = document.activeElement as HTMLElement | null
  open.value = true
  await nextTick()
  input.value?.focus()
  input.value?.select()
}
function hide() { open.value = false; returnTo?.focus?.() }
function run(it?: Item) { if (!it) return; if (it.icon === 'fa-globe') { it.go(); return } open.value = false; q.value = ''; it.go() }
function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') { e.preventDefault(); sel.value = Math.min(sel.value + 1, results.value.length - 1); scrollSel() }
  else if (e.key === 'ArrowUp') { e.preventDefault(); sel.value = Math.max(sel.value - 1, 0); scrollSel() }
  else if (e.key === 'Enter') { e.preventDefault(); run(results.value[sel.value]) }
  else if (e.key === 'Escape') { e.preventDefault(); hide() }
}
const scrollSel = () => nextTick(() => list.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }))
const onGlobal = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'p')) { e.preventDefault(); open.value ? hide() : show() }
}
onMounted(() => window.addEventListener('keydown', onGlobal))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobal))
defineExpose({ show })
</script>

<template>
  <button class="icon-btn" aria-label="Search everything (Ctrl+K)" title="Search everything (Ctrl+K)" @click="show"><i class="fa-solid fa-magnifying-glass" /></button>
  <Teleport to="body">
    <div v-if="open" class="scrim" @pointerdown.self="hide">
      <div class="palette" role="dialog" aria-modal="true" aria-label="Search" @keydown="onKey">
        <div class="field">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input id="site-search" ref="input" v-model="q" type="search" placeholder="Search everything · 搜索 · 検索…" autocomplete="off" spellcheck="false"
            role="combobox" aria-expanded="true" aria-controls="search-results" :aria-activedescendant="results.length ? `sr-${sel}` : undefined" />
          <kbd>Esc</kbd>
        </div>
        <div id="search-results" ref="list" class="results" role="listbox" aria-label="Results">
          <template v-for="(it, i) in results" :key="i">
            <div v-if="i === 0 || results[i - 1].group !== it.group" class="group" role="presentation">
              {{ it.group }} <span>{{ counts[it.group] }}</span></div>
            <div :id="`sr-${i}`" class="item" role="option" :aria-selected="i === sel" @pointerenter="sel = i" @click="run(it)">
              <i :class="['fa-solid', 'fa-fw', it.icon]" aria-hidden="true" />
              <div class="txt"><b>{{ it.title }}</b><small v-if="it.sub">{{ it.sub }}</small></div>
            </div>
          </template>
          <p v-if="webBusy" class="empty">Searching the web…</p>
          <p v-else-if="webErr" class="empty">{{ webErr }}</p>
          <ol v-if="web.length" class="web"><li v-for="w in web" :key="w.url"><a :href="w.url" target="_blank" rel="noopener noreferrer">{{ w.title || w.url }}</a><small>{{ w.text.slice(0, 160) }}</small></li></ol>
          <p v-if="!q" class="empty">Search {{ index.length }} items: pages, levels, terms in English / 中文 / 日本語, questions, scenes, sources and topics. Or ask Hikari, or search the web.</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.scrim { position: fixed; inset: 0; z-index: 70; background: rgb(26 23 18 / .3); display: flex; justify-content: center; align-items: flex-start; padding: calc(10vh + env(safe-area-inset-top, 0px)) 16px 16px; }
.palette { width: min(640px, 100%); max-height: min(560px, 78vh); display: flex; flex-direction: column; background: var(--panel); border: 2px solid var(--edge); border-radius: 18px; box-shadow: 5px 5px 0 var(--edge); overflow: hidden; }
.field { display: flex; align-items: center; gap: .6rem; padding: .7rem .9rem; border-bottom: 2px solid var(--edge); }
.field i { color: var(--muted); }
.field input { border: 0; padding: .2rem 0; font-size: 1.05rem; outline: none; background: transparent; }
kbd { font: 700 .72rem var(--ui); padding: .1rem .4rem; border: 1.5px solid var(--edge); border-radius: 6px; color: var(--muted); }
.results { overflow-y: auto; padding: .4rem; }
.group { display: flex; justify-content: space-between; padding: .55rem .6rem .25rem; font-size: .72rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); }
.item { display: flex; gap: .7rem; align-items: flex-start; padding: .5rem .6rem; border-radius: 10px; cursor: pointer; }
.item i { margin-top: .2rem; color: var(--sun); }
.item[aria-selected='true'] { background: var(--pop); }
.txt { min-width: 0; display: grid; }
.txt b { font-weight: 800; }
.txt small { color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.empty { margin: .8rem .6rem; color: var(--muted); }
.web { margin: .4rem .6rem; padding-left: 1.2rem; }
.web li { margin: .4rem 0; }
.web small { display: block; color: var(--muted); }
</style>
