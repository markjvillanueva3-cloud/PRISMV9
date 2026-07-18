---
type: "chat-session"
source: "claude-code-cli"
session_id: "a30723cc-3de1-4276-99a4-4ea33617eedb"
title: "Independent second-pass review of a change to `H:/prism/scripts/domain-corpus-to"
date: "2026-06-25"
first_ts: "2026-06-25T02:52:50.549Z"
last_ts: "2026-06-25T02:54:49.348Z"
cwd: "H:\\prism"
messages: 29
user_msgs: 11
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/a30723cc-3de1-4276-99a4-4ea33617eedb/subagents/agent-a9c08a2bb930cf17c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Independent second-pass review of a change to `H:/prism/scripts/domain-corpus-to

> **claude-code-cli** | 2026-06-25 | 29 msgs (11 user / 18 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a30723cc-3de1-4276-99a4-4ea33617eedb/subagents/agent-a9c08a2bb930cf17c.jsonl`

## Transcript

### User | 2026-06-25T02:52:50.549Z

Independent second-pass review of a change to `H:/prism/scripts/domain-corpus-to-lora-dataset.mjs` and its test `H:/prism/scripts/domain-corpus-to-lora-dataset.test.mjs` (slot:papa). Read BOTH files end-to-end. Do NOT assume a prior reviewer caught everything.

WHAT CHANGED: added reap-resumable streaming to the `--distill` path. New pure exported fns `parseCursorDoneSet` + `partitionByResumeCursor`; `main()` streams per-entry appends to outPath + a sibling `<outPath>.cursor.jsonl` cursor under `resume = write && (distill || --resume)`, truncating outPath only on a fresh (empty-cursor) run; the non-resume raw path is unchanged. 24 tests pass (4 new). Live-validated: a fresh limit-2 run streamed 2 rows + cursor=2; a resume limit-3 run reported "2 done in cursor, 63 to process", appended 5 more (7 total, no clobber), all rows valid jsonl.

WEIGHTED toward what arm A is unlikely to catch:
1. TEST INTEGRITY: do the 4 new tests actually FAIL if the logic is wrong (R9 intent, not toBeDefined stubs)? Specifically: does the torn-line test prove `c` is NOT registered? Does the partition test prove disjoint+total? Are there missing failure/adversarial cases (e.g. duplicate slug in cursor, a slug in cursor but not in rescued)?
2. INTEGRATION: outPath default is the CANONICAL `state/shared/lora/domain-knowledge-dataset.jsonl` consumed by assemble-fleet-lora-corpus.mjs after registration in build-fleet-training-corpus-inventory.mjs. Does a partial (reaped mid-regen) canonical file risk feeding a half-built dataset to the assembler? Is that acceptable transient state or a P1?
3. CONVENTION conformance: naming, comment density, idiom vs the rest of the file. Does the new code match the existing style?
4. HIDDEN COUPLING / inlined constants / security (path handling of `--out`, appendFileSync on attacker-influenced slug? slugs come from the overrides sidecar — trusted).
5. Did the `ts = new Date().toISOString()` introduce any non-determinism that breaks a test or a workflow contrac
... [+152 chars truncated]

### Assistant | 2026-06-25T02:52:53.917Z

I'll review both files end to end. Let me start by reading them.

### Assistant | 2026-06-25T02:52:54.380Z

[tool_use: Read]

### Assistant | 2026-06-25T02:52:54.841Z

[tool_use: Read]

### User | 2026-06-25T02:52:55.221Z

[tool_result] read-once-guard: 'H:\prism\scripts\domain-corpus-to-lora-dataset.mjs' was already read 6s ago in this session and is unchanged (mtime 1782355285110). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-25T02:52:57.661Z

[tool_result] 1	// Tests for domain-corpus-to-lora-dataset.mjs pure functions + injectable pdftotext.
2	// Real reference-value + invariant assertions, no toBeDefined stubs (R9). (slot:papa 2026-06-24)
3	import { test } from "node:test";
4	import assert from "node:assert/strict";
5	import {
6	  loadRescued, isUsableText, cleanText, synthInstruction, toAlpacaPairs, pdfToText,
7	  distillPrompt, parseDistilled, d
... [+14776 chars truncated]

### Assistant | 2026-06-25T02:53:03.127Z

The main file was already read this session. Let me view it from my context. Since the read-once guard says it's in my context, let me check — I need to actually see the main file. Let me grep for the key functions and the `main()` streaming logic to verify against the test file.

### Assistant | 2026-06-25T02:53:03.224Z

[tool_use: Read]

### User | 2026-06-25T02:53:05.593Z

[tool_result] read-once-guard: 'H:\prism\scripts\domain-corpus-to-lora-dataset.mjs' was already read 15s ago in this session and is unchanged (mtime 1782355285110). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-25T02:53:08.603Z

The guard claims the file is in my context, but it isn't actually present in this conversation. I'll disable the cache to read it, since I genuinely need the source.

### Assistant | 2026-06-25T02:53:09.763Z

[tool_use: Bash]

### User | 2026-06-25T02:53:17.753Z

[tool_result] #!/usr/bin/env node
/**
 * domain-corpus-to-lora-dataset.mjs  (slot:papa 2026-06-24)
 *
 * THE MISSING PLUMBING: turn the rescued per-domain knowledge (the resource-pdf specs

### Assistant | 2026-06-25T02:53:22.059Z

The Read tool's cache guard is blocking, but the file content was never actually delivered to my context. I'll use the Read tool with an offset to bypass the unchanged-guard, or read via cat with line numbers. Let me get the full file with line numbers via Bash since the Read tool is stuck on the cache.

### Assistant | 2026-06-25T02:53:22.643Z

[tool_use: Bash]

### User | 2026-06-25T02:53:27.889Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * domain-corpus-to-lora-dataset.mjs  (slot:papa 2026-06-24)
     4	 *
     5	 * THE MISSING PLUMBING: turn the rescued per-domain knowledge (the resource-pdf specs
     6	 * that reclassify-domain-feeders-ollama.mjs lifted out of the keyword-unclassified
     7	 * residual) into ACTUAL LoRA training data.
     8	 *
     9	 * getDomainCorpus + the per-d
... [+18065 chars truncated]

### Assistant | 2026-06-25T02:53:32.035Z

I now have both files end to end. Let me verify a few integration claims by reading the consumers referenced in the task: `assemble-fleet-lora-corpus.mjs` and `build-fleet-training-corpus-inventory.mjs`, to assess the partial-canonical-file risk (point 2). Let me also confirm the test file's torn-line case actually parses as a torn line.

### Assistant | 2026-06-25T02:53:34.130Z

[tool_use: Bash]

### User | 2026-06-25T02:53:38.150Z

[tool_result] a-line: {"slug":"a","n":2,"ts":"t"}
torn THROWS (good): SyntaxError

### Assistant | 2026-06-25T02:53:42.565Z

Confirmed the torn line throws (the catch branch makes `c` not register). Now let me check the assembler and inventory consumers for the partial-file risk.

### Assistant | 2026-06-25T02:53:43.797Z

[tool_use: Bash]

### User | 2026-06-25T02:53:51.669Z

[tool_result] -rwxr-xr-x 1 wompu 197611 16554 Jun 18 14:25 H:/prism/scripts/assemble-fleet-lora-corpus.mjs*
-rwxr-xr-x 1 wompu 197611 21602 Jun 24 21:01 H:/prism/scripts/build-fleet-training-corpus-inventory.mjs*

### Assistant | 2026-06-25T02:53:56.226Z

[tool_use: Grep]

### Assistant | 2026-06-25T02:53:57.645Z

[tool_use: Grep]

### User | 2026-06-25T02:54:00.207Z

[tool_result] 25: * filter, never confusing advisory synthesis with verified doctrine.
90:export function loadInventory(p = INVENTORY_PATH, readImpl = fs.readFileSync) {
99:  return JSON.parse(raw);
105:  return sources.filter((s) => s && s.kind === "lora-training-jsonl" && s.status === "present");
144:  for (const line of String(text || "").split("\n")) {
148:    try { o = JSON.parse(t); } catch { invalid++; c
... [+443 chars truncated]

### User | 2026-06-25T02:54:01.116Z

[tool_result] 34:  kind: 'lora-training-jsonl',
49:    kind: 'lora-training-jsonl',
91:    kind: 'lora-training-jsonl',
97:  // Rescued resource-PDF domain knowledge -> LoRA. Producer: scripts/domain-corpus-to-lora-dataset.mjs.
102:    kind: 'lora-training-jsonl',
103:    path: 'H:/prism/state/shared/lora/domain-knowledge-dataset.jsonl',
104:    description: 'Rescued resource-PDF domain knowledge -> Alpaca pair
... [+695 chars truncated]

### Assistant | 2026-06-25T02:54:07.106Z

Now let me look at the assembler's per-line parsing (line 144-148) to confirm it tolerates a partial/torn file gracefully, which determines whether a reaped mid-regen canonical file is acceptable transient state or a P1.

### Assistant | 2026-06-25T02:54:07.941Z

[tool_use: Read]

### User | 2026-06-25T02:54:09.295Z

[tool_result] 138	  return row;
139	}
140	
141	export function parseAlpacaJsonl(text) {
142	  const rows = [];
143	  let invalid = 0;
144	  for (const line of String(text || "").split("\n")) {
145	    const t = line.trim();
146	    if (!t) continue;
147	    let o;
148	    try { o = JSON.parse(t); } catch { invalid++; continue; }
149	    const row = normalizeAlpacaRow(o);
150	    if (!row) { invalid++; continue;
... [+1055 chars truncated]

### Assistant | 2026-06-25T02:54:49.348Z

I have everything I need. The assembler `parseAlpacaJsonl` (lines 144-148) tolerates a torn line — each line is parsed independently, a torn final line throws and is counted as `invalid++` then skipped, and complete lines are still consumed. This is the key fact for assessing the partial-file risk.

Let me verify one more thing: whether the `--distill` streaming path writes per-pair lines such that a kill can only ever leave a torn LAST line (never a mid-file torn row), and confirm the `n:0` cursor-only-append case does NOT corrupt the cursor mid-line.

The streaming append at line 272 writes `emitted.map(JSON.stringify).join("\n") + "\n"` as a single `appendFileSync` call per entry. A reaper kill between the `appendFileSync(outPath, ...)` (line 272) and `appendFileSync(cursorPath, ...)` (line 273) is the interesting window. Let me reason through it: if outPath gets the rows but the cursor append never fires, then on resume the slug is NOT in doneSet, so it re-distills and re-appends — producing DUPLICATE rows in outPath. The assembler dedupes by `(instruction, output)` (line 156-157, `rowKey`), so duplicates are collapsed there. But within distill mode the instruction/answer is non-deterministic (Ollama temperature 0.2), so a re-distill could produce a slightly different pair that does NOT dedupe. That's a real edge case worth noting.

I now have enough to render a verdict.

---

VERDICT: PASS

summary: The streaming reap-resume logic is correct and well-tested; the two new pure functions (`parseCursorDoneSet`, `partitionByResumeCursor`) have real R9 intent-encoding tests that fail if the logic breaks (torn-line non-registration and disjoint+total partition are both genuinely asserted). The partial-canonical-file concern is mitigated downstream — the assembler parses jsonl line-by-line and counts torn/invalid lines as `invalid++` rather than failing the whole corpus. No P0/P1 found. Several P2 observations below, none blocking.

findings:
- [P2] `H:/prism/scripts/d
... [+5087 chars truncated]
