<script setup lang="ts">
import Mascot from '../components/Mascot.vue'
import { computed, ref } from 'vue'
import { SCENES, CAT_MAP } from '../lib/content'
import { useApp } from '../stores/app'
const app = useApp()
const genres = Array.from(new Set(SCENES.map((m) => m.genre))).sort()
const g = ref<string | null>(null)
const list = computed(() => SCENES.filter((m) => !g.value || m.genre === g.value))
const score = (id: string) => app.results[`scene:${id}`]
const passed = computed(() => SCENES.filter((m) => { const r = score(m.id); return r && r.correct / r.total >= 2 / 3 }).length)
const depts = (ids: string[]) => Array.from(new Set(ids))
</script>

<template>
  <div class="wrap">
    <header class="phead"><h1>Build a scene <span class="tr" translate="no">搭建场景 · シーンを作る</span></h1><Mascot pose="clap" :size="96" /></header>
    <p class="read muted">Each scene is a story situation on a virtual set. You make the choices, department by department: story, camera, light, edit, sound, animation, Blender. Pass a scene with two thirds right; pass {{ Math.ceil(SCENES.length * 0.7) }} to complete the final test.</p>
    <p><strong>{{ passed }} / {{ SCENES.length }}</strong> passed</p>
    <div class="row filters"><button class="chip" :class="{ on: !g }" @click="g = null">All</button>
      <button v-for="x in genres" :key="x" class="chip" :class="{ on: g === x }" @click="g = x">{{ x }}</button></div>
    <div class="list">
      <RouterLink v-for="m in list" :key="m.id" :to="`/scenes/${m.id}`" class="scene">
        <div class="grow">
          <h2>{{ m.title }} <span class="genre">{{ m.genre }}</span></h2>
          <p class="muted">{{ m.setup }}</p>
          <div class="row depts"><span v-for="d in depts(m.checkpoints.map((c) => c.dept))" :key="d" class="chip small"><span class="dot" :style="{ background: CAT_MAP[d].color }" />{{ CAT_MAP[d].name }}</span></div>
        </div>
        <span v-if="score(m.id)" class="chip" :class="{ on: score(m.id).correct / score(m.id).total >= 2 / 3 }">{{ score(m.id).correct }}/{{ score(m.id).total }}</span>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.tr { font-weight: 400; font-size: 1rem; color: var(--muted); }
.filters { margin: .5rem 0 1rem; }
.list { display: grid; gap: .6rem; }
.scene { display: flex; gap: 1rem; align-items: center; text-decoration: none; padding: 1rem; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; }
.scene:hover { border-color: var(--muted); }
.scene h2 { font-size: 1.1rem; margin: 0; }
.scene p { margin: .3rem 0 .5rem; }
.genre { font-size: .8rem; font-weight: 600; color: var(--vol); margin-left: .4rem; }
.depts { gap: .3rem; }
.small { font-size: .75rem; }
.dot { width: .5rem; height: .5rem; border-radius: 50%; display: inline-block; }
</style>
