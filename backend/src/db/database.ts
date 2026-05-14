import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getDbPath(): string {
  const envPath = process.env.CORPORATE_SURVIVOR_DB_PATH;
  if (envPath && envPath.trim().length > 0) return envPath.trim();

  const dataDir = path.resolve(__dirname, "../../data");
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "corporate-survivor.db");
}

export function openDatabase(): Database.Database {
  const dbPath = getDbPath();
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      story_id TEXT NOT NULL DEFAULT 'main',
      mode TEXT NOT NULL DEFAULT 'main',
      status TEXT NOT NULL CHECK (status IN ('active','completed')),
      day INTEGER NOT NULL,
      slot INTEGER NOT NULL,
      role TEXT NOT NULL,
      attributes_json TEXT NOT NULL,
      flags_json TEXT NOT NULL,
      current_event_id TEXT,
      ending TEXT,
      score INTEGER,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_games_player_status ON games(player_id, status);

    CREATE TABLE IF NOT EXISTS decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      event_id TEXT NOT NULL,
      choice_id TEXT NOT NULL,
      effects_json TEXT NOT NULL,
      attributes_before_json TEXT NOT NULL,
      attributes_after_json TEXT NOT NULL,
      flags_after_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_decisions_game ON decisions(game_id);
  `);
}
