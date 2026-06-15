import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq);
      let value = trimmed.slice(eq + 1);
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional for local sqlite-only reset
  }
}

loadEnv();

const postgresUrl =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

async function resetPostgres() {
  if (!postgresUrl) {
    console.log("No Postgres URL configured; skipping production reset.");
    return;
  }
  const sql = neon(postgresUrl);
  await sql`DELETE FROM check_events`;
  await sql`DELETE FROM officers`;
  await sql`DELETE FROM lockers`;
  await sql`DELETE FROM app_users WHERE role != 'master'`;
  console.log("Production database reset complete.");
}

function tableExists(db, name) {
  const row = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
    )
    .get(name);
  return Boolean(row);
}

function resetSqlite() {
  const dbPath = join(root, "data", "gunsafe.db");
  try {
    const db = new Database(dbPath);
    db.pragma("foreign_keys = ON");
    if (tableExists(db, "check_events")) db.exec("DELETE FROM check_events");
    if (tableExists(db, "officers")) db.exec("DELETE FROM officers");
    if (tableExists(db, "lockers")) db.exec("DELETE FROM lockers");
    if (tableExists(db, "app_users")) {
      db.exec("DELETE FROM app_users WHERE role != 'master'");
    }
    db.close();
    console.log("Local SQLite database reset complete.");
  } catch (err) {
    if (err.code === "SQLITE_CANTOPEN") {
      console.log("No local SQLite database found; skipping.");
      return;
    }
    throw err;
  }
}

await resetPostgres();
resetSqlite();