#!/usr/bin/env node
/**
 * PRISM Master Unit Plan — Autonomous Harness (delegator).
 *
 * The real implementation lives at scripts/hermes-unit-plan-harness.mjs
 * (HERMES-UNIT-PLAN / U-ZULU-UNITPLAN-HARNESS, slot:zulu, 2026-07-02) — parse
 * units -> ROI queue (Claude gap-analysis fragments) -> capped Hermes drafting
 * with Ollama fallback -> status flips + plan progress log + ledger.
 * This file stays as the documented entry point next to the unit specs; it
 * forwards argv verbatim so `node autonomous-harness.mjs --status` etc. work.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REAL = path.resolve(HERE, "../../../scripts/hermes-unit-plan-harness.mjs");
const r = spawnSync(process.execPath, [REAL, ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(r.status ?? 2);
