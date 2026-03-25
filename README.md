# EXBanka 3 Frontend

Vue 3 + TypeScript single-page application for the employee and client banking
portals.

## What it talks to

The frontend does not call internal service ports directly. In production and in
the default local setup it talks only to the nginx gateway on `/api/v1`, which
then routes requests to the backend microservices.

Key UI areas:

- employee login, activation, password reset
- employee management
- client management
- account opening and account portal
- client accounts, transfers, payments, exchange
- client loans and cards
- employee loan review

## Local run

The intended end-to-end run path is the root Docker stack:

```powershell
cd C:\Dev\Projects\SI
docker compose up -d --build
```

Open:

- app: `http://localhost`
- Mailhog: `http://localhost:8025`

## Frontend contract notes

- employee-authenticated calls use the axios client in
  [src/api/client.ts](/C:/Dev/Projects/SI/EXBanka-3-Frontend/src/api/client.ts)
- client-authenticated calls use
  [src/api/clientAuth.ts](/C:/Dev/Projects/SI/EXBanka-3-Frontend/src/api/clientAuth.ts)
- currencies are loaded from the backend at runtime; the frontend no longer
  assumes seeded currency IDs

## Build

Inside Docker the production bundle is built by the frontend Dockerfile.
If local toolchain dependencies are installed, the app can also be built with:

```powershell
npm install
npm run build
```
