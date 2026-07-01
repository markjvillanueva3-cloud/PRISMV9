---
type: "chat-session"
source: "claude-code-cli"
session_id: "4f9091a6-8bca-47ed-922c-3b04ad3f75e5"
title: "Review ONLY the delta added to H:/prism/scripts/extract-domain-pipeline-units.mj"
date: "2026-05-18"
first_ts: "2026-05-18T00:37:57.901Z"
last_ts: "2026-05-18T00:39:12.680Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/4f9091a6-8bca-47ed-922c-3b04ad3f75e5/subagents/agent-a21ce1286839a2149.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Review ONLY the delta added to H:/prism/scripts/extract-domain-pipeline-units.mj

> **claude-code-cli** | 2026-05-18 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4f9091a6-8bca-47ed-922c-3b04ad3f75e5/subagents/agent-a21ce1286839a2149.jsonl`

## Transcript

### User | 2026-05-18T00:37:57.901Z

Review ONLY the delta added to H:/prism/scripts/extract-domain-pipeline-units.mjs + .test.mjs since the prior PASS. The prior version was already 2-reviewer-PASSed; this delta adds:

1. **Carry-forward block** in buildMilestone: after building cellUnits, it iterates the `existing` Map and carries forward any unit whose id is NOT a generated cell id AND whose status !== "not_started" (meta/bootstrap units like the extractor's own U-DPM0-CELL-EXTRACT). Result array is `[...carried, ...cellUnits]`.
2. New milestone fields: `cell_units` (cellUnits.length), `carried_units` (carried.length).
3. R12 invariant changed from `milestone.total_units !== 62` to `milestone.cell_units !== 62` (so carried meta-units don't false-trip the drift WARN).
4. Live-config test assertion changed `m.total_units`→`m.cell_units`.
5. Two new tests: "carries forward shipped non-cell" + "does NOT carry forward a not_started non-cell unit".

38/38 node:test PASS. The DOMAIN-PIPELINE-MS0.json envelope was hand-seeded with U-DPM0-CELL-EXTRACT (status:completed) so the carry-forward + shipped-units-source-of-truth pick it up (verified: shipped union hasUDPM0CELL=true, slot-queue advances).

Check ONLY for regressions in THIS delta:
- Does the carry-forward correctly NOT duplicate a unit that is both in `existing` and a generated cell? (cellIds Set check)
- Could a malicious/garbage `existing` entry (null, no status, array) crash the carry loop?
- Does `{...eu, source: eu.source ?? "carried-forward"}` lose any field the slot-queue reader needs?
- Is the invariant change sound — can cell_units legitimately differ from 62 in a way that should still WARN?
- Determinism preserved (carried-then-cells ordering stable)?

Return PASS/FAIL + any P0/P1 (file:line + fix), under 350 words.

### Assistant | 2026-05-18T00:38:06.765Z

I'll review the delta in these two files.

### Assistant | 2026-05-18T00:38:07.715Z

[tool_use: Bash]

### User | 2026-05-18T00:38:15.036Z

[tool_result] scripts/extract-domain-pipeline-units.mjs      | 27 ++++++++++++++++++----
 scripts/extract-domain-pipeline-units.test.mjs | 32 ++++++++++++++++++++++++--
 2 files changed, 53 insertions(+), 6 deletions(-)

--- Changes ---

scripts/extract-domain-pipeline-units.mjs
  @@ -200,10 +200,25 @@ export function buildMilestone(config, opts = {}) {
  -  const units = cells.map((c) => {
  +  const cellUnits
... [+4446 chars truncated]

### Assistant | 2026-05-18T00:38:19.487Z

Delta is small and well-contained. Verifying the carry-loop guards and the `existing` Map source.

### Assistant | 2026-05-18T00:38:20.736Z

[tool_use: Bash]

### User | 2026-05-18T00:38:33.345Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
27 matches in 8 files:

119:0:"build missing stage";
131:0:cell.status === "partial" ? "S" : "M",
140:0:cell.status,
143:0:"domain-pipeline-config",
209:0:preserve any pre-existing unit that is NOT a generated
218:0:eu.source ?? "carried-forward" });
326:0:new Map();
scripts/extract-domain-pipeline-uni
... [+2138 chars truncated]

### Assistant | 2026-05-18T00:38:38.006Z

[tool_use: Bash]

### User | 2026-05-18T00:38:49.939Z

[tool_result] /**
 * loadExistingMilestone(outPath, readImpl?) → Map<unit_id, existingUnit>
 * Returns empty map if file missing or unparseable.
 * Used for idempotent re-run (close-out safety).
 */
export function loadExistingMilestone(outPath, readImpl = fs.readFileSync, existsImpl = fs.existsSync) {
  const m = new Map();
  if (!existsImpl(outPath)) return m;
  try {
    const raw = readImpl(outPath, "utf8")
... [+1999 chars truncated]

### Assistant | 2026-05-18T00:39:12.680Z

I have everything needed. Reviewing against the five regression checks.

**1. Duplicate suppression (cellIds Set).** `cellIds` is built from `cellUnits.map(u => u.id)`. The carry loop keys on `eid` (the `existing` Map key, set in `loadExistingMilestone` as `u.unit_id ?? u.id`). `cellToUnit` produces units with both `id` and `unit_id`; verified at line 205 the cell `id` is `U-DPM0-<DOMAIN>-<stageId>` — identical formula to the carry loop's skip key. **Edge:** if a generated cell unit's `unit_id` differs from its `id`, and a prior envelope stored that cell keyed by `unit_id`, `cellIds` (built from `.id`) wouldn't contain it → duplicate. But `cellToUnit` sets `unit_id === id` (line 147 path preserves status only, not id), so both keys collapse. No duplication. PASS.

**2. Garbage `existing` entry crash.** `loadExistingMilestone` only `m.set(key, u)` when `key` truthy, but `u` itself can be `null`/array/primitive. Carry guard `if (!eu || !eu.status || eu.status === "not_started") continue;` — `!eu` catches null/undefined/0/""; an array `[]` is truthy with `.status===undefined` → `!eu.status` true → skipped; a string `"x"` → `.status` undefined → skipped. No throw. PASS.

**3. Field loss in spread.** `{...eu, source: eu.source ?? "carried-forward"}` shallow-copies every key the prior envelope held (`unit_id`, `id`, `status`, `slot`, `completed_at`, etc.). Slot-queue reader keys on `unit_id`/`status`/`slot` — all preserved verbatim. Only `source` is defaulted, never overwritten if present. PASS.

**4. Invariant soundness.** `cell_units` = `cellUnits.length` = `cells.length`, a pure function of config (carry-forward cannot inflate it). WARN now fires iff the *generated cell count* drifts from 62 — exactly the doctrine quantity. Carried meta-units no longer false-trip it. A legitimate config change to ≠62 still WARNs correctly. PASS.

**5. Determinism.** `[...carried, ...cellUnits]`: `cellUnits` order = `cells` order (deterministic config walk). `carried` order = `Map.entri
... [+561 chars truncated]
