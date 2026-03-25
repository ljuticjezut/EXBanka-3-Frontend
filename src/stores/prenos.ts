import { defineStore } from 'pinia'
import { ref } from 'vue'
import { prenosApi, type CreatePrenosPayload, type PrenosItem } from '../api/prenos'

export const usePrenosStore = defineStore('prenos', () => {
  const loading = ref(false)
  const error = ref('')

  async function createPrenos(data: CreatePrenosPayload): Promise<PrenosItem> {
    loading.value = true
    error.value = ''
    try {
      const res = await prenosApi.create(data)
      return res.data.prenos
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Greška pri kreiranju prenosa.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function verifyPrenos(prenosId: string, verificationCode: string): Promise<PrenosItem> {
    loading.value = true
    error.value = ''
    try {
      const res = await prenosApi.verify(prenosId, verificationCode)
      return res.data.prenos
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Greška pri verifikaciji prenosa.'
      throw e
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = ''
  }

  return { loading, error, createPrenos, verifyPrenos, clearError }
})
