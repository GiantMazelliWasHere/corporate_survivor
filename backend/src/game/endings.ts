import type { Attributes } from "./types.js";
import { calculateScore } from "./score.js";

export type EndingResolution =
  | { kind: "early"; ending: string; score: number }
  | { kind: "complete"; ending: string; score: number };

export function resolveEndingEarly(
  attributes: Attributes,
  completedEvents: number,
): EndingResolution | null {
  if (attributes.energy <= 0 || attributes.anxiety >= 10) {
    return {
      kind: "early",
      ending: "Burnout em Tempo Recorde",
      score: calculateScore(attributes, completedEvents),
    };
  }

  if (attributes.reputation <= 0) {
    return {
      kind: "early",
      ending: "Demitido no Período de Experiência",
      score: calculateScore(attributes, completedEvents),
    };
  }

  if (attributes.productivity <= 0 && attributes.learning <= 1) {
    return {
      kind: "early",
      ending: "Risco Operacional",
      score: calculateScore(attributes, completedEvents),
    };
  }

  if (attributes.reputation >= 9 && attributes.productivity >= 9 && attributes.learning >= 7) {
    return {
      kind: "early",
      ending: "Trainee Lenda",
      score: calculateScore(attributes, completedEvents),
    };
  }

  return null;
}

export function resolveEndingAfterWeek(attributes: Attributes, completedEvents: number): EndingResolution {
  const score = calculateScore(attributes, completedEvents);

  const legendCandidate =
    attributes.reputation >= 8 &&
    attributes.productivity >= 8 &&
    attributes.learning >= 6 &&
    attributes.anxiety <= 5;

  if (legendCandidate) {
    return { kind: "complete", ending: "Trainee Lenda", score };
  }

  if (score >= 240 && attributes.reputation >= 6 && attributes.networking >= 5) {
    return { kind: "complete", ending: "Promessa Corporativa", score };
  }

  if (attributes.networking <= 2 && attributes.reputation <= 5 && attributes.productivity <= 5) {
    return { kind: "complete", ending: "Funcionário Invisível", score };
  }

  return { kind: "complete", ending: "Sobrevivente do Onboarding", score };
}
