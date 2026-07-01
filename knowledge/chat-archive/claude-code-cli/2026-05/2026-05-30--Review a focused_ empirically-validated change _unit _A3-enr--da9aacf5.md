---
type: "chat-session"
source: "claude-code-cli"
session_id: "da9aacf5-7d0a-4de6-899e-d8a50c78583a"
title: "Review a focused, empirically-validated change (unit \"A3-enrichment\") in the PRI"
date: "2026-05-30"
first_ts: "2026-05-30T00:39:04.974Z"
last_ts: "2026-05-30T00:40:55.918Z"
cwd: "H:\\prism-slot-alpha"
messages: 19
user_msgs: 7
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/agent-a3da7cb23c3b0e105.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:35"
---

# Review a focused, empirically-validated change (unit "A3-enrichment") in the PRI

> **claude-code-cli** | 2026-05-30 | 19 msgs (7 user / 12 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/agent-a3da7cb23c3b0e105.jsonl`

## Transcript

### User | 2026-05-30T00:39:04.974Z

Review a focused, empirically-validated change (unit "A3-enrichment") in the PRISM repo. Read BOTH files end-to-end, focusing on the DELTA described below. Grade PASS/FAIL with P0/P1/P2 findings.

FILES:
1. H:/prism/scripts/build-memory-index-sidecar.mjs  (builder)
2. H:/prism/scripts/build-memory-index-sidecar.test.mjs  (tests)

THE DELTA: A prior unit (A3) indexed the 34 per-galaxy brains (`mcp-server/src/engines/<g>/MEMORY.md`) into the recall corpus but used only the H1 as description + the first paragraph as `opening`. The cascade-index stub brains (lathe/wedm/speed-feed) share a VERBATIM boilerplate header ("# X Galaxy MEMORY.md — per-domain memory cascade index" + a "## Master-brain link" block with UP/DOWN/Last-master-sync bullets), so they had near-identical, domain-blind indexed text and ranked >200 on domain queries. This enrichment adds:
- a new exported pure `extractGalaxyDomainText(body, {maxChars=700})` that harvests the brain's DOMAIN text (H2/H3 heading texts, the "Filename heuristic: lathe, turning, css, g96…" line, fenced domain rules), SKIPPING: the H1 (kept as description), code-fence markers + `---` rules, and the shared cascade-template boilerplate (matched by `GALAXY_BOILERPLATE_RE`).
- wiring it into `collectGalaxyBrains`: the galaxy record's `opening` is now `extractGalaxyDomainText(body) || fallback`. `buildEmbedDocText` = name+description+opening, so this enriches BOTH the BM25 opening field and the dense embedding.

VERIFY:
- **Correctness of `extractGalaxyDomainText`**: regex `/^#\s/` skips ONLY the H1 (not ## / ###) — confirm. The boilerplate regex `GALAXY_BOILERPLATE_RE` — does it risk dropping LEGITIMATE domain lines (false positives)? e.g. could "master-brain link" or "per-domain memory cascade" ever be domain-relevant content for some galaxy? Assess the false-drop risk. The marker-strip `replace(/^[#>\-*\s]+/, "").replace(/^\d+\.\s*/, "")` — any way it mangles legitimate text (e.g. a line starting with "- " that is content)?
- **Fe
... [+1266 chars truncated]

### Assistant | 2026-05-30T00:39:14.870Z

[tool_use: Read]

### Assistant | 2026-05-30T00:39:13.972Z

I'll review both files end-to-end, focusing on the A3-enrichment delta. Let me read them.

### Assistant | 2026-05-30T00:39:14.349Z

[tool_use: Read]

### User | 2026-05-30T00:39:19.900Z

[tool_result] 1	#!/usr/bin/env node
2	// U-MEMORY-INDEX-SIDECAR — pre-build the memory-vault sidecar so the H7
3	// UserPromptSubmit hook (memory-index-precheck-inject.mjs) can hit a
4	// pre-parsed JSON instead of cold-scanning the ~492-file vault every prompt
5	// (measured at ~8.7 s — exceeded the 5 s UPS timeout, so H7 shipped UNWIRED).
6	//
7	// Reads:  H:/prism/knowledge/memories/{feedback,reference,proje
... [+14131 chars truncated]

### User | 2026-05-30T00:39:19.975Z

[tool_result] 1	// Tests for build-memory-index-sidecar.mjs builder + the lib's tryLoadMemorySidecar
2	// fast-path. Hermetic via injected fs implementations + a tmpdir for the lib
3	// stale-gate end-to-end test.
4	
5	import { describe, it } from "node:test";
6	import { strict as assert } from "node:assert";
7	import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
8	
... [+31227 chars truncated]

### Assistant | 2026-05-30T00:39:23.221Z

Both files read end-to-end. Now let me verify the lib functions that the galaxy `opening` field flows into (`buildMemoryRecord`, `scoreMemoryRecord`, `buildEmbedDocText`, `recordKey`, `toHit`) to confirm no regression with a 700-char opening.

### Assistant | 2026-05-30T00:39:24.699Z

[tool_use: Grep]

### User | 2026-05-30T00:39:28.196Z

[tool_result] 172:export function buildMemoryRecord({ namespace, fileName, body, maxBodyBytes = DEFAULT_MAX_BODY_BYTES }) {
190:export function scoreMemoryRecord(rec, queryTokens) {
326:export function recordKey(rec) {
334:export function buildEmbedDocText(rec) {

### Assistant | 2026-05-30T00:39:31.928Z

Let me read the relevant lib functions to verify the 700-char opening doesn't break any consumer.

### Assistant | 2026-05-30T00:39:32.396Z

[tool_use: Read]

### User | 2026-05-30T00:39:35.102Z

[tool_result] 150	    }
151	    if (v.length === 0) continue;
152	    const key = v.toLowerCase();
153	    if (seen.has(key)) continue;
154	    seen.add(key);
155	    out.push(v);
156	  }
157	  return out;
158	}
159	
160	function firstParagraph(rest, maxBytes) {
161	  if (typeof rest !== "string" || rest.length === 0) return "";
162	  const paras = rest.split(/\n{2,}/);
163	  for (const p of paras) {
164	    co
... [+9422 chars truncated]

### Assistant | 2026-05-30T00:39:38.438Z

I now have full visibility into every consumer of the galaxy `opening` field. Let me verify the `toHit` shape and confirm `description` slicing (280 vs the H1 source) and check `parseFrontmatter` behavior for galaxy bodies with no frontmatter.

### Assistant | 2026-05-30T00:39:40.046Z

[tool_use: Grep]

### User | 2026-05-30T00:39:44.733Z

[tool_result] 192-  const nameBlob = (rec.name + " " + (rec.fileName || "")).toLowerCase();
193-  const descBlob = (rec.description || "").toLowerCase();
194:  const bodyBlob = (rec.opening || "").toLowerCase();
195-  const typeBlob = (rec.namespace || "").toLowerCase();
196-  \ PSN-ENHANCE-MS0\U-PSN-MASTER-INDEX-ALIASES: aliases are slug synonyms.
--
334-export function buildEmbedDocText(rec) {
335-  if (!rec 
... [+480 chars truncated]

### Assistant | 2026-05-30T00:39:48.125Z

Found a key detail. Let me read the two `toHit` / output-shaping sites (lines ~575-635) to confirm the opening is re-sliced to 200 at hit-emission, which has implications for the BM25-vs-display contract.

### Assistant | 2026-05-30T00:39:48.588Z

[tool_use: Read]

### User | 2026-05-30T00:39:53.993Z

[tool_result] 560	
561	  const vaultRoot = opts.vaultRoot ?? DEFAULT_VAULT_ROOT;
562	  const namespaces = opts.namespaces ?? DEFAULT_NAMESPACES;
563	  const topK = opts.topK ?? DEFAULT_TOP_K;
564	  const maxBodyBytes = opts.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
565	  const maxTotalBytes = opts.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;
566	  const sidecarPath = opts.sidecarPath ?? DEFAULT_SIDECAR_PATH;
567	  c
... [+2873 chars truncated]

### Assistant | 2026-05-30T00:40:55.918Z

I now have everything needed. Both files are read end-to-end and I've verified every consumer of the galaxy `opening` field in the lib. Let me trace through the specific verification points.

Key findings from the lib trace:
- `scoreMemoryRecord` (line 194): `bodyBlob = (rec.opening || "").toLowerCase()` — scores the **full** opening with `indexOf`. A 700-char opening means more domain terms hit BM25. No length cap, no break. Correct.
- `buildEmbedDocText` (line 336): uses **full** `rec.opening` for the dense embedding doc. The 700-char enrichment flows into the embedding. Correct.
- `toHit` (line 581) and live-scan hit (line 634): **re-slice opening to 200** at *emission*. So the 700-char opening is used for scoring/embedding but the displayed hit is truncated to 200 — this is the intended display contract, no break.
- `recordKey` (line 328): uses only `namespace`/`name`/`fileName` — opening length irrelevant. Correct.

Now let me carefully assess the regex/edge-case concerns.

**`/^#\s/` H1-only check (line 75):** Tested against `raw` (untrimmed). `# Lathe Galaxy...` → matches (skip). `## Master-brain link` → `^#\s` requires a space immediately after the first `#`; `##` has `#` at position 1, not a space, so it does NOT match — `##`/`###` pass through. Confirmed correct. One subtlety: it tests `raw` not `line`, so an indented `   # heading` would NOT be skipped by this rule (it'd be treated as content). In practice markdown H1s aren't indented, and the boilerplate regex + marker-strip would handle stray cases. Minor.

**`GALAXY_BOILERPLATE_RE` false-drop risk (line 65):** The alternatives are: `per-domain memory cascade`, `master-brain link`, `UP (pull`, `DOWN (push`, `MASTER-INDEX edge`, `Last master-sync`, `stop-obsidian-memory-feed`, `recall:\s*`?prism_memory`, `Status:\s*STUB`, `auto-loads when claude edits`. These are all template-specific phrases. Realistic false-positive risk:
- A *fully-migrated* galaxy brain (non-stub, e.g. token-optimization) whose autho
... [+9412 chars truncated]
