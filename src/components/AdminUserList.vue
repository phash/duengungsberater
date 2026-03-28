<template>
  <div class="space-y-2">
    <p class="text-xs text-stone-400">{{ users.length }} Benutzer registriert</p>
    <ul class="space-y-2">
      <li
        v-for="user in users"
        :key="user.id"
        :data-testid="`admin-user-item-${user.id}`"
        class="rounded-xl border border-stone-200 bg-white px-4 py-3"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-stone-800" :data-testid="`admin-user-email-${user.id}`">
              {{ user.email }}
            </p>
            <p class="mt-0.5 text-xs text-stone-400">
              Registriert: {{ formatDate(user.created_at) }}
              <template v-if="user.last_sign_in_at">
                · Letzter Login: {{ formatDate(user.last_sign_in_at) }}
              </template>
            </p>
          </div>
          <div class="flex items-center gap-2">
            <!-- Status badge -->
            <span
              :data-testid="`admin-user-status-${user.id}`"
              :class="[
                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                statusClass(user),
              ]"
            >
              {{ statusLabel(user) }}
            </span>
            <!-- Ban/Unban toggle -->
            <button
              v-if="user.role !== 'admin' && isBanned(user)"
              :data-testid="`admin-user-ban-${user.id}`"
              class="rounded-lg px-2 py-1.5 text-xs font-medium text-field-600 transition-colors hover:bg-field-50"
              @click="$emit('unban', user.id)"
            >
              Entsperren
            </button>
            <button
              v-if="user.role !== 'admin' && !isBanned(user)"
              :data-testid="`admin-user-ban-${user.id}`"
              class="rounded-lg px-2 py-1.5 text-xs font-medium text-wheat-700 transition-colors hover:bg-wheat-50"
              @click="$emit('ban', user.id)"
            >
              Sperren
            </button>
            <!-- Delete -->
            <button
              v-if="user.role !== 'admin'"
              :data-testid="`admin-user-delete-${user.id}`"
              class="rounded-lg px-2 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
              @click="$emit('delete', user.id, user.email)"
            >
              Löschen
            </button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { AdminUser } from '@/types'

defineProps<{ users: AdminUser[] }>()
defineEmits<{
  ban: [userId: string]
  unban: [userId: string]
  delete: [userId: string, email: string]
}>()

function isBanned(user: AdminUser): boolean {
  return user.banned_until !== null && new Date(user.banned_until) > new Date()
}

function statusLabel(user: AdminUser): string {
  if (isBanned(user)) return 'Gesperrt'
  if (!user.email_confirmed_at) return 'Unbestätigt'
  return 'Aktiv'
}

function statusClass(user: AdminUser): string {
  if (isBanned(user)) return 'bg-red-50 text-red-700'
  if (!user.email_confirmed_at) return 'bg-wheat-50 text-wheat-700'
  return 'bg-field-50 text-field-700'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
</script>
