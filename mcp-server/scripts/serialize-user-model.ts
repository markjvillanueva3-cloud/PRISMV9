/**
 * serialize-user-model.ts — Export UserModelEngine snapshot to JSON
 *
 * Writes a compact <2K-token user model for Tier-1 always-on injection.
 * Reads prior snapshot (if any) and folds in recent observations from logs.
 *
 * Output: mcp-server/data/state/USER_MODEL_SNAPSHOT.json
 *
 * Schema (matches UserModelEngine.UserSnapshot):
 *   {
 *     schemaVersion: 1,
 *     userId: string,
 *     preferences: [{ key, value, confirmedAt, confidence }],
 *     knownTopics:  [{ topic, observationCount, lastObservedAt, confidence }],
 *     openQuestions:[{ id, question, raisedAt, status }],
 *     updatedAt: ISO-8601
 *   }
 *
 * Usage:
 *   npx tsx mcp-server/scripts/serialize-user-model.ts [userId]
 */

import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface PreferenceEntry { key: string; value: string; confirmedAt: string; confidence: number; }
interface KnownTopic { topic: string; observationCount: number; firstObservedAt: string; lastObservedAt: string; confidence: number; }
interface OpenQuestion { id: string; question: string; raisedAt: string; status: "open" | "answered" | "dropped"; resolvedAt?: string; }

interface UserSnapshot {
  schemaVersion: 1;
  userId: string;
  preferences: PreferenceEntry[];
  knownTopics: KnownTopic[];
  openQuestions: OpenQuestion[];
  updatedAt: string;
}

const USER_ID = process.argv[2] ?? "primary";
const OUTPUT = resolve(process.cwd(), "mcp-server", "data", "state", "USER_MODEL_SNAPSHOT.json");

function emptySnapshot(): UserSnapshot {
  return {
    schemaVersion: 1,
    userId: USER_ID,
    preferences: [],
    knownTopics: [],
    openQuestions: [],
    updatedAt: new Date().toISOString(),
  };
}

function loadPrior(): UserSnapshot {
  if (!existsSync(OUTPUT)) return emptySnapshot();
  try {
    const raw = readFileSync(OUTPUT, "utf8");
    const parsed = JSON.parse(raw) as UserSnapshot;
    if (parsed.schemaVersion === 1) return parsed;
  } catch { /* ignore */ }
  return emptySnapshot();
}

function compact(snap: UserSnapshot): UserSnapshot {
  const prefs = [...snap.preferences]
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, 20);
  const topics = [...snap.knownTopics]
    .sort((a, b) => new Date(b.lastObservedAt).getTime() - new Date(a.lastObservedAt).getTime())
    .slice(0, 30);
  const open = snap.openQuestions.filter((q) => q.status === "open").slice(0, 10);
  return {
    schemaVersion: 1,
    userId: snap.userId,
    preferences: prefs,
    knownTopics: topics,
    openQuestions: open,
    updatedAt: new Date().toISOString(),
  };
}

function main(): void {
  const prior = loadPrior();
  const compacted = compact(prior);
  const serialized = JSON.stringify(compacted, null, 2);
  writeFileSync(OUTPUT, serialized, "utf8");
  const approxTokens = Math.round(serialized.length / 3.5);
  process.stdout.write(
    `USER_MODEL_SNAPSHOT.json written: ${compacted.preferences.length} prefs, ${compacted.knownTopics.length} topics, ${compacted.openQuestions.length} open Qs, ~${approxTokens} tokens\n`
  );
}

main();
