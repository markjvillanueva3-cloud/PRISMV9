#!/usr/bin/env node
// tier: T3 (observer -- advisory only, never blocks Stop)
/**
 * stop-dream-queue-produce.mjs -- the missing PRODUCER for the dream-queue.
 *
 * The engine (mcp-server/dist/engines/DreamLoopProposalEngine.js) and the
 * surface consumer (stop-dream-queue-surface.mjs) both existed, but NOTHING
 * wrote state/shared/dream-queue/dream-<slot>-<YYYY-MM-DD>.json -- so the loop
 * was dormant. This hook closes it: it gathers recent correction signal
 * (feedback memories) + recurring error patterns (the error-learn ledger) + a
 * slot's current refuse_list, runs DreamLoopProposalEngine.propose(), and writes
 * the queue file the surface hook reads next Stop.
 *
 * Generalizes stop-soul-evolution.mjs (refuse-rules only, novelty-gated) by ALSO
 * proposing SKILLS from the recurring-error ledger (repetition-gated). Advisory
 * only; never mutates a live soul -- the operator promotes from the queue.
 *
 * APPLY-TO-ALL-GALAXIES (R15): correction + error signal is fleet-wide; only the
 * per-slot refuse_list filter differs. The all-slots sweep produces a dream batch
 * for EVERY galaxy/slot soul in one pass. Stop default = current slot (cheap);
 * the fleet sweep is `--all-slots` / PRISM_DREAM_PRODUCE_ALL=1.
 *
 * Knobs:
 *   PRISM_DREAM_PRODUCE_DISABLE=1       skip entirely
 *   PRISM_DREAM_PRODUCE_ALL=1           produce for every soul slot (fleet sweep)
 *   PRISM_DREAM_PRODUCE_HORIZON=N       correction look-back seconds (default 86400 = 1 day)
 *   PRISM_DREAM_PRODUCE_MIN_REP=N       min repetitions to graduate a refuse-rule (default 2)
 *   PRISM_DREAM_PRODUCE_ERR_MINCOUNT=N  min ledger count to consider a pattern (default 2)
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  collectRecentCorrections,
  readSoulRefuseList,
  aggregateErrorPatterns,
  enumerateSoulSlots,
  buildProposalRequest,
  buildDreamDoc,
  hasProposals,
} from "../../scripts/lib/dream-signal.mjs";

const PROJECT_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SOULS_DIR = join(PROJECT_ROOT, "state/shared/slot-souls");
const MEMORY_DIR = join(PROJECT_ROOT, "knowledge/memories/feedback");
const LEDGER_PATH = join(PROJECT_ROOT, "mcp-server/data/state/ERROR_LEARN_LEDGER.jsonl");
const QUEUE_DIR = join(PROJECT_ROOT, "state/shared/dream-queue");
const DEFAULT_HORIZON_SEC = 86400;

function getSlot() {
  return process.env.PRISM_SLOT || process.env.SLOT || "unknown";
}

function todayStr(nowMs) {
  return new Date(nowMs ?? Date.now()).toISOString().slice(0, 10);
}

// Resolve the dist engine lazily so the hook stays import-safe and testable
// (tests inject a fake engine instead of loading the dist build + zod).
async function defaultEngine() {
  const mod = await import("../../mcp-server/dist/engines/DreamLoopProposalEngine.js");
  return mod.DreamLoopProposalEngine;
}

// Produce one slot's dream batch and persist it. Returns {slot,outPath,batch}
// when something was written, or null when the batch had no proposals. Pure of
// signal-gathering: corrections + errorPatterns are passed in (shared fleet-wide).
function produceForSlot({ slot, soulsDir, corrections, errorPatterns, queueDir, minRep, engine, nowMs }) {
  const refuseList = readSoulRefuseList({ soulsDir, slot });
  const req = buildProposalRequest({ slot, corrections, errorPatterns, refuseList, minRepetitions: minRep });
  const batch = engine.propose(req);
  if (!hasProposals(batch)) return null;
  const date = todayStr(nowMs);
  const doc = buildDreamDoc({ batch, date, now: new Date(nowMs).toISOString() });
  if (!existsSync(queueDir)) mkdirSync(queueDir, { recursive: true });
  const outPath = join(queueDir, `dream-${slot}-${date}.json`);
  writeFileSync(outPath, JSON.stringify(doc, null, 2), "utf8");
  return { slot, outPath, batch };
}

async function run(opts = {}) {
  const {
    soulsDir = SOULS_DIR,
    memoryDir = MEMORY_DIR,
    ledgerPath = LEDGER_PATH,
    queueDir = QUEUE_DIR,
    engine,
    now,
  } = opts;
  const allSlots = opts.allSlots ?? (process.env.PRISM_DREAM_PRODUCE_ALL === "1");
  const horizonSec = Number(process.env.PRISM_DREAM_PRODUCE_HORIZON) || DEFAULT_HORIZON_SEC;
  const minRep = Number(process.env.PRISM_DREAM_PRODUCE_MIN_REP) || 2;
  const errMinCount = Number(process.env.PRISM_DREAM_PRODUCE_ERR_MINCOUNT) || 2;
  const nowMs = now ?? Date.now();

  // Shared signal: corrections + recurring errors are fleet-wide; only the
  // per-slot refuse_list filter differs.
  const corrections = collectRecentCorrections({ memoryDir, horizonMs: horizonSec * 1000, now: nowMs });
  const errorPatterns = aggregateErrorPatterns({ ledgerPath, minCount: errMinCount });
  if (corrections.length === 0 && errorPatterns.length === 0) return { continue: true, produced: [] };

  const slots = allSlots
    ? enumerateSoulSlots({ soulsDir })
    : [opts.slot || getSlot()].filter((s) => s && s !== "unknown");
  if (slots.length === 0) return { continue: true, produced: [] };

  const eng = engine || (await defaultEngine());
  const produced = [];
  for (const slot of slots) {
    const r = produceForSlot({ slot, soulsDir, corrections, errorPatterns, queueDir, minRep, engine: eng, nowMs });
    if (r) produced.push(r);
  }
  if (produced.length === 0) return { continue: true, produced: [] };

  const totalRefuse = produced.reduce((n, p) => n + p.batch.refuse_rules.length, 0);
  const totalSkills = produced.reduce((n, p) => n + p.batch.skills.length, 0);
  const advisory =
    `Dream loop -- ${produced.length} galaxy/slot batch(es): ${totalRefuse} refuse-rule + ${totalSkills} skill candidate(s)\n` +
    `  Queue dir: ${queueDir}\n` +
    `  Surfaced at next Stop (stop-dream-queue-surface); promote into state/shared/slot-souls/<slot>.md.`;
  return { continue: true, advisory, produced };
}

const isDirect = (process.argv[1] || "").replace(/\\/g, "/").endsWith("stop-dream-queue-produce.mjs");
if (isDirect) {
  if (process.env.PRISM_DREAM_PRODUCE_DISABLE === "1") {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }
  const allSlots = process.argv.includes("--all-slots") || process.env.PRISM_DREAM_PRODUCE_ALL === "1";
  run({ allSlots })
    .then((r) => {
      if (r.advisory) {
        process.stdout.write(JSON.stringify({
          continue: true,
          hookSpecificOutput: { hookEventName: "Stop", additionalContext: r.advisory },
        }));
      } else {
        process.stdout.write(JSON.stringify({ continue: true }));
      }
      process.exit(0);
    })
    .catch(() => {
      // R12 fail-soft: a self-reflection producer must never block Stop.
      process.stdout.write(JSON.stringify({ continue: true }));
      process.exit(0);
    });
}

export { run, produceForSlot, getSlot, todayStr, defaultEngine };
