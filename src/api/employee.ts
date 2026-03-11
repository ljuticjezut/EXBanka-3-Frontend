import api from './client'

export interface CreateEmployeePayload {
  ime: string
  prezime: string
  datumRodjenja: number // unix seconds
  pol: string
  email: string
  brojTelefona: string
  adresa: string
  username: string
  pozicija: string
  departman: string
  aktivan: boolean
}

export interface UpdateEmployeePayload {
  ime: string
  prezime: string
  datumRodjenja: number
  pol: string
  email: string
  brojTelefona: string
  adresa: string
  username: string
  pozicija: string
  departman: string
  aktivan: boolean
}

export const employeeApi = {
  list: (params: {
    emailFilter?: string
    nameFilter?: string
    pozicijaFilter?: string
    page?: number
    pageSize?: number
  }) => api.get('/employees', { params }),

  get: (id: string) => api.get(`/employees/${id}`),

  create: (data: CreateEmployeePayload) => api.post('/employees', data),

  update: (id: string, data: UpdateEmployeePayload) => api.put(`/employees/${id}`, data),

  setActive: (id: string, aktivan: boolean) =>
    api.patch(`/employees/${id}/active`, { aktivan }),

  updatePermissions: (id: string, permissionNames: string[]) =>
    api.put(`/employees/${id}/permissions`, { permissionNames }),

  getAllPermissions: () => api.get('/permissions'),
}
