import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEventsPayload, type GameEvent } from "./eventSchema.js";

function hasMeaningfulConditions(conditions: GameEvent["conditions"]): boolean {
  if (!conditions) return false;

  const minKeys = Object.keys(conditions.minAttributes ?? {}).length;
  const maxKeys = Object.keys(conditions.maxAttributes ?? {}).length;
  const required = conditions.requiredFlags?.length ?? 0;
  const blocked = conditions.blockedFlags?.length ?? 0;

  return minKeys > 0 || maxKeys > 0 || required > 0 || blocked > 0;
}

export function loadEventsFromDisk(): GameEvent[] {
  const envPath = process.env.CORPORATE_SURVIVOR_EVENTS_PATH?.trim();
  const backendRoot = path.dirname(fileURLToPath(import.meta.url));
  const backendDir = path.resolve(backendRoot, "..", "..");
  const filePath =
    envPath && envPath.length > 0
      ? envPath
      : path.join(backendDir, "src", "game", "events.json");

  const rawText = fs.readFileSync(filePath, "utf8");
  const rawJson = JSON.parse(rawText) as unknown;
  const events = parseEventsPayload(rawJson);
  validateMainStoryCoverage(events);
  return events;
}

export function validateMainStoryCoverage(events: GameEvent[]): void {
  const mains = events.filter((event) => event.storyId === "main" && event.type === "main");
  const keys = new Set(mains.map((event) => `${event.day}:${event.slot}`));

  for (let day = 1; day <= 5; day += 1) {
    for (let slot = 1; slot <= 3; slot += 1) {
      const key = `${day}:${slot}`;
      if (!keys.has(key)) {
        throw new Error(`Missing main event for main story day ${day} slot ${slot}`);
      }

      const forSlot = mains.filter((event) => event.day === day && event.slot === slot);
      const hasUnconditional = forSlot.some((event) => !hasMeaningfulConditions(event.conditions));
      if (!hasUnconditional) {
        throw new Error(
          `Main story day ${day} slot ${slot} requires an unconditional fallback event (empty/missing conditions)`,
        );
      }
    }
  }

  if (mains.length < 15) {
    throw new Error(`Expected at least 15 main events, found ${mains.length}`);
  }
}
