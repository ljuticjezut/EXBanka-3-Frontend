import clientApi from './clientAuth'

export interface FirmaItem {
  id: number
  naziv: string
  maticniBroj: string
  pib: string
  adresa: string
  sifraDelatnostiId: number
}

export interface ClientAccountItem {
  id: string
  brojRacuna: string
  clientId: string
  firmaId: string
  currencyId: string
  currencyKod: string
  tip: string
  vrsta: string
  stanje: number
  raspolozivoStanje: number
  dnevniLimit: number
  mesecniLimit: number
  dnevnaPotrosnja: number
  mesecnaPotrosnja: number
  datumIsteka: string | null
  odrzavanjeRacuna: number
  firma: FirmaItem | null
  naziv: string
  status: string
}

export const clientAccountApi = {
  listByClient: (clientId: string) =>
    clientApi.get(`/accounts/client/${clientId}`),

  get: (id: string) =>
    clientApi.get(`/accounts/${id}`),
}
