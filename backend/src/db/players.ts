import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { Attributes, PlayerRow } from "../game/types.js";

export function createPlayer(db: Database.Database, name: string): PlayerRow {
  const id = randomUUID();
  const trimmed = name.trim();
  db.prepare(`INSERT INTO players (id, name) VALUES (?, ?)`).run(id, trimmed);
  return getPlayerOrThrow(db, id);
}

export function getPlayerOrThrow(db: Database.Database, id: string): PlayerRow {
  const row = db
    .prepare(`SELECT id, name, created_at FROM players WHERE id = ?`)
    .get(id) as PlayerRow | undefined;
  if (!row) {
    const err = new Error("Player not found");
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }
  return row;
}

export function stringifyAttributes(attributes: Attributes): string {
  return JSON.stringify(attributes);
}
