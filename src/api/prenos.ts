import clientApi from './clientAuth'

export interface PrenosItem {
  id: string
  racunPosiljaocaId: string
  racunPrimaocaBroj: string
  iznos: number
  sifraPlacanja: string
  svrha: string
  status: string
  vremeTransakcije: string
}

export interface CreatePrenosPayload {
  racunPosiljaocaId: number
  racunPrimaocaBroj: string
  iznos: number
  svrha: string
}

export const prenosApi = {
  create: (data: CreatePrenosPayload) =>
    clientApi.post('/prenos', {
      racun_posiljaoca_id: data.racunPosiljaocaId,
      racun_primaoca_broj: data.racunPrimaocaBroj,
      iznos: data.iznos,
      svrha: data.svrha,
    }),

  verify: (prenosId: string, verificationCode: string) =>
    clientApi.post(`/prenos/${prenosId}/verify`, {
      verification_code: verificationCode,
    }),
}
