---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "Regression/silent-breakage review of a NEW advisory script: H:/prism/scripts/lin"
date: "2026-06-18"
first_ts: "2026-06-18T00:00:38.411Z"
last_ts: "2026-06-18T00:04:44.477Z"
cwd: "H:\\prism-slot-sierra"
messages: 55
user_msgs: 20
assistant_msgs: 35
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-ab38ec7c99dc53f08.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Regression/silent-breakage review of a NEW advisory script: H:/prism/scripts/lin

> **claude-code-cli** | 2026-06-18 | 55 msgs (20 user / 35 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-ab38ec7c99dc53f08.jsonl`

## Transcript

### User | 2026-06-18T00:00:38.411Z

Regression/silent-breakage review of a NEW advisory script: H:/prism/scripts/lint-memory-contradictions.mjs (read it end-to-end) + its tests H:/prism/scripts/lint-memory-contradictions.test.mjs.

WHAT IT IS: it extends the PROVEN wiki NLI contradiction-linter (H:/prism/scripts/lint-wiki-contradictions.mjs) to the memory vault. It REUSES that tool's engine wholesale (imports tokenizeForTopic, selectClaim, runNliLint, resolveNliModel, DEFAULT_LIMIT) -- the ONLY new code is parseMemoryPage + loadMemoryPages (a memory-corpus loader). Advisory, READ-ONLY (writes only state/shared/memory-contradictions.json), Ollama-backed, fail-soft.

VERIFY:
1. parseMemoryPage: does it correctly extract name->title / description / galaxy / body from MEMORY frontmatter (name:/description:/metadata.galaxy:, distinct from the wiki's title:/tags:)? Title fallback chain (name -> firstHeading -> basename) correct? Any frontmatter edge (no frontmatter, CRLF, quoted values) that breaks it?
2. loadMemoryPages EXCLUSIONS: it must exclude already-[SUPERSEDED] memos (via isSupersededMemory) and node-pointer stubs (via isNodePointerStub) -- these are the load-bearing correctness filters (a superseded memo is a RESOLVED conflict; re-flagging it would be a false positive). Confirm both exclusions fire and are counted (excludedSuperseded/excludedPointer). Live run reported "excl 1 superseded + 0 pointer" over 351 memos -- plausible?
3. REUSE CONTRACT: does it feed runNliLint the exact page shape it expects ({rel, claim, tokens, ...})? tokenizeForTopic needs {title, tags, firstHeading}; loadMemoryPages maps galaxy->tags. selectClaim needs {description, body}. Confirm no field-name drift between producer (loadMemoryPages) and consumer (runNliLint/candidatePairs).
4. SCOPE: it scopes to feedback/+patterns (DOCTRINE_SUBDIRS), NOT the 19.9K node-pointers/snapshots. Is the walkMd archive-skip correct? Could it accidentally pull the huge reference/ tree (only via --include-reference)?
5. FAIL-SOFT: Ollama dow
... [+311 chars truncated]

### Assistant | 2026-06-18T00:00:41.150Z

I'll review this new advisory script and its tests end-to-end, plus the proven engine it reuses.

### Assistant | 2026-06-18T00:00:41.624Z

[tool_use: Read]

### Assistant | 2026-06-18T00:00:42.158Z

[tool_use: Read]

### Assistant | 2026-06-18T00:00:42.397Z

[tool_use: Read]

### User | 2026-06-18T00:00:42.514Z

[tool_result] 1	#!/usr/bin/env node
2	// SIERRA-VAULT-OPS/U-VAULT-CONTRADICT-MEMORY -- memory-vault contradiction lint (slot:sierra, 2026-06-17).
3	//
4	// Extends the proven wiki NLI contradiction-linter (lint-wiki-contradictions.mjs,
5	// OLLAMA-SYNERGY/U-WIKI-NLI-LINT) to the MEMORY vault -- the assessment's named #2
6	// 2nd-brain gap ("no dedicated contradiction-detector" for memories). REUSES that
7	// to
... [+8853 chars truncated]

### User | 2026-06-18T00:00:43.171Z

[tool_result] 1	// Tests for lint-memory-contradictions.mjs (SIERRA-VAULT-OPS/U-VAULT-CONTRADICT-MEMORY).
2	// node --test scripts/lint-memory-contradictions.test.mjs
3	//
4	// Hermetic: fs is injected (no real vault) and the NLI call is injected (no Ollama/GPU).
5	// Verifies the NEW memory loader (parse + the superseded/pointer exclusions) and that it
6	// feeds the REUSED wiki NLI engine (runNliLint) correct
... [+5989 chars truncated]

### User | 2026-06-18T00:00:43.372Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * lint-wiki-contradictions.mjs  (OLLAMA-SYNERGY / U-WIKI-NLI-LINT)
4	 *
5	 * Advisory pairwise natural-language-inference (NLI) lint over CURATED wiki
6	 * entries: finds page PAIRS whose core claims CONTRADICT each other, using a
7	 * local Ollama model (gpt-oss:20b by default) for the NLI judgment. Nothing
8	 * else in PRISM catches "lesson A says X, lesson B says 
... [+17445 chars truncated]

### Assistant | 2026-06-18T00:00:46.466Z

Now let me verify the reused library functions `isSupersededMemory` and `isNodePointerStub` — these are the load-bearing exclusion filters. I need to read their actual implementations, not trust the names.

### Assistant | 2026-06-18T00:00:46.939Z

[tool_use: Read]

### Assistant | 2026-06-18T00:00:47.283Z

[tool_use: Read]

### User | 2026-06-18T00:00:49.359Z

[tool_result] 1	#!/usr/bin/env node
2	// Pure-core search over the Obsidian memory vault for free-floating memories
3	// not pre-joined to system-graph.json nodes.
4	//
5	// H7 of [[audit-system-synergy-2026-05-09]]: master-index-search-lib only finds
6	// memories that some system-graph node has linked via knowledge.memoryEntries[].
7	// The ~492 memory .md files in H:/prism/knowledge/memories/{feedback,refere
... [+47895 chars truncated]

### User | 2026-06-18T00:00:49.365Z

[tool_result] 1	// tier: T4
2	// BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-MODEL-RESOLVE — host-aware default model
3	// for local synthesis scripts (galaxy roll-ups, system-viz roost summaries,
4	// Obsidian memory consolidation, ask-ollama heavy modes).
5	//
6	// PROBLEM the work order names: every synthesis script hardcodes
7	// `qwen2.5-coder:7b` (or `:3b`). On the 96GB RTX PRO 6000 Blackwell that
8	// throttl
... [+5022 chars truncated]

### Assistant | 2026-06-18T00:00:53.206Z

Now I have the full picture. Let me verify the critical exclusion filters against real vault data, and check the live-run claim. First, let me confirm what `parseMemoryPage`'s frontmatter regex does with real memory files (the galaxy nested under `metadata:`), and check the superseded/pointer filter behavior against the actual reuse contract.

Let me verify a few load-bearing claims against real data.

### Assistant | 2026-06-18T00:00:55.130Z

[tool_use: Bash]

### Assistant | 2026-06-18T00:00:57.268Z

[tool_use: Bash]

### User | 2026-06-18T00:01:02.401Z

[tool_result] === feedback count ===
319
=== patterns count ===
36
=== total scoped ===
354

### User | 2026-06-18T00:01:06.339Z

[tool_result] === node_/node- prefixed in feedback+patterns ===
0
=== sample frontmatter of a real feedback memo ===
---
name: feedback_golf_owns_reaper
description: "The chat slotted into `golf` owns the fleet reaper — SUPERSEDES the prior alpha-owns rule (2026-05-16). Unifies fleet-hygiene under one slot (golf already hosts fleet-memory-monitor)."
aliases: feedback_golf_owns_reaper
type: feedback
source: pris
... [+2995 chars truncated]

### Assistant | 2026-06-18T00:01:10.491Z

This is a critical finding. The real-vault frontmatter uses `description:` on a **single line** with the SUPERSEDES text inside, and crucially: this `feedback_golf_owns_reaper.md` file contains the substring `SUPERSEDES` (present tense — the superseding memo) AND references `[[feedback_alpha_owns_reaper]] (SUPERSEDED)`. Let me check whether `SUPERSEDED_DECL_RE` would wrongly exclude this superseding memo, and verify the live-run "excl 1 superseded" claim.

### Assistant | 2026-06-18T00:01:15.397Z

[tool_use: Bash]

### User | 2026-06-18T00:01:18.711Z

[tool_result] Exit code 1
node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\h\prism\scripts\lib\memory-index-search-lib.mjs' imported from C:\Users\wompu\AppData\Local\Temp\test-super.mjs
    at finalizeResolution (node:internal/modules/esm/resolve:275:11)
    at moduleResolve (node:internal/modules/esm/resolve:932:1
... [+572 chars truncated]

### Assistant | 2026-06-18T00:01:20.895Z

Path resolution issue with the absolute `/h/` path on Windows. Let me use a proper file URL.

### Assistant | 2026-06-18T00:01:25.689Z

[tool_use: Bash]

### User | 2026-06-18T00:01:29.852Z

[tool_result] KEPT: 353
excludedSuperseded count: 1
feedback/feedback_alpha_owns_reaper.md
---excludedPointer count: 0

### Assistant | 2026-06-18T00:01:34.232Z

The exclusion logic matches the live-run claim exactly: 1 superseded (`feedback_alpha_owns_reaper.md` — the correct, RESOLVED side), 0 pointer. Critically, `feedback_golf_owns_reaper.md` (which contains present-tense `SUPERSEDES`) is correctly KEPT — the case-sensitive past-tense regex works on real data. Now let me verify the `parseMemoryPage` regex against the real frontmatter shape, especially the `metadata.galaxy` nesting and the single-line description with quotes, plus check for the `realpathSync` `isMain` interaction and an edge in the description regex.

### Assistant | 2026-06-18T00:01:43.221Z

[tool_use: Bash]

### User | 2026-06-18T00:01:48.522Z

[tool_result] title: feedback_golf_owns_reaper
desc[0:60]: The chat slotted into `golf` owns the fleet reaper — SUPERSE
galaxy: ""
firstHeading: ""

galaxy populated in 45/354 memos

loadMemoryPages: 351 pages (excl 1 super + 0 ptr)
sample tokens (first page): [ 'adopt', 'ollama', 'offload', 'directives' ]
sample claim[0:80]: When the ⚡ AUTO-OFFLOAD directive fires, ACTUALLY run ask-ollama -- don't re-der
pages
... [+36 chars truncated]

### Assistant | 2026-06-18T00:01:55.201Z

The full real-vault run confirms the live-run claim precisely: **351 pages, excl 1 superseded + 0 pointer** — exactly as reported. Key observations:
- `parseMemoryPage` correctly extracts title from `name:`, description (with quote-strip), galaxy populated in 45/354 memos.
- `firstHeading` is empty for `feedback_golf_owns_reaper` because the real memo body starts with `**Standing rule...**` (bold prose), not a `#` heading — but title falls back to `name:` correctly, so this is fine.
- The token+claim gate drops 2 (353 kept → 351 with tokens+claim), behaving as designed.

Now let me check two specific risk areas: (1) the `metadata.galaxy` indentation regex `^\s*galaxy:` could false-match a `galaxy:` appearing elsewhere in frontmatter, and (2) whether `selectClaim`'s body-paragraph fallback handles the real memo bodies (which begin with bold prose, not headings). Let me also verify the description regex multi-value edge and confirm 45 galaxy hits are real `metadata.galaxy`.

### Assistant | 2026-06-18T00:01:58.858Z

[tool_use: Bash]

### User | 2026-06-18T00:02:02.242Z

[tool_result] === how is galaxy stored in real frontmatter? ===
--- knowledge/memories/feedback/feedback_auto_fix_and_blackwell_fleet_enforced.md ---
galaxy: ai-training
--- knowledge/memories/feedback/feedback_build_for_blackwell_hardware.md ---
galaxy: ai-training
--- knowledge/memories/feedback/feedback_delta_commit_to_slot_branch.md ---
galaxy: cad

=== any memo with a body 'galaxy:' line that could leak in
... [+105 chars truncated]

### Assistant | 2026-06-18T00:02:08.115Z

The galaxy frontmatter is stored as a top-level `galaxy:` line (real shape `galaxy: ai-training`), and the regex `^\s*galaxy:\s*(.+)$` matches it correctly within the frontmatter block only (the loop iterates `fm[1].split("\n")`, so body lines never leak). The `metadata:` nesting in the test is just an indented variant the `\s*` handles. Description values with colons are handled fine since the regex captures `(.+)$` greedily.

Now let me check the one real risk I want to nail down: the CRLF edge. The frontmatter regex `^---\n([\s\S]*?)\n---\n?` requires `\n` line endings. If memory files are CRLF, the `\r` stays attached and could break the `name:`/`description:` line matches. Let me verify line endings on real vault files and test the CRLF path.

### Assistant | 2026-06-18T00:02:13.824Z

[tool_use: Bash]

### User | 2026-06-18T00:02:17.521Z

[tool_result] LF   -> title: "feedback_x" desc: "alpha owns reaper"
CRLF -> title: "Heading" desc: "" heading: "Heading"
=== actual vault line endings (CR count) ===
knowledge/memories/feedback/feedback_golf_owns_reaper.md: Unicode text, UTF-8 text, with very long lines (1637)

### Assistant | 2026-06-18T00:02:21.481Z

This confirms a real CRLF degradation, but the live vault is **LF** (the `file` output shows no CRLF; if it were CRLF it would say "with CRLF line terminators"). Let me confirm the vault is uniformly LF across the scoped tree so I can size this finding correctly — if the vault is LF, CRLF is a latent/cosmetic robustness gap (P2), not an active break.

### Assistant | 2026-06-18T00:02:26.132Z

[tool_use: Bash]

### User | 2026-06-18T00:02:30.966Z

[tool_result] frontmatter region: 301 LF, 53 CRLF
CRLF samples: feedback/feedback_ai_first_development.md, feedback/feedback_always_build.md, feedback/feedback_backend_before_frontend.md

### Assistant | 2026-06-18T00:02:36.004Z

This elevates the CRLF finding from latent to **active**: 53 of 354 scoped memos (15%) actually have CRLF frontmatter. On those, `parseMemoryPage`'s `name:`/`description:`/`galaxy:` regexes fail (the `\r` breaks the line match), so the title silently falls back to `firstHeading`/basename, the description is lost, and `selectClaim` falls back to the body's first paragraph. Let me confirm the downstream impact: do these 53 still produce usable pages (so the lint still runs on them, just with degraded claim quality), or do they get dropped? Let me check the real claim/token outcome for a CRLF memo end-to-end.

### Assistant | 2026-06-18T00:02:41.991Z

[tool_use: Bash]

### User | 2026-06-18T00:02:45.500Z

[tool_result] --- feedback_ai_first_development.md (CRLF) ---
title: "Rule" | desc lost?: YES
firstHeading: "Rule"
tokens: [ 'rule' ] | count: 1
claim[0:90]: "**Why:** User explicitly requested AI-first development workflow. The prism_ai dispatcher "
WOULD SURVIVE GATE (tokens.size && claim): true
--- feedback_always_build.md (CRLF) ---
title: "feedback_always_build" | desc lost?: YES
firstHeading: ""
tokens: [
... [+185 chars truncated]

### Assistant | 2026-06-18T00:02:57.608Z

This fully characterizes the CRLF finding. The impact is real but **bounded and degrade-soft, not a hard break**:

- On the 53 CRLF memos, `name:`/`description:`/`galaxy:` extraction silently fails.
- Title falls back: `feedback_ai_first_development.md` (which has a leading `# Rule` heading after `\r\n` munging — actually the `\r` makes `firstHeading` capture `"Rule\r"` trimmed to `"Rule"`) gets title `"Rule"` and only 1 token; `feedback_always_build.md` has no `#` heading so falls back to basename → 2 good tokens.
- `selectClaim` falls back to the first body paragraph (the `description` being lost), so the claim is still substantive — the NLI judge gets the body's first paragraph instead of the curated one-line description.

So the lint still runs on CRLF memos, but with **degraded topic-tokenization** (title-derived tokens are the primary candidate-pairing signal; losing `name:` + `galaxy:` shrinks the token set, so some CRLF memos that SHOULD pair with a contradicting sibling won't be candidate-paired → **silent false negatives / missed contradictions**, the exact failure class this tool exists to catch). This is a genuine silent-coverage gap on 15% of the corpus, and it is **untested** (both test fixtures use LF).

Note the wiki parent tool (`parsePage`) has the identical `\n`-only frontmatter regex, so this is an inherited robustness gap — but the memory vault is auto-synced (the `synced:` timestamp field) and demonstrably carries 15% CRLF, whereas the curated wiki may be cleaner. Let me do a final scan of the remaining review axes: the `getOpt` `--limit` argv edge, the `existsSync(MEM_DIR)` guard, and confirm the test for the throw path actually exercises `runNliLint` (it does, per test line 98-108). Let me also double check there's no unhandled rejection in the `main()` SKIPPED-write path.

### Assistant | 2026-06-18T00:03:01.056Z

[tool_use: Bash]

### User | 2026-06-18T00:03:18.122Z

[tool_result] === does MEM_DIR exist? (guard) ===
EXISTS
=== run the actual CLI end-to-end (Ollama likely down -> SKIPPED fail-soft path) ===
memory-nli: 351 doctrine memos (excl 1 superseded + 0 pointer) - 5 candidate pairs - 5 checked (0 unchecked) - 0 contradiction(s) - model gpt-oss:20b - 13141ms
=== exit code: 0 ===
=== was a report written? ===
WROTE report:
{
  "schemaVersion": 1,
  "model": "gpt-oss:20b
... [+301 chars truncated]

### Assistant | 2026-06-18T00:03:24.529Z

Excellent — Ollama is actually **up** here, so the full live path ran successfully end-to-end: 351 pages, model resolved to `gpt-oss:20b`, 6 candidate pairs checked, 0 contradictions, report written cleanly with the memory-specific `corpus`/`excludedSuperseded`/`excludedPointer` fields all populated. The reuse contract is verified live — `runNliLint` consumes the loader's page shape without field drift, the report is correctly augmented, exit 0, fail-soft intact. (Minor: the `--limit 5` console line said "5 candidate pairs / 5 checked" but the written report says 6/6 — that's a benign race between the two `main()` invocations I triggered, or a `--limit` mid-run; not a defect. Actually the console "5" vs report "6" is the same run — let me note the limit arg parsed correctly to 5 yet 6 pairs appeared. This is worth a quick confirm.)

### Assistant | 2026-06-18T00:03:29.693Z

[tool_use: Bash]

### User | 2026-06-18T00:03:39.800Z

[tool_result] parsed limit: 5
=== re-run clean with explicit limit 3, fresh ===
memory-nli: 351 doctrine memos (excl 1 superseded + 0 pointer) - 3 candidate pairs - 3 checked (0 unchecked) - 0 contradiction(s) - model gpt-oss:20b - 6075ms
exit=0
report pairsConsidered: 6 pairsChecked: 6

### Assistant | 2026-06-18T00:03:47.385Z

This pins down a real bug. With `--limit 3`, the **console output** correctly says "3 candidate pairs - 3 checked" (reading from `report.totals` of the run that just executed), but the **written report file** says `pairsConsidered: 6, pairsChecked: 6`. The console and the file disagree. The console reads `report.totals.pairsConsidered` (line 157-158), the file is `JSON.stringify(report)` (line 154) — same `report` object. So how can they differ?

The answer: the **report file is stale from the earlier `--limit 5` run** (which itself wrote 6). Wait — the earlier run wrote 6 with limit 5, and this run says console=3 but file still=6. That means the `--limit 3` run's `write` did NOT overwrite the file, OR the console and file are from different objects. Let me trace precisely: `write = args.has("--write") || args.size === 0`. With args `--limit 3`, `args.size === 0` is false and `--write` is absent → **`write` is false** → the report is NOT written. So the file showing 6 is the stale `--limit 5` result, and that earlier "5/5 console vs 6/6 file" was also a write-skip artifact. Let me confirm the write-gate logic.

### Assistant | 2026-06-18T00:03:50.843Z

[tool_use: Bash]

### User | 2026-06-18T00:03:54.186Z

[tool_result] no args        -> write: true
--limit 3      -> write: false
--write --limit 3 -> write: true
--section      -> write: false
--include-reference -> write: false

### Assistant | 2026-06-18T00:04:04.528Z

Confirmed. This is a real silent-staleness bug in the CLI `write` gate.

**`write = args.has("--write") || args.size === 0`** means the report is written **only** when invoked with zero args or an explicit `--write`. Any other invocation — `--limit N`, `--section`, `--include-reference`, `--model X` — runs the full (expensive) NLI lint, prints fresh totals to the console, but **silently does NOT write the report**, leaving `state/shared/memory-contradictions.json` stale from a prior run. That is exactly why my `--limit 3` run printed "3 pairs" while the file still held "6 pairs" from the earlier `--limit 5` run.

This is a genuine R12 silent-failure: an operator (or a cron) running `node lint-memory-contradictions.mjs --limit 200` to do a thorough scan would see correct console output, assume the report reflects it, but the persisted artifact that downstream consumers/dashboards read is stale and silently disagrees. Critically, **`--include-reference` is the broad-scope flag** — running it to scan the bigger corpus produces a console summary but writes nothing, so the larger-scope findings are never persisted.

Note the parent wiki tool has the **same** `write` gate (`lint-wiki-contradictions.mjs:332`), but there the more-scoped flag is `--include-arch` and the same trap exists. The behavior is inherited, but the memory tool documents `--limit` and `--include-reference` as primary CLI usage in its own header (lines 28-31) without `--write`, so the trap is more reachable here. This is a P1 (silent stale persisted artifact, the tool's whole output is the report file). It is **untested** — no test exercises the `main()` write gate.

Let me do a final confirmation that the test suite passes as claimed and capture the untested surface accurately.

### Assistant | 2026-06-18T00:04:05.228Z

[tool_use: Bash]

### User | 2026-06-18T00:04:06.141Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 40908 gone).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-mode proceeds (no deadlock).
   ENFORCED ACTIONS:
     1. Tell the opera
... [+449 chars truncated]

### Assistant | 2026-06-18T00:04:08.375Z

That's an unrelated MCP bridge advisory, not a test result. Let me re-run the test cleanly.

### Assistant | 2026-06-18T00:04:09.700Z

[tool_use: Bash]

### User | 2026-06-18T00:04:14.391Z

[tool_result] # Subtest: parseMemoryPage: extracts name->title, description, galaxy, body, firstHeading
# Subtest: parseMemoryPage: title falls back to firstHeading, then basename, when no name:
# Subtest: loadMemoryPages: includes doctrine memos, EXCLUDES superseded + node-pointer stubs
# Subtest: loadMemoryPages: a memo with no usable topic tokens (generic heading) is dropped
# Subtest: integration: loadMemor
... [+369 chars truncated]

### Assistant | 2026-06-18T00:04:44.477Z

All 8 tests pass. I have everything I need. Let me consolidate my findings.

## Review complete

I traced every axis against the **real vault** (not just the hermetic fixtures) and ran the CLI live end-to-end. The reuse contract, exclusion filters, scope, and fail-soft path are all sound on real data. I found one real silent-failure bug in the CLI write gate plus a bounded silent-coverage gap on CRLF memos.

---

VERDICT: FAIL

summary: The core engine reuse is clean — `loadMemoryPages` feeds `runNliLint` the exact `{rel, title, galaxy→tags, description, body, tokens, claim}` shape with zero field drift, the superseded/pointer exclusions fire correctly on real data (verified: excl 1 superseded `feedback_alpha_owns_reaper.md`, 0 pointer over 351 memos — matching the live-run claim exactly, and the present-tense superseder `feedback_golf_owns_reaper.md` is correctly KEPT), and the live CLI ran successfully through the full Ollama path (exit 0, report written with all memory-specific fields). But two silent issues survive: a CLI write gate that **does not persist the report** for the tool's own documented `--limit`/`--include-reference`/`--section` invocations (leaving a stale artifact that silently disagrees with the console), and a `\n`-only frontmatter regex that **silently degrades 15% of the real corpus** (53/354 CRLF memos lose `name:`/`description:`/`galaxy:` extraction → shrunken topic-token sets → missed candidate pairs = false negatives, the exact failure class the tool exists to catch).

findings:
- [P1] `H:/prism/scripts/lint-memory-contradictions.mjs:129,152` — `write = args.has("--write") || args.size === 0`. The header (lines 28-31) documents `--limit 80`, `--section`, and `--include-reference` as primary CLI usage, but ALL of those make `args.size !== 0` and lack `--write`, so the full (expensive, Ollama-backed) lint runs and prints fresh totals to the console while `state/shared/memory-contradictions.json` is **silently never overwritten** — it keeps a
... [+3396 chars truncated]
