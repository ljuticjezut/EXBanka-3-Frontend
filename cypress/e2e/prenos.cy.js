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

function createClient(employeeToken, suffix, firstName, lastName, phone) {
  const email = `cypress.prenos.${suffix}.${Date.now()}@example.com`

  return cy
    .request({
      method: 'POST',
      url: `${API_BASE}/clients`,
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: {
        ime: firstName,
        prezime: lastName,
        datumRodjenja: 946684800,
        pol: 'M',
        email,
        brojTelefona: phone,
        adresa: 'Cypress Prenos 1',
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

describe('Cross-client prenos', () => {
  it('creates and verifies a same-currency prenos to another client account', () => {
    const testData = {
      sender: null,
      receiver: null,
      senderAccountName: `CY Prenos Sender ${Date.now()}`,
      senderAccount: null,
      receiverAccount: null,
      purpose: `cypress-prenos-${Date.now()}`,
    }

    adminLogin()
      .then((employeeToken) =>
        fetchCurrencies(employeeToken).then((rsd) => ({ employeeToken, rsd }))
      )
      .then(({ employeeToken, rsd }) =>
        createClient(employeeToken, 'sender', 'Cypress', 'PrenosSender', '0613333333').then((sender) =>
          createClient(employeeToken, 'receiver', 'Cypress', 'PrenosReceiver', '0614444444').then((receiver) => ({
            employeeToken,
            rsd,
            sender,
            receiver,
          }))
        )
      )
      .then(({ employeeToken, rsd, sender, receiver }) => {
        testData.sender = sender
        testData.receiver = receiver
        activateClient(sender.setupToken)
        activateClient(receiver.setupToken)

        return createAccount(employeeToken, sender.id, rsd.id, testData.senderAccountName, 5000).then((senderAccount) => {
          testData.senderAccount = senderAccount
          return createAccount(employeeToken, receiver.id, rsd.id, `CY Prenos Receiver ${Date.now()}`, 100).then((receiverAccount) => {
            testData.receiverAccount = receiverAccount
          })
        })
      })
      .then(() => {
        loginThroughUi(testData.sender.email)

        cy.visit('/client/prenos')
        cy.contains('h1', 'Prenos').should('be.visible')

        cy.get('.pr-field select')
          .first()
          .should('be.visible')
          .select(String(testData.senderAccount.id))
          .should('have.value', String(testData.senderAccount.id))

        cy.get('.pr-toggle button')
          .eq(1)
          .should('be.visible')
          .click()
          .should('have.class', 'active')

        cy.get('.pr-toggle button').eq(0).should('not.have.class', 'active')
        cy.get('input[placeholder*="Broj"]').should('be.visible')
        cy.get('.pr-field select').should('have.length', 1)

        cy.get('input[placeholder*="Broj"]').clear().type(testData.receiverAccount.brojRacuna)
        cy.get('input[type="number"]').clear().type('150')
        cy.get('input[placeholder="Svrha prenosa"]').clear().type(testData.purpose)

        cy.contains('button', 'Nastavi').click()
        cy.contains('button', /^Potvrdi$/).click()

        fetchOtp(testData.sender.email, testData.purpose).then((otp) => {
          cy.get('input[maxlength="6"]').clear().type(otp)
          cy.contains('button', 'Potvrdi kod').click()
        })

        cy.contains('button', 'Novi prenos').should('be.visible')

        cy.visit('/client/payments')
        cy.contains(testData.purpose).should('be.visible')
      })
  })
})
