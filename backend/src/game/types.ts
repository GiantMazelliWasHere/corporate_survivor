export type Attributes = {
  energy: number;
  reputation: number;
  networking: number;
  anxiety: number;
  productivity: number;
  learning: number;
};

export type GameStatus = "active" | "completed";

export type PlayerRow = {
  id: string;
  name: string;
  created_at: string;
};

export type GameRow = {
  id: string;
  player_id: string;
  story_id: string;
  mode: string;
  status: GameStatus;
  day: number;
  slot: number;
  role: string;
  attributes_json: string;
  flags_json: string;
  current_event_id: string | null;
  ending: string | null;
  score: number | null;
  completed_at: string | null;
  created_at: string;
};

export type DecisionRow = {
  id: number;
  game_id: string;
  event_id: string;
  choice_id: string;
  effects_json: string;
  attributes_before_json: string;
  attributes_after_json: string;
  flags_after_json: string;
  created_at: string;
};

export const INITIAL_ATTRIBUTES: Attributes = {
  energy: 6,
  reputation: 5,
  networking: 3,
  anxiety: 3,
  productivity: 4,
  learning: 2,
};

export const ATTRIBUTE_KEYS = [
  "energy",
  "reputation",
  "networking",
  "anxiety",
  "productivity",
  "learning",
] as const satisfies readonly (keyof Attributes)[];
