<script setup lang="ts">
import { ref, watch } from 'vue'
const props = withDefaults(
  defineProps<{ username: string; image?: string | null; size?: number }>(),
  { size: 40, image: '' },
)
const failed = ref(false)
watch(
  () => props.image,
  () => {
    failed.value = false
  },
)
</script>

<template>
  <span
    class="user-avatar"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.38)}px` }"
    :aria-label="`${username} 的头像`"
  >
    <img
      v-if="image && !failed"
      :src="image"
      alt=""
      loading="lazy"
      referrerpolicy="no-referrer"
      @error="failed = true"
    />
    <span v-else aria-hidden="true">{{ username.slice(0, 1).toUpperCase() || 'R' }}</span>
  </span>
</template>
