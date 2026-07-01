---
type: "chat-session"
source: "claude-code-cli"
session_id: "a803c8fa-8407-40f0-81d9-0a56f2031bb5"
title: "Read-only review (arm C — silent breakage / regression / integration coupling). "
date: "2026-06-18"
first_ts: "2026-06-18T14:49:14.225Z"
last_ts: "2026-06-18T14:50:09.975Z"
cwd: "H:\\prism-slot-india"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-a873c3150ddd26c12.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Read-only review (arm C — silent breakage / regression / integration coupling). 

> **claude-code-cli** | 2026-06-18 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-a873c3150ddd26c12.jsonl`

## Transcript

### User | 2026-06-18T14:49:14.225Z

Read-only review (arm C — silent breakage / regression / integration coupling). Grade PASS or FAIL with file:line citations.

CONTEXT: slot:india, NN-GRAPH tier-5 coverage work. I added an OPT-IN "SHARP" mode to ghost embedding text to reduce dispatcher-class crowding in the GNN wiring-inference classifier. It must be DEFAULT BYTE-IDENTICAL to the prior deployed behavior (the deployed classifier embeddings must NOT change unless PRISM_NNG_GHOST_SHARP=1 is explicitly set).

FILES (read end-to-end):
- H:/prism/scripts/build-node-embeddings.mjs  (impl: ghostEmbedText now takes a 3rd opts arg; new pure helpers tokenizeForIdf/buildIdfMap/salientLead; embedTextFor forwards opts; main() builds an IDF map + optsFor when GHOST_SHARP gated; new env consts GHOST_SHARP/GHOST_LEAD_K; a sharp stat line)
- H:/prism/scripts/build-node-embeddings.test.mjs (12 new tests for the helpers + sharp mode + byte-identical default)

VERIFY SPECIFICALLY:
1. DEFAULT BYTE-IDENTICAL: with no opts / opts.sharp falsy / opts.idf not a Map, ghostEmbedText returns EXACTLY the prior string ([kind,label,info,sig].join(" | ").slice(0,1600)). embedTextFor with no sharp opts must also be byte-identical. Any path where the default behavior silently changes = P0.
2. LEAK-FREE: the IDF salience must be computed from SOURCE text frequency only, never from the dispatcher label / proposed_wiring (which would leak the eval truth label). Confirm buildIdfMap's corpus in main() is (label + cleaned info + source signal), with proposed_wiring stripped.
3. SCOPE/HOIST: salientLead is referenced inside ghostEmbedText but declared after it — confirm function-declaration hoisting makes this safe (module scope). idfMap is `let` in main() and referenced in the stat line — confirm same-scope.
4. RESUME-HASH safety: embedResumeHash delegates to embedTextFor; confirm a sharp run's changed text changes the hash (no wrong skip), and a default run is unaffected.
5. Any NaN/edge cases in tokenizeForIdf/buildIdfMap/salientLead (em
... [+203 chars truncated]

### Assistant | 2026-06-18T14:49:18.505Z

I'll review the two files end-to-end, focusing on the default byte-identical path and leak-freedom.

### Assistant | 2026-06-18T14:49:18.942Z

[tool_use: Read]

### Assistant | 2026-06-18T14:49:19.152Z

[tool_use: Read]

### User | 2026-06-18T14:49:20.775Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-node-embeddings.mjs — NN-GRAPH-MS0/U-NNG-NODE-EMBED-INGEST
4	 *
5	 * Computes a 768-d nomic-embed-text semantic vector for every node in
6	 * state/shared/system-viz/system-graph-normalized.json (output of U1's
7	 * regen-graph-normalized.mjs). Writes int8-quantized vectors to
8	 * state/shared/system-viz/_node-embeddings.jsonl — the semantic feature
9	 * blo
... [+29023 chars truncated]

### User | 2026-06-18T14:49:20.829Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-node-embeddings.test.mjs — tests for NN-GRAPH-MS0/U-NNG-NODE-EMBED-INGEST
4	 * Run: node --test scripts/build-node-embeddings.test.mjs
5	 */
6	import { test, describe } from "node:test";
7	import assert from "node:assert/strict";
8	import {
9	  nodeEmbedText,
10	  nodeContentHash,
11	  embedTextFor,
12	  embedResumeHash,
13	  quantize,
14	  dequantize,
15	  p
... [+18143 chars truncated]

### Assistant | 2026-06-18T14:49:40.718Z

Both files read end-to-end. Let me verify each of the five concern axes precisely, tracing the default path byte-by-byte.

**Axis 1 — DEFAULT BYTE-IDENTICAL.**

The prior deployed `ghostEmbedText` (the GHOST_SOURCE-era path, cap 1600) returns `[kind, label, info, sig].filter(Boolean).join(" | ").slice(0, 1600)` (line 128). The new sharp branch is gated at line 122 by `opts && opts.sharp && opts.idf instanceof Map`. With:
- no `opts` → default param `opts = {}` → `opts.sharp` falsy → skip → line 128 (identical).
- `opts.sharp` truthy but `opts.idf` not a Map (`null`/`{}`) → `instanceof Map` false → skip → line 128 (identical).
- `opts.sharp` falsy with idf present → skip → line 128 (identical).

`embedTextFor` (line 268-269): default destructure `sharp = false, idf = null` forwards `{ sharp:false, idf:null, leadK:undefined }` into `ghostEmbedText`'s 3rd arg → falsy sharp → line 128. Byte-identical confirmed. The test at line 364-375 locks all three guarded paths and the `embedTextFor` forwarding default. PASS.

**Axis 2 — LEAK-FREE.** The `main()` corpus (line 463-468) is built from `n.label`, `info` with `proposed wiring:[^]*$` stripped (line 465), and `sourceSignalById.get(n.id)` — never `proposed_wiring` and never the dispatcher label. `sourceSignalById` is `engineSourceSignal` output, which strips `prism_*` tokens (line 175). `buildIdfMap` computes document-frequency over that corpus only. The sharp lead at line 123 tokenizes `[label, info, sig]` — same already-stripped fields, no `kind`, no `proposed_wiring`. No leak introduced. PASS.

**Axis 3 — SCOPE/HOIST.** `salientLead` is a `function` declaration (line 220) at module scope, referenced inside `ghostEmbedText` at line 123. Function declarations hoist to the top of their containing scope (module), so the forward reference is safe — and `ghostEmbedText` is only ever *called*, not evaluated, after module load completes. `idfMap` is `let` at line 462 inside `main()`, referenced in the stat line at line 561 (same
... [+1189 chars truncated]

### Assistant | 2026-06-18T14:49:41.902Z

[tool_use: Grep]

### User | 2026-06-18T14:49:43.565Z

[tool_result] H:\prism\scripts\build-node-embeddings.test.mjs:3: * build-node-embeddings.test.mjs — tests for NN-GRAPH-MS0/U-NNG-NODE-EMBED-INGEST
H:\prism\scripts\build-node-embeddings.test.mjs:4: * Run: node --test scripts/build-node-embeddings.test.mjs
H:\prism\scripts\build-node-embeddings.test.mjs:11:  embedTextFor,
H:\prism\scripts\build-node-embeddings.test.mjs:12:  embedResumeHash,
H:\prism\scripts\buil
... [+8796 chars truncated]

### Assistant | 2026-06-18T14:50:09.975Z

The blast radius is clean. The only external invokers of `build-node-embeddings.mjs` are CLI spawns (`measure-codebase-wired-refpool-auroc.mjs:201`, `nn-graph-retrain-lifecycle.mjs:322`) — both invoke it as a subprocess with `--ghosts-only`, never importing the symbols, and never pass `PRISM_NNG_GHOST_SHARP`, so they hit the default byte-identical path. No code imports `ghostEmbedText`/`embedTextFor`/`embedResumeHash` outside the test file. The lifecycle spawn at line 322 produces `GHOST_EMBED_PATH` consumed downstream by the GNN trainer; since SHARP is unset there, the deployed embeddings are unchanged. Confirmed no silent consumer drift.

One thing I want to double-check before finalizing: whether the resume cache could be silently invalidated when toggling SHARP on/off against an existing `_node-embeddings.jsonl`, since that is the classic silent-break this very file's history warns about (the `dcb2c86bb8` hashFor regression). Let me trace the resume key interaction precisely.

The resume key is `embedResumeHash(node, optsFor(node))` (line 472, 504). When SHARP flips on, `optsFor` carries `sharp:true, idf:<Map>` → the ghost text changes → the hash changes → the prior records do NOT match → they get re-embedded. That is *correct* behavior (you want the SHARP text re-embedded), not a silent skip. When SHARP is off, hash matches the deployed records → resume skips correctly. No wrong-skip in either direction. The history's regression was the opposite failure (delimiter omission causing a needless full re-embed of non-ghosts) and that is locked by test line 83-84.

I have verified all five axes against the actual code, plus the full external blast radius.

VERDICT: PASS

summary: The SHARP mode is correctly opt-in and the default path is provably byte-identical to the prior deployed `ghostEmbedText` — the new branch is gated on `opts && opts.sharp && opts.idf instanceof Map` (build-node-embeddings.mjs:122), and every non-sharp / non-Map / missing-opts path falls thro
... [+2229 chars truncated]
