---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "Independent review of an additive `--ambiguous` review mode added to H:/prism/sc"
date: "2026-06-18"
first_ts: "2026-06-18T00:25:55.024Z"
last_ts: "2026-06-18T00:28:36.270Z"
cwd: "H:\\prism-slot-sierra"
messages: 49
user_msgs: 17
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-abfbc6c866dc5a72b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Independent review of an additive `--ambiguous` review mode added to H:/prism/sc

> **claude-code-cli** | 2026-06-18 | 49 msgs (17 user / 32 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-abfbc6c866dc5a72b.jsonl`

## Transcript

### User | 2026-06-18T00:25:55.024Z

Independent review of an additive `--ambiguous` review mode added to H:/prism/scripts/vault-link-doctor.mjs (read it end-to-end) + tests H:/prism/scripts/vault-link-doctor.test.mjs. Weighted toward safety, convention conformance, and honest reporting.

WHAT IT DOES: surfaces the AMBIGUOUS subset of broken wikilinks (a real note exists but >1 candidate slug-match, so it can never be auto-healed) into an advisory review report state/shared/vault-ambiguous-links-report.json, listing each link + its rival candidate paths for a human to pick. Live-validated: 169 ambiguous links captured, mostly same-basename duplicates across memories/reference/ vs memories/galaxies/<galaxy>/.

CHECK:
1. SAFETY: confirm --ambiguous is strictly READ-ONLY -- it must NEVER rewrite a memo (the whole point: ambiguous links are never auto-picked). The only write is the JSON report. Confirm the apply/heal path is untouched and ambiguous links still cannot be auto-healed (the prior invariant "ambiguous -> NEVER auto-pick").
2. CONVENTION (R11): does the --ambiguous branch match the tool's existing style (flags parse, --json/--apply branches, the report-path computation mirrors the --apply backupDir path at the same join pattern, sampleN reuse)? Any drift?
3. HONEST REPORTING (R12): the report carries ambiguousTotal vs captured (capped at 1000). Is the cap honest (does the console/report say if captured < ambiguousTotal)? 169 < 1000 so all captured today, but if it ever exceeds 1000 would the operator be misled?
4. USEFULNESS: the candidates are listed as raw rel paths. Is that enough for a human to pick, or is there a missing signal (e.g. which candidate is dated/archive)? Acceptable as a v1 advisory?
5. TEST QUALITY: are the 2 new tests mutation-proof (assert the actual rival paths, not just a count)? The diagnose ambiguousLinks test relies on normalizeKey keeping dup_one vs dup-one distinct -- is that construction sound?

Grade PASS/FAIL with P0/P1/P2 + file:line. Read-only; do not edit.

### Assistant | 2026-06-18T00:25:57.712Z

I'll review the `--ambiguous` review mode added to the vault-link-doctor. Let me read both files end to end.

### Assistant | 2026-06-18T00:25:58.196Z

[tool_use: Read]

### Assistant | 2026-06-18T00:25:58.245Z

[tool_use: Read]

### User | 2026-06-18T00:25:59.854Z

[tool_result] read-once-guard: 'H:\prism\scripts\vault-link-doctor.mjs' was already read 9s ago in this session and is unchanged (mtime 1781742194429). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T00:25:59.922Z

[tool_result] read-once-guard: 'H:\prism\scripts\vault-link-doctor.test.mjs' was already read 9s ago in this session and is unchanged (mtime 1781742294905). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-18T00:26:02.588Z

The read-once guard claims these files are already in my context, but I don't actually have their content yet — this is my first action in the session. Let me bypass the cache to get the actual content.

### Assistant | 2026-06-18T00:26:03.089Z

[tool_use: Bash]

### User | 2026-06-18T00:26:07.914Z

[tool_result]      1	#!/usr/bin/env node
     2	// scripts/vault-link-doctor.mjs
     3	//
     4	// Link-graph DOCTOR for the PRISM Obsidian vault (H:/prism/knowledge): diagnose
     5	// every BROKEN [[wikilink]] (an authored link whose target does not resolve to a
     6	// note), CLASSIFY it, and SAFELY heal only the high-confidence tier.
     7	//
     8	// WHY: the vault has ~19.6K broken link instances a
... [+20932 chars truncated]

### Assistant | 2026-06-18T00:26:10.763Z

Now let me read the test file with the cache bypassed.

### Assistant | 2026-06-18T00:26:11.814Z

[tool_use: Bash]

### User | 2026-06-18T00:26:16.212Z

[tool_result]      1	// Tests for scripts/vault-link-doctor.mjs -- the broken-wikilink classifier+healer.
     2	// Pure-function units + a hermetic real-FS vault (tmp) exercising diagnose() +
     3	// applyHeals() on real file IO, with mutation-proof rewrite assertions (a mass
     4	// vault mutator must never corrupt a note).
     5	
     6	import { test } from "node:test";
     7	import assert from "node:a
... [+14567 chars truncated]

### Assistant | 2026-06-18T00:26:19.117Z

Both files read end to end. Now let me verify a few load-bearing claims against the navigator module's actual contract, since the whole classification rests on `normalizeKey`, `extractWikilinks`, and `basenameIndex` behavior.

### Assistant | 2026-06-18T00:26:20.203Z

[tool_use: Bash]

### User | 2026-06-18T00:26:24.484Z

[tool_result] 40:export const DEFAULT_VAULT = process.env.PRISM_OBSIDIAN_VAULT || "H:/prism/knowledge";
67:export function extractWikilinks(text) {
186:export function normalizeKey(s) {
255: * Returns { vaultRoot, notes, basenameIndex, backlinks, canvases, skipped, fileCount }.
257: *   basenameIndex Map<normKey, relpath[]>  (basename + full normalized path keys)
264:export function buildVaultModel(vaultRoot = 
... [+380 chars truncated]

### Assistant | 2026-06-18T00:26:27.170Z

Let me verify the exact behavior of `normalizeKey` and `extractWikilinks`, plus how `basenameIndex` is built (case/separator handling), since the `dup_one` vs `dup-one` test construction depends on `normalizeKey` collapsing differently than `slugify`.

### Assistant | 2026-06-18T00:26:27.819Z

[tool_use: Read]

### User | 2026-06-18T00:26:29.599Z

[tool_result] 60	 * excluded. Order-preserving, NOT deduped (caller dedupes).
61	 * KNOWN DIVERGENCE: [[links]] inside fenced/inline code are NOT stripped, so the
62	 * link graph can marginally over-count vs the Obsidian GUI (which excludes code
63	 * spans). Acceptable for a navigation aid; documented rather than silently wrong.
64	 * @param {string} text
65	 * @returns {string[]}
66	 */
67	export function ex
... [+5420 chars truncated]

### Assistant | 2026-06-18T00:26:32.756Z

Now I have the critical contract. Let me verify how `basenameIndex` is keyed (whether basename keys include directory or are bare basenames) and whether `normalizeKey` lowercases — this determines whether the `dup_one`/`dup-one` test construction is sound and whether `normalizeKey("DupOne")` resolves against the basenames.

### Assistant | 2026-06-18T00:26:33.437Z

[tool_use: Read]

### User | 2026-06-18T00:26:34.447Z

[tool_result] 255	 * Returns { vaultRoot, notes, basenameIndex, backlinks, canvases, skipped, fileCount }.
256	 *   notes        Map<relpath, {outlinks:string[], unresolvedOut:number, tags:string[], mtimeMs, title}>
257	 *   basenameIndex Map<normKey, relpath[]>  (basename + full normalized path keys)
258	 *   backlinks    Map<relpath, string[]>    (sources that link to relpath)
259	 *   canvases     string[] o
... [+2959 chars truncated]

### Assistant | 2026-06-18T00:26:37.056Z

I now have the full contract. Let me verify the test's `dup_one`/`dup-one` construction by tracing the actual normalization, and confirm the live report path resolution. Let me run the tests to confirm they pass and check the report path computation.

### Assistant | 2026-06-18T00:26:38.010Z

[tool_use: Bash]

### User | 2026-06-18T00:26:41.433Z

[tool_result]   ...
# Subtest: stripCode: blanks fenced + inline code, preserves length; non-string -> ''
ok 17 - stripCode: blanks fenced + inline code, preserves length; non-string -> ''
  ---
  duration_ms: 0.3773
  ...
# Subtest: diagnose: a broken link ONLY inside code is NOT HEALABLE (converges with apply)
ok 18 - diagnose: a broken link ONLY inside code is NOT HEALABLE (converges with apply)
  ---
  dura
... [+332 chars truncated]

### Assistant | 2026-06-18T00:26:44.161Z

All 19 tests pass. Now let me verify the live report path resolves correctly and check whether the existing report exists, plus confirm the `vaultRoot/..` join lands at `state/shared`.

### Assistant | 2026-06-18T00:26:45.745Z

[tool_use: Bash]

### User | 2026-06-18T00:26:49.232Z

[tool_result] report: H:\prism\state\shared\vault-ambiguous-links-report.json
backup: H:\prism\state\shared\vault-link-heal-backup-STAMP
-rw-r--r-- 1 wompu 197611 62693 Jun 17 19:25 H:/prism/state/shared/vault-ambiguous-links-report.json

### Assistant | 2026-06-18T00:26:52.299Z

The report exists and the path computation mirrors the `--apply` backupDir join exactly (`vaultRoot, "..", "state", "shared", ...`). Let me inspect the actual live report to validate the honest-reporting claim (ambiguousTotal vs captured) and the candidate shape.

### Assistant | 2026-06-18T00:26:53.934Z

[tool_use: Bash]

### User | 2026-06-18T00:26:57.009Z

[tool_result] keys: [
  'generatedAt',
  'vaultRoot',
  'notes',
  'ambiguousTotal',
  'captured',
  'links'
]
ambiguousTotal: 169
captured: 169
links.length: 169
sample link: {
  "from": "memories/feedback/feedback_stale_slot_build_break_escalate_resync.md",
  "target": "feedback-foxtrot-galaxy-recover-not-rebuild",
  "candidates": [
    "memories/feedback/feedback_foxtrot_galaxy_recover_not_rebuild.md",
    "
... [+76 chars truncated]

### Assistant | 2026-06-18T00:27:03.431Z

The live report confirms the structure: `ambiguousTotal: 169, captured: 169`, candidates are raw rel paths, exactly the same-basename-across-dirs pattern described. Now let me trace the honesty of the cap. The key question for R12: if `ambiguous > AMBIG_CAP`, does the operator get told that `captured < ambiguousTotal`?

Looking at the report payload (lines 327-330): both `ambiguousTotal: report.ambiguous` and `captured: report.ambiguousLinks.length` are present, so the JSON is honest. But let me check the **console** message (line 334) — it prints both numbers too. Let me verify the `seen`/dedup interaction with the `ambiguous` counter to confirm `ambiguousTotal` is a true count of distinct ambiguous links, not an undercount.

Let me examine one subtle correctness point: whether `ambiguous` is counted per-note-deduped (via `seen`) consistently with how `ambiguousLinks` is captured, and whether a target ambiguous in note A and again in note B is counted twice (which is correct — they're distinct link instances).

### Assistant | 2026-06-18T00:27:07.669Z

[tool_use: Bash]

### User | 2026-06-18T00:27:10.746Z

[tool_result] duplicate (from,target) pairs: 0
candidate-count distribution: {"2":165,"3":3,"4":1}
candidate lists that include the source note (self): 0

### Assistant | 2026-06-18T00:27:16.243Z

Excellent — the invariants hold on live data:
- No duplicate `(from, target)` pairs (per-note dedup works).
- Candidate counts are all ≥2 (correctly ambiguous; no `cands.length === 1` leaked through as ambiguous).
- No candidate list includes the source note — `self` exclusion at line 117 holds.

Now let me trace the one subtlety in the test construction (item 5 of the task). The test at lines 146-164 builds `a/dup_one.md` and `b/dup-one.md`. I need to verify the navigator's `basenameIndex` keying produces TWO distinct normalizeKeys that BOTH slugify to `dupone`, AND that the source link `[[DupOne]]` is genuinely broken (its normalizeKey not in basenameIndex). Let me trace this precisely.

### Assistant | 2026-06-18T00:27:20.662Z

[tool_use: Bash]

### User | 2026-06-18T00:27:24.255Z

[tool_result] normalizeKey(basename dup_one.md) = "dup_one"
normalizeKey(basename dup-one.md) = "dup-one"
normalizeKey(a/dup_one.md) = "a/dup_one"
normalizeKey(b/dup-one.md) = "b/dup-one"
normalizeKey(DupOne) = "dupone"
slug(dup_one) = dupone | slug(dup-one) = dupone | slug(DupOne) = dupone

### Assistant | 2026-06-18T00:27:30.979Z

The test construction is sound and verified:
- `normalizeKey("dup_one") = "dup_one"` and `normalizeKey("dup-one") = "dup-one"` → **distinct** keys in `basenameIndex` (so they don't collapse before slugify).
- `normalizeKey("DupOne") = "dupone"` → not equal to either basename key → the link is genuinely **broken** (passes the `basenameIndex.has(normalizeKey(target))` guard at line 219).
- `slugify` of all three → `"dupone"` → both notes are slug rivals → ambiguous (2 candidates).

The test's reliance on `normalizeKey` keeping `dup_one` vs `dup-one` distinct while `slugify` collapses them is exactly the mechanism that creates ambiguity, and it's correct. The test asserts the actual rival paths (`deepEqual([...a.candidates].sort(), ["a/dup_one.md", "b/dup-one.md"])`), not just the count — mutation-proof.

Now let me confirm the `--ambiguous` branch is strictly read-only by checking for any write/rewrite/applyHeals call within the branch, and that the apply/heal path is genuinely untouched.

### Assistant | 2026-06-18T00:27:32.407Z

[tool_use: Bash]

### User | 2026-06-18T00:27:37.098Z

[tool_result] 217:    // with applyHeals, which skips code via codeRanges.
261: * @param {object} io  { readFileImpl, writeFileImpl, renameImpl, existsImpl, mkdirImpl, copyImpl, backupDir }
263:export function applyHeals(report, vaultRoot = DEFAULT_VAULT, io = {}) {
265:    readFileImpl = fs.readFileSync, writeFileImpl = fs.writeFileSync,
266:    renameImpl = fs.renameSync, existsImpl = fs.existsSync,
267:    m
... [+445 chars truncated]

### Assistant | 2026-06-18T00:27:45.625Z

This confirms the safety invariant. The `--ambiguous` branch (lines 321-345):
- Returns at line 344 **before** ever reaching the `if (flags.apply)` block at line 363.
- Its only write is `fs.writeFileSync(reportPath, ...)` at line 333 (the JSON report) + the `mkdirSync` for its parent dir at line 332.
- It never calls `applyHeals`, `rewriteLinks`, `renameImpl`, or `copyImpl`. No memo is rewritten.

The `applyHeals` mutation calls (lines 287-288) live exclusively in the `applyHeals` function, only reachable via the `flags.apply` branch — which `--ambiguous` short-circuits past via its `return`. The ambiguous→NEVER-auto-pick invariant in `classifyBrokenTarget` (line 119, ambiguous classified as `DANGLING`) is untouched, so even `--apply` cannot heal an ambiguous link. Both are verified.

Now let me verify one edge concern for honest reporting: if `flags.ambiguous` is set but `--apply` is *also* passed, does the early `return` correctly prevent any heal? And does `--json` take precedence (it's checked first at line 316)? Let me also confirm the `parseArgs` flag handling for `--ambiguous` with a trailing value.

### Assistant | 2026-06-18T00:27:52.250Z

[tool_use: Bash]

### User | 2026-06-18T00:27:52.837Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 53172 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 259s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-
... [+521 chars truncated]

### Assistant | 2026-06-18T00:27:56.354Z

That's an unrelated MCP bridge advisory (a hook fired on the bash call), not a failure of my command. Let me re-run the parse trace.

### Assistant | 2026-06-18T00:27:58.459Z

[tool_use: Bash]

### User | 2026-06-18T00:28:02.144Z

[tool_result] --ambiguous --apply : {"ambiguous":true,"apply":true}
--ambiguous --samples 20 : {"ambiguous":true,"samples":"20"}
--json --ambiguous : {"json":true,"ambiguous":true}

### Assistant | 2026-06-18T00:28:08.722Z

Flag parsing confirms:
- `--ambiguous --apply` → both true, but `main()` checks `flags.json` first (line 316), then `flags.ambiguous` (line 321) which `return`s before the `flags.apply` block. So `--ambiguous --apply` runs the **read-only** ambiguous report and never heals. Safe.
- `--json` precedes `--ambiguous`, so `--json` wins if both passed. Harmless precedence, consistent with the existing tool layering.
- `--samples` value is reused by the ambiguous branch via `sampleN` (line 339) — matches existing `--samples` reuse convention.

I have everything I need. Let me do one final convention-conformance check: confirm the `--ambiguous` flag is documented in the usage block (R11/honest-reporting — a flag that exists but is undocumented is a drift).

### Assistant | 2026-06-18T00:28:10.301Z

[tool_use: Bash]

### User | 2026-06-18T00:28:14.051Z

[tool_result] 40://   - DRY-RUN by default; `--apply` performs the rewrite.
47:// Usage:
49://   node scripts/vault-link-doctor.mjs --json          # machine JSON
50://   node scripts/vault-link-doctor.mjs --samples 20    # show N per class
51://   node scripts/vault-link-doctor.mjs --apply         # heal the HEALABLE tier

### Assistant | 2026-06-18T00:28:36.270Z

Confirmed: the Usage block (lines 47-51) documents `--json`, `--samples`, and `--apply` but **not** `--ambiguous`. This is a minor convention/documentation drift — the new flag is the only CLI mode absent from the header usage list. Not a safety or correctness issue, but worth flagging as P2 for conformance with R11 (the header is the tool's contract surface, and it now under-documents its modes).

I have completed a full end-to-end review. Here is my verdict.

---

VERDICT: PASS

summary: The `--ambiguous` review mode is strictly read-only — its only write is the advisory JSON report, it returns before the `--apply` heal block, and the ambiguous→NEVER-auto-pick invariant in `classifyBrokenTarget` is untouched (ambiguous links are classified `DANGLING` and cannot be healed even under `--apply`). The branch conforms to the tool's existing flag/path/sampleN conventions, reports honestly (both `ambiguousTotal` and `captured` in JSON and console), and the two new tests are mutation-proof, asserting actual rival paths against a sound `normalizeKey`-vs-`slugify` construction. Verified live: 169 ambiguous links captured, all invariants (no dup pairs, all candidate counts ≥2, no self in candidates) hold; all 19 tests pass.

findings:
- [P2] H:/prism/scripts/vault-link-doctor.mjs:47-51 -- the Usage header documents `--json`, `--samples`, `--apply` but omits the new `--ambiguous` mode, the only CLI branch missing from the tool's self-described contract surface (R11 convention drift). -- Add a line `node scripts/vault-link-doctor.mjs --ambiguous   # advisory review of ambiguous (unhealable) links` to the Usage block.
- [P2] H:/prism/scripts/vault-link-doctor.mjs:329,334 -- the cap is honest *today* (169 < 1000, and both `ambiguousTotal` and `captured` are emitted in the JSON payload and the console line), but if `ambiguous` ever exceeds `AMBIG_CAP=1000` the operator must infer the truncation by comparing the two numbers; there is no explicit "TRUNCATED -- N of M captured" sign
... [+2131 chars truncated]
