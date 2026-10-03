<script setup lang="ts">
import Mascot from '../components/Mascot.vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useApp } from '../stores/app'

const app = useApp()
const tab = ref<'shot' | 'timing'>('shot')

// ───────────────────────── Shot lab: real lens math
const SENSORS = { ff: { name: 'Full frame (36 × 24 mm)', w: 36, coc: 0.03 }, s35: { name: 'Super 35 (24.9 × 14 mm)', w: 24.9, coc: 0.025 }, m43: { name: 'Micro 4/3 (17.3 × 13 mm)', w: 17.3, coc: 0.015 } }
const sensor = ref<keyof typeof SENSORS>('s35')
const focal = ref(50), stop = ref(2.8), dist = ref(3), bg = ref(15), fps = ref(24), angle = ref(180), aspect = ref(1.78)
const STOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22]

const S = computed(() => SENSORS[sensor.value])
const hfov = computed(() => (2 * Math.atan(S.value.w / (2 * focal.value)) * 180) / Math.PI)
const frameW = computed(() => (dist.value * S.value.w) / focal.value)        // metres at subject
const frameH = computed(() => frameW.value / aspect.value)
const dof = computed(() => {
  const f = focal.value, N = stop.value, c = S.value.coc, d = dist.value * 1000
  const H = (f * f) / (N * c) + f
  const near = (d * (H - f)) / (H + d - 2 * f)
  const far = d < H ? (d * (H - f)) / (H - d) : Infinity
  return { near: near / 1000, far: far / 1000, H: H / 1000 }
})
const shutter = computed(() => Math.round(1 / (angle.value / 360 / fps.value)))
const shotSize = computed(() => {
  const r = frameH.value / 1.75
  return r > 3 ? ['Extreme wide shot', '大远景', '超ロングショット', 'wide_shot'] : r > 1.15 ? ['Wide / full shot', '全景', 'フルショット', 'wide_shot']
    : r > 0.55 ? ['Medium shot', '中景', 'ミディアムショット', 'medium_shot'] : r > 0.32 ? ['Medium close-up', '近景', 'ミディアムクローズアップ', 'medium_shot']
    : r > 0.16 ? ['Close-up', '特写', 'クローズアップ', 'close_up'] : ['Extreme close-up', '大特写', '超クローズアップ', 'ecu']
})
// Background blur disc on the sensor, scaled to the preview.
const PW = 480
const PH = computed(() => PW / aspect.value)
const blurPx = computed(() => {
  const f = focal.value, d = dist.value * 1000, b = bg.value * 1000
  const disc = ((f * f) / (stop.value * (d - f))) * (Math.abs(b - d) / b)
  return Math.min((disc / S.value.w) * PW, 30)
})
const person = computed(() => {
  const h = (1.75 / frameH.value) * PH.value        // person height in preview px
  return { h, top: PH.value * 0.3 - h * 0.06 }
})
const pyCode = computed(() => `import bpy
cam = bpy.context.scene.camera.data
cam.sensor_width = ${S.value.w}
cam.lens = ${focal.value}
cam.dof.use_dof = True
cam.dof.focus_distance = ${dist.value}
cam.dof.aperture_fstop = ${stop.value}
scene = bpy.context.scene
scene.render.fps = ${fps.value}
scene.render.resolution_x, scene.render.resolution_y = 1920, ${Math.round(1920 / aspect.value)}
scene.render.motion_blur_shutter = ${(angle.value / 360).toFixed(3)}  # ${angle.value}° shutter`)
const fmt = (m: number) => (m === Infinity ? '∞' : m >= 10 ? `${m.toFixed(0)} m` : `${m.toFixed(2)} m`)

// ───────────────────────── Timing lab: bouncing ball
const frames = ref(12), ease = ref<'physics' | 'linear' | 'easeio'>('physics'), on = ref(1), squash = ref(true), playing = ref(true)
const frame = ref(0)
const y = (t: number) => ease.value === 'physics' ? 4 * t * (1 - t) : ease.value === 'linear' ? 1 - Math.abs(2 * t - 1) : 0.5 - 0.5 * Math.cos(2 * Math.PI * t)
const shown = computed(() => Math.floor(frame.value / on.value) * on.value)
const ballY = computed(() => 210 - y(shown.value / frames.value) * 170)
const contact = computed(() => shown.value === 0)
const ghosts = computed(() => Array.from({ length: frames.value / on.value }, (_, i) => 210 - y((i * on.value) / frames.value) * 170))
let timer = 0
onMounted(() => { timer = window.setInterval(() => { if (playing.value) frame.value = (frame.value + 1) % frames.value }, 1000 / 24) })
onBeforeUnmount(() => clearInterval(timer))
const ask = () => { app.chatDraft = 'What do you think of my setup?'; app.pinnedContext = { kind: 'lab', label: tab.value === 'shot' ? 'Shot lab' : 'Timing lab', text: tab.value === 'shot' ? `Shot lab: ${focal.value} mm on ${S.value.name}, f/${stop.value}, subject at ${dist.value} m, background at ${bg.value} m. Result: ${shotSize.value[0]}, DOF ${fmt(dof.value.near)}–${fmt(dof.value.far)}.` : `Timing lab: bounce of ${frames.value} frames at 24 fps, ${ease.value} spacing, on ${on.value}s.` }; app.chatOpen = true }
</script>

<template>
  <div class="wrap">
    <header class="phead"><h1>Lab <span class="tr" translate="no">实验室 · ラボ</span></h1><Mascot pose="director" :size="96" /></header>
    <div class="row seg"><button class="chip" :class="{ on: tab === 'shot' }" @click="tab = 'shot'">Shot lab · 镜头 · ショット</button>
      <button class="chip" :class="{ on: tab === 'timing' }" @click="tab = 'timing'">Timing lab · 节奏 · タイミング</button>
      <span class="grow" /><button class="btn" @click="ask">Ask the tutor about this setup</button></div>

    <section v-if="tab === 'shot'" class="lab">
      <div class="surface controls">
        <label>Sensor<select v-model="sensor"><option v-for="(v, k) in SENSORS" :key="k" :value="k">{{ v.name }}</option></select></label>
        <label>Focal length · <button class="term-link" @click="app.openTerm = 'focal_length'">焦距</button> <b>{{ focal }} mm</b><input v-model.number="focal" type="range" min="12" max="200" step="1" /></label>
        <label>Aperture · <button class="term-link" @click="app.openTerm = 'aperture'">光圈</button> <b>f/{{ stop }}</b>
          <input :value="STOPS.indexOf(stop)" type="range" min="0" :max="STOPS.length - 1" step="1" @input="stop = STOPS[+($event.target as HTMLInputElement).value]" /></label>
        <label>Subject distance <b>{{ dist }} m</b><input v-model.number="dist" type="range" min="0.5" max="30" step="0.1" /></label>
        <label>Background distance <b>{{ bg }} m</b><input v-model.number="bg" type="range" :min="dist + 0.5" max="100" step="0.5" /></label>
        <label>Aspect ratio<select v-model.number="aspect"><option :value="1.33">1.33 (4:3)</option><option :value="1.78">1.78 (16:9)</option><option :value="1.85">1.85 (flat)</option><option :value="2.39">2.39 (scope)</option></select></label>
        <div class="row two"><label>FPS<select v-model.number="fps"><option v-for="f in [24, 25, 30, 48, 60]" :key="f" :value="f">{{ f }}</option></select></label>
          <label>Shutter angle<select v-model.number="angle"><option v-for="a in [45, 90, 180, 270, 360]" :key="a" :value="a">{{ a }}°</option></select></label></div>
      </div>
      <div class="out">
        <svg :viewBox="`0 0 ${PW} ${PH}`" class="frame" role="img" :aria-label="`Preview: ${shotSize[0]}`">
          <defs><filter id="bgblur"><feGaussianBlur :stdDeviation="blurPx / 2" /></filter>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b4469" /><stop offset="1" stop-color="#4a6a8f" /></linearGradient></defs>
          <rect :width="PW" :height="PH" fill="url(#sky)" />
          <g filter="url(#bgblur)">
            <g v-for="k in 9" :key="k" :transform="`translate(${(k * PW) / 9 - 30}, ${PH * 0.62})`">
              <rect x="-3" y="0" width="6" :height="PH * 0.2" fill="#2e3b2a" />
              <circle cx="0" cy="0" :r="PH * 0.09" fill="#3d6b4a" />
            </g>
            <rect :y="PH * 0.78" :width="PW" :height="PH * 0.22" fill="#3a4a3a" />
          </g>
          <g :transform="`translate(${PW * 0.38}, ${person.top})`" fill="#e9b949">
            <circle cx="0" :cy="person.h * 0.065" :r="person.h * 0.065" />
            <rect :x="-person.h * 0.12" :y="person.h * 0.14" :width="person.h * 0.24" :height="person.h * 0.4" :rx="person.h * 0.04" />
            <rect :x="-person.h * 0.1" :y="person.h * 0.52" :width="person.h * 0.08" :height="person.h * 0.48" />
            <rect :x="person.h * 0.02" :y="person.h * 0.52" :width="person.h * 0.08" :height="person.h * 0.48" />
          </g>
          <g stroke="rgb(255 255 255 / .25)"><line :x1="PW / 3" y1="0" :x2="PW / 3" :y2="PH" /><line :x1="(2 * PW) / 3" y1="0" :x2="(2 * PW) / 3" :y2="PH" />
            <line x1="0" :y1="PH / 3" :x2="PW" :y2="PH / 3" /><line x1="0" :y1="(2 * PH) / 3" :x2="PW" :y2="(2 * PH) / 3" /></g>
        </svg>
        <dl class="stats">
          <div><dt>Shot size</dt><dd><button class="term-link" @click="app.openTerm = shotSize[3]">{{ shotSize[0] }}</button> <span class="muted" translate="no">{{ shotSize[1] }} · {{ shotSize[2] }}</span></dd></div>
          <div><dt>Horizontal field of view</dt><dd>{{ hfov.toFixed(1) }}°</dd></div>
          <div><dt>Frame at subject</dt><dd>{{ frameW.toFixed(2) }} × {{ frameH.toFixed(2) }} m</dd></div>
          <div><dt><button class="term-link" @click="app.openTerm = 'dof'">Depth of field</button></dt><dd>{{ fmt(dof.near) }} → {{ fmt(dof.far) }}</dd></div>
          <div><dt>Hyperfocal distance</dt><dd>{{ fmt(dof.H) }}</dd></div>
          <div><dt><button class="term-link" @click="app.openTerm = 'shutter'">Shutter speed</button></dt><dd>1/{{ shutter }} s</dd></div>
        </dl>
        <p class="muted small">Try: same shot size with 24 mm close vs 135 mm far. Watch the background blur and size change. That is <button class="term-link" @click="app.openTerm = 'lens_compression'">lens compression</button> (really camera distance).</p>
        <details><summary>Set this camera in Blender (Python)</summary><pre>{{ pyCode }}</pre></details>
      </div>
    </section>

    <section v-else class="lab">
      <div class="surface controls">
        <label>Frames per bounce <b>{{ frames }}</b> ({{ (frames / 24).toFixed(2) }} s at 24 fps)<input v-model.number="frames" type="range" min="6" max="36" step="2" /></label>
        <label>Spacing · <button class="term-link" @click="app.openTerm = 'spacing'">间距</button>
          <select v-model="ease"><option value="physics">Gravity (parabola)</option><option value="linear">Linear (even spacing)</option><option value="easeio">Ease in-out (floaty)</option></select></label>
        <label>Exposure · <button class="term-link" @click="app.openTerm = 'on_twos'">一拍几</button>
          <select v-model.number="on"><option :value="1">On ones</option><option :value="2">On twos</option><option :value="3">On threes</option></select></label>
        <label class="row"><input v-model="squash" type="checkbox" style="width:auto" /> <button class="term-link" @click="app.openTerm = 'squash_stretch'">Squash on contact</button></label>
        <button class="btn" @click="playing = !playing">{{ playing ? 'Pause' : 'Play' }}</button>
        <p class="muted small">Gravity spacing is tight at the top and wide at the bottom. Linear looks robotic. Ease in-out looks like it floats on the moon. Change one thing at a time.</p>
      </div>
      <div class="out">
        <svg viewBox="0 0 300 240" class="frame" role="img" aria-label="Bouncing ball">
          <rect width="300" height="240" fill="var(--ink)" />
          <line x1="0" y1="226" x2="300" y2="226" stroke="var(--line)" stroke-width="2" />
          <circle v-for="(g, i) in ghosts" :key="i" cx="80" :cy="g" r="5" fill="var(--muted)" fill-opacity=".5" />
          <text x="60" y="20" font-size="10" fill="var(--muted)">spacing</text>
          <ellipse cx="190" :cy="contact && squash ? 220 : ballY" :rx="contact && squash ? 20 : 14" :ry="contact && squash ? 8 : 14" fill="var(--vol)" />
        </svg>
        <p class="muted">Frame {{ shown + 1 }} / {{ frames }}</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tr { font-weight: 400; font-size: 1rem; color: var(--muted); }
.seg { margin: .6rem 0 1rem; }
.lab { display: grid; gap: 1rem; grid-template-columns: minmax(240px, 320px) 1fr; align-items: start; }
@media (max-width: 760px) { .lab { grid-template-columns: 1fr; } }
.controls { display: grid; gap: .7rem; }
.controls label { display: grid; gap: .25rem; font-size: .92rem; }
.controls input[type=range] { padding: 0; }
.controls label > .term-link, .controls label > input[type=checkbox] { justify-self: start; }
.two { flex-wrap: nowrap; } .two label { flex: 1; }
.frame { width: 100%; height: auto; border-radius: 10px; border: 1px solid var(--line); }
.stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: .5rem 1rem; margin: 1rem 0; }
.stats dt { color: var(--muted); font-size: .82rem; }
.stats dd { margin: 0; font-weight: 600; }
.small { font-size: .86rem; }
pre { background: var(--ink); border: 1px solid var(--line); border-radius: 8px; padding: .7rem; overflow-x: auto; font-size: .82rem; }
</style>
