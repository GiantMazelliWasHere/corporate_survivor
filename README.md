# Corporate Survivor

Corporate Survivor is a small full-stack RPG about surviving the first week as a trainee. The frontend is React + Vite, the backend is Node + Express + SQLite, and the story is driven by JSON events loaded by the game engine.

## Quick start

Prerequisites: Node.js 20+

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173` (Vite dev server proxies `/api` to the backend)
- Backend API: `http://localhost:3001`

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run backend + frontend together |
| `npm run build` | Typecheck/build backend + build frontend |
| `npm start` | Run compiled backend (`backend/dist`) |

## Project structure

```text
frontend/        React UI
backend/         Express API + SQLite + game engine
docs/            Architecture + contracts + decisions
.cursor/rules/   Cursor guidance
```

## Gameplay contract (summary)

- Player registers a name, starts as **Trainee** on **day 1**.
- The week has **5 days** with **3 main events per day** (15 main events minimum).
- Each event is selected by the backend based on **day/slot**, **conditions**, and **flags**.
- Choices apply **effects** to `energy`, `reputation`, `networking`, `anxiety`, `productivity`, and `learning`.
- The SQLite database stores **autosave** after every choice (`games` + `decisions`).
- Completing the week (or triggering an early ending) records **score + ending** for the **global ranking**.

## Configuration

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend port (default `3001`) |
| `CORPORATE_SURVIVOR_DB_PATH` | Override SQLite file path |
| `CORPORATE_SURVIVOR_EVENTS_PATH` | Override events JSON path |

Notes:

- By default the backend loads events from `backend/src/game/events.json` (resolved relative to the backend folder). If you ship only `backend/dist`, either include `backend/src/game/events.json` in the deployment layout or set `CORPORATE_SURVIVOR_EVENTS_PATH` to a packaged JSON file.

## Documentation

- [Architecture](docs/architecture.md)
- [Game rules](docs/game-rules.md)
- [API](docs/api.md)
- [Decisions](docs/decisions.md)

## Adding events (expected workflow)

1. Edit the active story JSON (`backend/src/game/events.json` by default).
2. Keep an **unconditional fallback** event for every `(day, slot)` in the main story.
3. Restart the backend to reload content.

If you need a **new generic mechanic** (new condition/effect type), extend the engine once and document it in `docs/game-rules.md`.
