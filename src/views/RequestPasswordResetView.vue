<script setup lang="ts">
import { ref } from 'vue'
import { authApi } from '../api/auth'

const email = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)

async function handleRequest() {
  if (!email.value) { error.value = 'Please enter your email.'; return }
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    await authApi.requestPasswordReset(email.value)
    success.value = 'If this email exists, a reset link has been sent.'
  } catch {
    success.value = 'If this email exists, a reset link has been sent.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Reset Password</h1>
      <p>Enter your email address and we will send you a reset link.</p>

      <form @submit.prevent="handleRequest" style="display:flex;flex-direction:column;gap:14px">
        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="your@email.com" required />
        </div>

        <p v-if="error" class="global-error">{{ error }}</p>
        <p v-if="success" class="global-success">{{ success }}</p>

        <button type="submit" class="btn-primary" :disabled="loading" style="width:100%;padding:10px">
          {{ loading ? 'Sending...' : 'Send Reset Link' }}
        </button>
      </form>

      <a @click="$router.push('/login')" style="text-align:center">Back to Login</a>
    </div>
  </div>
</template>
