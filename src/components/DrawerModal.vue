<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div
        data-testid="drawer-overlay"
        class="fixed inset-0 bg-black/40"
        @click="$emit('close')"
      />
      <div
        data-testid="drawer-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        class="relative z-10 w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        @keydown.escape="$emit('close')"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">{{ title }}</h2>
          <button
            data-testid="drawer-close-button"
            class="rounded-full p-1 hover:bg-gray-100"
            @click="$emit('close')"
          >
            <span class="sr-only">Schließen</span>
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
}>()

defineEmits<{
  close: []
}>()
</script>
