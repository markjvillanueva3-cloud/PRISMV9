---
type: "chat-session"
source: "claude-code-cli"
session_id: "70f0402c-598e-4207-8a67-a8d2615fdcf0"
title: "Independent second-pass review of two NEW files (slot:echo, post-processor galax"
date: "2026-06-25"
first_ts: "2026-06-25T13:19:22.137Z"
last_ts: "2026-06-25T13:23:07.439Z"
cwd: "H:\\prism"
messages: 59
user_msgs: 22
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism/70f0402c-598e-4207-8a67-a8d2615fdcf0/subagents/agent-af18b03ce20151c11.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Independent second-pass review of two NEW files (slot:echo, post-processor galax

> **claude-code-cli** | 2026-06-25 | 59 msgs (22 user / 37 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/70f0402c-598e-4207-8a67-a8d2615fdcf0/subagents/agent-af18b03ce20151c11.jsonl`

## Transcript

### User | 2026-06-25T13:19:22.137Z

Independent second-pass review of two NEW files (slot:echo, post-processor galaxy). Do NOT assume a prior reviewer caught everything — weight your review toward what the first reviewer is unlikely to catch: integration with the existing tool it composes, dialect/safety correctness, test integrity, convention conformance, and dedup/orphan risk.

FILES (read both fully, end-to-end):
- H:/prism/scripts/post-block-audit.mjs
- H:/prism/scripts/post-block-audit.test.mjs

It COMPOSES the existing linter: H:/prism/scripts/post-nc-dialect-lint.mjs (exports `lintNc(text, opts)`). Read that too to verify the composition is correct (findings keyed by line number, attached to the right block).

Weight your review on:
1. INTEGRATION — does it correctly consume lintNc's `{dialect, findings:[{line,severity,rule,message}]}` shape? Are findings attached to the correct block line? Could a line-number off-by-one mis-attribute a safety finding to the wrong block?
2. DIALECT/SAFETY correctness — for a LATHE program, coolant-before-spindle (M8 before M3) is conventional, not a hazard (lintNc downgrades it on G96/G97). Does the block-audit preserve that nuance? Any case where a real safety issue is dropped or a false ERROR is raised?
3. TEST INTEGRITY — are the 11 tests real reference-value/invariant assertions (NOT toBeDefined stubs)? Coverage floor: happy + >=3 failure modes + >=2 adversarial + >=3 spanning dialects/machine types? Any .skip/.only? Does the real-JM-golden test prove something meaningful?
4. DEDUP/ORPHAN — is this a genuine new capability vs PPBlockCompositionValidatorEngine.ts / nc-dialect-masks.mjs / PostValidationSuiteEngine.ts? Is the header's "DISTINCT from" claim accurate? Is the tool reachable (CLI) or orphaned?
5. CONVENTION — matches the post-nc-dialect-lint.mjs idiom (exports + CLI + invokedDirectly guard + exit policy + ASCII-only)? Any inlined dialect/physics constants (echo soul refuse)?

Report P0/P1/P2 findings with file:line. Grade PASS or FAIL. Report only
... [+20 chars truncated]

### Assistant | 2026-06-25T13:19:27.496Z

I'll review both new files and the linter they compose. Let me read all three end-to-end in parallel.

### Assistant | 2026-06-25T13:19:27.957Z

[tool_use: Read]

### Assistant | 2026-06-25T13:19:28.433Z

[tool_use: Read]

### Assistant | 2026-06-25T13:19:28.642Z

[tool_use: Read]

### User | 2026-06-25T13:19:29.043Z

[tool_result] read-once-guard: 'H:\prism\scripts\post-block-audit.mjs' was already read 9s ago in this session and is unchanged (mtime 1782391901691). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-25T13:19:29.701Z

[tool_result] read-once-guard: 'H:\prism\scripts\post-nc-dialect-lint.mjs' was already read 10s ago in this session and is unchanged (mtime 1780064472883). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-25T13:19:30.055Z

[tool_result] read-once-guard: 'H:\prism\scripts\post-block-audit.test.mjs' was already read 10s ago in this session and is unchanged (mtime 1782393499642). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-25T13:19:34.122Z

The files are already in my context from the read-once guard. Let me work from the content I have. Let me verify a few specific things by grepping the linter for its exact output shape and the line-number semantics, plus check for the dedup-claimed engines and CLI reachability.

### Assistant | 2026-06-25T13:19:36.052Z

[tool_use: Grep]

### Assistant | 2026-06-25T13:19:37.495Z

[tool_use: Grep]

### Assistant | 2026-06-25T13:19:37.966Z

[tool_use: Glob]

### User | 2026-06-25T13:19:38.001Z

[tool_result] 110:export function lintNc(text, opts = {}) {
131:  const add = (line, severity, rule, message) =>
132:    findings.push({ line, severity, rule, message });
174:    // excluded to avoid a false ERROR (R1 is the only ERROR-severity rule).
257:  for (const f of findings) counts[f.severity]++;
258:  return { dialect, dialectKnown, lineCount: lines.length, findings, counts };
284:    out.push(`${file}
... [+149 chars truncated]

### Assistant | 2026-06-25T13:19:38.424Z

[tool_use: Glob]

### Assistant | 2026-06-25T13:19:38.579Z

[tool_use: Glob]

### User | 2026-06-25T13:19:40.226Z

[tool_result] 61:  // \bM0?8\b style — matches M8 and M08
125:  // Turning context: G96/G97 (CSS / constant-RPM) or a G50 spindle-speed clamp.
126:  // On lathes, coolant-before-spindle (M8 before M3) is conventional — NOT the
127:  // mill "wet floor before engagement" hazard — so R1 is downgraded there.
135:  let spindleStarted = false;
170:    // ── R1 coolant-before-spindle (ERROR, universal) ──
171:    con
... [+1308 chars truncated]

### User | 2026-06-25T13:19:48.175Z

[tool_result] .git\backup-untracked\mcp-server\src\engines\PPBlockCompositionValidatorEngine.ts
mcp-server\src\engines\PPBlockCompositionValidatorEngine.ts
prism-test-6d0595\mcp-server\src\engines\PPBlockCompositionValidatorEngine.ts
.claude\worktrees\agent-a39ea356e3f158cf4\mcp-server\src\engines\PPBlockCompositionValidatorEngine.ts
.claude\worktrees\agent-ad02ba149880ce364\mcp-server\src\engines\PPBlockCompos
... [+3797 chars truncated]

### User | 2026-06-25T13:19:51.786Z

[tool_result] src\engines\PostValidationSuiteEngine.ts
.claude\worktrees\brave-euclid\mcp-server\src\engines\PostValidationSuiteEngine.ts
.claude\worktrees\rgs6-audit-v2\mcp-server\src\engines\PostValidationSuiteEngine.ts
prism-test-6d0595\mcp-server\src\engines\PostValidationSuiteEngine.ts
.claude\worktrees\agent-a39ea356e3f158cf4\mcp-server\src\engines\PostValidationSuiteEngine.ts
.claude\worktrees\agent-ad02
... [+3595 chars truncated]

### User | 2026-06-25T13:19:51.821Z

[tool_result] scripts\lib\nc-dialect-masks.mjs

### Assistant | 2026-06-25T13:19:57.424Z

The read-once guard says these files are in my context, but I want to confirm I actually have the full content. The guard fired because the parent harness pre-read them. Let me confirm the exact content of the two new files and the linter's line-number semantics by reading the key regions I haven't yet verified. Let me disable the read cache for a clean read of the three files.

### Assistant | 2026-06-25T13:19:58.581Z

[tool_use: Bash]

### User | 2026-06-25T13:20:02.659Z

[tool_result] #!/usr/bin/env node
/**
 * post-block-audit.mjs -- block-by-block G-code analyzer for emitted NC (slot:echo)
 *
 * Walks an emitted NC program ONE BLOCK AT A TIME and produces a per-block
 * annotated report: for every block it reports the line number, the parsed
 * address words, a motion/intent CLASS, the modal-state snapshot AFTER the
 * block executes, and any within-block / safety / dialect i
... [+16631 chars truncated]

### Assistant | 2026-06-25T13:20:07.187Z

I have the full source of the main file. Now let me read the test file and the linter's line-number/findings region in detail.

### Assistant | 2026-06-25T13:20:07.963Z

[tool_use: Bash]

### User | 2026-06-25T13:20:10.584Z

[tool_result] // post-block-audit.test.mjs -- R9 reference-value tests for the block-by-block NC analyzer.
// Run: node scripts/post-block-audit.test.mjs   (node:test auto-runs on exit)
// Reference values verified against real JM golden NC (JM DIE/CNC LATHE/9007405.MIN)
// and synthetic programs whose expected analysis is hand-derived.

import { test } from "node:test";
import assert from "node:assert/strict";
... [+9274 chars truncated]

### Assistant | 2026-06-25T13:20:15.043Z

Now I have both new files fully. Let me read the linter's critical regions: the line-numbering loop, dialect detection, and the R1/R2/end-of-program findings, to verify line-number semantics and the lathe downgrade nuance.

### Assistant | 2026-06-25T13:20:15.862Z

[tool_use: Read]

### User | 2026-06-25T13:20:17.331Z

[tool_result] 110	export function lintNc(text, opts = {}) {
111	  const findings = [];
112	  const src = text == null ? "" : String(text); // normalize first — guards null/number/undefined
113	  const rawDialect = (opts.dialect || "auto").toLowerCase();
114	  const dialect = rawDialect === "auto" ? autodetectDialect(src, opts.filename) : rawDialect;
115	  const dialectKnown = KNOWN_DIALECTS.has(dialect);
116	  
... [+7063 chars truncated]

### Assistant | 2026-06-25T13:20:24.571Z

Now I have the linter's line-numbering verified. This is the critical integration point. Let me confirm:

- Linter: `lines = allLines.slice(0, MAX_LINES)`, then `for (let i = 0; i < lines.length; i++)`, `ln = i + 1`. So findings are keyed by **1-based line index into the split array** (line 145).
- Block-audit: `allLines = src.split(/\r\n|\r|\n/)`, `lines = allLines.slice(0, MAX_LINES)`, `for (let i = 0; i < lines.length; i++)`, `parseBlock(lines[i], i + 1)`. So blocks are keyed by the **same 1-based line index** (line in the same split array).

Both split with the identical regex `/\r\n|\r|\n/` and both use `i + 1`. So the line numbering is congruent. Let me verify two subtle things: (1) the linter's MAX_LINES vs the block-audit's MAX_LINES (must match for the `findingsByLine` map to align when truncation happens), and (2) the end-of-file findings keyed by `lines.length`.

### Assistant | 2026-06-25T13:20:27.084Z

[tool_use: Read]

### User | 2026-06-25T13:20:28.421Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * post-nc-dialect-lint.mjs — static NC / G-code dialect & safety linter (slot:echo)
4	 *
5	 * Lints emitted G-code TEXT (.nc / .min / .eia / .tap / .ngc / .h) against the
6	 * canonical controller-dialect gotchas + universal safety-ordering rules. PURE
7	 * STATIC — no engine, no `dist/` build, no MCP. Runs on any emitted NC file or
8	 * post-processor output (CI art
... [+5202 chars truncated]

### Assistant | 2026-06-25T13:20:33.532Z

I now have the complete picture. Let me verify the key correctness claims by actually running the test file and the CLI, since this is the most reliable proof of integration (line-number alignment, JM golden, exit codes).

### Assistant | 2026-06-25T13:20:34.296Z

[tool_use: Bash]

### User | 2026-06-25T13:20:35.954Z

[tool_result]   ...
# Subtest: auditNc: multiple-M and multiple-motion within one block
ok 6 - auditNc: multiple-M and multiple-motion within one block
  ---
  duration_ms: 0.3011
  ...
# Subtest: auditNc: adversarial -- null/empty/comment-only/CRLF never crash
ok 7 - auditNc: adversarial -- null/empty/comment-only/CRLF never crash
  ---
  duration_ms: 0.6904
  ...
# Subtest: auditNc: adversarial -- maxBlocks b
... [+780 chars truncated]

### Assistant | 2026-06-25T13:20:40.490Z

All 11 tests pass, 0 skipped/todo. Now let me verify the JM golden file actually exists (so test 10 is not silently skipping via its `return`), and confirm the lathe-downgrade nuance end-to-end on the real golden.

### Assistant | 2026-06-25T13:20:42.785Z

[tool_use: Bash]

### User | 2026-06-25T13:20:46.275Z

[tool_result] GOLDEN EXISTS
---- M8/M3 ordering in golden (first 20 lines w/ M3/M7/M8) ----
10:G50 S800
14:G97 S558 M3 M42
19:G96 S200
22:G97 S20

### Assistant | 2026-06-25T13:20:50.401Z

The golden exists (test 10 is real, not skipped). Now let me run the block-audit on the real golden to verify the lathe nuance flows through correctly (no false ERROR on coolant ordering), and confirm the line-number attribution is exact by forcing a deliberate coolant-before-spindle case where I can hand-verify the block line.

### Assistant | 2026-06-25T13:20:54.056Z

[tool_use: Bash]

### User | 2026-06-25T13:20:55.622Z

[tool_result] ==== REAL JM GOLDEN (lathe) — should have NO coolant ERROR ====
dialect=fanuc-generic | 27 blocks | 0 err | 2 warn | 1 info
==== explicit lathe coolant-before-spindle: must be INFO not ERROR ====
                "severity": "INFO",
                "rule": "coolant-before-spindle",
                "severity": "WARN",
            "severity": "WARN",
            "severity": "WARN",
            "sever
... [+99 chars truncated]

### Assistant | 2026-06-25T13:21:03.577Z

The lathe nuance is preserved end-to-end: the real golden produces 0 errors, and an explicit lathe (G96) coolant-before-spindle is correctly downgraded to INFO (not a false ERROR). Now let me verify the line-number attribution precision — the highest-risk integration bug. I'll construct a case where the coolant-before-spindle is on a specific line and confirm the finding attaches to exactly that block, including with leading blank lines and a comment line (which the block-audit's loop `continue`s on but the linter does NOT).

### Assistant | 2026-06-25T13:21:09.698Z

[tool_use: Bash]

### User | 2026-06-25T13:21:11.239Z

[tool_result] ==== line-attribution: M8 on physical line 4, ERROR must attach to block.line==4 ====
block.line=4 class=coolant rule=coolant-before-spindle sev=ERROR
block.line=6 class=linear-feed rule=feed-no-feedmode sev=WARN
counts {'ERROR': 1, 'WARN': 4, 'INFO': 1}
==== ADVERSARIAL: blank lines BEFORE the M8 (linter counts blanks, audit skips them) ====
block.line=4 raw='M8' rule=coolant-before-spindle se
... [+50 chars truncated]

### Assistant | 2026-06-25T13:21:19.100Z

This is the key proof. Both the linter and the block-audit use the **same physical line index** (`i + 1` over the same split-array), so even with leading blank lines (which the block-audit skips as blocks but the linter still counts in its index), the finding on line 4 (`M8`) attaches to exactly the block whose `.line === 4`. There is **no off-by-one and no mis-attribution**. The blank-line case is the adversarial proof: the audit skips blanks as blocks but still preserves the true physical line number, so the map key matches.

Now let me verify one edge the linter has that the block-audit could mis-handle: the linter emits end-of-file findings keyed to `lines.length` (e.g. `missing-program-end`). The block-audit's `findingsByLine` map would key those to `lines.length`, but a block only exists at that line if the last physical line is non-blank. Let me check whether end-of-file linter findings get silently dropped (they would, if the last line is blank/absent) — and whether that's a real problem given the audit has its own `no-program-end` invariant.

### Assistant | 2026-06-25T13:21:24.823Z

[tool_use: Bash]

### User | 2026-06-25T13:21:27.563Z

[tool_result] ==== linter missing-program-end keyed to lines.length; trailing newline -> last 'line' is blank ====
-- linter raw findings for a no-M30 program WITH trailing newline --
lineCount 3
  finding line=3 rule=missing-program-end sev=WARN
-- block-audit on the SAME input: does missing-program-end survive (via lint) or only via invariant? --
block issues w/ missing-program-end: []
invariants: [('wcs-u
... [+110 chars truncated]

### Assistant | 2026-06-25T13:21:35.542Z

This confirms a real behavioral detail. The linter's `missing-program-end` is keyed to line 3 (a trailing blank line from the trailing `\n`). The block-audit's `findingsByLine` map has it at line 3, but there's no block at line 3 (it's blank, skipped), so that lint finding is **silently dropped** from the block issues. However, the block-audit has its own `no-program-end` invariant that catches the same condition (and counts it as WARN), so the net `counts` are preserved and no safety signal is lost in this case.

This is a P2 (not P0/P1) because the audit duplicates the most important end-of-file linter checks (`no-program-end`, and similar units/feedmode/spindle/coolant-at-end) as its own invariants. But let me check whether ANY linter end-of-file finding lacks an audit-invariant equivalent — that would be a dropped signal. The linter has only two `lines.length`-keyed findings: `missing-program-end` (covered by invariant `no-program-end`) and `file-truncated` (covered by invariant `file-truncated`). And the Heidenhain "BEGIN PGM but no END PGM" — let me check that one isn't lost.

### Assistant | 2026-06-25T13:21:40.063Z

[tool_use: Bash]

### User | 2026-06-25T13:21:41.988Z

[tool_result] ==== Heidenhain: linter emits END-PGM finding at lines.length; audit has no Heidenhain invariant ====
lineCount 3 dialect heidenhain
  finding line=3 rule=missing-program-end sev=WARN
-- block-audit same Heidenhain input --
block issues: []
invariants: [('units-undeclared', 'WARN'), ('wcs-unselected', 'INFO'), ('no-program-end', 'WARN')]
counts {'ERROR': 0, 'WARN': 2, 'INFO': 1} lintFindingCou
... [+4 chars truncated]

### Assistant | 2026-06-25T13:21:53.082Z

This surfaces a genuine but bounded gap for Heidenhain. The linter's `missing-program-end` (keyed to a trailing blank line) is dropped by the block-audit, but the audit's own `no-program-end` invariant still fires (because Heidenhain has no M30/M2, so `vocabM` lacks "30"/"2") — so the WARN signal is preserved. However, the audit also raises `units-undeclared` and `wcs-unselected` for Heidenhain conversational code, which are **spurious** for that dialect (Heidenhain doesn't use G20/G21 or G54). The linter deliberately skips all rules except program-end for Heidenhain (line 161-165). The block-audit does NOT replicate that Heidenhain suppression — its modal FSM is Fanuc/RS-274 only, so it emits false `units-undeclared`/`wcs-unselected`/`feedmode` WARNs on Heidenhain conversational programs.

This is a real correctness gap, but its blast radius is small: JM Die is a Fanuc/lathe shop (the stated use case), Heidenhain conversational isn't G-code at all, and the header scopes the FSM as "Fanuc/RS-274 canonical." Let me confirm the severity by checking whether the audit would raise a *false ERROR* (P0/P1) on any dialect, or only false WARN/INFO. Let me also verify the `crossRefGolden` doesn't crash if either side lacks vocabulary, and the `--max-blocks` truncation interaction with lint findings (lint runs on full file, blocks capped).

### Assistant | 2026-06-25T13:21:58.964Z

[tool_use: Bash]

### User | 2026-06-25T13:22:00.507Z

[tool_result] ==== max-blocks: lint runs on FULL file but blocks capped -> findings beyond cap are dropped (acceptable? check ERROR case) ====
blockCount 2 counts {'ERROR': 0, 'WARN': 1, 'INFO': 1} lintFindingCount 1
==== crossRefGolden empty-vocabulary safety ====
empty-vs-empty {"surprise_g":[],"surprise_m":[],"missing_g":[],"missing_m":[]}
empty-vs-some {"surprise_g":[],"surprise_m":[],"missing_g":["G0"],"m
... [+96 chars truncated]

### Assistant | 2026-06-25T13:22:11.127Z

The ASCII check shows the new files are clean (note: the `--`/em-dash distinction matters — both new files use ASCII `--`, while the linter uses Unicode em-dashes in its comments; let me confirm the linter's non-ASCII isn't a new regression and that the block-audit consistently uses ASCII). Let me verify the ASCII status explicitly and check the `--max-blocks` truncation note (lint findings beyond the cap silently lost, but `lintFindingCount` exposes the count).

### Assistant | 2026-06-25T13:22:13.645Z

[tool_use: Bash]

### User | 2026-06-25T13:22:18.910Z

[tool_result] ==== explicit non-ASCII byte count per file ====
scripts/post-block-audit.mjs : 0
0 lines with non-ASCII
scripts/post-block-audit.test.mjs : 0
0 lines with non-ASCII
scripts/post-nc-dialect-lint.mjs : 41 lines with non-ASCII
==== git status of the two new files (tracked? committed?) ====
---
?? scripts/post-block-audit.mjs
?? scripts/post-block-audit.test.mjs

### Assistant | 2026-06-25T13:22:27.216Z

This is an interesting convention point: the new block-audit files are strictly ASCII (0 non-ASCII lines), while the linter they compose has 41 lines with Unicode em-dashes/box-drawing. The new files are actually *more* conformant to the ASCII-only repo rule than the file they extend — so the "matches surrounding idiom" critique cuts the right way (they correctly chose ASCII `--` over the linter's em-dashes). Not a finding.

Both files are untracked (`??`) — new, uncommitted, which is expected for a pre-merge review.

I have everything I need. Let me do a final check on two remaining items: (1) whether the `parseBlock` comment-detection regex for `[...]` is consistent with `stripComments` (a subtle divergence could mislabel a comment), and (2) confirm the `dialect: "auto"` default flows correctly into `lintNc` (the block-audit passes `opts.dialect` which defaults to `"auto"` string from the CLI, and `auditNc` callers in tests pass explicit dialects).

### Assistant | 2026-06-25T13:22:32.548Z

[tool_use: Bash]

### User | 2026-06-25T13:22:35.718Z

[tool_result] ==== comment regex divergence: parseBlock.comment vs stripComments for [] prose ====
{"in":"[TOOL CHANGE]","comment":"[TOOL CHANGE]","words":[],"class":"comment"}
{"in":"(FINISH)","comment":"(FINISH)","words":[],"class":"comment"}
{"in":"X[#100+5]","comment":null,"words":[],"class":"blank"}
{"in":"[FACE PROSE] G0 X0","comment":"[FACE PROSE]","words":["G0","X0"],"class":"rapid"}
{"in":"N5 [SETUP] M
... [+167 chars truncated]

### Assistant | 2026-06-25T13:23:07.439Z

This surfaces one minor inconsistency worth noting (P2): for `N5 [SETUP] M3`, the `comment` field is `null` even though `[SETUP]` is a prose comment. The reason: `parseBlock`'s `commentMatch` regex `/\([^)]*\)|\[[^\[\]]*[A-Za-z]\s[^\[\]]*\]/` requires a letter **and a space** inside the brackets; `[SETUP]` has a letter but no internal space, so it's not captured as a comment. But `stripComments` (used for `words`) correctly strips it (prose-ish, no `#`/arithmetic), so `[SETUP]` doesn't leak into `words` either. Net effect: the block is correctly classified (`spindle`, words `N5 M3`), but the `comment` display field misses a single-word bracket comment. This is purely cosmetic (the `comment` field is only shown in the text report preview); it never causes a wrong classification, a dropped finding, or a mis-attribution. The `X[#100+5]` macro case is correctly preserved (no comment, no spurious words) — the safety-critical macro guard works.

I have completed a thorough end-to-end review with live verification. Here is my verdict.

---

VERDICT: PASS

summary: `post-block-audit.mjs` correctly composes `lintNc`, consuming its `{dialect, findings:[{line,severity,rule,message}]}` shape and attaching findings to blocks by physical line number with no off-by-one — both files split on the identical `/\r\n|\r|\n/` regex and key on `i+1` over the same array, which I proved live (including the adversarial leading-blank-lines case: an M8 ERROR on physical line 4 attaches to exactly `block.line===4`). The lathe coolant-before-spindle nuance is preserved end-to-end (real JM golden -> 0 errors; explicit G96 lathe case -> INFO not ERROR). All 11 tests are real reference-value/invariant assertions, pass, with 0 `.skip`/`.only`/`.todo`, the JM-golden test verifies against a present corpus file (27 blocks, G96/G97/G50 vocabulary), and the tool is a genuine new capability (per-block annotated walk + modal-FSM trace + golden-vocabulary cross-ref) reachable via a proper CLI with an `invok
... [+3526 chars truncated]
