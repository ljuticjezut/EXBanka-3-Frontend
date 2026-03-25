const API_BASE = '/api/v1'

function adminLogin() {
  return cy
    .request('POST', `${API_BASE}/auth/login`, {
      email: Cypress.env('adminEmail'),
      password: Cypress.env('adminPassword'),
    })
    .its('body.accessToken')
}

function fetchCurrencies(employeeToken) {
  return cy
    .request({
      method: 'GET',
      url: `${API_BASE}/currencies`,
      headers: { Authorization: `Bearer ${employeeToken}` },
    })
    .then(({ body }) => {
      const currencies = body.currencies || []
      const rsd = currencies.find((item) => item.kod === 'RSD')
      expect(rsd, 'RSD currency').to.exist
      return rsd
    })
}

function createClient(employeeToken, suffix) {
  const email = `cypress.transfer.${suffix}.${Date.now()}@example.com`

  return cy
    .request({
      method: 'POST',
      url: `${API_BASE}/clients`,
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: {
        ime: 'Cypress',
        prezime: 'Transfer',
        datumRodjenja: 946684800,
        pol: 'M',
        email,
        brojTelefona: '0612222222',
        adresa: 'Cypress Transfer 1',
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

function createAccount(employeeToken, clientId, currencyId, naziv, pocetnoStanje) {
  return cy
    .request({
      method: 'POST',
      url: `${API_BASE}/accounts/create`,
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: {
        clientId: Number(clientId),
        currencyId,
        tip: 'tekuci',
        vrsta: 'licni',
        podvrsta: 'standardni',
        naziv,
        pocetnoStanje,
      },
    })
    .its('body.account')
}

function loginThroughUi(email) {
  cy.visit('/client/login')
  cy.get('input[type="email"]').clear().type(email)
  cy.get('input[type="password"]').clear().type(Cypress.env('clientPassword'))
  cy.contains('button', 'Sign In').click()
  cy.url().should('include', '/client/dashboard')
}

function fetchOtp(toEmail, bodyHint, attempt = 0) {
  return cy.request('GET', 'http://localhost:8025/api/v2/messages').then(({ body }) => {
    const items = body.items || []
    const match = items.find((item) => {
      const toHeader = (item.Content?.Headers?.To || []).join(' ')
      const mailBody = item.Content?.Body || ''
      return toHeader.includes(toEmail) && mailBody.includes(bodyHint)
    })

    if (match) {
      const otpMatch = (match.Content?.Body || '').match(/\b\d{6}\b/)
      expect(otpMatch, 'OTP code').to.not.be.null
      return otpMatch[0]
    }

    if (attempt >= 10) {
      throw new Error(`OTP not found for ${toEmail} / ${bodyHint}`)
    }

    cy.wait(1000)
    return fetchOtp(toEmail, bodyHint, attempt + 1)
  })
}

describe('Same-client transfers', () => {
  it('creates and verifies a transfer between two accounts of the same client', () => {
    const testData = {
      client: null,
      fromAccountName: `CY Transfer From ${Date.now()}`,
      toAccountName: `CY Transfer To ${Date.now()}`,
      fromAccount: null,
      toAccount: null,
      purpose: `cypress-transfer-${Date.now()}`,
    }

    adminLogin()
      .then((employeeToken) =>
        fetchCurrencies(employeeToken).then((rsd) => ({ employeeToken, rsd }))
      )
      .then(({ employeeToken, rsd }) =>
        createClient(employeeToken, 'same-client').then((client) => ({
          employeeToken,
          rsd,
          client,
        }))
      )
      .then(({ employeeToken, rsd, client }) => {
        testData.client = client
        activateClient(client.setupToken)
        return createAccount(employeeToken, client.id, rsd.id, testData.fromAccountName, 5000).then((fromAccount) => {
          testData.fromAccount = fromAccount
          return createAccount(employeeToken, client.id, rsd.id, testData.toAccountName, 100).then((toAccount) => {
            testData.toAccount = toAccount
          })
        })
      })
      .then(() => {
        loginThroughUi(testData.client.email)

        cy.visit('/client/transfers')
        cy.contains('h1', 'Transferi').should('be.visible')

        cy.get('.tf-card-primary .tf-field select')
          .eq(0)
          .should('be.visible')
          .select(String(testData.fromAccount.id))
          .should('have.value', String(testData.fromAccount.id))

        cy.get('.tf-card-primary .tf-field select')
          .eq(1)
          .should('be.visible')
          .select(String(testData.toAccount.id))
          .should('have.value', String(testData.toAccount.id))

        cy.get('input[type="number"]').clear().type('200')
        cy.get('input[placeholder="Svrha transakcije"]').clear().type(testData.purpose)

        cy.contains('button', 'Nastavi').click()
        cy.contains('span', 'Provizija').should('be.visible')
        cy.contains('button', 'Potvrdi transfer').click()

        fetchOtp(testData.client.email, testData.purpose).then((otp) => {
          cy.get('input[maxlength="6"]').clear().type(otp)
          cy.contains('button', 'Verifikuj transfer').click()
        })

        cy.contains('Transfer uspesno realizovan!').should('be.visible')
        cy.contains(testData.purpose).should('be.visible')
        cy.contains('button', 'Novi transfer').should('be.visible')
      })
  })
})
