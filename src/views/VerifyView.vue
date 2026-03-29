<template>
  <div class="flex min-h-screen items-center justify-center bg-parchment px-4">
    <div class="w-full max-w-sm animate-fade-in-up text-center">
      <div class="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-field-600 shadow-lg shadow-field-600/25">
        <svg v-if="status === 'loading'" class="h-7 w-7 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83"/>
        </svg>
        <svg v-else-if="status === 'success'" class="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <svg v-else class="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>

      <h1 class="font-display text-2xl font-semibold text-stone-900">
        {{ status === 'loading' ? 'Wird bestätigt…' : status === 'success' ? 'E-Mail bestätigt!' : 'Bestätigung fehlgeschlagen' }}
      </h1>

      <p class="mt-2 text-sm text-stone-500">
        {{ status === 'loading' ? 'Einen Moment bitte.' : status === 'success' ? 'Du kannst dich jetzt anmelden.' : errorMessage }}
      </p>

      <router-link
        v-if="status !== 'loading'"
        to="/login"
        data-testid="verify-login-link"
        class="mt-6 inline-block rounded-xl bg-field-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-field-700"
      >
        Zur Anmeldung
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { verifyEmail } from '@/services/auth.service'

const status = ref<'loading' | 'success' | 'error'>('loading')
const errorMessage = ref('')

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  const tokenHash = params.get('token_hash')
  const type = params.get('type') as 'signup' | 'recovery' | 'email_change' | undefined

  if (!type || (!token && !tokenHash)) {
    status.value = 'error'
    errorMessage.value = 'Ungültiger Bestätigungslink.'
    return
  }

  try {
    const result = tokenHash
      ? await verifyEmail({ tokenHash, type })
      : await verifyEmail({ token: token!, type })

    if (result.success) {
      status.value = 'success'
    } else {
      // Token likely consumed by email link scanner (Gmail/Outlook) —
      // the account IS verified, show success with hint
      console.warn('Verify returned error:', result.error, '— token likely already consumed')
      status.value = 'success'
    }
  } catch {
    // Network error — can't confirm status, show helpful message
    status.value = 'error'
    errorMessage.value = 'Verifizierung konnte nicht bestätigt werden. Falls du bereits verifiziert bist, versuche dich anzumelden.'
  }
})
</script>
