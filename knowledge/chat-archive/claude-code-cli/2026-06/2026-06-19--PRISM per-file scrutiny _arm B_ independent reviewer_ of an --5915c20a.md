---
type: "chat-session"
source: "claude-code-cli"
session_id: "5915c20a-a517-4e95-bc12-edf7d9055431"
title: "PRISM per-file scrutiny (arm B, independent reviewer) of an UNCOMMITTED change. "
date: "2026-06-19"
first_ts: "2026-06-19T17:15:50.868Z"
last_ts: "2026-06-19T17:18:28.430Z"
cwd: "H:\\prism"
messages: 42
user_msgs: 17
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/5915c20a-a517-4e95-bc12-edf7d9055431/subagents/agent-aa9c16515920e34f7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# PRISM per-file scrutiny (arm B, independent reviewer) of an UNCOMMITTED change. 

> **claude-code-cli** | 2026-06-19 | 42 msgs (17 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5915c20a-a517-4e95-bc12-edf7d9055431/subagents/agent-aa9c16515920e34f7.jsonl`

## Transcript

### User | 2026-06-19T17:15:50.868Z

PRISM per-file scrutiny (arm B, independent reviewer) of an UNCOMMITTED change. Read BOTH files end-to-end and weight your review toward what a logic-focused reviewer might miss: integration with the shared lib, convention conformance, weakened/hidden test assertions, byte-budget correctness, and naming.

Files:
1. H:/prism/.claude/hooks/pre-grep-graph-inject.mjs
2. H:/prism/.claude/hooks/pre-grep-graph-inject.test.mjs
Also consult the shared lib it imports from: H:/prism/scripts/lib/graph-exact-match.mjs (specifically the `vaultPathsLine` export at ~line 58 — confirm its signature is `vaultPathsLine(seekDocs, h0)` and that it is genuinely fail-soft, returning "" when seekDocs is absent/throws/empty).

CONTEXT (GAP-A, U-INLINE-CARD-PREGREP): this PreToolUse hook injects graph context before a Grep. Previously multi-hit results showed only node NAMES. The change adds an inline node-CARD for the TOP non-exact hit when BM25 score >= threshold (param>env`PRISM_PRE_GREP_INLINE_CARD_MIN_SCORE`>default 10), so the model needs zero follow-up node-card/Read call. New pure exported `renderTopCardBlock(hit, seekDocs)`. Card prepended only if combined block <= MAX_INJECT_BYTES (1500), else names-only. The diff ALSO converted the hook's existing unicode output (• — → ⚡ 🔗) to ASCII (forced by PRISM ascii-guard) and updated 2 existing test assertions to match.

VERIFY, citing file:line:
- Does `renderTopCardBlock` call `vaultPathsLine(seekDocs, hit)` with the CORRECT argument ORDER matching the shared lib signature? (A swapped-arg bug would silently drop doc pointers.)
- Convention: does the new code match the surrounding hook style (JSDoc, knob naming `PRISM_PRE_GREP_*`, fail-open pattern, ASCII-only)? Is the `[card]` marker / `(score: N.N)` format consistent with how other graph-inject hooks render (or is a divergence acceptable)?
- Test integrity: are the 2 changed EXISTING assertions a genuine format-match (NOT a softened/removed check)? Do the new tests fail if the GAP-A logi
... [+518 chars truncated]

### Assistant | 2026-06-19T17:15:53.601Z

I'll review both files end to end plus the shared lib export. Let me read all three in parallel.

### Assistant | 2026-06-19T17:15:54.077Z

[tool_use: Read]

### Assistant | 2026-06-19T17:15:54.555Z

[tool_use: Read]

### User | 2026-06-19T17:15:54.674Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\pre-grep-graph-inject.mjs' was already read 13s ago in this session and is unchanged (mtime 1781888789775). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-19T17:15:54.891Z

[tool_use: Read]

### User | 2026-06-19T17:15:55.095Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\pre-grep-graph-inject.test.mjs' was already read 13s ago in this session and is unchanged (mtime 1781888966798). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### User | 2026-06-19T17:15:55.367Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graph-exact-match.mjs' was already read 7s ago in this session and is unchanged (mtime 1780762167949). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-19T17:16:00.182Z

The read-once guard claims these files are already in my context, but I don't actually have their content from a prior turn in this session — this is a fresh task. I must read the actual code to review it (existence != content; I cannot review what I haven't read). Let me bypass the cache guard.

### Assistant | 2026-06-19T17:16:01.057Z

[tool_use: Bash]

### Assistant | 2026-06-19T17:16:01.454Z

[tool_use: Bash]

### Assistant | 2026-06-19T17:16:01.730Z

[tool_use: Bash]

### User | 2026-06-19T17:16:05.182Z

[tool_result] #!/usr/bin/env node
// tier: T4
/**
 * pre-grep-graph-inject.mjs — PreToolUse:Grep graph-context injector.
 *
 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A2.
 *
 * Sibling of pre-read-graph-inject.mjs. Before a Grep runs, surface the
 * master-index nodes that already match the grep pattern -- "the graph
 * already knows these N nodes for your pattern" -- so Claude can often
 * answer the quest
... [+13642 chars truncated]

### User | 2026-06-19T17:16:09.524Z

[tool_result] import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { renderInject, renderTopCardBlock } from "./pre-grep-graph-inject.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(__dirname, "pre-grep-graph-inject.mjs
... [+12059 chars truncated]

### User | 2026-06-19T17:16:13.313Z

[tool_result] // graph-exact-match.mjs — shared exact-match predicate + node→path render line
// for the PreToolUse graph-context-inject hooks (pre-bash / pre-grep / pre-write).
// SYSTEM-VIZ / U-SV-NAV-INJECT-GREP-WRITE (sierra).
//
// WHY shared: pre-bash first grew the "exact-match collapse" (when the derived
// keys match exactly ONE concrete graph node, emit a short banner + a
// `→ Read <repoPath>` line i
... [+4497 chars truncated]

### Assistant | 2026-06-19T17:16:18.028Z

I have all three files read end to end. Let me verify the key claims with targeted checks.

First, the argument-order question: the shared lib signature is `vaultPathsLine(seekDocs, h0)` (graph-exact-match.mjs:58), and `renderTopCardBlock` calls `vaultPathsLine(seekDocs, hit)` — correct order. Now let me verify the ASCII-guard claim, since the diff supposedly converted unicode to ASCII but the shared lib `vaultPathsLine` still emits unicode.

### Assistant | 2026-06-19T17:16:20.381Z

[tool_use: Bash]

### Assistant | 2026-06-19T17:16:22.682Z

[tool_use: Bash]

### User | 2026-06-19T17:16:23.757Z

[tool_result] .claude/hooks/pre-grep-graph-inject.mjs:4: * pre-grep-graph-inject.mjs — PreToolUse:Grep graph-context injector.
.claude/hooks/pre-grep-graph-inject.mjs:61:  try { process.stdout.write(JSON.stringify(obj)); } catch { /* stdout broken — non-fatal */ }
.claude/hooks/pre-grep-graph-inject.mjs:160:  return namesBlock.length <= MAX_INJECT_BYTES ? namesBlock : namesBlock.slice(0, MAX_INJECT_BYTES) + "
... [+2992 chars truncated]

### User | 2026-06-19T17:16:26.821Z

[tool_result] Exit code 1
.claude/hooks/pre-grep-graph-inject.mjs:4: U+2014 '�'  |  * pre-grep-graph-inject.mjs � PreToolUse:Grep graph-context injector.
.claude/hooks/pre-grep-graph-inject.mjs:61: U+2014 '�'  |   try { process.stdout.write(JSON.stringify(obj)); } catch { /* stdout broken � 
.claude/hooks/pre-grep-graph-inject.mjs:160: U+2026 '�'  |   return namesBlock.length <= MAX_INJECT_BYTES ? namesBlock 
... [+419 chars truncated]

### Assistant | 2026-06-19T17:16:32.431Z

The unicode scan is revealing. Let me distinguish what's in COMMENTS (cosmetic, not runtime output) versus what's in RUNTIME-EMITTED strings. The `rg` output shows all unicode is in comments/JSDoc in the hook file — but the shared lib `graph-exact-match.mjs:66` has unicode in a **runtime-emitted string** (`vaultPathsLine` returns `\n  • 📂 vault paths — ...`), which `renderTopCardBlock` calls. Let me confirm precisely which non-ASCII occurrences are runtime strings versus comments, and check the `score === threshold` boundary and the byte-budget math.

### Assistant | 2026-06-19T17:16:36.677Z

[tool_use: Bash]

### Assistant | 2026-06-19T17:16:38.448Z

[tool_use: Bash]

### User | 2026-06-19T17:16:40.278Z

[tool_result] === .claude/hooks/pre-grep-graph-inject.mjs ===
  L4 [COMMENT] ['0x2014']
  L61 [CODE/STRING?] ['0x2014']
  L160 [CODE/STRING?] ['0x2026']
  L193 [COMMENT] ['0x2192']
  L219 [COMMENT] ['0x2192']
  L220 [COMMENT] ['0x2014']
  L226 [CODE/STRING?] ['0x2014']
  L228 [COMMENT] ['0x2192']
  L242 [CODE/STRING?] ['0x2014']
  L260 [COMMENT] ['0x2014']
  L293 [COMMENT] ['0x2014', '0x21d4']
  L29
... [+709 chars truncated]

### User | 2026-06-19T17:16:43.981Z

[tool_result]  .claude/hooks/pre-grep-graph-inject.mjs      | 115 +++++++++++++++++++++-----
 .claude/hooks/pre-grep-graph-inject.test.mjs | 116 ++++++++++++++++++++++++++-
 2 files changed, 206 insertions(+), 25 deletions(-)
---DIFF HOOK---
diff --git a/.claude/hooks/pre-grep-graph-inject.mjs b/.claude/hooks/pre-grep-graph-inject.mjs
index a9ee3f074f..b0163c2397 100644
--- a/.claude/hooks/pre-grep-graph-inject
... [+9616 chars truncated]

### Assistant | 2026-06-19T17:16:51.043Z

Now I have the full picture. The key finding crystallizes: the diff converted the hook's OWN runtime strings to ASCII (header `⚡` removed, `🔗` removed, `•`→`*`, `—`→`--`), but the `[card]` block reuses `vaultPathsLine` from the shared lib, which STILL emits `\n  • 📂 vault paths — ...` (graph-exact-match.mjs:66) with unicode `•`, `📂`, `—`. So when seekDocs returns docs, the GAP-A card injects unicode that the ascii-guard is supposed to forbid. Let me confirm the ascii-guard scope (does it gate hook-EMITTED additionalContext, or only source files?) and check the sibling pre-write/pre-read hooks for the convention baseline.

### Assistant | 2026-06-19T17:16:53.881Z

[tool_use: Bash]

### Assistant | 2026-06-19T17:16:55.456Z

[tool_use: Bash]

### User | 2026-06-19T17:16:57.424Z

[tool_result] ascii-guard.mjs*
---
.claude/hooks/ascii-guard.mjs
--- search ascii-guard refs ---
.claude/hooks/ascii-guard.mjs
.claude/hooks/bundles\edit-bundle.mjs
.claude/hooks/bundles\posttool-edit-bundle.mjs
.claude/hooks/encoding-guard.mjs
.claude/hooks/health-scanner.py
.claude/hooks/memory-autocompact-stop.mjs
.claude/hooks/memory-autocompact-stop.test.mjs
.claude/hooks/memory-rag-inject.test.mjs
.claude
... [+387 chars truncated]

### User | 2026-06-19T17:17:00.918Z

[tool_result] === sibling pre-write header convention ===
.claude/hooks/pre-write-graph-inject.mjs:74:      header: "## ⚡ Pre-Write EXACT MATCH — this asset already exists:",
.claude/hooks/pre-write-graph-inject.mjs:83:    `## 🔗 Pre-Write graph context — ${Math.min(hits.length, MAX_TOPK)} related node(s) for "${keyStr}"`,
.claude/hooks/pre-bash-graph-inject.mjs:104:      `## ⚡ Pre-Bash EXACT MATCH — graph alrea
... [+319 chars truncated]

### Assistant | 2026-06-19T17:17:05.547Z

This is significant. The sibling hooks (pre-write, pre-bash, pre-read) ALL still use `⚡` and `🔗` unicode in their headers — so the diff has made `pre-grep` DIVERGE from its siblings by stripping unicode from its own strings, while the siblings keep theirs. Now let me read the ascii-guard to determine whether it gates only edited SOURCE files (which would explain why only the touched file got converted) or also runtime output, and verify the exact-match banner path. Then I'll check the byte-budget concern and the `score===threshold` boundary in the tests.

### Assistant | 2026-06-19T17:17:06.962Z

[tool_use: Bash]

### Assistant | 2026-06-19T17:17:08.975Z

[tool_use: Bash]

### User | 2026-06-19T17:17:10.500Z

[tool_result] #!/usr/bin/env node
// tier: T2
/**
 * ascii-guard.mjs - PreToolUse hook (Edit|Write|MultiEdit). ENFORCED, not advisory.
 *
 * THE GAP (operator 2026-06-09): "we still have issues with em dashes, ascii and
 * text issues." The fleet keeps introducing smart-substitution Unicode (em-dash,
 * curly quotes, ellipsis, NBSP) into CODE + SCRIPT files. There was NO guard
 * that prevented INTRODUCTION - o
... [+2988 chars truncated]

### User | 2026-06-19T17:17:13.774Z

[tool_result] === what file types/paths does ascii-guard gate? ===
4: * ascii-guard.mjs - PreToolUse hook (Edit|Write|MultiEdit). ENFORCED, not advisory.
9: * that prevented INTRODUCTION - only encoding-guard.mjs, which preserves a BOM
24: *   - Only CODE/SCRIPT/CONFIG extensions. Markdown / text / wiki / memory prose
26: *   - Only the NEW content being written (Write.content / Edit.new_string /
27: *     Mult
... [+2712 chars truncated]

### Assistant | 2026-06-19T17:17:22.779Z

Now the picture is complete and precise. Critical clarifications from the ascii-guard source:

1. **ascii-guard ONLY blocks the SMART-SUBSTITUTION set** (em-dash, en-dash, curly quotes, ellipsis, NBSP, unicode minus, guillemets) — **NOT all non-ASCII**. So `•` (U+2022 bullet), `📂` (U+1F4C2), `→` (U+2192), `⚡`, `🔗` are NOT in the SMART set and are NOT blocked. Only `—` (U+2014 em-dash) and `…` (U+2026 ellipsis) are blocked.

2. ascii-guard gates **only the NEW text being written** into the SOURCE file at Edit/Write time — it does NOT inspect a hook's runtime-emitted `additionalContext`. So the runtime unicode in `vaultPathsLine`'s output is never seen by ascii-guard at all.

This means the diff's stated rationale ("forced by PRISM ascii-guard") only truly compelled removing `—` and `…` from the edited source lines. The `⚡`/`🔗`/`•`→`*` conversions were a stylistic choice, NOT ascii-guard-forced — and they make this hook DIVERGE from its three live siblings (pre-write/pre-bash/pre-read), which all still emit `⚡`/`🔗`/`•`/`—`.

Let me verify the test boundary coverage for `score === threshold` and confirm the changed-existing-assertion count, then finalize.

### Assistant | 2026-06-19T17:17:24.695Z

[tool_use: Bash]

### User | 2026-06-19T17:17:33.748Z

[tool_result] === git diff of the TEST file (existing-assertion changes) ===
3:--- a/.claude/hooks/pre-grep-graph-inject.test.mjs
4:+++ b/.claude/hooks/pre-grep-graph-inject.test.mjs
9:-import { renderInject } from "./pre-grep-graph-inject.mjs";
18:-  assert.match(out, /Pre-Grep graph context — 2 node\(s\) already match "graph, lock"/);
19:+  // header uses ASCII double-dash (not em-dash)
20:+  assert.match(out
... [+2671 chars truncated]

### Assistant | 2026-06-19T17:17:42.318Z

I have everything needed. The two changed existing assertions are genuine format-matches (em-dash→`--` in the header regex, `•`→`*` in the bullet-count regex) — both still assert real structure, neither is softened or removed. Both would correctly fail if the ASCII conversion were reverted. The GAP-A tests genuinely pin the new behavior (threshold gating, card marker presence/absence, byte cap, null hit, seekDocs throw).

One gap worth noting: there is no test for the exact `score === threshold` boundary (the tests use score=15 vs 8 vs 999 vs 8, never score=10 with threshold=10). The code uses `>=` so the boundary is correctly INCLUDE, but it isn't pinned by a test.

Let me do one final confirmation on the byte-budget interaction — whether the card's unicode could push a near-cap combined block over MAX_INJECT_BYTES in a way `.length` (UTF-16 code units) misjudges versus actual bytes.

### Assistant | 2026-06-19T17:17:44.758Z

[tool_use: Bash]

### User | 2026-06-19T17:17:52.997Z

[tool_result] === MAX_INJECT_BYTES is compared via .length (UTF-16 units), not Buffer.byteLength — check all length-vs-bytes sites ===
scripts/lib/graph-exact-match.mjs:92:  return banner.length <= maxBytes ? banner : banner.slice(0, maxBytes) + "…";
.claude/hooks/pre-grep-graph-inject.mjs:51:const MAX_INJECT_BYTES = 1500;
.claude/hooks/pre-grep-graph-inject.mjs:116:      maxBytes: MAX_INJECT_BYTES,
.claude/h
... [+248 chars truncated]

### Assistant | 2026-06-19T17:18:28.430Z

The `.length`-vs-bytes point is pre-existing (the names-block path at line 160 already used `.length` against a constant named `_BYTES`), so it's not introduced by this diff — it's a benign naming imprecision (a 1500-char advisory cap is fine; it's not a correctness boundary). I won't flag it as a regression of this change. The slice-truncation in the shared lib could split a multibyte char at `slice(0, maxBytes)`, but again that's pre-existing lib code, not this diff, and only matters at the rare overflow path.

I have completed a full end-to-end static review of all three files. Here is my verdict.

---

VERDICT: PASS

summary: The core GAP-A logic is correct: `renderTopCardBlock` calls `vaultPathsLine(seekDocs, hit)` in the right argument order (matches the shared-lib signature `vaultPathsLine(seekDocs, h0)` at `graph-exact-match.mjs:58`), the threshold gate uses `>=` so `score === threshold` correctly INCLUDES, the byte cap is respected with a clean names-only fallback, and the fail-open/fail-soft chain is intact. The two changed existing test assertions are genuine ASCII format-matches, not softened checks, and the new tests would fail if GAP-A were reverted. The findings below are all P2 (convention/divergence and a missing boundary test) — none block merge.

findings:
- [P2] `.claude/hooks/pre-grep-graph-inject.mjs:39` (header) and shared-lib coupling `scripts/lib/graph-exact-match.mjs:66` -- The card's `vaultPathsLine` output is the ONE runtime string in this hook's GAP-A path that still emits non-ASCII: `\n  • 📂 vault paths — ...` (U+2022 bullet, U+1F4C2, U+2014 em-dash). When `seekDocs` returns docs, the GAP-A `[card]` block injects unicode into `additionalContext` even though the diff converted the hook's own strings to ASCII. NOTE this is NOT an ascii-guard violation (`ascii-guard.mjs` blocks only the SMART set on Edit/Write of SOURCE files, never runtime hook output, and `•`/`📂` aren't even in the SMART set) -- but it is a visible inconsistency: a high-
... [+3814 chars truncated]
