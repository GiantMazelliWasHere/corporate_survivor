import cors from "cors";
import express from "express";
import { z } from "zod";
import { migrate, openDatabase } from "./db/database.js";
import { getActiveGameByPlayer, getGameOrThrow, getRanking } from "./db/games.js";
import { createPlayer, getPlayerOrThrow } from "./db/players.js";
import { loadEventsFromDisk } from "./game/eventLoader.js";
import { applyChoice, getPublicGameState, startOrResumeGame } from "./services/gameService.js";

const db = openDatabase();
migrate(db);
const events = loadEventsFromDisk();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

function sendError(res: express.Response, status: number, code: string, message: string) {
  res.status(status).json({ error: { code, message } });
}

function handleRouteError(res: express.Response, error: unknown) {
  if (error instanceof z.ZodError) {
    return sendError(
      res,
      400,
      "INVALID_PAYLOAD",
      error.issues.map((item) => item.message).join("; "),
    );
  }

  const maybeStatus = (error as Error & { statusCode?: number }).statusCode;
  const status = typeof maybeStatus === "number" ? maybeStatus : 500;

  const message = error instanceof Error ? error.message : "Unexpected error";
  const code =
    status === 404 ? "NOT_FOUND" : status === 409 ? "CONFLICT" : status === 400 ? "BAD_REQUEST" : "SERVER_ERROR";

  return sendError(res, status, code, message);
}

const playerSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

const gameSchema = z.object({
  playerId: z.string().uuid(),
  restart: z.boolean().optional().default(false),
});

const choiceSchema = z.object({
  eventId: z.string().min(1),
  choiceId: z.string().min(1),
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/players", (req, res) => {
  try {
    const body = playerSchema.parse(req.body);
    const player = createPlayer(db, body.name);
    res.status(201).json({ id: player.id, name: player.name });
  } catch (error) {
    handleRouteError(res, error);
  }
});

app.post("/api/games", (req, res) => {
  try {
    const body = gameSchema.parse(req.body);
    const state = startOrResumeGame(db, body.playerId, events, body.restart);
    res.status(body.restart ? 201 : 200).json(state);
  } catch (error) {
    handleRouteError(res, error);
  }
});

app.get("/api/games/active/:playerId", (req, res) => {
  try {
    const playerId = z.string().uuid().parse(req.params.playerId);
    const active = getActiveGameByPlayer(db, playerId);
    if (!active) {
      return sendError(res, 404, "NOT_FOUND", "No active game for this player");
    }

    const player = getPlayerOrThrow(db, playerId);
    const state = getPublicGameState(db, active, player.name, events);
    res.json(state);
  } catch (error) {
    handleRouteError(res, error);
  }
});

app.get("/api/games/:gameId/state", (req, res) => {
  try {
    const gameId = z.string().uuid().parse(req.params.gameId);
    const game = getGameOrThrow(db, gameId);
    const player = getPlayerOrThrow(db, game.player_id);
    const state = getPublicGameState(db, game, player.name, events);
    res.json(state);
  } catch (error) {
    handleRouteError(res, error);
  }
});

app.post("/api/games/:gameId/choices", (req, res) => {
  try {
    const gameId = z.string().uuid().parse(req.params.gameId);
    const body = choiceSchema.parse(req.body);
    const result = applyChoice(db, gameId, body, events);
    res.json({
      decision: {
        eventId: result.decision.eventId,
        choiceId: result.decision.choiceId,
        effects: result.decision.effects,
      attributesBefore: result.decision.attributesBefore,
      attributesAfter: result.decision.attributesAfter,
      flagsAfter: result.decision.flagsAfter,
      },
      nextState: result.nextState,
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

app.get("/api/ranking", (_req, res) => {
  try {
    const rows = getRanking(db, 100);
    res.json(rows);
  } catch (error) {
    handleRouteError(res, error);
  }
});

const port = Number(process.env.PORT ?? "3001");

app.listen(port, () => {
  console.log(`Corporate Survivor API listening on http://localhost:${port}`);
});
