<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
    <div class="w-full max-w-sm space-y-6">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-green-800" data-testid="app-title">Düngungsberater</h1>
        <p class="mt-1 text-sm text-gray-500">Düngeplanung nach LfL-Basisdaten</p>
      </div>

      <form
        data-testid="auth-form"
        class="space-y-4 rounded-xl bg-white p-6 shadow"
        @submit.prevent="handleSubmit"
      >
        <h2 class="text-lg font-semibold">
          {{ isLogin ? 'Anmelden' : 'Registrieren' }}
        </h2>

        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">E-Mail</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            data-testid="auth-email-input"
            class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Passwort</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            minlength="6"
            data-testid="auth-password-input"
            class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
          />
        </div>

        <p
          v-if="errorMessage"
          data-testid="auth-error"
          class="text-sm text-red-600"
        >
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          :disabled="submitting"
          data-testid="auth-submit-button"
          class="w-full rounded-lg bg-green-700 px-4 py-2 text-white font-medium hover:bg-green-800 disabled:opacity-50"
        >
          {{ submitting ? 'Bitte warten…' : (isLogin ? 'Anmelden' : 'Registrieren') }}
        </button>

        <p class="text-center text-sm text-gray-500">
          {{ isLogin ? 'Noch kein Konto?' : 'Bereits registriert?' }}
          <button
            type="button"
            data-testid="auth-toggle-button"
            class="font-medium text-green-700 hover:underline"
            @click="toggleMode"
          >
            {{ isLogin ? 'Registrieren' : 'Anmelden' }}
          </button>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const router = useRouter()

const isLogin = ref(true)
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const submitting = ref(false)

function toggleMode() {
  isLogin.value = !isLogin.value
  errorMessage.value = ''
}

async function handleSubmit() {
  submitting.value = true
  errorMessage.value = ''

  const result = isLogin.value
    ? await auth.login(email.value, password.value)
    : await auth.register(email.value, password.value)

  submitting.value = false

  if (!result.success) {
    errorMessage.value = result.error ?? 'Ein Fehler ist aufgetreten.'
    return
  }

  if (!isLogin.value) {
    errorMessage.value = ''
    isLogin.value = true
    password.value = ''
    // Supabase sends confirmation email by default — show hint
    errorMessage.value = 'Registrierung erfolgreich. Bitte bestätige deine E-Mail.'
    return
  }

  router.push({ name: 'felder' })
}
</script>
