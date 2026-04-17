<template>
  <AppLayout title="Profil">
    <div class="space-y-5 stagger">
      <p
        v-if="errorMessage"
        data-testid="profile-error"
        class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>

      <!-- Account card -->
      <div class="rounded-2xl bg-white p-5 shadow-warm-sm">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-field-100">
            <svg class="h-6 w-6 text-field-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-stone-500">Angemeldet als</p>
            <p data-testid="profile-email" class="mt-0.5 text-lg font-semibold text-stone-900">
              {{ authStore.userEmail ?? '—' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Link zu eigenen Naehrstoffwerten -->
      <router-link
        to="/profil/werte"
        data-testid="nutrient-values-link"
        class="block rounded-2xl border border-field-200 bg-field-50 p-4 text-field-700 transition-colors hover:bg-field-100"
      >
        <span class="font-display font-medium">Eigene Nährstoffwerte →</span>
        <p class="mt-1 text-sm text-field-600">LfL-Standardwerte für deine Kulturen anpassen</p>
      </router-link>

      <!-- Onboarding erneut anzeigen -->
      <div
        v-if="onboarding.dismissed.value"
        class="rounded-2xl bg-white p-5 shadow-warm-sm"
      >
        <p class="text-sm font-medium text-stone-700">Onboarding</p>
        <p class="mt-1 text-xs text-stone-500">
          Blende die Einstieg-Checkliste auf der Felder-Seite wieder ein.
        </p>
        <button
          type="button"
          data-testid="onboarding-reset"
          class="mt-3 min-h-[44px] rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field-600"
          @click="resetOnboarding"
        >
          Onboarding erneut anzeigen
        </button>
      </div>

      <!-- Passwort aendern -->
      <div class="rounded-2xl bg-white p-5 shadow-warm-sm">
        <button
          type="button"
          data-testid="password-change-toggle"
          class="flex w-full items-center justify-between text-sm font-medium text-stone-700"
          @click="passwordExpanded = !passwordExpanded"
        >
          <span>Passwort ändern</span>
          <svg
            class="h-4 w-4 text-stone-400 transition-transform duration-200"
            :class="{ 'rotate-180': passwordExpanded }"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <p
          v-if="passwordSuccess"
          data-testid="password-success"
          class="mt-2 text-sm text-field-600"
        >
          Passwort erfolgreich geändert.
        </p>
        <div v-if="passwordExpanded" class="mt-4 space-y-3">
          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Neues Passwort</label>
            <input
              v-model="newPassword"
              type="password"
              data-testid="new-password-input"
              class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-stone-900 transition-all duration-200 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
              autocomplete="new-password"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Passwort bestätigen</label>
            <input
              v-model="confirmPassword"
              type="password"
              data-testid="confirm-password-input"
              class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-stone-900 transition-all duration-200 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
              autocomplete="new-password"
            />
          </div>
          <p v-if="passwordError" data-testid="password-error" class="text-sm text-red-600">
            {{ passwordError }}
          </p>
          <button
            type="button"
            data-testid="password-save-button"
            :disabled="passwordSaving"
            class="w-full rounded-xl bg-field-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-field-600/20 transition-all duration-200 hover:bg-field-700 disabled:opacity-50"
            @click="handlePasswordSave"
          >
            {{ passwordSaving ? 'Wird gespeichert…' : 'Passwort speichern' }}
          </button>
        </div>
      </div>

      <!-- App info card -->
      <div class="rounded-2xl bg-white p-5 shadow-warm-sm">
        <p class="text-xs font-semibold uppercase tracking-wider text-stone-500">App-Info</p>
        <p data-testid="profile-version" class="mt-2 font-display text-sm font-medium text-stone-700">
          Düngungsberater · Stufe 3
        </p>
        <p class="mt-1 text-sm text-stone-400">
          Basisdaten: LfL Bayern 2025/2026
        </p>
      </div>

      <!-- Account loeschen -->
      <div class="rounded-2xl border border-red-200 bg-white p-5 shadow-warm-sm">
        <button
          v-if="!showDeleteConfirm"
          type="button"
          data-testid="delete-account-button"
          class="w-full rounded-xl border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          @click="showDeleteConfirm = true"
        >
          Account löschen
        </button>
        <div v-else data-testid="delete-account-confirm-block" class="space-y-3">
          <p class="text-sm text-red-700">
            Alle Felder, Planungen und eigenen Werte werden unwiderruflich gelöscht.
          </p>
          <div class="flex gap-2">
            <button
              type="button"
              data-testid="delete-account-cancel-button"
              class="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-parchment"
              @click="showDeleteConfirm = false"
            >
              Abbrechen
            </button>
            <button
              type="button"
              data-testid="delete-account-confirm-button"
              class="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              @click="handleDeleteAccount"
            >
              Endgültig löschen
            </button>
          </div>
        </div>
      </div>

      <!-- Logout -->
      <button
        data-testid="profile-logout-button"
        class="w-full rounded-2xl border border-red-200 px-4 py-3.5 text-center font-semibold text-red-600 transition-colors hover:bg-red-50"
        @click="handleLogout"
      >
        Abmelden
      </button>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { updatePassword, deleteAccount } from '@/services/auth.service'
import { useOnboardingState } from '@/composables/useOnboardingState'
import { trackEvent } from '@/utils/tracking'
import AppLayout from '@/components/AppLayout.vue'

const authStore = useAuthStore()
const router = useRouter()
const errorMessage = ref('')
const onboarding = useOnboardingState()

function resetOnboarding() {
  onboarding.reset()
  trackEvent('Onboarding', 'Reset')
}

// Passwort aendern
const passwordExpanded = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const passwordSuccess = ref(false)
const passwordSaving = ref(false)

// Account loeschen
const showDeleteConfirm = ref(false)

async function handlePasswordSave() {
  passwordError.value = ''
  passwordSuccess.value = false

  if (newPassword.value.length < 6) {
    passwordError.value = 'Passwort muss mindestens 6 Zeichen lang sein.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Passwörter stimmen nicht überein.'
    return
  }

  passwordSaving.value = true
  try {
    await updatePassword(newPassword.value)
    passwordSuccess.value = true
    newPassword.value = ''
    confirmPassword.value = ''
    passwordExpanded.value = false
  } catch (e) {
    passwordError.value = e instanceof Error ? e.message : 'Fehler beim Ändern des Passworts.'
  } finally {
    passwordSaving.value = false
  }
}

async function handleDeleteAccount() {
  try {
    await deleteAccount()
    router.push('/login')
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Fehler beim Löschen des Accounts.'
    showDeleteConfirm.value = false
  }
}

async function handleLogout() {
  errorMessage.value = ''
  try {
    await authStore.logout()
    router.push('/login')
  } catch (e) {
    console.error('Fehler beim Abmelden:', e)
    errorMessage.value = 'Fehler beim Abmelden. Bitte erneut versuchen.'
  }
}
</script>
