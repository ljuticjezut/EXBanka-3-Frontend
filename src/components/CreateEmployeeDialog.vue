<script setup lang="ts">
import { ref } from 'vue'
import { employeeApi, type CreateEmployeePayload } from '../api/employee'

const emit = defineEmits<{
  close: []
  created: []
}>()

const form = ref({
  ime: '', prezime: '', datumRodjenja: '', pol: 'M',
  email: '', username: '', brojTelefona: '', adresa: '',
  pozicija: '', departman: '', aktivan: true,
})

const error = ref('')
const loading = ref(false)

async function handleCreate() {
  error.value = ''
  if (!form.value.ime || !form.value.prezime || !form.value.email || !form.value.username) {
    error.value = 'First name, last name, email and username are required.'
    return
  }
  loading.value = true
  try {
    const payload: CreateEmployeePayload = {
      ime:           form.value.ime,
      prezime:       form.value.prezime,
      datumRodjenja: form.value.datumRodjenja
        ? Math.floor(new Date(form.value.datumRodjenja).getTime() / 1000)
        : 0,
      pol:          form.value.pol,
      email:        form.value.email,
      brojTelefona: form.value.brojTelefona,
      adresa:       form.value.adresa,
      username:     form.value.username,
      pozicija:     form.value.pozicija,
      departman:    form.value.departman,
      aktivan:      form.value.aktivan,
    }
    await employeeApi.create(payload)
    emit('created')
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Failed to create employee.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>Create Employee</h2>
        <button class="modal-close" @click="emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>First Name *</label>
            <input v-model="form.ime" placeholder="e.g. Marko" required />
          </div>
          <div class="form-group">
            <label>Last Name *</label>
            <input v-model="form.prezime" placeholder="e.g. Petrovic" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Email *</label>
            <input v-model="form.email" type="email" placeholder="marko@bank.com" required />
          </div>
          <div class="form-group">
            <label>Username *</label>
            <input v-model="form.username" placeholder="mpetrovic" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Date of Birth</label>
            <input v-model="form.datumRodjenja" type="date" />
          </div>
          <div class="form-group">
            <label>Gender</label>
            <select v-model="form.pol">
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Phone</label>
            <input v-model="form.brojTelefona" placeholder="0601234567" />
          </div>
          <div class="form-group">
            <label>Address</label>
            <input v-model="form.adresa" placeholder="Street 1, City" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Position</label>
            <input v-model="form.pozicija" placeholder="e.g. Teller" />
          </div>
          <div class="form-group">
            <label>Department</label>
            <input v-model="form.departman" placeholder="e.g. Operations" />
          </div>
        </div>

        <div class="form-group" style="flex-direction:row;align-items:center;gap:10px">
          <input type="checkbox" id="aktivan-create" v-model="form.aktivan" style="width:16px;height:16px" />
          <label for="aktivan-create" style="margin:0;cursor:pointer">Active (default)</label>
        </div>

        <p style="font-size:13px;color:#6b7280">
          An activation email will be sent so the employee can set their password.
        </p>

        <p v-if="error" class="global-error">{{ error }}</p>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="emit('close')">Cancel</button>
        <button class="btn-primary" @click="handleCreate" :disabled="loading">
          {{ loading ? 'Creating...' : 'Create Employee' }}
        </button>
      </div>
    </div>
  </div>
</template>
