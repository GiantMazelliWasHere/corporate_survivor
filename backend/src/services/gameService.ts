import type Database from "better-sqlite3";
import type { Attributes, GameRow } from "../game/types.js";
import { INITIAL_ATTRIBUTES } from "../game/types.js";
import type { GameEvent } from "../game/eventSchema.js";
import {
  advanceDaySlot,
  applyFlags,
  filterPublicOptions,
  mergeEffects,
  passesConditions,
  resolveEventForState,
  type GameRuntimeState,
} from "../game/engine.js";
import { resolveEndingAfterWeek, resolveEndingEarly } from "../game/endings.js";
import {
  archiveActiveGames,
  createNewGame,
  getActiveGameByPlayer,
  getGameOrThrow,
  insertDecision,
  updateGameState,
  getDecisionCount,
} from "../db/games.js";
import { getPlayerOrThrow } from "../db/players.js";

export type PublicGameState = {
  gameId: string;
  player: { id: string; name: string };
  status: "active" | "completed";
  day: number;
  slot: number;
  role: string;
  attributes: Attributes;
  currentEvent: null | {
    id: string;
    day: number;
    slot: number;
    title: string;
    description: string;
    options: Array<{ id: string; label: string }>;
  };
  ending: string | null;
  score: number | null;
};

export type DecisionPayload = {
  eventId: string;
  choiceId: string;
  effects: Record<string, number>;
  attributesBefore: Attributes;
  attributesAfter: Attributes;
  flagsAfter: string[];
};

function buildRuntime(game: GameRow): GameRuntimeState {
  return {
    storyId: game.story_id,
    day: game.day,
    slot: game.slot,
    attributes: JSON.parse(game.attributes_json) as Attributes,
    flags: JSON.parse(game.flags_json) as string[],
  };
}

export function getPublicGameState(
  db: Database.Database,
  game: GameRow,
  playerName: string,
  events: GameEvent[],
): PublicGameState {
  const base = {
    gameId: game.id,
    player: { id: game.player_id, name: playerName },
    role: game.role,
    ending: game.ending,
    score: game.score,
  };

  if (game.status === "completed") {
    return {
      ...base,
      status: "completed",
      day: game.day,
      slot: game.slot,
      attributes: JSON.parse(game.attributes_json) as Attributes,
      currentEvent: null,
    };
  }

  const runtime = buildRuntime(game);
  const event = resolveEventForState(runtime, events);
  const options = filterPublicOptions(event, runtime).map((option) => ({
    id: option.id,
    label: option.label,
  }));

  if (options.length === 0) {
    throw new Error("No options available for this event under current conditions");
  }

  return {
    ...base,
    status: "active",
    day: game.day,
    slot: game.slot,
    attributes: runtime.attributes,
    currentEvent: {
      id: event.id,
      day: event.day,
      slot: event.slot,
      title: event.title,
      description: event.description,
      options,
    },
  };
}

export function startOrResumeGame(
  db: Database.Database,
  playerId: string,
  events: GameEvent[],
  restart: boolean,
): PublicGameState {
  const player = getPlayerOrThrow(db, playerId);

  if (restart) {
    archiveActiveGames(db, playerId);
  }

  const existing = getActiveGameByPlayer(db, playerId);
  if (existing && !restart) {
    return getPublicGameState(db, existing, player.name, events);
  }

  const initialRuntime: GameRuntimeState = {
    storyId: "main",
    day: 1,
    slot: 1,
    attributes: { ...INITIAL_ATTRIBUTES },
    flags: [],
  };
  const firstEvent = resolveEventForState(initialRuntime, events);
  const created = createNewGame(db, playerId, firstEvent.id);

  return getPublicGameState(db, created, player.name, events);
}

export function applyChoice(
  db: Database.Database,
  gameId: string,
  input: { eventId: string; choiceId: string },
  events: GameEvent[],
): { decision: DecisionPayload; nextState: PublicGameState } {
  const game = getGameOrThrow(db, gameId);
  if (game.status !== "active") {
    const err = new Error("Game is already completed");
    (err as Error & { statusCode?: number }).statusCode = 409;
    throw err;
  }

  const runtime = buildRuntime(game);
  const event = resolveEventForState(runtime, events);

  if (event.id !== input.eventId || game.current_event_id !== input.eventId) {
    const err = new Error("Event is not valid for the current game state");
    (err as Error & { statusCode?: number }).statusCode = 409;
    throw err;
  }

  const option = event.options.find((candidate) => candidate.id === input.choiceId);
  if (!option) {
    const err = new Error("Choice not found");
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  if (!passesConditions(option.conditions, runtime)) {
    const err = new Error("Choice is not available for the current event");
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  const attributesBefore = { ...runtime.attributes };
  const flagsBefore = [...runtime.flags];

  const attributesAfter = mergeEffects(attributesBefore, option.effects);
  const flagsAfter = applyFlags(flagsBefore, option.setFlags, option.clearFlags);

  const completedAfterThis = getDecisionCount(db, gameId) + 1;

  const txn = db.transaction(() => {
    insertDecision(db, {
      gameId,
      eventId: event.id,
      choiceId: option.id,
      effects: option.effects,
      attributesBefore,
      attributesAfter,
      flagsAfter,
    });

    const early = resolveEndingEarly(attributesAfter, completedAfterThis);
    if (early) {
      updateGameState(db, gameId, {
        attributes: attributesAfter,
        flags: flagsAfter,
        status: "completed",
        ending: early.ending,
        score: early.score,
        completed_at: new Date().toISOString(),
        current_event_id: null,
      });
      return;
    }

    if (game.day === 5 && game.slot === 3) {
      const resolution = resolveEndingAfterWeek(attributesAfter, completedAfterThis);
      updateGameState(db, gameId, {
        attributes: attributesAfter,
        flags: flagsAfter,
        status: "completed",
        ending: resolution.ending,
        score: resolution.score,
        completed_at: new Date().toISOString(),
        current_event_id: null,
      });
      return;
    }

    const next = advanceDaySlot(game.day, game.slot);
    const nextRuntime: GameRuntimeState = {
      storyId: game.story_id,
      day: next.day,
      slot: next.slot,
      attributes: attributesAfter,
      flags: flagsAfter,
    };
    const nextEvent = resolveEventForState(nextRuntime, events);

    updateGameState(db, gameId, {
      day: next.day,
      slot: next.slot,
      attributes: attributesAfter,
      flags: flagsAfter,
      current_event_id: nextEvent.id,
      status: "active",
    });
  });

  txn();

  const refreshed = getGameOrThrow(db, gameId);
  const player = getPlayerOrThrow(db, refreshed.player_id);
  const nextState = getPublicGameState(db, refreshed, player.name, events);

  const decision: DecisionPayload = {
    eventId: event.id,
    choiceId: option.id,
    effects: option.effects,
    attributesBefore,
    attributesAfter,
    flagsAfter,
  };

  return { decision, nextState };
}
