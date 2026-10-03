<script setup lang="ts">
// Hikari, the film-club director. Poses live in /public/hikari/<pose>.webp (cut out, max 512 px).
export type Pose = 'smile' | 'wave' | 'point' | 'think' | 'laugh' | 'cheer' | 'oops' | 'sleep' | 'study' | 'thumbs' | 'surprised' | 'sign' | 'head' | 'director' | 'clap'

withDefaults(defineProps<{ pose: Pose; size?: number; say?: string; alt?: string; bob?: boolean }>(), { size: 96, bob: false })
</script>

<template>
  <span class="mascot" :class="{ bob }">
    <img :src="`/hikari/${pose}.webp`" :alt="alt ?? ''" :style="{ height: size + 'px' }" draggable="false" loading="lazy" decoding="async" />
    <span v-if="say || $slots.default" class="bubble"><slot>{{ say }}</slot></span>
  </span>
</template>

<style scoped>
.mascot { display: inline-flex; align-items: center; gap: 1rem; vertical-align: middle; }
/* White sticker outline + soft drop, drawn by the browser so every pose matches. */
img {
  width: auto; display: block; user-select: none;
  filter: drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(2px 3px 0 rgb(26 23 18 / .18));
}
.bubble { font-size: .95rem; max-width: 16rem; }
.bob img { animation: bob 3.2s ease-in-out infinite; transform-origin: 50% 100%; }
@keyframes bob { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-4px) rotate(-1.5deg); } }
@media (prefers-reduced-motion: reduce) { .bob img { animation: none; } }
</style>
