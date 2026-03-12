<template>
  <AppLayout title="Profil">
    <div class="space-y-6">
      <p
        v-if="errorMessage"
        data-testid="profile-error"
        class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600"
      >
        {{ errorMessage }}
      </p>

      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <h2 class="text-sm font-medium text-gray-500">Angemeldet als</h2>
        <p data-testid="profile-email" class="mt-1 text-lg font-medium text-gray-900">
          {{ authStore.userEmail ?? '—' }}
        </p>
      </div>

      <!-- Link zu eigenen Nährstoffwerten -->
      <router-link
        to="/profil/werte"
        data-testid="nutrient-values-link"
        class="block rounded-lg border border-green-200 bg-green-50 p-4 text-green-700 hover:bg-green-100"
      >
        <span class="font-medium">Eigene Nährstoffwerte →</span>
        <p class="mt-1 text-sm text-green-600">LfL-Standardwerte für deine Kulturen anpassen</p>
      </router-link>

      <!-- Passwort ändern -->
      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <button
          type="button"
          data-testid="password-change-toggle"
          class="flex w-full items-center justify-between text-sm font-medium text-gray-700"
          @click="passwordExpanded = !passwordExpanded"
        >
          <span>Passwort ändern</span>
          <span>{{ passwordExpanded ? '▲' : '▼' }}</span>
        </button>

        <p
          v-if="passwordSuccess"
          data-testid="password-success"
          class="mt-2 text-sm text-green-600"
        >
          Passwort erfolgreich geändert.
        </p>
        <div v-if="passwordExpanded" class="mt-4 space-y-3">
          <div>
            <label class="block text-sm text-gray-600">Neues Passwort</label>
            <input
              v-model="newPassword"
              type="password"
              data-testid="new-password-input"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
              autocomplete="new-password"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-600">Passwort bestätigen</label>
            <input
              v-model="confirmPassword"
              type="password"
              data-testid="confirm-password-input"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
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
            class="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            @click="handlePasswordSave"
          >
            {{ passwordSaving ? 'Wird gespeichert…' : 'Passwort speichern' }}
          </button>
        </div>
      </div>

      <!-- Account löschen -->
      <div class="rounded-lg border border-red-200 bg-white p-4">
        <button
          v-if="!showDeleteConfirm"
          type="button"
          data-testid="delete-account-button"
          class="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
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
              class="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              @click="showDeleteConfirm = false"
            >
              Abbrechen
            </button>
            <button
              type="button"
              data-testid="delete-account-confirm-button"
              class="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              @click="handleDeleteAccount"
            >
              Endgültig löschen
            </button>
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <h2 class="text-sm font-medium text-gray-500">App-Info</h2>
        <p data-testid="profile-version" class="mt-1 text-sm text-gray-600">
          Düngungsberater · Stufe 3
        </p>
        <p class="text-sm text-gray-400">Basisdaten: LfL Bayern 2025/2026</p>
      </div>

      <button
        data-testid="profile-logout-button"
        class="w-full rounded-lg border border-red-300 px-4 py-3 text-center font-medium text-red-600 hover:bg-red-50"
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
import AppLayout from '@/components/AppLayout.vue'

const authStore = useAuthStore()
const router = useRouter()
const errorMessage = ref('')

// Passwort ändern
const passwordExpanded = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const passwordSuccess = ref(false)
const passwordSaving = ref(false)

// Account löschen
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
