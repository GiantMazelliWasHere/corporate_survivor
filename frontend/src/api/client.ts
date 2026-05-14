import type { ChoiceResponse, PublicGameState } from "../types";

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function apiPostJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await parseJson<T & { error?: { message?: string } }>(response);

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload && payload.error?.message
        ? payload.error.message
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export async function apiGetJson<T>(path: string): Promise<T> {
  const response = await fetch(path);

  const payload = await parseJson<T & { error?: { message?: string } }>(response);

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload && payload.error?.message
        ? payload.error.message
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export async function createPlayer(name: string) {
  return apiPostJson<{ id: string; name: string }>("/api/players", { name });
}

export async function startGame(playerId: string, restart: boolean) {
  return apiPostJson<PublicGameState>("/api/games", { playerId, restart });
}

export async function loadActiveGame(playerId: string) {
  return apiGetJson<PublicGameState>(`/api/games/active/${encodeURIComponent(playerId)}`);
}

export async function submitChoice(gameId: string, eventId: string, choiceId: string) {
  return apiPostJson<ChoiceResponse>(`/api/games/${encodeURIComponent(gameId)}/choices`, {
    eventId,
    choiceId,
  });
}

export async function loadRanking() {
  return apiGetJson<Array<{ playerName: string; score: number; ending: string; completedAt: string }>>(
    "/api/ranking",
  );
}
