import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/employees' },
    {
      path: '/login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/activate/:token',
      component: () => import('../views/ActivateAccountView.vue'),
      meta: { public: true },
    },
    {
      path: '/password-reset',
      component: () => import('../views/RequestPasswordResetView.vue'),
      meta: { public: true },
    },
    {
      path: '/reset-password/:token',
      component: () => import('../views/ResetPasswordView.vue'),
      meta: { public: true },
    },
    {
      path: '/employees',
      component: () => import('../views/EmployeeListView.vue'),
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isLoggedIn) return '/login'
  if (to.path === '/login' && auth.isLoggedIn) return '/employees'
})

export default router
