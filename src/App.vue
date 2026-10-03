<script setup lang="ts">
import TermSheet from './components/TermSheet.vue'
import ChatFloat from './components/ChatFloat.vue'
import LangPicker from './components/LangPicker.vue'
import SearchPalette from './components/SearchPalette.vue'
import { useApp } from './stores/app'
const app = useApp()
const links = [['/', 'Journey'], ['/cards', 'Cards'], ['/map', 'Knowledge map'], ['/scenes', 'Scenes'], ['/lab', 'Lab'], ['/sources', 'Sources'], ['/settings', 'Settings']]
</script>

<template>
  <header class="top">
    <RouterLink to="/" class="brand" translate="no">Director Quest</RouterLink>
    <nav v-if="app.authed" aria-label="Main"><RouterLink v-for="[to, label] in links" :key="to" :to="to" class="nav">{{ label }}</RouterLink></nav>
    <div class="tools"><button v-if="app.authed" class="search" aria-label="Search (Ctrl+K)" @click="app.searchOpen = true">🔍 <span class="lbl">Search</span> <kbd>Ctrl K</kbd></button><LangPicker /></div>
  </header>
  <main><RouterView /></main>
  <TermSheet />
  <SearchPalette v-if="app.authed" />
  <ChatFloat v-if="app.authed" />
</template>

<style scoped>
.top { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 20; display: flex; gap: 1rem; align-items: center; padding: .7rem 1.1rem; background: var(--ink); border-bottom: 1px solid var(--line); }
.brand { font-weight: 800; text-decoration: none; font-size: 1.1rem; white-space: nowrap; }
nav { display: flex; gap: .2rem; overflow-x: auto; min-width: 0; }
.nav { text-decoration: none; padding: .3rem .6rem; border-radius: 8px; color: var(--muted); white-space: nowrap; }
.nav.router-link-exact-active { color: var(--paper); background: var(--panel); }
.tools { margin-left: auto; display: flex; gap: .6rem; align-items: center; flex: none; }
.search { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: .3rem .6rem; color: var(--muted); white-space: nowrap; }
.search:hover { color: var(--paper); }
kbd { font-size: .72rem; border: 1px solid var(--line); border-radius: 4px; padding: 0 .3rem; margin-left: .3rem; }
@media (max-width: 1100px) { kbd { display: none; } }
@media (max-width: 800px) { .search .lbl { display: none; } }
</style>
