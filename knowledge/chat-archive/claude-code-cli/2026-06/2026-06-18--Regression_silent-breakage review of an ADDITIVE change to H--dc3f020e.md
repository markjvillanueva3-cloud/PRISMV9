---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "Regression/silent-breakage review of an ADDITIVE change to H:/prism/scripts/vaul"
date: "2026-06-18"
first_ts: "2026-06-18T00:25:45.522Z"
last_ts: "2026-06-18T00:27:22.969Z"
cwd: "H:\\prism-slot-sierra"
messages: 28
user_msgs: 10
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-ad35312234b5144dd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Regression/silent-breakage review of an ADDITIVE change to H:/prism/scripts/vaul

> **claude-code-cli** | 2026-06-18 | 28 msgs (10 user / 18 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-ad35312234b5144dd.jsonl`

## Transcript

### User | 2026-06-18T00:25:45.522Z

Regression/silent-breakage review of an ADDITIVE change to H:/prism/scripts/vault-link-doctor.mjs (read it end-to-end) + tests H:/prism/scripts/vault-link-doctor.test.mjs.

THE CHANGE (unit U-VAULT-AMBIGUOUS-REVIEW): adds a `--ambiguous` advisory mode that lists broken wikilinks where a real note exists but >1 candidate matches (can't auto-heal, human picks). Three additive edits:
1. classifyBrokenTarget now returns `cands` (the rival note paths) on the ambiguous branch -- was `{cls:"DANGLING", candidates: N}`, now `{cls:"DANGLING", candidates: N, cands}`.
2. diagnose() collects `report.ambiguousLinks` (capped at AMBIG_CAP=1000) -- {from, target, candidates:[paths]} for each ambiguous link.
3. main() gets a `--ambiguous` terminal branch that writes state/shared/vault-ambiguous-links-report.json + prints a sample, then returns. Advisory, never mutates a memo.

VERIFY NO REGRESSION to the existing (committed, working) tool:
1. The `cands` addition to classifyBrokenTarget is purely additive -- confirm the HEALABLE path (cls/to/candidates:1) and DANGLING-no-candidate path are UNCHANGED, and the apply path (applyHeals, which reads c.to / report.healByNote) is unaffected. The HEALABLE heal must still work identically (orphans 16,628->4,245 was the prior result).
2. diagnose's ambiguousLinks collection -- confirm it only fires in the ambiguous (candidates>1) branch, does NOT change healable/dangling/nonNote counts, and the AMBIG_CAP guard prevents unbounded growth. Confirm report.ambiguousLinks is a plain array (serializes in --json without the healByNote-Map problem).
3. The --ambiguous branch: is it correctly placed (after --json early-return, before the default summary)? Does it write only the JSON report (READ-ONLY, never a memo)? Is the write fail-soft (try/catch)? Live run captured 169 ambiguous links -- plausible the count is real (the tool found same-basename dups across memories/reference/ vs memories/galaxies/)?
4. Could the same (from,target) appear twice -- is 
... [+278 chars truncated]

### Assistant | 2026-06-18T00:25:48.324Z

I'll review the additive change to vault-link-doctor.mjs. Let me read both files end-to-end.

### Assistant | 2026-06-18T00:25:48.763Z

[tool_use: Read]

### Assistant | 2026-06-18T00:25:48.867Z

[tool_use: Read]

### User | 2026-06-18T00:25:50.836Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/vault-link-doctor.mjs
3	//
4	// Link-graph DOCTOR for the PRISM Obsidian vault (H:/prism/knowledge): diagnose
5	// every BROKEN [[wikilink]] (an authored link whose target does not resolve to a
6	// note), CLASSIFY it, and SAFELY heal only the high-confidence tier.
7	//
8	// WHY: the vault has ~19.6K broken link instances across ~14.8K notes, which is
9	// the ro
... [+19689 chars truncated]

### User | 2026-06-18T00:25:51.058Z

[tool_result] 1	// Tests for scripts/vault-link-doctor.mjs -- the broken-wikilink classifier+healer.
2	// Pure-function units + a hermetic real-FS vault (tmp) exercising diagnose() +
3	// applyHeals() on real file IO, with mutation-proof rewrite assertions (a mass
4	// vault mutator must never corrupt a note).
5	
6	import { test } from "node:test";
7	import assert from "node:assert/strict";
8	import { mkdtempSy
... [+13708 chars truncated]

### Assistant | 2026-06-18T00:25:53.844Z

Both files read end-to-end. Let me verify the navigator contract that this tool depends on, plus the `--ambiguous` write path placement relative to the `--json` early return.

### Assistant | 2026-06-18T00:25:54.124Z

[tool_use: Read]

### User | 2026-06-18T00:25:55.555Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/obsidian-vault-navigator.mjs
3	//
4	// Filesystem-native NAVIGATION surface for the PRISM Obsidian vault
5	// (H:/prism/knowledge). Gives Claude Code (this CLI) and any PRISM chat the
6	// equivalent of every Obsidian *navigation* core-plugin -- WITHOUT needing the
7	// Obsidian GUI app running (the Local REST API at :27123 is usually DOWN in the
8	// headless fl
... [+27948 chars truncated]

### Assistant | 2026-06-18T00:25:58.678Z

I now have the full picture. Let me verify two specific concerns: the git diff to confirm exactly what changed, and the `report.vaultRoot, ".."` path resolution for the write target.

### Assistant | 2026-06-18T00:26:00.882Z

[tool_use: Bash]

### User | 2026-06-18T00:26:05.368Z

[tool_result] diff --git a/scripts/vault-link-doctor.mjs b/scripts/vault-link-doctor.mjs
index d02ef2f35f..f1060bdd78 100644
--- a/scripts/vault-link-doctor.mjs
+++ b/scripts/vault-link-doctor.mjs
@@ -106,7 +106,7 @@ export function buildSlugIndex(basenameIndex) {
  * @param {string} target  raw wikilink target (alias/heading already stripped)
  * @param {string} fromRel the note the link is in (to exclude self
... [+5090 chars truncated]

### Assistant | 2026-06-18T00:26:15.748Z

The diff confirms exactly the three additive edits described. Let me trace the four specific regression concerns precisely.

**Concern 1 — `cands` addition is purely additive.** In `classifyBrokenTarget` (line 117-120): the `isNonNote`, empty-slug, no-set, and `cands.length === 1` (HEALABLE) branches are byte-identical to before. Only the `cands.length > 1` branch gains the `cands` field. The HEALABLE return still produces `{ cls: "HEALABLE", to: cands[0], candidates: 1 }` — `applyHeals` reads `c.to` via `hm.set(dedupKey, c.to)` (line 230) and `report.healByNote` (line 272), neither touched. Heal path unchanged. ✓

**Concern 2 — `ambiguousLinks` collection.** Lines 235-244: the `report.dangling++` increment fires unconditionally in the else branch exactly as before; `report.ambiguous++` still fires only when `c.candidates > 1`. The new push is *inside* that same `c.candidates > 1` guard and gated by `AMBIG_CAP`. healable/nonNote/dangling counts are arithmetically unchanged. `ambiguousLinks` is a plain array — in `--json`, line 317 destructures out only `healByNote` (the Map), so `ambiguousLinks` serializes fine. ✓

**Concern 3 — `--ambiguous` branch placement.** Line 321, after the `--json` early return (line 316-320), before the default summary (line 346). Write is fail-soft (try/catch, lines 331-338). It writes only the JSON report, never a memo. ✓

Now let me verify the dedup/`seen`-set question (concern 4) and one subtle issue I want to confirm.

### Assistant | 2026-06-18T00:26:17.555Z

[tool_use: Bash]

### User | 2026-06-18T00:26:22.436Z

[tool_result] === seen set scope: per-note (line 213, inside the for-rel loop) ===
1:  for (const rel of model.notes.keys()) {
5:    const seen = new Set();
10:    for (const target of extractWikilinks(stripCode(raw))) {
12:      const dedupKey = normalizeKey(target);
13:      if (seen.has(dedupKey)) continue;
14:      seen.add(dedupKey);
22:        hm.set(dedupKey, c.to);

### Assistant | 2026-06-18T00:26:27.578Z

**Concern 4 — could the same (from, target) appear twice?** The `seen` set is declared per-note (line 213, freshly inside the `for (const rel ...)` loop) and keyed by `dedupKey = normalizeKey(target)`. Within one note, a repeated target is skipped after the first. So for a fixed `from`, each distinct normalized target appears at most once in `ambiguousLinks`. The same *target string* can appear with two *different* `from` values — that is correct (two distinct source notes both carry the same ambiguous link); not a dedup bug. No `(from, target)` duplication. ✓

Now let me sanity-check the live count plausibility (169 ambiguous captured) and confirm the test fixture asserts the real new behavior, then check the one risk I see.

### Assistant | 2026-06-18T00:26:28.275Z

[tool_use: Bash]

### User | 2026-06-18T00:26:31.478Z

[tool_result]   ...
# Subtest: stripCode: blanks fenced + inline code, preserves length; non-string -> ''
ok 17 - stripCode: blanks fenced + inline code, preserves length; non-string -> ''
  ---
  duration_ms: 0.0878
  ...
# Subtest: diagnose: a broken link ONLY inside code is NOT HEALABLE (converges with apply)
ok 18 - diagnose: a broken link ONLY inside code is NOT HEALABLE (converges with apply)
  ---
  dura
... [+332 chars truncated]

### Assistant | 2026-06-18T00:26:34.170Z

All 19 tests pass. Let me verify the two test additions actually exercise the new behavior (not stub assertions) and confirm the live `--ambiguous` run is non-mutating by checking the write target and whether it could collide with anything.

### Assistant | 2026-06-18T00:26:36.475Z

[tool_use: Bash]

### User | 2026-06-18T00:26:39.895Z

[tool_result] === existing report file? ===
-rw-r--r-- 1 wompu 197611 62693 Jun 17 19:25 state/shared/vault-ambiguous-links-report.json
=== is state/shared/ a real writable dir? ===
state/shared/
EXISTS
=== any peer file named similarly that could be clobbered? ===
state/shared/vault-ambiguous-links-report.json
state/shared/vault-rot-report.json

### Assistant | 2026-06-18T00:26:44.317Z

The report was already written by the live run (62KB). The write target is a fixed, uniquely-named file with no peer collision. Let me confirm the live report's shape matches the code (and that 169 is plausible) and check the one subtle concern: the `stamp` variable is computed but the filename is *not* timestamped — meaning each `--ambiguous` run overwrites the prior report (intended for an advisory, but worth confirming it doesn't shadow the `--apply` backup naming).

### Assistant | 2026-06-18T00:26:48.170Z

[tool_use: Bash]

### User | 2026-06-18T00:26:51.912Z

[tool_result] keys: generatedAt,vaultRoot,notes,ambiguousTotal,captured,links
ambiguousTotal: 169 captured: 169 links.length: 169
first link shape: {"from":"memories/feedback/feedback_stale_slot_build_break_escalate_resync.md","target":"feedback-foxtrot-galaxy-recover-not-rebuild","candidates":["memories/feedback/feedback_foxtrot_galaxy_recover_not_rebuild.md","memories/galaxies/mill/feedback_foxtrot_galaxy_rec
... [+98 chars truncated]

### Assistant | 2026-06-18T00:26:57.026Z

Live data confirms every claim:
- 169 ambiguous, 169 captured (well under `AMBIG_CAP=1000`), `links.length` matches.
- The first link is a textbook same-basename dup: `feedback_foxtrot_galaxy_recover_not_rebuild.md` exists in BOTH `memories/feedback/` and `memories/galaxies/mill/` — exactly the cross-directory dup the unit description predicted. The 169 count is real, not inflated.
- **Zero** exact `(from, target)` duplicates — the per-note `seen` set works correctly.
- Every captured link has ≥2 candidates — the `candidates > 1` invariant holds.

Let me confirm the two test additions are real assertions (not stubs) and check whether the report file is gitignored (a stray untracked artifact would otherwise be a hygiene concern, though out of scope for regression).

### Assistant | 2026-06-18T00:26:58.840Z

[tool_use: Bash]

### User | 2026-06-18T00:27:02.047Z

[tool_result] === is the new report gitignored (won't pollute git status)? ===
NOT-IGNORED (would show in git status)
=== git status sees it? ===
?? state/shared/vault-ambiguous-links-report.json

### Assistant | 2026-06-18T00:27:22.969Z

Confirmed: the report artifact is **not** gitignored and appears as untracked in `git status`. The sibling `vault-rot-report.json` is also untracked (same class), so this is consistent with the existing convention for this tool's advisory outputs — but it does add a new untracked file. This is a P2 hygiene note, not a regression.

I have everything needed. Let me finalize the verdict.

---

VERDICT: PASS

summary: The change is genuinely additive — `classifyBrokenTarget`'s HEALABLE / NON_NOTE / empty-slug / no-candidate branches and the `applyHeals` heal path (which reads `c.to` / `report.healByNote`) are byte-for-byte unchanged, so the prior 16,628→4,245 orphan heal still works identically. The new `ambiguousLinks` collection lives entirely inside the pre-existing `candidates > 1` guard (gated by `AMBIG_CAP=1000`) and does not perturb healable/dangling/nonNote/ambiguous counts; the `--ambiguous` branch is correctly placed after the `--json` early return and before the default summary, writes only a fail-soft JSON report, and never mutates a memo. Live run (169 ambiguous, all real same-basename cross-directory dups, zero `(from,target)` duplicates, every link ≥2 candidates) and 19/19 tests corroborate every claim.

findings:
- [P2] `scripts/vault-link-doctor.mjs:325` — the `stamp` variable in the `--ambiguous` branch is computed (`const stamp = new Date()...`) and stored in the payload as `generatedAt`, but unlike the `--apply` branch (line 366-369) the *filename* is fixed (`vault-ambiguous-links-report.json`), so each run overwrites the prior report rather than versioning it. This is intentional for an advisory (last-run-wins, matches sibling `vault-rot-report.json`) and `generatedAt` inside the payload preserves the timestamp — no fix needed, noted only so a future reader doesn't mistake the unused-looking parallel with `--apply` for a bug.
- [P2] `scripts/vault-link-doctor.mjs:326` / `state/shared/vault-ambiguous-links-report.json` — the report is written but is 
... [+1982 chars truncated]
