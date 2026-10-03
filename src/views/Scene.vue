<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SCENES, CAT_MAP } from '../lib/content'
import StepPlayer from '../components/StepPlayer.vue'
import TermText from '../components/TermText.vue'
import type { Step } from '@shared/types'

const route = useRoute(), router = useRouter()
const idx = computed(() => SCENES.findIndex((m) => m.id === route.params.id))
const m = computed(() => SCENES[idx.value])
const finished = ref<null | { c: number; t: number }>(null)
const steps = computed<Step[]>(() => m.value?.checkpoints.map((cp) => ({ ...cp.step, brief: { label: cp.label, date: CAT_MAP[cp.dept].name, facts: cp.context.split(/(?<=[.!?])\s+(?=[A-Z0-9“"])/).map((x) => x.trim()).filter(Boolean) } })) ?? [])
const go = (d: number) => { const n = idx.value + d; if (SCENES[n]) { finished.value = null; router.push(`/scenes/${SCENES[n].id}`) } }
</script>

<template>
  <div class="wrap narrow">
    <nav class="muted crumbs"><RouterLink to="/scenes">Scenes</RouterLink> / {{ m?.title }}</nav>
    <template v-if="m">
      <h1>{{ m.title }}</h1>
      <section class="surface brief">
        <p class="label">On set · {{ m.genre }}</p>
        <p class="read">{{ m.setup }}</p>
        <p class="read goal"><strong>Goal:</strong> {{ m.goal }}</p>
      </section>
      <StepPlayer :key="m.id" :qid="`scene:${m.id}`" kind="scene" :title="m.title" :scenario="`${m.title} (${m.genre}). ${m.setup} Goal: ${m.goal}`" :steps="steps" :terms="m.terms" rationale @done="(c, t) => (finished = { c, t })" />
      <section v-if="finished" class="surface outcome">
        <h2>{{ finished.c / finished.t >= 2 / 3 ? 'Passed' : 'Not passed yet' }} · {{ finished.c }}/{{ finished.t }}</h2>
        <h3>Director’s cut</h3>
        <p class="read"><TermText :text="m.outcome" /></p>
        <p v-if="m.ref" class="muted">Watch next: {{ m.ref }}</p>
      </section>
      <div class="row pager">
        <button class="btn" :disabled="idx === 0" @click="go(-1)">Previous scene</button>
        <span class="grow" />
        <button class="btn primary" :disabled="idx === SCENES.length - 1" @click="go(1)">Next scene</button>
      </div>
    </template>
    <p v-else>Scene not found. <RouterLink to="/scenes">See all scenes</RouterLink></p>
  </div>
</template>

<style scoped>
.crumbs { font-size: .88rem; margin: .4rem 0 1rem; }
.brief { margin-bottom: 1rem; border-left: 4px solid var(--vol); }
.label { font-size: .78rem; text-transform: uppercase; letter-spacing: .06em; color: var(--vol); margin-bottom: .3rem; }
.goal { margin-bottom: 0; }
.dot { width: .55rem; height: .55rem; border-radius: 50%; display: inline-block; }
.outcome { margin-top: 1.5rem; }
.pager { margin-top: 2rem; padding-right: 7.5rem; }
:deep(.prompt) { white-space: pre-line; }
</style>
