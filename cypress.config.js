import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: false,
  },
  env: {
    adminEmail: 'admin@bank.com',
    adminPassword: 'Admin123!',
    clientPassword: 'ClientPass12',
  },
  viewportWidth: 1440,
  viewportHeight: 900,
  defaultCommandTimeout: 10000,
  requestTimeout: 15000,
  responseTimeout: 15000,
})
