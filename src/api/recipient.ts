import clientApi from './clientAuth'

export interface RecipientItem {
  id: string
  clientId: string
  naziv: string
  brojRacuna: string
}

export const recipientApi = {
  listByClient: (clientId: string) =>
    clientApi.get('/recipients', { params: { client_id: clientId } }),

  create: (clientId: string, naziv: string, brojRacuna: string) =>
    clientApi.post('/recipients', {
      client_id:   clientId,
      naziv,
      broj_racuna: brojRacuna,
    }),

  update: (id: string, clientId: string, naziv: string, brojRacuna: string) =>
    clientApi.put(`/recipients/${id}`, {
      client_id: clientId,
      naziv,
      broj_racuna: brojRacuna,
    }),

  delete: (id: string, clientId: string) =>
    clientApi.delete(`/recipients/${id}`, { data: { client_id: clientId } }),
}
