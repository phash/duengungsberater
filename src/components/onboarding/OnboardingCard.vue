<template>
  <section
    v-if="visible"
    data-testid="onboarding-card"
    class="rounded-2xl bg-white p-5 shadow-warm-sm transition-opacity duration-500"
    :class="{ 'opacity-0': fadingOut }"
    aria-labelledby="onboarding-headline"
  >
    <header class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h2
          id="onboarding-headline"
          class="font-display text-lg font-semibold text-stone-900"
        >
          {{ isWelcome ? 'Willkommen beim Düngungsberater!' : 'Dein Einstieg' }}
        </h2>
        <p class="mt-1 text-sm text-stone-600">
          {{
            isWelcome
              ? 'In 4 Schritten zu deiner ersten bedarfsgerechten Düngeempfehlung nach LfL-Basisdaten Bayern.'
              : 'So holst du das Meiste aus der App heraus.'
          }}
        </p>
        <p
          v-if="isGuest && isWelcome"
          class="mt-2 rounded-lg bg-wheat-50 px-3 py-2 text-xs text-wheat-700"
        >
          Als Gast bleiben deine Daten auf diesem Gerät. Registriere dich
          später, um sie zu sichern.
        </p>
      </div>
      <button
        type="button"
        data-testid="onboarding-dismiss"
        aria-label="Onboarding ausblenden"
        class="-mr-1 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field-600"
        @click="handleDismiss"
      >
        <svg
          class="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </header>

    <div
      class="mt-4 flex items-center gap-3"
      role="progressbar"
      :aria-valuenow="state.progress.value"
      aria-valuemin="0"
      aria-valuemax="4"
      :aria-valuetext="`${state.progress.value} von 4 Schritten abgeschlossen`"
    >
      <div class="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
        <div
          class="h-full rounded-full bg-field-600 transition-[width] duration-300"
          :style="{ width: `${(state.progress.value / 4) * 100}%` }"
        />
      </div>
      <span
        data-testid="onboarding-progress"
        class="text-xs font-semibold text-stone-600"
      >
        {{ state.progress.value }}/4
      </span>
    </div>

    <ol class="mt-4 space-y-1">
      <OnboardingStep
        :number="1"
        title="Erstes Feld anlegen"
        hint="Manuell oder direkt aus iBalis importieren."
        :done="state.step1Done.value"
        :current="currentStep === 1"
        :actions="[
          { key: 'new-field', label: '+ Manuell anlegen', testIdSuffix: 'new' },
          { key: 'ibalis-import', label: 'iBalis importieren', testIdSuffix: 'ibalis', secondary: true },
        ]"
        @action="onStepAction"
      />
      <OnboardingStep
        :number="2"
        title="Anbau planen"
        hint="Kultur, Ertragsziel und Saison festlegen."
        :done="state.step2Done.value"
        :current="currentStep === 2"
        :actions="state.step1Done.value ? [{ key: 'plan', label: 'Anbau planen', testIdSuffix: 'plan' }] : []"
        @action="onStepAction"
      />
      <OnboardingStep
        :number="3"
        title="Empfehlung ansehen"
        hint="Düngung nach LfL-Basisdaten — mit Korrekturen für Vorfrucht, Humus, Nmin."
        :done="state.step3Done.value"
        :current="currentStep === 3"
        :actions="state.step2Done.value ? [{ key: 'recommendation', label: 'Empfehlung ansehen', testIdSuffix: 'reco' }] : []"
        @action="onStepAction"
      />
      <OnboardingStep
        :number="4"
        title="App installieren"
        hint="Schneller Zugriff + Offline auf dem Feld."
        :done="state.step4Done.value"
        :current="currentStep === 4"
        :actions="step4Actions"
        @action="onStepAction"
      />
    </ol>

    <PwaInstallHint :open="iosHintOpen" @close="iosHintOpen = false" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import OnboardingStep, { type OnboardingStepAction } from './OnboardingStep.vue'
import PwaInstallHint from './PwaInstallHint.vue'
import { useOnboardingState } from '@/composables/useOnboardingState'
import { usePwaInstall } from '@/composables/usePwaInstall'
import { trackEvent } from '@/utils/tracking'

defineProps<{
  isGuest: boolean
}>()

const emit = defineEmits<{
  'open-new-field': []
  'open-ibalis': []
  'go-to-plan': []
  'go-to-recommendation': []
}>()

const state = useOnboardingState()
const { canPrompt, isIOS, install } = usePwaInstall()

const iosHintOpen = ref(false)
const fadingOut = ref(false)
const fadedOut = ref(false)

const isWelcome = computed(() => !state.step1Done.value)

const currentStep = computed(() => {
  if (!state.step1Done.value) return 1
  if (!state.step2Done.value) return 2
  if (!state.step3Done.value) return 3
  if (!state.step4Done.value) return 4
  return 0
})

const step4Actions = computed<OnboardingStepAction[]>(() => {
  if (isIOS.value) {
    return [{ key: 'pwa-ios', label: 'So geht\'s auf dem iPhone', testIdSuffix: 'ios' }]
  }
  if (canPrompt.value) {
    return [
      { key: 'pwa-install', label: 'Jetzt installieren', testIdSuffix: 'install' },
      { key: 'pwa-later', label: 'Später', testIdSuffix: 'later', secondary: true },
    ]
  }
  return [{ key: 'pwa-later', label: 'Später', testIdSuffix: 'later', secondary: true }]
})

const visible = computed(() => !state.dismissed.value && !fadedOut.value)

watch(
  () => state.progress.value,
  (n) => {
    if (n === 4 && !fadingOut.value) {
      trackEvent('Onboarding', 'Completed')
      setTimeout(() => {
        fadingOut.value = true
      }, 1500)
      setTimeout(() => {
        fadedOut.value = true
        state.dismiss()
      }, 2000)
    }
  },
  { immediate: false },
)

onMounted(() => {
  if (visible.value) trackEvent('Onboarding', 'Shown')
})

function handleDismiss() {
  state.dismiss()
  trackEvent('Onboarding', 'Dismissed')
}

async function onStepAction(key: string) {
  trackEvent('Onboarding', `Step-Action-${key}`)
  switch (key) {
    case 'new-field':
      emit('open-new-field')
      return
    case 'ibalis-import':
      emit('open-ibalis')
      return
    case 'plan':
      emit('go-to-plan')
      return
    case 'recommendation':
      emit('go-to-recommendation')
      return
    case 'pwa-install': {
      trackEvent('Onboarding', 'Pwa-Install-Prompted')
      const outcome = await install()
      trackEvent('Onboarding', `Pwa-Install-${outcome}`)
      return
    }
    case 'pwa-ios':
      iosHintOpen.value = true
      return
    case 'pwa-later':
      state.markPwaLater()
      return
  }
}
</script>
