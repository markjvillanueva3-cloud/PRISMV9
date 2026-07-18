---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "Independent second-pass review of an uncommitted change in the PRISM repo. Do NO"
date: "2026-06-15"
first_ts: "2026-06-15T22:19:22.446Z"
last_ts: "2026-06-15T22:24:05.905Z"
cwd: "H:\\prism-slot-sierra"
messages: 59
user_msgs: 28
assistant_msgs: 31
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a5712c722c355fd7f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Independent second-pass review of an uncommitted change in the PRISM repo. Do NO

> **claude-code-cli** | 2026-06-15 | 59 msgs (28 user / 31 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a5712c722c355fd7f.jsonl`

## Transcript

### User | 2026-06-15T22:19:22.446Z

Independent second-pass review of an uncommitted change in the PRISM repo. Do NOT assume a prior reviewer caught everything. Read BOTH files END-TO-END:

1. H:/prism/scripts/build-milestone-progress.mjs  (modified)
2. H:/prism/scripts/build-milestone-progress.test.mjs  (6 new tests appended)

INTENT (U-SVH-MSPROGRESS-SUPERSEDED): fix two false-positive bugs in `computeProgress` (a pure, exported function that reports shipped/pending/drift per milestone from envelopes + git log). (a) `superseded` units were counted as `pending`, falsely tripping the `claims_completed_but_units_pending` drift flag on any milestone whose remainder is superseded. (b) `shipped`-status units (only `complete`/`completed` were recognized) with no git commit were mis-counted as pending. New module-level Sets `ENVELOPE_DONE` {complete,completed,shipped} and `TERMINAL_RESOLVED` {superseded,cancelled,canceled,wontfix,dropped,obsolete,removed}; new per-unit `resolved` flag; `accounted = shipped + resolved`; drift/derivedStatus key off accounted. Live-validated: SYSTEM-VIZ-BRAIN-MS0 went from false-drift to consistent; fleet completed-but-pending flags dropped 3->2 (the 2 remaining are genuinely pending).

Weighted toward what a logic reviewer MISSES:
- SCOPE / over-suppression: is `TERMINAL_RESOLVED` too broad? Could including {cancelled,wontfix,dropped,obsolete,removed} (only `superseded` appears in envelopes today) ever WRONGLY suppress a drift that should fire? Is excluding `deferred` correct (it can mean future-pending)? Is there any status that SHOULD be terminal-resolved but is missing?
- SEMANTIC drift of the report: downstream consumers of MILESTONE_PROGRESS.json read `pending`, `shipped`, per-unit `shipped:true|false`, and the new `resolved` field. Does adding `resolved` to the unit + milestone objects break any consumer that does strict shape checks or sums? Does /pick-unit (which filters already-shipped units) now also need to skip `resolved` units, and is leaving that out a NEW laten
... [+907 chars truncated]

### Assistant | 2026-06-15T22:19:27.020Z

I'll read both files end-to-end before making any judgments.

### Assistant | 2026-06-15T22:19:27.429Z

[tool_use: Read]

### Assistant | 2026-06-15T22:19:27.433Z

[tool_use: Read]

### User | 2026-06-15T22:19:31.080Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-milestone-progress.test.mjs' was already read 17s ago in this session and is unchanged (mtime 1781561878018). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-15T22:19:32.425Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-milestone-progress.mjs' was already read 17s ago in this session and is unchanged (mtime 1781561858407). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-15T22:19:34.904Z

The read-once guard tells me these files were already read earlier in this session. I need to read them fresh with the cache disabled.

### Assistant | 2026-06-15T22:19:35.704Z

[tool_use: Bash]

### Assistant | 2026-06-15T22:19:35.710Z

[tool_use: Bash]

### User | 2026-06-15T22:19:41.782Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * build-milestone-progress.mjs
     4	 *
     5	 * Generates state/shared/MILESTONE_PROGRESS.md + .json — a delta surface
     6	 * showing what's actually shipped per milestone vs what the milestone
     7	 * envelope JSONs claim.
     8	 *
     9	 * Why: roadmap-index.json carries `status: "not_started"` for milestones
    10	 * we've alread
... [+29342 chars truncated]

### User | 2026-06-15T22:19:47.302Z

[tool_result]      1	/**
     2	 * build-milestone-progress.test.mjs — joint-unit regex + expandCombinedIds
     3	 *
     4	 * Regression coverage for the silent-close-out class of bugs where ship
     5	 * commits using joint subjects like `[INTEL-OLLAMA-OBSIDIAN-MS0]/P23-U01+U02`
     6	 * failed to credit one or more of the joint units in MILESTONE_PROGRESS.json.
     7	 *
     8	 * Two failure modes are pi
... [+14194 chars truncated]

### Assistant | 2026-06-15T22:19:51.445Z

Now I have both files fully in context. Let me perform the end-to-end analysis.

### Assistant | 2026-06-15T22:19:52.836Z

[tool_use: Bash]

### Assistant | 2026-06-15T22:19:55.489Z

[tool_use: Bash]

### User | 2026-06-15T22:20:05.239Z

[tool_result] diff --git a/scripts/build-milestone-progress.mjs b/scripts/build-milestone-progress.mjs
index 82f6691c80..edcf0dec2e 100644
--- a/scripts/build-milestone-progress.mjs
+++ b/scripts/build-milestone-progress.mjs
@@ -259,6 +259,30 @@ export async function loadMilestones(dir = MILESTONE_DIR) {
   return milestones;
 }
 
+// Terminal-DONE statuses: the envelope asserts the unit shipped. When no git
+/
... [+10964 chars truncated]

### User | 2026-06-15T22:20:08.958Z

[tool_result] mcp-server/src/tools/dispatchers/camDispatcher.ts:6547:            result = { machine: result.resolved?.machine, material: result.resolved?.material, tools: result.resolved?.tools, holders: result.resolved?.holders, coolant: result.resolved?.coolant };
mcp-server/src/tools/dispatchers/camDispatcher.ts:12610:            // PEEK/CoCr dental materials resolved through MaterialBridge ISO group mapping
... [+346 chars truncated]

### Assistant | 2026-06-15T22:20:13.063Z

[tool_use: Bash]

### Assistant | 2026-06-15T22:20:14.697Z

[tool_use: Bash]

### User | 2026-06-15T22:20:18.590Z

[tool_result] scripts/add-cleanup-roadmap-to-atomic.mjs:7: * REVENUE at roadmap_priority=1) so `/pick-unit` can surface CLEANUP units
scripts/add-cleanup-roadmap-to-atomic.mjs:17: *   - state/shared/MILESTONE_PROGRESS.json (read shipped status if present)
scripts/add-cleanup-roadmap-to-atomic.mjs:29:const PROGRESS = join(ROOT, "state/shared/MILESTONE_PROGRESS.json");
scripts/add-cleanup-roadmap-to-atomic.mjs:11
... [+6822 chars truncated]

### User | 2026-06-15T22:20:19.711Z

[tool_result] scripts/agents/spawned-agent-context-lib.mjs:328:    (acc, m) => acc + (m.units?.filter((u) => u.shipped).length || 0), 0,
scripts/agents/spawned-agent-context-lib.mjs:640:    lines.push(`${mp.milestones} milestones · ${mp.shipped}/${mp.totalUnits} units shipped (git-grounded) · ${mp.drifts} envelope-vs-git drift cases`);
scripts/allocate-domains-to-slots.mjs:100:    ...pending.map((u) => ({ ...u,
... [+5042 chars truncated]

### Assistant | 2026-06-15T22:20:23.967Z

[tool_use: Bash]

### Assistant | 2026-06-15T22:20:25.137Z

[tool_use: Bash]

### User | 2026-06-15T22:20:29.325Z

[tool_result] scripts/build-state-snapshot.mjs:148:  // Pick milestones with ≥1 shipped unit (active) but pending units left.
scripts/build-state-snapshot.mjs:150:    (m) => m.shipped > 0 && m.pending > 0,
scripts/build-state-snapshot.mjs:159:    const pendingUnits = (m.units || []).filter((u) => !u.shipped);
scripts/build-state-snapshot.mjs:259:    if (m.shipped === 0 && m.claimedStatus === "not_started") {
sc
... [+4770 chars truncated]

### User | 2026-06-15T22:20:30.488Z

[tool_result] 139:      if (u && !u.shipped) {
233:  const milestonesWithPending = milestones.filter((m) => (m.pending || 0) > 0).length;
336:  const mRows = inv.milestones.filter((m) => (m.pending || 0) > 0 || (m.total || 0) > 0)

### Assistant | 2026-06-15T22:20:33.499Z

[tool_use: Bash]

### Assistant | 2026-06-15T22:20:34.111Z

[tool_use: Bash]

### User | 2026-06-15T22:20:37.875Z

[tool_result]   return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** Every un-shipped unit from MILESTONE_PROGRESS — the master remaining-work set. */
export function collectPendingUnits(milestoneProgress) {
  const out = [];
  const mp = milestoneProgress && milestoneProgress.milestones ? Object.values(milestoneProgress.milestones) : [];
  for (const ms of mp) {
    for (const u of (Array
... [+493 chars truncated]

### User | 2026-06-15T22:20:38.638Z

[tool_result] function topPendingUnits(milestoneProgress, n = 20) {
  if (!milestoneProgress?.milestones) return [];
  // Pick milestones with ≥1 shipped unit (active) but pending units left.
  const active = milestoneProgress.milestones.filter(
    (m) => m.shipped > 0 && m.pending > 0,
  );
  active.sort(
    (a, b) =>
      (b.lastShippedDate || "").localeCompare(a.lastShippedDate || "") ||
      b.pending -
... [+379 chars truncated]

### Assistant | 2026-06-15T22:20:41.834Z

[tool_use: Bash]

### Assistant | 2026-06-15T22:20:49.484Z

[tool_use: Bash]

### User | 2026-06-15T22:20:50.961Z

[tool_result] 268:export const ENVELOPE_DONE = new Set(["complete", "completed", "shipped"]);
270:// Terminal-resolved unit statuses: deliberately NOT built (replaced / cancelled),
276:export const TERMINAL_RESOLVED = new Set([
333:      if (!hit && ENVELOPE_DONE.has((asStr(u.envelopeStatus) || "").toLowerCase())
343:      // A unit with a terminal-resolved status (superseded/cancelled/...) was
347:      const 
... [+425 chars truncated]

### User | 2026-06-15T22:20:55.442Z

[tool_result] PROOF: pending >= 0 is guaranteed by mutual exclusion of shipped/resolved.
ratio uses shippedCount only, not accounted -- correct by design.
NaN guard for total=0: ratio = 0

### Assistant | 2026-06-15T22:21:07.267Z

[tool_use: Bash]

### Assistant | 2026-06-15T22:21:08.030Z

[tool_use: Bash]

### User | 2026-06-15T22:21:15.258Z

[tool_result] Edge: status:shipped + non-empty envelopeCommits outside 60-day window -> still pending (pre-existing behavior, not changed).
'shipped' in TERMINAL_RESOLVED: false
'shipped' in ENVELOPE_DONE: true
No overlap between sets: true

### User | 2026-06-15T22:21:20.016Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-15T22:21:24.563Z

[tool_use: Bash]

### Assistant | 2026-06-15T22:21:29.081Z

[tool_use: Bash]

### User | 2026-06-15T22:21:30.576Z

[tool_result] scripts/build-milestone-progress.mjs:5: * Generates state/shared/MILESTONE_PROGRESS.md + .json — a delta surface
scripts/build-milestone-progress.mjs:6: * showing what's actually shipped per milestone vs what the milestone
scripts/build-milestone-progress.mjs:10: * we've already shipped 5+ units of (e.g. XPROC-NEURAL-OPTIMIZE-MS0 has
scripts/build-milestone-progress.mjs:19: *   2. Extract unit IDs
... [+1825 chars truncated]

### User | 2026-06-15T22:21:35.325Z

[tool_result] scripts/build-milestone-progress.mjs: NON-ASCII bytes at positions: [(120, 226), (121, 128), (122, 148), (1869, 226), (1870, 128), (1871, 148), (3726, 226), (3727, 134), (3728, 146), (3772, 226)]
scripts/build-milestone-progress.test.mjs: NON-ASCII bytes at positions: [(42, 226), (43, 128), (44, 148), (452, 226), (453, 128), (454, 148), (921, 226), (922, 128), (923, 148), (2620, 226)]

### Assistant | 2026-06-15T22:21:41.938Z

[tool_use: Bash]

### User | 2026-06-15T22:21:45.823Z

[tool_result] scripts/build-milestone-progress.mjs: 19 non-ASCII chars:
  line 5 char U+2014 "json — a delta "
  line 90 char U+2192 "     → [\"U-AIMA"
scripts/build-milestone-progress.test.mjs: 67 non-ASCII chars:
  line 2 char U+2014 ".mjs — joint-un"
  line 74 char U+2192 "MAX` → no strip"
  line 113 char U+2500 "// ── asStr —"

### Assistant | 2026-06-15T22:21:50.153Z

[tool_use: Bash]

### User | 2026-06-15T22:21:54.428Z

[tool_result] HEAD version non-ASCII count: 57
HEAD test version non-ASCII count: 201

### Assistant | 2026-06-15T22:22:01.076Z

[tool_use: Bash]

### Assistant | 2026-06-15T22:22:09.830Z

[tool_use: Bash]

### User | 2026-06-15T22:22:12.693Z

[tool_result] HEAD total non-ASCII: 258; New total: 86 -- the PR reduced non-ASCII, didn't add them.
The remaining em-dashes/arrows in the new version pre-existed in HEAD.

### User | 2026-06-15T22:22:20.621Z

[tool_result] derivedStatus='completed_real' with shipped=0 is intentional, consumers use m.shipped directly.

### Assistant | 2026-06-15T22:22:28.756Z

[tool_use: Bash]

### Assistant | 2026-06-15T22:22:29.461Z

[tool_use: Bash]

### User | 2026-06-15T22:22:34.319Z

[tool_result] P1: consolidate-roadmaps:139 filters !u.shipped but not !u.resolved
P1: build-state-snapshot:159 filters !u.shipped but not !u.resolved
Both consume MILESTONE_PROGRESS.json units[] and will include resolved units in pending_units.

### User | 2026-06-15T22:22:40.900Z

[tool_result]  * whose `shipped === 0` and the envelope claims `not_started` (never
 * picked up). These are abandoned-roadmap candidates.
 */
const STALE_AGE_DAYS = 30;

function computeStaleMilestones(ms) {
  if (!ms?.milestones) return [];
  const now = Date.now();
  const cutoff = now - STALE_AGE_DAYS * 24 * 3600 * 1000;
  const stale = [];
  for (const m of ms.milestones) {
    if (m.total === 0) continue;
... [+426 chars truncated]

### Assistant | 2026-06-15T22:22:44.595Z

[tool_use: Bash]

### User | 2026-06-15T22:22:53.809Z

[tool_result]   ...
# Subtest: computeProgress: deferred is NOT terminal-resolved (stays pending, no over-suppression)
ok 18 - computeProgress: deferred is NOT terminal-resolved (stays pending, no over-suppression)
  ---
  duration_ms: 0.0677
  ...
# Subtest: computeProgress: superseded match is case-insensitive; a real commit (shipped) wins over superseded
ok 19 - computeProgress: superseded match is case-inse
... [+641 chars truncated]

### Assistant | 2026-06-15T22:23:06.099Z

[tool_use: Bash]

### User | 2026-06-15T22:23:14.354Z

[tool_result] HONEST: status:shipped + no commit -> envelopeAssertedCount++, sha:null, source:envelope-status. Signal preserved.
The shipped+commit-in-shaSet path follows the existing envelope-commit code path. Correct, covered transitively.

### Assistant | 2026-06-15T22:23:26.246Z

[tool_use: Bash]

### User | 2026-06-15T22:23:34.632Z

[tool_result] SCOPE analysis: TERMINAL_RESOLVED synonyms are forward-compat; all require explicit envelope tagging.
No scenario where a genuinely-pending unit could be auto-resolved without envelope author action.

### Assistant | 2026-06-15T22:24:05.905Z

I have now read both files end-to-end, verified the diff, run the tests, and traced every consumer. Here is the complete review.

---

VERDICT: PASS
summary: Both bugs are fixed correctly with proper mutual exclusion (shipped wins over resolved, pending is non-negative by proof), ENVELOPE_DONE and TERMINAL_RESOLVED have no overlap, all 21 tests pass. One latent P1 consumer issue is present but is pre-existing behavior newly made visible by this change, not introduced by it. One P2 semantic concern about derivedStatus warrants documentation.

findings:

- [P1] `scripts/consolidate-roadmaps.mjs:139` and `scripts/build-state-snapshot.mjs:159` -- Both consumer scripts filter "pending" units with `!u.shipped` only, not `!u.shipped && !u.resolved`. After this PR, a unit with `resolved:true` has `shipped:false`, so superseded/cancelled units will appear in `pending_units[]` output (the master remaining-work set read by `/pick-unit`). This means a superseded unit CAN still be offered as a build candidate to any chat running `/pick-unit` or reading `ROADMAP-CONSOLIDATED.json`. The PR itself is correct -- `pending` at the milestone level already subtracts resolved -- but the per-unit `units[]` array in the JSON is now carrying resolved units visible to consumers that only check `u.shipped`. The fix is to update both filter sites to `!u.shipped && !u.resolved`. The PR correctly notes this is out of scope, but the exposure is real and needs a follow-up before an active chat picks a superseded unit.

- [P2] `scripts/build-milestone-progress.mjs:387-393` -- `derivedStatus` returns `"completed_real"` when `accounted === total` even if `shipped === 0` (entirely-cancelled/superseded milestone). Downstream code that reads `derivedStatus === "completed_real"` and infers "work was done" would be misled. `build-state-snapshot.mjs:259` is safe because it gates on `m.shipped === 0` directly; but future consumers of `derivedStatus` could misinterpret it. A value like `"resolved_real"` woul
... [+2467 chars truncated]
