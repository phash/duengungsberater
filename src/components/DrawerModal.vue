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
        ref="panelRef"
        data-testid="drawer-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
        class="relative z-10 w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-warm-lg max-h-[90vh] overflow-y-auto animate-slide-up sm:rounded-2xl"
        @keydown.escape="$emit('close')"
        @keydown.tab="trapFocus"
      >
        <!-- Mobile handle bar -->
        <div class="mb-4 flex justify-center sm:hidden">
          <div class="h-1 w-10 rounded-full bg-stone-300"></div>
        </div>

        <div class="mb-5 flex items-center justify-between">
          <h2 class="font-display text-xl font-semibold text-stone-900">
            <slot name="header">{{ title }}</slot>
          </h2>
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
        <slot name="footer" />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  open: boolean
  title?: string
}>()

defineEmits<{
  close: []
}>()

const panelRef = ref<HTMLElement | null>(null)

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      await nextTick()
      panelRef.value?.focus()
    }
  },
)

function trapFocus(e: KeyboardEvent) {
  if (!panelRef.value) return
  const focusable = panelRef.value.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  )
  if (focusable.length === 0) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}
</script>
