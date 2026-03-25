import { defineStore } from 'pinia'
import { ref } from 'vue'
import { recipientApi, type RecipientItem } from '../api/recipient'

export const useRecipientStore = defineStore('recipient', () => {
  const recipients = ref<RecipientItem[]>([])
  const loading = ref(false)
  const error = ref('')

  async function fetchRecipients(clientId: string) {
    loading.value = true
    error.value = ''
    try {
      const res = await recipientApi.listByClient(clientId)
      recipients.value = res.data.recipients ?? []
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Failed to load recipients.'
    } finally {
      loading.value = false
    }
  }

  async function createRecipient(clientId: string, naziv: string, brojRacuna: string): Promise<RecipientItem> {
    const res = await recipientApi.create(clientId, naziv, brojRacuna)
    const created: RecipientItem = res.data.recipient
    recipients.value.push(created)
    return created
  }

  async function updateRecipient(id: string, clientId: string, naziv: string, brojRacuna: string): Promise<void> {
    const res = await recipientApi.update(id, clientId, naziv, brojRacuna)
    const updated: RecipientItem = res.data.recipient
    const idx = recipients.value.findIndex(r => r.id === id)
    if (idx !== -1) recipients.value[idx] = updated
  }

  async function deleteRecipient(id: string, clientId: string): Promise<void> {
    await recipientApi.delete(id, clientId)
    recipients.value = recipients.value.filter(r => r.id !== id)
  }

  function clearError() {
    error.value = ''
  }

  return { recipients, loading, error, fetchRecipients, createRecipient, updateRecipient, deleteRecipient, clearError }
})
