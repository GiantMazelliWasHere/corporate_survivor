import type { Attributes } from "./types.js";
import { ATTRIBUTE_KEYS } from "./types.js";
import type { GameEvent } from "./eventSchema.js";

export type GameRuntimeState = {
  storyId: string;
  day: number;
  slot: number;
  attributes: Attributes;
  flags: string[];
};

export function clampAttributes(attributes: Attributes): Attributes {
  const next = { ...attributes };
  for (const key of ATTRIBUTE_KEYS) {
    const value = next[key];
    if (Number.isNaN(value)) next[key] = 0;
    next[key] = Math.max(0, Math.min(10, Math.round(value)));
  }
  return next;
}

export function mergeEffects(attributes: Attributes, effects: Record<string, number>): Attributes {
  const next = { ...attributes };
  for (const [key, delta] of Object.entries(effects)) {
    if (key in next) {
      next[key as keyof Attributes] += delta;
    }
  }
  return clampAttributes(next);
}

function hasFlag(flags: string[], flag: string): boolean {
  return flags.includes(flag);
}

export function passesConditions(
  conditions: GameEvent["conditions"],
  state: GameRuntimeState,
): boolean {
  if (!conditions) return true;

  const minAttrs = conditions.minAttributes ?? {};
  for (const [key, min] of Object.entries(minAttrs)) {
    const k = key as keyof Attributes;
    if ((state.attributes[k] ?? 0) < min) return false;
  }

  const maxAttrs = conditions.maxAttributes ?? {};
  for (const [key, max] of Object.entries(maxAttrs)) {
    const k = key as keyof Attributes;
    if ((state.attributes[k] ?? 0) > max) return false;
  }

  for (const flag of conditions.requiredFlags ?? []) {
    if (!hasFlag(state.flags, flag)) return false;
  }

  for (const flag of conditions.blockedFlags ?? []) {
    if (hasFlag(state.flags, flag)) return false;
  }

  return true;
}

export function resolveEventForState(state: GameRuntimeState, events: GameEvent[]): GameEvent {
  const candidates = events.filter(
    (event) =>
      event.storyId === state.storyId &&
      event.day === state.day &&
      event.slot === state.slot &&
      event.type === "main",
  );

  const sorted = [...candidates].sort((a, b) => b.priority - a.priority);
  for (const event of sorted) {
    if (passesConditions(event.conditions, state)) return event;
  }

  throw new Error(
    `No unlocked main event for story=${state.storyId} day=${state.day} slot=${state.slot}`,
  );
}

export function filterPublicOptions(event: GameEvent, state: GameRuntimeState) {
  return event.options.filter((option) => passesConditions(option.conditions, state));
}

export function advanceDaySlot(day: number, slot: number): { day: number; slot: number } {
  if (slot < 3) return { day, slot: slot + 1 };
  return { day: day + 1, slot: 1 };
}

export function applyFlags(flags: string[], setFlags?: string[], clearFlags?: string[]): string[] {
  const set = new Set(flags);
  for (const f of clearFlags ?? []) set.delete(f);
  for (const f of setFlags ?? []) set.add(f);
  return [...set].sort();
}
