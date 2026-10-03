<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { AgentClient } from 'agents/client'
import MdText from './MdText.vue'
import { useApp } from '../stores/app'

const app = useApp()
type Msg = { role: 'user' | 'assistant' | 'error'; text: string; q?: string; cached?: { score: number; question: string }; sources?: { title: string; url: string }[] }
const msgs = ref<Msg[]>([])
const input = ref('')
const pending = ref(false)
const web = ref(false)
let lastQ = ''
const log = ref<HTMLElement>()
let client: AgentClient | null = null

function connect() {
  if (client) return
  client = new AgentClient({ agent: 'tutor-agent', name: app.uid, host: location.host })
  client.addEventListener('message', (ev: MessageEvent) => {
    let d: any
    try { d = JSON.parse(String(ev.data)) } catch { return }
    if (d.type === 'answer') { msgs.value.push({ role: 'assistant', text: d.text, q: lastQ, cached: d.cached, sources: d.sources }); pending.value = false }
    else if (d.type === 'error') { msgs.value.push({ role: 'error', text: d.text }); pending.value = false }
    scroll()
  })
}
const scroll = () => nextTick(() => log.value?.scrollTo({ top: log.value.scrollHeight }))

watch(() => app.chatOpen, (open) => {
  if (!open) return
  connect()
  if (app.chatDraft) { input.value = app.chatDraft; app.chatDraft = ''; return }
  if (app.chatContext && !input.value) input.value = app.chatContext.startsWith('Explain the term') ? app.chatContext : 'Why is this the right decision here?'
})

function ask(text: string, fresh = false) {
  connect()
  lastQ = text
  pending.value = true
  client!.send(JSON.stringify({ type: 'ask', id: crypto.randomUUID(), text, context: app.chatContext, byok: app.byokPayload, web: web.value, fresh }))
  scroll()
}
function send() {
  const text = input.value.trim()
  if (!text || pending.value) return
  msgs.value.push({ role: 'user', text })
  input.value = ''
  ask(text)
}
function clear() { msgs.value = []; client?.send(JSON.stringify({ type: 'reset' })) }
onBeforeUnmount(() => client?.close())
</script>

<template>
  <button v-if="!app.chatOpen" class="fab" aria-label="Open the tutor" @click="app.chatOpen = true">Ask tutor</button>
  <aside v-else class="chat" aria-label="Tutor chat">
    <header class="row"><strong class="grow">Tutor</strong>
      <button class="btn" @click="clear">Clear</button>
      <button class="btn" @click="app.chatOpen = false">Close</button></header>
    <p v-if="app.chatContext" class="ctx muted">Using the current question as context.</p>
    <div ref="log" class="log">
      <p v-if="!msgs.length" class="muted">Ask anything: “Why a low angle here?”, “How do I set up IK in Blender?”, “「伏笔」と「伏線」は同じ？”</p>
      <div v-for="(m, i) in msgs" :key="i" :class="['msg', m.role]"><MdText v-if="m.role === 'assistant'" :text="m.text" /><template v-else>{{ m.text }}</template>
        <ol v-if="m.sources?.length" class="src"><li v-for="s in m.sources" :key="s.url"><a :href="s.url" target="_blank" rel="noopener">{{ s.title || s.url }}</a></li></ol>
        <p v-if="m.cached" class="cached">Saved answer to a similar question ({{ Math.round(m.cached.score * 100) }}% match). <button class="link" :disabled="pending" @click="ask(m.q!, true)">Ask again fresh</button></p>
      </div>
      <p v-if="pending" class="muted">Thinking…</p>
    </div>
    <form class="row" @submit.prevent="send">
      <label class="webt" title="Search the web for this question"><input v-model="web" type="checkbox" /> 🌐</label>
      <input v-model="input" class="grow" placeholder="Ask about this decision…" aria-label="Message" />
      <button class="btn primary" :disabled="pending">Send</button>
    </form>
  </aside>
</template>

<style scoped>
.fab { position: fixed; right: 1rem; bottom: calc(1rem + env(safe-area-inset-bottom, 0px)); z-index: 30; background: var(--vol); color: var(--ink); border: 0; border-radius: 999px; padding: .8rem 1.15rem; font-weight: 700; box-shadow: 0 8px 24px rgb(0 0 0 / .35); }
.chat { position: fixed; right: 1rem; bottom: calc(1rem + env(safe-area-inset-bottom, 0px)); z-index: 35; width: min(420px, calc(100vw - 2rem)); height: min(560px, 75vh); display: flex; flex-direction: column; gap: .6rem; background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: .9rem; box-shadow: 0 16px 40px rgb(0 0 0 / .45); }
.ctx { font-size: .82rem; margin: 0; }
.log { flex: 1; overflow: auto; display: flex; flex-direction: column; gap: .5rem; }
.msg { padding: .55rem .75rem; border-radius: 12px; font-family: var(--read); }
.msg.user, .msg.error { white-space: pre-wrap; }
.msg.user { align-self: flex-end; background: var(--ink); }
.msg.assistant { background: color-mix(in srgb, var(--vol) 10%, var(--panel)); border: 1px solid var(--line); }
.msg.error { color: var(--put); }
.src { font-size: .8rem; margin: .4rem 0 0; padding-left: 1.1rem; }
.src a { color: var(--vol); }
.cached { font-size: .78rem; color: var(--muted); margin: .4rem 0 0; font-family: var(--ui); }
.link { background: none; border: 0; padding: 0; color: var(--vol); text-decoration: underline; font-size: inherit; }
.webt { display: flex; align-items: center; gap: .15rem; flex: none; }
.webt input { width: auto; }
form { flex-wrap: nowrap; }
</style>
