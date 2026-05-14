export type Attributes = {
  energy: number;
  reputation: number;
  networking: number;
  anxiety: number;
  productivity: number;
  learning: number;
};

export type GameOption = {
  id: string;
  label: string;
};

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
    options: GameOption[];
  };
  ending: string | null;
  score: number | null;
};

export type ChoiceResponse = {
  decision: {
    eventId: string;
    choiceId: string;
    effects: Record<string, number>;
    attributesBefore: Attributes;
    attributesAfter: Attributes;
    flagsAfter?: string[];
  };
  nextState: PublicGameState;
};
