<script setup lang="ts">
import { ref } from 'vue'
import Mascot from '../components/Mascot.vue'
import { useApp } from '../stores/app'
import { usePageContext } from '../lib/context'

const app = useApp()
const OUTFITS: [string, string, string, string][] = [
  ['outfit_daily', 'Daily', '日常', '普段着'], ['outfit_college', 'College', '大学', '大学'], ['outfit_school', 'School uniform', '校服', '制服'],
  ['outfit_date', 'Cinema date', '约会', 'デート'], ['outfit_sleep', 'Pajamas', '睡衣', 'パジャマ'], ['outfit_beach', 'Beach', '海边', 'ビーチ'],
]
const POSES = ['wave', 'smile', 'point', 'think', 'laugh', 'cheer', 'thumbs', 'surprised', 'oops', 'study', 'sleep', 'sign', 'director', 'clap', 'head'] as const
const SHEETS: [string, string][] = [['cand1_hikari', 'Hikari — chosen'], ['cand2_sakura', 'Sakura'], ['cand3_aoi', 'Aoi'], ['cand4_mikan', 'Mikan'], ['cand5_hina', 'Hina'], ['ref', 'Hikari reference']]
const big = ref<string | null>(null)
usePageContext(() => ({ kind: 'page', label: 'Gallery', text: 'Gallery page: Hikari’s outfits, poses and the character design sheets.' }))
</script>

<template>
  <div class="wrap">
    <header class="phead"><h1>Gallery <span class="tr" translate="no"><span lang="zh-CN">画廊</span> · <span lang="ja">ギャラリー</span></span></h1><Mascot pose="director" :size="100" /></header>
    <p class="read muted">Hikari (ひかり / 小光) is your film-club director and tutor. Pick an outfit for her on the home page, or look through the design sheets.</p>

    <h2>Outfits</h2>
    <div class="grid outfits">
      <button v-for="[id, en, zh, ja] in OUTFITS" :key="id" class="card" :class="{ on: app.outfit === id }" @click="app.setOutfit(app.outfit === id ? '' : id)">
        <img :src="`/outfits/${id}.webp`" :alt="`Hikari, ${en} outfit`" loading="lazy" />
        <b>{{ en }}</b><small translate="no"><span lang="zh-CN">{{ zh }}</span> · <span lang="ja">{{ ja }}</span></small>
        <span class="tag">{{ app.outfit === id ? 'On the home page' : 'Use on home page' }}</span>
      </button>
    </div>

    <h2>Poses</h2>
    <div class="grid poses">
      <figure v-for="p in POSES" :key="p" class="card"><Mascot :pose="p" :size="140" /><figcaption>{{ p }}</figcaption></figure>
    </div>

    <h2>Design sheets</h2>
    <p class="muted small">Five candidates were drawn; Hikari won. Click a sheet to see it large.</p>
    <div class="grid sheets">
      <button v-for="[id, label] in SHEETS" :key="id" class="card" @click="big = id"><img :src="`/gallery/${id}.webp`" :alt="label" loading="lazy" /><b>{{ label }}</b></button>
    </div>

    <div v-if="big" class="scrim" @click="big = null" @keydown.esc="big = null">
      <img :src="`/gallery/${big}.webp`" alt="" />
    </div>
  </div>
</template>

<style scoped>
.tr { font-family: var(--ui); font-size: 1rem; color: var(--muted); }
h2 { margin-top: 1.6rem; }
.small { font-size: .85rem; }
.grid { display: grid; gap: .9rem; }
.outfits { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
.poses { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
.sheets { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.card { display: grid; justify-items: center; gap: .25rem; margin: 0; padding: .7rem; background: var(--panel); border: 2px solid var(--edge); border-radius: 16px; box-shadow: var(--shadow-sm); text-align: center; }
button.card:hover { background: #fff6dc; }
.card.on { background: var(--pop); }
.outfits img { height: 220px; width: auto; filter: drop-shadow(2px 3px 0 rgb(26 23 18 / .18)); }
.sheets img { width: 100%; border-radius: 10px; }
.card small { color: var(--muted); }
.tag { font-size: .75rem; font-weight: 800; color: var(--sun-deep); }
figcaption { font-size: .8rem; color: var(--muted); font-weight: 700; }
.scrim { position: fixed; inset: 0; z-index: 60; background: rgb(26 23 18 / .75); display: grid; place-items: center; padding: 16px; cursor: zoom-out; }
.scrim img { max-width: 100%; max-height: 92dvh; border: 3px solid #fff; border-radius: 12px; }
</style>
