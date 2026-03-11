import api from './client'

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  activateAccount: (token: string, password: string, passwordConfirm: string) =>
    api.post('/auth/activate', { token, password, passwordConfirm }),

  requestPasswordReset: (email: string) =>
    api.post('/auth/password-reset/request', { email }),

  resetPassword: (token: string, password: string, passwordConfirm: string) =>
    api.post('/auth/password-reset/confirm', { token, password, passwordConfirm }),
}
