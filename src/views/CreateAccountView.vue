<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountStore } from '../stores/account'
import { accountApi, type CurrencyOption } from '../api/account'
import { employeeCardApi } from '../api/card'
import ClientSelectDialog from '../components/ClientSelectDialog.vue'
import api from '../api/client'
import { clientManagementApi } from '../api/clientManagement'

const router = useRouter()
const store = useAccountStore()

const showClientDialog = ref(false)
const selectedClientId = ref<string | null>(null)
const selectedClientLabel = ref('')
const currencies = ref<CurrencyOption[]>([])

const sifreDelatnosti = ref<{ id: number; sifra: string; naziv: string }[]>([])

async function loadSifreDelatnosti() {
  try {
    const [sifreRes, currenciesRes] = await Promise.all([
      api.get('/sifre-delatnosti'),
      accountApi.listCurrencies(),
    ])
    sifreDelatnosti.value = sifreRes.data.sifre ?? []
    currencies.value = (currenciesRes.data.currencies ?? []).filter(c => c.aktivan !== false)
  } catch {
    // ignore initial load failures; page will surface create-time errors
  }
}

const form = ref({
  currencyId: 0,
  tip: 'tekuci',
  vrsta: 'licni',
  podvrsta: 'standardni',
  naziv: '',
  pocetnoStanje: '',
})

const cardForm = ref({
  issue: false,
  vrstaKartice: 'visa',
  nazivKartice: '',
})

const firmaForm = ref({
  naziv: '',
  maticniBroj: '',
  pib: '',
  sifraDelatnostiId: 0,
  adresa: '',
})

const firmaError = ref('')
const firmaCreating = ref(false)

const licnePodvrste = [
  { value: 'standardni', label: 'Standardni' },
  { value: 'stedni', label: 'Štedni' },
  { value: 'penzionerski', label: 'Penzionerski' },
  { value: 'za_mlade', label: 'Za mlade' },
  { value: 'za_studente', label: 'Za studente' },
  { value: 'za_nezaposlene', label: 'Za nezaposlene' },
]

const poslovnePodvrste = [
  { value: 'doo', label: 'DOO' },
  { value: 'ad', label: 'AD' },
  { value: 'fondacija', label: 'Fondacija' },
]

const currentPodvrste = computed(() => {
  if (form.value.tip !== 'tekuci') return []
  return form.value.vrsta === 'poslovni' ? poslovnePodvrste : licnePodvrste
})

const availableCurrencies = computed(() => {
  if (form.value.tip === 'devizni') {
    return currencies.value.filter(c => c.kod !== 'RSD')
  }
  return currencies.value.filter(c => c.kod === 'RSD')
})

function defaultPodvrstaForSelection() {
  return form.value.vrsta === 'poslovni' ? 'doo' : 'standardni'
}

function syncPodvrstaForSelection() {
  if (form.value.tip !== 'tekuci') {
    form.value.podvrsta = ''
    return
  }
  const allowedValues = currentPodvrste.value.map(p => p.value)
  if (!allowedValues.includes(form.value.podvrsta)) {
    form.value.podvrsta = defaultPodvrstaForSelection()
  }
}

function syncCurrencyForSelection() {
  if (form.value.tip === 'tekuci') {
    form.value.currencyId = currencies.value.find(c => c.kod === 'RSD')?.id ?? 0
    return
  }
  const currentCurrencyAllowed = availableCurrencies.value.some(c => c.id === form.value.currencyId)
  if (!currentCurrencyAllowed) {
    form.value.currencyId = availableCurrencies.value[0]?.id ?? 0
  }
}

watch(() => form.value.tip, (newTip) => {
  syncCurrencyForSelection()
  syncPodvrstaForSelection()
  if (newTip !== 'tekuci') {
    cardForm.value.issue = false
  }
})

watch(() => form.value.vrsta, () => {
  syncPodvrstaForSelection()
})

watch(currencies, () => {
  syncCurrencyForSelection()
})

function onClientSelected(clientId: string, label?: string) {
  selectedClientId.value = clientId
  selectedClientLabel.value = label ?? `Klijent #${clientId}`
  showClientDialog.value = false
}

async function handleSubmit() {
  if (!selectedClientId.value) {
    store.error = 'Izaberite klijenta.'
    return
  }
  if (!form.value.currencyId) {
    store.error = 'Valuta nije dostupna. Osvežite stranicu i pokušajte ponovo.'
    return
  }

  let firmaId: number | undefined

  if (form.value.vrsta === 'poslovni') {
    if (!firmaForm.value.naziv || !firmaForm.value.maticniBroj || !firmaForm.value.pib) {
      store.error = 'Naziv, matični broj i PIB firme su obavezni.'
      return
    }
    firmaCreating.value = true
    firmaError.value = ''
    try {
      const res = await api.post('/firme', {
        naziv: firmaForm.value.naziv,
        maticniBroj: firmaForm.value.maticniBroj,
        pib: firmaForm.value.pib,
        sifraDelatnostiId: firmaForm.value.sifraDelatnostiId || undefined,
        adresa: firmaForm.value.adresa,
        vlasnikId: Number(selectedClientId.value),
      })
      firmaId = res.data.firma.id
    } catch (e: any) {
      store.error = e.response?.data?.error || 'Greška pri kreiranju firme.'
      firmaCreating.value = false
      return
    }
    firmaCreating.value = false
  }

  const autoNaziv = form.value.naziv || (form.value.tip === 'tekuci'
    ? `${currentPodvrste.value.find(p => p.value === form.value.podvrsta)?.label ?? 'Tekući'} račun`
    : 'Devizni račun')

  try {
    const account = await store.createAccount({
      clientId: Number(selectedClientId.value),
      currencyId: form.value.currencyId,
      tip: form.value.tip,
      vrsta: form.value.vrsta,
      podvrsta: form.value.tip === 'tekuci' ? form.value.podvrsta : undefined,
      firmaId,
      naziv: autoNaziv || undefined,
      pocetnoStanje: form.value.pocetnoStanje ? Number(form.value.pocetnoStanje) : 0,
    })

    if (cardForm.value.issue && form.value.tip === 'tekuci') {
      let clientName = selectedClientLabel.value
      let clientEmail = ''
      try {
        const clientRes = await clientManagementApi.get(String(selectedClientId.value))
        const client = clientRes.data.client
        if (client) {
          clientName = `${client.ime} ${client.prezime}`
          clientEmail = client.email
        }
      } catch {
        // Card notification is optional; proceed with the issuance attempt.
      }

      try {
        await employeeCardApi.createCard({
          accountId: Number(account.id),
          clientId: Number(selectedClientId.value),
          vrstaKartice: cardForm.value.vrstaKartice,
          nazivKartice: cardForm.value.nazivKartice || autoNaziv || 'Debitna kartica',
          clientEmail,
          clientName,
        })
      } catch (e: any) {
        store.error = e.response?.data?.error || 'Račun je kreiran, ali izdavanje kartice nije uspelo.'
        return
      }
    }

    router.push('/accounts')
  } catch {
    // store.error is already populated by the store or the card issuance fallback above
  }
}

onMounted(async () => {
  await loadSifreDelatnosti()
  syncCurrencyForSelection()
})
</script>

<template>
  <div class="page-content">
    <div class="page-header">
      <h1>Kreiranje računa</h1>
    </div>

    <div class="card" style="max-width:640px">
      <div class="form-group" style="margin-bottom:20px">
        <label>Tip računa *</label>
        <div style="display:flex;gap:24px;margin-top:6px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="radio" v-model="form.tip" value="tekuci" />
            Tekući račun
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="radio" v-model="form.tip" value="devizni" />
            Devizni račun
          </label>
        </div>
      </div>

      <div class="form-group" style="margin-bottom:20px">
        <label>Vrsta *</label>
        <div style="display:flex;gap:24px;margin-top:6px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="radio" v-model="form.vrsta" value="licni" />
            Lični
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="radio" v-model="form.vrsta" value="poslovni" />
            Poslovni
          </label>
        </div>
      </div>

      <div v-if="form.tip === 'tekuci' && currentPodvrste.length > 0" class="form-group" style="margin-bottom:20px">
        <label>Podvrsta računa *</label>
        <select v-model="form.podvrsta">
          <option v-for="p in currentPodvrste" :key="p.value" :value="p.value">
            {{ p.label }}
          </option>
        </select>
      </div>

      <div class="form-group" style="margin-bottom:20px">
        <label>Vlasnik (klijent) *</label>
        <div style="display:flex;align-items:center;gap:12px">
          <span v-if="selectedClientId" style="flex:1;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;background:#f9fafb">
            {{ selectedClientLabel }}
          </span>
          <span v-else style="flex:1;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;color:#9ca3af">
            Klijent nije izabran
          </span>
          <button class="btn-secondary" type="button" @click="showClientDialog = true">
            {{ selectedClientId ? 'Promeni' : 'Izaberi klijenta' }}
          </button>
        </div>
      </div>

      <div v-if="form.vrsta === 'poslovni'" style="border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:20px;background:#f8fafc">
        <h3 style="font-size:15px;font-weight:600;margin-bottom:16px;color:#1e293b">Podaci o firmi</h3>

        <div class="form-group" style="margin-bottom:14px">
          <label>Naziv firme *</label>
          <input v-model="firmaForm.naziv" placeholder="npr. Firma DOO" />
        </div>

        <div class="form-row" style="margin-bottom:14px">
          <div class="form-group">
            <label>Matični broj *</label>
            <input v-model="firmaForm.maticniBroj" placeholder="12345678" maxlength="8" />
          </div>
          <div class="form-group">
            <label>PIB *</label>
            <input v-model="firmaForm.pib" placeholder="123456789" maxlength="9" />
          </div>
        </div>

        <div class="form-group" style="margin-bottom:14px">
          <label>Šifra delatnosti</label>
          <select v-model="firmaForm.sifraDelatnostiId">
            <option :value="0">-- Izaberite šifru delatnosti --</option>
            <option v-for="s in sifreDelatnosti" :key="s.id" :value="s.id">
              {{ s.sifra }} — {{ s.naziv }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>Adresa</label>
          <input v-model="firmaForm.adresa" placeholder="Trg Republike V/5, Beograd, Srbija" />
        </div>

        <p style="font-size:12px;color:#64748b;margin-top:10px">
          Vlasnik firme će biti isti klijent koji je izabran kao vlasnik računa.
        </p>
      </div>

      <div v-if="form.tip === 'devizni'" class="form-group" style="margin-bottom:20px">
        <label>Valuta *</label>
        <select v-model="form.currencyId">
          <option v-for="c in availableCurrencies" :key="c.id" :value="c.id">
            {{ c.kod }} — {{ c.naziv }}
          </option>
        </select>
      </div>
      <div v-else class="form-group" style="margin-bottom:20px">
        <label>Valuta</label>
        <input value="RSD — Srpski dinar" disabled style="background:#f9fafb;color:#6b7280" />
      </div>

      <div class="form-group" style="margin-bottom:20px">
        <label>Početno stanje (opciono)</label>
        <input v-model="form.pocetnoStanje" type="number" min="0" step="0.01" placeholder="0.00" />
        <span style="font-size:12px;color:#64748b;margin-top:4px">Iznos koji klijent uplaćuje prilikom otvaranja računa</span>
      </div>

      <div class="form-group" style="margin-bottom:20px">
        <label>Naziv računa (opciono)</label>
        <input v-model="form.naziv" placeholder="npr. Moj štedni račun" />
      </div>

      <div class="form-group" style="margin-bottom:12px;flex-direction:row;align-items:center;gap:10px">
        <input
          id="card-checkbox"
          v-model="cardForm.issue"
          type="checkbox"
          :disabled="form.tip !== 'tekuci'"
          style="width:16px;height:16px"
        />
        <label for="card-checkbox" :style="{ margin: 0, color: form.tip === 'tekuci' ? '#111827' : '#9ca3af' }">
          Izdaj debitnu karticu uz otvaranje računa
        </label>
      </div>

      <div v-if="cardForm.issue && form.tip === 'tekuci'" style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:24px;background:#f8fafc">
        <div class="form-row" style="margin-bottom:14px">
          <div class="form-group">
            <label>Tip kartice *</label>
            <select v-model="cardForm.vrstaKartice">
              <option value="visa">Visa</option>
              <option value="mastercard">MasterCard</option>
              <option value="dinacard">DinaCard</option>
              <option value="amex">American Express</option>
            </select>
          </div>
          <div class="form-group">
            <label>Naziv kartice</label>
            <input v-model="cardForm.nazivKartice" placeholder="npr. Lična Visa kartica" />
          </div>
        </div>
        <p style="font-size:12px;color:#64748b;margin:0">
          Kartica će biti izdata na ime izabranog vlasnika računa nakon uspešnog otvaranja računa.
        </p>
      </div>

      <p v-if="store.error" class="global-error" style="margin-bottom:16px">{{ store.error }}</p>
      <p v-if="firmaError" class="global-error" style="margin-bottom:16px">{{ firmaError }}</p>

      <div style="display:flex;gap:12px">
        <button class="btn-secondary" type="button" @click="router.push('/accounts')">Otkaži</button>
        <button class="btn-primary" type="button" :disabled="store.loading || firmaCreating" @click="handleSubmit">
          {{ store.loading || firmaCreating ? 'Kreiram...' : 'Kreiraj račun' }}
        </button>
      </div>
    </div>
  </div>

  <ClientSelectDialog
    v-if="showClientDialog"
    @close="showClientDialog = false"
    @selected="onClientSelected"
  />
</template>
