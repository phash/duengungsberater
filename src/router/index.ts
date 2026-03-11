import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/felder',
    },
    {
      path: '/felder',
      name: 'felder',
      component: () => import('@/views/FelderView.vue'),
    },
  ],
})

export default router
