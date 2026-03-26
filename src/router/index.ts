import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'landing',
    component: () => import('@/views/LandingView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/felder',
    name: 'felder',
    component: () => import('@/views/FieldsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/felder/:fieldId/planung',
    name: 'anbauplanung',
    component: () => import('@/views/CropPlanView.vue'),
    meta: { requiresAuth: true },
    props: true,
  },
  {
    path: '/felder/:fieldId/planung/:planId/empfehlung',
    name: 'empfehlung',
    component: () => import('@/views/RecommendationView.vue'),
    meta: { requiresAuth: true },
    props: true,
  },
  {
    path: '/profil',
    name: 'profil',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profil/werte',
    name: 'NutrientValues',
    component: () => import('@/views/NutrientValuesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const { useAuthStore } = await import('@/stores/auth.store')
  const auth = useAuthStore()

  if (auth.loading) {
    // Wait for auth init to finish, with timeout to prevent infinite hang
    await Promise.race([
      new Promise<void>((resolve) => {
        const unwatch = auth.$subscribe(() => {
          if (!auth.loading) {
            unwatch()
            resolve()
          }
        })
      }),
      new Promise<void>((resolve) => setTimeout(resolve, 5000)),
    ])
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.requiresAdmin && !auth.isAdminUser) {
    return { name: 'felder' }
  }

  if ((to.name === 'login' || to.name === 'landing') && auth.isAuthenticated) {
    return { name: 'felder' }
  }
})

export default router
