<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { usePageContext } from '../lib/context'
import Mascot from '../components/Mascot.vue'
import { useRoute } from 'vue-router'
import { TERMS, TERM_MAP, TERM_WEIGHT, CATS, CAT_MAP, EXPLORE } from '../lib/content'
import { useApp } from '../stores/app'

const app = useApp(), route = useRoute()
const sel = ref<string>((route.query.term as string) || 'close_up')
const cat = ref<string | null>(null)
watch(() => route.query.term, (t) => { if (t) { sel.value = String(t); cat.value = null } })
// A click on a term opens the knowledge-map modal (MapModal, in App.vue) centered on it.
onMounted(() => { if (route.query.term) app.mapTerm = String(route.query.term) })
usePageContext(() => ({ kind: 'page', label: cat.value ? `Knowledge map · ${CAT_MAP[cat.value].name}` : 'Knowledge map', text: `Knowledge map page.${cat.value ? ` Department filter: ${CAT_MAP[cat.value].name}.` : ''} Departments: ${CATS.map((c) => c.name).join(', ')}.` }))

const maxW = Math.max(...Object.values(TERM_WEIGHT))
const cloud = computed(() => TERMS.filter((t) => !cat.value || t.cat === cat.value).sort((a, b) => a.name.localeCompare(b.name)).map((t) => {
  const w = TERM_WEIGHT[t.id] ?? 1, m = app.mastery(t.id)
  return { ...t, size: 0.8 + (w / maxW) * 1.5, color: m === null ? 'var(--muted)' : m >= 0.7 ? 'var(--call)' : m >= 0.4 ? 'var(--vol)' : 'var(--put)' }
}))

// Atlas: one hub per category, ring of hubs, each sized by term count, filled by mastery.
const atlas = computed(() => CATS.map((c, k) => {
  const ts = TERMS.filter((t) => t.cat === c.id)
  const seen = ts.filter((t) => app.mastery(t.id) !== null)
  const good = ts.filter((t) => (app.mastery(t.id) ?? 0) >= 0.7)
  const a = (2 * Math.PI * k) / CATS.length - Math.PI / 2
  return { ...c, n: ts.length, seen: seen.length, good: good.length, x: 320 + 250 * Math.cos(a), y: 230 + 180 * Math.sin(a) }
}))
// Cross-category links: how many related pairs join two categories.
const bridges = computed(() => {
  const m: Record<string, number> = {}
  for (const t of TERMS) for (const r of t.related) {
    const o = TERM_MAP[r]; if (!o || o.cat === t.cat) continue
    const k = [t.cat, o.cat].sort().join('|'); m[k] = (m[k] ?? 0) + 1
  }
  const pos = Object.fromEntries(atlas.value.map((a) => [a.id, a]))
  return Object.entries(m).map(([k, n]) => { const [a, b] = k.split('|'); return { a: pos[a], b: pos[b], n } })
})

// Radial graph: selected center, direct links ring 1, second-degree ring 2.
const W = 640, H = 440, cx = W / 2, cy = H / 2
const graph = computed(() => {
  const c = TERM_MAP[sel.value]
  if (!c) return { nodes: [], edges: [] }
  const r1 = Array.from(new Set([...c.related, ...TERMS.filter((t) => t.related.includes(c.id)).map((t) => t.id)])).filter((id) => TERM_MAP[id] && id !== c.id).slice(0, 10)
  const r2 = Array.from(new Set(r1.flatMap((id) => TERM_MAP[id].related))).filter((id) => TERM_MAP[id] && id !== c.id && !r1.includes(id)).slice(0, 14)
  const place = (ids: string[], R: number, off = 0) => ids.map((id, k) => ({ id, x: cx + R * Math.cos((2 * Math.PI * k) / ids.length + off), y: cy + R * 0.78 * Math.sin((2 * Math.PI * k) / ids.length + off), ring: R }))
  const nodes = [{ id: c.id, x: cx, y: cy, ring: 0 }, ...place(r1, 140), ...place(r2, 255, 0.2)]
  const pos = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const edges: [string, string][] = []
  for (const n of nodes) for (const r of TERM_MAP[n.id].related) if (pos[r] && (n.id < r || !TERM_MAP[r].related.includes(n.id))) edges.push([n.id, r])
  return { nodes, edges: edges.map(([a, b]) => ({ a: pos[a], b: pos[b], hot: a === c.id || b === c.id })) }
})
const cloudBox = ref<HTMLElement>()
const pickCat = (id: string) => { cat.value = cat.value === id ? null : id; nextTick(() => cloudBox.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })) }
</script>

<template>
  <div class="wrap">
    <header class="phead"><h1>Knowledge map <span class="tr" translate="no"><span lang="zh-CN">知识图谱</span> · <span lang="ja">知識マップ</span></span></h1><Mascot pose="point" :size="96" /></header>
    <p class="muted">Start with the atlas: each circle is a department of filmmaking. Lines show how many concepts link two departments. Click a department to filter the cloud below. Click a term to open its map, then its card.</p>

    <div class="graphbox">
      <svg viewBox="0 0 640 460" role="img" aria-label="Atlas of film-making departments">
        <line v-for="(b, k) in bridges" :key="k" :x1="b.a.x" :y1="b.a.y" :x2="b.b.x" :y2="b.b.y" stroke="var(--line)" :stroke-width="Math.min(1 + b.n * 0.6, 7)" stroke-linecap="round" />
        <g v-for="a in atlas" :key="a.id" class="node" tabindex="0" @click="pickCat(a.id)" @keydown.enter="pickCat(a.id)">
          <circle :cx="a.x" :cy="a.y" :r="10 + a.n * 0.55" :fill="a.color" :fill-opacity="cat === a.id ? 0.9 : 0.25" :stroke="a.color" stroke-width="2" />
          <circle :cx="a.x" :cy="a.y" :r="(10 + a.n * 0.55) * (a.n ? a.good / a.n : 0)" fill="var(--call)" fill-opacity=".7" />
          <text :x="a.x" :y="a.y - 14 - a.n * 0.55" text-anchor="middle" font-size="13" fill="var(--paper)" font-weight="700">{{ a.name }}</text>
          <text :x="a.x" :y="a.y + 4" text-anchor="middle" font-size="11" fill="var(--paper)">{{ a.good }}/{{ a.n }}</text>
        </g>
      </svg>
    </div>

    <h2>Term cloud <span v-if="cat" class="muted small">· {{ CAT_MAP[cat].name }} <button class="chip" @click="cat = null">show all</button></span></h2>
    <p class="muted small">Size shows how often a term appears in questions and scenes. Color shows mastery: green strong, amber shaky, red weak, grey unseen.</p>
    <div ref="cloudBox" class="cloud">
      <button v-for="t in cloud" :key="t.id" class="word" :class="{ sel: t.id === sel }" :style="{ fontSize: t.size + 'rem', color: t.color }" @click="app.mapTerm = t.id">{{ t.name }}</button>
    </div>


    <h2 class="next">Explore next <span class="tr" translate="no">拓展 · 次に学ぶ</span></h2>
    <p class="muted small">Concepts outside this deck. Ask the tutor about any of them, or see Sources.</p>
    <div class="row"><button v-for="x in EXPLORE" :key="x" class="chip" @click="app.chatDraft = `Explain: ${x}`; app.chatOpen = true">{{ x }}</button></div>
  </div>
</template>

<style scoped>
.tr { font-weight: 400; font-size: .95rem; color: var(--muted); }
.small { font-size: .85rem; }
.cloud { display: flex; flex-wrap: wrap; justify-content: center; gap: .2rem .9rem; align-items: baseline; padding: .5rem 0 2rem; }
.word { background: none; border: 0; padding: 0; font-weight: 600; line-height: 1.2; }
.word.sel { text-decoration: underline; text-underline-offset: 4px; }
.graphbox { overflow-x: auto; margin-bottom: 1rem; }
svg { width: 100%; min-width: 520px; height: auto; }
.node { cursor: pointer; }
.node:focus-visible circle { stroke: var(--vol); stroke-width: 3; }
.next { margin-top: 2rem; }
.focus { text-align: center; }
.scrim { position: fixed; inset: 0; background: rgb(8 10 20 / .6); z-index: 38; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal { width: min(900px, 100%); max-height: 92vh; overflow: auto; background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 1.2rem; box-shadow: 0 20px 50px rgb(0 0 0 / .45); }
.modal .head { text-align: left; }
.pop-enter-active, .pop-leave-active { transition: opacity .18s; }
.pop-enter-from, .pop-leave-to { opacity: 0; }
.focus svg { display: block; margin: 0 auto; max-width: 760px; }
.center { justify-content: center; }
</style>
