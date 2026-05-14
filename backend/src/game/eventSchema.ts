import { z } from "zod";

const conditionsSchema = z
  .object({
    minAttributes: z.record(z.number()).optional(),
    maxAttributes: z.record(z.number()).optional(),
    requiredFlags: z.array(z.string()).optional(),
    blockedFlags: z.array(z.string()).optional(),
  })
  .strict()
  .optional();

const optionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    effects: z.record(z.number()).default({}),
    setFlags: z.array(z.string()).optional(),
    clearFlags: z.array(z.string()).optional(),
    conditions: conditionsSchema,
  })
  .strict();

export const gameEventSchema = z
  .object({
    id: z.string().min(1),
    storyId: z.string().min(1),
    day: z.number().int().min(1).max(7),
    slot: z.number().int().min(1).max(3),
    type: z.enum(["main", "secret"]).default("main"),
    priority: z.number().int().default(0),
    title: z.string().min(1),
    description: z.string().min(1),
    conditions: conditionsSchema,
    options: z.array(optionSchema).min(2),
  })
  .strict();

export type GameEvent = z.infer<typeof gameEventSchema>;

export function parseEventsPayload(raw: unknown): GameEvent[] {
  const arr = z.array(gameEventSchema).parse(raw);
  return arr;
}
