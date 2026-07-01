---
type: "chat-session"
source: "claude-code-cli"
session_id: "70f0402c-598e-4207-8a67-a8d2615fdcf0"
title: "Review two NEW files end-to-end for correctness, silent breakage, and safety-rel"
date: "2026-06-25"
first_ts: "2026-06-25T13:19:10.948Z"
last_ts: "2026-06-25T13:23:20.541Z"
cwd: "H:\\prism"
messages: 39
user_msgs: 14
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/70f0402c-598e-4207-8a67-a8d2615fdcf0/subagents/agent-aa2778f184a54a2ed.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review two NEW files end-to-end for correctness, silent breakage, and safety-rel

> **claude-code-cli** | 2026-06-25 | 39 msgs (14 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/70f0402c-598e-4207-8a67-a8d2615fdcf0/subagents/agent-aa2778f184a54a2ed.jsonl`

## Transcript

### User | 2026-06-25T13:19:10.948Z

Review two NEW files end-to-end for correctness, silent breakage, and safety-relevance. This is a CNC post-processor quality tool (slot:echo) — it analyzes emitted G-code block-by-block, so subtle parsing/classification bugs have real safety consequence.

FILES (read both fully):
- H:/prism/scripts/post-block-audit.mjs  (the analyzer: parseBlock, classifyBlock, auditNc, crossRefGolden + CLI)
- H:/prism/scripts/post-block-audit.test.mjs  (11 node:test cases)

CONTRACT it must satisfy:
- Walk an emitted NC program block-by-block; per block: line#, parsed address words, an intent CLASS, modal-state-after, and within-block/safety issues (composed from the existing lintNc in scripts/post-nc-dialect-lint.mjs).
- Carry a modal-state FSM (units G20/G21, motion group-1, feed mode G93/94/95, WCS G54-59, spindle M3/4/5, coolant M7/8/9, tool T) and derive end-of-program invariants.
- crossRefGolden: vocabulary diff vs a golden NC (surprise codes the post emits / missing codes the golden used).
- Pure-node, reaper-safe, bounded (MAX_LINES, MAX_LINE_LEN).

Verify specifically:
1. Tokenizer correctness — does it correctly ignore coordinates inside () and [] comments? Does it correctly KEEP macro brackets [#100+5]? Leading-zero codes (G0==G00, M6==M06)?
2. classifyBlock precedence — is the "most safety-salient wins" ordering correct? Any motion mis-classification (e.g. a canned-cycle line classified as rapid)?
3. Modal-state FSM correctness — any state that updates wrong (e.g. G80 cancel, multi-code-per-block)?
4. Are the tests REAL R9 (reference-value/invariant, not toBeDefined stubs)? Any .skip/.only? Do they encode WHY the behavior matters? Would a test FAIL if the business logic broke?
5. Any silent-failure path, unbounded loop, ReDoS in the regexes, or crash on adversarial input (null/empty/binary/minified line)?
6. Convention conformance vs the sibling post-nc-dialect-lint.mjs.

Report P0 (must-fix correctness/safety) and P1 (should-fix) with file:line citations. Grade PASS o
... [+119 chars truncated]

### Assistant | 2026-06-25T13:19:16.335Z

I'll review both files end-to-end. Let me start by reading them, plus the sibling lint file the contract references.

### Assistant | 2026-06-25T13:19:16.785Z

[tool_use: Read]

### Assistant | 2026-06-25T13:19:17.264Z

[tool_use: Read]

### Assistant | 2026-06-25T13:19:17.386Z

[tool_use: Read]

### User | 2026-06-25T13:19:22.103Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * post-nc-dialect-lint.mjs — static NC / G-code dialect & safety linter (slot:echo)
4	 *
5	 * Lints emitted G-code TEXT (.nc / .min / .eia / .tap / .ngc / .h) against the
6	 * canonical controller-dialect gotchas + universal safety-ordering rules. PURE
7	 * STATIC — no engine, no `dist/` build, no MCP. Runs on any emitted NC file or
8	 * post-processor output (CI art
... [+15389 chars truncated]

### User | 2026-06-25T13:19:22.116Z

[tool_result] 1	// post-block-audit.test.mjs -- R9 reference-value tests for the block-by-block NC analyzer.
2	// Run: node scripts/post-block-audit.test.mjs   (node:test auto-runs on exit)
3	// Reference values verified against real JM golden NC (JM DIE/CNC LATHE/9007405.MIN)
4	// and synthetic programs whose expected analysis is hand-derived.
5	
6	import { test } from "node:test";
7	import assert from "node:a
... [+9887 chars truncated]

### User | 2026-06-25T13:19:22.120Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * post-block-audit.mjs -- block-by-block G-code analyzer for emitted NC (slot:echo)
4	 *
5	 * Walks an emitted NC program ONE BLOCK AT A TIME and produces a per-block
6	 * annotated report: for every block it reports the line number, the parsed
7	 * address words, a motion/intent CLASS, the modal-state snapshot AFTER the
8	 * block executes, and any within-block / sa
... [+17948 chars truncated]

### Assistant | 2026-06-25T13:19:27.362Z

Both files are read. Now let me verify specific claims adversarially. Let me check the critical tokenizer and classification behaviors, plus the `lintNc` line-numbering contract that `auditNc` composes against.

First, let me verify the most suspicious area: the modal-state FSM ordering for `G80` cancel combined with a canned cycle on the same block, and the `lintNc` line-keying contract.

### Assistant | 2026-06-25T13:19:37.276Z

[tool_use: Bash]

### User | 2026-06-25T13:19:40.200Z

[tool_result] T1 words: ["Y10."] comment: null
T2 gcodes via classify: motion-cont
T3 G80G0 modal.motion after that block: null
T3 class of G80 G0 line: rapid
T4 class G80 alone: other
T5 class of bare X1. inside active canned cycle: motion-cont

### Assistant | 2026-06-25T13:19:48.712Z

Several findings already. Let me dig into the most consequential ones.

**T3**: `G80 G0 Z1.` — `modal.motion` becomes `null`. But the line order in the FSM is: GROUP1 codes set `modal.motion = last`, THEN `G80` sets it to `null`. Since G0 is in GROUP1 and G80 runs after, the G0 motion is lost — modal.motion=null even though G0 is a real active motion mode after the block. Let me confirm this is a real ordering bug vs. intended.

**T2**: `G08.1` classifies as `motion-cont` — it's an unrecognized G-code so it falls through. That's acceptable (G08.1 is AICC look-ahead, not motion), but the bare coordinate `X0` triggers motion-cont. Minor.

**T5**: A bare `X1.` inside an active canned cycle is classified `motion-cont`, but on a real Fanuc control inside an active G81 this is a *repeat of the canned cycle at a new position* — a drilling hit, not a free move. Let me verify the modal FSM tracks this and whether classify is contract-relevant here.

Let me probe the G80+G0 ordering bug more rigorously and the lintNc line-number composition contract.

### Assistant | 2026-06-25T13:19:57.368Z

[tool_use: Bash]

### User | 2026-06-25T13:20:01.049Z

[tool_result] after G80 G0 Z1 -> motion = null (should be 0 rapid)
after G0 G80 Z1 -> motion = null (same bug, text order irrelevant)
G80 G81 same block -> motion= null multi-motion flagged? false

### Assistant | 2026-06-25T13:20:08.486Z

Confirmed P1 bug. **The G80 unconditional `modal.motion = null` clobbers a legitimately-commanded G0/G1 in the same block.** On a real Fanuc control, `G80 G0 Z1.` cancels the canned cycle AND the active motion mode becomes G0 (rapid). The FSM reports `motion=null`, which is wrong — it loses the rapid that any downstream invariant or operator reading the modal trace depends on. Worse, `G80 G81` (cancel then re-arm a different cycle in one block, which is itself a controller alarm condition on most controls) reports `motion=null` AND fails to flag multi-motion, because G80 isn't in GROUP1.

Let me verify the lintNc line-number composition contract — `auditNc` matches `findingsByLine` keyed by `f.line`, and lintNc emits some findings keyed to `lines.length` (end-of-program). Let me check whether those land on a real block or get silently dropped.

### Assistant | 2026-06-25T13:20:15.378Z

[tool_use: Bash]

### User | 2026-06-25T13:20:17.095Z

[tool_result] lint findings lines: [ '3:feed-no-feedmode', '4:missing-program-end' ]
split length: 4
audit blockCount: 3 max block line: 3
per-block issue rules: [ 'feed-no-feedmode' ]
audit invariant rules: [ 'feedmode-undeclared', 'wcs-unselected', 'no-program-end' ]
audit counts: {"ERROR":0,"WARN":3,"INFO":1}
lintFindingCount surfaced: 2

### Assistant | 2026-06-25T13:20:26.474Z

Important finding. The lint `missing-program-end` WARN is emitted at line 4 (split array length, the trailing empty element), but the max real block line is 3. So **that lint finding is silently dropped from the per-block `issues` and never counted in `counts`** — `findingsByLine.get(4)` is never consulted because no block has line 4.

This is a double-edged situation:
1. The `counts` returned by `auditNc` (line 224-226) only sum per-block `issues` + `invariants`. The dropped lint finding for line 4 is NOT in `counts`. So `auditNc.counts.WARN` undercounts vs. `lintNc.counts.WARN`.
2. It happens to be masked here because `auditNc` has its OWN `no-program-end` invariant. But that's coincidental redundancy — any lint finding lintNc keys to `lines.length` (end-of-program: `missing-program-end`, `file-truncated`) is dropped from the per-block composition. The `file-truncated` lint INFO at `MAX_LINES` would also be dropped/orphaned.

Let me confirm the impact and check whether non-end-of-program lint findings can ever key to a blank line that auditNc skips. Also let me verify the tokenizer's comment-detection asymmetry between `parseBlock` and `stripComments`.

### Assistant | 2026-06-25T13:20:41.666Z

[tool_use: Bash]

### User | 2026-06-25T13:20:44.846Z

[tool_result] [ABC]: comment= null words= []
[FEED / MIN]: comment= "(ok)" words= ["G1","X1","F10"]
[HI-LO PASS]: comment= "[HI-LO PASS]" words= ["G0","X5"]
okuma prose [X-2 ...] words of block1: ["X-2","G0","X0"]

### Assistant | 2026-06-25T13:20:57.529Z

Critical finding confirmed. **The macro-guard treats `-` (hyphen/minus) as an arithmetic operator, so any Okuma `[]` prose comment containing a hyphen is NOT stripped, and its contents get tokenized as real NC words.** 

`[X-2 RAPID OK] G0 X0` on an Okuma post produces words `["X-2","G0","X0"]` — a phantom `X-2` coordinate word injected from inside a comment. This is exactly the failure mode the file header claims to prevent ("we never mis-read a coordinate inside a comment"). On Okuma (`[]` is the comment delimiter), hyphenated prose is common: `[HI-LO]`, `[TOOL-2]`, `[X-AXIS HOME]`, `[ROUGH-FINISH]`. Each injects phantom coordinate/address words into the block analysis.

Worse, this is the **safety-relevant** core: the contract explicitly says block analysis must not mis-read coordinates in comments because "subtle parsing/classification bugs have real safety consequence." A phantom `X-2` could change a block's classification (`motion-cont`), pollute the modal/vocabulary trace, and corrupt the golden cross-reference. Let me confirm it can pollute classification and that the `[ABC]` asymmetry (comment field says null but word-view strips it) is benign.

Let me also check the dialect mismatch: `stripComments` always strips `()` regardless of dialect, but on Heidenhain/Siemens `()` isn't always a comment. And verify the spindle/coolant ordering for `M3 M8` same block, plus ReDoS surface.

### Assistant | 2026-06-25T13:21:04.030Z

[tool_use: Bash]

### User | 2026-06-25T13:21:05.542Z

[tool_result] Okuma prose-only [ROUGH-PASS 1] class: other (should be comment)
  vocabulary leaked: {"g":[],"m":["30"]}
[USE G-1 HERE] vocab.g: ["-1","0"] (phantom?)
M3 M8 same block ERROR count: 0 (should be 0, spindle present)

### Assistant | 2026-06-25T13:21:14.506Z

Both confirmed as real defects:

1. **`[ROUGH-PASS 1]` on Okuma → class `other`** instead of `comment` (the prose `1` tokenizes as a bare... actually it tokenizes `S`? no — let me note it classified as `other`, meaning a phantom word was created but not X/Y/Z. Either way it's mis-classed, not a comment).

2. **`[USE G-1 HERE]` → vocabulary G includes `-1`** — a phantom, nonsensical G-code `G-1` injected into the candidate vocabulary. This directly corrupts `crossRefGolden`: it would report `G-1` as a "surprise code the post emits" — a fabricated prove-out risk flag that no real post emitted. This is a **false-positive safety signal**, which the file header explicitly markets as the tool's value ("a post that emits codes the shop's proven goldens never contain is a prove-out risk").

Now let me check the ReDoS/adversarial bounds and verify the `lintNc` regex cost claim, plus check the WORD_RE for catastrophic backtracking. Also verify the test for the real JM golden actually asserts what it claims (the block count 27).

### Assistant | 2026-06-25T13:21:21.914Z

[tool_use: Bash]

### User | 2026-06-25T13:21:26.123Z

[tool_result] parseBlock 120k-char line: 7 ms, raw len: 50000 words: 16667
binary line words: ["G1","Y10"]
unbalanced bracket: 0 ms, words: 2
5000 blocks: 82 ms, blockCount: 5001

### Assistant | 2026-06-25T13:21:33.112Z

No ReDoS — regexes are linear, bounds hold, binary/unbalanced input is safe. Good. Note: `auditNc` calls `lintNc(src, ...)` on the **full untruncated `src`** (line 135) while it walks only the first `MAX_LINES` lines — for a >200k-line file lintNc processes the whole thing (it has its own MAX_LINES cap, so that's fine). The `findingsByLine` map could carry findings beyond block range but those just won't match — bounded, acceptable.

Now let me verify the test quality (R9) and run the actual test suite to confirm it passes as written, and check the `--max-blocks` default `Infinity` interaction with `Number.isFinite`.

### Assistant | 2026-06-25T13:21:33.995Z

[tool_use: Bash]

### User | 2026-06-25T13:21:35.713Z

[tool_result]   ...
# Subtest: auditNc: parses a REAL JM golden lathe program without crashing
ok 10 - auditNc: parses a REAL JM golden lathe program without crashing
  ---
  duration_ms: 0.8679
  ...
# Subtest: CLI exits 1 on an ERROR finding, 0 on a clean program
ok 11 - CLI exits 1 on an ERROR finding, 0 on a clean program
  ---
  duration_ms: 110.7995
  ...
1..11
# tests 11
# suites 0
# pass 11
# fail 0
# c
... [+54 chars truncated]

### Assistant | 2026-06-25T13:21:42.800Z

All 11 pass, no `.skip`/`.only`. Let me verify the real-golden test isn't silently a no-op (the file existence guard `return` early) and check whether the asserted block count 27 actually matches the real file — a test that `return`s early when the corpus is absent is a hidden skip.

### Assistant | 2026-06-25T13:21:46.249Z

[tool_use: Bash]

### User | 2026-06-25T13:21:48.249Z

[tool_result] -rw-r--r-- 1 wompu 197611 548 Nov 16  2021 JM DIE/CNC LATHE/9007405.MIN
---
real blockCount: 27 (test asserts 27)
vocab.g: ["0","1","18","50","95","96","97","140"]
includes 96/97/50: true true true

### Assistant | 2026-06-25T13:21:55.385Z

The real-golden test 10 is genuine (the file exists, block count 27 matches, G50/96/97 present) — a real R9 integration test, not a silent no-op on this host. The early-`return` guard is a reasonable portability hedge, though it would silently pass on a host missing the corpus (acceptable, but worth noting it's the one test that *can* degrade silently).

Let me do a final pass on remaining contract items: spindle/coolant FSM correctness for `M5 M9` in one block, the `classifyBlock` precedence claim ("most safety-salient wins"), and the WCS modal loop. Let me also verify whether the `motion-cont` class for a bare-coordinate move inside an active canned cycle is a real safety mis-classification per the contract.

### Assistant | 2026-06-25T13:22:08.483Z

[tool_use: Bash]

### User | 2026-06-25T13:22:11.167Z

[tool_result] M30 M6 (end+toolchange): program-end | M6 alone: tool-change
G81+M3: canned-cycle (spindle-start subordinated to cycle)
G0 G28 M6: tool-change
G98 G81 (return-mode+cycle): canned-cycle
G98 alone: other
after M5 M9: spindle= off coolant= off
final wcs after G54 then G55: 55 (should be 55)
block G55 G54 -> wcs: 55 (loop order forces 54, but text says G54 is... ambiguous-both-present)

### Assistant | 2026-06-25T13:22:20.017Z

The classify precedence and spindle/coolant/WCS FSM are sound:
- `program-end > program-stop > tool-change > canned-cycle > ...` — most safety-salient wins. Correct.
- `M5 M9` both close correctly (spindle off, coolant off).
- WCS last-wins across blocks works. The within-block `G55 G54` → 55 is the loop-order artifact (iterates 54→59 so 55 set last), but two WCS in one block is itself anomalous and not flagged — minor, since the multi-motion flag doesn't cover WCS. Acceptable.

One note: `G98 G81` correctly stays `canned-cycle`. Good.

I have enough to render a verdict. Let me do one final confirmation on the WORD_RE handling of `N`-numbers and whether `normCode` could throw, and confirm the `--max-blocks` Infinity path.

### Assistant | 2026-06-25T13:22:31.637Z

[tool_use: Bash]

### User | 2026-06-25T13:22:34.219Z

[tool_result] X. : []
default maxBlocks blockCount: 11
maxBlocks:0 -> 0 (0 blocks - edge, but CLI never passes 0)

### Assistant | 2026-06-25T13:23:20.541Z

All clean — `normCode` can't NaN (WORD_RE guarantees digits), `X.` doesn't tokenize, `maxBlocks` edges are guarded at the CLI. The `maxBlocks:0` API-level edge is benign (CLI's `|| Infinity` prevents 0 reaching it).

I have a complete picture. Final verdict.

---

VERDICT: FAIL

summary: The tokenizer's `[]` comment-strip macro-guard treats `-` (hyphen) as an arithmetic operator, so on Okuma (where `[]` IS the comment delimiter) any hyphenated prose comment — `[ROUGH-PASS]`, `[X-AXIS HOME]`, `[USE G-1 HERE]` — is NOT stripped and its contents are tokenized as real NC words. This injects phantom coordinate/G/M words into block classification, the modal/vocabulary trace, and the golden cross-reference — the exact "never mis-read a coordinate inside a comment" guarantee the file header sells, and it manufactures false prove-out-risk signals (the tool's headline safety value). Separately, the modal FSM's unconditional `G80 → motion=null` clobbers a legitimately-commanded G0/G1 in the same block, and lintNc end-of-program findings are silently dropped from the composed per-block issues and undercounted in `counts`.

findings:
- [P1] post-block-audit.mjs:72 (and the twin regex at :71-73) — The macro-guard `/[#+\-*/=]/.test(inner)` classifies any `[]` content containing `-` as a macro (kept in the word view), but `-` is also the prose hyphen. On Okuma (`opts.dialect:"okuma"`, where `[]` is the comment delimiter), `[X-2 RAPID]`/`[ROUGH-PASS 1]`/`[USE G-1 HERE]` are comments yet survive into `view` and tokenize: verified `auditNc("[USE G-1 HERE]\nG0 X0\nM30\n",{dialect:"okuma"})` yields `vocabulary.g = ["-1","0"]` (phantom `G-1`) and `auditNc("[X-2 RAPID OK] G0 X0…")` yields words `["X-2","G0","X0"]`. This corrupts `classifyBlock` (a comment-only line becomes class `other` not `comment` — confirmed `[ROUGH-PASS 1]`), pollutes the modal/vocabulary trace, and feeds `crossRefGolden` a fabricated "surprise code" (false safety signal). Fix: make the macro-guard require an actual 
... [+4372 chars truncated]
