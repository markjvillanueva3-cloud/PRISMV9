---
type: "chat-session"
source: "claude-code-cli"
session_id: "343f018c-806c-4453-91b4-a7a41a07ed4a"
title: "Rigorous read-only code review (independent second pass — do NOT assume another "
date: "2026-06-19"
first_ts: "2026-06-19T20:13:07.536Z"
last_ts: "2026-06-19T20:16:57.544Z"
cwd: "H:\\prism"
messages: 52
user_msgs: 19
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--prism/343f018c-806c-4453-91b4-a7a41a07ed4a/subagents/agent-ab57ce1f040f893a4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Rigorous read-only code review (independent second pass — do NOT assume another 

> **claude-code-cli** | 2026-06-19 | 52 msgs (19 user / 33 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/343f018c-806c-4453-91b4-a7a41a07ed4a/subagents/agent-ab57ce1f040f893a4.jsonl`

## Transcript

### User | 2026-06-19T20:13:07.536Z

Rigorous read-only code review (independent second pass — do NOT assume another reviewer caught everything; weight: correctness, convention conformance, dedup, hidden coupling, error budgets). Cwd H:\prism. Read END TO END:
- scripts/lib/outcome-actual-emit.mjs
- scripts/lib/outcome-actual-emit.test.mjs

This is a NEW shared producer for PRISM's closed-loop training. Verify it does not duplicate existing assets and follows repo conventions.

Check:
1. DEDUP: does a generic actuals->outcomes-ledger producer already exist? Compare against scripts/lib/galaxy-lora-emit.mjs, scripts/build-outcomes-lora-dataset.mjs, mcp-server/src/engines/OutcomeCaptureBusEngine.ts, QuotingActualOutcomeLoaderEngine, OutcomePublishAdapterEngine. Is this genuinely the missing piece or an overlap? Cite.
2. Correctness of buildOutcomeEvent: enum validation completeness vs outcomeEventSchema.ts; the hasDeterminingInput gate vs the converter's INPUT_KEYS (outcome-to-alpaca-converter.mjs:27); any off-by-one / wrong-field bug.
3. Any unreachable code (a linter flagged "unreachable-after-return") — confirm true or false positive with line.
4. ESM/convention conformance: matches sibling scripts/lib/*.mjs style (imports, exports, error handling, ascii-only)? Any non-ASCII that would trip ascii-guard?
5. Edge cases that could silently corrupt the ledger: huge payloads (>64KB line), non-finite numbers in actual, prototype-pollution keys in context, CRLF leakage into JSON.
6. Is the pure/impure split right for testability? Is anything that should be injected hard-coded?

Output: P0/P1/P2 with file:line, then verdict PASS or FAIL. Terse.

### Assistant | 2026-06-19T20:13:13.515Z

I'll review these two files end to end, plus the comparison targets for dedup analysis.

### Assistant | 2026-06-19T20:13:13.981Z

[tool_use: Read]

### Assistant | 2026-06-19T20:13:14.327Z

[tool_use: Read]

### User | 2026-06-19T20:13:14.766Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\outcome-actual-emit.mjs' was already read 10s ago in this session and is unchanged (mtime 1781899874189). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-19T20:13:15.073Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\outcome-actual-emit.test.mjs' was already read 10s ago in this session and is unchanged (mtime 1781899936597). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-19T20:13:17.807Z

The read-once guard claims these are in context, but I have no record of them. Let me bypass the cache.

### Assistant | 2026-06-19T20:13:18.796Z

[tool_use: Bash]

### Assistant | 2026-06-19T20:13:19.488Z

[tool_use: Bash]

### User | 2026-06-19T20:13:25.243Z

[tool_result] /**
 * outcome-actual-emit.mjs -- the GENERIC actuals-side PRODUCER for the closed-loop
 * OUTCOME BUS (FLEET-CLOSEDLOOP-MS0/U-CL-PRODUCER, slot:zulu 2026-06-19).
 *
 * THE GAP THIS CLOSES (verified 2026-06-19, file:line cited in the milestone memo):
 * the consumer side of the LoRA loop is already built --
 *   state/outcomes/<domain>.jsonl  -> scripts/build-outcomes-lora-dataset.mjs
 *   -> scri
... [+9379 chars truncated]

### User | 2026-06-19T20:13:26.121Z

[tool_result] // Tests for scripts/lib/outcome-actual-emit.mjs (FLEET-CLOSEDLOOP-MS0/U-CL-PRODUCER).
// Run: node --test scripts/lib/outcome-actual-emit.test.mjs  (or: node scripts/lib/outcome-actual-emit.test.mjs)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

... [+7144 chars truncated]

### Assistant | 2026-06-19T20:13:29.618Z

Now let me read the key comparison targets: the converter (for INPUT_KEYS and buildOutput), the schema, and the dedup candidates.

### Assistant | 2026-06-19T20:13:30.541Z

[tool_use: Read]

### Assistant | 2026-06-19T20:13:30.743Z

[tool_use: Read]

### User | 2026-06-19T20:13:31.219Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\schemas\outcomeEventSchema.ts' was already read 18m ago in this session and is unchanged (mtime 1779317118137). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### User | 2026-06-19T20:13:31.309Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\outcome-to-alpaca-converter.mjs' was already read 6m ago in this session and is unchanged (mtime 1781228238759). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-19T20:13:36.071Z

The guard is blocking but I don't have these in context. Let me disable the cache.

### Assistant | 2026-06-19T20:13:36.767Z

[tool_use: Bash]

### User | 2026-06-19T20:13:41.574Z

[tool_result] /**
 * outcome-to-alpaca-converter.mjs -- pure converter: PRISM outcome-bus events ->
 * Alpaca {instruction, output} training pairs (U-OUTCOME-LORA-WIRE, slot:india 2026-06-11).
 *
 * THE DORMANCY THIS CLOSES: the closed-loop OUTCOME BUS (state/outcomes/*.jsonl) had
 * written 12,093 real events (10,864 recommendation_emitted + 1,229 cross_process_stage_complete)
 * that NO training script ever r
... [+6153 chars truncated]

### Assistant | 2026-06-19T20:13:45.658Z

Now the converter is confirmed. Key facts: `INPUT_KEYS` = `["material", "tool_id", "tool", "operation", "feature", "machine_id", "process"]` — matches the module's `DETERMINING_INPUT_KEYS` exactly. Now let me verify the schema enums and the dedup candidates.

### Assistant | 2026-06-19T20:13:46.564Z

[tool_use: Bash]

### User | 2026-06-19T20:13:51.713Z

[tool_result] export const IsoTimestamp = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "must be ISO date string" });

/**
 * Domains the bus knows about. Expandable — unknown domain falls back to "other"
 * so an engine never fails to emit because of a schema mismatch.
 */
export const OutcomeDomain = z.enum([
  "mill",
  "lathe",
  "wedm",
  "sinker_edm",
  "grinder",
  "welder",
  "
... [+3595 chars truncated]

### Assistant | 2026-06-19T20:13:58.988Z

Now let me verify the enum mirrors exactly. Comparing the schema enums to the module's Sets:

**OUTCOME_DOMAINS** (module): mill, lathe, wedm, sinker_edm, grinder, welder, laser, waterjet, five_axis, mill_turn, cad, cam, post_processor, speed_feed, quote, schedule, shop_floor, quality, erp, other — **matches schema (20 values)**.

**OUTCOME_KINDS** (module): operator_override, cycle_time_measurement, tool_break, surface_finish_ra, cmm_measurement, scrap_event, first_article_pass, first_article_fail, quote_accepted, quote_rejected, quote_vs_actual, chatter_event, collision_avoided, post_editor_edit, recommendation_emitted, cross_process_decision, cross_process_stage_complete, cad_execution_outcome, other — **matches schema (19 values)**.

**OUTCOME_SOURCES** (module): operator, controller, cmm, sensor, system, import, erp, simulation, other — **matches schema (9 values)**.

Now let me check the rest of the schema (the full OutcomeEvent shape, required fields, and whether there's a refine/superRefine the producer must satisfy), and the dedup candidates.

### Assistant | 2026-06-19T20:14:00.351Z

[tool_use: Bash]

### User | 2026-06-19T20:14:06.378Z

[tool_result]     part_number: z.string().optional().describe("Part number from CAD/PO"),
    program: z.string().optional().describe("NC program filename or path"),
    machine_id: z.string().optional().describe("Machine identifier from shop config"),
    material: z.string().optional().describe("Material code (ISO group or specific alloy)"),
    tool_id: z.string().optional().describe("Tool identifier from to
... [+6149 chars truncated]

### Assistant | 2026-06-19T20:14:11.792Z

This is critical. There's a `superRefine` enforcing "no version bleed" — v1.1.0-only kinds and context keys cannot appear under `schemaVersion: "1.0.0"`. The module hard-codes `schemaVersion: "1.0.0"`. Let me read the rest of this superRefine to get the full v1.1.0-only set and whether it would reject the producer's output.

### Assistant | 2026-06-19T20:14:12.656Z

[tool_use: Bash]

### User | 2026-06-19T20:14:18.752Z

[tool_result]       "consensus_audit_id",
    ];
    const usesV11Kind = V11_ONLY_KINDS.has(evt.kind);
    const ctxObj = (evt.context ?? {}) as Record<string, unknown>;
    const usesV11Context = V11_ONLY_CONTEXT_KEYS.some((k) => ctxObj[k] !== undefined);
    const usesV11Features = evt.numeric_features !== undefined;
    if ((usesV11Kind || usesV11Context || usesV11Features) && evt.schemaVersion === "1.0.0") 
... [+2489 chars truncated]

### Assistant | 2026-06-19T20:14:26.178Z

Now I have the full picture of the version-bleed rule. This is a **real correctness finding (P1)**:

The module hard-codes `schemaVersion: "1.0.0"` and accepts **all** kinds including the v1.1.0-only kinds `cross_process_decision` and `cross_process_stage_complete`. If a caller passes one of those kinds, `buildOutcomeEvent` will happily build an event with `schemaVersion: "1.0.0"` + a v1.1.0-only kind. That event would be **rejected by the canonical `OutcomeEventSchema.superRefine`** (version bleed). But the module never validates against that rule — it only validates enum membership + the converter learnability gate. The converter (`outcomeToAlpaca`) does NOT check schemaVersion either, so the strong-guarantee guard won't catch it. Result: the producer writes a record the canonical bus schema would reject as malformed.

Also, the module mirrors the kind enum **including** the v1.1.0-only kinds, but the enum-sync test only checks the kind set matches — it does not test the version-bleed interaction.

Let me now check the dedup candidates to address Check #1, and confirm context passthrough handling (prototype pollution, camelCase).

### Assistant | 2026-06-19T20:14:27.131Z

[tool_use: Read]

### User | 2026-06-19T20:14:27.970Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\galaxy-lora-emit.mjs' was already read 8m ago in this session and is unchanged (mtime 1781140054070). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-19T20:14:29.646Z

[tool_use: Bash]

### User | 2026-06-19T20:14:35.392Z

[tool_result] #!/usr/bin/env node
/**
 * build-outcomes-lora-dataset.mjs -- producer: outcome-bus events -> Alpaca LoRA dataset
 * (U-OUTCOME-LORA-WIRE, slot:india 2026-06-11).
 *
 * Reads every state/outcomes/<domain>.jsonl, converts the learnable events to Alpaca
 * {instruction, output} pairs via scripts/lib/outcome-to-alpaca-converter.mjs, dedups
 * across all domains, and writes state/shared/lora/outcomes-
... [+5599 chars truncated]

### Assistant | 2026-06-19T20:14:42.677Z

Two important findings emerge from `OutcomeCaptureBusEngine`:

1. **DEDUP-relevant**: `OutcomeCaptureBusEngine` is the **canonical producer** — it has `RecordOutcomeInput`, `pickSchemaVersion()` (auto-stamps 1.0.0 or 1.1.0 based on fields), zod-validates, and appends via O_APPEND to `state/outcomes/<domain>.jsonl`. The new module re-implements the append logic and a hand-mirrored enum-validation **instead of calling the engine**. Let me examine this overlap and `pickSchemaVersion` more closely.

2. **Critical**: `OutcomeCaptureBusEngine` uses `pickSchemaVersion(input)` to set the version, and notes "Common path (<64 KB line)" for the atomic-append guarantee — meaning a >64KB line is NOT atomic. The new module always stamps `"1.0.0"` hard-coded and uses plain `appendFileSync` without the 64KB consideration or the EPERM/EBUSY retry that the engine has.

Let me read the engine's record path, pickSchemaVersion, and the 64KB/retry handling, plus the galaxy-lora-emit module (which I don't have in context).

### Assistant | 2026-06-19T20:14:43.868Z

[tool_use: Bash]

### User | 2026-06-19T20:14:50.238Z

[tool_result] export interface RecordOutcomeInput {
  domain: OutcomeDomainT;
  kind: OutcomeKindT;
  source: OutcomeSourceT;
  lineage_id?: string;
  event_id?: string;
  severity?: OutcomeSeverityT;
  agent_id?: string;
  timestamp?: string;                 // override only for import/backfill
  context?: Record<string, unknown>;
  recommended?: unknown;
  actual?: unknown;
  delta?: unknown;
  confidence?: n
... [+5349 chars truncated]

### Assistant | 2026-06-19T20:14:55.921Z

This confirms the dedup picture. The canonical `OutcomeCaptureBusEngine.record()`:
- auto-stamps schemaVersion via `pickSchemaVersion` (correct version-bleed handling)
- runs `OutcomeEventSchema.safeParse` (the authoritative validator including the superRefine)
- has the `PRISM_OUTCOME_CAPTURE_DISABLE` knob
- has EPERM/EBUSY retry + 64KB awareness

Let me read the rest of the engine's write path (64KB handling, retry) and the galaxy-lora-emit module for full comparison.

### Assistant | 2026-06-19T20:14:57.649Z

[tool_use: Bash]

### User | 2026-06-19T20:15:02.937Z

[tool_result]       line = JSON.stringify(ev) + "\n";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        event_id,
        lineage_id,
        path: "",
        bytes: 0,
        warning: `serialization failed (non-JSON-safe payload, e.g. circular): ${message}`,
      };
    }
    const bytes = Buffer.byteLength(line, "utf8");
  
... [+5402 chars truncated]

### Assistant | 2026-06-19T20:15:18.042Z

I now have enough to assess dedup definitively. The findings are clear. Let me confirm the "unreachable-after-return" linter claim (Check #3) and the MAX_LINE_BYTES value, plus verify there's no ascii issue (the comment uses `->` and `>=` ASCII, and `Ψ`-style chars only in CLAUDE.md, not the module). Let me grep for non-ASCII in the two new files and check the converter's INPUT_KEYS ordering for the documented line 27.

### Assistant | 2026-06-19T20:15:21.049Z

[tool_use: Bash]

### User | 2026-06-19T20:15:25.662Z

[tool_result] === non-ASCII in module ===
grep: -P supports only unibyte and UTF-8 locales
NONE (clean ASCII)
=== MAX_LINE_BYTES in engine ===
79:const MAX_LINE_BYTES = 64 * 1024;          // 64 KB per event line cap
248:    if (bytes > MAX_LINE_BYTES) {
255:        warning: `event exceeds ${MAX_LINE_BYTES} bytes`,
398:   * event line is < {@link MAX_LINE_BYTES} (64 KB), which is at or below the
416:   * given 
... [+352 chars truncated]

### Assistant | 2026-06-19T20:15:29.075Z

The `-P` grep flag failed on locale; let me retry the non-ASCII check with a reliable method.

### Assistant | 2026-06-19T20:15:30.595Z

[tool_use: Bash]

### User | 2026-06-19T20:15:35.491Z

[tool_result] CLEAN: pure ASCII (no smart-quotes/em-dashes/non-ascii)

### Assistant | 2026-06-19T20:15:44.510Z

Both new files are pure ASCII. Now let me verify the unreachable-code claim (Check #3). Re-examining `buildOutcomeEvent`: every `if` branch either throws or assigns; there's no early `return` before the final `return event`. The only `return` statements are the final `return event` and the guards inside `hasDeterminingInput`. Let me confirm there is no statement after a `return` anywhere in the module by checking the structure precisely.

### Assistant | 2026-06-19T20:15:45.602Z

[tool_use: Bash]

### User | 2026-06-19T20:15:49.589Z

[tool_result] 73:  if (!context || typeof context !== "object") return false;
74:  return DETERMINING_INPUT_KEYS.some((k) => typeof context[k] === "string" && context[k].trim() !== "");
75:}
100: * @returns {object} the OutcomeEvent
103:  if (!o || typeof o !== "object") throw new TypeError("buildOutcomeEvent: opts object required");
108:  if (!OUTCOME_DOMAINS.has(domain)) throw new RangeError(`buildOutcomeEven
... [+1163 chars truncated]

### Assistant | 2026-06-19T20:15:55.918Z

Confirmed — **Check #3 is a FALSE POSITIVE**. No statement follows any `return`. In `buildOutcomeEvent`, every `if` guard throws (never returns early), and the only `return event` is the last statement (line 158). In `emitOutcomeActual`, the `try` returns at 175 and the `catch` returns at 177 — both terminal, no unreachable code. In `hasDeterminingInput`, line 73 `return false` is conditional, line 74 is the fallthrough return. The linter's "unreachable-after-return" is incorrect.

Now I have everything. Let me do final verification of the converter's `>64KB` concern interaction and the prototype-pollution surface (`context: { ...context }` spread vs `__proto__`). Let me verify how the spread handles a `__proto__` key, which matters for ledger corruption.

### Assistant | 2026-06-19T20:16:03.069Z

[tool_use: Bash]

### User | 2026-06-19T20:16:07.059Z

[tool_result] spread+stringify of __proto__ context line: {"context":{"material":"4140","__proto__":{"polluted":true}}}
Object.prototype.polluted after: undefined
JSON of {x:Infinity}: {"x":null,"y":null}
CRLF-in-string line: "{\"context\":{\"material\":\"41\\n40\\r\\nX\"}}"
contains raw LF? false

### Assistant | 2026-06-19T20:16:57.544Z

Now I have empirical confirmation of the edge cases (Check #5):

- **Prototype pollution**: A `__proto__` key from `JSON.parse` is an own-enumerable property (not the proto), so the spread copies it and `JSON.stringify` writes it literally — `Object.prototype` is NOT polluted (runtime safe). But the literal `"__proto__":{...}` lands in the JSONL. When a downstream consumer does `JSON.parse` on that line, the converter's `flattenScalars` walks `Object.keys(o)` including `__proto__` — runtime-safe, just noise. No corruption. Acceptable (P2 at most).
- **Non-finite numbers**: `JSON.stringify({x: Infinity, y: NaN})` → `{"x":null,"y":null}`. So a non-finite value in `actual` is **silently converted to `null`** in the JSONL. The converter's `flattenScalars` treats `null`/`undefined` as skip (`o === null ... return`), so a `{cycle_time: Infinity}` actual could become `{cycle_time: null}` → dropped leaf. If it was the ONLY leaf, the converter would yield no output → but the strong-guarantee guard runs `outcomeToAlpaca` on the **in-memory event** (with `Infinity` still present, before JSON round-trip), and `flattenScalars` accepts `Infinity` as `typeof === "number"`. So the guard PASSES (sees a scalar) but the WRITTEN line has `null` → silent divergence between "what the guard validated" and "what got written". This is a real **P1**: the guarantee "emitted means produces a training pair" can be violated for non-finite leaves.
- **CRLF**: `JSON.stringify` escapes `\n`/`\r` to `\\n`/`\\r` — no raw newline leaks into the JSONL line. **Safe.**
- **>64KB lines**: The module does NOT cap line size; the canonical engine rejects `> MAX_LINE_BYTES (64KB)` because O_APPEND atomicity only holds below that. A >64KB event from this producer can interleave/tear under concurrent fleet writers — **the exact corruption the engine guards against, missing here.** P1.

I have all findings verified. Here is my review.

---

## REVIEW: scripts/lib/outcome-actual-emit.{mjs,test.mjs}

**Verified en
... [+6708 chars truncated]
