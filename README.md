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

## Deploy on Vercel (requires a database)

Vercel cannot store data in local files. Connect a Postgres database:

1. Open [GunSafe on Vercel](https://vercel.com/ssdillon95s-projects/gunsafe)
2. Go to **Storage** → search **Neon** → **Add Integration**
3. Accept terms, create a database, and **connect it to the GunSafe project**
4. Click **Redeploy** (Deployments → ⋯ → Redeploy)

Vercel will inject `POSTGRES_URL` automatically. After redeploying, enroll and locker setup will work.