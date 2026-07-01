---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "PRISM per-file scrutiny ARM A. Review the UNCOMMITTED change in worktree H:/pris"
date: "2026-06-17"
first_ts: "2026-06-17T02:43:53.685Z"
last_ts: "2026-06-17T02:49:50.822Z"
cwd: "H:\\prism-slot-sierra"
messages: 69
user_msgs: 25
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-aed698290392aeb72.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# PRISM per-file scrutiny ARM A. Review the UNCOMMITTED change in worktree H:/pris

> **claude-code-cli** | 2026-06-17 | 69 msgs (25 user / 44 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-aed698290392aeb72.jsonl`

## Transcript

### User | 2026-06-17T02:43:53.685Z

PRISM per-file scrutiny ARM A. Review the UNCOMMITTED change in worktree H:/prism (branch cad-fusion-live-ms0). Grade PASS or FAIL with P0/P1/P2 + file:line. Inspect via `cd /h/prism && git status` and `git diff` on these files.

CHANGE (vault hardening, slot:sierra — extends the prior U-VAULT-PROMOTE-GATE-HARDEN): excludes ephemeral run-log memories from Obsidian->wiki promotion via a new `run_log` frontmatter convention.
Files:
1. scripts/promote-memory-to-wiki.mjs — `nonPromotableReason(fm)` now returns "run-log" when `fm.run_log` is YAML-truthy (3rd exclusion class after node-pointer + unverified-advisory). Doc comment updated.
2. scripts/nn-feedback-to-memory.mjs — the generator now emits `run_log: true` in the frontmatter of every NN-GRAPH retrain memory it writes.
3. 31 files: knowledge/memories/reference/reference_nn_retrain_*.md — BACKFILLED with `run_log: true` (one was CRLF, EOL-preserved).
4. test files for both scripts.

VERIFY:
- Correctness of the run_log exclusion + placement (after the advisory check, before `return null`); does it reuse the existing `truthy()` helper correctly?
- The 31-file backfill: confirm ALL 31 now have `run_log: true` under metadata, none double-inserted, the CRLF file's line endings are intact (not mixed LF into a CRLF file). Run: `cd /h/prism && for f in knowledge/memories/reference/reference_nn_retrain_*.md; do grep -c "run_log: true" "$f"; done | sort | uniq -c` (expect all =1). Check the CRLF one (reference_nn_retrain_2026_05_18_2358.md) with `file` or `cat -A` for consistent EOL.
- Generator: is `run_log: true` correctly placed in the YAML and does it not break the existing YAML-injection-safety guard?
- Live claim: dry-run 17->6 candidates, 0 nn_retrain. Confirm by running `node scripts/promote-memory-to-wiki.mjs` in /h/prism.
- Any over-exclusion (a genuine memory wrongly carrying run_log)? Any regression to node-pointer/advisory exclusions?
Report PASS/FAIL + findings.

### Assistant | 2026-06-17T02:43:56.336Z

I'll review this change systematically. Let me start by inspecting the git status and diffs.

### Assistant | 2026-06-17T02:43:57.280Z

[tool_use: Bash]

### Assistant | 2026-06-17T02:43:57.793Z

[tool_use: Bash]

### User | 2026-06-17T02:44:02.952Z

[tool_result] <persisted-output>
Output too large (2.4MB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-sierra\dc3f020e-9a94-4310-adf2-a60d9533cfec\tool-results\bkssrm9a2.txt

Preview (first 2KB):
On branch cad-fusion-live-ms0
Your branch is ahead of 'origin/cad-fusion-live-ms0' by 4063 commits.
  (use "git push" to publish your local commits)

Cherry-pick currently in progress.
  (run "g
... [+1779 chars truncated]

### User | 2026-06-17T02:44:06.489Z

[tool_result] diff --git a/scripts/nn-feedback-to-memory.mjs b/scripts/nn-feedback-to-memory.mjs
index d5f18d8ff0..86bc789f0f 100644
--- a/scripts/nn-feedback-to-memory.mjs
+++ b/scripts/nn-feedback-to-memory.mjs
@@ -125,6 +125,7 @@ name: ${name}
 description: ${description}
 metadata:
   type: reference
+  run_log: true
 ---
 
 # NN-GRAPH retrain round — ${ts}
diff --git a/scripts/promote-memory-to-wiki.mjs b/
... [+2203 chars truncated]

### Assistant | 2026-06-17T02:44:08.920Z

The diff for the two scripts is clean. Let me investigate the rest of the change in parallel: the full script context around the change, the YAML-injection guard, the test files, and the 31 backfilled memory files.

### Assistant | 2026-06-17T02:44:11.743Z

[tool_use: Bash]

### Assistant | 2026-06-17T02:44:12.561Z

[tool_use: Bash]

### User | 2026-06-17T02:44:16.079Z

[tool_result]  M knowledge/memories/reference/reference_nn_retrain_2026_05_18_2358.md
 M knowledge/memories/reference/reference_nn_retrain_2026_05_22_0445.md
 M knowledge/memories/reference/reference_nn_retrain_2026_05_22_1805.md
 M knowledge/memories/reference/reference_nn_retrain_2026_05_23_0430.md
 M knowledge/memories/reference/reference_nn_retrain_2026_05_24_0133.md
 M knowledge/memories/reference/referenc
... [+2024 chars truncated]

### User | 2026-06-17T02:44:21.569Z

[tool_result]      31 1

### Assistant | 2026-06-17T02:44:25.479Z

Important finding on file accounting: 31 total `reference_nn_retrain_*.md` files. But only **18** are tracked-modified (`M`), and **13** are **untracked** (`??`). The task description says "31 files ... BACKFILLED with `run_log: true`". Let me verify the untracked ones aren't pre-existing-but-untracked vs. newly authored, and confirm the backfill count claim. All 31 have exactly `run_log: true` =1, which is the key correctness invariant. Let me dig into the placement, the CRLF file, the YAML guard, and the test files.

### Assistant | 2026-06-17T02:44:27.335Z

[tool_use: Bash]

### Assistant | 2026-06-17T02:44:28.561Z

[tool_use: Bash]

### User | 2026-06-17T02:44:30.668Z

[tool_result] === CRLF file EOL check (2026_05_18_2358) ===
knowledge/memories/reference/reference_nn_retrain_2026_05_18_2358.md: Unicode text, UTF-8 text, with CRLF line terminators
--- cat -A head ---
---^M$
name: nn-retrain-2026-05-18-2358^M$
description: GNN tier-5 retrain 2026-05-18T23:58:23.179Z M-bM-^@M-^T AUROC n/a M-BM-7 macroF1 n/a M-BM-7 Brier n/a M-BM-7 not-promoted^M$
metadata:^M$
  type: reference
... [+705 chars truncated]

### User | 2026-06-17T02:44:34.361Z

[tool_result] === diff of CRLF backfill file ===
warning: in the working copy of 'knowledge/memories/reference/reference_nn_retrain_2026_05_18_2358.md', CRLF will be replaced by LF the next time Git touches it
diff --git a/knowledge/memories/reference/reference_nn_retrain_2026_05_18_2358.md b/knowledge/memories/reference/reference_nn_retrain_2026_05_18_2358.md$
index 008d629575..9de8570465 100644$
--- a/knowled
... [+448 chars truncated]

### Assistant | 2026-06-17T02:44:39.244Z

The CRLF file is fully consistent — every line including the new `  run_log: true^M$` carries the `^M$` CRLF terminator. No mixed LF was introduced. (There is a git warning that CRLF will be normalized to LF on next git touch, but that's a pre-existing repo-attribute condition, not something this change introduced — the working-copy file itself is clean CRLF.)

Now let me verify the placement of `run_log: true` is consistently under `metadata:` across all 31 files, check a couple of the untracked (newly authored) ones, and inspect the YAML guard + full `nonPromotableReason` context.

### Assistant | 2026-06-17T02:44:41.598Z

[tool_use: Bash]

### Assistant | 2026-06-17T02:44:43.164Z

[tool_use: Bash]

### User | 2026-06-17T02:44:45.592Z

[tool_result] === context line BEFORE each run_log: true (should be 'type: reference' under metadata) ===
     31   type: reference
=== indentation check: run_log must be 2-space indented (under metadata) ===
     31   run_log: true

### User | 2026-06-17T02:44:50.093Z

[tool_result] === sample untracked (newly authored) file head ===
---
name: nn-retrain-2026-06-15-1433
description: GNN tier-5 retrain 2026-06-15T14:33:53.744Z — AUROC 0.4286 · macroF1 0.1053 · Brier 0.2557 · not-promoted
metadata:
  type: reference
  run_log: true
---

=== EOL of an untracked file ===
knowledge/memories/reference/reference_nn_retrain_2026_06_15_1433.md: Unicode text, UTF-8 text

### Assistant | 2026-06-17T02:44:56.624Z

All 31 files have `run_log: true` exactly once, 2-space indented under `metadata:`, immediately after `type: reference`. No double-insertion, no malformed placement. The untracked files (emitted by the updated generator) carry it natively, confirming the generator change works end-to-end.

Now let me examine the full `nonPromotableReason` function context, the parser/YAML guard, and how `fm.run_log` actually gets populated from the frontmatter (does the parser even read nested `metadata.run_log` vs top-level?). This is the critical correctness question.

### Assistant | 2026-06-17T02:44:56.800Z

[tool_use: Read]

### User | 2026-06-17T02:44:57.224Z

[tool_result] read-once-guard: 'H:\prism\scripts\promote-memory-to-wiki.mjs' was already read 26s ago in this session and is unchanged (mtime 1781664028443). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T02:45:01.374Z

The read-once guard thinks I've read it, but I've only seen the diff. Let me read the frontmatter parser section specifically — this is the load-bearing question: does the parser flatten `metadata.run_log` into `fm.run_log`?

### Assistant | 2026-06-17T02:45:03.743Z

[tool_use: Bash]

### User | 2026-06-17T02:45:07.980Z

[tool_result] === frontmatter parser in promote-memory-to-wiki.mjs ===
25://      --json, --min-refs N, --min-age N, --limit N. Default = dry-run.
73:// Handles flat `type: reference` and nested `metadata:\n  type: reference`,
75:export function parseMemoryFrontmatter(raw) {
114:  if (fm && typeof fm.type === "string" && fm.type) return fm.type.toLowerCase();
119:// and aliases -- each normalized. Used to attri
... [+1805 chars truncated]

### Assistant | 2026-06-17T02:45:14.014Z

This is the critical correctness path. Line 73 comment says the parser "Handles flat `type: reference` and nested `metadata:\n type: reference`". I need to see how `parseMemoryFrontmatter` flattens nested `metadata.*` to top-level `fm.*`, because the backfill writes `run_log: true` *under* `metadata:`, but `nonPromotableReason` reads `fm.run_log` (top-level). Let me read the parser body.

### Assistant | 2026-06-17T02:45:14.414Z

[tool_use: Read]

### User | 2026-06-17T02:45:15.280Z

[tool_result] 73	// Handles flat `type: reference` and nested `metadata:\n  type: reference`,
74	// plus `aliases: [..]`. Nested keys are flattened (first writer wins).
75	export function parseMemoryFrontmatter(raw) {
76	  if (typeof raw !== "string") return null;
77	  const text = raw.replace(/^﻿/, "");
78	  if (!text.startsWith("---")) return { fm: {}, body: text };
79	  const end = text.indexOf("\n---", 3);

... [+4551 chars truncated]

### Assistant | 2026-06-17T02:45:20.591Z

The parser is confirmed correct for this use. Line 84-99: it iterates **every** line in the frontmatter blob with a regex that ignores leading whitespace (`^\s*`), so a nested key like `  run_log: true` is matched and flattened to top-level `fm.run_log = "true"` ("first writer wins"). Since `run_log` appears only once (under metadata), `fm.run_log === "true"` (string), and `truthy("true")` returns `true`. The exclusion fires correctly.

Placement of the new check is correct: after the `advisoryOnly`/`mustHumanVerify` check, before `return null`, reusing the existing `truthy()` helper. No regression to node-pointer (line 150) or advisory (line 156) — they're untouched and execute first.

Now let me verify there's no YAML-injection-safety concern in the generator and check the test files.

### Assistant | 2026-06-17T02:45:22.209Z

[tool_use: Bash]

### User | 2026-06-17T02:45:26.658Z

[tool_result] === generator frontmatter region + injection guard ===
1:#!/usr/bin/env node
3: * nn-feedback-to-memory.mjs — ECHO-UNDONE H4 / U-NEURAL-FEEDBACK-LOOP.
5: * Closes the learning loop for the GraphSAGE tier-5 wiring classifier: every
6: * NN retrain ROUND that actually trained + evaluated emits a durable,
7: * verifiable memory entry. Without this, retrain telemetry only ever lived in
8: * a JSONL le
... [+2668 chars truncated]

### Assistant | 2026-06-17T02:45:30.314Z

Let me see the actual frontmatter template construction (around line 120-140) to confirm the YAML-injection guard handles `description` (which contains free text) and that `run_log: true` is a static literal placed safely.

### Assistant | 2026-06-17T02:45:30.827Z

[tool_use: Read]

### User | 2026-06-17T02:45:31.636Z

[tool_result] 95	 * Pure — no I/O, deterministic from the round object.
96	 */
97	export function renderMemoryEntry(round) {
98	  // ts drives the slug/filename; tsSlug already regex-validates it. Keep a
99	  // newline-stripped copy for the human-facing interpolations.
100	  const ts = oneLine(round.ts);
101	  const slug = tsSlug(round.ts);
102	  const name = `nn-retrain-${slug}`;
103	  const filename = `refer
... [+3197 chars truncated]

### Assistant | 2026-06-17T02:45:35.624Z

`run_log: true` (line 128) is a static literal, statically placed under `metadata:` between `type: reference` and `---`. No interpolated/untrusted value touches it, so it cannot break the YAML-injection guard. The only interpolated frontmatter value is `description` (line 125), which is built from `oneLine(...)`-sanitized inputs (`ts`, `action` all run through `oneLine`) — that guard is pre-existing and unchanged. The `run_log` addition introduces no new injection surface.

Now the test files and the live dry-run claim.

### Assistant | 2026-06-17T02:45:36.960Z

[tool_use: Bash]

### User | 2026-06-17T02:45:40.749Z

[tool_result] === promote test diff ===
diff --git a/scripts/promote-memory-to-wiki.test.mjs b/scripts/promote-memory-to-wiki.test.mjs
index 2ea7a8f9c2..ca04ef416d 100644
--- a/scripts/promote-memory-to-wiki.test.mjs
+++ b/scripts/promote-memory-to-wiki.test.mjs
@@ -109,6 +109,13 @@ test("nonPromotableReason: a clean knowledge atom is promotable (null) -- no ove
   assert.equal(nonPromotableReason({ type: "refe
... [+3096 chars truncated]

### Assistant | 2026-06-17T02:45:48.181Z

The tests are real, intent-verifying (R9):
- Unit test exercises YAML-truthy spellings (`true`/`"true"`/`"1"` → "run-log") AND the falsy boundary (`false`/`"0"` → null) — proving the guard doesn't over-exclude.
- Integration test `runMemoryPromotion` mirrors the real failure mode: `run_log:true`, type=reference, refs inflated by an index hub, old — and asserts `skippedNonPromotable===1`, `promoted===0`, `written.length===0`. This is exactly the scenario the change exists to prevent. Note it writes `run_log: true` at top-level here, which the parser also handles (flat form), so the test is valid for both flat and nested.
- Generator test asserts `run_log: true` is emitted in the markdown.

Now let me run both test suites and the live dry-run to confirm the claim (17→6, 0 nn_retrain).

### Assistant | 2026-06-17T02:45:49.525Z

[tool_use: Bash]

### User | 2026-06-17T02:45:54.064Z

[tool_result] === promote tests ===
  ...
# Subtest: runMemoryPromotion: a self-referencing memory does not count itself
ok 32 - runMemoryPromotion: a self-referencing memory does not count itself
  ---
  duration_ms: 1.9412
  ...
1..32
# tests 32
# suites 0
# pass 32
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 110.6727
=== nn-feedback tests ===
  ...
# Subtest: computeNewEntries: idempotency — se
... [+258 chars truncated]

### Assistant | 2026-06-17T02:45:56.657Z

Both suites green: promote 32/32, nn-feedback 15/15. Now the live dry-run to verify the candidate-set claim and that 0 nn_retrain memories appear.

### Assistant | 2026-06-17T02:45:57.286Z

[tool_use: Bash]

### User | 2026-06-17T02:45:58.181Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 74532 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 60s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-m
... [+520 chars truncated]

### Assistant | 2026-06-17T02:46:04.346Z

That was a hook-injected MCP-disconnect notice (a pre-tool block message), not the script's output — the script didn't run. The MCP bridge being down is irrelevant to this read-only standalone script. Let me retry.

### Assistant | 2026-06-17T02:46:04.681Z

[tool_use: Bash]

### User | 2026-06-17T02:46:11.838Z

[tool_result] [promote-memory-to-wiki] minRefs=3 minAge=7d memories=19534 malformed=0 skipNonProm=12924 skipType=402 belowRefs=5415 belowAge=732 skipExisting=55 WOULD PROMOTE=6 elapsed=2506ms
  (sample of first 8 candidates:)
    feedback_d2_bom_smoke.md (refs 11, age 24d) -> lessons/feedback_d2_bom_smoke.md
    feedback_d2_smoke.md (refs 11, age 24d) -> lessons/feedback_d2_smoke.md
    reference_forge_audit_to
... [+535 chars truncated]

### Assistant | 2026-06-17T02:46:15.902Z

Live dry-run confirms: **WOULD PROMOTE=6**, and the 6 candidates are listed in full — **zero** `nn_retrain` memories among them. `skipNonProm=12924` (the exclusion class now catches run-logs too). Let me directly confirm the run-log exclusion is firing on the actual nn_retrain files (and that the "0 nn_retrain in candidates" isn't merely because they fall below refs/age — i.e., prove the new gate is load-bearing, not redundant).

### Assistant | 2026-06-17T02:46:20.135Z

[tool_use: Bash]

### User | 2026-06-17T02:46:25.604Z

[tool_result] nn_retrain files: 31
excluded-as-run-log: 31
excluded-other: 0
PROMOTABLE (BAD if >0): 0
reason breakdown: {"run-log":31}

### Assistant | 2026-06-17T02:46:30.720Z

Definitive proof: all 31 nn_retrain files are excluded **specifically as "run-log"** (not as a side-effect of refs/age/node-pointer). The new gate is load-bearing — every one of them resolves through the new code path I'm reviewing. (The "destructive command" warning is a false positive from the heredoc-detection regex; the `node -e` script is pure read-only — `readFileSync` only.)

Now let me check for over-exclusion blast radius: does any **non-nn_retrain, genuine** memory anywhere in the vault now carry a `run_log` key that would wrongly get excluded?

### Assistant | 2026-06-17T02:46:32.139Z

[tool_use: Grep]

### Assistant | 2026-06-17T02:46:33.846Z

[tool_use: Bash]

### User | 2026-06-17T02:46:36.866Z

[tool_result] Found 33 files
H:\prism\knowledge\memories\galaxies\system-viz\reference_sierra_vault_promote_gate_harden_2026_06_16.md
H:\prism\knowledge\memories\reference\reference_sierra_vault_promote_gate_harden_2026_06_16.md
H:\prism\knowledge\memories\reference\reference_nn_retrain_2026_05_18_2358.md
H:\prism\knowledge\memories\reference\reference_nn_retrain_2026_06_15_1433.md
H:\prism\knowledge\memories\r
... [+2232 chars truncated]

### User | 2026-06-17T02:46:44.082Z

[tool_result] === run_log usage across ALL memory dirs (C: auto-memory + H: vault) ===
knowledge/memories/galaxies/system-viz/reference_sierra_vault_promote_gate_harden_2026_06_16.md
knowledge/memories/reference/reference_sierra_vault_promote_gate_harden_2026_06_16.md
--- count non-nn_retrain files carrying run_log ---
2

### Assistant | 2026-06-17T02:46:48.281Z

Only 2 non-nn_retrain files contain the string `run_log`, and both are `reference_sierra_vault_promote_gate_harden_*` — these are the sierra memory files *documenting this very change* (the prior U-VAULT-PROMOTE-GATE-HARDEN). Let me confirm they mention `run_log` only in prose, not as a frontmatter key that would wrongly exclude them.

### Assistant | 2026-06-17T02:46:50.259Z

[tool_use: Bash]

### User | 2026-06-17T02:46:56.381Z

[tool_result] === Does the sierra harden-doc memory carry run_log as a FRONTMATTER key? ===
60:  `run_log: true` frontmatter). Not fixed here (out of scope).
--- frontmatter head ---
---
name: reference_sierra_vault_promote_gate_harden_2026_06_16
description: "Sierra hardened the Obsidian->wiki promotion gate (promote-memory-to-wiki.mjs) so the freeze-disabled vault-promotion cron will not bloat the canonical w
... [+1031 chars truncated]

### Assistant | 2026-06-17T02:47:00.960Z

Confirmed no over-exclusion: the `run_log` mention in the sierra doc-memory is in **prose at line 60** (describing the change), not a frontmatter key. Its frontmatter has no `run_log:` key, so `nonPromotableReason` returns null for it (it remains promotable on its own merits) — the new gate does not wrongly catch the documentation of itself.

One last check: verify the new test's `skippedNonPromotable` field name matches what `runMemoryPromotion` actually returns (the test asserts `r.skippedNonPromotable`), and confirm no other consumer of `nonPromotableReason` exists that could be affected.

### Assistant | 2026-06-17T02:47:02.921Z

[tool_use: Bash]

### User | 2026-06-17T02:49:16.999Z

[tool_result] === consumers of nonPromotableReason ===
scripts/promote-memory-to-wiki.mjs:148:export function nonPromotableReason(fm) {
scripts/promote-memory-to-wiki.mjs:249:    totalMemories: 0, malformed: 0, skippedNonPromotable: 0, skippedType: 0, belowRefs: 0, belowAge: 0,
scripts/promote-memory-to-wiki.mjs:292:    // or explicitly-unverified content, however popular+old (see nonPromotableReason).
scripts/
... [+1957 chars truncated]

### Assistant | 2026-06-17T02:49:20.600Z

The only real external consumer is `scripts/vault-rot-sentinel.mjs`. Let me confirm it imports `nonPromotableReason` and that the new "run-log" return value doesn't break its handling (e.g., if it switches on specific reason strings).

### Assistant | 2026-06-17T02:49:22.339Z

[tool_use: Bash]

### User | 2026-06-17T02:49:22.934Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 74532 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 83s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-m
... [+520 chars truncated]

### Assistant | 2026-06-17T02:49:25.137Z

Another spurious MCP-disconnect block (the script didn't run). Retrying with Grep instead.

### Assistant | 2026-06-17T02:49:26.240Z

[tool_use: Grep]

### User | 2026-06-17T02:49:29.723Z

[tool_result] 12:// extraction + normId from promote-memory-to-wiki.mjs so there is ONE source of
26:import { extractWikilinkTargets, normId } from "./promote-memory-to-wiki.mjs";

### Assistant | 2026-06-17T02:49:50.822Z

`vault-rot-sentinel.mjs` only imports `extractWikilinkTargets` and `normId` — **not** `nonPromotableReason`. So the new "run-log" return value has zero blast radius on the only external consumer. The only caller of `nonPromotableReason` is line 293 inside the same script, which treats any truthy return as "skip" (`if (nonPromotableReason(...)) { report.skippedNonPromotable++; continue; }`) — it doesn't switch on the specific string, so adding "run-log" is fully backward-compatible.

I have completed a thorough trace. All verification points pass.

---

VERDICT: PASS

summary: The `run_log` exclusion is correctly implemented, placed (after the advisory check, before `return null` at line 160), and reuses the existing `truthy()` helper so all YAML-truthy spellings exclude while falsy/absent still promote. The nested-`metadata.run_log` frontmatter is correctly flattened by `parseMemoryFrontmatter` (whitespace-tolerant regex, line 84-99), so the gate fires on all 31 nn_retrain files. No silent breakage to the two pre-existing exclusion classes, no over-exclusion of genuine memories, and the only external importer (`vault-rot-sentinel.mjs`) doesn't consume the changed function.

findings: none

Consumers / edge-paths traced (auditable):
- **Parser flattening** (`scripts/promote-memory-to-wiki.mjs:84-99`): nested `  run_log: true` under `metadata:` is matched by `^\s*([A-Za-z_][\w-]*):` and flattened to top-level `fm.run_log="true"`; `truthy("true")===true`. Verified live against all 31 files — `nonPromotableReason` returns "run-log" for **31/31**, 0 promotable, breakdown `{"run-log":31}`.
- **Placement / no regression** (`:148-161`): node-pointer (`:150`) and unverified-advisory (`:156`) checks execute before the new `:160` run-log check, both untouched. Live dry-run: `WOULD PROMOTE=6`, `skipNonProm=12924`, 0 nn_retrain in the 6 listed candidates.
- **Over-exclusion sweep**: grepped all of `knowledge/memories` — only 2 non-nn_retrain files mention `run_log`, both `refere
... [+2077 chars truncated]
