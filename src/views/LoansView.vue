<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { employeeLoanApi, type Loan } from '../api/employeeLoan'
import { LOAN_TYPES, LOAN_STATUS_LABELS } from '../api/loan'

const loans = ref<Loan[]>([])
const loading = ref(false)
const error = ref('')

const filterVrsta = ref('')
const filterBrojRacuna = ref('')
const filterStatus = ref('')

const STATUSES = [
  { value: 'zahtev',   label: 'Zahtev' },
  { value: 'odobren',  label: 'Odobren' },
  { value: 'odbijen',  label: 'Odbijen' },
  { value: 'aktivan',  label: 'Aktivan' },
  { value: 'zatvoren', label: 'Zatvoren' },
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await employeeLoanApi.listAll({
      vrsta: filterVrsta.value,
      brojRacuna: filterBrojRacuna.value,
      status: filterStatus.value,
    })
    loans.value = res.data ?? []
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Greška pri učitavanju kredita.'
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  filterVrsta.value = ''
  filterBrojRacuna.value = ''
  filterStatus.value = ''
  load()
}

function vrstaLabel(v: string) {
  return LOAN_TYPES.find(t => t.value === v)?.label ?? v
}

function statusBadgeClass(s: string) {
  switch (s) {
    case 'aktivan':  return 'badge badge-green'
    case 'zahtev':   return 'badge badge-yellow'
    case 'odobren':  return 'badge badge-blue'
    case 'odbijen':  return 'badge badge-red'
    case 'zatvoren': return 'badge badge-gray'
    default: return 'badge badge-gray'
  }
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
      <h1>Svi krediti</h1>
      <span style="font-size:14px;color:#6b7280">{{ loans.length }} pronađeno</span>
    </div>

    <!-- Filters -->
    <div class="filters">
      <select v-model="filterVrsta" @change="load">
        <option value="">Sve vrste</option>
        <option v-for="t in LOAN_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>
      <select v-model="filterStatus" @change="load">
        <option value="">Svi statusi</option>
        <option v-for="s in STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
      <input
        v-model="filterBrojRacuna"
        placeholder="Broj računa"
        @keyup.enter="load"
      />
      <button class="btn-primary" @click="load">Pretraži</button>
      <button class="btn-secondary" @click="clearFilters">Poništi</button>
    </div>

    <p v-if="error" class="global-error" style="margin-bottom:12px">{{ error }}</p>

    <div class="card" style="padding:0;overflow:hidden">
      <table>
        <thead>
          <tr>
            <th>Broj kredita</th>
            <th>Vrsta</th>
            <th>Status</th>
            <th>Iznos</th>
            <th>Period</th>
            <th>Kamatna stopa</th>
            <th>Rata</th>
            <th>Račun</th>
            <th>Datum kreiranja</th>
            <th>Datum dospeća</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="10" style="text-align:center;padding:24px;color:#6b7280">Učitavam...</td>
          </tr>
          <tr v-else-if="loans.length === 0">
            <td colspan="10" style="text-align:center;padding:24px;color:#6b7280">Nema kredita koji odgovaraju filterima.</td>
          </tr>
          <tr v-for="loan in loans" :key="loan.id">
            <td><code style="font-size:12px">{{ loan.broj_kredita }}</code></td>
            <td>{{ vrstaLabel(loan.vrsta) }}</td>
            <td><span :class="statusBadgeClass(loan.status)">{{ LOAN_STATUS_LABELS[loan.status] ?? loan.status }}</span></td>
            <td style="font-weight:600">{{ fmtMoney(loan.iznos) }} RSD</td>
            <td>{{ loan.period }} mes.</td>
            <td>{{ loan.kamatna_stopa?.toFixed(2) }}% ({{ loan.tip_kamate }})</td>
            <td>{{ fmtMoney(loan.iznos_rate) }} RSD</td>
            <td><code style="font-size:12px">{{ loan.broj_racuna }}</code></td>
            <td>{{ fmtDate(loan.datum_kreiranja) }}</td>
            <td>{{ fmtDate(loan.datum_dospeca) }}</td>
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
.filters select, .filters input { width: auto; min-width: 160px; }
.badge-yellow { background: #fef9c3; color: #854d0e; }
.badge-blue   { background: #dbeafe; color: #1d4ed8; }
.badge-gray   { background: #f1f5f9; color: #475569; }
</style>
