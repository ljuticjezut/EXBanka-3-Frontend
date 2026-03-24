import api from './client'
import type { Loan, LoanInstallment } from './loan'

export type { Loan, LoanInstallment }

export interface LoanFilter {
  vrsta?: string
  brojRacuna?: string
  status?: string
}

export const employeeLoanApi = {
  listRequests: (filter: LoanFilter = {}) =>
    api.get('/loans/requests', {
      params: {
        vrsta:       filter.vrsta || undefined,
        broj_racuna: filter.brojRacuna || undefined,
      },
    }),

  listAll: (filter: LoanFilter = {}) =>
    api.get('/loans/all', {
      params: {
        vrsta:       filter.vrsta || undefined,
        broj_racuna: filter.brojRacuna || undefined,
        status:      filter.status || undefined,
      },
    }),

  approve: (loanId: number, zaposleniId: number) =>
    api.post(`/loans/${loanId}/approve`, { zaposleni_id: zaposleniId }),

  reject: (loanId: number, zaposleniId: number) =>
    api.post(`/loans/${loanId}/reject`, { zaposleni_id: zaposleniId }),
}
