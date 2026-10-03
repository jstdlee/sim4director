<script setup lang="ts">
import { BANK, LEVELS, TOTAL, SCENES, TERMS, CAT_MAP } from '../lib/content'
import { useApp } from '../stores/app'
const app = useApp()
const done = (n: number) => app.levelProgress(BANK[n].map((q) => q.id))
const firstOpen = (n: number) => Math.max(0, BANK[n].findIndex((q) => !app.results[q.id]))
const catNames = (ids: string[]) => ids.map((id) => CAT_MAP[id].name).join(' · ')
const seenTerms = () => TERMS.filter((t) => app.termStats[t.id]).length
</script>

<template>
  <div class="wrap">
    <section class="hero">
      <h1>Learn to direct, one decision at a time.</h1>
      <p class="read muted">{{ TOTAL }} practice questions across eight levels, {{ TERMS.length }} linked terms in English, 中文 and 日本語, and {{ SCENES.length }} virtual scenes you build yourself. Compare every decision with Clef and ask the tutor why.</p>
      <p class="muted small">Terms practiced: {{ seenTerms() }} / {{ TERMS.length }}</p>
    </section>

    <ol class="ladder">
      <li v-for="l in LEVELS" :key="l.n" class="rung">
        <span class="n">{{ l.n }}</span>
        <div class="grow">
          <h2>{{ l.name }} <span class="tr" translate="no">{{ l.zh }} · {{ l.ja }}</span></h2>
          <p class="muted">{{ l.blurb }}</p>
          <div class="row cats"><span v-for="c in l.cats" :key="c" class="dot" :style="{ background: CAT_MAP[c].color }" :title="CAT_MAP[c].name" />
            <span class="muted small">{{ catNames(l.cats) }}</span></div>
          <div class="meter" :aria-label="`${done(l.n)} of ${BANK[l.n].length} done`"><span :style="{ width: (done(l.n) / BANK[l.n].length) * 100 + '%' }" /></div>
        </div>
        <RouterLink class="btn" :class="{ primary: done(l.n) < BANK[l.n].length }" :to="`/quest/${l.n}/${firstOpen(l.n)}`">
          {{ done(l.n) === 0 ? 'Start' : done(l.n) >= BANK[l.n].length ? 'Review' : 'Continue' }} · {{ done(l.n) }}/{{ BANK[l.n].length }}
        </RouterLink>
      </li>
      <li class="rung final">
        <span class="n">★</span>
        <div class="grow"><h2>Final test: build a scene <span class="tr" translate="no">搭建场景 · シーンを作る</span></h2><p class="muted">Get a story situation, then make every choice: story, shot, light, edit, sound, animation, Blender.</p></div>
        <RouterLink class="btn" to="/scenes">Open</RouterLink>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.hero { padding: 2.5rem 0 1.5rem; max-width: 46rem; }
.ladder { list-style: none; padding: 0; margin: 0; display: grid; gap: .6rem; }
.rung { display: flex; gap: 1rem; align-items: center; padding: 1rem; border: 1px solid var(--line); border-radius: 14px; background: var(--panel); flex-wrap: wrap; }
.rung h2 { font-size: 1.15rem; margin: 0; }
.rung p { margin: .1rem 0 .4rem; }
.tr { font-weight: 400; font-size: .9rem; color: var(--muted); margin-left: .4rem; }
.n { font-size: 2rem; font-weight: 800; width: 2.2rem; text-align: center; color: var(--vol); }
.cats { gap: .35rem; margin-bottom: .5rem; }
.dot { width: .6rem; height: .6rem; border-radius: 50%; display: inline-block; }
.small { font-size: .85rem; }
.meter { height: 6px; background: var(--ink); border-radius: 4px; overflow: hidden; max-width: 22rem; }
.meter span { display: block; height: 100%; background: var(--call); }
.final { border-style: dashed; }
</style>
