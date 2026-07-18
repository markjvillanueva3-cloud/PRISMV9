---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "Review U-VAULT-LINK-HEAL (PRISM, slot:sierra) — recalibrated the broken-wikilink"
date: "2026-06-08"
first_ts: "2026-06-08T16:39:32.271Z"
last_ts: "2026-06-08T16:43:21.290Z"
cwd: "H:\\prism"
messages: 46
user_msgs: 16
assistant_msgs: 30
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-a28fabd8cb72181dd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# Review U-VAULT-LINK-HEAL (PRISM, slot:sierra) — recalibrated the broken-wikilink

> **claude-code-cli** | 2026-06-08 | 46 msgs (16 user / 30 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-a28fabd8cb72181dd.jsonl`

## Transcript

### User | 2026-06-08T16:39:32.271Z

Review U-VAULT-LINK-HEAL (PRISM, slot:sierra) — recalibrated the broken-wikilink fix scorer. Files:
1. `H:/prism/scripts/wiki-link-fix-suggester.mjs` — `scoreCandidate(brokenNormalized, candidateSlug)` rewritten (~line 154).
2. `H:/prism/scripts/__tests__/wiki-link-fix-suggester.test.mjs` — updated scorer tests (40 tests, all passing via `node --test`).

THE BUG FIXED: the old scorer returned 0.85-0.95 for a bare prefix/substring relationship, putting ~91% (14,100 of 15,410) of broken links ABOVE the 0.85 auto-apply floor. A short token like `echo` is a substring of dozens of unrelated slugs → auto-applying would corrupt links wholesale. The pipeline (suggester→apply) already exists + has 3 scheduled tasks; only the scorer was unsafe.

THE FIX: exact=1.0 (auto-apply OK); Levenshtein ≤2 edits on short slugs → 0.92/0.86 (auto-apply OK, real typo); prefix/substring → 0.70 MEDIUM (operator-review, NOT auto-apply); 3-edit → 0.62 low; decay otherwise. Live dry-run over 500 links: autoApplyCount dropped to 178 (was ~455 under old scorer); 303 moved to medium-review.

Read both files. Verify, weighted toward correctness + silent-regression:
1. Is the new scoring monotonic + sensible? Could any input score ABOVE 0.85 that ISN'T an exact-or-tight-edit match (i.e. can a substring leak into auto-apply)? Trace the branch order — does the Levenshtein-≤2 check correctly run BEFORE the structural check so a 1-edit match isn't mis-scored as structural?
2. Is the 0.70 structural cap truly below the 0.85 floor for ALL four structural directions?
3. Edge cases: empty/null, very long slugs (maxLen guards), dist exactly 2 vs 3 boundary.
4. Do the tests ENCODE the safety invariant (the `echo` adversarial case asserts <0.85)? Would they FAIL if someone reverted to the over-confident scorer? Any trivially-true assertion?
5. Does the change touch ONLY scoreCandidate, or did it break rankCandidates/classifyConfidence/buildSummary callers (e.g. confidence bands, autoApplyEligible computation)?
... [+274 chars truncated]

### Assistant | 2026-06-08T16:39:44.548Z

I'll review U-VAULT-LINK-HEAL by reading both files carefully, with focus on the safety invariant (no substring leak into auto-apply) and silent-regression risk.

### Assistant | 2026-06-08T16:39:45.562Z

[tool_use: Read]

### Assistant | 2026-06-08T16:39:45.632Z

[tool_use: Read]

### User | 2026-06-08T16:39:48.141Z

[tool_result] read-once-guard: 'H:\prism\scripts\wiki-link-fix-suggester.mjs' was already read 3s ago in this session and is unchanged (mtime 1780936487942). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-08T16:39:48.235Z

[tool_result] read-once-guard: 'H:\prism\scripts\__tests__\wiki-link-fix-suggester.test.mjs' was already read 3s ago in this session and is unchanged (mtime 1780936551003). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### Assistant | 2026-06-08T16:39:53.356Z

The read-once guard says I already have these in context, but I don't see the file contents in my actual context — the guard is mistaken about my having the content. Let me force a fresh read by disabling the cache.

### Assistant | 2026-06-08T16:39:54.612Z

[tool_use: Bash]

### User | 2026-06-08T16:39:58.333Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * COMBO-EFFICIENCY-MS0 / P1-U02 — Wiki↔Memory link fix suggester.
     4	 *
     5	 * Reads:   state/shared/.knowledge-link-audit.json (broken[] array)
     6	 * Writes:  state/shared/wiki-link-fix-candidates.json
     7	 *
     8	 * For each broken `[[name]]` token, find the nearest-match wiki/memory
     9	 * file by normalized-slug similarity, score
... [+14028 chars truncated]

### Assistant | 2026-06-08T16:40:02.836Z

Now let me read the rest of the I/O wrapper to confirm the scorer change doesn't arm any auto-apply, and that callers are intact.

### Assistant | 2026-06-08T16:40:03.968Z

[tool_use: Bash]

### User | 2026-06-08T16:40:09.261Z

[tool_result]    300	// ─── I/O wrapper ───────────────────────────────────────────────────────────
   301	
   302	const DEFAULT_AUDIT = "state/shared/.knowledge-link-audit.json";
   303	const DEFAULT_WIKI  = "knowledge/wiki";
   304	const DEFAULT_MEM   = "knowledge/memories";
   305	const DEFAULT_OUT   = "state/shared/wiki-link-fix-candidates.json";
   306	
   307	function safeReadJson(p) {
   308	  try { retu
... [+4726 chars truncated]

### Assistant | 2026-06-08T16:40:13.248Z

I have the full source. Now let me read the test file.

### Assistant | 2026-06-08T16:40:13.902Z

[tool_use: Bash]

### User | 2026-06-08T16:40:20.726Z

[tool_result]      1	/**
     2	 * Tests for COMBO-EFFICIENCY-MS0 / P1-U02 wiki-link-fix-suggester.mjs.
     3	 *
     4	 * Coverage:
     5	 *   - slugify: lowercase + replace + collapse
     6	 *   - levenshtein: identical/empty/single-edit/large-distance + adversarial
     7	 *   - scoreCandidate: exact / prefix / substring / levenshtein / decay
     8	 *   - rankCandidates: top-K ordering, noise-floor cutof
... [+17543 chars truncated]

### Assistant | 2026-06-08T16:40:37.964Z

I have both files in full. Now let me trace the critical correctness questions carefully.

**Reviewer question 1 — branch order & substring leak.** Trace `scoreCandidate`:
1. type guard → 0
2. `===` exact → 1.0
3. empty-slug → 0
4. compute `dist`, `maxLen`
5. `dist===0` defensive → 1.0
6. **`dist <= 2 && maxLen <= 48`** → 0.92/0.86 (auto-apply OK) ← runs BEFORE structural ✓
7. structural prefix/substring → 0.70 ← capped below floor ✓
8. `dist===3 && maxLen<=40` → 0.62
9. `dist<=6 && maxLen<=60` → 0.40 + (6-dist)*0.02
10. decay `max(0, 1 - dist/maxLen)`

The Levenshtein-≤2 check is at step 6, structural at step 7 — correct order. A 1-edit match is scored 0.92, never reaching the structural branch.

**Can a substring leak into auto-apply (≥0.85)?** The only branches returning ≥0.85 are exact (1.0) and `dist<=2 && maxLen<=48` (0.86/0.92). The decay fallback `1 - dist/maxLen` could theoretically be high — but only when `dist` is small relative to `maxLen`. Critically: if `dist <= 2`, branch 6 already caught it (for maxLen≤48). For maxLen>48 with dist≤2, branch 6 is skipped and it falls through. Let me verify the decay can't exceed 0.85 in that gap.

For the decay to reach ≥0.85: `1 - dist/maxLen >= 0.85` → `dist/maxLen <= 0.15` → `dist <= 0.15*maxLen`. With maxLen=49 (just above the 48 guard), dist≤2 gives `1 - 2/49 = 0.959`. **This is a real leak.** Let me verify branch precedence: for two long slugs (maxLen 49) differing by 2 edits, branch 6 fails (maxLen>48), structural may or may not match, then branch 8/9 fail (dist≤6 but let me check)... actually `dist<=6 && maxLen<=60` — maxLen=49≤60, dist=2≤6 → branch 9 catches it: `0.40 + (6-2)*0.02 = 0.48`. So branch 9 catches it before decay. Let me find where decay actually triggers and whether it can exceed 0.85.

### Assistant | 2026-06-08T16:40:43.559Z

[tool_use: Bash]

### User | 2026-06-08T16:40:48.369Z

[tool_result] LEAKS (len 49-200, k=1..3, substitution tail): [{"len":61,"k":1,"dist":1,"score":0.9836065573770492,"reason":"distance-decay-1"},{"len":61,"k":2,"dist":2,"score":0.9672131147540983,"reason":"distance-decay-2"},{"len":61,"k":3,"dist":3,"score":0.9508196721311475,"reason":"distance-decay-3"},{"len":62,"k":1,"dist":1,"score":0.9838709677419355,"reason":"distance-decay-1"},{"len":62,"k":2,"dist":2,"sc
... [+1259 chars truncated]

### Assistant | 2026-06-08T16:40:58.000Z

I found a real leak. Let me confirm the boundary precisely — for slugs longer than 60 chars, the decay fallback produces scores well above 0.85 for tight edit distances (dist 1-3). This is the exact class the fix claims to prevent: a non-exact match clearing the auto-apply floor through an unguarded path.

Let me verify the exact boundary and whether realistic slug lengths hit it, and confirm branch 9's `maxLen<=60` is the gap source.

### Assistant | 2026-06-08T16:41:01.126Z

[tool_use: Bash]

### User | 2026-06-08T16:41:04.742Z

[tool_result] maxLen=48 dist=1 -> score=0.9200 reason=levenshtein-1 *** LEAK (auto-apply)
maxLen=48 dist=2 -> score=0.8600 reason=levenshtein-2 *** LEAK (auto-apply)
maxLen=48 dist=3 -> score=0.4600 reason=levenshtein-3 
maxLen=49 dist=1 -> score=0.5000 reason=levenshtein-1 
maxLen=49 dist=2 -> score=0.4800 reason=levenshtein-2 
maxLen=49 dist=3 -> score=0.4600 reason=levenshtein-3 
maxLen=60 dist=1 -> score=0.
... [+745 chars truncated]

### Assistant | 2026-06-08T16:41:19.112Z

Confirmed. There is a real **silent leak above the auto-apply floor** for slugs longer than 60 characters. The decay fallback `1 - dist/maxLen` produces 0.95–0.98 for tight edit distances (dist 1–3) once `maxLen > 60`, because:

- Branch 6 (`dist<=2 && maxLen<=48`) is skipped (maxLen too big)
- Branch 8 (`dist===3 && maxLen<=40`) skipped
- Branch 9 (`dist<=6 && maxLen<=60`) skipped (maxLen too big)
- Falls through to `1 - dist/maxLen`, which is *high* precisely when slugs are long and the edit distance is small

A dist-3 difference between two 61-char slugs is NOT a "tight typo" the fix intends to auto-apply — yet it scores 0.95 and is auto-apply-eligible. PRISM has many slugs >60 chars (e.g. `reference_psn_octopus_fleet_synergy_2026_05_31`, `reference_slot_worktree_ms0_p3_cutover_complete`, the long `2026-..` memory slugs). This reintroduces exactly the silent-regression class the unit claims to close, just at a different length band.

Now let me check question 2 (structural cap), the other edge cases, run the test suite, and confirm the apply pipeline isn't armed.

### Assistant | 2026-06-08T16:41:23.374Z

[tool_use: Bash]

### User | 2026-06-08T16:41:27.649Z

[tool_result] structural directions:
 prefix      0.7
 cand-prefix 0.7
 sub-in-cand 0.7
 cand-in-brk 0.7
dist boundary 2 vs 3 (maxLen<=40):
 2-edit short 0.86 (expect 0.86)
 3-edit short 0.62 (expect 0.62)
tight-edit that is ALSO prefix:
 foo vs fooxy (prefix + dist2) {"score":0.86,"reason":"levenshtein-2"} -> dist2 wins, 0.86 auto-apply

### Assistant | 2026-06-08T16:41:33.425Z

Note an interesting sub-case: `foo` vs `fooxy` is a 2-char extension (prefix relationship) AND dist=2, so it scores 0.86 auto-apply. That's defensible (a short slug + 2-char suffix is plausibly a real rename) but it does mean a *prefix* relationship can auto-apply when the suffix is ≤2 chars on short slugs — minor, not the headline bug. Now let me run the test suite and check the apply pipeline.

### Assistant | 2026-06-08T16:41:34.323Z

[tool_use: Bash]

### User | 2026-06-08T16:41:38.731Z

[tool_result]   ...
# Subtest: CLI: --dry prints summary, no file written
ok 10 - CLI: --dry prints summary, no file written
  ---
  duration_ms: 42.5745
  ...
# Subtest: CLI: env disable knob no-ops
ok 11 - CLI: env disable knob no-ops
  ---
  duration_ms: 43.0785
  ...
1..11
# tests 40
# suites 6
# pass 40
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 174.2444

### Assistant | 2026-06-08T16:41:43.704Z

All 40 tests pass. Now let me check the apply pipeline to confirm the scorer change doesn't arm anything, and check git diff to confirm only `scoreCandidate` changed.

### Assistant | 2026-06-08T16:41:45.013Z

[tool_use: Bash]

### User | 2026-06-08T16:41:48.566Z

[tool_result] scripts/__tests__/wiki-link-fix-suggester.test.mjs | 53 +++++++++++++----
 scripts/wiki-link-fix-suggester.mjs                | 69 +++++++++++++---------
 2 files changed, 82 insertions(+), 40 deletions(-)
---- function-level diff (only scoreCandidate body expected) ----

### Assistant | 2026-06-08T16:41:53.508Z

The grep returned nothing for the caller signatures, meaning none of `rankCandidates`/`classifyConfidence`/`buildSummary`/`autoApplyEligible`/`AUTO_APPLY_FLOOR` lines were added/removed — consistent with the change being confined to the `scoreCandidate` body plus its docstring. Let me confirm the diff is confined to the scorer region and check for an apply script that consumes the candidates.

### Assistant | 2026-06-08T16:41:54.818Z

[tool_use: Bash]

### User | 2026-06-08T16:41:58.853Z

[tool_result] ==== diff hunk headers (verify all changes are inside scoreCandidate region) ====

==== apply pipeline files ====
apply-hook-fast-lane.mjs*
apply-karpathy-doctrine-to-galaxies.mjs*
backfill-wiki-links-in-memories.mjs*
jm-die-apply-tier1.mjs
jm-die-apply-tier2-curated.mjs
jm-die-apply-tier3-curated.mjs
wiki-broken-link-propose-fix.mjs*
wiki-link-fix-apply.mjs*
wiki-link-fix-suggester.mjs*

### Assistant | 2026-06-08T16:42:03.761Z

rtk swallowed the @@ headers. Let me get them raw and check the apply script's auto-apply gate to confirm the scorer change didn't arm anything.

### Assistant | 2026-06-08T16:42:04.522Z

[tool_use: Bash]

### User | 2026-06-08T16:42:12.303Z

[tool_result] ==== raw hunk headers ====
5:@@ -139,16 +139,22 @@ export function levenshtein(a, b) {
37:@@ -161,28 +167,37 @@ export function scoreCandidate(brokenNormalized, candidateSlug) {

==== apply script: how it decides what to write (auto-apply gate) ====
(empty above = apply script UNCHANGED by this unit)

### Assistant | 2026-06-08T16:42:18.595Z

Both diff hunks fall within the `scoreCandidate` region (the first hunk header is anchored at `levenshtein` but the changes start at line ~142 — the scorer docstring; the second is the function body). The apply script is unchanged by this unit. Let me confirm the apply script keeps its own dry/operator gate and how it reads `autoApplyEligible`, to answer Q6 definitively.

### Assistant | 2026-06-08T16:42:18.737Z

[tool_use: Bash]

### User | 2026-06-08T16:42:23.175Z

[tool_result] 6: * Writes: edits source files in-place (default DRY RUN — `--apply` required to write)
9: * Auto-applies high-confidence link fixes (score >= AUTO_APPLY_FLOOR, default 0.85)
10: * to the source markdown files. Below the floor, candidates remain in the
11: * suggester output for operator review.
14: *   1. DRY RUN is the default. `--apply` flag REQUIRED to actually write.
25: *   eligibleCandidat
... [+1458 chars truncated]

### Assistant | 2026-06-08T16:42:33.162Z

This is the decisive finding for the safety story. The apply script gates on **`bestScore >= floor` (0.85) AND `confidence === "high"`** (line 79–80), and `--apply` is required to write (dry by default). So:

- Q6 (apply pipeline not armed): **Confirmed safe** — the scorer change is data-only; the apply script is unchanged, still dry-by-default and `--apply`-gated. The scorer change alone arms nothing. ✓
- BUT the leak I found has real teeth: a >60-char slug pair at dist 1–3 scores 0.95+ → `confidence: "high"` → `autoApplyEligible: true` → **passes `eligibleCandidate` and gets auto-written when an operator runs `--apply`** (which the 3 scheduled tasks / pipeline are built to do). The leak is not cosmetic — it reaches the write path.

I have everything needed. Let me verify the live dry-run claim isn't masking the leak (the 178 count) and whether long slugs are common enough to matter in practice.

### Assistant | 2026-06-08T16:42:36.686Z

[tool_use: Bash]

### User | 2026-06-08T16:42:40.837Z

[tool_result] autoApplyCount: 14100 candidates: 15410
auto-apply set by top-suggestion reason: {"candidate-substring-of-broken":1772,"broken-is-prefix-of-candidate":4962,"candidate-is-prefix-of-broken":5926,"broken-substring-of-candidate":1413,"exact-match":26,"distance-decay-N":1}

### Assistant | 2026-06-08T16:42:48.405Z

This is a critical discovery. The **persisted candidates file on disk still shows `autoApplyCount: 14100`** with 14,073 of those being **structural matches** (prefix/substring) scoring above the floor — i.e. it reflects the OLD over-confident scorer, not the new one. The reviewer's claim that the dry-run dropped autoApplyCount to 178 is **not reflected in the committed/persisted output** — the live file is stale (pre-fix) and still arms 14,100 structural auto-applies if `--apply` runs against it.

Let me verify this is genuinely stale (old scorer output) vs the new scorer by regenerating against the same audit and comparing, since the structural reasons scoring as auto-apply is impossible under the NEW scorer (structural caps at 0.70).

### Assistant | 2026-06-08T16:42:51.302Z

[tool_use: Bash]

### User | 2026-06-08T16:42:55.137Z

[tool_result] ==== candidates file mtime vs scorer source mtime ====
2026-06-05 09:49:19.335748900 -0500 state/shared/wiki-link-fix-candidates.json
2026-06-08 11:34:47.942458000 -0500 scripts/wiki-link-fix-suggester.mjs

==== proof: structural matches CANNOT be auto-apply under new scorer ====
broken-is-prefix re-scored NOW: {"score":0.7,"reason":"structural-broken-is-prefix-of-candidate"}

### Assistant | 2026-06-08T16:43:21.290Z

Confirmed. The persisted `wiki-link-fix-candidates.json` is dated **2026-06-05** (3 days before the 2026-06-08 scorer fix) and still carries the over-confident `autoApplyCount: 14100`. The new scorer is correct in code, but the **stale artifact on disk is still armed** — if the apply pipeline / scheduled task runs `--apply` against the existing file before the suggester is re-run, it will auto-apply 14,100 structural (mostly substring/prefix) rewrites: exactly the wholesale corruption this unit exists to prevent.

This is a deployment-completeness gap (R15: "VALIDATE against LIVE data... the suggester must be re-run to regenerate the candidates file"), not a logic bug in the scorer. But combined with the >60-char decay leak (a genuine logic gap), I cannot pass this.

The scorer logic is *mostly* correct and the tests are real and pass, but two findings reintroduce the silent-regression class the unit claims to close. Per the instruction "If unsure, FAIL," and because both findings are genuine paths to auto-apply-eligible bad fixes, the verdict is FAIL.

VERDICT: FAIL

BLOCKER: Decay-path leak above the 0.85 floor for slugs >60 chars. For `maxLen > 60`, branches 6/8/9 are all skipped and `scoreCandidate` falls through to `1 - dist/maxLen`, which returns 0.95–0.98 for dist 1–3 (e.g. two 61-char slugs differing by 3 edits → 0.951, reason `distance-decay-3`, `confidence:"high"`, `autoApplyEligible:true`). A 3-edit diff on long slugs is NOT a tight typo and must not auto-apply. PRISM has many >60-char memory/wiki slugs (the `reference_*_2026_05_xx` family), so this is reachable on live data. The 0.70 structural cap is correctly below the floor in all 4 directions, but the decay tail is not capped. Fix: clamp the decay fallback (and ideally the `dist<=6` branch's escape) below `AUTO_APPLY_FLOOR`, or gate `autoApplyEligible` on `reason ∈ {exact-match, levenshtein-1, levenshtein-2}` rather than on score alone.

BLOCKER: Stale armed artifact — the live `state/shared/wiki-lin
... [+2013 chars truncated]
