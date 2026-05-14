import type { Attributes } from "./types.js";

export function calculateScore(attributes: Attributes, completedEvents: number): number {
  const score =
    attributes.energy * 8 +
    attributes.reputation * 14 +
    attributes.networking * 10 +
    attributes.productivity * 12 +
    attributes.learning * 12 -
    attributes.anxiety * 8 +
    completedEvents * 5;
  return Math.round(score);
}
