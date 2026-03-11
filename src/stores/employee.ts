import { defineStore } from 'pinia'
import { ref } from 'vue'
import { employeeApi, type CreateEmployeePayload, type UpdateEmployeePayload } from '../api/employee'

export interface EmployeeListItem {
  id: string
  ime: string
  prezime: string
  email: string
  pozicija: string
  brojTelefona: string
  aktivan: boolean
  permissionNames: string[]
}

interface EmployeeFilters {
  emailFilter: string
  nameFilter: string
  pozicijaFilter: string
}

export const useEmployeeStore = defineStore('employee', () => {
  const employees = ref<EmployeeListItem[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = 20
  const filters = ref<EmployeeFilters>({
    emailFilter: '',
    nameFilter: '',
    pozicijaFilter: '',
  })
  const loading = ref(false)
  const error = ref('')

  async function fetchEmployees() {
    loading.value = true
    error.value = ''
    try {
      const res = await employeeApi.list({
        emailFilter: filters.value.emailFilter || undefined,
        nameFilter: filters.value.nameFilter || undefined,
        pozicijaFilter: filters.value.pozicijaFilter || undefined,
        page: page.value,
        pageSize,
      })
      employees.value = res.data.employees ?? []
      total.value = Number(res.data.total ?? 0)
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Failed to load employees.'
    } finally {
      loading.value = false
    }
  }

  async function createEmployee(data: CreateEmployeePayload) {
    await employeeApi.create(data)
    await fetchEmployees()
  }

  async function updateEmployee(id: string, data: UpdateEmployeePayload) {
    await employeeApi.update(id, data)
    await fetchEmployees()
  }

  async function setActive(id: string, aktivan: boolean) {
    await employeeApi.setActive(id, aktivan)
    await fetchEmployees()
  }

  async function updatePermissions(id: string, permissionNames: string[]) {
    await employeeApi.updatePermissions(id, permissionNames)
    await fetchEmployees()
  }

  function setFilters(newFilters: Partial<EmployeeFilters>) {
    Object.assign(filters.value, newFilters)
    page.value = 1
  }

  function clearFilters() {
    filters.value = { emailFilter: '', nameFilter: '', pozicijaFilter: '' }
    page.value = 1
  }

  return {
    employees,
    total,
    page,
    pageSize,
    filters,
    loading,
    error,
    fetchEmployees,
    createEmployee,
    updateEmployee,
    setActive,
    updatePermissions,
    setFilters,
    clearFilters,
  }
})
