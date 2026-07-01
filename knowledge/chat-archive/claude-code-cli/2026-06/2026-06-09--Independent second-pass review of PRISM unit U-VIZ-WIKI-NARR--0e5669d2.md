---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "Independent second-pass review of PRISM unit U-VIZ-WIKI-NARRATIVE (slot:sierra)."
date: "2026-06-09"
first_ts: "2026-06-09T17:55:22.109Z"
last_ts: "2026-06-09T17:58:48.388Z"
cwd: "H:\\prism"
messages: 36
user_msgs: 14
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-a2c9528ed968e7695.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# Independent second-pass review of PRISM unit U-VIZ-WIKI-NARRATIVE (slot:sierra).

> **claude-code-cli** | 2026-06-09 | 36 msgs (14 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-a2c9528ed968e7695.jsonl`

## Transcript

### User | 2026-06-09T17:55:22.109Z

Independent second-pass review of PRISM unit U-VIZ-WIKI-NARRATIVE (slot:sierra). Do NOT assume arm A caught everything. Read (H:/prism): `scripts/lib/viz-wiki-narrative.mjs`, `scripts/lib/viz-wiki-narrative.test.mjs`, `scripts/generate-viz-wiki-narrative.mjs`, and the GENERATORS wiring in `scripts/regen-wiki-from-viz.mjs`.

Weight your review on what a correctness reviewer is less likely to catch:
- HOT-PATH / BLAST-RADIUS: `regen-wiki-from-viz.mjs` runs in the post-commit hook on EVERY commit fleet-wide. Confirm the new generator is a genuine no-op when PRISM_VIZ_WIKI_NARRATIVE!=1 (it should print "disabled" and return before any glob/Ollama/FS work). Confirm adding it to GENERATORS adds ~zero cost by default. Could it ever write to the 148 real architecture/*.md entries unintentionally?
- REGRESSION on the wiki entries: the generator WRITES into committed wiki .md files when enabled. Is the marker-injection safe against entries that already have OTHER HTML-comment markers (the generators use AUTO-START/AUTO-END)? Confirm viz-narrative markers are distinct and stripNarrative won't eat the AUTO blocks. Does injecting a block before the AUTO-START content break the generators' next idempotent update?
- CONVENTION conformance vs sibling generators (generate-domain-wiki.mjs etc.): --dry-run handling, output format, PRISM_ROOT resolution, ASCII-only.
- FAIL-SOFT completeness + the cache: could a corrupt cache file crash it? Does saveBlurbCache/loadBlurbCache (reused from contextual-blurb.mjs) handle a missing/corrupt sidecar? Is the content-hash cache invalidation correct (re-narrate only on content change)?
- TEST INTEGRITY (R9): any stub asserts? Is the "empty blurb strips existing block" + "replaces stale block" coverage real?

List P0/P1 with file:line, then PASS or FAIL. Concise.

### Assistant | 2026-06-09T17:55:29.074Z

I'll review this unit. Let me start by reading the four files in question.

### Assistant | 2026-06-09T17:55:30.105Z

[tool_use: Read]

### Assistant | 2026-06-09T17:55:31.169Z

[tool_use: Read]

### Assistant | 2026-06-09T17:55:31.176Z

[tool_use: Read]

### Assistant | 2026-06-09T17:55:31.241Z

[tool_use: Read]

### User | 2026-06-09T17:55:41.942Z

[tool_result] 1	/**
2	 * viz-wiki-narrative.mjs -- pure helpers for the viz->wiki narrative enrichment.
3	 *
4	 * The viz->wiki generators (generate-{layer,domain,dispatcher}-wiki.mjs) emit
5	 * entries whose bodies are 100% procedural field-dumps (counts, tables, Mermaid)
6	 * with NO prose explaining what the layer/domain/dispatcher IS or WHY it exists.
7	 * U-VIZ-WIKI-NARRATIVE (OLLAMA-SYNERGY backlog #1, si
... [+5308 chars truncated]

### User | 2026-06-09T17:55:43.254Z

[tool_result] 1	/**
2	 * viz-wiki-narrative.test.mjs -- real-assertion tests for the pure narrative
3	 * inject/strip/extract helpers. The load-bearing property is IDEMPOTENCY: the
4	 * post-pass runs every regen, so inject(inject(md,b),b) MUST equal inject(md,b)
5	 * or the wiki entries would accumulate duplicate blocks.
6	 */
7	import { test } from "node:test";
8	import assert from "node:assert/strict";
9	imp
... [+5631 chars truncated]

### User | 2026-06-09T17:55:43.267Z

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
... [+8779 chars truncated]

### User | 2026-06-09T17:55:43.658Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-viz-wiki-narrative.mjs -- OLLAMA-SYNERGY backlog #1 (sierra).
4	 *
5	 * Flag-gated post-pass that enriches the viz->wiki entries
6	 * (knowledge/wiki/architecture/{layer,domain,dispatcher}-*.md -- otherwise 100%
7	 * procedural field-dumps) with a 1-2 sentence LOCAL-LLM "what/why" narrative.
8	 * Runs in the regen-wiki-from-viz chain AFTER the 3 field-dump
... [+5153 chars truncated]

### Assistant | 2026-06-09T17:55:52.220Z

Both files referenced in the unit but not yet read are `contextual-blurb.mjs` (cache + blurb provider, reused) — I need to verify the cache helpers and `generateBlurb` behave as claimed. Let me read it.

### Assistant | 2026-06-09T17:55:52.503Z

[tool_use: Read]

### User | 2026-06-09T17:55:57.943Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * contextual-blurb.mjs — Anthropic Contextual-Retrieval blurb generator.
4	 *
5	 * RAG-UPGRADE-MS0 / U-RAG-3 (2026-05-22).
6	 *
7	 * Generates a 1-2 sentence context blurb for a piece of content via Ollama's
8	 * /api/generate endpoint (small instruction-following model — qwen2.5-coder
9	 * by default). The blurb is intended to be PREPENDED to the chunk text
10	 * be
... [+6539 chars truncated]

### Assistant | 2026-06-09T17:56:04.751Z

Now let me verify a key claim: do the sibling generators actually use `AUTO-START`/`AUTO-END` markers (so the narrative markers are confirmed-distinct), and where exactly do they inject content relative to the frontmatter — to confirm the narrative block prepended before their content doesn't break their idempotent in-place update.

### Assistant | 2026-06-09T17:56:08.109Z

[tool_use: Grep]

### Assistant | 2026-06-09T17:56:08.115Z

[tool_use: Grep]

### User | 2026-06-09T17:56:13.355Z

[tool_result] 18: * Idempotent — AUTO-START/END markers preserve human-added content.
35:const AUTO_START = "<!-- AUTO-START — regenerated by generate-domain-wiki.mjs -->";
36:const AUTO_END = "<!-- AUTO-END -->";
236:    "<!-- ARCH-DOMAINS-START -->",
240:    "<!-- ARCH-DOMAINS-END -->",
243:  if (text.includes("<!-- ARCH-DOMAINS-START -->")) {
245:      /<!-- ARCH-DOMAINS-START -->[\s\S]*?<!-- ARCH-DOMAINS-EN
... [+172 chars truncated]

### User | 2026-06-09T17:56:13.587Z

[tool_result] 18: * Idempotent — AUTO-START/END markers preserve human-added content.
19: * Updates wiki/index.md ## architecture subsection in-place (ARCH-DOMAINS markers).
21:import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
35:const AUTO_START = "<!-- AUTO-START — regenerated by generate-domain-wiki.mjs -->";
36:const AUTO_END = "<!-- AUTO-END -->";
161:  return `---

... [+1192 chars truncated]

### Assistant | 2026-06-09T17:56:19.447Z

Now I have the critical detail. Let me verify the exact body structure of the generated entries — specifically whether `generate-domain-wiki.mjs` rewrites the entry by reading the EXISTING file and surgically swapping only the AUTO block (which would preserve a narrative block injected after frontmatter), or whether it rewrites the whole file from scratch (which would clobber the narrative). Lines 221-228 show a surgical splice. Let me read that section precisely plus the dispatcher generator to confirm the same pattern.

### Assistant | 2026-06-09T17:56:20.405Z

[tool_use: Read]

### User | 2026-06-09T17:56:27.785Z

[tool_result] 210	## See also
211	
212	- Parent layer: [[layer-l5]]
213	- Dispatchers layer: [[layer-l4]]
214	- Live graph: \`state/shared/system-viz/system-graph.json\`
215	- Query: \`node scripts/system-viz-query.mjs coverage-by-domain\`
216	`;
217	}
218	
219	function preserveHuman(existing, full) {
220	  if (!existing) return full;
221	  const sStart = existing.indexOf(AUTO_START);
222	  const sEnd = existin
... [+3185 chars truncated]

### Assistant | 2026-06-09T17:56:45.606Z

This is the load-bearing interaction, and `preserveHuman` confirms a critical finding. Let me trace it carefully.

`preserveHuman(existing, full)` (lines 219-230):
- `before = existing.slice(0, sStart)` — everything in the existing file BEFORE `AUTO-START`, kept verbatim.
- `newAuto` — the freshly-rendered AUTO block.
- `after = existing.slice(sEnd + AUTO_END.length)` — everything after the existing AUTO block.
- Returns `before + newAuto + after`.

The narrative block is injected by `injectNarrative` right after the frontmatter, which is BEFORE `AUTO-START` (the AUTO block starts at line 182 of the render, well into the body). So the narrative block lives inside the `before` slice → **preserved across regen.** That part is correct and is the key safety property. Good.

But now check the ordering in `regen-wiki-from-viz.mjs` GENERATORS (lines 67-112): `generate-domain-wiki.mjs` (index 1) runs BEFORE `generate-viz-wiki-narrative.mjs` (index 3). On the *first* enabled run the domain generator writes the entry with no narrative; then the narrative generator injects it. On *subsequent* commits the domain generator runs first and `preserveHuman` keeps the narrative (in `before`). So steady-state is fine. Let me confirm the dispatcher and layer generators use the identical `preserveHuman` pattern (the claim depends on all three).

### Assistant | 2026-06-09T17:56:45.608Z

[tool_use: Grep]

### Assistant | 2026-06-09T17:56:46.538Z

[tool_use: Grep]

### User | 2026-06-09T17:56:49.681Z

[tool_result] 32:const AUTO_START = "<!-- AUTO-START — regenerated by generate-dispatcher-wiki.mjs -->";
119:${AUTO_START}
148:function preserveHuman(existing, full) {
150:  const sStart = existing.indexOf(AUTO_START);
152:  const nStart = full.indexOf(AUTO_START);
155:  const before = existing.slice(0, sStart);
209:    const final = preserveHuman(existing, full);
213:      writeFileSync(outPath, final, "utf8")
... [+1 chars truncated]

### User | 2026-06-09T17:56:50.750Z

[tool_result] 141:const AUTO_START = "<!-- AUTO-START — regenerated by generate-layer-wiki.mjs -->";
240:${AUTO_START}
283:function preserveHumanContent(existing, newAutoBlock, fullEntry) {
286:  const startIdx = existing.indexOf(AUTO_START);
298:  const s = fullEntry.indexOf(AUTO_START);
385:    const finalContent = preserveHumanContent(existing, newAutoBlock, full);
390:      writeFileSync(outPath, finalConte
... [+12 chars truncated]

### Assistant | 2026-06-09T17:56:57.098Z

All three field-dump generators use the same `before + newAuto + after` preserve pattern, with the narrative living in `before`. Let me read the layer generator's `preserveHumanContent` to confirm there's no asymmetry (it has a 3-arg signature, different from the other two).

### Assistant | 2026-06-09T17:56:57.914Z

[tool_use: Read]

### User | 2026-06-09T17:57:04.604Z

[tool_result] 283	function preserveHumanContent(existing, newAutoBlock, fullEntry) {
284	  // If file exists with auto markers, preserve everything outside them.
285	  if (!existing) return fullEntry;
286	  const startIdx = existing.indexOf(AUTO_START);
287	  const endIdx = existing.indexOf(AUTO_END);
288	  if (startIdx === -1 || endIdx === -1) {
289	    // Either no markers (first run) or hand-authored — overw
... [+611 chars truncated]

### Assistant | 2026-06-09T17:57:21.023Z

Confirmed identical preserve semantics across all three. The narrative block (in `before`) survives every regen. 

Now I have everything needed to assess each weighted axis. Let me work through the specific concerns the prompt raised.

**1. HOT-PATH / no-op when disabled:** `generate-viz-wiki-narrative.mjs` checks `ENABLED` (line 46, `=== "1"`) as the FIRST thing in `main()` (lines 62-65), logging "disabled" and returning before any `readdirSync`/`fetch`/`existsSync`-of-dir/cache work. The only module-load cost added to the chain is importing `contextual-blurb.mjs` (pure, no side effects on import) + `viz-wiki-narrative.mjs` (pure). Adding it to GENERATORS costs one extra `spawnSync` of a node process that exits ~immediately when disabled. That's the documented "~zero cost by default" — true. It can never write to the 148 architecture entries when disabled (returns before the loop). Correct.

**2. Can it write to non-{layer,domain,dispatcher} architecture entries?** `ENTRY_RE = /^(layer|domain|dispatcher)-.+\.md$/` (line 43) — only the 3 field-dump entry types. `generate-engine-wiki.mjs` writes `architecture/engines/<domain>/...` (a subdir; `readdirSync` is non-recursive so subdirs are filtered by the regex anyway and `join + readFileSync` on a dir entry name that's actually a directory would throw → caught → `skipped++`). The `layer-stack-overview` entry: its filename — let me confirm it doesn't match `^layer-`.

The overview file is emitted by `generate-layer-stack-overview.mjs`. Its filename matters: if it's `layer-stack-overview.md` it WOULD match `^layer-.+\.md$` and get a narrative injected. That's not necessarily a bug (the overview is also a field-dump and benefits from a narrative), but it's worth flagging whether the overview uses the same AUTO-marker preserve pattern, else the narrative could be clobbered. Let me check.

### Assistant | 2026-06-09T17:57:22.453Z

[tool_use: Grep]

### User | 2026-06-09T17:57:28.024Z

[tool_result] 6: *   H:/prism/knowledge/wiki/architecture/layer-stack-overview.md
18:import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
27:const OUT_PATH = join(WIKI_ARCH_DIR, "layer-stack-overview.md");
144:  - state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md
146:  - knowledge/wiki/architecture/system-viz.md
187:Each L5 engine domain has its own wiki entry: see \`knowledge/wiki/architectur
... [+330 chars truncated]

### Assistant | 2026-06-09T17:57:45.030Z

Found a real interaction. `generate-layer-stack-overview.mjs` writes `layer-stack-overview.md`, which **matches** `ENTRY_RE = /^(layer|domain|dispatcher)-.+\.md$/` (it starts with `layer-`). And critically, line 216 shows it does an **unconditional full `writeFileSync(OUT_PATH, md)`** — no `preserveHuman`, no AUTO-marker splice. It rewrites the whole file from scratch every run.

Now trace the ordering in `regen-wiki-from-viz.mjs` GENERATORS:
- index 3: `generate-viz-wiki-narrative.mjs` (injects narrative into `layer-stack-overview.md` among others)
- index 21: `generate-layer-stack-overview.mjs` runs LATER and does a full overwrite.

So on every enabled regen, the narrative generator injects a block into `layer-stack-overview.md`, then `generate-layer-stack-overview.mjs` overwrites the whole file and **wipes the narrative**. Next regen re-injects (cache-hit, cheap) → overwrite wipes again. This is not data corruption (the overview is fully regenerated), and not a hot-path issue (disabled by default), but it IS **wasted work + a non-idempotent, never-stable entry**: `layer-stack-overview.md` will perpetually flap — its narrative present after step 3, gone after step 21, so the committed file never carries it. The narrative generator's own log will report it as `enriched`/`cache-hit`+write each run while the output is silently discarded. This is a P2 (wasted I/O + a misleading "enriched" count for 1 of ~148 entries; the narrative never reaches the committed overview). It is NOT one of the 13 layer / 38 domain / 97 dispatcher entries the unit targets — `layer-stack-overview` is a 4th type that happens to collide with the `^layer-` prefix.

Let me verify the layer entries themselves are named `layer-l5.md` etc. (matching) and confirm the overview is the only full-overwrite collision. The render earlier referenced `[[layer-l5]]`, so layer entries are `layer-l<n>.md` — they match and are preserved (they use `preserveHumanContent`). Only the overview is the odd one out. L
... [+260 chars truncated]

### Assistant | 2026-06-09T17:57:45.703Z

[tool_use: Read]

### User | 2026-06-09T17:57:52.782Z

[tool_result] 294	    for (const e of readdirSync(enginesRoot, { withFileTypes: true })) {
295	      if (!e.isDirectory()) continue;
296	      const domain = e.name;
297	      const dSlug = slugify(domain);
298	      if (rollupSlugs.has(dSlug)) continue; // already has a full entry
299	      const dDir = join(enginesRoot, domain);
300	      const engSlugs = readdirSync(dDir).filter((f) => f.endsWith(".md")).map
... [+1746 chars truncated]

### Assistant | 2026-06-09T17:58:48.388Z

The domain stubs (`domain-<slug>.md`) also go through `preserveHuman` (line 339) → narrative in `before` survives. Good. So the ONLY collision is `layer-stack-overview.md` (full overwrite, runs after the narrative generator).

Now let me close the remaining axes the prompt asked about.

**Cache invalidation correctness (content-hash):** The narrative generator uses its OWN hash scheme (`contentHash(extractContent(md))`, lines 84-86) keyed by filename `f`, stored as `cache.entries[f] = { hash, blurb }`. It does NOT use `contextual-blurb.mjs`'s `readCacheHit`/`writeCacheHit` (which key on `mtimeMs`) — it only reuses `loadBlurbCache`/`saveBlurbCache` (the generic JSON load/atomic-save). That's a clean choice: content-hash is strictly better than mtime here (a no-content-change regen that bumps mtime won't force re-narration). The hash is over `extractContent` which strips frontmatter AND the existing narrative block (line 109, `splitFrontmatter(stripNarrative(md))`) — so the cache key does NOT change just because a narrative was injected. This avoids a feedback loop where injecting the narrative changes the hash and forces re-narration forever. Correct and subtle — well done.

**Corrupt cache crash:** `loadBlurbCache` (contextual-blurb.mjs lines 116-124) wraps `JSON.parse` in try/catch and returns `{schemaVersion, entries:{}}` on missing/corrupt. The generator then guards `if (!cache.entries) cache.entries = {}` (line 77) defensively (already guaranteed by loadBlurbCache, but harmless). No crash path. `saveBlurbCache` is atomic (tmp + rename) and try/catch-returns-false. Fail-soft complete.

**Ollama null mid-run:** lines 99-103 — if `generateBlurb` returns null mid-run, `skipped++; continue` — entry left untouched, not clobbered with an empty block. Correct fail-soft.

**`--dry-run`:** line 45 reads `--dry-run`; line 108 guards the write (`if (!DRY_RUN)`); line 114 guards the cache save. But note: in dry-run, `generateBlurb` IS still called (line 94) — it hits Ollama 
... [+7518 chars truncated]
