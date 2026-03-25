import api from './client'

export interface CurrencyOption {
  id: number
  kod: string
  naziv: string
  simbol?: string
  drzava?: string
  aktivan?: boolean
}

export interface CreateAccountPayload {
  clientId: number
  firmaId?: number
  currencyId: number
  tip: string   // 'tekuci' | 'devizni'
  vrsta: string // 'licni' | 'poslovni'
  podvrsta?: string
  naziv?: string
  pocetnoStanje?: number
}

export interface AccountProto {
  id: string
  brojRacuna: string
  clientId: string
  firmaId: string
  currencyId: string
  currencyKod: string
  tip: string
  vrsta: string
  podvrsta?: string
  stanje: number
  raspolozivoStanje: number
  dnevniLimit: number
  mesecniLimit: number
  naziv: string
  status: string
}

export const accountApi = {
  listCurrencies: () => api.get<{ currencies: CurrencyOption[] }>('/currencies'),

  create: (data: CreateAccountPayload) =>
    api.post('/accounts/create', {
      clientId:      data.clientId,
      firmaId:       data.firmaId ?? 0,
      currencyId:    data.currencyId,
      tip:           data.tip,
      vrsta:         data.vrsta,
      podvrsta:      data.podvrsta ?? '',
      naziv:         data.naziv ?? '',
      pocetnoStanje: data.pocetnoStanje ?? 0,
    }),

  get: (id: string) => api.get(`/accounts/${id}`),

  listByClient: (clientId: string) => api.get(`/accounts/client/${clientId}`),

  listAll: (params: {
    clientName?: string
    accountNumber?: string
    tip?: string
    vrsta?: string
    status?: string
    currencyId?: number
    page?: number
    pageSize?: number
  }) => api.get('/accounts/search', { params: {
    client_name:  params.clientName,
    account_number: params.accountNumber,
    tip:          params.tip,
    vrsta:        params.vrsta,
    status:       params.status,
    currency_id:  params.currencyId,
    page:         params.page,
    page_size:    params.pageSize,
  }}),

  updateName: (id: string, naziv: string) =>
    api.put(`/accounts/${id}/name`, { naziv }),

  updateLimits: (id: string, dnevniLimit: number, mesecniLimit: number) =>
    api.put(`/accounts/${id}/limits`, { dnevni_limit: dnevniLimit, mesecni_limit: mesecniLimit }),
}
