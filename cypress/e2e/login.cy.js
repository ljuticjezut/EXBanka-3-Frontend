const API_BASE = '/api/v1'

function adminLogin() {
  return cy
    .request('POST', `${API_BASE}/auth/login`, {
      email: Cypress.env('adminEmail'),
      password: Cypress.env('adminPassword'),
    })
    .its('body.accessToken')
}

function createClient(employeeToken, label) {
  const email = `cypress.login.${label}.${Date.now()}@example.com`

  return cy
    .request({
      method: 'POST',
      url: `${API_BASE}/clients`,
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: {
        ime: 'Cypress',
        prezime: 'Login',
        datumRodjenja: 946684800,
        pol: 'M',
        email,
        brojTelefona: '0611111111',
        adresa: 'Cypress Login 1',
      },
    })
    .then(({ body }) => {
      const tokenMatch = body.message.match(/token:\s*(.+)$/)
      expect(tokenMatch, 'setup token').to.not.be.null

      return {
        id: String(body.client.id),
        email,
        setupToken: tokenMatch[1].trim(),
      }
    })
}

function activateClient(setupToken) {
  return cy.request('POST', `${API_BASE}/auth/client/activate`, {
    token: setupToken,
    password: Cypress.env('clientPassword'),
    passwordConfirm: Cypress.env('clientPassword'),
  })
}

function loginThroughUi(email, password) {
  cy.visit('/client/login')
  cy.get('input[type="email"]').clear().type(email)
  cy.get('input[type="password"]').clear().type(password)
  cy.contains('button', 'Sign In').click()
}

describe('Client login', () => {
  it('logs a client in and redirects to dashboard', () => {
    adminLogin()
      .then((employeeToken) => createClient(employeeToken, 'portal'))
      .then((client) => {
        activateClient(client.setupToken)
        loginThroughUi(client.email, Cypress.env('clientPassword'))

        cy.url().should('include', '/client/dashboard')
        cy.contains('button', 'Odjava').should('be.visible')
        cy.contains('Dashboard').should('be.visible')
      })
  })
})
