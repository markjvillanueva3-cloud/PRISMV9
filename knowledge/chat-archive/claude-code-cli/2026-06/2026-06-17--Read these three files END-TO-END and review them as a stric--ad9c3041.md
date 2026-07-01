---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Read these three files END-TO-END and review them as a strict code reviewer. Gra"
date: "2026-06-17"
first_ts: "2026-06-17T04:29:00.767Z"
last_ts: "2026-06-17T04:33:29.047Z"
cwd: "H:\\PRISM"
messages: 72
user_msgs: 27
assistant_msgs: 45
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a9f49b6310b86a316.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Read these three files END-TO-END and review them as a strict code reviewer. Gra

> **claude-code-cli** | 2026-06-17 | 72 msgs (27 user / 45 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a9f49b6310b86a316.jsonl`

## Transcript

### User | 2026-06-17T04:29:00.767Z

Read these three files END-TO-END and review them as a strict code reviewer. Grade PASS or FAIL with P0/P1/P2 findings + file:line citations.

FILES:
1. H:\prism\scripts\vault-lessons-to-lora-dataset.mjs  (NEW -- a LoRA training-data feeder)
2. H:\prism\scripts\vault-lessons-to-lora-dataset.test.mjs  (NEW -- its tests, 11/11 passing)
3. H:\prism\scripts\build-fleet-training-corpus-inventory.mjs  (EDITED -- a ~9-line SOURCES registration entry for 'vault-lessons-lora' was added; review ONLY that added entry near the 'bridge-reasoning-lora' entry, not the rest of the file)

CONTEXT / CONTRACT the feeder must satisfy:
- Purpose: turn PRISM's failure->fix corpus (knowledge/wiki/code-tribal/learnings/*.md auto-distilled lessons) into LoRA instruction-tuning pairs, emitted in the SAME Alpaca {instruction,input,output} schema as the sibling vault-to-lora-dataset.mjs so they drop into the same training pipeline.
- It MUST reuse splitFrontmatter from vault-to-lora-dataset.mjs (R8 -- it does, via import).
- HEADLINE QUALITY INVARIANT (R9/R12): pairs must be NON-DEGENERATE -- input (the symptom) must never equal output (the root-cause+fix). A copy-the-input pair teaches the model nothing / is harmful. Verify the splitSymptomDiagnosis + lessonToAlpaca logic genuinely enforces this and that the gate rejects low-signal/unsplittable entries rather than emitting junk.
- It is a DATA PRODUCER: writes its own jsonl (never merged with the hand-authored verified-feedback set) and is registered as an advisory (down-weighted) source.

Focus your review on: correctness of the markdown section parser (does it correctly capture a multi-line ## Body up to the next ## heading -- there was a prior bug where a multiline regex `$` truncated to line 1, now slice-based); the noise-strip regex (PREFIX_RE -- does it strip the "[TAGS] [SCOPE]/U-ID (slot:x):" commit prefix without eating real narrative?); fail-soft on null/empty/unreadable; any silent-failure or fabrication risk; whether the tests act
... [+243 chars truncated]

### Assistant | 2026-06-17T04:29:04.804Z

I'll review these three files end-to-end. Let me start by reading all of them in parallel, plus the sibling file the feeder depends on.

### Assistant | 2026-06-17T04:29:05.246Z

[tool_use: Read]

### Assistant | 2026-06-17T04:29:05.715Z

[tool_use: Read]

### Assistant | 2026-06-17T04:29:06.072Z

[tool_use: Read]

### User | 2026-06-17T04:29:07.935Z

[tool_result] 1	/**
2	 * vault-lessons-to-lora-dataset.mjs -- turn PRISM's failure->fix corpus (the
3	 * wiki code-tribal/learnings/*.md auto-distilled lessons) into LoRA
4	 * instruction-tuning pairs. (AI-SYSTEMS-LORA, slot:alpha 2026-06-17.)
5	 *
6	 * WHY (the gap this closes):
7	 *   The existing vault->LoRA feed (vault-to-lora-dataset.mjs) mines two DOCTRINE
8	 *   sources: feedback/*.md (313 rule pairs) an
... [+15248 chars truncated]

### User | 2026-06-17T04:29:08.288Z

[tool_result] 1	// scripts/vault-lessons-to-lora-dataset.test.mjs
2	// Real reference-value tests (R9): each pins the concrete extraction/quality
3	// behaviour that would FAIL if the lessons->LoRA feeder regressed. The headline
4	// invariant is NON-DEGENERACY: input must never equal output (a copy-the-input
5	// pair teaches nothing / is harmful).
6	import { test } from "node:test";
7	import assert from "node
... [+7050 chars truncated]

### User | 2026-06-17T04:29:09.706Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * vault-to-lora-dataset.mjs -- turn the Obsidian feedback vault into LoRA
4	 * instruction-tuning pairs (OBSIDIAN-AI-SYNERGY, slot:kilo 2026-06-09).
5	 *
6	 * THE GAP: the existing LoRA dataset builders (LatheLoRADatasetBuilderEngine et
7	 * al.) emit machining-PARAMETER pairs from raw NC programs / DB registries. They
8	 * do NOT touch the Obsidian vault. But the va
... [+28013 chars truncated]

### Assistant | 2026-06-17T04:29:13.147Z

Now let me verify the key claims. Let me check the actual learnings directory structure to validate the parser assumptions, and confirm `splitFrontmatter` is genuinely exported and reused.

### Assistant | 2026-06-17T04:29:14.579Z

[tool_use: Bash]

### Assistant | 2026-06-17T04:29:15.539Z

[tool_use: Bash]

### User | 2026-06-17T04:29:18.796Z

[tool_result] academy-corpus-ms0-u-a2-mit-ai-textbooks-metadata-contract.md
academy-corpus-ms0-u-a2-mit-ai-textbooks-register.md
agentic-substrate-bridge-u-backfill-consolidated-handoffs.md
agentic-substrate-bridge-u-cag-hitrate-telemetry.md
agentic-substrate-bridge-u-cross-pc-verify-wire.md
---COUNT---
2627

### User | 2026-06-17T04:29:24.684Z

[tool_result] FILE: knowledge/wiki/code-tribal/learnings/academy-corpus-ms0-u-a2-mit-ai-textbooks-metadata-contract.md
=====RAW=====
# ACADEMY-CORPUS-MS0/U-A2-MIT-AI-TEXTBOOKS-METADATA-CONTRACT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ACADEMY-CORPUS-MS0]/U-A2-MIT-AI-TEXTBOOKS-METADATA-CONTRACT (slot:alpha): add topics/source/note to PDFSourceMetadata — make the ai_textbook provenance+topic tags reachable in typed cod
... [+1562 chars truncated]

### Assistant | 2026-06-17T04:29:28.763Z

This is a critical finding. The real learning files have a Body section that starts with the **commit-subject prefix** followed by `\n\n` and then the narrative. Let me examine this against the parser logic carefully. Note the prefix in the real file contains an em-dash (`—`) and the body has structure. Let me trace several real files and the prefix-stripping behavior.

### Assistant | 2026-06-17T04:29:30.175Z

[tool_use: Bash]

### Assistant | 2026-06-17T04:29:31.401Z

[tool_use: Bash]

### User | 2026-06-17T04:29:34.561Z

[tool_result] === knowledge/wiki/code-tribal/learnings/academy-corpus-ms0-u-a2-mit-ai-textbooks-metadata-contract.md ===
## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ACADEMY-CORPUS-MS0]/U-A2-MIT-AI-TEXTBOOKS-METADATA-CONTRACT (slot:alpha): add topics/source/note to PDFSourceMetadata — make the ai_textbook provenance+topic tags reachable in typed code

Scrutiny reviewer-B P3 follow-up to 1443283f8b: the registry
... [+5167 chars truncated]

### User | 2026-06-17T04:29:40.314Z

[tool_result] 2611
---files with ## Body---
2611

### Assistant | 2026-06-17T04:29:45.525Z

This confirms critical issues. The real prefix patterns are: `[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ACADEMY-CORPUS-MS0]/U-A2-... (slot:alpha):` and `[MAIN-FORCE] [AGENTIC-SUBSTRATE-BRIDGE]/U-... (slot:bravo):`. Note the scope token in real files contains `-MS0` suffix and `/U-...`. But critically: some prefixes have `(slot:alpha, taking over for lima):` — a slot with extra text. Let me trace the PREFIX_RE against real prefixes and test the actual gate behavior end-to-end. Let me run the real script.

### Assistant | 2026-06-17T04:29:46.897Z

[tool_use: Bash]

### Assistant | 2026-06-17T04:29:47.408Z

[tool_use: Bash]

### User | 2026-06-17T04:29:50.664Z

[tool_result] vault-lessons-to-lora-dataset:
  scanned   : 2627 learning files
  accepted  : 159 (signal-gated, 6.1% of scanned)
  rejected  : 2468 (low-signal / no body / unreadable)
  deduped   : 2 near-duplicate outputs collapsed
  FINAL     : 157 unique high-signal Alpaca pairs
  sample    : instruction="What engineering lesson does this PRISM change teach, and how should it be applied in future work?"
    
... [+309 chars truncated]

### User | 2026-06-17T04:29:57.980Z

[tool_result]   ...
# Subtest: lessonToAlpaca: null on a low-signal or unsplittable entry
ok 9 - lessonToAlpaca: null on a low-signal or unsplittable entry
  ---
  duration_ms: 0.2703
  ...
# Subtest: instructionForLesson: content-keyed phrasing (not one constant)
ok 10 - instructionForLesson: content-keyed phrasing (not one constant)
  ---
  duration_ms: 0.5027
  ...
# Subtest: dedupPairs: collapses identical 
... [+263 chars truncated]

### Assistant | 2026-06-17T04:30:02.948Z

Tests pass (11/11) and the script runs (157 final pairs, 6.1% accept rate). Now the critical question: **non-degeneracy in the live output**. The sample shows an `input` that begins with "correct falsified #4 premise --" and an output starting "lesson: treat...". Let me verify the live output for degeneracy and check whether the commit prefix actually gets stripped from real entries (the PREFIX_RE concern). The first sample's input starts with narrative, not a prefix — good sign. But let me write the output and scan for input==output and prefix leakage across all 157.

### Assistant | 2026-06-17T04:30:08.435Z

[tool_use: Bash]

### User | 2026-06-17T04:30:11.789Z

[tool_result] Exit code 1
              output="lesson: treat the workflow plan as a hypothesis, re-verify every unit premise
live before ..."
  WROTE 157 pairs -> C:\Users\wompu\AppData\Local\Temp\vll-test.jsonl (+1 meta line)
===NON-DEGEN CHECK===
node:fs:441
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: ENOENT: no such file or directory, open 'H:\tmp\vll
... [+487 chars truncated]

### Assistant | 2026-06-17T04:30:14.076Z

The `--out` resolved to a Windows temp path. Let me use a path inside the repo for the check.

### Assistant | 2026-06-17T04:30:19.601Z

[tool_use: Bash]

### User | 2026-06-17T04:30:20.245Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 40420 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 54s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-m
... [+520 chars truncated]

### Assistant | 2026-06-17T04:30:23.307Z

That's an unrelated hook block, not my command failing. Let me retry the verification.

### Assistant | 2026-06-17T04:30:27.969Z

[tool_use: Bash]

### User | 2026-06-17T04:30:32.988Z

[tool_result] total: 157 | input==output: 0 | one-contains-other: 0 | prefix/slot-leak: 53 | emptyIn: 0 emptyOut: 0

### Assistant | 2026-06-17T04:30:36.968Z

Important findings: **0 degenerate pairs** (the headline invariant holds across all 157 live pairs — good). But **53 of 157 pairs (34%) carry a `[MAIN]`/`[MAIN-FORCE]` or `(slot:x)` leak** in input or output. The PREFIX_RE is NOT stripping the real-world prefix. Let me confirm exactly why — the real prefix has a structure PREFIX_RE doesn't match. Let me test PREFIX_RE against real prefixes.

### Assistant | 2026-06-17T04:30:42.118Z

[tool_use: Bash]

### User | 2026-06-17T04:30:46.707Z

[tool_result] STRIP-OK ::  [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ACADEMY-CORPUS-MS0]/U-A2-MIT-AI-TEXTB
STRIP-OK ::  [MAIN-FORCE] [AGENTIC-SUBSTRATE-BRIDGE]/U-BACKFILL-CONSOLIDATED-HANDOF
NO-MATCH ::  [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ACADEMY-CORPUS-MS0]/U-A2-MIT-AI-TEXTB
STRIP-OK ::  SCOPE/U-BAR (slot:india): real text

### Assistant | 2026-06-17T04:30:50.830Z

Confirmed. The PREFIX_RE matches the simple cases but **fails on `(slot:alpha, taking over for lima):`** — the `(slot:[a-z]+)` group does not allow the `, taking over for lima` suffix that appears in real commits. The `\(slot:[a-z]+\)` requires `)` immediately after the slot name. Let me quantify how many of the 53 leaks are this pattern vs. another cause, and inspect actual leaking pairs.

### Assistant | 2026-06-17T04:30:55.624Z

[tool_use: Bash]

### User | 2026-06-17T04:31:00.779Z

[tool_result] leaks with (slot:x, ...): 1
leaks with plain (slot:x): 1
leaks with [MAIN]/[MAIN-FORCE] tag: 53
--- sample leaking INPUTS ---
0: [MAIN] [APPRENTICE-PHONE-TEST-INFRA-MS0]/U-PHONE-TEST-INFRA-V1: 8-file infra so apprentice can install + test PRISM Academy PWA on phone TODAY.

Per /
1: [MAIN] [AUTOCOMPACT-AUTONOMOUS-MS0]/U-AAM04: harness wiring auditor — catches Gap-3-revert + precompact-unwired bug c
... [+341 chars truncated]

### Assistant | 2026-06-17T04:31:07.373Z

This is the root cause. The dominant leak pattern is `[MAIN] [SCOPE]/U-ID:` **with NO `(slot:x)` segment at all**. The PREFIX_RE *requires* `\(slot:[a-z]+\):` to match, so a prefix like `[MAIN] [APPRENTICE-PHONE-TEST-INFRA-MS0]/U-PHONE-TEST-INFRA-V1: 8-file infra...` does NOT match — the entire `[MAIN] [SCOPE]/U-ID:` prefix leaks straight into the training pair as input.

53 of 157 pairs (34%) contain this PRISM-process boilerplate that the function's entire stated purpose was to strip. Let me confirm this is the mandatory-slot assumption failing, and check the splitSymptomDiagnosis interaction (these leaked prefixes become the symptom `input`). Let me also verify the title-vs-prefix handling and check one full leaking pair.

### Assistant | 2026-06-17T04:31:12.853Z

[tool_use: Bash]

### User | 2026-06-17T04:31:17.482Z

[tool_result] LEAK  :: [MAIN] [APPRENTICE-PHONE-TEST-INFRA-MS0]/U-PHONE-TEST-I
LEAK  :: [MAIN] [AUTOCOMPACT-AUTONOMOUS-MS0]/U-AAM04: harness wi
=== how many learnings have a slot-less [MAIN]/[SCOPE]/U-ID Body prefix ===
971
=== how many have the (slot:x) form ===
5517

### Assistant | 2026-06-17T04:31:24.117Z

Confirmed and quantified. The corpus has **971 learnings whose prefix lacks `(slot:x)`** — the PREFIX_RE cannot strip any of those. That is why 34% of the emitted pairs leak `[MAIN] [SCOPE]/U-ID:` boilerplate into the training data. The function's docstring and the test (`stripLessonNoise: strips the [TAGS] [SCOPE]/U-ID (slot:x): prefix`) only ever exercised the `(slot:x)`-present form, so the test passed while the real-world slot-less form leaks.

This is a genuine R9 test-gap (the test pins the happy path the regex handles, never the slot-less variant that 971 corpus files use) and an R12 quality-invariant breach (the noise the function exists to strip survives into 34% of pairs). Let me check the em-dash question — whether non-ASCII appears in the *code* (required ASCII-only) vs just data, and confirm `splitFrontmatter` import resolves.

### Assistant | 2026-06-17T04:31:26.073Z

[tool_use: Bash]

### Assistant | 2026-06-17T04:31:28.029Z

[tool_use: Bash]

### User | 2026-06-17T04:31:30.122Z

[tool_result] === non-ASCII in the 3 code files (line:byte) ===
--- scripts/vault-lessons-to-lora-dataset.mjs ---
grep: -P supports only unibyte and UTF-8 locales
(clean ASCII)
--- scripts/vault-lessons-to-lora-dataset.test.mjs ---
grep: -P supports only unibyte and UTF-8 locales
(clean ASCII)

### User | 2026-06-17T04:31:33.759Z

[tool_result] splitFrontmatter reused via import: true

### Assistant | 2026-06-17T04:31:36.252Z

The `-P` flag failed (locale), so the ASCII check was inconclusive. Let me re-run with a reliable byte-level check.

### Assistant | 2026-06-17T04:31:41.434Z

[tool_use: Bash]

### User | 2026-06-17T04:31:45.365Z

[tool_result] --- scripts/vault-lessons-to-lora-dataset.mjs ---
CLEAN ASCII
--- scripts/vault-lessons-to-lora-dataset.test.mjs ---
CLEAN ASCII

### Assistant | 2026-06-17T04:31:48.409Z

Both code files are clean ASCII — good (the em-dash in real corpus data is fine; that's data, not source). Now let me verify the registry entry in the third file, the only part I'm asked to review there.

### Assistant | 2026-06-17T04:31:49.861Z

[tool_use: Grep]

### User | 2026-06-17T04:31:51.725Z

[tool_result] 81-    domains: ['general'],
82-    advisory: true, // LLM-distilled/mustHumanVerify -- the assembler down-weights it (authoritative, not regex-inferred)
83-  },
84-  {
85-    id: 'vault-galaxy-aisynergy-lora',
86-    kind: 'lora-training-jsonl',
87-    path: 'H:/prism/state/shared/lora/vault-galaxy-aisynergy-dataset.jsonl',
88-    description: 'Per-galaxy CLAUDE.md "## AI Synergy (PSN leg #10)" s
... [+2524 chars truncated]

### Assistant | 2026-06-17T04:31:56.487Z

The registry entry itself (lines 100-107) is well-formed: correct `id`, `path` matching `DEFAULT_OUT`, `advisory: true` (correctly down-weighted as the contract requires), schema-consistent. But I spotted something alarming at **lines 108, 112** — those lines begin with a backslash (`\`) instead of `//` for comments. That is a syntax error if it's actual code. Let me check whether this file parses at all and whether the registration is even loadable.

### Assistant | 2026-06-17T04:31:57.444Z

[tool_use: Bash]

### Assistant | 2026-06-17T04:31:58.213Z

[tool_use: Read]

### User | 2026-06-17T04:32:01.909Z

[tool_result] === check exit: 0 ===

### User | 2026-06-17T04:32:03.843Z

[tool_result] 105	    domains: ['general'],
106	    advisory: true, // distilled from commit-message lessons (not hand-authored doctrine) -- down-weighted like the synthesis/bridge sources
107	  },
108	  // Wiki canonical -> training pairs (U-FLOR-WIKI-CANON-WIRE, slot:tango 2026-06-11). The
109	  // "wikis across all galaxies" LoRA signal: canonical wiki entries deterministically
110	  // extracted into instru
... [+735 chars truncated]

### Assistant | 2026-06-17T04:32:08.718Z

The file parses cleanly (`node --check` exit 0) — the `\` I saw at lines 108/112 was a `rtk grep` rendering artifact (RTK's compact grep mangled the `//` to `\`), not real content. The Read confirms lines 108-113 are proper `//` comments. So the inventory file is syntactically fine and the registration is correct. Good — no P0 there.

Now let me confirm the registration entry's `path` matches the producer's actual `DEFAULT_OUT`, and double-check the meta-line interaction (the producer prepends a `__meta__` line — does the assembler's `normalizeAlpacaRow` choke on it or skip it?).

### Assistant | 2026-06-17T04:32:11.203Z

[tool_use: Bash]

### User | 2026-06-17T04:32:16.219Z

[tool_result] === producer DEFAULT_OUT ===
H:\prism\state\shared\lora\vault-lessons-dataset.jsonl
=== registry path ===
    path: 'H:/prism/state/shared/lora/vault-lessons-dataset.jsonl',
=== does assembler handle __meta__ line? grep normalizeAlpacaRow ===
scripts/assemble-fleet-lora-corpus.mjs
scripts/build-fleet-training-corpus-inventory.mjs

### Assistant | 2026-06-17T04:32:21.091Z

The path matches (`DEFAULT_OUT` == registry path, modulo separator normalization which is fine). The producer prepends a `__meta__` line (line 296-306) as the first JSONL row. Let me check whether the downstream assembler `normalizeAlpacaRow` filters or rejects that `__meta__` row — if not, a synthetic `{instruction:"__meta__", input:"", output:"<json blob>"}` pair leaks into training as a degenerate example.

### Assistant | 2026-06-17T04:32:21.787Z

[tool_use: Bash]

### User | 2026-06-17T04:32:25.962Z

[tool_result] 122:export function normalizeAlpacaRow(o) {
148:    const row = normalizeAlpacaRow(o);

### Assistant | 2026-06-17T04:32:30.530Z

[tool_use: Read]

### User | 2026-06-17T04:32:31.562Z

[tool_result] 118	 * The native keys win when both are present. Returns null when neither convention yields a
119	 * non-empty instruction AND output (counted invalid by the caller, never emitted as a
120	 * degenerate pair). Pure -> hermetically testable.
121	 */
122	export function normalizeAlpacaRow(o) {
123	  if (!o || typeof o !== "object") return null;
124	  const instruction =
125	    typeof o.instructio
... [+2231 chars truncated]

### Assistant | 2026-06-17T04:32:40.562Z

The assembler handles the `__meta__` line acceptably: `normalizeAlpacaRow` will accept it (it has a non-empty `instruction:"__meta__"` and a non-empty `output` JSON blob), so the `__meta__` row WOULD be emitted as a training pair. However, `__meta__` with `input:""` and a JSON-stats `output` is a degenerate/noise pair that would land in training. Let me verify whether the assembler or normalize filters `__meta__` specifically — it does not appear to. This is a real (minor) leak: the meta line becomes a training example. The sibling `vault-to-lora-dataset.mjs` does NOT prepend a `__meta__` line to its JSONL (it writes only `{instruction,input,output}` rows), so this producer diverges and introduces a junk row the assembler will ingest.

Let me confirm by checking what `selectLoraSources` does and whether `__meta__` survives into the combined corpus.

### Assistant | 2026-06-17T04:32:41.671Z

[tool_use: Bash]

### User | 2026-06-17T04:32:45.666Z

[tool_result] normalizeAlpacaRow(__meta__ line) => {"instruction":"__meta__","input":"","output":"{\"pairs\":157}"}
=> META LINE IS ACCEPTED as a training pair (LEAK)

### Assistant | 2026-06-17T04:32:53.083Z

Confirmed: the `__meta__` line is NOT rejected by the assembler — it lands as a real training pair (`instruction:"__meta__"`, a JSON-stats `output`). That is exactly one junk pair per assembly run from this source. Not catastrophic (1 of ~158), but it's a degenerate pair feeding the adapter, contradicting the producer's own R12 "quality over volume" stance, and it diverges from the sibling's clean schema.

Now let me do a final check on a subtle correctness point in the parser: the `section()` regex builds `new RegExp(`(^|\\n)##\\s+${heading}\\s*\\n`)` — `heading` is interpolated unescaped, but the headings are literal "Subject"/"Body" so that's safe. More importantly, the `## Body` match requires a trailing `\n` after the heading; let me verify the Subject section capture doesn't accidentally bleed (the Subject in real files is itself the full commit prefix line). And verify the fallback-to-subject path in `lessonToAlpaca` — since Subject IS the raw prefix line, could it ever pass the gate and produce a leak? Let me check the rejected-vs-accepted boundary once more and whether subject-fallback ever fires.

### Assistant | 2026-06-17T04:32:58.863Z

[tool_use: Bash]

### User | 2026-06-17T04:33:02.406Z

[tool_result] subject-fallback fired & passed gate: 0 | of those leaking [MAIN]: 0

### Assistant | 2026-06-17T04:33:29.047Z

The subject-fallback path never fires harmfully (0 cases) — the Subject (one-line prefix) never passes the 200-char gate, so that's not a leak vector. The leak is entirely the body-prefix path with slot-less `[MAIN] [SCOPE]/U-ID:` commits.

I have enough to render a verdict. Let me summarize the blast radius and consumer trace.

## VERDICT: FAIL

**summary:** The non-degeneracy invariant (input != output) holds perfectly across all 157 live pairs (0 degenerate), the parser correctly captures multi-line `## Body` (slice-based fix verified against real files), fail-soft on null/empty/unreadable is solid, both code files are clean ASCII, `splitFrontmatter` is genuinely reused via import, and the inventory registration is correct (path matches `DEFAULT_OUT`, `advisory:true` correctly down-weights it). BUT the `PREFIX_RE` silently fails to strip the most common real-world prefix shape — `[MAIN] [SCOPE]/U-ID:` with NO `(slot:x)` segment (971 such files in the corpus) — so 53 of 157 emitted pairs (34%) leak PRISM-process boilerplate (`[MAIN]`/`[SCOPE]/U-ID:`) directly into the training data, the exact noise the function exists to remove. The test suite passes 11/11 only because every prefix fixture includes `(slot:x)`, so it pins the one shape the regex handles and never exercises the slot-less shape the live corpus is full of (an R9 intent-vs-behavior gap).

**findings:**

- **[P1]** `scripts/vault-lessons-to-lora-dataset.mjs:74` (`PREFIX_RE`) -- The pattern hard-requires `\(slot:[a-z]+\):` to match, so any learning whose Body prefix is `[MAIN] [SCOPE-MS0]/U-ID: <text>` with NO slot segment is left unstripped. Verified live: 53/157 emitted pairs (34%) contain `[MAIN]`/`[MAIN-FORCE]`/`/U-ID:` boilerplate in input or output; the corpus has 971 slot-less-prefix learnings driving this. This is process-noise the model would learn as signal -- the precise R12 quality breach the function's docstring promises to prevent. **Fix:** make the `(slot:...)` group optional and tolerant 
... [+2286 chars truncated]
