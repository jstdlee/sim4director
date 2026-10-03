<script setup lang="ts">
import { computed, watch } from 'vue'
import { useApp } from '../stores/app'
import { TERM_MAP, CAT_MAP } from '../lib/content'

const app = useApp()
const term = computed(() => (app.openTerm ? TERM_MAP[app.openTerm] : null))
const mastery = computed(() => (term.value ? app.mastery(term.value.id) : null))
watch(() => app.openTerm, (v) => { if (v) document.body.style.overflow = 'hidden'; else document.body.style.overflow = '' })
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') app.openTerm = null }
</script>

<template>
  <Transition name="sheet">
    <div v-if="app.openTerm" class="scrim" @click.self="app.openTerm = null" @keydown="onKey">
      <section class="sheet" role="dialog" aria-modal="true" :aria-label="term?.name ?? app.openTerm">
        <template v-if="term">
          <div class="row"><h2 class="grow big">{{ term.name }}</h2><button class="btn" @click="app.openTerm = null">Close</button></div>
          <div class="langs" translate="no"><span><b>中文</b> <span lang="zh-CN">{{ term.zh }}</span></span><span><b>日本語</b> <span lang="ja">{{ term.ja }}</span></span></div>
          <p class="read">{{ term.short }}</p>
          <div class="row tags"><span class="chip"><span class="dot" :style="{ background: CAT_MAP[term.cat].color }" />{{ CAT_MAP[term.cat].name }}</span>
            <span v-if="mastery !== null" class="chip">mastery {{ Math.round(mastery * 100) }}%</span></div>
          <h3>Connected terms</h3>
          <div class="row"><button v-for="r in term.related" :key="r" class="chip" @click="app.openTerm = r">{{ TERM_MAP[r]?.name ?? r }}</button></div>
          <div class="row foot">
            <RouterLink class="btn" :to="`/map?term=${term.id}`" @click="app.openTerm = null">See on the knowledge map</RouterLink>
            <button class="btn" @click="app.chatContext = `Explain the term: ${term.name} (${term.zh} / ${term.ja})`; app.chatOpen = true; app.openTerm = null">Ask the tutor</button>
          </div>
        </template>
        <p v-else>Term “{{ app.openTerm }}” isn’t in the glossary yet.</p>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.scrim { position: fixed; inset: 0; background: rgb(8 10 20 / .6); z-index: 40; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.sheet { width: min(820px, 100%); max-height: 88vh; font-size: 1.08rem; overflow: auto; background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 1.8rem; box-shadow: 0 20px 50px rgb(0 0 0 / .45); }
.big { font-size: 2rem; }
.sheet .read { font-size: 1.2rem; max-width: none; }
.langs { font-size: 1.15rem; display: flex; gap: 1.2rem; flex-wrap: wrap; color: var(--vol); margin-bottom: .6rem; }
.langs b { color: var(--muted); font-weight: 600; margin-right: .3rem; }
.dot { width: .55rem; height: .55rem; border-radius: 50%; display: inline-block; }
.tags { margin: .5rem 0 1rem; }
.foot { margin-top: 1.2rem; }
.sheet-enter-active, .sheet-leave-active { transition: opacity .18s; }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform .22s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(12px) scale(.98); }
</style>
