# Effee ITAM — IT Asset Management System

Internal, web-based IT Asset Management System for Effee Group. Manages the lifecycle of IT assets
(computers, monitors, printers, phones, SIM cards, network devices, peripherals) — registration,
assignment, transfer, return, and retirement — with role-based access control and a full audit trail.

> **Internal — Confidential.** Not for public distribution.

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Prisma 7** ORM with the **MariaDB/MySQL** driver adapter
- **JWT** sessions (jose) + **bcrypt** password hashing
- **Tailwind CSS** + Base UI components
- **PM2** process manager in production

## Key features

- Eight GLPI-style asset types, each with its own form, list, and detail layout
- Assignment history (assign / return / transfer / replacement) with connected-device linking
- PowerShell **inventory agent** for Windows hardware/OS auto-discovery + a Discovered onboarding queue
- Bulk Excel/CSV import & export, QR-code labelling
- Role-Based Access Control with data-visibility scoping (All / Department / Self)
- Reporting dashboard, audit logging, department/vendor/user management

## Getting started (local)

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL, JWT_SECRET, etc.
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Seed the initial roles, permissions, and admin account:

```bash
SEED_ADMIN_EMAIL='admin@example.com' SEED_ADMIN_PASSWORD='<strong-password>' \
  node --env-file=.env node_modules/tsx/dist/cli.mjs prisma/seed.ts
```

## Production deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the full Ubuntu + PM2 deployment guide, and section 12 for
the inventory agent.

## Configuration

Environment variables are documented in [`.env.example`](.env.example). **Never commit `.env`** — it
holds real credentials and is git-ignored.
