<script setup lang="ts">
import { computed, watch } from 'vue'
import { useApp } from '../stores/app'
import { TERM_MAP, CAT_MAP } from '../lib/content'

const app = useApp()
const term = computed(() => (app.openTerm ? TERM_MAP[app.openTerm] : null))
const mastery = computed(() => (term.value ? app.mastery(term.value.id) : null))
watch(() => app.openTerm, (v) => { if (v) document.body.style.overflow = 'hidden'; else document.body.style.overflow = '' })

// While the card is open, Hikari talks about this term. "Ask Hikari" keeps it after the card closes.
let keep = false
watch(term, (t) => {
  if (t) {
    app.pinnedContext = { kind: 'term', label: `Term: ${t.name}`, text: `Term card: ${t.name} (${t.zh} / ${t.ja}), department ${CAT_MAP[t.cat].name}.\n${t.short}` }
  } else if (!keep && app.pinnedContext?.kind === 'term') app.pinnedContext = null
  keep = false
})
function askHikari() { keep = true; app.openTerm = null; app.chatOpen = true }
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') app.openTerm = null }
</script>

<template>
  <Transition name="sheet">
    <div v-if="app.openTerm" class="scrim" @click.self="app.openTerm = null" @keydown="onKey">
      <section class="sheet" role="dialog" aria-modal="true" :aria-label="term?.name ?? app.openTerm">
        <template v-if="term">
          <div class="row"><h2 class="grow">{{ term.name }}</h2><button class="icon-btn" aria-label="Close" title="Close (Esc)" @click="app.openTerm = null"><i class="fa-solid fa-xmark" /></button></div>
          <div class="langs" translate="no"><span><b>中文</b> <span lang="zh-CN">{{ term.zh }}</span></span><span><b>日本語</b> <span lang="ja">{{ term.ja }}</span></span></div>
          <p class="read">{{ term.short }}</p>
          <div class="row tags"><span class="chip"><span class="dot" :style="{ background: CAT_MAP[term.cat].color }" />{{ CAT_MAP[term.cat].name }}</span>
            <span v-if="mastery !== null" class="chip">mastery {{ Math.round(mastery * 100) }}%</span></div>
          <h3>Connected terms</h3>
          <div class="row"><button v-for="r in term.related" :key="r" class="chip" @click="app.openTerm = r">{{ TERM_MAP[r]?.name ?? r }}</button></div>
          <div class="row foot">
            <button class="btn" @click="app.mapTerm = term.id; app.openTerm = null"><i class="fa-solid fa-diagram-project" aria-hidden="true" />See it on the knowledge map</button>
            <button class="btn" @click="askHikari"><img class="ico" src="/hikari/head.webp" alt="" />Ask Hikari about it</button>
          </div>
        </template>
        <p v-else>Term “{{ app.openTerm }}” isn’t in the glossary yet.</p>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
/* Term card: a large centered card on desktop, a bottom sheet on phones. */
.scrim { position: fixed; inset: 0; background: rgb(26 23 18 / .35); z-index: 50; display: grid; place-items: center; padding: 16px; }
.sheet { width: min(720px, 100%); max-height: calc(100dvh - 32px); overflow: auto; background: var(--panel); border: 2px solid var(--edge); border-radius: 22px; box-shadow: 6px 6px 0 var(--edge); padding: 1.6rem 1.8rem 1.4rem; }
.sheet h2 { font-size: clamp(1.6rem, 4vw, 2.3rem); margin: 0; }
.sheet .read { font-size: 1.12rem; }
.formula { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 1rem; color: var(--teal); background: color-mix(in srgb, var(--teal) 8%, transparent); border-radius: 10px; padding: .5rem .8rem; }
.tags { margin: .5rem 0 1rem; }
.langs { display: flex; gap: 1.4rem; flex-wrap: wrap; font-size: 1.2rem; font-weight: 700; color: var(--teal); margin: .3rem 0 .6rem; }
.langs b { font-size: .8rem; color: var(--muted); margin-right: .35rem; }
.dot { width: .6rem; height: .6rem; border-radius: 50%; border: 1.5px solid var(--edge); display: inline-block; }
.foot { margin-top: 1.2rem; }
.sheet-enter-active, .sheet-leave-active { transition: opacity .18s cubic-bezier(.23, 1, .32, 1); }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform .2s cubic-bezier(.23, 1, .32, 1); }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: scale(.96); }
@media (max-width: 600px) {
  .scrim { place-items: end stretch; padding: 0; }
  .sheet { width: 100%; max-height: 85dvh; border-radius: 20px 20px 0 0; border-bottom: 0; box-shadow: none; padding: 1.2rem 1.2rem calc(1.2rem + env(safe-area-inset-bottom, 0px)); }
  .sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(40px); }
}
@media (prefers-reduced-motion: reduce) { .sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: none; } }
</style>
