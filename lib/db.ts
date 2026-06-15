import type { ActiveSession, CheckEvent, Locker, Officer } from "./types";

function getPostgresUrl(): string | undefined {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL
  );
}

const usePostgres = Boolean(getPostgresUrl());

function assertDatabaseConfigured() {
  if (process.env.VERCEL === "1" && !usePostgres) {
    throw new Error(
      "Database not configured. In Vercel, open your GunSafe project → Storage → Marketplace → add Neon Postgres, connect it to this project, then redeploy."
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
    const sql = neon(getPostgresUrl()!);
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
    await sql`ALTER TABLE officers ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false`;
    await sql`ALTER TABLE lockers ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false`;
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
  const officerCols = db.pragma("table_info(officers)") as { name: string }[];
  if (!officerCols.some((c) => c.name === "archived")) {
    db.exec(
      "ALTER TABLE officers ADD COLUMN archived INTEGER NOT NULL DEFAULT 0"
    );
  }
  const lockerCols = db.pragma("table_info(lockers)") as { name: string }[];
  if (!lockerCols.some((c) => c.name === "archived")) {
    db.exec(
      "ALTER TABLE lockers ADD COLUMN archived INTEGER NOT NULL DEFAULT 0"
    );
  }
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
  return neon(getPostgresUrl()!);
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
    archived: Boolean(row.archived),
  };
}

function mapLocker(row: Record<string, unknown>): Locker {
  return {
    id: Number(row.id),
    locker_number: String(row.locker_number),
    location: row.location ? String(row.location) : null,
    created_at: formatTimestamp(row.created_at),
    archived: Boolean(row.archived),
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
      SELECT id, badge_number, first_name, last_name, department, enrolled_at, archived
      FROM officers
      ORDER BY archived, last_name, first_name
    `;
    return rows.map((row) => mapOfficer(row as Record<string, unknown>));
  }

  const db = await getSqliteDb();
  try {
    const rows = db
      .prepare(
        `SELECT id, badge_number, first_name, last_name, department, enrolled_at, archived
         FROM officers
         ORDER BY archived, last_name, first_name`
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
      SELECT id, archived FROM officers WHERE badge_number = ${badge}
    `;
    if (existing.length > 0 && !existing[0].archived) {
      throw new Error(`Officer with badge ${badge} is already enrolled.`);
    }
    if (existing.length > 0 && existing[0].archived) {
      throw new Error(
        `Officer with badge ${badge} is archived. Activate them instead of enrolling again.`
      );
    }

    const inserted = await sql`
      INSERT INTO officers (badge_number, first_name, last_name, department)
      VALUES (${badge}, ${first}, ${last}, ${department})
      RETURNING id, badge_number, first_name, last_name, department, enrolled_at, archived
    `;
    return mapOfficer(inserted[0] as Record<string, unknown>);
  }

  const db = await getSqliteDb();
  try {
    const existing = db
      .prepare("SELECT id, archived FROM officers WHERE badge_number = ?")
      .get(badge) as { id: number; archived: number } | undefined;
    if (existing && !existing.archived) {
      throw new Error(`Officer with badge ${badge} is already enrolled.`);
    }
    if (existing?.archived) {
      throw new Error(
        `Officer with badge ${badge} is archived. Activate them instead of enrolling again.`
      );
    }

    const result = db
      .prepare(
        `INSERT INTO officers (badge_number, first_name, last_name, department)
         VALUES (?, ?, ?, ?)`
      )
      .run(badge, first, last, department);

    const row = db
      .prepare(
        `SELECT id, badge_number, first_name, last_name, department, enrolled_at, archived
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
      SELECT id, locker_number, location, created_at, archived
      FROM lockers
      ORDER BY archived, locker_number
    `;
    return rows.map((row) => mapLocker(row as Record<string, unknown>));
  }

  const db = await getSqliteDb();
  try {
    const rows = db
      .prepare(
        `SELECT id, locker_number, location, created_at, archived
         FROM lockers
         ORDER BY archived, CAST(locker_number AS INTEGER), locker_number`
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
      SELECT id, archived FROM lockers WHERE locker_number = ${number}
    `;
    if (existing.length > 0 && !existing[0].archived) {
      throw new Error(`Locker ${number} already exists.`);
    }
    if (existing.length > 0 && existing[0].archived) {
      throw new Error(
        `Locker ${number} is archived. Activate it instead of adding again.`
      );
    }

    const inserted = await sql`
      INSERT INTO lockers (locker_number, location)
      VALUES (${number}, ${location})
      RETURNING id, locker_number, location, created_at, archived
    `;
    return mapLocker(inserted[0] as Record<string, unknown>);
  }

  const db = await getSqliteDb();
  try {
    const existing = db
      .prepare("SELECT id, archived FROM lockers WHERE locker_number = ?")
      .get(number) as { id: number; archived: number } | undefined;
    if (existing && !existing.archived) {
      throw new Error(`Locker ${number} already exists.`);
    }
    if (existing?.archived) {
      throw new Error(
        `Locker ${number} is archived. Activate it instead of adding again.`
      );
    }

    const result = db
      .prepare(`INSERT INTO lockers (locker_number, location) VALUES (?, ?)`)
      .run(number, location);

    const row = db
      .prepare(
        `SELECT id, locker_number, location, created_at, archived FROM lockers WHERE id = ?`
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
    const officer = await sql`
      SELECT id FROM officers WHERE id = ${officerId} AND archived = false
    `;
    const locker = await sql`
      SELECT id FROM lockers WHERE id = ${lockerId} AND archived = false
    `;
    if (officer.length === 0) throw new Error("Officer not found or is archived.");
    if (locker.length === 0) throw new Error("Locker not found or is archived.");
    if ((await getSessionStatus(officerId, lockerId)) === "checked_in") {
      throw new Error("This officer is already logged in to this locker.");
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
      .prepare("SELECT id FROM officers WHERE id = ? AND archived = 0")
      .get(officerId);
    const locker = db
      .prepare("SELECT id FROM lockers WHERE id = ? AND archived = 0")
      .get(lockerId);
    if (!officer) throw new Error("Officer not found or is archived.");
    if (!locker) throw new Error("Locker not found or is archived.");
    if ((await getSessionStatus(officerId, lockerId)) === "checked_in") {
      throw new Error("This officer is already logged in to this locker.");
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

async function isOfficerLoggedIn(officerId: number): Promise<boolean> {
  const sessions = await listActiveSessions();
  return sessions.some((s) => s.officer_id === officerId);
}

async function isLockerInUse(lockerId: number): Promise<boolean> {
  const sessions = await listActiveSessions();
  return sessions.some((s) => s.locker_id === lockerId);
}

export async function setOfficerArchived(
  id: number,
  archived: boolean
): Promise<Officer> {
  await ensureSchema();

  if (archived && (await isOfficerLoggedIn(id))) {
    throw new Error("Cannot archive an officer who is currently logged in.");
  }

  if (usePostgres) {
    const sql = await getPostgresSql();
    const rows = await sql`
      UPDATE officers SET archived = ${archived}
      WHERE id = ${id}
      RETURNING id, badge_number, first_name, last_name, department, enrolled_at, archived
    `;
    if (rows.length === 0) throw new Error("Officer not found.");
    return mapOfficer(rows[0] as Record<string, unknown>);
  }

  const db = await getSqliteDb();
  try {
    const result = db
      .prepare("UPDATE officers SET archived = ? WHERE id = ?")
      .run(archived ? 1 : 0, id);
    if (result.changes === 0) throw new Error("Officer not found.");
    const row = db
      .prepare(
        `SELECT id, badge_number, first_name, last_name, department, enrolled_at, archived
         FROM officers WHERE id = ?`
      )
      .get(id);
    return mapOfficer(row as Record<string, unknown>);
  } finally {
    db.close();
  }
}

export async function setLockerArchived(
  id: number,
  archived: boolean
): Promise<Locker> {
  await ensureSchema();

  if (archived && (await isLockerInUse(id))) {
    throw new Error("Cannot archive a locker that is currently in use.");
  }

  if (usePostgres) {
    const sql = await getPostgresSql();
    const rows = await sql`
      UPDATE lockers SET archived = ${archived}
      WHERE id = ${id}
      RETURNING id, locker_number, location, created_at, archived
    `;
    if (rows.length === 0) throw new Error("Locker not found.");
    return mapLocker(rows[0] as Record<string, unknown>);
  }

  const db = await getSqliteDb();
  try {
    const result = db
      .prepare("UPDATE lockers SET archived = ? WHERE id = ?")
      .run(archived ? 1 : 0, id);
    if (result.changes === 0) throw new Error("Locker not found.");
    const row = db
      .prepare(
        `SELECT id, locker_number, location, created_at, archived FROM lockers WHERE id = ?`
      )
      .get(id);
    return mapLocker(row as Record<string, unknown>);
  } finally {
    db.close();
  }
}