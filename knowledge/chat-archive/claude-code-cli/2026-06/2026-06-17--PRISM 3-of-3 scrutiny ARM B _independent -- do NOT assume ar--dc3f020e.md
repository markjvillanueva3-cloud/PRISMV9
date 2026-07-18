---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "PRISM 3-of-3 scrutiny ARM B (independent -- do NOT assume arm A caught everythin"
date: "2026-06-17"
first_ts: "2026-06-17T02:54:41.680Z"
last_ts: "2026-06-17T02:59:22.820Z"
cwd: "H:\\prism-slot-sierra"
messages: 70
user_msgs: 24
assistant_msgs: 46
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-a1826995592e1835f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# PRISM 3-of-3 scrutiny ARM B (independent -- do NOT assume arm A caught everythin

> **claude-code-cli** | 2026-06-17 | 70 msgs (24 user / 46 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-a1826995592e1835f.jsonl`

## Transcript

### User | 2026-06-17T02:54:41.680Z

PRISM 3-of-3 scrutiny ARM B (independent -- do NOT assume arm A caught everything). Review commit ee43c54876 on cad-fusion-live-ms0 in H:/prism. Weight toward TEST INTEGRITY + inlined-constant detection + the DATA backfill safety. Grade PASS or FAIL + file:line. Inspect: `cd /h/prism && git show ee43c54876`.

WHAT: a `run_log` frontmatter convention excludes ephemeral NN-retrain run-log memories from wiki promotion (gate + generator + 31-file data backfill).

VERIFY: (1) Do the 3 new gate tests + the generator marker test fail if the logic regresses (mutation-think, no tautologies, no .skip/.only)? Run both suites. (2) The 31 backfilled DATA files: did the backfill corrupt ANY file's body/frontmatter, double-insert the marker, or mix line endings into the CRLF file (reference_nn_retrain_2026_05_18_2358.md)? Spot-check 3 files incl the CRLF one. (3) Any hardcoded constant that should be shared? Is `run_log` coupled to nn_retrain by filename anywhere (it should be a generic frontmatter convention, no filename coupling in the gate)? (4) The commit tracks 13 previously-untracked nn_retrain files -- is that appropriate, or does it adopt files that shouldn't be in git? Report PASS/FAIL + findings.

### Assistant | 2026-06-17T02:54:44.307Z

I'll review commit ee43c54876 with focus on test integrity, inlined constants, and data backfill safety. Let me start by inspecting the commit.

### Assistant | 2026-06-17T02:54:44.987Z

[tool_use: Bash]

### User | 2026-06-17T02:54:45.627Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-17T02:54:49.055Z

Let me get the full commit details.

### Assistant | 2026-06-17T02:54:49.564Z

[tool_use: Bash]

### User | 2026-06-17T02:54:53.743Z

[tool_result] commit ee43c5487645ed17f4e65b98a0262ee4eed333b0
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 16 21:53:53 2026 -0500

    [MAIN-FORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-PROMOTE-GATE-RUNLOG (slot:sierra): exclude ephemeral run-log memories from wiki promotion (run_log convention)
    
    Sibling of U-VAULT-PROMOTE-GATE-HARDEN (409532c31e). After excluding node-pointer +
  
... [+4138 chars truncated]

### Assistant | 2026-06-17T02:54:56.903Z

I notice the stat shows 13 files with 26-27 line additions (full file content = newly tracked) vs files with just `1 +` (existing tracked files getting the marker). Let me see the core code changes first.

### Assistant | 2026-06-17T02:54:57.994Z

[tool_use: Bash]

### User | 2026-06-17T02:54:59.084Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-17T02:55:02.132Z

The cache is being aggressive. Let me read the actual files in the working tree and use git diff with a different approach.

### Assistant | 2026-06-17T02:55:03.504Z

[tool_use: Bash]

### User | 2026-06-17T02:55:09.240Z

[tool_result] --- /tmp/promote-old.mjs	2026-06-16 21:55:07.434288200 -0500
+++ /tmp/promote-new.mjs	2026-06-16 21:55:07.310550200 -0500
@@ -131,8 +131,8 @@
 }
 
 // Exclude memories that must NEVER graduate to the canonical wiki, even when they
-// clear the refs/age gate. Two classes, both R9/R12 (the wiki holds *verified,
-// synthesized* knowledge -- never raw graph atoms nor explicitly-unverified text):
+//
... [+1646 chars truncated]

### Assistant | 2026-06-17T02:55:11.973Z

The gate logic is clean — `run_log` is a generic frontmatter convention with no filename coupling, reusing the existing `truthy()` helper. Let me see the generator change and the full `nonPromotableReason` context.

### Assistant | 2026-06-17T02:55:14.011Z

[tool_use: Bash]

### User | 2026-06-17T02:55:20.875Z

[tool_result] --- /tmp/gen-old.mjs	2026-06-16 21:55:19.646389300 -0500
+++ /tmp/gen-new.mjs	2026-06-16 21:55:19.552474400 -0500
@@ -125,6 +125,7 @@
 description: ${description}
 metadata:
   type: reference
+  run_log: true
 ---
 
 # NN-GRAPH retrain round — ${ts}

### Assistant | 2026-06-17T02:55:23.451Z

Now the generator emits `run_log: true` nested under `metadata`. The gate checks `fm.run_log` at top level — I need to verify how the gate parses frontmatter (does it flatten `metadata`?). Let me look at the test changes and the frontmatter parsing.

### Assistant | 2026-06-17T02:55:25.095Z

[tool_use: Bash]

### User | 2026-06-17T02:55:29.855Z

[tool_result] --- /tmp/promote-test-old.mjs	2026-06-16 21:55:29.253653700 -0500
+++ /tmp/promote-test-new.mjs	2026-06-16 21:55:29.199214100 -0500
@@ -109,6 +109,13 @@
   assert.equal(nonPromotableReason({ type: "reference", mustHumanVerify: "no" }), null);
   assert.equal(nonPromotableReason({ type: "reference", advisoryOnly: "off" }), null);
 });
+test("nonPromotableReason: run_log (YAML-truthy) excluded as ru
... [+2863 chars truncated]

### Assistant | 2026-06-17T02:55:34.080Z

The test for the nested shape is critical — the generator emits `metadata: { run_log: true }` but the gate checks `fm.run_log` at top level. The integration test asserts the nested shape flattens and excludes. This means the parser must flatten `metadata.*` into the top-level `fm`. Let me verify the frontmatter parser actually does this flattening, otherwise the gate would never fire on real production files.

### Assistant | 2026-06-17T02:55:34.948Z

[tool_use: Bash]

### User | 2026-06-17T02:55:41.472Z

[tool_result] 73:// Handles flat `type: reference` and nested `metadata:\n  type: reference`,

### Assistant | 2026-06-17T02:55:44.300Z

Let me read the full parser function to verify the flattening logic handles `run_log` under `metadata`.

### Assistant | 2026-06-17T02:55:44.901Z

[tool_use: Read]

### User | 2026-06-17T02:55:46.439Z

[tool_result] 60	  for (const m of text.matchAll(WIKILINK_RE)) {
61	    const t = m[1].trim();
62	    if (t) out.push(t);
63	  }
64	  return out;
65	}
66	
67	// Normalize an identifier for cross-form matching: lowercase, drop .md, unify -/_.
68	export function normId(s) {
69	  return String(s).trim().toLowerCase().replace(/\.md$/i, "").replace(/-/g, "_");
70	}
71	
72	// Minimal frontmatter parse: returns { fm, 
... [+5322 chars truncated]

### Assistant | 2026-06-17T02:55:52.063Z

The parser flattens nested keys (line 85-99 iterates ALL frontmatter lines including indented `metadata:` children, and `if (!(key in fm)) fm[key] = val` writes `run_log` to the top-level `fm` regardless of nesting). So `metadata:\n  run_log: true` does produce `fm.run_log === "true"`, which `truthy()` catches. The nested-shape integration test confirms this. Good — the gate logic is sound and the test guards the real production shape.

Now the critical question: does the truthy check handle `"true"` from the parser? The parser stores values as strings (line 89 `val` is a string), so `metadata:\n  run_log: true` yields `fm.run_log === "true"` (string), and `truthy("true")` → true. Confirmed.

Now let me run both test suites to verify they pass and check for `.skip`/`.only`.

### Assistant | 2026-06-17T02:55:52.925Z

[tool_use: Bash]

### User | 2026-06-17T02:55:57.474Z

[tool_result]   ...
# Subtest: runMemoryPromotion: --backlink adds an idempotent memory->wiki pointer
ok 31 - runMemoryPromotion: --backlink adds an idempotent memory->wiki pointer
  ---
  duration_ms: 4.4848
  ...
# Subtest: runMemoryPromotion: malformed memory counted, does not crash the run
ok 32 - runMemoryPromotion: malformed memory counted, does not crash the run
  ---
  duration_ms: 4.4244
  ...
# Subtes
... [+285 chars truncated]

### Assistant | 2026-06-17T02:55:59.310Z

33/33 pass, 0 skipped. Now the generator test suite.

### Assistant | 2026-06-17T02:56:00.541Z

[tool_use: Bash]

### User | 2026-06-17T02:56:05.129Z

[tool_result]   ...
# Subtest: computeNewEntries: empty/garbage → []
ok 14 - computeNewEntries: empty/garbage → []
  ---
  duration_ms: 0.0505
  ...
# Subtest: computeNewEntries: idempotency — second pass after capture yields nothing
ok 15 - computeNewEntries: idempotency — second pass after capture yields nothing
  ---
  duration_ms: 0.4874
  ...
1..15
# tests 15
# suites 0
# pass 15
# fail 0
# cancelled 0
# s
... [+39 chars truncated]

### Assistant | 2026-06-17T02:56:13.338Z

15/15 pass, 0 skipped. Now let me verify the tests are not tautologies — mutation-think. Let me see the generator marker test and confirm it would fail if `run_log: true` were removed.

### Assistant | 2026-06-17T02:56:14.724Z

[tool_use: Bash]

### User | 2026-06-17T02:56:20.916Z

[tool_result] --- /tmp/gentest-old.mjs	2026-06-16 21:56:20.276972400 -0500
+++ /tmp/gentest-new.mjs	2026-06-16 21:56:20.246996000 -0500
@@ -87,6 +87,8 @@
   assert.equal(e.roundTs, promotedRound.ts);
   assert.ok(e.markdown.startsWith("---\nname: nn-retrain-2026-05-21-0310\n"), "frontmatter");
   assert.ok(e.markdown.includes("metadata:\n  type: reference"), "type:reference");
+  // run-logs self-declare run_lo
... [+375 chars truncated]

### Assistant | 2026-06-17T02:56:24.103Z

The marker test asserts `e.markdown.includes("run_log: true")`. Now let me verify mutation-think: if I remove `run_log: true` from the generator, this test should fail. And if I remove the `truthy(fm.run_log)` line from the gate, the gate tests should fail. Let me prove both with actual mutations.

### Assistant | 2026-06-17T02:56:26.501Z

[tool_use: Bash]

### User | 2026-06-17T02:56:33.916Z

[tool_result] === MUTATION 1: generator run_log removed ===
# pass 14
# fail 1
=== restored generator ===

### Assistant | 2026-06-17T02:56:35.862Z

Mutation 1 confirms the generator marker test fails (1 fail) when `run_log: true` is removed. Now mutate the gate.

### Assistant | 2026-06-17T02:56:39.034Z

[tool_use: Bash]

### User | 2026-06-17T02:56:45.504Z

[tool_result] # pass 15
# fail 0
=== MUTATION 2: gate run_log check removed ===
# pass 30
# fail 3
=== restored gate ===
# pass 33
# fail 0

### Assistant | 2026-06-17T02:56:50.193Z

Mutation 2 confirms: removing the gate's `run_log` check fails exactly 3 tests (the unit truthy/falsy test + the flat integration test + the nested-metadata integration test). The tests are NOT tautologies — they have real mutation-killing power. Both files restored clean (15/15 and 33/33).

Now let me verify the data backfill safety. First, let me check the CRLF file and spot-check the marker placement. Let me examine the diffs of the existing (1-line-added) files and the CRLF file specifically.

### Assistant | 2026-06-17T02:56:51.309Z

[tool_use: Bash]

### User | 2026-06-17T02:56:55.708Z

[tool_result] commit ee43c5487645ed17f4e65b98a0262ee4eed333b0$
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>$
Date:   Tue Jun 16 21:53:53 2026 -0500$
$
    [MAIN-FORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-PROMOTE-GATE-RUNLOG (slot:sierra): exclude ephemeral run-log memories from wiki promotion (run_log convention)$
    $
    Sibling of U-VAULT-PROMOTE-GATE-HARDEN (409532c31e). After excluding node-pointe
... [+2252 chars truncated]

### Assistant | 2026-06-17T02:56:58.766Z

[tool_use: Bash]

### User | 2026-06-17T02:57:03.489Z

[tool_result] index 008d629575..9de8570465 100644$
--- a/knowledge/memories/reference/reference_nn_retrain_2026_05_18_2358.md$
+++ b/knowledge/memories/reference/reference_nn_retrain_2026_05_18_2358.md$
@@ -3,6 +3,7 @@ name: nn-retrain-2026-05-18-2358$
 description: GNN tier-5 retrain 2026-05-18T23:58:23.179Z M-bM-^@M-^T AUROC n/a M-BM-7 macroF1 n/a M-BM-7 Brier n/a M-BM-7 not-promoted$
 metadata:$
   type: ref
... [+98 chars truncated]

### Assistant | 2026-06-17T02:57:07.461Z

Interesting — the diff `cat -A` shows the added line `+  run_log: true$` WITHOUT a `^M` (CR) marker before the `$`, while the context lines also show `$` only. But git's `cat -A` on the diff output normalizes the diff display. The real question is whether the actual file on disk has consistent CRLF. The context lines (` description:`, ` metadata:`, `   type: reference`) show `$` without `^M` here — but this is the diff text rendering, not the file. Let me check the actual file on disk for line-ending consistency.

### Assistant | 2026-06-17T02:57:09.362Z

[tool_use: Bash]

### User | 2026-06-17T02:57:13.131Z

[tool_result] Exit code 1
=== CRLF file: count CR and total lines ===
knowledge/memories/reference/reference_nn_retrain_2026_05_18_2358.md: Unicode text, UTF-8 text, with CRLF line terminators
CR count: 0

### Assistant | 2026-06-17T02:57:16.888Z

`file` reports CRLF terminators but `grep -c $'\r'` returned 0 (grep strips `\r` before matching in this environment). Let me use a more reliable byte-level check to confirm EVERY line including the inserted `run_log: true` line has CRLF, and that no LF-only line was mixed in.

### Assistant | 2026-06-17T02:57:19.917Z

[tool_use: Bash]

### User | 2026-06-17T02:57:30.304Z

[tool_result] === total bytes / CR bytes / LF bytes ===
CR: 26 LF: 26 CRLF: 26
bare LF (LF not preceded by CR): 0
bare CR (CR not followed by LF): 0
0 b'---\r'
1 b'name: nn-retrain-2026-05-18-2358\r'
2 b'description: GNN tier-5 retrain 2026-05-18T23:58:23.179Z \xe2\x80\x94 AUROC n/a \xc2\xb7 macroF1 n/a \xc2\xb7 Brier n/a \xc2\xb7 not-promoted\r'
3 b'metadata:\r'
4 b'  type: reference\r'
5 b'  run_log: 
... [+28 chars truncated]

### Assistant | 2026-06-17T02:57:34.296Z

The CRLF file is byte-perfect: CR=26, LF=26, CRLF=26, ZERO bare LF and ZERO bare CR. The inserted line (index 5: `  run_log: true\r`) has the correct CRLF terminator matching the rest of the file. No line-ending mixing. The marker is correctly placed under `metadata:` (index 3) alongside `type: reference` (index 4) — same nesting that the gate flattens.

Now let me spot-check 2 more files (an LF file from the 1-line-added group, and one of the newly-tracked full-content files) for double-insertion and body integrity.

### Assistant | 2026-06-17T02:57:37.501Z

[tool_use: Bash]

### User | 2026-06-17T02:57:44.244Z

[tool_result] ===== knowledge/memories/reference/reference_nn_retrain_2026_05_22_0445.md =====
CR: 0 LF: 27 CRLF: 0 | bare LF: 27 bare CR: 0
run_log occurrences: 1
--- frontmatter head ---
0 b'---'
1 b'name: nn-retrain-2026-05-22-0445'
2 b'description: GNN tier-5 retrain 2026-05-22T04:45:37.741Z \xe2\x80\x94 AUROC 0.5000 \xc2\xb7 macroF1 0.1333 \xc2\xb7 Brier 0.2600 \xc2\xb7 not-promoted'
3 b'aliases: [nn
... [+585 chars truncated]

### Assistant | 2026-06-17T02:57:47.760Z

Both LF files are clean: pure LF (0 CR), exactly ONE `run_log` occurrence (no double-insertion), marker correctly nested under `metadata:` alongside `type: reference`. The 06-15 file is one of the newly-tracked full-content files and is well-formed.

Now let me verify the broader backfill: confirm ALL 31 files have exactly one `run_log: true`, correctly nested, and none had body corruption. Let me check the full set programmatically.

### Assistant | 2026-06-17T02:57:53.450Z

[tool_use: Bash]

### User | 2026-06-17T02:57:58.984Z

[tool_result] total nn_retrain files: 31
files with issues: 0
ALL CLEAN

### Assistant | 2026-06-17T02:58:03.449Z

All 31 files are clean: exactly one `run_log: true`, correctly nested under `metadata:`, no mixed line endings. The CRLF file stayed pure CRLF, the LF files stayed pure LF — EOL was preserved per-file as claimed.

Now let me address question 4: the 13 newly-tracked files. Let me confirm these are genuinely new git-tracked files and verify they're appropriate to track (legitimate vault memories, not transient junk that shouldn't be in git).

### Assistant | 2026-06-17T02:58:06.613Z

[tool_use: Bash]

### User | 2026-06-17T02:58:11.162Z

[tool_result] === files ADDED (new) vs MODIFIED in this commit ===
13
^ added count
18
^ modified count
=== Are nn_retrain files gitignored anywhere? ===
NOT ignored (tracked appropriately)

### Assistant | 2026-06-17T02:58:17.825Z

13 added + 18 modified = 31 total, matching the claim. The nn_retrain files are NOT gitignored. Now the key question: are the 13 newly-tracked files appropriate to adopt into git? They are the same `reference_nn_retrain_*.md` class as the 18 already-tracked files (same directory, same naming convention, same content shape). The commit adopts them because the backfill touched them and they're part of the same vault memory corpus. Let me verify they're not the kind of transient artifact (e.g., huge, binary, or containing secrets) that shouldn't be in git, and confirm consistency with the already-tracked siblings.

### Assistant | 2026-06-17T02:58:19.530Z

[tool_use: Bash]

### User | 2026-06-17T02:58:24.082Z

[tool_result] === newly-ADDED files: dates + sizes ===
  1228 bytes  reference_nn_retrain_2026_06_10_0605.md
  1355 bytes  reference_nn_retrain_2026_06_11_0151.md
  1174 bytes  reference_nn_retrain_2026_06_11_0312.md
  1156 bytes  reference_nn_retrain_2026_06_11_0316.md
  1156 bytes  reference_nn_retrain_2026_06_11_0321.md
  1174 bytes  reference_nn_retrain_2026_06_11_1438.md
  1156 bytes  reference_nn_retrain_
... [+1537 chars truncated]

### Assistant | 2026-06-17T02:58:31.546Z

The newly-added files are small (~1.1-1.4KB each), text-only, structurally identical to the already-tracked nn_retrain siblings, and contain legitimate vault memory content (retrain metrics + verifiable signals + wiki cross-refs). They are not secrets, binaries, or transient build artifacts. They're the auto-generated NN-GRAPH retrain memory records the vault already tracks 18 of — these 13 were simply untracked (generated after the last vault commit). Adopting them is appropriate: they're already auto-fed to the Obsidian vault by the Stop hook and belong in the memory corpus.

One observation worth noting: these files DO embed transient runtime noise (the V8 GC dump `<--- Last few GCs --->` in the description line for the 06-11 file), but that's a pre-existing property of the generator's captured-error field, NOT introduced by this commit. It does not affect the gate/backfill correctness.

Let me do a final verification on question 3 — confirm no hardcoded constant that should be shared, and confirm the gate has zero filename coupling to nn_retrain.

### Assistant | 2026-06-17T02:58:34.689Z

[tool_use: Bash]

### User | 2026-06-17T02:58:41.577Z

[tool_result] === gate file: any 'nn_retrain' or 'nn-retrain' filename coupling? ===
145://      operational records (one per NN-GRAPH retrain round, etc.). Their refs are
157:  // Ephemeral machine-generated RUN-LOGS (e.g. per-retrain NN-GRAPH metric records

=== gate: how many string literals 'run-log'/'run_log'? (no magic-number constants) ===
135:// synthesized* knowledge -- never raw graph atoms, unverifie
... [+243 chars truncated]

### Assistant | 2026-06-17T02:58:49.002Z

The only `nn_retrain`/`retrain` mentions in the gate are in COMMENTS (lines 145, 157, 158) explaining the motivating example — there is ZERO functional filename coupling. The gate keys purely on `fm.run_log` (line 160), a generic frontmatter convention that any run-log generator can opt into. This is exactly the generalizable design the commit message claims.

On shared constants: the gate reuses the existing `truthy()` helper (no duplicated truthiness logic), and `"run-log"` is a return-value tag string consistent with the sibling tags `"node-pointer"` and `"unverified-advisory"` — no magic numbers, no physics constants, nothing that belongs in a shared module. The `truthy()` helper's accepted-spelling array `["true", "1", "yes", "on"]` is local but is a single inline definition reused across all three exclusion classes — appropriate scope.

Let me do one final check — confirm the commit didn't break any frontmatter body (the `aliases` array handling on the 05-22 file, and that bodies are byte-identical to pre-commit except the one inserted line).

### Assistant | 2026-06-17T02:58:52.657Z

[tool_use: Bash]

### User | 2026-06-17T02:58:57.612Z

[tool_result] === verify each MODIFIED file added EXACTLY 1 line (+1/-0), no body edits ===
ANOMALY:     11 were reference_nn_retrain_<ts> -- ephemeral machine-generated per-retrain metric
18 modified files = exactly +1/-0 (marker-only)

### Assistant | 2026-06-17T02:59:22.820Z

The "ANOMALY" line is just a commit-message line bleeding into the awk parse (the `--numstat` output includes the commit body) — not a real file anomaly. The result confirms: all 18 modified files are exactly `+1/-0` (marker-only insertions, zero body edits), and the 13 added files are full new content (26-27 lines each). No body corruption.

All verification complete. Both test suites restored clean (confirmed 33/33 and 15/15 after mutation tests). Here is my verdict.

---

VERDICT: PASS

summary: Commit ee43c54876 adds a generic `run_log` frontmatter exclusion to the wiki-promotion gate, opts the NN-retrain generator into it, and backfills 31 existing run-log memories. All three gate tests and the generator marker test have real mutation-killing power (verified by live mutation: removing the gate check fails exactly 3 tests, removing the generator marker fails 1), the 31-file backfill is byte-clean with per-file EOL preserved, and the gate has zero filename coupling. No P0/P1 findings.

findings:
- none

Audit trail (what I verified, so the PASS is auditable):

1. **Test integrity (mutation-think, no tautologies, no skips).**
   - `scripts/promote-memory-to-wiki.test.mjs`: 33/33 pass, 0 skipped/todo. New tests at `scripts/promote-memory-to-wiki.test.mjs:112-118` (unit truthy `true`/`"true"`/`"1"` + falsy `false`/`"0"`), `:255-271` (flat-shape integration, asserts `skippedNonPromotable===1, promoted===0`), `:273-289` (the REAL nested `metadata.run_log` production shape, asserts the parser flattens + excludes).
   - `scripts/nn-feedback-to-memory.test.mjs`: 15/15 pass, 0 skipped. Marker assert at `scripts/nn-feedback-to-memory.test.mjs:90`.
   - **Mutation 1**: deleting `run_log: true` from `scripts/nn-feedback-to-memory.mjs:128` → generator suite 14 pass / **1 fail**.
   - **Mutation 2**: deleting `if (truthy(fm.run_log)) return "run-log";` (`scripts/promote-memory-to-wiki.mjs:160`) → gate suite 30 pass / **3 fail** (the exact 3 new tests). Both files restored and 
... [+2884 chars truncated]
