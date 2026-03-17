<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-parchment px-4">
    <!-- Topographic contour background -->
    <svg class="absolute inset-0 h-full w-full text-field-600 opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="topo" width="120" height="120" patternUnits="userSpaceOnUse">
          <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" stroke-width="0.7"/>
          <circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" stroke-width="0.6"/>
          <circle cx="60" cy="60" r="20" fill="none" stroke="currentColor" stroke-width="0.5"/>
          <path d="M0 30 Q30 18 60 30 Q90 42 120 30" fill="none" stroke="currentColor" stroke-width="0.5"/>
          <path d="M0 90 Q30 78 60 90 Q90 102 120 90" fill="none" stroke="currentColor" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#topo)"/>
    </svg>

    <div class="relative w-full max-w-sm animate-fade-in-up">
      <!-- Logo & Title -->
      <div class="mb-8 text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-field-600 shadow-lg shadow-field-600/25">
          <svg class="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 20h10"/>
            <path d="M12 20v-6"/>
            <path d="M12 14c-3 0-6-3-6-8 4 0 6 4 6 8z" fill="currentColor" opacity="0.25"/>
            <path d="M12 14c3 0 6-3 6-8-4 0-6 4-6 8z" fill="currentColor" opacity="0.25"/>
          </svg>
        </div>
        <h1 class="font-display text-3xl font-semibold tracking-tight text-stone-900" data-testid="app-title">
          Düngungsberater
        </h1>
        <p class="mt-2 text-sm tracking-wide text-stone-500">Düngeplanung nach LfL-Basisdaten</p>
      </div>

      <!-- ═══ Login / Register Form ═══ -->
      <form
        v-if="mode !== 'forgot' && mode !== 'newpw'"
        data-testid="auth-form"
        class="space-y-5 rounded-2xl bg-white p-6 shadow-warm-md"
        @submit.prevent="handleSubmit"
      >
        <h2 class="font-display text-xl font-semibold text-stone-800">
          {{ mode === 'login' ? 'Anmelden' : 'Registrieren' }}
        </h2>

        <div>
          <label for="email" class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">E-Mail</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            data-testid="auth-email-input"
            class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-stone-900 transition-all duration-200 placeholder:text-stone-400 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
            placeholder="name@beispiel.de"
          />
        </div>

        <div>
          <label for="password" class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Passwort</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            minlength="6"
            data-testid="auth-password-input"
            class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-stone-900 transition-all duration-200 placeholder:text-stone-400 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
          />
        </div>

        <p v-if="errorMessage" data-testid="auth-error" class="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {{ errorMessage }}
        </p>

        <p v-if="successMessage" data-testid="auth-success" class="rounded-xl bg-field-50 px-4 py-2.5 text-sm text-field-700">
          {{ successMessage }}
        </p>

        <button
          type="submit"
          :disabled="submitting"
          data-testid="auth-submit-button"
          class="w-full rounded-xl bg-field-600 px-4 py-3 font-semibold text-white shadow-lg shadow-field-600/20 transition-all duration-200 hover:bg-field-700 hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
        >
          {{ submitting ? 'Bitte warten…' : mode === 'login' ? 'Anmelden' : 'Registrieren' }}
        </button>

        <div class="space-y-2 text-center text-sm text-stone-500">
          <p>
            {{ mode === 'login' ? 'Noch kein Konto?' : 'Bereits registriert?' }}
            <button
              type="button"
              data-testid="auth-toggle-button"
              class="ml-1 font-semibold text-field-600 transition-colors hover:text-field-700 hover:underline"
              @click="switchMode(mode === 'login' ? 'register' : 'login')"
            >
              {{ mode === 'login' ? 'Registrieren' : 'Anmelden' }}
            </button>
          </p>
          <p v-if="mode === 'login'">
            <button
              type="button"
              data-testid="forgot-password-button"
              class="font-medium text-stone-400 transition-colors hover:text-stone-600 hover:underline"
              @click="switchMode('forgot')"
            >
              Passwort vergessen?
            </button>
          </p>
        </div>
      </form>

      <!-- ═══ Passwort vergessen Form ═══ -->
      <form
        v-if="mode === 'forgot'"
        data-testid="forgot-form"
        class="space-y-5 rounded-2xl bg-white p-6 shadow-warm-md"
        @submit.prevent="handleForgot"
      >
        <h2 class="font-display text-xl font-semibold text-stone-800">Passwort zurücksetzen</h2>
        <p class="text-sm text-stone-500">Gib deine E-Mail-Adresse ein. Du erhältst einen Link zum Zurücksetzen.</p>

        <div>
          <label for="forgot-email" class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">E-Mail</label>
          <input
            id="forgot-email"
            v-model="email"
            type="email"
            required
            data-testid="forgot-email-input"
            class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-stone-900 transition-all duration-200 placeholder:text-stone-400 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
            placeholder="name@beispiel.de"
          />
        </div>

        <p v-if="errorMessage" data-testid="forgot-error" class="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {{ errorMessage }}
        </p>

        <p v-if="successMessage" data-testid="forgot-success" class="rounded-xl bg-field-50 px-4 py-2.5 text-sm text-field-700">
          {{ successMessage }}
        </p>

        <button
          type="submit"
          :disabled="submitting"
          data-testid="forgot-submit-button"
          class="w-full rounded-xl bg-field-600 px-4 py-3 font-semibold text-white shadow-lg shadow-field-600/20 transition-all duration-200 hover:bg-field-700 hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
        >
          {{ submitting ? 'Bitte warten…' : 'Reset-Link senden' }}
        </button>

        <p class="text-center text-sm text-stone-500">
          <button
            type="button"
            data-testid="back-to-login-button"
            class="font-semibold text-field-600 transition-colors hover:text-field-700 hover:underline"
            @click="switchMode('login')"
          >
            Zurück zur Anmeldung
          </button>
        </p>
      </form>

      <!-- ═══ Neues Passwort setzen Form ═══ -->
      <form
        v-if="mode === 'newpw'"
        data-testid="newpw-form"
        class="space-y-5 rounded-2xl bg-white p-6 shadow-warm-md"
        @submit.prevent="handleNewPassword"
      >
        <h2 class="font-display text-xl font-semibold text-stone-800">Neues Passwort</h2>

        <div>
          <label for="new-password" class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Neues Passwort</label>
          <input
            id="new-password"
            v-model="newPassword"
            type="password"
            required
            minlength="6"
            data-testid="newpw-input"
            class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-stone-900 transition-all duration-200 placeholder:text-stone-400 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
            placeholder="Min. 6 Zeichen"
          />
        </div>

        <div>
          <label for="confirm-password" class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Passwort bestätigen</label>
          <input
            id="confirm-password"
            v-model="confirmPassword"
            type="password"
            required
            minlength="6"
            data-testid="newpw-confirm-input"
            class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-stone-900 transition-all duration-200 placeholder:text-stone-400 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
          />
        </div>

        <p v-if="errorMessage" data-testid="newpw-error" class="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {{ errorMessage }}
        </p>

        <p v-if="successMessage" data-testid="newpw-success" class="rounded-xl bg-field-50 px-4 py-2.5 text-sm text-field-700">
          {{ successMessage }}
        </p>

        <button
          type="submit"
          :disabled="submitting"
          data-testid="newpw-submit-button"
          class="w-full rounded-xl bg-field-600 px-4 py-3 font-semibold text-white shadow-lg shadow-field-600/20 transition-all duration-200 hover:bg-field-700 hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
        >
          {{ submitting ? 'Bitte warten…' : 'Passwort speichern' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { resetPasswordForEmail, updatePassword } from '@/services/auth.service'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

type Mode = 'login' | 'register' | 'forgot' | 'newpw'
const mode = ref<Mode>('login')
const email = ref('')
const password = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const submitting = ref(false)

onMounted(() => {
  // ?reset=true → Supabase hat den User via Reset-Link eingeloggt, neues PW setzen
  if (route.query.reset === 'true') {
    mode.value = 'newpw'
  }
})

function switchMode(m: Mode) {
  mode.value = m
  errorMessage.value = ''
  successMessage.value = ''
}

async function handleSubmit() {
  submitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  const result = mode.value === 'login'
    ? await auth.login(email.value, password.value)
    : await auth.register(email.value, password.value)

  submitting.value = false

  if (!result.success) {
    errorMessage.value = result.error ?? 'Ein Fehler ist aufgetreten.'
    return
  }

  if (mode.value === 'register') {
    mode.value = 'login'
    password.value = ''
    successMessage.value = 'Registrierung erfolgreich. Bitte bestätige deine E-Mail.'
    return
  }

  router.push({ name: 'felder' })
}

async function handleForgot() {
  submitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  const result = await resetPasswordForEmail(email.value)

  submitting.value = false

  if (!result.success) {
    errorMessage.value = result.error ?? 'Fehler beim Senden.'
    return
  }

  successMessage.value = 'Reset-Link gesendet. Prüfe dein E-Mail-Postfach.'
}

async function handleNewPassword() {
  errorMessage.value = ''
  successMessage.value = ''

  if (newPassword.value.length < 6) {
    errorMessage.value = 'Passwort muss mindestens 6 Zeichen lang sein.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Passwörter stimmen nicht überein.'
    return
  }

  submitting.value = true

  try {
    await updatePassword(newPassword.value)
    successMessage.value = 'Passwort gespeichert. Du wirst weitergeleitet…'
    setTimeout(() => router.push({ name: 'felder' }), 1500)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Fehler beim Speichern.'
  } finally {
    submitting.value = false
  }
}
</script>
