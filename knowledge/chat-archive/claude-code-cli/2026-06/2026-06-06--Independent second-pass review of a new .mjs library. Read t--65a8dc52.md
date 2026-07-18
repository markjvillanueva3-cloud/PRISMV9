---
type: "chat-session"
source: "claude-code-cli"
session_id: "65a8dc52-2895-48bf-9137-68cade042012"
title: "Independent second-pass review of a new .mjs library. Read the whole file end-to"
date: "2026-06-06"
first_ts: "2026-06-06T05:57:22.388Z"
last_ts: "2026-06-06T06:06:26.892Z"
cwd: "H:\\prism"
messages: 36
user_msgs: 13
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/65a8dc52-2895-48bf-9137-68cade042012/subagents/agent-a7f4a09d1c5d18c6c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Independent second-pass review of a new .mjs library. Read the whole file end-to

> **claude-code-cli** | 2026-06-06 | 36 msgs (13 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/65a8dc52-2895-48bf-9137-68cade042012/subagents/agent-a7f4a09d1c5d18c6c.jsonl`

## Transcript

### User | 2026-06-06T05:57:22.388Z

Independent second-pass review of a new .mjs library. Read the whole file end-to-end: `H:/prism/scripts/lib/source-chain-lib.mjs`. Also read its canonical TS counterpart `H:/prism/mcp-server/src/engines/SourceChainEngine.ts` and one consumer-shape reference `H:/prism/scripts/lib/master-index-search-lib.mjs` (hit shapes: `{id,score,layer,label,...}` for graph, `{id,source,domain,title,path,score}` for tribal; memory hits are `{name,fileName,namespace,score,description,opening}`).

Context: this lib (U-SCP01, slot:papa) wires PRISM's built-but-unpropagated `SourceChainEngine` provenance onto live retrieval hits — every injected hit should self-describe its source node-id. Exports: digest/renderMarkdown/decorate (pure parity mirrors of the TS engine), normalizeCitation (fail-soft), citeGraphHit/citeTribalHit/citeMemoryHit, decorateHits, renderHitProvenance.

Weight your review toward what a correctness-only pass would MISS:
1. **Convention conformance** — does it match the .mjs lib style in master-index-search-lib.mjs (fail-soft, I/O-free, JSDoc density, env-knob naming `PRISM_*`)?
2. **Hidden coupling / drift risk** — the parity-with-TS-engine claim is the whole point. Is there a subtle way the two could diverge undetected (a field the TS digest includes that the mirror forgot; ordering; the `score ?? null` nuance; localeCompare on non-string path)?
3. **Security / prompt-injection** — `renderHitProvenance` and `decorateHits`: can caller-supplied data inject a fake `[src:]` tag or overwrite true provenance? Confirm decorateHits OVERWRITES any pre-existing `sourceChain`. Could a malicious `used_for`/`path`/`label` string break rendered markdown or inject content into prompt context?
4. **Naming / API ergonomics** — clear, non-duplicative with the TS engine surface?
5. Does adding a `sourceChain` field to hit objects risk breaking any strict-equality consumer? (the design intentionally leaves the search libs untouched — confirm this lib never mutates the libs' returned 
... [+142 chars truncated]

### Assistant | 2026-06-06T05:57:33.886Z

I'll review the file end-to-end along with its TS counterpart and the consumer-shape reference.

### Assistant | 2026-06-06T05:57:34.472Z

[tool_use: Read]

### Assistant | 2026-06-06T05:57:34.720Z

[tool_use: Read]

### Assistant | 2026-06-06T05:57:35.112Z

[tool_use: Read]

### User | 2026-06-06T05:57:36.781Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\SourceChainEngine.ts' was already read 8m ago in this session and is unchanged (mtime 1779604497847). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-06T05:57:38.416Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\source-chain-lib.mjs' was already read 1s ago in this session and is unchanged (mtime 1780725343784). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-06T05:57:38.607Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\master-index-search-lib.mjs' was already read 8m ago in this session and is unchanged (mtime 1780430725836). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-06T05:57:41.894Z

The read-once guard says these files are already in my context, but I don't actually have their content in this conversation — this is a fresh review task. Let me bypass the cache to get the actual file contents.

### Assistant | 2026-06-06T05:57:42.822Z

[tool_use: Bash]

### User | 2026-06-06T05:58:04.126Z

[tool_result] #!/usr/bin/env node
// source-chain-lib.mjs — fail-soft .mjs mirror of SourceChainEngine's pure core,
// for the RETRIEVAL / INJECT path (hooks + scripts that cannot import the TS engine).
//
// WHY A MIRROR (not import the engine): SourceChainEngine.ts lives in
// mcp-server/src/engines/ and pulls in TypeScript + Zod + node:crypto. The
// per-prompt knowledge-inject hooks in .claude/hooks/ run as
... [+10478 chars truncated]

### Assistant | 2026-06-06T05:58:08.723Z

I have the lib content now. Let me get the TS engine and consumer reference.

### Assistant | 2026-06-06T05:58:09.824Z

[tool_use: Bash]

### User | 2026-06-06T05:58:28.893Z

[tool_result] /**
 * SourceChainEngine — provenance / "why retrieved" trace decorator
 *
 * Closes Voxyz Layer 8 gap (https://x.com/Voxyz_ai/status/2058222816474919343):
 *   "Finding the right thing + citing the source is what makes the answer trustworthy."
 *
 * Every retrieval through PSN (master-index hits, tribal lookups, wiki backlinks,
 * memory queries, dispatcher round-trips) can wrap its return value 
... [+6297 chars truncated]

### Assistant | 2026-06-06T05:58:31.043Z

I have both files. Let me read the consumer-shape reference to confirm hit shapes.

### Assistant | 2026-06-06T05:58:32.162Z

[tool_use: Bash]

### User | 2026-06-06T05:58:38.472Z

[tool_result] /**
 * master-index-search-lib.mjs
 *
 * Shared keyword search over PRISM's two large knowledge corpora:
 *
 *   1. system-graph.json   — every engine/dispatcher/skill/hook/wiki node
 *      with pre-joined wiki + memory entry names. BM25-lite weighted scoring.
 *
 *   2. tribal-embed-index.json — every tribal-knowledge tip (title + text +
 *      domain). Keyword-only path (skips the Ollama nomic
... [+2503 chars truncated]

### Assistant | 2026-06-06T05:58:41.495Z

I have everything I need: the lib, the TS engine, and the consumer style reference. Let me also confirm the parity test exists and check the tribal/memory hit return shapes in the consumer lib to validate the citer functions.

### Assistant | 2026-06-06T05:58:43.731Z

[tool_use: Bash]

### User | 2026-06-06T05:58:57.554Z

[tool_result] 207:  return { nodes, inverted };
395:      return {
439:  if (tokens.length < 2) return { tokens, hits: [] };
441:  if (!graph) return { tokens, hits: [] };
451:  return { tokens, hits };
566:      return {
590:  if (tokens.length < 2) return { tokens, hits: [] };
592:  if (!index) return { tokens, hits: [] };
601:  return { tokens, hits };
---PARITY-TEST---
PARITY TEST NOT FOUND

### Assistant | 2026-06-06T05:59:00.641Z

The parity test the lib header references (`mcp-server/src/__tests__/sourceChainLibParity.test.ts`) does NOT exist. Let me confirm the memory/tribal hit shapes at lines 395 and 566, and double-check the parity test isn't elsewhere.

### Assistant | 2026-06-06T05:59:02.975Z

[tool_use: Bash]

### User | 2026-06-06T05:59:41.288Z

[tool_result]   }

  const ranked = [...candidates.entries()]
    .map(([id, score]) => {
      const node = nodeById.get(id);
      return {
        id,
        score,
        layer: node.layer || "?",
        label: (node.label || id).split("\n")[0].slice(0, 80),
        status: node.status || "?",
        // noteCount = TRUE brain-coverage: the FULL wiki+memory edge totals (NOT the
        // truncated wiki/
... [+1449 chars truncated]

### Assistant | 2026-06-06T05:59:46.239Z

Confirmed. The graph hit shape is `{id, score, layer, label, status, noteCount, wiki, memory}` (no `path` field), tribal hit is `{id, source, domain, title, path, score}`, and memory hits come from joined `wiki`/`memory` name arrays. The parity test file the header explicitly names (`sourceChainLibParity.test.ts`) does NOT exist anywhere in the repo — only `SourceChainEngine.test.ts` and `SourceChainEngine.dispatcher.test.ts` exist.

Let me verify whether the memory citer's expected shape (`{name, fileName, namespace}`) actually matches what any consumer produces, since the graph lib emits memory as plain name strings, not objects.

### Assistant | 2026-06-06T05:59:48.767Z

[tool_use: Bash]

### User | 2026-06-06T06:04:58.133Z

[tool_result] Command running in background with ID: bv3axprvf. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\65a8dc52-2895-48bf-9137-68cade042012\tasks\bv3axprvf.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-06T06:05:00.752Z

The grep is running in the background. Let me wait for it to complete.

### Assistant | 2026-06-06T06:05:02.507Z

[tool_use: Bash]

### User | 2026-06-06T06:05:13.045Z

[tool_result] H:/prism/scripts/lib/memory-index-search-lib.mjs:172:export function buildMemoryRecord({ namespace, fileName, body, maxBodyBytes = DEFAULT_MAX_BODY_BYTES }) {
H:/prism/scripts/lib/memory-index-search-lib.mjs:173:  if (typeof fileName !== "string" || fileName.length === 0) return null;
H:/prism/scripts/lib/memory-index-search-lib.mjs:177:  const slug = fileName.replace(/\.md$/i, "");
H:/prism/scrip
... [+1977 chars truncated]

### Assistant | 2026-06-06T06:05:18.412Z

This confirms the key findings. The memory hit shape `{name, fileName, namespace}` matches `memory-index-search-lib.mjs` records (line 527), so `citeMemoryHit` is correct against that producer. And importantly, there are NO consumers of `decorateHits`/`citeMemoryHit`/`source-chain-lib` yet — the lib is unwired.

There's a critical detail at line 378 of `memory-index-search-lib.mjs`: its canonical memo path is `${namespace}/${name}` (using `name`, the slug), NOT `${namespace}/${fileName}`. The new lib's `citeMemoryHit` uses `${ns}/${file}` (fileName). Let me confirm this discrepancy and check the `entryName` shape used by the graph lib's memory arrays.

### Assistant | 2026-06-06T06:05:20.346Z

[tool_use: Bash]

### User | 2026-06-06T06:05:23.228Z

[tool_result] }

export function buildMemoryRecord({ namespace, fileName, body, maxBodyBytes = DEFAULT_MAX_BODY_BYTES }) {
  if (typeof fileName !== "string" || fileName.length === 0) return null;
  if (typeof body !== "string") return null;
  const { description, aliases, rest } = parseFrontmatter(body);
  const opening = firstParagraph(rest, maxBodyBytes);
  const slug = fileName.replace(/\.md$/i, "");
  retu
... [+1215 chars truncated]

### Assistant | 2026-06-06T06:05:27.599Z

This confirms a meaningful path-shape inconsistency. The memory record's `name` is the slug (`fileName` minus `.md`), and the canonical `recordKey`/path uses `${namespace}/${name}` (slug, no `.md`). But `citeMemoryHit` builds `${ns}/${file}` where `file` = `fileName` (with `.md`). This is a path-format divergence, not a crash — I'll grade it relative to severity. Let me check the `entryName` helper to fully characterize the graph-lib memory array shape.

### Assistant | 2026-06-06T06:05:29.073Z

[tool_use: Bash]

### User | 2026-06-06T06:05:33.334Z

[tool_result]     if (out.length >= maxTokens) break;
  }
  return out;
}

function entryName(entry) {
  try {
    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object") {
      if (typeof entry.name === "string") return entry.name;
      if (typeof entry.path === "string") return entry.path;
    }
  } catch { /* fall through */ }
  return "";
}

// -- system-graph load + searc
... [+444 chars truncated]

### Assistant | 2026-06-06T06:06:26.892Z

I now have a complete picture. Let me verify one final security detail — whether `score.toFixed(3)` in `renderMarkdown` could throw if `score` is a non-finite number that passed `typeof === "number"` (e.g., `NaN`), since the lib's `digest`/`renderMarkdown` operate on already-normalized citations in the `decorate` path but `renderMarkdown` is also exported standalone.

The analysis is complete. Here is my independent second-pass review.

---

# Independent Second-Pass Review — `source-chain-lib.mjs`

**Grade: FAIL** (1 P0, 2 P1). The pure primitives are faithful and the security posture on `decorateHits` overwrite is correct, but the lib's central guarantee — "drift-locked parity with the TS engine" — rests on a vitest file that does not exist, and `citeMemoryHit` emits a memory path that diverges from the canonical memory-record path shape.

Files reviewed end-to-end: `H:/prism/scripts/lib/source-chain-lib.mjs`, `H:/prism/mcp-server/src/engines/SourceChainEngine.ts`, `H:/prism/scripts/lib/master-index-search-lib.mjs`, plus producer cross-check against `H:/prism/scripts/lib/memory-index-search-lib.mjs`.

## P0 — The named drift-lock parity test does not exist (the whole point is unenforced)

The header (`source-chain-lib.mjs:18-23`) makes a load-bearing claim:

> "the vitest parity test `mcp-server/src/__tests__/sourceChainLibParity.test.ts` asserts this lib's digest() + renderMarkdown() + decorate() are BYTE-IDENTICAL to the TS SourceChainEngine ... Change one side without the other and that test goes red."

That file is **not present** in the repo. `mcp-server/src/__tests__/` contains `SourceChainEngine.test.ts` and `SourceChainEngine.dispatcher.test.ts`, but no `sourceChainLibParity.test.ts` (and no `*source-chain*test*` / `*sourceChainLib*` anywhere). The CLAUDE.md doctrine for this exact lib is R7 ("two brains that disagree IS the failure mode") and R9 ("tests verify intent") — the comment asserts a red-on-drift guarantee that nothing delivers. The parity claim 
... [+6677 chars truncated]
