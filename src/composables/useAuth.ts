import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

export function useAuth() {
  const store = useAuthStore()

  const isLoggedIn = computed(() => store.isLoggedIn)
  const currentUser = computed(() => store.employee)

  function hasPermission(perm: string): boolean {
    return store.hasPermission(perm)
  }

  async function login(email: string, password: string) {
    return store.login(email, password)
  }

  function logout() {
    store.logout()
  }

  return { isLoggedIn, currentUser, hasPermission, login, logout }
}
