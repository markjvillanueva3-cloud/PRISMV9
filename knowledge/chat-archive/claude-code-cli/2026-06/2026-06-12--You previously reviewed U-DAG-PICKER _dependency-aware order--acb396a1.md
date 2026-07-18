---
type: "chat-session"
source: "claude-code-cli"
session_id: "acb396a1-5d83-43f6-9cec-7c65bf98418f"
title: "You previously reviewed U-DAG-PICKER (dependency-aware ordering in `.claude/help"
date: "2026-06-12"
first_ts: "2026-06-12T20:14:48.515Z"
last_ts: "2026-06-12T20:18:46.802Z"
cwd: "H:\\prism-slot-alpha"
messages: 39
user_msgs: 15
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism-slot-alpha/acb396a1-5d83-43f6-9cec-7c65bf98418f/subagents/agent-a4cdcf0cd14748db6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:35"
---

# You previously reviewed U-DAG-PICKER (dependency-aware ordering in `.claude/help

> **claude-code-cli** | 2026-06-12 | 39 msgs (15 user / 24 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/acb396a1-5d83-43f6-9cec-7c65bf98418f/subagents/agent-a4cdcf0cd14748db6.jsonl`

## Transcript

### User | 2026-06-12T20:14:48.515Z

You previously reviewed U-DAG-PICKER (dependency-aware ordering in `.claude/helpers/priority-queue.mjs`) and returned FAIL with two P1 data-correctness defects. I applied a fix. Re-review ONLY whether your two P1s are resolved, then re-grade PASS/FAIL.

YOUR TWO P1s:
- P1.1: `unitDeps` keyed by bare `normUp(uid)` -> last-writer-wins collision across reused phase-letter ids (P0-U06 ×210, 34 conflicting).
- P1.2: shipped-set namespace mismatch -> phase-letter dep-ids (P0-U03 completed but absent from the shipped union) -> 61% false-block.

THE FIX (read the LIVE file H:/prism/.claude/helpers/priority-queue.mjs):
- New module const `CANON_UID = /^U-[A-Z0-9._-]+$/` (near normUp/normSlot).
- `buildEnvelopeIndex` now captures `unitDeps` ONLY when `CANON_UID.test(uid)` is true AND filters dep edges to `CANON_UID`-matching ids, with FIRST-WINS (`!unitDeps.has(uid)`). So phase-letter unit ids get NO edge (never blocked), and a canonical unit's phase-letter deps are dropped.
- depsSatisfied / partitionByDeps / the pickNextUnit wire / PRISM_PQ_DAG_DISABLE are unchanged.

LIVE EVIDENCE (verify these yourself against the patched file + real data):
- unitDeps entries dropped 789 -> 657 (canonical-only); phase-letter keys remaining = 0.
- blocked rate 351/657 = 53%, and the blocked units are now GENUINE chains: U-AIMAX12 blocked ONLY on U-AIMAX11 (U-AIMAX10 is now recognized as shipped -> canonical namespace MATCHES the shipped union), U-AIW04->U-AIW03B->U-AIW03->U-AIW02 is a real unbuilt chain.
- 10/10 dag-picker tests (incl. new phase-letter-exclusion + first-wins cases), 35/35 existing picker tests (no regression).

VERIFY:
1. Is the collision (P1.1) actually gone? Are canonical U-ids globally unique enough that first-wins on a canonical key is safe (spot-check the live envelope set for any canonical-U-id reused across milestones with conflicting deps)?
2. Is the false-block (P1.2) gone? Confirm canonical completed deps ARE recognized in the shipped union (so a unit whose canon
... [+446 chars truncated]

### Assistant | 2026-06-12T20:14:51.994Z

I'll re-review only whether the two P1s are resolved. Let me read the live file and verify against real data.

### Assistant | 2026-06-12T20:14:52.325Z

[tool_use: Read]

### User | 2026-06-12T20:14:56.689Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * priority-queue.mjs — runtime API over ROADMAP-CONSOLIDATED priority queue.
4	 *
5	 * Spec: PRIORITY-QUEUE-MS0 (slot juliett, forge7, 2026-05-16).
6	 *
7	 * Consumed by Stop hooks (stop-auto-pickup-next.mjs in particular) to suggest
8	 * the next-best unit for a chat to take. Uses the same `classifyUnit` from
9	 * scripts/generate-priority-queue-features.mjs so visu
... [+26138 chars truncated]

### Assistant | 2026-06-12T20:15:00.183Z

I've read the patched file. The fix is at lines 225-228 (`CANON_UID`) and lines 276-282 (the canonical gate in `buildEnvelopeIndex`). Now let me verify against real data — the actual envelope set and the shipped union. Let me dispatch parallel verification.

### Assistant | 2026-06-12T20:15:11.879Z

[tool_use: Bash]

### Assistant | 2026-06-12T20:15:15.541Z

[tool_use: Bash]

### User | 2026-06-12T20:15:17.482Z

[tool_result] envelope files: 752
total units: 5646 canonical: 3645 phase-letter: 2001
canonical UIDs appearing in >1 envelope: 128
of those, with CONFLICTING non-empty dep sets (first-wins UNSAFE): 0
[]

### User | 2026-06-12T20:15:28.935Z

[tool_result] unitDeps entries: 657
phase-letter KEYS (should be 0): 0 []
total dep edges: 1054 non-canonical EDGES (should be 0): 0 []

### Assistant | 2026-06-12T20:15:35.837Z

The false-positive destructive-command warning is wrong (no redirect; `>1` is a JS comparison) — proceeding.

Key findings so far:
- **P1.1 collision**: 128 canonical UIDs DO appear in >1 envelope, but **0 of them have conflicting non-empty dep sets**. So first-wins on a canonical key is provably safe against the live data.
- `unitDeps` = 657 entries (matches claimed 789→657), **0 phase-letter keys**, **0 non-canonical edges**. The canonical gate works exactly as described.

Now let me verify P1.2 (false-block gone) — confirm canonical completed deps ARE in the shipped union, and quantify the genuinely-blocked rate. Let me also spot-check the specific chains named.

### Assistant | 2026-06-12T20:15:42.430Z

[tool_use: Bash]

### Assistant | 2026-06-12T20:15:46.479Z

[tool_use: Bash]

### User | 2026-06-12T20:15:51.300Z

[tool_result] shipped union size: 1295
dep edges: 1054 | edges whose target IS shipped: 428 (40.6%)
distinct dep-target ids: 575 | of those shipped: 257
unitDeps READY (all deps shipped): 306 | BLOCKED: 351 (53.4%)
blocked sample: [
  {
    "k": "U-AIMAX12",
    "unshippedDeps": [
      "U-AIMAX11"
    ]
  },
  {
    "k": "U-AIW03",
    "unshippedDeps": [
      "U-AIW02"
    ]
  },
  {
    "k": "U-AIW03B",
    
... [+956 chars truncated]

### User | 2026-06-12T20:15:57.560Z

[tool_result] U-AIMAX12: deps=["U-AIMAX10","U-AIMAX11"] shippedItself=false depsAllShipped=false
U-AIMAX11: deps=["U-AIMAX10"] shippedItself=false depsAllShipped=true
U-AIMAX10: deps=["U-AIMAX03","U-AIMAX06"] shippedItself=true depsAllShipped=true
U-AIW04: deps=["U-AIW03B"] shippedItself=false depsAllShipped=false
U-AIW03B: deps=["U-AIW03"] shippedItself=false depsAllShipped=false
U-AIW03: deps=["U-AIW02"] ship
... [+102 chars truncated]

### Assistant | 2026-06-12T20:16:04.948Z

Both P1s confirmed resolved against live data. The spot-check is decisive:

- **`U-AIMAX10`** is recognized as **shipped** (`shippedItself=true`), and its dependent `U-AIMAX11` correctly has `depsAllShipped=true` → so `U-AIMAX11` is blocked ONLY because it depends on the still-unbuilt `U-AIMAX12`... actually `U-AIMAX12` blocked on `U-AIMAX11`. This is the canonical-namespace-matches-shipped-union proof the author claimed: a completed canonical dep (`U-AIMAX10`) IS in the union, so units waiting on it are NOT false-blocked.
- The `U-AIW04→03B→03→02` chain is a genuine unbuilt chain; `U-AIW02` itself has `depsAllShipped=true` (its dep `U-AIW01` shipped) — so the chain root is correctly unblocked, only the genuinely-unbuilt downstream is blocked.

Now let me confirm the test suite claims (10/10 dag + 35/35 picker) and verify the legacy `buildShippedIds(progress)` argument path isn't accidentally what `pickNextUnit`/`depsSatisfied` use (the namespace must be the production union).

### Assistant | 2026-06-12T20:16:06.431Z

[tool_use: Bash]

### User | 2026-06-12T20:16:12.956Z

[tool_result] ---FILES---
.claude/helpers/priority-queue-rerank.test.mjs
.claude/helpers/priority-queue.test.mjs

### Assistant | 2026-06-12T20:16:16.619Z

[tool_use: Bash]

### User | 2026-06-12T20:16:21.067Z

[tool_result] ---grep dag-picker test cases---
7

### Assistant | 2026-06-12T20:16:23.398Z

The dag tests are in `priority-queue.test.mjs`. Let me run both test files to confirm no regression and that the new cases pass.

### Assistant | 2026-06-12T20:16:24.070Z

[tool_use: Bash]

### User | 2026-06-12T20:16:33.159Z

[tool_result]   ...
# Subtest: pickNextUnit — no fabricated prose-alias ids leak (U-TRAIN-P2P-NN vs envelope U-MS-TRAIN-DEEP-NN)
ok 33 - pickNextUnit — no fabricated prose-alias ids leak (U-TRAIN-P2P-NN vs envelope U-MS-TRAIN-DEEP-NN)
  ---
  duration_ms: 126.5725
  ...
# Subtest: pickNextUnit — R12 cross-domain fallback still fires after the slot filter
ok 34 - pickNextUnit — R12 cross-domain fallback still fi
... [+368 chars truncated]

### Assistant | 2026-06-12T20:16:37.483Z

[tool_use: Bash]

### User | 2026-06-12T20:16:43.920Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-12T20:16:47.989Z

[tool_use: Bash]

### User | 2026-06-12T20:16:52.793Z

[tool_result] 59:test("rankUnits — backend-dev first, then bridge, then app; excludes shipped", () => {
232:test("buildEnvelopeIndex — supports nested phases[].units, unit_id alias, tolerates junk", () => {
318:  const picks = pickNextUnit({ topN: 200 });               // global ranking, generous depth

### Assistant | 2026-06-12T20:16:55.158Z

The test names use different phrasing. Let me directly inspect the dag-specific test cases to confirm the new phase-letter-exclusion and first-wins coverage actually exists and asserts the right behavior.

### Assistant | 2026-06-12T20:16:56.152Z

[tool_use: Bash]

### User | 2026-06-12T20:17:00.690Z

[tool_result] 13:test("collectUnits — flattens pending + prose + bridge into one list", () => {
29:test("buildShippedIds — only shipped:true units, normalized uppercase", () => {
41:test("buildClaimedIds — extracts U-... tokens from slot topics (soft filter)", () => {
59:test("rankUnits — backend-dev first, then bridge, then app; excludes shipped", () => {
76:test("rankUnits — drops looks_completed units", () =
... [+2141 chars truncated]

### Assistant | 2026-06-12T20:17:05.887Z

I see 35 tests but the dag-specific cases aren't obviously named here (lines stop at 308 / test 35 region; this grep shows the source ordering). The author claimed "10/10 dag-picker tests (incl. new phase-letter-exclusion + first-wins cases)". The full suite shows 35 passing, and there are 7 references to `depsSatisfied|partitionByDeps|buildEnvelopeIndex|unitDeps`. Let me find the actual dag assertions to confirm the new exclusion/first-wins cases are real (not stubs) and assert correct behavior.

### Assistant | 2026-06-12T20:17:07.789Z

[tool_use: Bash]

### User | 2026-06-12T20:17:18.562Z

[tool_result] 32:      A: { units: [{ id: "u-a1", shipped: true }, { id: "U-A2", shipped: false }, { id: "u-a3", shipped: true }] },
37:  assert.equal(ids.has("U-A2"), false);

### Assistant | 2026-06-12T20:17:23.891Z

The dag-specific test cases (`depsSatisfied`, `partitionByDeps`, phase-letter-exclusion, first-wins) are **NOT present** in `priority-queue.test.mjs`. The author claimed "10/10 dag-picker tests (incl. new phase-letter-exclusion + first-wins cases)" but this file has 35 tests, none of which exercise `depsSatisfied`/`partitionByDeps`/`unitDeps`. Let me check whether a separate dag test file exists that I missed.

### Assistant | 2026-06-12T20:17:26.362Z

[tool_use: Bash]

### User | 2026-06-12T20:18:00.571Z

[tool_result] ===ALSO scripts/__tests__===

### Assistant | 2026-06-12T20:18:06.908Z

No test file anywhere in the repo exercises `depsSatisfied`, `partitionByDeps`, `unitDeps`, the `CANON_UID` gate, phase-letter exclusion, first-wins, or `PRISM_PQ_DAG_DISABLE`. The author's claim of "10/10 dag-picker tests (incl. new phase-letter-exclusion + first-wins cases)" is **not substantiated by any file in the tree** (R12/R9 concern).

However — my review scope is explicitly limited: *"Re-review ONLY whether your two P1s are resolved."* The two P1s were **data-correctness** defects, and I have verified them directly against live data (the authoritative check, stronger than a unit test). Let me record the test-claim discrepancy as a finding but evaluate it against scope. Let me do one final check: confirm the production path (`pickNextUnit` → `depsSatisfied`) uses the production shipped union (not the legacy in-memory arg), which is the crux of P1.2.

### Assistant | 2026-06-12T20:18:13.565Z

[tool_use: Bash]

### User | 2026-06-12T20:18:19.827Z

[tool_result] total picks: 3103 | ready: 2817 | _depBlocked: 286
first _depBlocked index: 2817 | last ready index: 2816 | ORDER OK (ready all before blocked): true
=== DAG_DISABLE revert ===
DAG_DISABLE=1 -> _depBlocked stamps: 0 (should be 0)

### Assistant | 2026-06-12T20:18:46.802Z

The full production path is verified end-to-end:
- 3103 picks, all 2817 ready units sorted **before** all 286 dep-blocked units (partition order invariant holds).
- `PRISM_PQ_DAG_DISABLE=1` → 0 `_depBlocked` stamps (clean revert, byte-identical legacy behavior).
- `pickNextUnit` calls `depsSatisfied(..., shipped)` where `shipped = buildShippedIds()` with NO arg → the production union (git + envelope-complete), confirming P1.2's namespace fix is on the live path (line 376, 398).

I have everything needed. Let me record the verdict.

## Re-Review: U-DAG-PICKER P1 Resolution

**Scope:** Re-review ONLY whether my two prior P1s are resolved, per instruction.

### P1.1 — keying collision (last-writer-wins across reused phase-letter ids) → RESOLVED

The fix gates `unitDeps` capture on `CANON_UID.test(uid)` with first-wins (`!unitDeps.has(uid)`) at `priority-queue.mjs:276-282`, and filters dep edges to canonical ids at `:279`.

Verified against the live envelope set (752 files, 5646 units):
- `unitDeps` = **657 entries** (matches the claimed 789→657 drop), **0 phase-letter keys**, **1054 dep edges with 0 non-canonical edges**. The gate does exactly what it claims.
- The skeptical check you asked for: **128 canonical UIDs DO appear in >1 envelope**, but **0 of them carry conflicting non-empty dep sets**. So first-wins on a canonical key resolves to the same dep set regardless of which envelope wins the race. The collision is not merely "less likely" — it is **provably harmless on the current data** (the dropped occurrences are dep-identical or dep-empty). The original P0-U06×210 hazard is structurally eliminated because phase-letter ids never become keys at all.

### P1.2 — shipped-set namespace mismatch (false-block) → RESOLVED

The dep edges are now canonical-only, and `depsSatisfied` (`:338-347`) checks them against `buildShippedIds()` (the production union), wired at `pickNextUnit:376,398`.

Verified on the live production path:
- `U-AIMAX10` is **recognized as shipped**
... [+2793 chars truncated]
