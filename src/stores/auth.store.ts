import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authService from '@/services/auth.service'

export const useAuthStore = defineStore('auth', () => {
  const userId = ref<string | null>(null)
  const userEmail = ref<string | null>(null)
  const isAdminUser = ref(false)
  const loading = ref(true)

  const isAuthenticated = computed(() => userId.value !== null)

  async function init() {
    loading.value = true
    userId.value = await authService.getCurrentUserId()
    if (userId.value) {
      userEmail.value = await authService.getCurrentUserEmail()
      isAdminUser.value = await authService.isAdmin()
    }
    loading.value = false

    authService.onAuthStateChange(async (id) => {
      userId.value = id
      if (id) {
        userEmail.value = await authService.getCurrentUserEmail()
        isAdminUser.value = await authService.isAdmin()
      } else {
        userEmail.value = null
        isAdminUser.value = false
      }
    })
  }

  async function login(email: string, password: string) {
    return authService.signIn(email, password)
  }

  async function register(email: string, password: string) {
    return authService.signUp(email, password)
  }

  async function logout() {
    await authService.signOut()
    userId.value = null
    userEmail.value = null
    isAdminUser.value = false
  }

  return { userId, userEmail, isAuthenticated, isAdminUser, loading, init, login, register, logout }
})
