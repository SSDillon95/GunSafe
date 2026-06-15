# GunSafe

Detention center locker check-in and check-out system for police officers.

## Features

- **Check In / Out** — Select an officer and locker, then record entry or exit
- **Enroll Officer** — Add officers by badge number (officers cannot be deleted)
- **Locker Setup** — Configure locker numbers and locations (lockers cannot be deleted)
- **Activity Log** — Permanent audit trail; all records are append-only and cannot be deleted

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Data is stored in a local SQLite database at `data/gunsafe.db`.

## Deploy

This project is deployed on [Vercel](https://vercel.com). For cloud deployment, a persistent database (e.g. Turso or Vercel Postgres) is required since serverless functions cannot persist local files.