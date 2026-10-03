<script setup lang="ts">
import Mascot from '../components/Mascot.vue'
import { computed, ref } from 'vue'
import { TERMS, CATS, CAT_MAP, TERM_MAP } from '../lib/content'
import { useApp } from '../stores/app'

const app = useApp()
const q = ref(''), cats = ref<string[]>([]), weakOnly = ref(false), study = ref(false)
const toggle = (t: string) => (cats.value = cats.value.includes(t) ? cats.value.filter((x) => x !== t) : [...cats.value, t])
const list = computed(() => TERMS.filter((t) =>
  (!q.value || (t.name + t.zh + t.ja + t.short).toLowerCase().includes(q.value.toLowerCase())) &&
  (!cats.value.length || cats.value.includes(t.cat)) &&
  (!weakOnly.value || (app.mastery(t.id) ?? 0) < 0.7)))

// Flashcard mode: front shows one language, the back shows everything.
const flipped = ref<Record<string, boolean>>({})
const front = ref<'name' | 'zh' | 'ja'>('name')
</script>

<template>
  <div class="wrap">
    <header class="phead"><h1>Concept cards <span class="tr" translate="no">概念卡 · 概念カード</span></h1><Mascot pose="study" :size="96" /></header>
    <div class="row filters">
      <input v-model="q" class="grow" placeholder="Search English / 中文 / 日本語" aria-label="Search terms" />
      <label class="row"><input v-model="weakOnly" type="checkbox" style="width:auto" /> Needs review</label>
      <label class="row"><input v-model="study" type="checkbox" style="width:auto" /> Flashcard mode</label>
      <select v-if="study" v-model="front" style="width:auto" aria-label="Card front">
        <option value="name">Front: English</option><option value="zh">Front: 中文</option><option value="ja">Front: 日本語</option>
      </select>
    </div>
    <div class="row tagbar">
      <button v-for="c in CATS" :key="c.id" class="chip" :class="{ on: cats.includes(c.id) }" @click="toggle(c.id)">
        <span class="dot" :style="{ background: c.color }" />{{ c.name }}</button>
    </div>
    <p class="muted">{{ list.length }} cards</p>
    <div class="grid">
      <article v-for="t in list" :key="t.id" class="card" :style="{ borderTopColor: CAT_MAP[t.cat].color }">
        <template v-if="study && !flipped[t.id]">
          <button class="front" translate="no" @click="flipped[t.id] = true">{{ t[front] }}</button>
          <p class="muted small">Say what it means, then tap to flip.</p>
        </template>
        <template v-else>
          <button class="title" @click="app.openTerm = t.id">{{ t.name }}</button>
          <div class="langs" translate="no"><span lang="zh-CN">🇨🇳 {{ t.zh }}</span><span lang="ja">🇯🇵 {{ t.ja }}</span></div>
          <p class="read">{{ t.short }}</p>
          <div class="row"><button v-for="r in t.related.slice(0, 4)" :key="r" class="chip" @click="app.openTerm = r">{{ TERM_MAP[r]?.name ?? r }}</button></div>
          <button v-if="study" class="btn small again" @click="flipped[t.id] = false">Hide again</button>
        </template>
      </article>
    </div>
  </div>
</template>

<style scoped>
.tr { font-weight: 400; font-size: 1rem; color: var(--muted); }
.filters { margin: 1rem 0 .7rem; }
.tagbar { margin-bottom: .6rem; }
.dot { width: .55rem; height: .55rem; border-radius: 50%; display: inline-block; }
.grid { display: grid; gap: .8rem; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.card { border-top: 3px solid var(--vol); background: var(--panel); padding: .9rem 1rem 1rem; border-radius: 4px 4px 12px 12px; }
.title { background: none; border: 0; padding: 0; font-weight: 800; font-size: 1.1rem; text-align: left; }
.front { background: none; border: 0; padding: 1.4rem 0; width: 100%; font-weight: 800; font-size: 1.35rem; }
.langs { display: flex; flex-direction: column; color: var(--muted); font-size: .92rem; margin-top: .2rem; }
.card .read { font-size: .98rem; margin: .4rem 0; }
.small { font-size: .82rem; }
.again { margin-top: .6rem; }
</style>
