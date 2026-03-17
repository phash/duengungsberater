<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <!-- Warm overlay -->
      <div
        data-testid="drawer-overlay"
        class="fixed inset-0 bg-stone-900/50 backdrop-blur-sm animate-fade-in"
        @click="$emit('close')"
      />

      <!-- Panel -->
      <div
        data-testid="drawer-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        class="relative z-10 w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-warm-lg max-h-[90vh] overflow-y-auto animate-slide-up sm:rounded-2xl"
        @keydown.escape="$emit('close')"
      >
        <!-- Mobile handle bar -->
        <div class="mb-4 flex justify-center sm:hidden">
          <div class="h-1 w-10 rounded-full bg-stone-300"></div>
        </div>

        <div class="mb-5 flex items-center justify-between">
          <h2 class="font-display text-xl font-semibold text-stone-900">{{ title }}</h2>
          <button
            data-testid="drawer-close-button"
            class="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-700"
            @click="$emit('close')"
          >
            <span class="sr-only">Schließen</span>
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
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
