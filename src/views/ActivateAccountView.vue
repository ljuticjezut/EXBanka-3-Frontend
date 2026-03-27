<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '../api/auth'
import { clientAuthApi } from '../api/clientAuth'

const route = useRoute()
const router = useRouter()

const password = ref('')
const passwordConfirm = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)

// Client setup tokens are JWTs (3 dot-separated parts); employee tokens are hex strings.
const token = route.params.token as string
const isClientToken = token.split('.').length === 3

async function handleActivate() {
  error.value = ''
  if (password.value !== passwordConfirm.value) {
    error.value = 'Passwords do not match.'
    return
  }
  loading.value = true
  try {
    if (isClientToken) {
      await clientAuthApi.activateAccount(token, password.value, passwordConfirm.value)
      success.value = 'Account activated! You can now log in.'
      setTimeout(() => router.push('/client/login'), 2000)
    } else {
      await authApi.activateAccount(token, password.value, passwordConfirm.value)
      success.value = 'Account activated! You can now log in.'
      setTimeout(() => router.push('/login'), 2000)
    }
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Activation failed. The link may have expired.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Activate Account</h1>
      <p>Set a password to activate your account.</p>

      <div class="password-policy">
        <strong>Password requirements:</strong><br>
        • 8–32 characters<br>
        • At least 2 digits<br>
        • At least 1 uppercase letter<br>
        • At least 1 lowercase letter
      </div>

      <form @submit.prevent="handleActivate" style="display:flex;flex-direction:column;gap:14px">
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
          {{ loading ? 'Activating...' : 'Activate Account' }}
        </button>
      </form>
    </div>
  </div>
</template>
