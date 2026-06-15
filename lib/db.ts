import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import type { ActiveSession, CheckEvent, Locker, Officer } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "gunsafe.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database) {
  database.exec(`
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
}

export function listOfficers(): Officer[] {
  return getDb()
    .prepare(
      `SELECT id, badge_number, first_name, last_name, department, enrolled_at
       FROM officers
       ORDER BY last_name, first_name`
    )
    .all() as Officer[];
}

export function enrollOfficer(data: {
  badge_number: string;
  first_name: string;
  last_name: string;
  department?: string;
}): Officer {
  const badge = data.badge_number.trim();
  const first = data.first_name.trim();
  const last = data.last_name.trim();
  const department = data.department?.trim() || null;

  if (!badge || !first || !last) {
    throw new Error("Badge number, first name, and last name are required.");
  }

  const existing = getDb()
    .prepare("SELECT id FROM officers WHERE badge_number = ?")
    .get(badge);
  if (existing) {
    throw new Error(`Officer with badge ${badge} is already enrolled.`);
  }

  const result = getDb()
    .prepare(
      `INSERT INTO officers (badge_number, first_name, last_name, department)
       VALUES (?, ?, ?, ?)`
    )
    .run(badge, first, last, department);

  return getDb()
    .prepare(
      `SELECT id, badge_number, first_name, last_name, department, enrolled_at
       FROM officers WHERE id = ?`
    )
    .get(result.lastInsertRowid) as Officer;
}

export function listLockers(): Locker[] {
  return getDb()
    .prepare(
      `SELECT id, locker_number, location, created_at
       FROM lockers
       ORDER BY CAST(locker_number AS INTEGER), locker_number`
    )
    .all() as Locker[];
}

export function addLocker(data: {
  locker_number: string;
  location?: string;
}): Locker {
  const number = data.locker_number.trim();
  const location = data.location?.trim() || null;

  if (!number) {
    throw new Error("Locker number is required.");
  }

  const existing = getDb()
    .prepare("SELECT id FROM lockers WHERE locker_number = ?")
    .get(number);
  if (existing) {
    throw new Error(`Locker ${number} already exists.`);
  }

  const result = getDb()
    .prepare(`INSERT INTO lockers (locker_number, location) VALUES (?, ?)`)
    .run(number, location);

  return getDb()
    .prepare(
      `SELECT id, locker_number, location, created_at FROM lockers WHERE id = ?`
    )
    .get(result.lastInsertRowid) as Locker;
}

function getSessionStatus(
  officerId: number,
  lockerId: number
): "checked_in" | "checked_out" {
  const last = getDb()
    .prepare(
      `SELECT event_type FROM check_events
       WHERE officer_id = ? AND locker_id = ?
       ORDER BY id DESC LIMIT 1`
    )
    .get(officerId, lockerId) as { event_type: string } | undefined;

  return last?.event_type === "check_in" ? "checked_in" : "checked_out";
}

export function recordCheckIn(
  officerId: number,
  lockerId: number
): CheckEvent {
  const officer = getDb()
    .prepare("SELECT id FROM officers WHERE id = ?")
    .get(officerId);
  const locker = getDb()
    .prepare("SELECT id FROM lockers WHERE id = ?")
    .get(lockerId);

  if (!officer) throw new Error("Officer not found.");
  if (!locker) throw new Error("Locker not found.");

  if (getSessionStatus(officerId, lockerId) === "checked_in") {
    throw new Error("This officer is already checked in to this locker.");
  }

  const result = getDb()
    .prepare(
      `INSERT INTO check_events (officer_id, locker_id, event_type)
       VALUES (?, ?, 'check_in')`
    )
    .run(officerId, lockerId);

  return getCheckEventById(Number(result.lastInsertRowid));
}

export function recordCheckOut(
  officerId: number,
  lockerId: number
): CheckEvent {
  const officer = getDb()
    .prepare("SELECT id FROM officers WHERE id = ?")
    .get(officerId);
  const locker = getDb()
    .prepare("SELECT id FROM lockers WHERE id = ?")
    .get(lockerId);

  if (!officer) throw new Error("Officer not found.");
  if (!locker) throw new Error("Locker not found.");

  if (getSessionStatus(officerId, lockerId) !== "checked_in") {
    throw new Error("This officer is not currently checked in to this locker.");
  }

  const result = getDb()
    .prepare(
      `INSERT INTO check_events (officer_id, locker_id, event_type)
       VALUES (?, ?, 'check_out')`
    )
    .run(officerId, lockerId);

  return getCheckEventById(Number(result.lastInsertRowid));
}

function getCheckEventById(id: number): CheckEvent {
  return getDb()
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
    .get(id) as CheckEvent;
}

export function listCheckEvents(limit = 200): CheckEvent[] {
  return getDb()
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
    .all(limit) as CheckEvent[];
}

export function listActiveSessions(): ActiveSession[] {
  return getDb()
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
    .all() as ActiveSession[];
}