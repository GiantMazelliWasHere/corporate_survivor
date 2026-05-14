# Game Rules

Corporate Survivor follows a trainee during the first week at a company. The player makes decisions in corporate scenarios and tries to finish the week without being fired, burning out, or becoming operational risk.

## Player Attributes

All attributes are persistent and must be saved in SQLite after each choice.

| Attribute | Meaning |
| --- | --- |
| `energy` | Physical and mental stamina. Zero can trigger burnout or collapse. |
| `reputation` | How leaders and peers perceive the trainee. Very low reputation can trigger dismissal. |
| `networking` | Relationship building and internal support. |
| `anxiety` | Stress level. High anxiety increases burnout risk. |
| `productivity` | Delivery capacity and visible output. |
| `learning` | Understanding of tools, process, and company context. |

Recommended initial values:

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

## Progression

- The player starts as a trainee on Monday.
- The game has 5 days.
- Each day has exactly 3 main event slots.
- The base story must have at least 15 main events.
- Secret or optional events may exist, but they must not break the required 5 x 3 main event flow.
- The game ends after Friday's third event unless an early ending is triggered.

## Event Format

Events must be loaded dynamically by the backend game engine. The frontend receives only the current event selected by the API.

```json
{
  "id": "day1-evening-manager-message",
  "storyId": "main",
  "day": 1,
  "slot": 3,
  "type": "main",
  "title": "Rapidinho antes de sair",
  "description": "Seu gestor manda mensagem as 18h: \"Rapidinho, consegue subir isso hoje?\"",
  "conditions": {
    "minAttributes": {
      "energy": 1
    },
    "requiredFlags": [],
    "blockedFlags": []
  },
  "options": [
    {
      "id": "accept-now",
      "label": "Claro, pode deixar comigo.",
      "effects": {
        "productivity": 2,
        "energy": -2,
        "anxiety": 1
      },
      "setFlags": ["accepted-after-hours-work"]
    },
    {
      "id": "negotiate-morning",
      "label": "Consigo amanhã cedo com mais segurança.",
      "effects": {
        "reputation": 1,
        "productivity": -1,
        "anxiety": -1
      }
    }
  ]
}
```

## Conditions

Conditions decide whether an event or option is available. Supported condition types should be kept generic:

- `minAttributes`: minimum attribute values.
- `maxAttributes`: maximum attribute values.
- `requiredFlags`: flags that must exist.
- `blockedFlags`: flags that must not exist.
- `previousChoices`: optional history-based requirements.

If multiple events match the same day and slot, the engine should choose the highest-priority unlocked event. The main story must always have a fallback event for each required slot.

## Effects

Effects are additive changes to attributes. The engine clamps attributes to valid ranges after each choice.

Recommended range:

- Minimum: `0`
- Maximum: `10`

The engine must persist:

- Event id.
- Choice id.
- Effects applied.
- Flags set or removed.
- Attributes before and after the choice.

## End Conditions

The game can end when:

- The week ends after Friday's third event.
- Any critical attribute reaches zero.
- The trainee is fired.
- The trainee enters burnout.
- The trainee becomes a standout performer.
- The trainee survives onboarding normally.

Suggested early-ending checks:

- `energy <= 0` or `anxiety >= 10`: `Burnout em Tempo Recorde`.
- `reputation <= 0`: `Demitido no Período de Experiência`.
- `productivity <= 0` and `learning <= 1`: `Risco Operacional`.
- `reputation >= 9`, `productivity >= 9`, and `learning >= 7`: `Trainee Lenda`.

## Score

Score is calculated at the end of the game and saved with the final result.

Recommended formula:

```text
score =
  energy * 8 +
  reputation * 14 +
  networking * 10 +
  productivity * 12 +
  learning * 12 -
  anxiety * 8 +
  completedEvents * 5
```

The formula intentionally rewards balanced survival, learning, and delivery while penalizing anxiety.

## Endings

The system must support at least 3 endings. The planned set is:

- `Trainee Lenda`: exceptional outcome with very high performance and reputation.
- `Promessa Corporativa`: strong score and positive growth.
- `Funcionário Invisível`: survived, but with low visibility and low networking.
- `Sobrevivente do Onboarding`: normal survival through the week.
- `Risco Operacional`: low productivity or learning caused concern.
- `Burnout em Tempo Recorde`: anxiety or energy ended the journey early.
- `Demitido no Período de Experiência`: reputation collapsed.

## Adding New Events

To add a new event, edit only the active story event configuration. Do not change React components, API routes, database schema, or engine control flow unless the event model itself needs a new generic capability.

When a new generic capability is needed, document it here and update the engine once so future events can reuse it.
