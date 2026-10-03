<script setup lang="ts">
import { SOURCES, EXPLORE } from '../lib/content'
import { useApp } from '../stores/app'
const app = useApp()
</script>

<template>
  <div class="wrap">
    <h1>Sources <span class="tr" translate="no">学习资源 · 参考資料</span></h1>
    <p class="read muted">The cards give the core idea. These books, channels and tools go deeper. Read one story book, one directing book and one animation book first.</p>
    <div class="cols">
      <section v-for="g in SOURCES" :key="g.group" class="surface">
        <h2>{{ g.group }}</h2>
        <ul><li v-for="l in g.links" :key="l.url"><a :href="l.url" target="_blank" rel="noopener">{{ l.name }}</a></li></ul>
      </section>
    </div>
    <h2 class="next">Not in the deck yet</h2>
    <div class="row"><button v-for="x in EXPLORE" :key="x" class="chip" @click="app.chatContext = `Explain: ${x}`; app.chatOpen = true">{{ x }}</button></div>
  </div>
</template>

<style scoped>
.tr { font-weight: 400; font-size: 1rem; color: var(--muted); }
.cols { display: grid; gap: .8rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
ul { margin: 0; padding-left: 1.1rem; }
li { margin: .25rem 0; }
.next { margin-top: 2rem; }
</style>
