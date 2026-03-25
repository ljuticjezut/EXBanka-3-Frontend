<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { validateAccountNumber } from '../../utils/accountValidation'
import { useClientAuthStore } from '../../stores/clientAuth'
import { useClientAccountStore } from '../../stores/clientAccount'
import { useRecipientStore } from '../../stores/recipient'
import { usePrenosStore } from '../../stores/prenos'

const router = useRouter()
const clientAuthStore = useClientAuthStore()
const accountStore = useClientAccountStore()
const recipientStore = useRecipientStore()
const prenosStore = usePrenosStore()

const clientId = computed(() => String(clientAuthStore.client?.id ?? ''))

const step = ref<'form' | 'confirm' | 'verify' | 'success'>('form')
const formError = ref('')
const verifyError = ref('')
const verificationCode = ref('')
const verifySecondsLeft = ref(300)
const codeExpired = ref(false)
const failedAttempts = ref(0)
const maxAttempts = 3
let verifyTimerInterval: ReturnType<typeof setInterval> | null = null

const form = ref({
  fromAccountId: '',
  recipientMode: 'saved' as 'saved' | 'manual',
  savedRecipientId: '',
  manualBrojRacuna: '',
  iznos: '',
  svrha: '',
})

const createdPrenos = ref<any>(null)

const activeAccounts = computed(() =>
  accountStore.accounts.filter(a => a.status === 'aktivan')
)

const fromAccount = computed(() =>
  activeAccounts.value.find(a => String(a.id) === form.value.fromAccountId) ?? null
)

const receiverBrojRacuna = computed(() => {
  if (form.value.recipientMode === 'saved') {
    const recipient = recipientStore.recipients.find(r => r.id === form.value.savedRecipientId)
    return recipient?.brojRacuna ?? ''
  }
  return form.value.manualBrojRacuna
})

const verifyCountdown = computed(() => {
  const m = Math.floor(verifySecondsLeft.value / 60)
  const s = verifySecondsLeft.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

function startVerifyTimer() {
  verifySecondsLeft.value = 300
  codeExpired.value = false
  failedAttempts.value = 0
  if (verifyTimerInterval) clearInterval(verifyTimerInterval)
  verifyTimerInterval = setInterval(() => {
    if (verifySecondsLeft.value > 0) {
      verifySecondsLeft.value--
    } else {
      codeExpired.value = true
      clearInterval(verifyTimerInterval!)
      verifyTimerInterval = null
    }
  }, 1000)
}

watch(step, newStep => {
  if (newStep === 'verify') {
    startVerifyTimer()
  } else if (verifyTimerInterval) {
    clearInterval(verifyTimerInterval)
    verifyTimerInterval = null
  }
})

function goToConfirm() {
  formError.value = ''
  if (!form.value.fromAccountId) {
    formError.value = 'Izaberite račun pošiljaoca.'
    return
  }
  if (!receiverBrojRacuna.value) {
    formError.value = 'Unesite broj računa primaoca.'
    return
  }
  if (!validateAccountNumber(receiverBrojRacuna.value)) {
    formError.value = 'Broj računa primaoca je neispravan.'
    return
  }
  if (!form.value.iznos || Number(form.value.iznos) <= 0) {
    formError.value = 'Unesite validan iznos.'
    return
  }
  if (!form.value.svrha.trim()) {
    formError.value = 'Unesite svrhu prenosa.'
    return
  }
  step.value = 'confirm'
}

async function handleSubmit() {
  try {
    prenosStore.clearError()
    createdPrenos.value = await prenosStore.createPrenos({
      racunPosiljaocaId: Number(form.value.fromAccountId),
      racunPrimaocaBroj: receiverBrojRacuna.value,
      iznos: Number(form.value.iznos),
      svrha: form.value.svrha,
    })
    verificationCode.value = ''
    verifyError.value = ''
    step.value = 'verify'
  } catch (e: any) {
    formError.value = e.response?.data?.message || prenosStore.error || 'Greška pri kreiranju prenosa.'
    step.value = 'form'
  }
}

async function handleVerify() {
  if (verificationCode.value.length !== 6 || !createdPrenos.value) return
  try {
    verifyError.value = ''
    await prenosStore.verifyPrenos(createdPrenos.value.id, verificationCode.value)
    await accountStore.fetchAccounts(clientId.value)
    step.value = 'success'
  } catch (e: any) {
    const message = e.response?.data?.message || prenosStore.error || 'Verifikacija prenosa nije uspela.'
    verifyError.value = message
    failedAttempts.value = Math.min(maxAttempts, failedAttempts.value + 1)

    const normalizedMessage = String(message).toLowerCase()
    if (
      normalizedMessage.includes('expired') ||
      normalizedMessage.includes('cancelled') ||
      normalizedMessage.includes('not pending') ||
      normalizedMessage.includes('exceeded')
    ) {
      codeExpired.value = true
      if (normalizedMessage.includes('exceeded')) {
        failedAttempts.value = maxAttempts
      }
      if (verifyTimerInterval) {
        clearInterval(verifyTimerInterval)
        verifyTimerInterval = null
      }
    }
  }
}

function startNew() {
  form.value = {
    fromAccountId: '',
    recipientMode: 'saved',
    savedRecipientId: '',
    manualBrojRacuna: '',
    iznos: '',
    svrha: '',
  }
  createdPrenos.value = null
  verificationCode.value = ''
  verifyError.value = ''
  formError.value = ''
  verifySecondsLeft.value = 300
  codeExpired.value = false
  failedAttempts.value = 0
  step.value = 'form'
}

onMounted(async () => {
  if (!clientId.value) return
  await Promise.all([
    accountStore.fetchAccounts(clientId.value),
    recipientStore.fetchRecipients(clientId.value),
  ])
})

onUnmounted(() => {
  if (verifyTimerInterval) clearInterval(verifyTimerInterval)
})
</script>

<template>
  <div class="pr-page">
    <h1 class="pr-title">Prenos</h1>

    <div class="pr-card">
      <div v-if="step === 'form'">
        <div class="pr-section-label">Prenos sredstava između klijenata</div>

        <div class="pr-field">
          <label>Sa računa</label>
          <select v-model="form.fromAccountId">
            <option value="">-- Izaberite račun --</option>
            <option v-for="acc in activeAccounts" :key="acc.id" :value="String(acc.id)">
              {{ acc.naziv || acc.brojRacuna }} — {{ acc.brojRacuna }} ({{ acc.currencyKod }})
            </option>
          </select>
        </div>

        <div class="pr-field">
          <label>Na račun</label>
          <div class="pr-toggle">
            <button :class="{ active: form.recipientMode === 'saved' }" @click="form.recipientMode = 'saved'">Iz liste</button>
            <button :class="{ active: form.recipientMode === 'manual' }" @click="form.recipientMode = 'manual'">Ručno</button>
          </div>
          <select v-if="form.recipientMode === 'saved'" v-model="form.savedRecipientId">
            <option value="">-- Izaberite primaoca --</option>
            <option v-for="recipient in recipientStore.recipients" :key="recipient.id" :value="recipient.id">
              {{ recipient.naziv }} — {{ recipient.brojRacuna }}
            </option>
          </select>
          <input
            v-else
            v-model="form.manualBrojRacuna"
            maxlength="18"
            placeholder="Broj računa primaoca"
          />
        </div>

        <div class="pr-field">
          <label>Iznos</label>
          <input v-model="form.iznos" type="number" min="0.01" step="0.01" placeholder="0.00" />
        </div>

        <div class="pr-field">
          <label>Svrha</label>
          <input v-model="form.svrha" placeholder="Svrha prenosa" />
        </div>

        <div v-if="formError" class="pr-error">{{ formError }}</div>

        <button class="pr-btn pr-btn-primary" @click="goToConfirm">Nastavi</button>
      </div>

      <div v-else-if="step === 'confirm'">
        <div class="pr-section-label">Potvrda prenosa</div>
        <div class="pr-summary">
          <div class="pr-summary-row">
            <span>Sa računa</span>
            <span>{{ fromAccount?.naziv || fromAccount?.brojRacuna }} — {{ fromAccount?.brojRacuna }}</span>
          </div>
          <div class="pr-summary-row">
            <span>Na račun</span>
            <span class="pr-mono">{{ receiverBrojRacuna }}</span>
          </div>
          <div class="pr-summary-row pr-summary-highlight">
            <span>Iznos</span>
            <span>{{ Number(form.iznos).toLocaleString('sr-RS', { minimumFractionDigits: 2 }) }} {{ fromAccount?.currencyKod }}</span>
          </div>
          <div class="pr-summary-row">
            <span>Svrha</span>
            <span>{{ form.svrha }}</span>
          </div>
        </div>
        <div class="pr-actions">
          <button class="pr-btn pr-btn-sec" @click="step = 'form'">Nazad</button>
          <button class="pr-btn pr-btn-primary" :disabled="prenosStore.loading" @click="handleSubmit">
            {{ prenosStore.loading ? 'Šaljem...' : 'Potvrdi' }}
          </button>
        </div>
      </div>

      <div v-else-if="step === 'verify'">
        <div class="pr-section-label">Verifikacija</div>
        <p class="pr-subtitle">Unesite 6-cifreni verifikacioni kod koji ste dobili emailom.</p>
        <div class="pr-countdown" :class="{ 'pr-countdown-expired': codeExpired }">
          <span v-if="!codeExpired">Kod ističe za: <strong>{{ verifyCountdown }}</strong></span>
          <span v-else>Kod je istekao.</span>
        </div>
        <div class="pr-attempts">
          Preostalo pokušaja: <strong>{{ maxAttempts - failedAttempts }}</strong>
        </div>
        <div class="pr-field">
          <input
            v-model="verificationCode"
            type="text"
            maxlength="6"
            placeholder="• • • • • •"
            class="pr-code-input"
            :disabled="codeExpired"
            @keyup.enter="handleVerify"
          />
        </div>
        <div v-if="verifyError" class="pr-error">{{ verifyError }}</div>
        <div class="pr-actions">
          <button class="pr-btn pr-btn-sec" @click="step = 'confirm'">Nazad</button>
          <button class="pr-btn pr-btn-primary" :disabled="verificationCode.length !== 6 || codeExpired || prenosStore.loading" @click="handleVerify">
            Potvrdi kod
          </button>
        </div>
      </div>

      <div v-else class="pr-success">
        <div class="pr-success-icon">✓</div>
        <h2>Prenos uspešno realizovan!</h2>
        <p class="pr-subtitle">Sredstva su uspešno poslata na drugi račun.</p>
        <div class="pr-actions" style="margin-top: 24px">
          <button class="pr-btn pr-btn-sec" @click="router.push('/client/payments')">Pregled plaćanja</button>
          <button class="pr-btn pr-btn-primary" @click="startNew">Novi prenos</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pr-page { padding: 32px; max-width: 680px; margin: 0 auto; }
.pr-title { font-size: 28px; font-weight: 700; color: #0f172a; margin-bottom: 24px; }
.pr-card {
  background: #fff; border-radius: 16px; padding: 32px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04);
  border: 1px solid #e2e8f0;
}
.pr-section-label {
  font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
  color: #64748b; margin-bottom: 20px; padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}
.pr-subtitle { color: #64748b; font-size: 14px; margin-bottom: 20px; }
.pr-field { margin-bottom: 18px; display: flex; flex-direction: column; gap: 6px; }
.pr-field label { font-size: 13px; font-weight: 600; color: #374151; }
.pr-field input, .pr-field select {
  padding: 11px 14px; border: 1px solid #d1d5db; border-radius: 10px;
  font-size: 14px; background: #fff;
}
.pr-toggle { display: flex; gap: 0; margin-bottom: 8px; }
.pr-toggle button {
  flex: 1; padding: 8px; font-size: 13px; font-weight: 500;
  border: 1px solid #d1d5db; background: #f8fafc; color: #64748b; cursor: pointer;
}
.pr-toggle button:first-child { border-radius: 8px 0 0 8px; }
.pr-toggle button:last-child { border-radius: 0 8px 8px 0; border-left: none; }
.pr-toggle button.active { background: #2563eb; color: #fff; border-color: #2563eb; }
.pr-error {
  padding: 10px 14px; background: #fef2f2; color: #dc2626;
  border-radius: 8px; font-size: 13px; margin-bottom: 16px;
}
.pr-btn {
  padding: 12px 24px; border-radius: 10px; font-size: 15px; font-weight: 600;
  cursor: pointer; border: none; transition: all 0.15s;
}
.pr-btn-primary { background: #2563eb; color: #fff; width: 100%; }
.pr-btn-sec { background: #f1f5f9; color: #475569; }
.pr-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.pr-actions { display: flex; gap: 12px; margin-top: 20px; }
.pr-actions .pr-btn-primary { flex: 1; }
.pr-summary { display: flex; flex-direction: column; margin-bottom: 4px; }
.pr-summary-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px;
}
.pr-summary-row span:first-child { color: #64748b; }
.pr-summary-row span:last-child { font-weight: 500; color: #0f172a; }
.pr-summary-highlight span:last-child { font-size: 18px; font-weight: 700; color: #2563eb; }
.pr-mono { font-family: 'SF Mono', monospace; font-size: 13px; }
.pr-countdown {
  text-align: center; font-size: 14px; color: #475569;
  margin-bottom: 16px; padding: 8px 14px;
  background: #f8fafc; border-radius: 8px;
}
.pr-countdown strong { color: #2563eb; font-size: 16px; }
.pr-countdown-expired { background: #fef2f2; color: #dc2626; }
.pr-attempts { text-align: center; font-size: 13px; color: #64748b; margin-bottom: 16px; }
.pr-code-input {
  text-align: center; font-size: 28px; font-weight: 700; letter-spacing: 12px;
  padding: 16px !important; font-family: 'SF Mono', monospace;
}
.pr-success { text-align: center; padding: 20px 0; }
.pr-success-icon {
  width: 64px; height: 64px; border-radius: 50%;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff; font-size: 32px; display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
}
.pr-success h2 { font-size: 22px; color: #0f172a; margin-bottom: 4px; }
</style>
