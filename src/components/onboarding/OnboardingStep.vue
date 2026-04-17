<template>
  <li
    :data-testid="`onboarding-step-${number}`"
    :aria-current="current ? 'step' : undefined"
    class="flex items-start gap-3 rounded-xl p-3 transition-colors"
    :class="done ? 'bg-field-50/60' : current ? 'bg-white' : 'bg-transparent'"
  >
    <span
      class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      :class="
        done
          ? 'bg-field-600 text-white'
          : current
            ? 'bg-wheat-500 text-white'
            : 'border border-stone-300 text-stone-400'
      "
      aria-hidden="true"
    >
      <svg
        v-if="done"
        class="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M5 12l5 5L20 7" />
      </svg>
      <span v-else>{{ number }}</span>
    </span>

    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold text-stone-800">
        {{ title }}
      </p>
      <p v-if="hint" class="mt-0.5 text-xs text-stone-500">{{ hint }}</p>
      <div
        v-if="!done && actions.length > 0"
        class="mt-2 flex flex-wrap gap-2"
      >
        <button
          v-for="action in actions"
          :key="action.label"
          type="button"
          :data-testid="`onboarding-step-${number}-action-${action.testIdSuffix}`"
          class="min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold shadow-warm-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field-600 focus-visible:ring-offset-2"
          :class="
            action.secondary
              ? 'border border-field-200 bg-white text-field-700 hover:bg-field-50'
              : 'bg-field-600 text-white hover:bg-field-700'
          "
          @click="$emit('action', action.key)"
        >
          {{ action.label }}
        </button>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
export interface OnboardingStepAction {
  key: string
  label: string
  testIdSuffix: string
  secondary?: boolean
}

defineProps<{
  number: 1 | 2 | 3 | 4
  title: string
  hint?: string
  done: boolean
  current: boolean
  actions: OnboardingStepAction[]
}>()

defineEmits<{
  action: [key: string]
}>()
</script>
