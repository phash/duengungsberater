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
import { supabase } from '@/services/supabase'

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
    if (tokenHash) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      if (error) throw error
    } else if (token) {
      // Server-side verify via GoTrue API
      const res = await fetch(`/auth/v1/verify?token=${token}&type=${type}`, {
        redirect: 'manual',
      })
      // 303 = success (GoTrue redirects after verification)
      if (res.status !== 303 && res.status !== 200 && res.status !== 302) {
        throw new Error('Bestätigung fehlgeschlagen.')
      }
    }
    status.value = 'success'
  } catch (e) {
    status.value = 'error'
    errorMessage.value = e instanceof Error ? e.message : 'Bestätigung fehlgeschlagen. Der Link ist möglicherweise abgelaufen.'
  }
})
</script>
