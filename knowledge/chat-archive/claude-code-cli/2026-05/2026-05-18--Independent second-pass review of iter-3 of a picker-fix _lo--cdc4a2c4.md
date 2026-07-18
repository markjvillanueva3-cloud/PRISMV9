---
type: "chat-session"
source: "claude-code-cli"
session_id: "cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81"
title: "Independent second-pass review of iter-3 of a picker-fix /loop. The other review"
date: "2026-05-18"
first_ts: "2026-05-18T00:33:54.302Z"
last_ts: "2026-05-18T00:36:58.840Z"
cwd: "H:\\prism"
messages: 35
user_msgs: 13
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81/subagents/agent-a36e46e8eb30a3500.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Independent second-pass review of iter-3 of a picker-fix /loop. The other review

> **claude-code-cli** | 2026-05-18 | 35 msgs (13 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81/subagents/agent-a36e46e8eb30a3500.jsonl`

## Transcript

### User | 2026-05-18T00:33:54.302Z

Independent second-pass review of iter-3 of a picker-fix /loop. The other reviewer covers algorithmic correctness + behavior preservation. You focus on integration, hidden coupling, and doctrine compliance.

Change set:
- NEW `H:/prism/scripts/lib/domain-classifier.mjs` (slot↔domain SSOT, extracted from allocate-domains-to-slots.mjs)
- NEW `H:/prism/scripts/lib/domain-classifier.test.mjs` (16 tests pass)
- EDITED `H:/prism/scripts/allocate-domains-to-slots.mjs` (now imports the lib instead of inline rules — must be behavior-identical)
- EDITED `H:/prism/.claude/helpers/priority-queue.mjs` (`pickNextUnit({slot})` now domain-filters per JULIETT-12CHAT-ALLOCATION: echo=cam, etc.)
- EDITED `H:/prism/.claude/helpers/priority-queue.test.mjs` (5 new integration tests)

Full suite: 54/54 pass (16 domain-classifier + 26 shipped-units-source-of-truth + 12 priority-queue).

Focus on:
1. **Hidden consumers of the refactored allocator** — does anything ELSE import or depend on `allocate-domains-to-slots.mjs`'s internal `classify`/`DOMAIN_RULES`? Grep the repo. If another script copy-pasted the same DOMAIN_RULES, this refactor only fixed one of N drift sites — flag the others as follow-up.
2. **Other rolled-their-own slot↔domain maps** — grep `.claude/hooks/`, `.claude/helpers/`, `scripts/` for hardcoded `echo.*cam` / `alpha.*mill` / `SLOT_DOMAIN` / `slotDomain` patterns. The whole point of an SSOT is moot if 3 other files still hardcode it. Enumerate them.
3. **Downstream pickup consumers** — `pickNextUnit` is called by Stop hooks (e.g. stop-auto-pickup-next.mjs). Does the new `_slotDomain`/`_crossDomain` stamp break any consumer that does strict shape assertions or spreads the object into a commit/claim? Read the actual callers.
4. **slot-queue.mjs vs priority-queue.mjs divergence** — these are now TWO pickers with potentially different slot-scoping logic. slot-queue.mjs reads pre-partitioned slot-task-queues.json; priority-queue.mjs now domain-filters ROADMAP-CONSOLIDATED live
... [+1114 chars truncated]

### Assistant | 2026-05-18T00:33:58.120Z

I'll review the integration, coupling, and doctrine compliance of this change set.

### Assistant | 2026-05-18T00:33:58.480Z

[tool_use: Bash]

### User | 2026-05-18T00:34:02.963Z

[tool_result] c540630bb5 [FLEET-REAPER-MS1]/U-FR-CRASH-WATCH: detect chat-slot crashes + postmortem trail
aa21d8bbce [MAIN] [DOMAIN-PIPELINE-MS0]/U-DPM0-CELL-EXTRACT: extract 62 not-fully-built cells → roadmap units
649dfc4f78 [MAIN] [COMMAND-KERNEL-MS0]/U-CK08: command-migrate-runner.mjs per-category executor + 24 tests
9a1f26be6a [FEATURE-GAP-AUDIT-MS0]/U-GAP-CAD-COMPLETE-GEN-DEFER: triage 2914-line monolith 
... [+29 chars truncated]

### Assistant | 2026-05-18T00:34:10.197Z

The recent commits don't show c84a0c7cbc / 9cdc2db2e1. Let me investigate the git state and the change set.

### Assistant | 2026-05-18T00:34:12.872Z

[tool_use: Bash]

### Assistant | 2026-05-18T00:34:14.081Z

[tool_use: Bash]

### User | 2026-05-18T00:34:18.315Z

[tool_result] 9cdc2db2e1 [MAIN] [PICKER-FIX]/U-PICKER-HARDEN: U-ID gate + mtime cache + fail-on-revert oracle
c84a0c7cbc [MAIN] [PICKER-FIX]/U-PICKER-SHIPPED-UNION: union git+envelope as shipped-units source of truth
---SEARCH BY HASH---
commit
commit

### User | 2026-05-18T00:34:19.311Z

[tool_result]  M .claude/helpers/priority-queue.mjs
 M .claude/helpers/priority-queue.test.mjs
 M scripts/allocate-domains-to-slots.mjs
?? scripts/lib/domain-classifier.mjs
?? scripts/lib/domain-classifier.test.mjs
---
9cdc2db2e1 [MAIN] [PICKER-FIX]/U-PICKER-HARDEN: U-ID gate + mtime cache + fail-on-revert oracle

### Assistant | 2026-05-18T00:34:34.069Z

Iter-1+2 commits confirmed in git log (point 5 PASS). Now the substantive checks.

### Assistant | 2026-05-18T00:34:37.856Z

[tool_use: Bash]

### User | 2026-05-18T00:35:01.777Z

[tool_result] scripts/extract-domain-pipeline-units.mjs
scripts/lib/course-mapper-lib.mjs
scripts/lib/tribal-graph-clusters.mjs
scripts/lib/tribal-graph-clusters.test.mjs
.claude/hooks/post-recommendation-capture.mjs
---ECHO/MILL HARDCODE---

### Assistant | 2026-05-18T00:35:05.757Z

[tool_use: Bash]

### User | 2026-05-18T00:35:11.192Z

[tool_result] scripts/lib/course-mapper-lib.mjs:7://   - classifySchool / classifyDomain reused from tribal-graph-clusters.mjs
scripts/lib/course-mapper-lib.mjs:16:  classifyDomain,
scripts/lib/course-mapper-lib.mjs:17:  classifySchool,
scripts/lib/course-mapper-lib.mjs:219:  // classifyDomain returns an ARRAY of domain codes (multi-domain support).
scripts/lib/course-mapper-lib.mjs:220:  // classifySchool retu
... [+990 chars truncated]

### Assistant | 2026-05-18T00:35:14.950Z

`classifyDomain` in tribal-graph-clusters / course-mapper is a knowledge-domain classifier (course→school), and post-recommendation-capture's `DOMAIN_RULES` is tool→domain — both unrelated to slot↔domain SSOT. No drift sites for the slot map. Now the downstream pickup consumers and the picker divergence.

### Assistant | 2026-05-18T00:35:17.016Z

[tool_use: Bash]

### User | 2026-05-18T00:35:22.918Z

[tool_result] scripts/allocate-domains-to-slots.mjs
scripts/allocate-rgs-per-slot.mjs
scripts/lib/domain-classifier.mjs
scripts/lib/shipped-units-source-of-truth.mjs
scripts/topup-slot-queues.mjs
---SLOT-QUEUE CALLERS---
.claude/commands/checkin.md

### Assistant | 2026-05-18T00:35:26.004Z

No Stop hook consumes `pickNextUnit` directly (stop-auto-pickup-next.mjs not present). Let me check the new picker code, the cross-domain fallback loudness, and test quality.

### Assistant | 2026-05-18T00:35:27.224Z

[tool_use: Bash]

### User | 2026-05-18T00:35:32.888Z

[tool_result] 27:import { slotDomain, classifyUnit as classifyUnitDomain } from "../../scripts/lib/domain-classifier.mjs";
138: * ranking instead of an empty list, with `_crossDomain:true` stamped on each
142:export function pickNextUnit({ slot, excludeIds = [], topN = 1 } = {}) {
157:    return inDomain.slice(0, n).map((u) => ({ ...u, _slotDomain: domain }));
161:  return ranked.slice(0, n).map((u) => ({ ...u,
... [+752 chars truncated]

### Assistant | 2026-05-18T00:35:35.552Z

[tool_use: Bash]

### User | 2026-05-18T00:35:43.236Z

[tool_result]  * ranking instead of an empty list, with `_crossDomain:true` stamped on each
 * pick so the caller can surface "no in-domain work, here's cross-domain".
 * An unknown slot (or no slot) yields the global ranking unchanged.
 */
export function pickNextUnit({ slot, excludeIds = [], topN = 1 } = {}) {
  const inv = readJsonSafe(CONSOLIDATED_PATH);
  if (!inv) return [];
  const slots = readJsonSafe(C
... [+972 chars truncated]

### Assistant | 2026-05-18T00:35:45.656Z

Now let me check the slot-queue divergence and the test quality (point 8 — the critical one).

### Assistant | 2026-05-18T00:35:47.661Z

[tool_use: Bash]

### User | 2026-05-18T00:35:51.150Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
26 matches in 7 files:

.claude/helpers/priority-queue.test.mjs:4:import { collectUnits, buildShippedIds, buildClaimedIds, rankUnits, pickNextU...
.claude/helpers/priority-queue.test.mjs:98:// ─── pickNextUnit slot-domain filter (integration over live inventory) ────...
.claude/helpers/priority-queue.t
... [+2043 chars truncated]

### Assistant | 2026-05-18T00:35:54.366Z

Point 8 confirmed: **all 5 new tests `return` early when `picks.length === 0`**. Let me verify whether the inventory exists in this checkout (making the tests live) or absent (making them vacuous), and check the slot-queue divergence.

### Assistant | 2026-05-18T00:35:56.491Z

[tool_use: Bash]

### User | 2026-05-18T00:36:04.366Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'CONSOLIDATED_PATH\s*='
---EXISTS?---
state/shared/specs/ROADMAP-CONSOLIDATED.json  1.4M
---LIVE PICK---
[
  {
    "unit_id": "U-BRIDGE-CAD-CAM-HANDOFF",
    "milestone": "BRIDGE-DEEP",
    "title": "CAD AI → CAM AI autonomous handoff",
    "source": "bridge",
    "_source": "bridge-deep"
... [+104 chars truncated]

### Assistant | 2026-05-18T00:36:08.774Z

Inventory exists (1.4M ROADMAP-CONSOLIDATED.json) and live pick returns real units, so the tests are NOT vacuous in this checkout. But the `if (picks.length === 0) return` pattern is still a latent R12 issue. Let me verify slot-queue divergence and confirm no inlined constants/stubs.

### Assistant | 2026-05-18T00:36:11.836Z

[tool_use: Bash]

### User | 2026-05-18T00:36:17.554Z

[tool_result] ---SSOT EXPORT---
67:export function classifyUnit(unit) {
94:export function slotDomain(slot) {
---ALLOCATOR IMPORT---
35:  DOMAIN_RULES,
46:// DOMAIN_RULES / DEFAULT_DOMAIN / DOMAIN_TO_SLOT / SLOT_DOMAIN_LABEL now live
72:// of DOMAIN_RULES iteration — extracted to scripts/lib/domain-classifier.mjs).

### Assistant | 2026-05-18T00:36:20.494Z

Allocator now imports from the lib (point: behavior-identical refactor confirmed structurally). Let me check the slot-queue.mjs divergence and which picker /checkin uses.

### Assistant | 2026-05-18T00:36:22.290Z

[tool_use: Bash]

### User | 2026-05-18T00:36:27.831Z

[tool_result] 603:**Engagement (keyword-gated + slot-queue auto-engage).** Enter this loop when ANY of:
606:- **Slot-queue auto-engage (SLOT-AUTO-LOOP-MS0):** args are EMPTY (bare `/checkin` or `/checkin-<nato>`) AND this slot has a non-empty curated queue — `node H:/prism/scripts/slot-queue.mjs --remaining --slot $SLOT` returns > 0 (exit 0). The slot's queue IS its `/goal`. `--target` = that remaining count. T
... [+1246 chars truncated]

### Assistant | 2026-05-18T00:36:58.840Z

I have what I need. Key finding on point 4: `/checkin` autonomous loop uses **slot-queue.mjs first** (pre-partitioned `slot-task-queues.json`), and only falls back to `priority-queue.mjs`/`pick-unit` when the curated queue is exhausted. So the two pickers can recommend different units, but they are ordered (slot-queue preferred), not racing — this is acceptable but worth flagging as a divergence-of-truth.

---

# Independent Second-Pass Review — iter-3 picker-fix /loop

## Verdict: **PASS** (with 1 P1, 2 P2)

### Point-by-point

**1. Hidden allocator consumers — PASS.** Grep of `scripts/ .claude/hooks/ .claude/helpers/` for `DOMAIN_RULES`/`classifyDomain`/`slotDomain` found no other importer of the allocator's internal rules. The `classifyDomain` in `tribal-graph-clusters.mjs`/`course-mapper-lib.mjs` is a *knowledge-domain* (course→school) classifier and `post-recommendation-capture.mjs`'s `DOMAIN_RULES` is a *tool→domain* table — both semantically unrelated to slot↔domain. No additional drift sites. SSOT extraction is complete for its scope.

**2. Rolled-their-own slot↔domain maps — PASS.** No hardcoded `echo→cam`/`alpha→mill` patterns outside the new lib. The allocator (line 35) now imports `DOMAIN_RULES`/`SLOT_DOMAIN_LABEL` from the lib. Refactor is structurally a pure extraction.

**3. Downstream pickup consumers — PASS.** No Stop hook calls `pickNextUnit` (stop-auto-pickup-next.mjs does not exist). `_slotDomain`/`_crossDomain` are additive via `{...u, ...}` spread; no consumer does strict-shape assertions that would break. Object spread into commit/claim would carry the underscore fields harmlessly.

**4. slot-queue vs priority-queue divergence — P2.** Confirmed two pickers with different scoping: `/checkin` Step uses `slot-queue.mjs --pick` (pre-partitioned `slot-task-queues.json`) **first**, falling back to `priority-queue.mjs`/`pick-unit` only on exhaustion. They *can* recommend different next-units for the same slot, but the precedence is deterministic (cur
... [+3141 chars truncated]
