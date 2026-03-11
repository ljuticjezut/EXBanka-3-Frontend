<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '../api/auth'

const route = useRoute()
const router = useRouter()

const password = ref('')
const passwordConfirm = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)

async function handleReset() {
  error.value = ''
  if (password.value !== passwordConfirm.value) {
    error.value = 'Passwords do not match.'
    return
  }
  loading.value = true
  try {
    await authApi.resetPassword(route.params.token as string, password.value, passwordConfirm.value)
    success.value = 'Password reset successful! Redirecting to login...'
    setTimeout(() => router.push('/login'), 2000)
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Reset failed. The link may have expired.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Set New Password</h1>
      <p>Choose a new password for your account.</p>

      <div class="password-policy">
        <strong>Password requirements:</strong><br>
        • 8–32 characters<br>
        • At least 2 digits<br>
        • At least 1 uppercase letter<br>
        • At least 1 lowercase letter
      </div>

      <form @submit.prevent="handleReset" style="display:flex;flex-direction:column;gap:14px">
        <div class="form-group">
          <label>New Password</label>
          <input v-model="password" type="password" placeholder="Enter new password" required />
        </div>
        <div class="form-group">
          <label>Confirm Password</label>
          <input v-model="passwordConfirm" type="password" placeholder="Repeat new password" required />
        </div>

        <p v-if="error" class="global-error">{{ error }}</p>
        <p v-if="success" class="global-success">{{ success }}</p>

        <button type="submit" class="btn-primary" :disabled="loading" style="width:100%;padding:10px">
          {{ loading ? 'Resetting...' : 'Reset Password' }}
        </button>
      </form>
    </div>
  </div>
</template>
