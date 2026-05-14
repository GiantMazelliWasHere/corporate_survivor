# API

The backend exposes a REST API consumed by the React frontend. The API owns persistence, game progression, score calculation, and ranking.

Base path:

```text
/api
```

## Data Shapes

### Attributes

```json
{
  "energy": 6,
  "reputation": 5,
  "networking": 3,
  "anxiety": 3,
  "productivity": 4,
  "learning": 2
}
```

### Public Event

The frontend receives only player-facing event data.

```json
{
  "id": "day1-evening-manager-message",
  "day": 1,
  "slot": 3,
  "title": "Rapidinho antes de sair",
  "description": "Seu gestor manda mensagem as 18h...",
  "options": [
    {
      "id": "accept-now",
      "label": "Claro, pode deixar comigo."
    }
  ]
}
```

The API must not expose hidden conditions, future events, or unavailable choices.

### Game State

```json
{
  "gameId": "game_123",
  "player": {
    "id": "player_123",
    "name": "Ana"
  },
  "status": "active",
  "day": 1,
  "slot": 3,
  "role": "Trainee",
  "attributes": {
    "energy": 6,
    "reputation": 5,
    "networking": 3,
    "anxiety": 3,
    "productivity": 4,
    "learning": 2
  },
  "currentEvent": {
    "id": "day1-evening-manager-message",
    "day": 1,
    "slot": 3,
    "title": "Rapidinho antes de sair",
    "description": "Seu gestor manda mensagem as 18h...",
    "options": []
  },
  "lastDecision": null,
  "ending": null,
  "score": null
}
```

## Endpoints

### Create Player

```http
POST /api/players
```

Request:

```json
{
  "name": "Ana"
}
```

Response:

```json
{
  "id": "player_123",
  "name": "Ana"
}
```

### Start or Restart Game

```http
POST /api/games
```

Request:

```json
{
  "playerId": "player_123",
  "mode": "main",
  "restart": true
}
```

Response: `GameState`

Behavior:

- If `restart` is true, complete or archive the previous active game and create a new one.
- If `restart` is false and an active game exists, return the active game.
- If no active game exists, create a new game.

### Continue Active Game

```http
GET /api/games/active/:playerId
```

Response:

- `200` with `GameState` when an active saved game exists.
- `404` when no active game exists.

### Read Game State

```http
GET /api/games/:gameId/state
```

Response: `GameState`

### Submit Choice

```http
POST /api/games/:gameId/choices
```

Request:

```json
{
  "eventId": "day1-evening-manager-message",
  "choiceId": "accept-now"
}
```

Response:

```json
{
  "decision": {
    "eventId": "day1-evening-manager-message",
    "choiceId": "accept-now",
    "effects": {
      "productivity": 2,
      "energy": -2,
      "anxiety": 1
    },
    "attributesBefore": {
      "energy": 6,
      "reputation": 5,
      "networking": 3,
      "anxiety": 3,
      "productivity": 4,
      "learning": 2
    },
    "attributesAfter": {
      "energy": 4,
      "reputation": 5,
      "networking": 3,
      "anxiety": 4,
      "productivity": 6,
      "learning": 2
    },
    "flagsAfter": ["after-hours-hero"]
  },
  "nextState": {}
}
```

Behavior:

- Validate that the submitted event is the current unlocked event.
- Validate that the choice exists and is available.
- Apply effects through the game engine.
- Save the decision and updated state in SQLite.
- Return the next state or final result.

### Ranking

```http
GET /api/ranking
```

Response:

```json
[
  {
    "playerName": "Ana",
    "score": 132,
    "ending": "Promessa Corporativa",
    "completedAt": "2026-05-14T15:00:00.000Z"
  }
]
```

Ranking should include completed games only and be ordered by score descending.

## Error Shape

Use a consistent error format:

```json
{
  "error": {
    "code": "INVALID_CHOICE",
    "message": "Choice is not available for the current event."
  }
}
```

Recommended status codes:

- `400`: invalid payload.
- `404`: player or game not found.
- `409`: stale event, invalid state transition, or completed game.
- `500`: unexpected server error.
