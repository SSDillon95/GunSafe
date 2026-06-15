# GunSafe

Detention center locker check-in and check-out system for police officers.

## Features

- **Check In / Out** — Select an officer and locker, then record entry or exit
- **Enroll Officer** — Add officers by badge number (officers cannot be deleted)
- **Locker Setup** — Configure locker numbers and locations (lockers cannot be deleted)
- **Activity Log** — Permanent audit trail; all records are append-only and cannot be deleted

## Getting Started (local)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Data is stored in `data/gunsafe.db`.

## Deploy on Vercel

Vercel cannot use local SQLite files. You must add a Postgres database:

1. Open your [GunSafe project on Vercel](https://vercel.com/dashboard)
2. Go to **Storage** → **Create Database** → **Postgres**
3. Connect it to the GunSafe project (this sets `POSTGRES_URL` automatically)
4. **Redeploy** the project

After redeploying, enroll officers and lockers will work on https://gunsafe.vercel.app.