import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { Attributes, GameRow, GameStatus } from "../game/types.js";

export function getActiveGameByPlayer(
  db: Database.Database,
  playerId: string,
): GameRow | undefined {
  return db
    .prepare(
      `SELECT * FROM games WHERE player_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
    )
    .get(playerId) as GameRow | undefined;
}

export function getGameOrThrow(db: Database.Database, gameId: string): GameRow {
  const row = db.prepare(`SELECT * FROM games WHERE id = ?`).get(gameId) as GameRow | undefined;
  if (!row) {
    const err = new Error("Game not found");
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }
  return row;
}

export function archiveActiveGames(db: Database.Database, playerId: string): void {
  db.prepare(
    `UPDATE games SET status = 'completed', completed_at = datetime('now')
     WHERE player_id = ? AND status = 'active'`,
  ).run(playerId);
}

export function getDecisionCount(db: Database.Database, gameId: string): number {
  const row = db
    .prepare(`SELECT COUNT(*) as c FROM decisions WHERE game_id = ?`)
    .get(gameId) as { c: number };
  return row.c;
}

export function createNewGame(
  db: Database.Database,
  playerId: string,
  initialEventId: string,
) {
  const id = randomUUID();
  const attributes: Attributes = {
    energy: 6,
    reputation: 5,
    networking: 3,
    anxiety: 3,
    productivity: 4,
    learning: 2,
  };
  const flags: string[] = [];
  const day = 1;
  const slot = 1;

  db.prepare(
    `INSERT INTO games (
      id, player_id, story_id, mode, status, day, slot, role,
      attributes_json, flags_json, current_event_id, ending, score, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    playerId,
    "main",
    "main",
    "active",
    day,
    slot,
    "Trainee",
    JSON.stringify(attributes),
    JSON.stringify(flags),
    initialEventId,
    null,
    null,
    null,
  );

  return getGameOrThrow(db, id);
}

export function updateGameState(
  db: Database.Database,
  gameId: string,
  patch: Partial<{
    day: number;
    slot: number;
    attributes: Attributes;
    flags: string[];
    current_event_id: string | null;
    status: GameStatus;
    ending: string | null;
    score: number | null;
    completed_at: string | null;
  }>,
): void {
  const current = getGameOrThrow(db, gameId);
  const nextDay = patch.day ?? current.day;
  const nextSlot = patch.slot ?? current.slot;
  const nextAttrs =
    patch.attributes ?? (JSON.parse(current.attributes_json) as Attributes);
  const nextFlags = patch.flags ?? (JSON.parse(current.flags_json) as string[]);
  const nextEventId =
    patch.current_event_id !== undefined ? patch.current_event_id : current.current_event_id;
  const nextStatus = patch.status ?? current.status;
  const nextEnding = patch.ending !== undefined ? patch.ending : current.ending;
  const nextScore = patch.score !== undefined ? patch.score : current.score;
  const nextCompleted =
    patch.completed_at !== undefined ? patch.completed_at : current.completed_at;

  db.prepare(
    `UPDATE games SET
      day = ?,
      slot = ?,
      attributes_json = ?,
      flags_json = ?,
      current_event_id = ?,
      status = ?,
      ending = ?,
      score = ?,
      completed_at = ?
    WHERE id = ?`,
  ).run(
    nextDay,
    nextSlot,
    JSON.stringify(nextAttrs),
    JSON.stringify(nextFlags),
    nextEventId,
    nextStatus,
    nextEnding,
    nextScore,
    nextCompleted,
    gameId,
  );
}

export function insertDecision(
  db: Database.Database,
  input: {
    gameId: string;
    eventId: string;
    choiceId: string;
    effects: Record<string, number>;
    attributesBefore: Attributes;
    attributesAfter: Attributes;
    flagsAfter: string[];
  },
): void {
  db.prepare(
    `INSERT INTO decisions (
      game_id, event_id, choice_id, effects_json,
      attributes_before_json, attributes_after_json, flags_after_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.gameId,
    input.eventId,
    input.choiceId,
    JSON.stringify(input.effects),
    JSON.stringify(input.attributesBefore),
    JSON.stringify(input.attributesAfter),
    JSON.stringify(input.flagsAfter),
  );
}

export function getRanking(db: Database.Database, limit = 100) {
  return db
    .prepare(
      `SELECT p.name AS playerName, g.score AS score, g.ending AS ending, g.completed_at AS completedAt
       FROM games g
       JOIN players p ON p.id = g.player_id
       WHERE g.status = 'completed' AND g.score IS NOT NULL AND g.ending IS NOT NULL
       ORDER BY g.score DESC, g.completed_at ASC
       LIMIT ?`,
    )
    .all(limit) as Array<{
    playerName: string;
    score: number;
    ending: string;
    completedAt: string;
  }>;
}
