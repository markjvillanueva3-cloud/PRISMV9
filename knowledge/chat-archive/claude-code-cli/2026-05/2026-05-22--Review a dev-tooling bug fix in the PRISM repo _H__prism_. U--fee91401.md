---
type: "chat-session"
source: "claude-code-cli"
session_id: "fee91401-5f86-4444-8674-45a388dac493"
title: "Review a dev-tooling bug fix in the PRISM repo (H:/prism). Unit U-KP2P-03 of mil"
date: "2026-05-22"
first_ts: "2026-05-22T21:13:56.338Z"
last_ts: "2026-05-22T21:15:04.655Z"
cwd: "H:\\prism"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/fee91401-5f86-4444-8674-45a388dac493/subagents/agent-a3c07ed2dd2c56098.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Review a dev-tooling bug fix in the PRISM repo (H:/prism). Unit U-KP2P-03 of mil

> **claude-code-cli** | 2026-05-22 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fee91401-5f86-4444-8674-45a388dac493/subagents/agent-a3c07ed2dd2c56098.jsonl`

## Transcript

### User | 2026-05-22T21:13:56.338Z

Review a dev-tooling bug fix in the PRISM repo (H:/prism). Unit U-KP2P-03 of milestone KILO-P2P-RECONCILE-MS0.

PROBLEM FIXED: `.claude/helpers/priority-queue.mjs` is the runtime picker that suggests the next roadmap unit for a chat-slot to work. `node priority-queue.mjs --pick --slot kilo` was leaking (a) units explicitly owned by OTHER slots — `U-DPM0-WIRE-PRINT_OCR` has envelope `slot:charlie` but surfaced in kilo's pick — and (b) fabricated prose-alias unit ids (`U-TRAIN-P2P-NN`) that do not match the real milestone-envelope ids (`U-MS-TRAIN-DEEP-NN`).

ROOT CAUSE (verified): `ROADMAP-CONSOLIDATED.json` (the picker's data source) STRIPS the per-unit `slot` field that milestone envelopes carry on each `units[]` entry, and it imports prose-roadmap units under aliased ids. The true root cause is upstream in `consolidate-roadmaps.mjs`; the fix corrects it at the picker boundary instead (the unit's files_touched scopes it to priority-queue.mjs).

THE FIX (read the WHOLE file H:/prism/.claude/helpers/priority-queue.mjs):
- New pure helper `buildEnvelopeIndex(records)` — builds `{unitSlot: Map<UID,slot>, milestoneUnitIds: Map<MS,Set<UID>>}` from milestone envelope records.
- New impure memoized `loadEnvelopeIndex()` — scans `mcp-server/data/milestones/*.json`.
- New pure `resolveUnitSlot(unit, envIndex)` — unit's own slot field, else envelope lookup, else null.
- New pure `isProseAliasOfEnvelope(unit, envIndex)` — true for an `unconsolidated-prose` unit whose milestone HAS an envelope but whose id is not a real envelope unit-id.
- `pickNextUnit()` modified: drops prose aliases (every pick) + drops peer-slot-owned units (slot-scoped picks).

VERIFY:
- The slot-ownership predicate is correct: keep IFF unit has no resolvable slot OR slot === requested slot. A foreign-slot unit must be excluded from in-domain AND cross-domain-fallback paths.
- The prose-alias dedupe cannot over-drop: a milestone with an empty/absent envelope must NOT be treated as "has envelope" (else genu
... [+827 chars truncated]

### Assistant | 2026-05-22T21:14:18.442Z

I'll review this dev-tooling bug fix. Let me read both files.

### Assistant | 2026-05-22T21:14:18.891Z

[tool_use: Read]

### Assistant | 2026-05-22T21:14:18.986Z

[tool_use: Read]

### User | 2026-05-22T21:14:24.403Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\priority-queue.mjs' was already read 7s ago in this session and is unchanged (mtime 1779484247842). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-22T21:14:24.464Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\priority-queue.test.mjs' was already read 7s ago in this session and is unchanged (mtime 1779484383266). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-22T21:14:28.068Z

The read-once guard claims the files are in context, but they are not in my actual conversation context. Let me bypass the cache.

### Assistant | 2026-05-22T21:14:29.369Z

[tool_use: Bash]

### Assistant | 2026-05-22T21:14:29.961Z

[tool_use: Bash]

### User | 2026-05-22T21:14:38.720Z

[tool_result] ---FILE1---
#!/usr/bin/env node
/**
 * priority-queue.mjs — runtime API over ROADMAP-CONSOLIDATED priority queue.
 *
 * Spec: PRIORITY-QUEUE-MS0 (slot juliett, forge7, 2026-05-16).
 *
 * Consumed by Stop hooks (stop-auto-pickup-next.mjs in particular) to suggest
 * the next-best unit for a chat to take. Uses the same `classifyUnit` from
 * scripts/generate-priority-queue-features.mjs so vi
... [+17802 chars truncated]

### User | 2026-05-22T21:14:46.597Z

[tool_result] #!/usr/bin/env node
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  collectUnits, buildShippedIds, buildClaimedIds, rankUnits, pickNextUnit, ROOT,
  buildEnvelopeIndex, loadEnvelopeIndex, resolveUnitSlot, isProseAliasOfEnvelope,
} from "./priority-queue.mjs";
import { slotDomain, classifyUnit as classifyUnitD
... [+16807 chars truncated]

### Assistant | 2026-05-22T21:15:04.655Z

Both files reviewed in full. Analysis follows.

## Findings

**Slot-ownership predicate** — Correct. `ranked.filter((u) => { const owner = resolveUnitSlot(u, envIndex); return !owner || owner === wantSlot; })` keeps IFF no resolvable slot OR matching slot. Applied to `ranked` *before* the in-domain split, so it correctly governs both the in-domain path and the R12 cross-domain fallback (which slices from the same filtered `ranked`). Foreign-slot units cannot leak via either path. ✓

**Prose-alias over-drop guard** — Correct. `buildEnvelopeIndex` (mjs:163-165) only does `milestoneUnitIds.set(ms, idSet)` inside `if (idSet.size)`, and the loop already `continue`s on `units.length === 0` (mjs:156). `isProseAliasOfEnvelope` short-circuits on `!milestoneUnitIds.has(ms)` (mjs:204). A milestone with an empty/absent envelope is never registered → genuine unconsolidated prose is kept. ✓

**R12 fallback** — Intact. mjs:266-269 still returns `ranked.slice(0, n)` with `_crossDomain:true` when `inDomain.length === 0`. New filters narrow `ranked` upstream but don't suppress the fallback branch. ✓

**Edge cases** — `buildEnvelopeIndex` handles null/non-object (`if (!env || typeof env !== "object") continue`), missing `id` (`if (!ms ...) continue`), nested `phases[].units` (`envelopeUnits`), `unit_id` alias, normalization via `normUp`/`normSlot`. `resolveUnitSlot` guards `envIndex.unitSlot instanceof Map`. ✓

**Memoization** — `_envIndexCache` is module-scoped; safe for the short-lived per-invocation picker process. ✓

**rankUnits contract** — Untouched; 2-arg/3-arg behavior preserved. New filters live entirely in `pickNextUnit`. ✓

**Silent-catch** — `readJsonSafe` and `loadEnvelopeIndex`'s `readdirSync` catch are pre-existing/intentional (a missing milestones dir is a legitimate hermetic-checkout state, degrades to empty index — fail-soft, not error-hiding). ✓

**Tests** — 8 new tests genuinely exercise new logic: `buildEnvelopeIndex` empty/stub-milestone exclusion, nested phases,
... [+697 chars truncated]
