<script setup lang="ts">
import Mascot from '../components/Mascot.vue'
</script>

<template>
  <div class="wrap lost">
    <Mascot pose="oops" :size="180" say="Oops, this page does not exist." />
    <RouterLink class="btn primary" to="/">Back to the journey</RouterLink>
  </div>
</template>

<style scoped>
.lost { display: grid; justify-items: center; gap: 1.5rem; padding-top: 3rem; }
</style>
