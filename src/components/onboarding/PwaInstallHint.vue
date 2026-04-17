<template>
  <div
    v-if="open"
    data-testid="pwa-install-hint"
    role="dialog"
    aria-modal="true"
    aria-labelledby="pwa-hint-title"
    class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4"
    @click.self="$emit('close')"
  >
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-warm-lg">
      <h2
        id="pwa-hint-title"
        class="font-display text-lg font-semibold text-stone-900"
      >
        App zum Home-Bildschirm hinzufügen
      </h2>
      <p class="mt-2 text-sm text-stone-600">
        iOS Safari bietet keinen Install-Button. So gehst du vor:
      </p>
      <ol class="mt-4 space-y-3 text-sm text-stone-700">
        <li class="flex gap-3">
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-field-100 text-xs font-semibold text-field-700"
            >1</span
          >
          <span
            >Tippe unten in Safari auf das
            <strong class="text-stone-900">Teilen-Symbol</strong> (Quadrat mit
            Pfeil nach oben).</span
          >
        </li>
        <li class="flex gap-3">
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-field-100 text-xs font-semibold text-field-700"
            >2</span
          >
          <span
            >Wähle
            <strong class="text-stone-900">„Zum Home-Bildschirm"</strong>
            (ggf. nach unten scrollen).</span
          >
        </li>
        <li class="flex gap-3">
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-field-100 text-xs font-semibold text-field-700"
            >3</span
          >
          <span
            >Bestätige mit
            <strong class="text-stone-900">„Hinzufügen"</strong>. Die App
            erscheint als Icon auf dem Home-Bildschirm.</span
          >
        </li>
      </ol>
      <div class="mt-6 flex gap-3">
        <button
          type="button"
          data-testid="pwa-hint-close"
          class="flex-1 min-h-[44px] rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field-600"
          @click="$emit('close')"
        >
          Verstanden
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()
</script>
