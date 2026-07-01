---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "VERIFY the U-VAULT-INDEX-META gap in PRISM (H:/prism). The audit claimed: knowle"
date: "2026-06-08"
first_ts: "2026-06-08T15:51:02.317Z"
last_ts: "2026-06-08T15:54:07.509Z"
cwd: "H:\\prism"
messages: 47
user_msgs: 20
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_c918ab40-d8c/agent-acfa49965fdccc0a5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# VERIFY the U-VAULT-INDEX-META gap in PRISM (H:/prism). The audit claimed: knowle

> **claude-code-cli** | 2026-06-08 | 47 msgs (20 user / 27 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_c918ab40-d8c/agent-acfa49965fdccc0a5.jsonl`

## Transcript

### User | 2026-06-08T15:51:02.317Z

VERIFY the U-VAULT-INDEX-META gap in PRISM (H:/prism). The audit claimed: knowledge/wiki/index.md body regenerates daily but its frontmatter (last_verified: 2026-05-08, "770 entries") never updates -> drift vs the ~39K live wiki files.

Investigate:
1. Read the FIRST ~30 lines of knowledge/wiki/index.md — what frontmatter fields exist? Current values?
2. WHO writes index.md? Find the regen surface — grep for "index.md" writers: WikiIndexMaintainerEngine (mcp-server/src/engines/**), scripts/*wiki*index*.mjs, any regen script. Identify the ONE canonical writer + the function that emits the frontmatter block.
3. Does the writer compute a live entry count anywhere (so we can stamp it) or is the count hardcoded?
4. The PRECISE fix: which file/function to edit so the frontmatter last_verified + entry-count are stamped from live data on every regen. Is there a test?
Final text IS the data. Quote file paths + line numbers.

### Assistant | 2026-06-08T15:51:19.992Z

I'll verify this gap systematically. Let me start by reading the index.md frontmatter and finding the writers in parallel.

### Assistant | 2026-06-08T15:51:20.966Z

[tool_use: Read]

### Assistant | 2026-06-08T15:51:22.426Z

[tool_use: Grep]

### Assistant | 2026-06-08T15:51:22.723Z

[tool_use: Glob]

### Assistant | 2026-06-08T15:51:22.883Z

[tool_use: Glob]

### User | 2026-06-08T15:51:26.109Z

[tool_result] 1	---
2	title: PRISM Wiki Index
3	category: meta
4	last_verified: 2026-05-08
5	author: hybrid
6	---
7	
8	# PRISM Wiki Index
9	
10	> LLM-maintained catalog. Bootstrap rewrites entries with `source:bootstrap` only — LLM-added entries are preserved across re-runs. See `WIKI_SCHEMA.md` §4.1.
11	
12	Last bootstrap: 2026-05-08 — 770 entries total (575 engines + 96 dispatchers + 99 memories from bootstra
... [+4275 chars truncated]

### User | 2026-06-08T15:51:27.076Z

[tool_result] Found 1 file
mcp-server\src\engines\WikiIndexMaintainerEngine.ts

### User | 2026-06-08T15:51:46.051Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-08T15:51:46.083Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-08T15:51:52.907Z

Found the canonical writer: `WikiIndexMaintainerEngine.ts`. Confirmed the frontmatter fields (lines 1-6) and the count line (line 12). Now let me examine the writer to find the frontmatter-emission function and whether it computes a live count.

### Assistant | 2026-06-08T15:51:55.059Z

[tool_use: Grep]

### Assistant | 2026-06-08T15:51:56.112Z

[tool_use: Grep]

### User | 2026-06-08T15:51:59.437Z

[tool_result] Found 50 files
scripts\vault-rot-sentinel.test.mjs
scripts\vault-rot-sentinel.mjs
scripts\ollama-prism-bridge.mjs
scripts\checkin-recall.mjs
scripts\build-wiki-embeddings.mjs
scripts\lib\cag-router.mjs
scripts\audit-hook-wiring.test.mjs
scripts\galaxy-verify.mjs
scripts\catalog-jm-die-tribal-wiki-corpus.mjs
scripts\generate-courses-wiki.mjs
scripts\generate-cadcam-training-corpus-features.mjs
scri
... [+1438 chars truncated]

### User | 2026-06-08T15:51:59.468Z

[tool_result] 12: *   - [[slug]] — summary | category:X | sources:N | confidence:0.85 | last_verified:YYYY-MM-DD | source:path
18: *   (a) latest last_verified wins
47:  /^-\s+\[\[([^\]]+)\]\]\s+—\s+(.*?)\s+\|\s+category:([\w-]+)\s+\|\s+sources:(\d+)\s+\|\s+confidence:([\d.]+)\s+\|\s+last_verified:(\d{4}-\d{2}-\d{2})(?:\s+\|\s+source:(\S+))?\s*$/;
58:  last_verified: string;
122:    if (!e.last_verified || !/^\
... [+845 chars truncated]

### Assistant | 2026-06-08T15:52:21.264Z

The key region is lines 280-320 in `WikiIndexMaintainerEngine.ts` (frontmatter emission at line 297, the count is NOT here). The audit's claim about the "Last bootstrap: ... 770 entries" line on index.md line 12 points to a separate bootstrap surface. Let me read the emission function and check the actual writer of index.md's line 12. The body regenerates daily — I need to find what regenerates it daily vs. what wrote line 12.

### Assistant | 2026-06-08T15:52:23.106Z

[tool_use: Read]

### Assistant | 2026-06-08T15:52:23.109Z

[tool_use: Grep]

### User | 2026-06-08T15:52:24.563Z

[tool_result] 230	    let raw: string;
231	    try {
232	      raw = await fs.readFile(this.indexPath, "utf-8");
233	    } catch {
234	      return [];
235	    }
236	    return parseIndex(raw);
237	  }
238	
239	  private async writeIndex(entries: WikiEntry[]): Promise<void> {
240	    const today = new Date().toISOString().slice(0, 10);
241	    await atomicWrite(this.indexPath, formatIndex(entries, today));
242	
... [+3615 chars truncated]

### User | 2026-06-08T15:52:26.146Z

[tool_result] 15: * Each generator is idempotent and updates wiki/index.md in-place between
26:import { existsSync, statSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
172:    try { mkdirSync(dirname(FINGERPRINT_PATH), { recursive: true }); writeFileSync(FINGERPRINT_PATH, fp, "utf8"); } catch {}

### Assistant | 2026-06-08T15:52:35.515Z

Critical discovery: the live engine `WikiIndexMaintainerEngine.ts` (`formatIndex`, lines 286-323) does NOT emit the `Last bootstrap: ... 770 entries` line at all — it emits `Total entries: ${entries.length}` (line 305, a LIVE count) and `last_verified: ${today}` (line 297, a LIVE date). But the actual on-disk `index.md` shows the OLD format (line 12 "Last bootstrap... 770 entries", line 10 different boilerplate). This means the live engine is NOT what last wrote index.md — something else (a bootstrap script) wrote the current file, and the engine has never run since. Let me find the bootstrap writer and what regenerates the body daily.

### Assistant | 2026-06-08T15:52:36.575Z

[tool_use: Grep]

### Assistant | 2026-06-08T15:52:37.835Z

[tool_use: Grep]

### Assistant | 2026-06-08T15:52:38.839Z

[tool_use: Grep]

### User | 2026-06-08T15:52:38.848Z

[tool_result] <tool_use_error>Path does not exist: H:/prism/mcp-server/src/engines/WikiIndexMaintainerEngine.test.ts. Note: your current working directory is H:\prism.</tool_use_error>

### User | 2026-06-08T15:52:41.360Z

[tool_result] Found 1 file
scripts\golf-consolidate-claude-md.mjs

### User | 2026-06-08T15:52:42.302Z

[tool_result] 358:last_verified: ${new Date().toISOString().split("T")[0]}

### Assistant | 2026-06-08T15:52:46.415Z

The "Last bootstrap... 770 entries" string only appears in `golf-consolidate-claude-md.mjs` (likely a digest reader, not the writer). The on-disk index.md format predates the current engine code. Let me find the actual bootstrap script that wrote the current index.md format, check for a test, and confirm whether `build-wiki-leaf-index.mjs` is the daily body regenerator.

### Assistant | 2026-06-08T15:52:48.260Z

[tool_use: Grep]

### User | 2026-06-08T15:52:48.261Z

[tool_result] <tool_use_error>Path does not exist: H:/prism/scripts/wiki-bootstrap.mjs. Note: your current working directory is H:\prism.</tool_use_error>

### Assistant | 2026-06-08T15:52:48.879Z

[tool_use: Glob]

### Assistant | 2026-06-08T15:52:49.268Z

[tool_use: Glob]

### Assistant | 2026-06-08T15:52:53.685Z

[tool_use: Read]

### User | 2026-06-08T15:52:56.843Z

[tool_result] 340	  writeFileSync(OUT_PATH, jsonl, "utf8");
341	
342	  // Also emit _stats.md — the authoritative wiki-size source of truth. The
343	  // system-viz graph's meta.headline.wikiEntries only counts index.md lines
344	  // (~776) and is 18x understated vs the architecture tree; this file is what
345	  // anyone asking "how big is the wiki" should read.
346	  const byType = {};
347	  for (const ln of
... [+1260 chars truncated]

### User | 2026-06-08T15:52:59.762Z

[tool_result] scripts\mirror-memories-bootstrap.mjs
scripts\bootstrap-golf.mjs
scripts\bootstrap-h-mirror.mjs
scripts\bootstrap-c-mirror.mjs
scripts\slot-worktree-bootstrap.mjs
scripts\mit-course-catalog-bootstrap.mjs
scripts\quoting-baseline-bootstrap.variance.test.mjs
scripts\quoting-baseline-bootstrap.distribution.test.mjs
scripts\quoting-baseline-bootstrap.balance.test.mjs
scripts\quoting-baseline-bootstrap
... [+92 chars truncated]

### User | 2026-06-08T15:52:59.764Z

[tool_result] mcp-server\src\__tests__\WikiIndexMaintainerEngine.test.ts

### Assistant | 2026-06-08T15:53:06.383Z

Now I have the full picture. Key facts:
1. `build-wiki-leaf-index.mjs` writes a SEPARATE file `_stats.md` (with a live `total_entries` + live `last_verified`) — NOT `index.md`. It even comments that index.md's count is "18x understated."
2. The live engine `WikiIndexMaintainerEngine.formatIndex()` would emit live values IF it ran — but the on-disk index.md is in the OLD bootstrap format, meaning the engine isn't the current writer.

Let me read the engine's test file and the engine header/upsert path to confirm what triggers `writeIndex`, and pin down whether the on-disk format is stale-by-design or whether a bootstrap script is the real daily writer.

### Assistant | 2026-06-08T15:53:08.817Z

[tool_use: Read]

### Assistant | 2026-06-08T15:53:08.820Z

[tool_use: Grep]

### Assistant | 2026-06-08T15:53:10.464Z

[tool_use: Grep]

### User | 2026-06-08T15:53:11.253Z

[tool_result] 160	
161	      for (const incoming of entries) {
162	        const prior = bySlug.get(incoming.slug);
163	        if (!prior) {
164	          bySlug.set(incoming.slug, incoming);
165	          results.push({ slug: incoming.slug, added: true, updated: false });
166	          added++;
167	          continue;
168	        }
169	
170	        const winner = resolveConflict(prior, incoming);
171	        
... [+1989 chars truncated]

### User | 2026-06-08T15:53:12.828Z

[tool_result] 16:  formatIndex,
36:    last_verified: TODAY,
65:      "| category:concepts | sources:1 | confidence:0.85 | last_verified:2026-04-27 " +
79:    expect(obj.last_verified).toStrictEqual(TODAY);
92:  it("newer last_verified produces an incoming-wins update with refreshed confidence", async () => {
93:    await engine.upsert(entry({ confidence: 0.7, last_verified: "2026-04-25" }));
94:    const r = a
... [+1105 chars truncated]

### User | 2026-06-08T15:53:15.354Z

[tool_result] 6: * system-viz graph regenerates. Wire into SessionStart, the system-viz-
15: * Each generator is idempotent and updates wiki/index.md in-place between
82:  "generate-courses-wiki.mjs",            // PRISM Academy courses + 5 MIT OCW courses + 220-course KB index
84:  "generate-tribal-wiki.mjs",             // per-category tribal index pages (~73); tips themselves are indexed by build-wiki-leaf-i
... [+38 chars truncated]

### Assistant | 2026-06-08T15:53:21.669Z

I now have everything needed to deliver a verified, precise verdict. Let me confirm the one remaining open question: what does `regen-wiki-from-viz.mjs` say about index.md regeneration (line 6, 15) and whether it touches the frontmatter — and check the `_stats.md`/leaf-index for the live count source I'd stamp from.

### Assistant | 2026-06-08T15:53:22.290Z

[tool_use: Read]

### User | 2026-06-08T15:53:26.753Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-wiki-from-viz.mjs
4	 *
5	 * Orchestrator: runs every viz→wiki generator in sequence after the
6	 * system-viz graph regenerates. Wire into SessionStart, the system-viz-
7	 * on-commit hook, or invoke via slash command after `/system-viz`.
8	 *
9	 * Generators (run in dependency order):
10	 *   1. generate-layer-wiki.mjs       — 13 per-layer entries
11	 *   2.
... [+5139 chars truncated]

### Assistant | 2026-06-08T15:54:07.509Z

I have a complete, verified picture. The audit's framing is partly wrong about the mechanism, but the underlying gap (stale frontmatter) is real. Here is the verdict.

---

## VERDICT: gap is REAL but the audit MISDESCRIBED the mechanism

The audit said "index.md body regenerates daily but its frontmatter never updates." That is **not how it works.** The actual situation is worse and simpler: **`knowledge/wiki/index.md` is NOT regenerated by anything daily.** It is a frozen bootstrap artifact. The live engine that *should* write it (`WikiIndexMaintainerEngine`) emits a completely different, self-stamping format — proving it has not run since the bootstrap. The frontmatter is stale because the *whole file* is stale.

### 1. Frontmatter fields + current values (`H:/prism/knowledge/wiki/index.md:1-12`)
```
1  ---
2  title: PRISM Wiki Index
3  category: meta
4  last_verified: 2026-05-08      ← STALE (1 month old; today 2026-06-08)
5  author: hybrid
6  ---
...
12 Last bootstrap: 2026-05-08 — 770 entries total (575 engines + 96 dispatchers + 99 memories...)  ← STALE count
```
Fields: `title`, `category`, `last_verified`, `author`. The count lives in a body line (12), NOT frontmatter.

### 2. WHO writes index.md — the canonical writer and the smoking gun
- **Canonical writer: `WikiIndexMaintainerEngine` (`mcp-server/src/engines/WikiIndexMaintainerEngine.ts`).** Confirmed by the on-disk file's own note (`index.md:303` template says "Owned by `WikiIndexMaintainerEngine` — atomic upsert under `wikiLock`"). It writes via `writeIndex()` (line 239-242) → `formatIndex(entries, today)` (line 286-323). It writes on every `upsert()`/`remove()` (lines 197, 223).
- **The frontmatter-emitting function is `formatIndex` (line 286).** It pushes the YAML block at lines 294-299, stamping `last_verified: ${today}` at **line 297** from `new Date().toISOString().slice(0,10)` (passed from `writeIndex`, line 240).
- **SMOKING GUN — the engine is NOT the current writer of the on-disk file.** `for
... [+4954 chars truncated]
