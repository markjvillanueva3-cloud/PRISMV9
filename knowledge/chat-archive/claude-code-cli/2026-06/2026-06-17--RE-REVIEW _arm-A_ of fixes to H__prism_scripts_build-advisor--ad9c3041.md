---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "RE-REVIEW (arm-A) of fixes to H:\\prism\\scripts\\build-advisory-feature-catalog.mj"
date: "2026-06-17"
first_ts: "2026-06-17T13:26:16.718Z"
last_ts: "2026-06-17T13:30:06.860Z"
cwd: "H:\\prism"
messages: 47
user_msgs: 17
assistant_msgs: 30
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a4300d277250836c8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# RE-REVIEW (arm-A) of fixes to H:\prism\scripts\build-advisory-feature-catalog.mj

> **claude-code-cli** | 2026-06-17 | 47 msgs (17 user / 30 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a4300d277250836c8.jsonl`

## Transcript

### User | 2026-06-17T13:26:16.718Z

RE-REVIEW (arm-A) of fixes to H:\prism\scripts\build-advisory-feature-catalog.mjs (+ .test.mjs). You previously graded this FAIL. Read BOTH files end-to-end again and verify each prior finding is RESOLVED without regression.

Prior findings you raised:
- P1: `classConf > 0` filter silently dropped 205/290 wired actionable features incl. 61 block-gates (duplication-hard-block, file-claim-guard, etc.) from the projection -> template blind to hard stops.
- P1: `locate` class had ZERO features (symptom of the conf-0 drop).
- P2: comment-borne false-positive gates (10/134, e.g. stop-slot-task-claims-advisory counted as GATE).

The fixes applied:
1. aggregateCatalog now splits wired actionable features into byTaskClass (conf>0, class-specific) + universalFeatures (conf==0 -> always-on bucket). NOTHING dropped. New stats: actionableWired, classSpecificCount, universalCount with the conservation invariant classSpecific+universal===actionableWired.
2. New stripComments(body) (block then URL-safe line comments) applied in classifyBehavioralKind before block/inject regex tests.
3. extractKnob now matches _DISABLED/_ENABLED (longer-first) too.
4. Header note + check() updated; `locate` is now reported as "no CLASS-SPECIFIC feature (universal bucket applies)" not a hole.

Live proof to confirm: 23/23 tests; live regen shows actionable 282 = class-specific 82 + universal 200 (conservation true); the 4 named hard gates are visible-in-projection=true; advisory-named-but-gate count = 0; gate count 134->124 (10 comment-FPs removed).

VERIFY:
1. Is the conf-0 P1 genuinely resolved -- is EVERY wired block-gate now in byTaskClass OR universalFeatures (no hard stop invisible)? Is the conservation invariant real (not gameable)?
2. Did stripComments introduce any FALSE-NEGATIVE (a real in-code block emit accidentally stripped)? Is the URL-safe line strip correct?
3. Is universalFeatures the right model, or does dumping 200 conf-0 features into one bucket make it useless to a template? Hone
... [+246 chars truncated]

### Assistant | 2026-06-17T13:26:26.111Z

I'll re-review both files end-to-end and verify each prior finding is resolved.

### Assistant | 2026-06-17T13:26:26.589Z

[tool_use: Read]

### Assistant | 2026-06-17T13:26:27.145Z

[tool_use: Read]

### User | 2026-06-17T13:26:27.538Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/build-advisory-feature-catalog.mjs
3	//
4	// ROUTING-GRAPH-COMPLETENESS / U-ADVISORY-CATALOG (slot:alpha 2026-06-17). Operator
5	// directive: "find all automated and advisory features we have and plan accordingly
6	// for all of them."
7	//
8	// THE GAP (R8, verified by recon): PRISM's routing graph (feature-routing-graph.mjs
9	// TASK_CLASS_POLICY) hand-referen
... [+17507 chars truncated]

### User | 2026-06-17T13:26:28.140Z

[tool_result] 1	// scripts/build-advisory-feature-catalog.test.mjs
2	//
3	// Tests for U-ADVISORY-CATALOG pure fns. R9: every assertion encodes WHY the
4	// behavior matters (a block-gate must never be misread as advisory -> a chat would
5	// not know a feature can hard-stop it; the byTaskClass projection must exclude
6	// orphans/passive -> the template would surface dead features). Reference inputs are
7	// r
... [+11943 chars truncated]

### Assistant | 2026-06-17T13:26:32.766Z

Now let me verify the dependency `feature-routing-graph.mjs` to confirm the classifier contract (taskClasses, confidence semantics) and that conf==0 truly means "no class-keyword match" rather than a real class assignment being dropped.

### Assistant | 2026-06-17T13:26:33.334Z

[tool_use: Read]

### User | 2026-06-17T13:26:34.696Z

[tool_result] 1	// scripts/lib/feature-routing-graph.mjs
2	//
3	// FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH (slot:alpha 2026-06-15) -- the
4	// UNIFIED feature-routing decision graph. Operator directive: "build a graph for
5	// you to follow on the most token efficient way to do every tool call and every
6	// task we've ever done" + auto-invoke commands without typing them.
7	//
8	// THE GAP THIS FILLS (veri
... [+22777 chars truncated]

### Assistant | 2026-06-17T13:26:39.255Z

I have the classifier contract. `classifyRoutingClass` returns `confidence: 0` exactly when `bestScore <= 0` (no signal phrase matched), and `confidence` only goes to 0 in that no-match branch (line 243). So `conf==0` is a genuine "no class-keyword match" — it cannot accidentally drop a real class assignment. Let me verify the live regen output to confirm the claimed numbers.

### Assistant | 2026-06-17T13:26:41.090Z

[tool_use: Bash]

### Assistant | 2026-06-17T13:26:41.290Z

[tool_use: Bash]

### User | 2026-06-17T13:26:45.163Z

[tool_result] advisory-feature-catalog: 832 hooks | wired 413 | automated(gate) 124 | advisory(inject) 353 | knobbed 293
actionable 282 = class-specific 82 + universal 200 (none dropped)
per-class (class-specific)  session:18  fix:16  build:12  orchestrate:10  domain:7  review:5  recall:4  learn:4  quote:2  plan:2  physics:2
note: classes with no CLASS-SPECIFIC feature (universal bucket still applies): locate
-
... [+53 chars truncated]

### User | 2026-06-17T13:26:49.523Z

[tool_result]   ...
# Subtest: aggregateCatalog: withKnob counts knobbed records
ok 23 - aggregateCatalog: withKnob counts knobbed records
  ---
  duration_ms: 5.494
  ...
1..23
# tests 23
# suites 0
# pass 23
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 80.1177

### Assistant | 2026-06-17T13:26:53.752Z

Live numbers confirm the claims: actionable 282 = class-specific 82 + universal 200, conservation holds, 23/23 pass. Now let me verify the two specific claims that require digging: (1) that the 4 named hard gates are actually in the projection (not invisible), and (2) that stripComments did not introduce a false-negative by checking the gate count change against real block-emitting hooks.

### Assistant | 2026-06-17T13:27:00.886Z

[tool_use: Bash]

### User | 2026-06-17T13:27:07.382Z

[tool_result] duplication-hard-block | in-projection: true | universal: true | classes: -
file-claim-guard | in-projection: true | universal: true | classes: -
comprehensive-build-enforce | in-projection: true | universal: false | classes: build
scrutinize-before-stop | in-projection: true | universal: false | classes: review
--- ground-truth wired-actionable from features[]: 282 vs actionableWired: 282
wired-a
... [+88 chars truncated]

### Assistant | 2026-06-17T13:27:11.514Z

All 4 named gates visible, zero wired-actionable features dropped (282=282), and all 85 wired block-gates are in the projection. The P1 is genuinely resolved. Now let me verify stripComments did not introduce a false-negative — checking hooks that emit a real block but might have it stripped, and confirming the gate count drop (134→124) is purely comment false-positives, not real gates lost.

### Assistant | 2026-06-17T13:27:21.592Z

[tool_use: Bash]

### User | 2026-06-17T13:27:25.751Z

[tool_result] (node:34384) ExperimentalWarning: CommonJS module H:\prism\[eval] is loading ES Module H:\prism\scripts\build-advisory-feature-catalog.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
---ESM, use import---
hooks where stripComments removed the ONLY block si
... [+445 chars truncated]

### Assistant | 2026-06-17T13:27:32.022Z

10 hooks had their only block signal in a comment — matching the claimed 134→124 (10 comment-FP removal). I need to verify each of these is a TRUE comment false-positive (block pattern was genuinely only in a comment), not a real in-code block that got wrongly stripped (false-negative). Let me inspect the actual block-pattern occurrences in these files.

### Assistant | 2026-06-17T13:27:38.711Z

[tool_use: Bash]

### User | 2026-06-17T13:27:47.302Z

[tool_result] === anti-regression-auto-sweep
  L26 [SURVIVES-strip!]: *     emits `{continue:false, decision:"regression-detected"}` per policy.
=== error-block-capture
  L13 [SURVIVES-strip!]: *   - tool_response containing decision:"block" (a hook above us blocked)
=== html-companion-guard
  L161 [SURVIVES-strip!]: process.stdout.write(JSON.stringify({ decision: "block", reason: lines.join("\n") }));
=== read
... [+951 chars truncated]

### Assistant | 2026-06-17T13:27:55.173Z

This is a critical finding. The lines marked `[SURVIVES-strip!]` are JSDoc block comments (`*` continuation lines), but my per-line test re-checked each line in isolation, so the `/* ... */` block-comment stripping (which is multi-line) didn't apply on a single line. The real `stripComments` operates on the whole body. But one entry stands out: **`html-companion-guard` L161** is a REAL in-code block emit: `process.stdout.write(JSON.stringify({ decision: "block", reason: ... }))`. Let me verify whether the full-body stripComments correctly preserves it, and why it ended up classified non-gate.

### Assistant | 2026-06-17T13:27:59.720Z

[tool_use: Bash]

### User | 2026-06-17T13:28:04.242Z

[tool_result] file: .claude/hooks/html-companion-guard.mjs | wired: true
body bytes: 10030 | BODY_CAP=262144 | truncated: false
L161 block survives strip (full body): false
classifyBehavioralKind(capped): passive
first real decision:block byte offset: 9080

### Assistant | 2026-06-17T13:28:08.270Z

This is a genuine FALSE-NEGATIVE, but I need to determine its cause precisely. `html-companion-guard` L161 IS a real in-code block emit, and after `stripComments` the block signal does NOT survive. Let me look at the actual file around L161 to understand why — is the `process.stdout.write(...)` line itself somehow being eaten, or is there a structural reason.

### Assistant | 2026-06-17T13:28:09.113Z

[tool_use: Read]

### User | 2026-06-17T13:28:10.331Z

[tool_result] 150	    lines.push("  fix (patches): node H:/prism/scripts/md-to-html.mjs <input.md>   (re-stage the .html)");
151	  }
152	  if (a11yBad.length) {
153	    lines.push("", "A11Y (WAI-ARIA — scripts/check-spec-html-a11y.mjs):");
154	    for (const a of a11yBad.slice(0, 10)) lines.push(`  • ${a}`);
155	    if (a11yBad.length > 10) lines.push(`  … and ${a11yBad.length - 10} more`);
156	    lines.push("
... [+1134 chars truncated]

### Assistant | 2026-06-17T13:28:16.180Z

Found it. `html-companion-guard.mjs` L161 is a REAL hard block: `process.stdout.write(JSON.stringify({ decision: "block", reason: ... }))`. The body is only 10030 bytes (well under the 256K cap, not a truncation issue). Yet `classifyBehavioralKind` returns `passive` and the block signal does NOT survive `stripComments`. This is a genuine false-negative — a real hard gate is now invisible in the projection. Let me pinpoint exactly why stripComments is eating the real code on L161.

### Assistant | 2026-06-17T13:28:17.927Z

[tool_use: Bash]

### User | 2026-06-17T13:28:21.887Z

[tool_result] RAW : "    process.stdout.write(JSON.stringify({ decision: \"block\", reason: lines.join(\"\n\") }));"
STRP: "    process.stdout.write(JSON.stringify({ decision: \"block\", reason: lines.join(\"\n\") }));"

### Assistant | 2026-06-17T13:28:26.039Z

That line in isolation survives. So the problem is the multi-line interaction — the block-comment regex `/\/\*[\s\S]*?\*\//g` is consuming across lines. Let me check whether an earlier JSDoc `/*` ... combined with the `decision:"block"` mentioned in a comment near L13, or some `*/`-less construct, is causing the block regex to span from a comment opener through the real code line. Let me reproduce on the actual full body.

### Assistant | 2026-06-17T13:28:32.193Z

[tool_use: Bash]

### User | 2026-06-17T13:28:36.308Z

[tool_result] PRISM_HTML_GUARD_BLOCK in stripped at: -1
first process.stdout.write in stripped at: 2027
decision in stripped at: -1
block-comment count: 5
/* count: 8 | */ count: 5

### Assistant | 2026-06-17T13:28:44.451Z

Confirmed root cause. There are **8 `/*` openers but only 5 `*/` closers** in the file. The non-greedy block-comment regex `/\/\*[\s\S]*?\*\//g` pairs `/*` tokens with the next `*/` greedily-by-position, so a `/*` appearing inside a **string literal** (e.g. a regex or a URL/glob pattern containing `/*`) gets treated as a comment opener and swallows everything up to the next real `*/`, deleting the genuine `decision: "block"` code in between. Let me find the offending `/*` tokens inside strings.

### Assistant | 2026-06-17T13:28:46.164Z

[tool_use: Bash]

### User | 2026-06-17T13:28:50.864Z

[tool_result] L3: /**
L7: * under state/shared/specs/** or state/shared/research/**, then for each such
L31: */
L77: /** Pull the sha256 out of `<meta name="prism-source-hash" content="…">`, any attr order. */
L85: /**
L90: */
L110: try { hookInput = JSON.parse(readFileSync(0, "utf8")); } catch { /* direct/test invocation with no s
L146: // state/shared/{specs,research}; state/shared/dashboards/patches/*.md nee
... [+108 chars truncated]

### Assistant | 2026-06-17T13:28:57.829Z

Root cause fully confirmed. Line 7 contains `state/shared/specs/**` and `state/shared/research/**` inside a JSDoc — the `/**` (from `/**` at L3 opener is fine) — but the `**/` sequences embedded in glob paths like `specs/**` create stray `*/`-like tokens, and L146 has `patches/*.md` containing `/*`. The greedy/positional pairing of `/* ... */` mismatches the real comment boundaries, causing the block-comment strip to consume real code including the L161 `decision: "block"` emit.

This is a **P1 false-negative**: a real wired hard-block gate (`html-companion-guard`) is now classified `passive` and is INVISIBLE in the projection. Let me confirm it's wired and quantify whether other real gates are similarly affected, then check the prior-bug-locking test wasn't removed.

### Assistant | 2026-06-17T13:29:06.922Z

[tool_use: Bash]

### User | 2026-06-17T13:29:10.741Z

[tool_result] REAL-block-in-code but classified non-gate: 1
   html-companion-guard | wired: true | kind: passive | /*:8 */:5 MISMATCH

### Assistant | 2026-06-17T13:29:15.196Z

Exactly one victim, but it is a wired hard-block gate, and the regression is directly caused by the new `stripComments` edit. Let me confirm the prior bug-locking test (the conf>0 drop / P1) was NOT removed, and verify the test suite has no test that would catch this `/* */` mismatch false-negative (it does not, since 23/23 pass while the bug is live).

### Assistant | 2026-06-17T13:29:18.096Z

[tool_use: Bash]

### User | 2026-06-17T13:29:24.520Z

[tool_result] --- diff of test file vs prior commit (look for removed bug-lock tests) ---
--- staged/working vs HEAD: any removed tests? ---

### Assistant | 2026-06-17T13:29:28.798Z

[tool_use: Bash]

### User | 2026-06-17T13:29:33.834Z

[tool_result] ?? scripts/build-advisory-feature-catalog.mjs
?? scripts/build-advisory-feature-catalog.test.mjs
--- is the .mjs tracked? ---
--- untracked check ---
error: pathspec 'scripts/build-advisory-feature-catalog.mjs' did not match any file(s) known to git
Did you forget to 'git add'?

### Assistant | 2026-06-17T13:30:06.860Z

Both files are untracked (new), so there's no prior committed test to have removed — the "old bug-locking test got removed" concern is N/A (this is the first version landing). The conf>0 P1 bug-lock tests ARE present in the current file (lines 174-207: "NONE dropped", "NO wired block-gate is ever dropped"). 

I now have everything to grade. Let me do a final precedence sanity check on the universalFeatures-usefulness question and the test tautology question.

The findings are clear. Summarizing my verification:

**1. conf-0 P1 — RESOLVED.** Verified against ground truth: 282 wired-actionable = 82 class-specific + 200 universal, 0 dropped; all 85 wired block-gates visible-in-projection; all 4 named gates present (duplication-hard-block/file-claim-guard in universal, comprehensive-build-enforce/scrutinize-before-stop class-specific). Conservation invariant is real, not gameable — `classSpecificCount`/`universalCount` are computed from the same buckets the projection emits (lines 190-191), and the `continue` at line 171 is the only exclusion path (non-actionable/unwired), so the sum identically equals `actionableWired`. conf==0 genuinely means "no class-keyword match" (`classifyRoutingClass` line 243 only returns confidence 0 in the no-signal branch), so universal is the correct bucket, not a dropped class.

**2. stripComments — INTRODUCED A NEW P1 FALSE-NEGATIVE.** The block-comment regex `/\/\*[\s\S]*?\*\//g` (line 55) is not aware of `/*` / `*/` tokens embedded in string/glob literals. `html-companion-guard.mjs` (wired) has 8 `/*` vs 5 `*/` (glob paths `specs/**`, `patches/*.md`), so positional pairing swallows real code including its genuine L161 `process.stdout.write(JSON.stringify({ decision: "block" ... }))` hard block. Result: a real wired hard-block gate is misclassified `passive` and is INVISIBLE in the projection — the exact class of failure the fix set out to eliminate. The URL-safe *line*-comment strip (line 56) is correct; the *block*-comment strip is the
... [+3495 chars truncated]
