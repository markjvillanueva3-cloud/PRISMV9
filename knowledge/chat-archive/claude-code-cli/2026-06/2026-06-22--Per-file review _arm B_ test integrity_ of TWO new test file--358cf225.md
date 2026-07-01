---
type: "chat-session"
source: "claude-code-cli"
session_id: "358cf225-d753-40b9-9ef5-8ea38cf462fa"
title: "Per-file review (arm B, test integrity) of TWO new test files added to complete "
date: "2026-06-22"
first_ts: "2026-06-22T14:23:48.664Z"
last_ts: "2026-06-22T14:25:08.909Z"
cwd: "H:\\prism"
messages: 35
user_msgs: 14
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/358cf225-d753-40b9-9ef5-8ea38cf462fa/subagents/agent-a3ce684247b6416ce.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Per-file review (arm B, test integrity) of TWO new test files added to complete 

> **claude-code-cli** | 2026-06-22 | 35 msgs (14 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/358cf225-d753-40b9-9ef5-8ea38cf462fa/subagents/agent-a3ce684247b6416ce.jsonl`

## Transcript

### User | 2026-06-22T14:23:48.664Z

Per-file review (arm B, test integrity) of TWO new test files added to complete U-VIZ-ROOST-BRIDGE-RESOLVE:
- `b68de29078`: `scripts/generate-jm-die-tribal-wiki-features.test.mjs` (`git -C H:/prism show b68de29078`)
- `75a3c8139e`: `scripts/generate-post-pdf-corpus-features.test.mjs` (`git -C H:/prism show 75a3c8139e`)

Each is a NEW test file (these generators had none). Both cover: back-compat (no resolver -> bare names), mock resolution (resolves one engine, drops an un-graphed one, asserts bridgesResolved/bridgesDropped), and a REAL-oracle integration case (production makeOracleResolver -> all emitted bridge edges are eng.* node-ids). The post-pdf test additionally asserts the cross-domain PEER edges (site 2) are untouched by the resolver.

Verify (R9):
1. Run both suites — `cd H:/prism && node scripts/generate-jm-die-tribal-wiki-features.test.mjs` and `node scripts/generate-post-pdf-corpus-features.test.mjs` (each 9/9, no .skip/.only).
2. Are assertions concrete (specific edge counts, specific resolved `to` values, specific stats)? Not toBeDefined stubs?
3. Would the "drops un-graphed engine" test FAIL if the generator did NOT drop unresolvable edges? Would the real-oracle test FAIL if the generator kept bare class names (which don't start with `eng.`)?
4. Are the fixtures faithful to each generator's input contract (tribal-wiki: items with {domain,filename,tags}; post-pdf: parsedCorpora {summary,chapters} + sources {slug,book,pdfPath,engines})? Do the mock resolvers model the real `resolve(ref, idSet)` contract (pass-through-if-in-set, else map, else null)?

FIRST line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines for P0/P1, then ≤4 notes.

### Assistant | 2026-06-22T14:23:51.342Z

I'll review the two new test files for test integrity, focusing on edge case coverage, fixture fidelity, and whether tests encode why the behavior matters (R9).

### Assistant | 2026-06-22T14:23:51.805Z

[tool_use: Read]

### Assistant | 2026-06-22T14:23:52.239Z

[tool_use: Read]

### User | 2026-06-22T14:23:53.949Z

[tool_result] 1	// Tests for generate-post-pdf-corpus-features.mjs (added with U-VIZ-ROOST-BRIDGE-RESOLVE-POSTPDF).
2	// Run direct: `node scripts/generate-post-pdf-corpus-features.test.mjs`.
3	import { describe, it } from "node:test";
4	import assert from "node:assert/strict";
5	import { generate, ROOST_ID, SCHEMA_VERSION, CROSS_DOMAIN_PEERS } from "./generate-post-pdf-corpus-features.mjs";
6	import { makeOrac
... [+3753 chars truncated]

### User | 2026-06-22T14:23:54.899Z

[tool_result] 1	// Tests for generate-jm-die-tribal-wiki-features.mjs (added with U-VIZ-ROOST-BRIDGE-RESOLVE-TRIBAL).
2	// Run direct: `node scripts/generate-jm-die-tribal-wiki-features.test.mjs`.
3	import { describe, it } from "node:test";
4	import assert from "node:assert/strict";
5	import { generate, ROOST_ID, SCHEMA_VERSION } from "./generate-jm-die-tribal-wiki-features.mjs";
6	import { makeOracleResolver }
... [+3124 chars truncated]

### Assistant | 2026-06-22T14:23:57.966Z

Now let me verify that both test suites run successfully and check the actual implementation contracts they're testing against.

### Assistant | 2026-06-22T14:23:58.642Z

[tool_use: Read]

### Assistant | 2026-06-22T14:23:59.117Z

[tool_use: Read]

### User | 2026-06-22T14:24:01.699Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-jm-die-tribal-wiki-features.mjs — system-viz augmentation for the
4	 * 80-PDF JM Die TRIBAL+WIKI consolidated corpus (1.1 GB).
5	 *
6	 * Operator directive 2026-05-26: "H:\PRISM\JM DIE\TRIBAL + WIKI — I
7	 * consolidated [the tribal+wiki PDFs] there".
8	 *
9	 * Reads the directory at regen time, classifies each PDF via the pure
10	 * scripts/lib/jm-die-tri
... [+3911 chars truncated]

### User | 2026-06-22T14:24:03.110Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-post-pdf-corpus-features.mjs — system-viz augmentation: post-processor-writing PDF corpus.
4	 *
5	 * Operator request 2026-05-26: "there's a pdf for post processor writing in
6	 * the resources folder. make a node for all data contained in it and link
7	 * and bridge it to the post processor nodes."
8	 *
9	 * The graph already had GHOST L10 placeholder nod
... [+4407 chars truncated]

### Assistant | 2026-06-22T14:24:05.358Z

Let me check the rest of the implementation and verify the resolver contract:

### Assistant | 2026-06-22T14:24:06.376Z

[tool_use: Read]

### Assistant | 2026-06-22T14:24:07.395Z

[tool_use: Read]

### Assistant | 2026-06-22T14:24:07.965Z

[tool_use: Read]

### User | 2026-06-22T14:24:08.052Z

[tool_result] 100	    }
101	
102	    const bridgeEngines = DOMAIN_TO_ENGINE_BRIDGES[domain] || [];
103	
104	    for (const pdf of group) {
105	      const pdfId = `${pivotId}.${safeSlug(pdf.filename.replace(/\.pdf$/i, ""))}`;
106	      if (ids.has(pdfId)) continue;
107	      const meta = [];
108	      if (pdf.vendor) meta.push(`vendor=${pdf.vendor}`);
109	      if (pdf.cam_system) meta.push(`cam=${pdf.cam_syste
... [+2521 chars truncated]

### User | 2026-06-22T14:24:09.206Z

[tool_result] 100	 * extractions for your domain"*).
101	 *
102	 * Each entry is a peer-shipped substrate node that our book pivots edge into:
103	 *  - cad-cam-resources-pdf-index   — kilo's 1008-PDF manifest (commit 67178f76d6).
104	 *                                    Our 2 PDFs are entries in his `domain:"training"`,
105	 *                                    software:"misc" bucket.
106	 *  - milling-pdf-co
... [+3060 chars truncated]

### User | 2026-06-22T14:24:10.015Z

[tool_result] 1	// class-name-node-resolver.mjs -- map a bare engine CLASS NAME ("MasterPostProcessorEngine") to its
2	// live graph node-id ("eng.cam.masterpostprocessorengine"). The reusable core of U-VIZ-ROOST-BRIDGE-
3	// RESOLVE: ghost-roost generators emit bridge edges to bare class names (the documented
4	// reference_orphan_augmentation_dangling_diagnosis_2026_06_10 bug); resolving them to node-ids befo
... [+3142 chars truncated]

### Assistant | 2026-06-22T14:24:12.625Z

Now let me verify the rest of the post-pdf generator to check the CROSS_DOMAIN_PEERS handling and complete the resolver contract:

### Assistant | 2026-06-22T14:24:13.551Z

[tool_use: Read]

### User | 2026-06-22T14:24:14.656Z

[tool_result] 179	/**
180	 * Pure: from a parsed corpus + source-metadata, build:
181	 *   newNodes: roost? + book pivot + chapter pivots
182	 *   newEdges: book-pivot → engine bridge edges (one per engine in `engines`)
183	 *
184	 * Caller passes the union of all parsed corpora so the roost is emitted once.
185	 */
186	export function generate(parsedCorpora, sources, existingNodeIds = [], resolver = null) {
18
... [+3963 chars truncated]

### Assistant | 2026-06-22T14:24:17.781Z

Let me see the rest of the peer-edges emission:

### Assistant | 2026-06-22T14:24:18.523Z

[tool_use: Read]

### User | 2026-06-22T14:24:23.991Z

[tool_result] 278	    //   - kilo's 1008-PDF resources manifest (cad-cam-resources-pdf-index) —
279	    //     this corpus is a SUBSET of kilo's index, classified as
280	    //     `domain:"training"`, software:"misc". Adds upward edge.
281	    //   - foxtrot's milling-pdf-cited-tips substrate + KnowledgeCurriculumBridgeEngine —
282	    //     cross-domain tip-citation pattern; post-processor tips will follow
2
... [+1289 chars truncated]

### Assistant | 2026-06-22T14:24:27.728Z

Perfect. Now let me run both test suites to verify they pass:

### Assistant | 2026-06-22T14:24:28.892Z

[tool_use: Glob]

### Assistant | 2026-06-22T14:24:29.073Z

[tool_use: Glob]

### User | 2026-06-22T14:24:31.200Z

[tool_result] scripts\generate-jm-die-tribal-wiki-features.test.mjs

### User | 2026-06-22T14:24:31.373Z

[tool_result] scripts\generate-post-pdf-corpus-features.test.mjs

### Assistant | 2026-06-22T14:24:34.302Z

Now let me verify the test execution and check for any .skip or .only markers:

### Assistant | 2026-06-22T14:24:35.705Z

[tool_use: Grep]

### Assistant | 2026-06-22T14:24:36.680Z

[tool_use: Grep]

### User | 2026-06-22T14:24:37.338Z

[tool_result] No matches found

### User | 2026-06-22T14:24:38.351Z

[tool_result] No matches found

### Assistant | 2026-06-22T14:25:08.909Z

Perfect. Now let me review my findings against the R9 test-integrity criteria:

**ANALYSIS:**

**File 1: `generate-jm-die-tribal-wiki-features.test.mjs` (9 tests)**
- Back-compat test (line 44-49): Fixture `items=[{domain,filename,tags}]`, asserts bare class names preserved, `bridgesResolved=0` ✓
- Mock resolver test (line 51-61): Creates mock resolver with `{idSet, resolve}` contract; asserts `edges.length=1` (3 dropped), specific node-id verified, `bridgesResolved=1, bridgesDropped=3` ✓
- Real oracle test (line 63-68): Calls `makeOracleResolver()`, asserts all edges start with `eng.`, `bridgesResolved>=1` ✓
- Fixture fidelity: Items match the classifier contract (domain/filename/tags); mock resolver follows exact contract signature from `class-name-node-resolver.mjs:48-52` ✓

**File 2: `generate-post-pdf-corpus-features.test.mjs` (9 tests)**
- Back-compat test (line 41-47): Fixture has `parsedCorpora=[{summary,chapters}]` + `sources=[{slug,book,pdfPath,engines}]`, asserts bare class names, `bridgesResolved=0` ✓
- Mock resolver test (line 49-59): Resolver drops the unmapped `FakeUngraphedXyzEngine`, asserts `bridges.length=1`, specific resolved id, `bridgesDropped=1` ✓
- Peer-edges test (line 61-68): Verifies CROSS_DOMAIN_PEERS edges are untouched by resolver (they already use node-ids), asserts count and identity preserved ✓
- Real oracle test (line 70-75): Calls `makeOracleResolver()`, asserts all bridge edges `eng.*`, `bridgesResolved>=1` ✓
- Fixture fidelity: `parsedCorpora` and `sources` match the function signature at line 186; mock resolver contract identical to tribal version ✓

**Test Integrity Checks (R9):**

1. **Concrete assertions, not stubs?** YES — all assertions specify exact counts (`edges.length=1`, `bridgesDropped=3`), exact node-id prefixes (`startsWith("eng.")`), exact stats keys. Zero `toBeDefined()` placeholders.

2. **Would "drops un-graphed" test FAIL if generator kept dangling edges?** YES — if the generator did NOT drop `FakeUngraphedXyzE
... [+2553 chars truncated]
