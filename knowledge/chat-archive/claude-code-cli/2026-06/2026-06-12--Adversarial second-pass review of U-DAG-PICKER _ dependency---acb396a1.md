---
type: "chat-session"
source: "claude-code-cli"
session_id: "acb396a1-5d83-43f6-9cec-7c65bf98418f"
title: "Adversarial second-pass review of U-DAG-PICKER — dependency-aware ordering added"
date: "2026-06-12"
first_ts: "2026-06-12T19:56:35.350Z"
last_ts: "2026-06-12T20:05:55.068Z"
cwd: "H:\\prism-slot-alpha"
messages: 62
user_msgs: 22
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism-slot-alpha/acb396a1-5d83-43f6-9cec-7c65bf98418f/subagents/agent-a40387681f58d62e8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:35"
---

# Adversarial second-pass review of U-DAG-PICKER — dependency-aware ordering added

> **claude-code-cli** | 2026-06-12 | 62 msgs (22 user / 40 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/acb396a1-5d83-43f6-9cec-7c65bf98418f/subagents/agent-a40387681f58d62e8.jsonl`

## Transcript

### User | 2026-06-12T19:56:35.350Z

Adversarial second-pass review of U-DAG-PICKER — dependency-aware ordering added to the fleet's runtime pickup picker `.claude/helpers/priority-queue.mjs` (used by Stop hooks + /pick-unit + /checkin loops to suggest the next unit for EVERY chat). Find a way it's WRONG. Read END-TO-END, grade PASS/FAIL with P0/P1/P2:

1. H:/prism/.claude/helpers/priority-queue.mjs  (LIVE patched picker — PRIMARY)
2. H:/prism-slot-alpha/scripts/__tests__/dag-picker.test.mjs

THE CHANGE: `pickNextUnit` now partitions ranked units into dependency-READY (no deps, or all `depends_on` shipped) vs BLOCKED, and reorders `ranked = ready.concat(blocked.map(u => ({...u, _depBlocked:true})))` — so blocked units fall behind ready ones. Deps come from `envIndex.unitDeps` (milestone-envelope `depends_on`). `PRISM_PQ_DAG_DISABLE=1` reverts.

ATTACK:
- STRANDING (R12): can a unit become PERMANENTLY unpickable? E.g. a dep unit-id that NEVER ships (typo'd dep, deleted dep, circular dep U-A↔U-B). Trace: if every in-domain unit is blocked, does the code still return a pick (the `ready.concat(blocked)` means blocked units ARE still in `ranked`, so the domain filter + slice still yield them) — or can it return empty when work exists? Verify the never-strand property HOLDS end to end (through the domain filter at the bottom of pickNextUnit, not just the partition).
- CIRCULAR DEPS: U-A depends_on U-B, U-B depends_on U-A, neither shipped → both blocked → both fall to the back but still pickable (correct) OR both vanish (P0). Which?
- OVER-BLOCKING: if the shipped-set namespace doesn't match the dep-id namespace, EVERYTHING is blocked → the whole queue is `_depBlocked` and ordering is just legacy (degraded but not broken) — is that the failure mode, and is it acceptable/detectable?
- INTERACTION with the eval-rerank (applyEvalRerank) + slot-ownership filter + cross-domain fallback: does inserting the dep-partition BETWEEN the alias-dedupe and the domain filter break any of those? Does `_depBlocked` survive th
... [+478 chars truncated]

### Assistant | 2026-06-12T19:56:39.015Z

I'll perform an adversarial second-pass review of the U-DAG-PICKER change. Let me read both files end-to-end.

### Assistant | 2026-06-12T19:56:39.130Z

[tool_use: Read]

### Assistant | 2026-06-12T19:56:39.546Z

[tool_use: Read]

### User | 2026-06-12T19:56:43.552Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\priority-queue.mjs' was already read 15s ago in this session and is unchanged (mtime 1781294064717). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-12T19:56:43.578Z

[tool_result] read-once-guard: 'H:\prism-slot-alpha\scripts\__tests__\dag-picker.test.mjs' was already read 14s ago in this session and is unchanged (mtime 1781294101743). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### Assistant | 2026-06-12T19:56:46.637Z

The read-once guard says these files are already in my context, but I don't actually see their content in this conversation. The guard is mistaken about my having the content. Let me bypass the cache to get the actual file contents.

### Assistant | 2026-06-12T19:56:48.417Z

[tool_use: Bash]

### User | 2026-06-12T19:57:11.641Z

[tool_result]   480 H:/prism/.claude/helpers/priority-queue.mjs
   77 H:/prism-slot-alpha/scripts/__tests__/dag-picker.test.mjs
  557 total

### Assistant | 2026-06-12T19:57:14.269Z

The files exist but their content was not actually loaded into my context (the guard's claim is false-positive). Let me read them with the cache disabled.

### Assistant | 2026-06-12T19:57:15.121Z

[tool_use: Bash]

### User | 2026-06-12T19:57:49.501Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * priority-queue.mjs — runtime API over ROADMAP-CONSOLIDATED priority queue.
     4	 *
     5	 * Spec: PRIORITY-QUEUE-MS0 (slot juliett, forge7, 2026-05-16).
     6	 *
     7	 * Consumed by Stop hooks (stop-auto-pickup-next.mjs in particular) to suggest
     8	 * the next-best unit for a chat to take. Uses the same `classifyUnit` from
     9	 *
... [+27083 chars truncated]

### Assistant | 2026-06-12T19:57:51.566Z

I have the primary file. Now let me read the test file.

### Assistant | 2026-06-12T19:57:52.888Z

[tool_use: Bash]

### User | 2026-06-12T19:58:15.400Z

[tool_result]      1	/**
     2	 * Tests for U-DAG-PICKER -- the dependency-aware pickup logic added to
     3	 * .claude/helpers/priority-queue.mjs (buildEnvelopeIndex unitDeps capture +
     4	 * depsSatisfied + partitionByDeps). The functions are pure (explicit inputs), so
     5	 * these are hermetic fixtures; we import from the live patched main-tree helper.
     6	 *
     7	 * Run: node --test scripts/__t
... [+3967 chars truncated]

### Assistant | 2026-06-12T19:58:20.123Z

Now I have both files. Let me trace the critical dependencies referenced by the new code to verify the attack vectors. I need to understand `slotDomain`, `classifyUnitDomain`, and how the shipped set is namespace-normalized to check the over-blocking claim. Let me also verify whether the `_depBlocked` flag survives the domain-filter return paths' spreads.

### Assistant | 2026-06-12T19:58:21.704Z

[tool_use: Bash]

### User | 2026-06-12T19:58:48.707Z

[tool_result] #!/usr/bin/env node
// scripts/lib/domain-classifier.mjs
//
// Single source of truth for slot↔domain mapping + unit→domain classification.
//
// Background: PRISM runs 13 NATO-named chat slots, each assigned a PRISM system
// domain (alpha=mill, bravo=lathe, charlie=wire-EDM, etc. per JULIETT-12CHAT-
// ALLOCATION-MS0). The slot-task queue allocator (scripts/allocate-domains-to-
// slots.mjs) and
... [+4248 chars truncated]

### Assistant | 2026-06-12T19:58:52.274Z

[tool_use: Bash]

### User | 2026-06-12T19:59:01.095Z

[tool_result] }

/**
 * Lookup a slot's owning domain. Returns null if the slot name is unknown
 * (e.g., a future slot that doesn't have a domain assignment yet).
 */
export function slotDomain(slot) {
  if (typeof slot !== "string") return null;
  const s = slot.toLowerCase();
  return SLOT_TO_DOMAIN[s] || null;
}

/**
 * Filter a list of units to those owned by the given slot. R12-compliant:
 * if `slot` is 
... [+426 chars truncated]

### Assistant | 2026-06-12T19:59:04.470Z

Now I understand the domain filter path. Let me verify the critical `buildShippedIdsUnion` to confirm the namespace normalization (it must produce upper-cased unit-ids for the over-blocking check), and `extractUnitIdsFromUnit`.

### Assistant | 2026-06-12T19:59:05.888Z

[tool_use: Bash]

### User | 2026-06-12T19:59:23.766Z

[tool_result] 55:  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
58:function norm(id) { return String(id || "").trim().toUpperCase(); }
68:export function extractUnitIdsFromUnit(node) {
70:  if (!node || typeof node !== "object") return out;
72:    out.add(norm(node.id));
78:    if (m) out.add(norm(m[0]));
80:  return out;
84:  try { return fs.statSync(p).mtimeMs; } catch { retur
... [+595 chars truncated]

### Assistant | 2026-06-12T19:59:27.354Z

The shipped set is normalized to upper-case via `norm()`. The DAG code also normalizes deps and unit-ids to upper via `normUp`. So namespace casing is consistent. Let me verify `buildShippedIdsUnion` returns a Set of upper-cased ids and confirm what `readCompletedMilestones` is (used at line 365).

### Assistant | 2026-06-12T19:59:29.243Z

[tool_use: Bash]

### User | 2026-06-12T19:59:41.160Z

[tool_result] 334:export function readCompletedMilestones(envelopesDir = DEFAULT_ENVELOPES_DIR) {
367:export function buildShippedIdsUnion({ progressPath, envelopesDir } = {}) {
---body buildShippedIdsUnion---
export function buildShippedIdsUnion({ progressPath, envelopesDir } = {}) {
  const useCache = progressPath == null && envelopesDir == null;
  const pp = progressPath || DEFAULT_PROGRESS_PATH;
  const ed 
... [+1277 chars truncated]

### Assistant | 2026-06-12T19:59:46.498Z

Now I have the full picture of the shipped-set namespace. The shipped union is normalized to upper-case throughout, matching the DAG's `normUp` on deps. Let me now verify the over-blocking detectability claim and trace one critical interaction: whether the `_depBlocked` flag survives the domain-filter spread paths. Let me trace the exact data flow precisely and also check the test for the partition's edge cases.

Let me confirm the `partitionByDeps` non-array-of-blocked spread and trace whether `_depBlocked` gets clobbered. Looking at lines 384-385 and the return paths at 390, 408, 416.

Let me run the test suite to confirm it passes, then do the adversarial trace.

### Assistant | 2026-06-12T19:59:47.522Z

[tool_use: Bash]

### User | 2026-06-12T20:00:05.247Z

[tool_result] Could not find 'scripts/__tests__/dag-picker.test.mjs'

### Assistant | 2026-06-12T20:00:09.438Z

[tool_use: Bash]

### User | 2026-06-12T20:00:29.361Z

[tool_result] ls: cannot access 'H:/prism/scripts/__tests__/dag-picker.test.mjs': No such file or directory
---
H:/prism-slot-alpha/scripts/__tests__/dag-picker.test.mjs
--- run from slot-alpha ---
    # Subtest: empty / non-array -> empty partition
    ok 2 - empty / non-array -> empty partition
      ---
      duration_ms: 0.1149
      ...
    1..2
ok 3 - partitionByDeps
  ---
  duration_ms: 0.504
  type: 'su
... [+112 chars truncated]

### Assistant | 2026-06-12T20:00:35.993Z

8/8 pass. Important note: the test file imports from `file:///H:/prism/.claude/helpers/priority-queue.mjs` (the main-tree LIVE helper, line 12), not the slot-alpha copy. So the test validates the live patched file. Good.

Now the adversarial trace. Let me construct the actual attack scenarios as live experiments against the real `pickNextUnit` + the partition logic. First, let me verify the most critical attack: **does `_depBlocked` survive the domain-filter spreads**, and is the stranding property actually held end-to-end through the domain filter. I'll write a focused harness.

### Assistant | 2026-06-12T20:00:44.070Z

[tool_use: Bash]

### User | 2026-06-12T20:00:56.627Z

[tool_result] CIRCULAR ready= [] blocked= [ 'U-A', 'U-B' ]
CIRCULAR ranked after concat= [ 'U-A(B)', 'U-B(B)' ]
CIRCULAR both still pickable? true
TYPO-DEP ready= [] blocked= [ 'U-X' ]
TYPO-DEP still pickable in ranked? true [ 'U-X(B)' ]

### Assistant | 2026-06-12T20:01:09.424Z

Circular and typo deps both fall to `blocked` but remain in `ranked` — never stranded at the partition level. Now the critical end-to-end question: does the **domain filter** at the bottom of `pickNextUnit` preserve `_depBlocked`, and can the domain filter strand a blocked unit? Let me trace the full `pickNextUnit` flow with a real-ish in-memory injection. Since `pickNextUnit` reads from disk, I'll do a precise code-path trace and also check whether `_depBlocked` survives the `{...u}` spreads in the return paths.

Looking at the return paths:
- Line 390: `return ranked.slice(0, n);` — no spread, `_depBlocked` preserved (global/no-slot path).
- Line 408: `return inDomain.slice(0, n).map((u) => ({ ...u, _slotDomain: domain }));` — `{...u}` spreads `_depBlocked` through. ✓
- Line 416: `return ranked.slice(0, n).map((u) => ({ ...u, _slotDomain: domain, _crossDomain: true }));` — `{...u}` spreads `_depBlocked`. ✓

So `_depBlocked` survives all spreads. Now let me verify the most dangerous interaction: **does the domain filter operate on the `ready.concat(blocked)` reordered list, and can it strand a blocked unit?** The key concern: after DAG partition, `ranked = ready.concat(blocked)`. Then domain filter `inDomain = ranked.filter(...)`. If a slot's only in-domain unit is blocked, `inDomain` still contains it (filter is by domain, not by blocked-status). Let me verify with an actual disk-backed run on the real inventory and also test the slot-ownership filter interaction.

### Assistant | 2026-06-12T20:01:13.041Z

[tool_use: Bash]

### User | 2026-06-12T20:01:40.355Z

[tool_result] LIVE unitDeps size = 789
LIVE unitSlot size = 184 milestoneUnitIds size = 650
  dep: P0-U04 -> [ 'P0-U03' ]
  dep: P0-U05 -> [ 'P0-U03' ]
  dep: P0-U02 -> [ 'P0-U01' ]
  dep: P0-U03 -> [ 'P0-U02' ]
  dep: P1-U02 -> [ 'P1-U01' ]
  dep: P1-U03 -> [ 'P1-U02' ]
  dep: U-AIMAX02 -> [ 'U-AIMAX01' ]
  dep: U-AIMAX03 -> [ 'U-AIMAX01', 'U-AIMAX02' ]
GLOBAL pick count= 3 [ 'A1', 'U-BRIDGE-AI-TIER1-TIER2', '
... [+311 chars truncated]

### Assistant | 2026-06-12T20:01:47.697Z

The DAG index is active with 789 dep edges. Now the most important attack vector. Notice the live dep edges: `P0-U04 -> P0-U03`, `P0-U03 -> P0-U02`, `P0-U02 -> P0-U01`. These are **phase-letter unit IDs** (`P0-U03`, not `U-...`). 

Here's a critical namespace concern. The deps stored are `normUp(rawDeps)` = `P0-U03` etc. But the **shipped set** namespace: `buildShippedIdsUnion` reads from MILESTONE_PROGRESS + envelopes + bridge commits. The question is whether a shipped `P0-U03` would actually be recorded under the id `P0-U03` in the shipped set, or under a different canonical id. This is the **over-blocking** attack. Let me probe whether ANY of the 789 dep-ids ever appear in the shipped set — if zero overlap, every depended-upon unit is permanently "unshipped" → systematic over-blocking.

### Assistant | 2026-06-12T20:01:54.509Z

[tool_use: Bash]

### User | 2026-06-12T20:02:02.333Z

[tool_result] shipped set size = 1295
distinct dep-ids referenced = 663
dep-ids present in shipped set = 257
dep-ids NOT in shipped set = 406
sample NOT-shipped dep-ids: [
  'P0-U03',   'P0-U01',
  'P0-U02',   'P1-U01',
  'P1-U02',   'U-AIMAX11',
  'U-AIW02',  'U-AIW03',
  'U-AIW03B', 'U-AIW04',
  'U-AIW04B', 'U-AIW06',
  'U-AIW08',  'U-AIW07A',
  'U-APPW39'
]
units-with-deps: ready= 306 blocked= 483 ( 61.2 % b
... [+8 chars truncated]

### Assistant | 2026-06-12T20:02:11.655Z

This is the meat of the finding. The namespaces **partially** overlap: 257 of 663 dep-ids are in the shipped set, but 406 are not. The over-blocking is real but partial — 61.2% of units-with-deps are blocked. Now the critical question: are those 483 blocked units **legitimately blocked** (deps genuinely not built) or **falsely blocked** (deps built but recorded under a different id namespace)?

The sample is telling: `P0-U03`, `P0-U01`, `P0-U02` are phase-letter ids. Per the existing code comments (lines 110-117, 127-131), ROADMAP-CONSOLIDATED carries phase-letter unit_ids (`A2`, `P0-U03`) while the canonical U-ID lives in the title and the shipped union only knows the canonical one. This is the **exact ID-drift class** the code already fixed for `excludeIds` (via `extractUnitIdsFromUnit` on the title, lines 132-135) — but the DAG dep-check at `depsSatisfied` does **NOT** apply that same title-embedded-id resolution. Let me verify whether these phase-letter deps correspond to actually-shipped work under a canonical id. Let me check P0-U01/02/03 specifically.

### Assistant | 2026-06-12T20:02:17.430Z

[tool_use: Bash]

### User | 2026-06-12T20:02:25.962Z

[tool_result] <persisted-output>
Output too large (70.2KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-alpha\acb396a1-5d83-43f6-9cec-7c65bf98418f\tool-results\bbh2jdcqe.txt

Preview (first 2KB):
env=ACP-MS0 unit=P0-U01 status=completed shippedSetHas(P0-U01)=false title="Inventory all slash commands grouped by workflow (build"
env=ACP-MS0 unit=P0-U02 status=completed shippedSetHas(P0-U02
... [+1732 chars truncated]

### Assistant | 2026-06-12T20:02:37.169Z

This is a **major finding** and confirms two distinct P0/P1 defects. The output exposes a critical structural problem:

**`P0-U01` is a non-unique unit-id reused across MANY different milestone envelopes** (ACP-MS0, ACP-MS0A, ACP-MS1, ACP-MS2, ...). The `unitDeps` Map is keyed by bare `normUp(uid)` = `P0-U01`, with **last-writer-wins collision** across every envelope that uses phase-letter ids. This means:

1. **Dep-key collision (P0/P1):** `buildEnvelopeIndex` stores `unitDeps.set("P0-U04", ["P0-U03"])` — but `P0-U04` exists in dozens of envelopes. Whichever envelope is read last wins. A unit `P0-U04` in milestone `FOO-MS0` gets the dep edge from milestone `BAR-MS9` if BAR was read later. The deps are **cross-milestone-contaminated**. Equally, `depsSatisfied({unit_id:"P0-U04"})` resolves against whatever collided last — wrong deps for almost every phase-letter unit.

2. **Over-blocking via shipped-set namespace mismatch (P1):** `P0-U01/02/03` are `status:completed` in ACP-MS0 but `shippedSetHas=false`. The dep-satisfaction check uses the bare phase-letter id which the shipped union never records (it records canonical `U-...` ids or git-inferred ids). So a unit depending on a *completed* `P0-U03` is flagged BLOCKED forever.

Let me quantify how many `unitDeps` keys are non-unique (collision victims) to size the blast radius.

### Assistant | 2026-06-12T20:02:46.812Z

[tool_use: Bash]

### User | 2026-06-12T20:02:58.187Z

[tool_result] distinct unit-ids across all envelopes = 3780
unit-ids that appear in >1 envelope (collision-prone) = 188
worst collider: P0-U01 appears 210 times
dep-carrying ids with CONFLICTING dep edges across envelopes = 34
  CONFLICT P0-U04:{P0-U01,P0-U02,P0-U03 | P0-U01 | P0-U03 | P0-U02,P0-U03 | CC-EXT-MS1:P0-U03 | CC-EXT-MS2:P0-U03 | CC-EXT-MS3:P0-U02 | CC-EXT-MS4:P0-U02 | CC-EXT-MS5:P0-U03 | CC-EXT-MS6:
... [+1311 chars truncated]

### Assistant | 2026-06-12T20:03:08.375Z

Confirmed and quantified. The collision is severe: `P0-U01` appears **210 times** across envelopes, 188 unit-ids collide across milestones, and **34 dep-carrying ids carry mutually-conflicting dep edges** that `buildEnvelopeIndex` silently overwrites with last-writer-wins (note the conflict signatures even mix bare `P0-U03` with namespaced `CC-EXT-MS1:P0-U03` — so some envelopes namespace their deps and some don't, compounding the chaos).

Let me verify one more interaction the prompt explicitly asked about: the **stranding property end-to-end through the domain filter** when there's a real-but-tiny lane. The concern: if a slot's domain has exactly one in-domain unit and it's blocked, does `inDomain` still surface it (length>0 path), or does it fall to the cross-domain path? Either way it must return non-empty. Let me also confirm the never-strand invariant holds for the `inDomain.length === 0` fall-through. I'll construct a minimal disk-independent reasoning, then verify the partition order doesn't cause `inDomain` to wrongly become empty.

### Assistant | 2026-06-12T20:03:17.463Z

[tool_use: Bash]

### User | 2026-06-12T20:03:23.316Z

[tool_result] post-DAG ranked: [ 'U-CAM-Y', 'U-MILL-X(B)' ]
alpha domain= mill inDomain= [ 'U-MILL-X(B)' ]
RESULT alpha pick (in-domain): [ { id: 'U-MILL-X', depBlocked: true, slotDomain: 'mill' } ]
NEVER-STRANDED (alpha gets its blocked mill unit, flag preserved)? true

### Assistant | 2026-06-12T20:03:30.637Z

The never-strand property holds end-to-end through the domain filter, and `_depBlocked` survives the spread. Now let me verify the stderr warning fires only when a blocked unit is actually picked (the prompt's question), and check the bound/perf of the unitDeps Map (already confirmed 789 entries — trivially bounded).

Let me also do one final check on a subtle interaction: the `_depBlocked` warning at line 463 fires `if (picks.some((p) => p._depBlocked))`. If a slot picks an in-domain READY unit while blocked units exist further down `ranked`, only the picked unit's flag matters (correct). But there's a subtle case: the `_crossDomain` fallback path (line 416) slices `ranked` (the post-DAG list where ready units come first). So cross-domain fallback also correctly prefers ready units. Let me confirm the warning correctness and then check whether a picked CROSS-DOMAIN unit could be silently dep-blocked too (both flags present — both warnings fire, which is correct).

### Assistant | 2026-06-12T20:03:39.955Z

[tool_use: Bash]

### User | 2026-06-12T20:03:53.046Z

[tool_result] top1 picks= [ 'U-A' ] -> warning fires? false
only-blocked top1= [ 'U-B(B)' ] -> warning fires? true
=== DAG-DISABLE revert: pick parity with flag stripped ===
U-AITRAIN-MILL-FIVE-AXIS-AI-ULTRA-INTELLIGENCE [app-functionality p2] AI-TRAINING-FIRST-MS0 — Train FiveAxisAIUltraIntelligenceEngine on full pre-revenue corpus (JM-DIE 76K + MIT-OCW + v8.89 MIT kernels)  [mill]
U-AITRAIN-MILL-FIVE-AXIS-DEE
... [+599 chars truncated]

### Assistant | 2026-06-12T20:03:59.247Z

All correctness checks pass: the warning fires only when a blocked unit is actually picked, and `PRISM_PQ_DAG_DISABLE=1` produces identical picks (revert works). The alpha pick happens to be the same because those AI-training units have no deps (ready in both modes).

Now let me confirm the **severity of the false-blocking in practice** by checking whether the over-blocking actually changes real pick order for a slot whose top unit is a collision victim. Let me find a slot where the DAG reordering demotes a *falsely*-blocked unit that should be pickable. This determines whether the bug causes real harm (demoting buildable work) vs. being latent.

### Assistant | 2026-06-12T20:04:05.584Z

[tool_use: Bash]

### User | 2026-06-12T20:04:22.228Z

[tool_result] slots where DAG changed the top pick = 0 / 13

### Assistant | 2026-06-12T20:04:29.836Z

Important real-world signal: across all 13 slots, the DAG reordering changes **zero** top picks today, and no slot's lane is entirely blocked. This means the false-blocking is currently **latent** for top-1 picks (the most common usage by Stop hooks and `/pick-unit`). The reason: each slot's highest-ranked unit happens to be dependency-free or have satisfied deps, so the demotion of falsely-blocked units doesn't surface at top-1. But it WILL surface for `--top N` (the topup-slot-queues consumer uses depth), and the moment a slot's ready units are exhausted.

Let me confirm the harm appears at depth, which is the realistic failure surface (`topup-slot-queues.mjs --min-depth 6` consumes deep tails).

### Assistant | 2026-06-12T20:04:35.995Z

[tool_use: Bash]

### User | 2026-06-12T20:04:42.945Z

[tool_result] mike: top20 has 0 _depBlocked unit(s): []
golf: top20 has 0 _depBlocked unit(s): []
hotel: top20 has 0 _depBlocked unit(s): []
GLOBAL top60: _depBlocked count = 0 of 60
  sample blocked ids: []

### Assistant | 2026-06-12T20:04:49.595Z

Interesting — at top-60 global and top-20 per-slot, **zero** `_depBlocked` units surface. This means the ~483 blocked units are ranked so far down (they're mostly `app-functionality` priority-2 with deeper tiebreakers) that they never reach realistic pick depths today. The over-blocking is real in the partition but **practically dormant** at current queue depths.

However, the **dep-key collision** (P0-U01 reused 210×, 34 conflicting dep signatures last-writer-wins) is a latent correctness bomb: it means `depsSatisfied` for ANY phase-letter unit returns an answer derived from an arbitrary unrelated milestone's dep edges. Let me do a final confirmation that the collision actually produces a *wrong* blocked/ready verdict for a real phase-letter unit in the live pool (not just a theoretical contamination).

### Assistant | 2026-06-12T20:04:54.931Z

[tool_use: Bash]

### User | 2026-06-12T20:05:11.333Z

[tool_result] unitDeps["P0-U04"] (last-writer-wins) = [ 'P0-U03' ]
unitDeps["P0-U05"] (last-writer-wins) = [ 'P0-U03' ]
unitDeps["P0-U06"] (last-writer-wins) = [ 'P0-U02' ]
unitDeps["P1-U02"] (last-writer-wins) = [ 'P1-U01' ]
phase-letter units in LIVE consolidated pool = 187
  sample: [
  'P0-U06 @ CC-EXT-MS0',
  'P0-U08 @ CC-EXT-MS0',
  'P0-U06 @ CC-EXT-MS1',
  'P0-U07 @ CC-EXT-MS1',
  'P0-U08 @ CC-EXT-MS1',

... [+75 chars truncated]

### Assistant | 2026-06-12T20:05:55.068Z

Confirmed end-to-end. There are **187 phase-letter units in the live consolidated pool** that the picker actually ranks, and `depsSatisfied` consults a **last-writer-wins collided dep edge** for each — e.g. `P0-U06 @ CC-EXT-MS0`, `P0-U06 @ CC-EXT-MS1`, and `P0-U06 @ CC-EXT-MS2` are three DIFFERENT units that all resolve to the SAME `unitDeps.get("P0-U06") = ["P0-U02"]`, regardless of what each one's own envelope actually declared. The dep check is cross-milestone-contaminated for every one of these 187 units.

I have enough evidence for a complete verdict. Let me compile the findings.

---

## ADVERSARIAL REVIEW VERDICT: U-DAG-PICKER

I read both files end-to-end, traced the new code through `pickNextUnit`'s full tail (partition → slot-ownership filter → domain filter → cross-domain fallback → CLI), and ran the live patched helper against the real 789-edge envelope index and 1295-entry shipped set.

### Never-strand property: HOLDS (the headline safety claim is correct)
Verified end-to-end, not just at the partition:
- **Circular deps** (U-A↔U-B): both land in `blocked`, both remain in `ranked` via `ready.concat(blocked)` — both still pickable (`priority-queue.mjs:385`). Not P0.
- **Typo'd / deleted / never-shipping dep**: unit lands in `blocked`, stays in `ranked`, surfaces when no ready work remains. Not stranded.
- **Entire-lane-blocked**: traced through the domain filter (`:401-416`) — `inDomain` filters by *domain*, not by blocked-status, so a slot whose only in-domain unit is blocked still returns it (`:407-409`); the `inDomain.length===0` fall-through returns the cross-domain slice (`:416`). Confirmed live: a blocked in-domain mill unit is returned with `_depBlocked:true` intact.
- **`_depBlocked` survives all three return-path spreads** — `:390` (no spread), `:408` (`{...u}`), `:416` (`{...u}`). The CLI surfaces it (`:463-465`).
- **stderr warning** fires only when a blocked unit is actually picked (verified: ready-pick→no warning, blocked-pick→warning). Cor
... [+5250 chars truncated]
