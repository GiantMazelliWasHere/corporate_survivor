# Decisions

This document records the first architecture decisions for Corporate Survivor. Update it whenever a decision changes the way the project is built or extended.

## 1. Use Separate Frontend and Backend

Decision: use `frontend/` for React + Vite and `backend/` for Node.js + Express.

Reason: the game requires a real backend, SQLite persistence, auto-save, ranking, and a game engine that should not live in the interface.

Consequence: frontend and backend communicate through REST contracts documented in `docs/api.md`.

## 2. Keep Game Logic Out of the UI

Decision: React renders the game state returned by the API and never owns event selection, scoring, ending resolution, or unlock rules.

Reason: the game must react to persistent state and allow events to be added without modifying multiple UI files.

Consequence: event content, conditions, effects, flags, scoring, and endings belong to the backend game layer.

## 3. Store Events as Configuration

Decision: main story events are loaded from a backend configuration file, initially `backend/src/game/events.json`.

Reason: adding a new event should be a content operation, not an application rewrite.

Consequence: event definitions need a stable schema with `id`, `day`, `slot`, `description`, `options`, `conditions`, and `effects`.

## 4. Use a Generic Engine

Decision: the engine evaluates generic condition and effect types instead of custom code per event.

Reason: the project must support future modes and stories.

Consequence: if a new event needs behavior not supported by the schema, first add a reusable engine capability and document it in `docs/game-rules.md`.

## 5. Persist Every Decision

Decision: every selected choice is saved with event id, choice id, effects, flags, and attributes before/after.

Reason: save/continue, debugging, final summaries, and ranking depend on trustworthy state history.

Consequence: the choice endpoint must be transactional: apply engine result and database writes together.

## 6. SQLite Is the Source of Truth

Decision: SQLite stores players, games, decisions, endings, and scores.

Reason: browser state is not enough for a global ranking or reliable continue-game behavior.

Consequence: local storage can only cache small convenience data, such as the last player id, and must not be treated as authoritative game state.

## 7. Cursor Rules Are Split by Area

Decision: use separate rules for frontend, backend, and game engine instead of one broad rule.

Reason: each area has different constraints, and the requested project structure explicitly includes dedicated rule files.

Consequence: future agents should consult the relevant rule before changing code in that area.

## Future Evolution

The architecture should support:

- New story packs by loading different event configuration files.
- New modes by adding mode metadata and alternate initial state.
- New endings through ending rules or ending configuration.
- New frontend themes without changing backend logic.
- Analytics or achievements by consuming the decisions history.
