---
type: "chat-session"
source: "claude-code-cli"
session_id: "58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d"
title: "Review a new PRISM xray unit U-XRAY-READING-KNOWLEDGE that ties tribal + ASME Y1"
date: "2026-06-23"
first_ts: "2026-06-23T16:30:59.695Z"
last_ts: "2026-06-23T16:32:44.544Z"
cwd: "H:\\prism"
messages: 42
user_msgs: 17
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d/subagents/agent-a0afc860fa0edb551.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Review a new PRISM xray unit U-XRAY-READING-KNOWLEDGE that ties tribal + ASME Y1

> **claude-code-cli** | 2026-06-23 | 42 msgs (17 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d/subagents/agent-a0afc860fa0edb551.jsonl`

## Transcript

### User | 2026-06-23T16:30:59.695Z

Review a new PRISM xray unit U-XRAY-READING-KNOWLEDGE that ties tribal + ASME Y14.5 knowledge into the live blueprint VLM-extraction prompt. Read END-TO-END:

1. H:\prism\scripts\lib\blueprint-reading-knowledge.mjs (the curated bundle + selector -- the core).
2. H:\prism\scripts\lib\blueprint-reading-knowledge.test.mjs (13 tests, all pass).

Verify with file:line citations:
- PROVENANCE ACCURACY (critical, anti-fabrication): each READING_GUIDANCE entry's `text` must be faithfully distilled from its cited `source`. The real sources are the tribal tips at knowledge/wiki/code-tribal/blueprint-dim-{diameter,radius,linear,thread-callout,surface-finish,material-callout,gdt-runout,gdt-profile,gdt-positional}.md + blueprint-ocr-operator-wisdom.md (each has an "## Extraction guidance" line) and ASME Y14.5-2018 doctrine. Spot-check 4-5 entries against the actual tribal files -- flag ANY entry whose text misstates its source or asserts a fact not in the source (e.g. a wrong GD&T rule, a fabricated convention). This is a manufacturing-correctness check: a wrong reading rule injected into the VLM prompt would teach the reader wrong.
- BOUNDEDNESS: selectReadingGuidanceEntries must be hard-bounded by maxItems AND maxChars, and must never drop the FIRST (highest-priority) entry to the char cap. Confirm the cap logic at the loop is correct (no off-by-one that lets the block exceed the budget unboundedly; the first-entry-always-kept invariant).
- SELECTION CORRECTNESS: `always` entries always considered; `kinds` matched against tokenized partClass+targetKinds; priority ordering stable; dedup by id.
- Does the bundle DUPLICATE rules already in buildVisionPrompt (FCF read-order, form-vs-datum, stepped-bore, lead-in chamfer, anti-hallucination)? It is supposed to be purely ADDITIVE -- flag any entry that merely repeats a base-prompt rule (wasted prompt budget).
- Edge safety: tokenize(null), empty bundle, maxItems<=0 / maxChars<=0 fallbacks.

Grade PASS or FAIL with P0/P1/P2 and exact 
... [+20 chars truncated]

### Assistant | 2026-06-23T16:31:06.383Z

I'll review the new xray unit end-to-end. Let me start by reading the core files and their tribal sources in parallel.

### Assistant | 2026-06-23T16:31:06.886Z

[tool_use: Read]

### Assistant | 2026-06-23T16:31:07.244Z

[tool_use: Read]

### User | 2026-06-23T16:31:09.117Z

[tool_result] 1	// scripts/lib/blueprint-reading-knowledge.mjs
2	//
3	// U-XRAY-READING-KNOWLEDGE -- ties PRISM knowledge substrates (GD&T / ASME Y14.5, shop-floor tribal
4	// callout-reading wisdom, customer conventions) INTO the live VLM extraction prompt as a BOUNDED,
5	// curated "reading guidance" block.
6	//
7	// Why a CURATED bundle, not a raw-corpus dump (R7 -- surface the conflict, do not average):
8	/
... [+9305 chars truncated]

### User | 2026-06-23T16:31:09.392Z

[tool_result] 1	// scripts/lib/blueprint-reading-knowledge.test.mjs
2	//
3	// U-XRAY-READING-KNOWLEDGE -- reference-value + invariant tests for the curated reading-knowledge bundle
4	// and its integration into the live VLM prompt. The load-bearing property is BOUNDEDNESS (no prompt
5	// bloat) + BYTE-IDENTICAL base prompt when no guidance is injected (zero regression on the proven path).
6	// Run: node scripts
... [+7649 chars truncated]

### Assistant | 2026-06-23T16:31:12.579Z

Now let me verify provenance by reading the actual tribal source files, and check the base prompt for duplication. Let me find and read the tribal files plus `buildVisionPrompt`.

### Assistant | 2026-06-23T16:31:14.008Z

[tool_use: Bash]

### Assistant | 2026-06-23T16:31:15.290Z

[tool_use: Grep]

### User | 2026-06-23T16:31:17.140Z

[tool_result] -rw-r--r-- 1 wompu 197611 1246 May 21 15:09 H:/prism/knowledge/wiki/code-tribal/blueprint-dim-diameter.md
-rw-r--r-- 1 wompu 197611 1283 May 21 15:09 H:/prism/knowledge/wiki/code-tribal/blueprint-dim-gdt-positional.md
-rw-r--r-- 1 wompu 197611 1258 May 21 15:09 H:/prism/knowledge/wiki/code-tribal/blueprint-dim-gdt-profile.md
-rw-r--r-- 1 wompu 197611 1271 May 21 15:09 H:/prism/knowledge/wiki/code-
... [+898 chars truncated]

### User | 2026-06-23T16:31:17.375Z

[tool_result] knowledge\wiki\code-tribal\blueprint-dim-diameter.md:16:## Extraction guidance
H:\prism\knowledge\wiki\code-tribal\blueprint-dim-diameter.md-17-
H:\prism\knowledge\wiki\code-tribal\blueprint-dim-diameter.md-18-`Ø` or `DIA` prefix. Limit-pair common. Cross-check with the section view to confirm cylinder direction.
H:\prism\knowledge\wiki\code-tribal\blueprint-dim-diameter.md-19-
--
knowledge\wiki\c
... [+3935 chars truncated]

### Assistant | 2026-06-23T16:31:22.886Z

I have the tribal source guidance lines. Now there's a critical provenance discrepancy to verify on the GD&T modifier entry. The bundle's `gdt-modifier-meaning` (line 51-52) cites `asme-y14.5` and says "circled L (LMC), or absent (RFS)". The positional tribal file (line 18) says "F = RFS-equivalent in Y14.5-2018". Let me read the runout, profile, and one more tribal file in full plus the base prompt's GD&T rules.

### Assistant | 2026-06-23T16:31:23.844Z

[tool_use: Read]

### Assistant | 2026-06-23T16:31:24.306Z

[tool_use: Read]

### Assistant | 2026-06-23T16:31:24.609Z

[tool_use: Read]

### User | 2026-06-23T16:31:25.197Z

[tool_result] 1	---
2	title: Blueprint pattern — gdt_runout
3	slug: blueprint-dim-gdt-runout
4	kind: code-tribal
5	status: shipped
6	date: 2026-05-21
7	milestone: PRINT-OCR-100PCT-MS0
8	unit: U4
9	generated: true
10	---
11	
12	# Reading `gdt_runout` regions on blueprints
13	
14	Observed in the corpus: **0 regions** across all customer families.
15	
16	## Extraction guidance
17	
18	Datum letter REQUIRED. Total r
... [+974 chars truncated]

### User | 2026-06-23T16:31:25.665Z

[tool_result] 1	---
2	title: Blueprint pattern — gdt_profile
3	slug: blueprint-dim-gdt-profile
4	kind: code-tribal
5	status: shipped
6	date: 2026-05-21
7	milestone: PRINT-OCR-100PCT-MS0
8	unit: U4
9	generated: true
10	---
11	
12	# Reading `gdt_profile` regions on blueprints
13	
14	Observed in the corpus: **0 regions** across all customer families.
15	
16	## Extraction guidance
17	
18	Bilateral / unilateral / un
... [+961 chars truncated]

### User | 2026-06-23T16:31:25.699Z

[tool_result] read-once-guard: 'H:\prism\knowledge\wiki\code-tribal\blueprint-ocr-operator-wisdom.md' was already read 10m ago in this session and is unchanged (mtime 1779587537054). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PR
... [+17 chars truncated]

### Assistant | 2026-06-23T16:31:30.370Z

The operator-wisdom file is referenced as already read but it isn't in my actual context window. Let me grep it for the specific claims the bundle makes (decimal comma, house GD&T, read-exactly), and read the base prompt to check duplication.

### Assistant | 2026-06-23T16:31:31.938Z

[tool_use: Grep]

### User | 2026-06-23T16:31:33.408Z

[tool_result] 45:## Tip 4 — Customer convention varies; pre-classify before parsing (BlueprintExtractionRAGEngine.matchFamily)
47:ALCOA aerospace prints use European decimal-comma in some callouts. ITW prints stack tolerances differently than Continental Midland. JM-Die-internal prints use shop-house GD&T abbreviations that don't appear in published standards.
64:- [[print-reading-long-tail-small-families]] — l
... [+34 chars truncated]

### Assistant | 2026-06-23T16:31:33.622Z

[tool_use: Grep]

### User | 2026-06-23T16:31:35.004Z

[tool_result] 13:// Unit handling (R5 — code does the deterministic transform, the VLM does not):
43:  "stepped_revolved_axis",
44:  "bevel_face_chamfer",
53:  "datum_relief",
58:  "linear", "diameter", "radius", "angular", "chamfer", "depth", "thread", "counterbore", "countersink",
66: * @param {string} partClass  part-class hint (e.g. "electrode", "die", "punch")
67: * @param {{targetKinds?:string[], wireEdm?
... [+5919 chars truncated]

### Assistant | 2026-06-23T16:31:40.094Z

I have what I need to verify the duplication and provenance concerns. Let me read the exact base-prompt lines around the GD&T / form-tolerance / FCF rules to assess whether the bundle's GD&T entries duplicate the base prompt, and confirm the positional tribal file's MMC/LMC/RFS wording.

### Assistant | 2026-06-23T16:31:41.459Z

[tool_use: Read]

### Assistant | 2026-06-23T16:31:41.934Z

[tool_use: Read]

### User | 2026-06-23T16:31:42.654Z

[tool_result] 100	    '      "datum_references": ["A","B"], "applied_to": "what feature",',
101	    '      "raw_text": "the feature control frame text", "confidence": 0.9 }',
102	    "  ],",
103	    '  "notes": [ { "category": "process|material|finish|tolerance|inspection|safety|assembly|general", "text": "the note text", "is_critical": false } ],',
104	    '  "profiles": [ { "name": "descriptive name", "type":
... [+4268 chars truncated]

### User | 2026-06-23T16:31:42.677Z

[tool_result] read-once-guard: 'H:\prism\knowledge\wiki\code-tribal\blueprint-dim-gdt-positional.md' was already read 11m ago in this session and is unchanged (mtime 1779394160798). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRI
... [+16 chars truncated]

### Assistant | 2026-06-23T16:31:47.606Z

I now have everything. The positional tribal content is already in my context from the earlier Grep (line 18: "`M` = MMC, `L` = LMC, `F` = RFS-equivalent in Y14.5-2018"). Let me do the final verification: run the test suite to confirm the 13 tests pass, and trace the consumer of `buildReadingGuidanceBlock` to verify it's actually wired (R15).

### Assistant | 2026-06-23T16:31:48.494Z

[tool_use: Bash]

### Assistant | 2026-06-23T16:31:49.617Z

[tool_use: Grep]

### User | 2026-06-23T16:31:50.121Z

[tool_result]   ...
# Subtest: buildVisionPrompt APPENDS the guidance block verbatim when supplied (opt-in)
ok 12 - buildVisionPrompt APPENDS the guidance block verbatim when supplied (opt-in)
  ---
  duration_ms: 0.0877
  ...
# Subtest: wireEdm + readingGuidance compose without disturbing the wireEdm block
ok 13 - wireEdm + readingGuidance compose without disturbing the wireEdm block
  ---
  duration_ms: 0.060
... [+111 chars truncated]

### User | 2026-06-23T16:31:52.473Z

[tool_result] Found 5 files
scripts\probe-vision-model.mjs
scripts\lib\vision-ensemble-fuse.mjs
scripts\lib\blueprint-reading-knowledge.test.mjs
scripts\lib\ollama-vision-extract-lib.mjs
scripts\lib\blueprint-reading-knowledge.mjs

### Assistant | 2026-06-23T16:31:55.667Z

13/13 pass. Let me verify the wiring claim — whether `vision-ensemble-fuse.mjs` (the live extraction path) actually CALLS `buildReadingGuidanceBlock`, or whether the bundle is an orphan that's only consumed by its own test.

### Assistant | 2026-06-23T16:31:57.548Z

[tool_use: Grep]

### Assistant | 2026-06-23T16:31:58.312Z

[tool_use: Grep]

### User | 2026-06-23T16:32:00.751Z

[tool_result] 51-  parseVisionResponse,
52-} from "./ollama-vision-extract-lib.mjs";
53:import { buildReadingGuidanceBlock } from "./blueprint-reading-knowledge.mjs";
54-
55-// Per-dimension confidence used when a model omits one (parseVisionResponse can yield
--
488- * }} a
489- *   injectReadingGuidance: OPT-IN (default off). When true, appends the curated tribal + ASME Y14.5
490: *   reading-guidance block (
... [+842 chars truncated]

### User | 2026-06-23T16:32:01.076Z

[tool_result] 49:  buildVisionPrompt,
501:  // buildVisionPrompt is byte-identical to the proven prompt (zero regression on the live path).
502:  const readingGuidance = a.injectReadingGuidance
505:  const prompt = buildVisionPrompt(a.partClass || "generic", { wireEdm: !!a.wireEdm, readingGuidance });

### Assistant | 2026-06-23T16:32:04.762Z

I notice line 503 calls `buildReadingGuidanceBlock` with `partClass` and `wireEdm` but does NOT pass `targetKinds`. Let me confirm whether the live ensemble path ever passes `targetKinds` and check the line-500 comment for a stray backslash that looks like a typo.

### Assistant | 2026-06-23T16:32:05.332Z

[tool_use: Read]

### User | 2026-06-23T16:32:06.737Z

[tool_result] 480	 * Impure: OCR one already-base64'd image with a SPECIFIC model via Ollama, async. Returns
481	 * the parsed extraction or {error}. Never throws. Reuses the prompt/request/parse core.
482	 *
483	 * @param {{
484	 *   imageBase64:string, model:string, workDir?:string, tag?:(string|number),
485	 *   partClass?:string, wireEdm?:boolean, assumeUnits?:string,
486	 *   ollamaUrl?:string, maxTimeSec?
... [+1786 chars truncated]

### Assistant | 2026-06-23T16:32:44.544Z

I have everything needed for a complete verdict. Let me compile findings with exact citations.

## Verdict

**VERDICT: PASS**

**summary:** The bundle is faithfully distilled from its cited tribal sources, the selector is correctly hard-bounded by both `maxItems` and `maxChars` with a proven first-entry-always-kept invariant, selection/dedup/ordering are correct, and it is genuinely wired into the live ensemble path (`vision-ensemble-fuse.mjs:503`, opt-in, default-off byte-identical). One P2 provenance-precision nit and one P2 dead-parameter nit; nothing that teaches the VLM a wrong reading rule.

**findings:**

- **[P2] `blueprint-reading-knowledge.mjs:51-52` (`gdt-modifier-meaning`) — provenance precision, NOT an error.** The entry is `source: "asme-y14.5"` and says "circled M (MMC), circled L (LMC), or absent (RFS)". This is correct ASME Y14.5 doctrine and matches the base prompt's own wording (`ollama-vision-extract-lib.mjs:114`: "circled M = MMC, a circled L = LMC, none = RFS"). Note the corpus tribal file `blueprint-dim-gdt-positional.md:18` instead documents the Y14.5-**2018** change where an explicit circled **F** denotes RFS ("`F` = RFS-equivalent in Y14.5-2018"). The bundle entry cites `asme-y14.5` (not the positional tribal), so it is not misstating its cited source — but it omits the 2018 circled-F convention that the corpus tribal flags. Since this is sourced to the standard generically and the "absent = RFS" rule remains valid, it is not a fabrication. Optional: add the circled-F note for completeness. No fix required.

- **[P2] `vision-ensemble-fuse.mjs:503` — `targetKinds` never passed from the live path.** `buildReadingGuidanceBlock({ partClass, wireEdm })` is the ONLY production caller and it omits `targetKinds`. Consequence: on the live path, kind-matching reduces to `partClass` tokens + the `wireEdm`→`profile` bias only; the per-callout-type entries (`read-diameter`, `read-thread`, etc.) fire solely when their token happens to appear in `partClas
... [+4636 chars truncated]
