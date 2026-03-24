<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { employeeLoanApi, type Loan } from '../api/employeeLoan'
import { LOAN_TYPES, LOAN_STATUS_LABELS } from '../api/loan'

const auth = useAuthStore()

const requests = ref<Loan[]>([])
const loading = ref(false)
const error = ref('')

const filterVrsta = ref('')
const filterBrojRacuna = ref('')

const actionLoading = ref<number | null>(null)
const actionError = ref('')
const actionSuccess = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await employeeLoanApi.listRequests({
      vrsta: filterVrsta.value,
      brojRacuna: filterBrojRacuna.value,
    })
    requests.value = res.data ?? []
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Greška pri učitavanju zahteva.'
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  filterVrsta.value = ''
  filterBrojRacuna.value = ''
  load()
}

async function approve(loan: Loan) {
  if (!confirm(`Odobri kredit ${loan.broj_kredita}?`)) return
  actionLoading.value = loan.id
  actionError.value = ''
  actionSuccess.value = ''
  try {
    await employeeLoanApi.approve(loan.id, Number(auth.employee?.id ?? 0))
    actionSuccess.value = `Kredit ${loan.broj_kredita} je odobren.`
    await load()
  } catch (e: any) {
    actionError.value = e.response?.data?.error || 'Greška pri odobravanju.'
  } finally {
    actionLoading.value = null
  }
}

async function reject(loan: Loan) {
  if (!confirm(`Odbij kredit ${loan.broj_kredita}?`)) return
  actionLoading.value = loan.id
  actionError.value = ''
  actionSuccess.value = ''
  try {
    await employeeLoanApi.reject(loan.id, Number(auth.employee?.id ?? 0))
    actionSuccess.value = `Kredit ${loan.broj_kredita} je odbijen.`
    await load()
  } catch (e: any) {
    actionError.value = e.response?.data?.error || 'Greška pri odbijanju.'
  } finally {
    actionLoading.value = null
  }
}

function vrstaLabel(v: string) {
  return LOAN_TYPES.find(t => t.value === v)?.label ?? v
}

function fmtMoney(n: number) {
  return n.toLocaleString('sr-RS', { minimumFractionDigits: 2 })
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('sr-RS')
}

onMounted(load)
</script>

<template>
  <div class="page-content">
    <div class="page-header">
      <h1>Zahtevi za kredit</h1>
    </div>

    <!-- Filters -->
    <div class="filters">
      <select v-model="filterVrsta" @change="load">
        <option value="">Sve vrste</option>
        <option v-for="t in LOAN_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>
      <input
        v-model="filterBrojRacuna"
        placeholder="Broj računa"
        @keyup.enter="load"
      />
      <button class="btn-primary" @click="load">Pretraži</button>
      <button class="btn-secondary" @click="clearFilters">Poništi</button>
    </div>

    <p v-if="actionSuccess" class="global-success" style="margin-bottom:12px">{{ actionSuccess }}</p>
    <p v-if="actionError" class="global-error" style="margin-bottom:12px">{{ actionError }}</p>
    <p v-if="error" class="global-error" style="margin-bottom:12px">{{ error }}</p>

    <div class="card" style="padding:0;overflow:hidden">
      <table>
        <thead>
          <tr>
            <th>Broj kredita</th>
            <th>Vrsta</th>
            <th>Iznos</th>
            <th>Period</th>
            <th>Kamatna stopa</th>
            <th>Rata</th>
            <th>Račun</th>
            <th>Datum kreiranja</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9" style="text-align:center;padding:24px;color:#6b7280">Učitavam...</td>
          </tr>
          <tr v-else-if="requests.length === 0">
            <td colspan="9" style="text-align:center;padding:24px;color:#6b7280">Nema zahteva za kredit.</td>
          </tr>
          <tr v-for="loan in requests" :key="loan.id">
            <td><code style="font-size:12px">{{ loan.broj_kredita }}</code></td>
            <td>{{ vrstaLabel(loan.vrsta) }}</td>
            <td style="font-weight:600">{{ fmtMoney(loan.iznos) }} RSD</td>
            <td>{{ loan.period }} mes.</td>
            <td>{{ loan.kamatna_stopa?.toFixed(2) }}% ({{ loan.tip_kamate }})</td>
            <td>{{ fmtMoney(loan.iznos_rate) }} RSD</td>
            <td><code style="font-size:12px">{{ loan.broj_racuna }}</code></td>
            <td>{{ fmtDate(loan.datum_kreiranja) }}</td>
            <td>
              <div style="display:flex;gap:6px">
                <button
                  class="btn-success btn-sm"
                  :disabled="actionLoading === loan.id"
                  @click="approve(loan)"
                >
                  Odobri
                </button>
                <button
                  class="btn-danger btn-sm"
                  :disabled="actionLoading === loan.id"
                  @click="reject(loan)"
                >
                  Odbij
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h1 { font-size: 22px; font-weight: 700; }
.filters { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.filters select, .filters input { width: auto; min-width: 180px; }
</style>
