import type { ActiveSession, CheckEvent, Locker, Officer } from "./types";

const usePostgres = Boolean(
  process.env.POSTGRES_URL || process.env.DATABASE_URL
);

function assertDatabaseConfigured() {
  if (process.env.VERCEL === "1" && !usePostgres) {
    throw new Error(
      "Database not configured. Add Vercel Postgres to this project in the Vercel dashboard (Storage → Create Database → Postgres), then redeploy."
    );
  }
}

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = initSchema();
  }
  return schemaReady;
}

async function initSchema(): Promise<void> {
  assertDatabaseConfigured();

  if (usePostgres) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL!);
    await sql`
      CREATE TABLE IF NOT EXISTS officers (
        id SERIAL PRIMARY KEY,
        badge_number TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        department TEXT,
        enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS lockers (
        id SERIAL PRIMARY KEY,
        locker_number TEXT NOT NULL UNIQUE,
        location TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS check_events (
        id SERIAL PRIMARY KEY,
        officer_id INTEGER NOT NULL REFERENCES officers(id),
        locker_id INTEGER NOT NULL REFERENCES lockers(id),
        event_type TEXT NOT NULL CHECK (event_type IN ('check_in', 'check_out')),
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_check_events_officer ON check_events(officer_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_check_events_locker ON check_events(locker_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_check_events_recorded ON check_events(recorded_at)`;
    return;
  }

  const Database = (await import("better-sqlite3")).default;
  const fs = await import("fs");
  const path = await import("path");

  const dataDir =
    process.env.VERCEL === "1"
      ? "/tmp"
      : path.join(process.cwd(), "data");
  const dbPath = path.join(dataDir, "gunsafe.db");

  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS officers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      badge_number TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      department TEXT,
      enrolled_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lockers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      locker_number TEXT NOT NULL UNIQUE,
      location TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS check_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      officer_id INTEGER NOT NULL,
      locker_id INTEGER NOT NULL,
      event_type TEXT NOT NULL CHECK (event_type IN ('check_in', 'check_out')),
      recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (officer_id) REFERENCES officers(id),
      FOREIGN KEY (locker_id) REFERENCES lockers(id)
    );

    CREATE INDEX IF NOT EXISTS idx_check_events_officer ON check_events(officer_id);
    CREATE INDEX IF NOT EXISTS idx_check_events_locker ON check_events(locker_id);
    CREATE INDEX IF NOT EXISTS idx_check_events_recorded ON check_events(recorded_at);
  `);
  db.close();
}

async function getSqliteDb() {
  const Database = (await import("better-sqlite3")).default;
  const fs = await import("fs");
  const path = await import("path");

  const dataDir =
    process.env.VERCEL === "1"
      ? "/tmp"
      : path.join(process.cwd(), "data");
  const dbPath = path.join(dataDir, "gunsafe.db");
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

async function getPostgresSql() {
  const { neon } = await import("@neondatabase/serverless");
  return neon(process.env.POSTGRES_URL || process.env.DATABASE_URL!);
}

function formatTimestamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapOfficer(row: Record<string, unknown>): Officer {
  return {
    id: Number(row.id),
    badge_number: String(row.badge_number),
    first_name: String(row.first_name),
    last_name: String(row.last_name),
    department: row.department ? String(row.department) : null,
    enrolled_at: formatTimestamp(row.enrolled_at),
  };
}

function mapLocker(row: Record<string, unknown>): Locker {
  return {
    id: Number(row.id),
    locker_number: String(row.locker_number),
    location: row.location ? String(row.location) : null,
    created_at: formatTimestamp(row.created_at),
  };
}

function mapCheckEvent(row: Record<string, unknown>): CheckEvent {
  return {
    id: Number(row.id),
    officer_id: Number(row.officer_id),
    locker_id: Number(row.locker_id),
    event_type: row.event_type as "check_in" | "check_out",
    recorded_at: formatTimestamp(row.recorded_at),
    badge_number: String(row.badge_number),
    officer_name: String(row.officer_name),
    locker_number: String(row.locker_number),
  };
}

function mapActiveSession(row: Record<string, unknown>): ActiveSession {
  return {
    officer_id: Number(row.officer_id),
    locker_id: Number(row.locker_id),
    badge_number: String(row.badge_number),
    officer_name: String(row.officer_name),
    locker_number: String(row.locker_number),
    checked_in_at: formatTimestamp(row.checked_in_at),
  };
}

export async function listOfficers(): Promise<Officer[]> {
  await ensureSchema();

  if (usePostgres) {
    const sql = await getPostgresSql();
    const rows = await sql`
      SELECT id, badge_number, first_name, last_name, department, enrolled_at
      FROM officers
      ORDER BY last_name, first_name
    `;
    return rows.map((row) => mapOfficer(row as Record<string, unknown>));
  }

  const db = await getSqliteDb();
  try {
    const rows = db
      .prepare(
        `SELECT id, badge_number, first_name, last_name, department, enrolled_at
         FROM officers
         ORDER BY last_name, first_name`
      )
      .all();
    return rows.map((row) => mapOfficer(row as Record<string, unknown>));
  } finally {
    db.close();
  }
}

export async function enrollOfficer(data: {
  badge_number: string;
  first_name: string;
  last_name: string;
  department?: string;
}): Promise<Officer> {
  await ensureSchema();

  const badge = data.badge_number.trim();
  const first = data.first_name.trim();
  const last = data.last_name.trim();
  const department = data.department?.trim() || null;

  if (!badge || !first || !last) {
    throw new Error("Badge number, first name, and last name are required.");
  }

  if (usePostgres) {
    const sql = await getPostgresSql();
    const existing = await sql`
      SELECT id FROM officers WHERE badge_number = ${badge}
    `;
    if (existing.length > 0) {
      throw new Error(`Officer with badge ${badge} is already enrolled.`);
    }

    const inserted = await sql`
      INSERT INTO officers (badge_number, first_name, last_name, department)
      VALUES (${badge}, ${first}, ${last}, ${department})
      RETURNING id, badge_number, first_name, last_name, department, enrolled_at
    `;
    return mapOfficer(inserted[0] as Record<string, unknown>);
  }

  const db = await getSqliteDb();
  try {
    const existing = db
      .prepare("SELECT id FROM officers WHERE badge_number = ?")
      .get(badge);
    if (existing) {
      throw new Error(`Officer with badge ${badge} is already enrolled.`);
    }

    const result = db
      .prepare(
        `INSERT INTO officers (badge_number, first_name, last_name, department)
         VALUES (?, ?, ?, ?)`
      )
      .run(badge, first, last, department);

    const row = db
      .prepare(
        `SELECT id, badge_number, first_name, last_name, department, enrolled_at
         FROM officers WHERE id = ?`
      )
      .get(result.lastInsertRowid);
    return mapOfficer(row as Record<string, unknown>);
  } finally {
    db.close();
  }
}

export async function listLockers(): Promise<Locker[]> {
  await ensureSchema();

  if (usePostgres) {
    const sql = await getPostgresSql();
    const rows = await sql`
      SELECT id, locker_number, location, created_at
      FROM lockers
      ORDER BY locker_number
    `;
    return rows.map((row) => mapLocker(row as Record<string, unknown>));
  }

  const db = await getSqliteDb();
  try {
    const rows = db
      .prepare(
        `SELECT id, locker_number, location, created_at
         FROM lockers
         ORDER BY CAST(locker_number AS INTEGER), locker_number`
      )
      .all();
    return rows.map((row) => mapLocker(row as Record<string, unknown>));
  } finally {
    db.close();
  }
}

export async function addLocker(data: {
  locker_number: string;
  location?: string;
}): Promise<Locker> {
  await ensureSchema();

  const number = data.locker_number.trim();
  const location = data.location?.trim() || null;

  if (!number) {
    throw new Error("Locker number is required.");
  }

  if (usePostgres) {
    const sql = await getPostgresSql();
    const existing = await sql`
      SELECT id FROM lockers WHERE locker_number = ${number}
    `;
    if (existing.length > 0) {
      throw new Error(`Locker ${number} already exists.`);
    }

    const inserted = await sql`
      INSERT INTO lockers (locker_number, location)
      VALUES (${number}, ${location})
      RETURNING id, locker_number, location, created_at
    `;
    return mapLocker(inserted[0] as Record<string, unknown>);
  }

  const db = await getSqliteDb();
  try {
    const existing = db
      .prepare("SELECT id FROM lockers WHERE locker_number = ?")
      .get(number);
    if (existing) {
      throw new Error(`Locker ${number} already exists.`);
    }

    const result = db
      .prepare(`INSERT INTO lockers (locker_number, location) VALUES (?, ?)`)
      .run(number, location);

    const row = db
      .prepare(
        `SELECT id, locker_number, location, created_at FROM lockers WHERE id = ?`
      )
      .get(result.lastInsertRowid);
    return mapLocker(row as Record<string, unknown>);
  } finally {
    db.close();
  }
}

async function getSessionStatus(
  officerId: number,
  lockerId: number
): Promise<"checked_in" | "checked_out"> {
  if (usePostgres) {
    const sql = await getPostgresSql();
    const rows = await sql`
      SELECT event_type FROM check_events
      WHERE officer_id = ${officerId} AND locker_id = ${lockerId}
      ORDER BY id DESC LIMIT 1
    `;
    return rows[0]?.event_type === "check_in" ? "checked_in" : "checked_out";
  }

  const db = await getSqliteDb();
  try {
    const last = db
      .prepare(
        `SELECT event_type FROM check_events
         WHERE officer_id = ? AND locker_id = ?
         ORDER BY id DESC LIMIT 1`
      )
      .get(officerId, lockerId) as { event_type: string } | undefined;
    return last?.event_type === "check_in" ? "checked_in" : "checked_out";
  } finally {
    db.close();
  }
}

async function getCheckEventById(id: number): Promise<CheckEvent> {
  if (usePostgres) {
    const sql = await getPostgresSql();
    const rows = await sql`
      SELECT
        e.id, e.officer_id, e.locker_id, e.event_type, e.recorded_at,
        o.badge_number,
        o.first_name || ' ' || o.last_name AS officer_name,
        l.locker_number
      FROM check_events e
      JOIN officers o ON o.id = e.officer_id
      JOIN lockers l ON l.id = e.locker_id
      WHERE e.id = ${id}
    `;
    return mapCheckEvent(rows[0] as Record<string, unknown>);
  }

  const db = await getSqliteDb();
  try {
    const row = db
      .prepare(
        `SELECT
           e.id, e.officer_id, e.locker_id, e.event_type, e.recorded_at,
           o.badge_number,
           o.first_name || ' ' || o.last_name AS officer_name,
           l.locker_number
         FROM check_events e
         JOIN officers o ON o.id = e.officer_id
         JOIN lockers l ON l.id = e.locker_id
         WHERE e.id = ?`
      )
      .get(id);
    return mapCheckEvent(row as Record<string, unknown>);
  } finally {
    db.close();
  }
}

export async function recordCheckIn(
  officerId: number,
  lockerId: number
): Promise<CheckEvent> {
  await ensureSchema();

  if (usePostgres) {
    const sql = await getPostgresSql();
    const officer = await sql`SELECT id FROM officers WHERE id = ${officerId}`;
    const locker = await sql`SELECT id FROM lockers WHERE id = ${lockerId}`;
    if (officer.length === 0) throw new Error("Officer not found.");
    if (locker.length === 0) throw new Error("Locker not found.");
    if ((await getSessionStatus(officerId, lockerId)) === "checked_in") {
      throw new Error("This officer is already checked in to this locker.");
    }

    const inserted = await sql`
      INSERT INTO check_events (officer_id, locker_id, event_type)
      VALUES (${officerId}, ${lockerId}, 'check_in')
      RETURNING id
    `;
    return getCheckEventById(Number(inserted[0].id));
  }

  const db = await getSqliteDb();
  try {
    const officer = db
      .prepare("SELECT id FROM officers WHERE id = ?")
      .get(officerId);
    const locker = db
      .prepare("SELECT id FROM lockers WHERE id = ?")
      .get(lockerId);
    if (!officer) throw new Error("Officer not found.");
    if (!locker) throw new Error("Locker not found.");
    if ((await getSessionStatus(officerId, lockerId)) === "checked_in") {
      throw new Error("This officer is already checked in to this locker.");
    }

    const result = db
      .prepare(
        `INSERT INTO check_events (officer_id, locker_id, event_type)
         VALUES (?, ?, 'check_in')`
      )
      .run(officerId, lockerId);
    return getCheckEventById(Number(result.lastInsertRowid));
  } finally {
    db.close();
  }
}

export async function recordCheckOut(
  officerId: number,
  lockerId: number
): Promise<CheckEvent> {
  await ensureSchema();

  if (usePostgres) {
    const sql = await getPostgresSql();
    const officer = await sql`SELECT id FROM officers WHERE id = ${officerId}`;
    const locker = await sql`SELECT id FROM lockers WHERE id = ${lockerId}`;
    if (officer.length === 0) throw new Error("Officer not found.");
    if (locker.length === 0) throw new Error("Locker not found.");
    if ((await getSessionStatus(officerId, lockerId)) !== "checked_in") {
      throw new Error("This officer is not currently checked in to this locker.");
    }

    const inserted = await sql`
      INSERT INTO check_events (officer_id, locker_id, event_type)
      VALUES (${officerId}, ${lockerId}, 'check_out')
      RETURNING id
    `;
    return getCheckEventById(Number(inserted[0].id));
  }

  const db = await getSqliteDb();
  try {
    const officer = db
      .prepare("SELECT id FROM officers WHERE id = ?")
      .get(officerId);
    const locker = db
      .prepare("SELECT id FROM lockers WHERE id = ?")
      .get(lockerId);
    if (!officer) throw new Error("Officer not found.");
    if (!locker) throw new Error("Locker not found.");
    if ((await getSessionStatus(officerId, lockerId)) !== "checked_in") {
      throw new Error("This officer is not currently checked in to this locker.");
    }

    const result = db
      .prepare(
        `INSERT INTO check_events (officer_id, locker_id, event_type)
         VALUES (?, ?, 'check_out')`
      )
      .run(officerId, lockerId);
    return getCheckEventById(Number(result.lastInsertRowid));
  } finally {
    db.close();
  }
}

export async function listCheckEvents(limit = 200): Promise<CheckEvent[]> {
  await ensureSchema();

  if (usePostgres) {
    const sql = await getPostgresSql();
    const rows = await sql`
      SELECT
        e.id, e.officer_id, e.locker_id, e.event_type, e.recorded_at,
        o.badge_number,
        o.first_name || ' ' || o.last_name AS officer_name,
        l.locker_number
      FROM check_events e
      JOIN officers o ON o.id = e.officer_id
      JOIN lockers l ON l.id = e.locker_id
      ORDER BY e.id DESC
      LIMIT ${limit}
    `;
    return rows.map((row) => mapCheckEvent(row as Record<string, unknown>));
  }

  const db = await getSqliteDb();
  try {
    const rows = db
      .prepare(
        `SELECT
           e.id, e.officer_id, e.locker_id, e.event_type, e.recorded_at,
           o.badge_number,
           o.first_name || ' ' || o.last_name AS officer_name,
           l.locker_number
         FROM check_events e
         JOIN officers o ON o.id = e.officer_id
         JOIN lockers l ON l.id = e.locker_id
         ORDER BY e.id DESC
         LIMIT ?`
      )
      .all(limit);
    return rows.map((row) => mapCheckEvent(row as Record<string, unknown>));
  } finally {
    db.close();
  }
}

export async function listActiveSessions(): Promise<ActiveSession[]> {
  await ensureSchema();

  if (usePostgres) {
    const sql = await getPostgresSql();
    const rows = await sql`
      SELECT
        e.officer_id,
        e.locker_id,
        o.badge_number,
        o.first_name || ' ' || o.last_name AS officer_name,
        l.locker_number,
        e.recorded_at AS checked_in_at
      FROM check_events e
      JOIN officers o ON o.id = e.officer_id
      JOIN lockers l ON l.id = e.locker_id
      WHERE e.id = (
        SELECT ce.id FROM check_events ce
        WHERE ce.officer_id = e.officer_id AND ce.locker_id = e.locker_id
        ORDER BY ce.id DESC LIMIT 1
      )
      AND e.event_type = 'check_in'
      ORDER BY e.recorded_at DESC
    `;
    return rows.map((row) => mapActiveSession(row as Record<string, unknown>));
  }

  const db = await getSqliteDb();
  try {
    const rows = db
      .prepare(
        `SELECT
           e.officer_id,
           e.locker_id,
           o.badge_number,
           o.first_name || ' ' || o.last_name AS officer_name,
           l.locker_number,
           e.recorded_at AS checked_in_at
         FROM check_events e
         JOIN officers o ON o.id = e.officer_id
         JOIN lockers l ON l.id = e.locker_id
         WHERE e.id = (
           SELECT ce.id FROM check_events ce
           WHERE ce.officer_id = e.officer_id AND ce.locker_id = e.locker_id
           ORDER BY ce.id DESC LIMIT 1
         )
         AND e.event_type = 'check_in'
         ORDER BY e.recorded_at DESC`
      )
      .all();
    return rows.map((row) => mapActiveSession(row as Record<string, unknown>));
  } finally {
    db.close();
  }
}