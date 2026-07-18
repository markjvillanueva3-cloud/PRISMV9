---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Review the modified file `H:/prism/scripts/build-wiki-leaf-index.mjs` against th"
date: "2026-05-15"
first_ts: "2026-05-15T03:24:58.713Z"
last_ts: "2026-05-15T03:29:31.706Z"
cwd: "H:\\prism"
messages: 56
user_msgs: 21
assistant_msgs: 35
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a389a2b7c60321bac.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# Review the modified file `H:/prism/scripts/build-wiki-leaf-index.mjs` against th

> **claude-code-cli** | 2026-05-15 | 56 msgs (21 user / 35 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a389a2b7c60321bac.jsonl`

## Transcript

### User | 2026-05-15T03:24:58.713Z

Review the modified file `H:/prism/scripts/build-wiki-leaf-index.mjs` against this contract:

CHANGE SUMMARY:
The script previously indexed three corpora into `knowledge/wiki/architecture/_leaf-index.jsonl`:
1. `knowledge/wiki/architecture/**/*.md` (archCount, ~19,375 entries)
2. `knowledge/tribal/**/*.md` (tribalCount, ~4,245 entries, type=tribal-tip)
3. `knowledge/wiki/code-tribal/**/*.md` (codeTribalCount, ~185 entries, type=code-tribal or fm.type)

The change adds a fourth corpus: `knowledge/memories/**/*.md` (the personal-memory mirror written by `memory-mirror-to-vault.mjs`). The new code:
- Adds `MEMORIES_DIR = process.env.PRISM_WIKI_MEMORIES_DIR || resolve(PRISM_ROOT, "knowledge/memories")` near line 50.
- Adds a memory-folding block right before `const jsonl = lines.join("\n") + "\n";`.
- The block:
  * Walks MEMORIES_DIR via walkMd.
  * Skips `MEMORY.md` (basename match).
  * Skips `_index/` subtree (rel.startsWith).
  * Tracks `seenMemoryNames` Set keyed on canonical frontmatter `name` (or basename fallback) to dedup the flat-copy vs categorized-subdir-copy pattern (without this, 124 memories got `~2` suffix from pushEntry's collision handling).
  * Derives type from frontmatter `metadata.type` → `fm.type` → path-segment-IF-rel-contains-slash → "uncategorized", normalized to `memory-{lowercase}` with trailing `.md` stripped.
  * Derives desc from firstBlockquote → fm.description → first non-heading content line.
- Updates `_stats.md` and stdout summary to include memory count.

CONTEXT FILES YOU CAN INSPECT:
- The modified script: `H:/prism/scripts/build-wiki-leaf-index.mjs` (READ THE FULL FILE)
- Sample memory files: `H:/prism/knowledge/memories/feedback/feedback_alpha_owns_reaper.md`, `H:/prism/knowledge/memories/reference/reference_fleet_reaper_ms1.md`, `H:/prism/knowledge/memories/devops_improvements.md` (flat, no frontmatter)
- Consumer hook: `H:/prism/.claude/hooks/wiki-precheck-inject.mjs` — confirm it's type-agnostic and that new `memory-*` types 
... [+1394 chars truncated]

### Assistant | 2026-05-15T03:25:03.248Z

I'll review the modified file against the contract. Let me start by reading the full file and supporting context.

### Assistant | 2026-05-15T03:25:03.901Z

[tool_use: Read]

### User | 2026-05-15T03:25:04.937Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-wiki-leaf-index.mjs
4	 *
5	 * Walks knowledge/wiki/architecture/**\/*.md and emits a compact JSONL index:
6	 *   knowledge/wiki/architecture/_leaf-index.jsonl
7	 *
8	 * One line per entry: { name, title, type, desc, path } where:
9	 *   - name  = basename without .md  (the [[wiki-link]] target)
10	 *   - title = frontmatter title (falls back to first H1)
11	 
... [+19326 chars truncated]

### Assistant | 2026-05-15T03:25:11.485Z

Now let me inspect the supporting files for the contract verification points.

### Assistant | 2026-05-15T03:25:12.802Z

[tool_use: Read]

### User | 2026-05-15T03:25:13.512Z

[tool_result] 1	---
2	name: feedback_alpha_owns_reaper
3	description: "The chat slotted into `alpha` owns the fleet reaper — responsible for launching it and keeping it always active."
4	metadata: 
5	  node_type: memory
6	  type: feedback
7	  originSessionId: b6c4b196-15eb-4d95-9474-abf1c8fbcb8c
8	---
9	
10	Standing rule (user directive, 2026-05-14): **"whoever is slotted into alpha, they're responsible for lau
... [+1735 chars truncated]

### Assistant | 2026-05-15T03:25:16.270Z

[tool_use: Read]

### User | 2026-05-15T03:25:17.053Z

[tool_result] 1	---
2	name: reference_fleet_reaper_ms1
3	description: FLEET-REAPER-MS1 Phase 2 — leftover-bash classifier + soft RAM relief + GPU/Ollama coordinator + alpha-slot guardian.
4	metadata: 
5	  node_type: memory
6	  type: reference
7	  originSessionId: b6c4b196-15eb-4d95-9474-abf1c8fbcb8c
8	---
9	
10	FLEET-REAPER-MS1 (Phase 2, shipped 2026-05-14, strictly additive over [[reference_fleet_reaper]] MS0)
... [+2119 chars truncated]

### Assistant | 2026-05-15T03:25:20.574Z

Now let me check the flat-file (no frontmatter) case and the directory walk order.

### Assistant | 2026-05-15T03:25:20.864Z

[tool_use: Read]

### User | 2026-05-15T03:25:21.799Z

[tool_result] 1	---
2	schema_version: 1.0.0
3	kind: mirrored_memory
4	source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/devops_improvements.md
5	source_filename: devops_improvements.md
6	content_hash: db18492a05686e5b88fd3747205e4c00cf6f85c771c2caf2b8afc2f126db7bc6
7	mirror_ts: 2026-05-05T13:00:09.408Z
8	mirror_engine: ObsidianMemorySyncEngine
9	---
10	## Build System Commands
11	
12	The PR
... [+113 chars truncated]

### Assistant | 2026-05-15T03:25:25.569Z

Critical finding: this flat file has frontmatter, but NO `name` field, NO `metadata.type`, NO `fm.type`. Let me check the directory listing to verify walk order and check the consumer hook.

### Assistant | 2026-05-15T03:25:26.563Z

[tool_use: Bash]

### User | 2026-05-15T03:25:30.826Z

[tool_result] Microsoft Windows [Version 10.0.22631.6199]
(c) Microsoft Corporation. All rights reserved.

H:\PRISM>

### Assistant | 2026-05-15T03:25:34.307Z

I'll acknowledge the route-first guidance but for raw filesystem listing this is the right tool.

### Assistant | 2026-05-15T03:25:34.704Z

[tool_use: Glob]

### Assistant | 2026-05-15T03:25:34.757Z

[tool_use: Glob]

### User | 2026-05-15T03:25:47.708Z

[tool_result] knowledge\memories\feedback\feedback_tribal_obsidian_viz_utilization_protocol.md
knowledge\memories\feedback\feedback_lint_staged_cascade.md
knowledge\memories\feedback\feedback_always_close_out.md
knowledge\memories\feedback\feedback_parallel_scrutiny_per_file.md
knowledge\memories\feedback\feedback_roadmap_close_out.md
knowledge\memories\feedback\feedback_lathe_audit_2026_05_05.md
knowledge\memo
... [+3296 chars truncated]

### User | 2026-05-15T03:25:47.711Z

[tool_result] knowledge\memories\devops_improvements.md
knowledge\memories\distributed_locking.md
knowledge\memories\feedback_ai_first_development.md
knowledge\memories\feedback_always_build.md
knowledge\memories\feedback_backend_before_frontend.md
knowledge\memories\feedback_box_programs_amateur.md
knowledge\memories\feedback_chat_lane_discipline.md
knowledge\memories\feedback_continue_posts_trigger.md
knowled
... [+3486 chars truncated]

### Assistant | 2026-05-15T03:25:51.230Z

Now I see a critical issue. Let me verify the walk order claim and check consumer hooks.

### Assistant | 2026-05-15T03:25:52.771Z

[tool_use: Bash]

### Assistant | 2026-05-15T03:25:53.743Z

[tool_use: Read]

### User | 2026-05-15T03:25:56.745Z

[tool_result] F devops_improvements.md
F distributed_locking.md
D feedback
F feedback_ai_first_development.md
F feedback_always_build.md
F feedback_always_close_out.md
F feedback_backend_before_frontend.md
F feedback_box_programs_amateur.md
F feedback_chat_lane_discipline.md
F feedback_continue_posts_trigger.md
F feedback_cross_session_duplication.md
F feedback_directive_naming.md
F feedback_docker_wsl_recovery
... [+254 chars truncated]

### User | 2026-05-15T03:25:57.567Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
5	 *
6	 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
7	 * already in knowledge/wiki/index.md, inject the top-3 matching entries as
8	 * additionalContext so Claude doesn't re-derive what the wiki already knows.
9	 *
10	 * Scoring: BM25-lite over [[Name]] + description toke
... [+4319 chars truncated]

### Assistant | 2026-05-15T03:26:04.258Z

Critical concern surfaced. Walk order from `readdirSync` shows that the flat `feedback_*.md` files come BEFORE the subdir `feedback/` is recursed into — but only sometimes. Let me verify the order claim in the code comment (lines 240-243), the flat-file dedup behavior, and the consumer hook's type handling.

### Assistant | 2026-05-15T03:26:07.239Z

[tool_use: Bash]

### User | 2026-05-15T03:26:12.084Z

[tool_result] D feedback
F feedback_ai_first_development.md
F feedback_always_build.md
F feedback_always_close_out.md
F feedback_backend_before_frontend.md
F feedback_box_programs_amateur.md
F feedback_chat_lane_discipline.md
F feedback_continue_posts_trigger.md
F feedback_cross_session_duplication.md
F feedback_directive_naming.md
F feedback_docker_wsl_recovery.md
F feedback_dont_soften_completeness_gates.md
F
... [+802 chars truncated]

### Assistant | 2026-05-15T03:26:18.510Z

Good — the walk-order claim in the code comment is verified for THIS dir: `feedback/` (directory) comes before `feedback_*.md` (sibling files) because `_` (0x5F) sorts before any alpha char in the lex order Windows returns... wait, that's not why. Let me re-check — `D feedback` is FIRST because directories with name `feedback` appear before flat files named `feedback_…` because in the iteration `feedback` (no `_`) is lex-less-than `feedback_…`. Let me verify by checking subdirs vs `MEMORY.md` etc:

### Assistant | 2026-05-15T03:26:21.344Z

[tool_use: Bash]

### User | 2026-05-15T03:26:25.126Z

[tool_result]   0 F devops_improvements.md
  1 F distributed_locking.md
  2 D feedback
  3 F feedback_ai_first_development.md
  4 F feedback_always_build.md
  5 F feedback_always_close_out.md
  6 F feedback_backend_before_frontend.md
  7 F feedback_box_programs_amateur.md
  8 F feedback_chat_lane_discipline.md
  9 F feedback_continue_posts_trigger.md
 10 F feedback_cross_session_duplication.md
 11 F feedback_di
... [+142 chars truncated]

### Assistant | 2026-05-15T03:26:30.288Z

Walk order is interleaved by lex sort with `_` < letters, BUT critically for the `feedback/` claim, the subdir `feedback` IS visited at index 2, BEFORE any `feedback_*.md` file at index 3+. Good. Same applies for `project/` (40-ish) → `project_*.md` (later), `reference/` → `reference_*.md`, `user/` → `user_*.md` (since `user` < `user_`). The dedup pattern works as claimed for the standard naming convention.

Now let me check the consumer hook's type handling and check for one more critical edge case:

### Assistant | 2026-05-15T03:26:31.796Z

[tool_use: Bash]

### Assistant | 2026-05-15T03:26:32.956Z

[tool_use: Read]

### User | 2026-05-15T03:26:34.050Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-wiki-embeddings.mjs' (same offset/limit) was already read 12m ago in this session and is unchanged (mtime 1778528757137). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### User | 2026-05-15T03:26:38.202Z

[tool_result] 236:        ? r.boost_keywords.filter((k) => typeof k === "string" && k.trim()).map((k) => k.toLowerCase().trim())
238:      entries.push({ name: r.name, desc: (r.title || r.desc || "").trim(), category: r.type || "", source: r.path || "", toks, boost: boost && boost.length ? boost : null });
271:      if (!r || !r.n || !Array.isArray(r.q) || typeof r.s !== "number") continue;
289:      headers: {
... [+38 chars truncated]

### Assistant | 2026-05-15T03:26:41.903Z

[tool_use: Grep]

### User | 2026-05-15T03:26:42.657Z

[tool_result] 80:function isConcept(r) {
144:    if (!isConcept(r)) continue;

### Assistant | 2026-05-15T03:26:42.670Z

[tool_use: Read]

### User | 2026-05-15T03:26:43.665Z

[tool_result] 220	    } catch { /* rebuild */ }
221	  }
222	  try {
223	    const text = readFileSync(LEAF_INDEX, "utf8");
224	    const entries = [];
225	    const df = Object.create(null);
226	    for (const line of text.split(/\r?\n/)) {
227	      if (!line.trim()) continue;
228	      let r;
229	      try { r = JSON.parse(line); } catch { continue; }
230	      if (!r || !r.name) continue;
231	      const tok
... [+2064 chars truncated]

### Assistant | 2026-05-15T03:26:58.872Z

Good — the consumer hook is type-agnostic: `r.type || ""` stuffed into `category`. New `memory-*` types flow through cleanly. Now isConcept:

### Assistant | 2026-05-15T03:26:59.666Z

[tool_use: Read]

### User | 2026-05-15T03:27:00.427Z

[tool_result] 70	}
71	
72	const OLLAMA_HOST = process.env.OLLAMA_HOST || "127.0.0.1:11434";
73	const OLLAMA_URL = `http://${OLLAMA_HOST.replace(/^https?:\/\//, "")}/api/embeddings`;
74	
75	// Concept entry types worth a vector. Actions excluded unless --include-actions.
76	const CONCEPT_TYPES = new Set([
77	  "engine", "dispatcher", "registry", "architecture", "skill", "hook",
78	  "formula", "algorithm", "mile
... [+1323 chars truncated]

### Assistant | 2026-05-15T03:27:10.914Z

Confirmed: `isConcept()` returns `CONCEPT_TYPES.has(t) || true` → always-true via the `|| true` default-include path. `memory-*` types pass.

Now let me verify the symlink question and the flat-file (no `name` frontmatter) case carefully. The `devops_improvements.md` file at the top level has frontmatter with `kind: mirrored_memory` and source_filename, NO `name`, NO `metadata.type`, NO `fm.type`. The path-segment fallback would be `null` because `rel` is just `devops_improvements.md` (no slash). So `metaType = "uncategorized"`, type = `"memory-uncategorized"`. Good — code matches the contract claim at lines 268-269.

But there is a subtle bug. Let me also check the path-segment fallback for a SECOND-level subdir case (contract Q2):

A file at `feedback/sub/foo.md`: `rel = "feedback/sub/foo.md"`, `rel.split("/")[0] = "feedback"`. That's correct — the top-level category. Good.

Now the dedup edge case: same memory under TWO different category subdirs. If `feedback/foo.md` is walked first, `seenMemoryNames` adds its `name` (likely `foo` from basename if no frontmatter `name`). If then `reference/foo.md` exists with the same slug — it gets skipped. Is that desired? In practice memories follow a strict naming convention (`feedback_*`, `reference_*`), so same basename across two category dirs is unlikely. But it's a silent first-write-wins.

Let me check one more thing — symlink walking:

### Assistant | 2026-05-15T03:27:11.872Z

[tool_use: Grep]

### User | 2026-05-15T03:27:12.552Z

[tool_result] No files found

### Assistant | 2026-05-15T03:27:44.914Z

`walkMd` uses `readdirSync({ withFileTypes: true })` and tests `e.isDirectory()` / `e.isFile()`. On Node, `Dirent.isDirectory()` returns `true` for a directory **OR** for a symlink-to-directory because by default `withFileTypes` reads the entry as-resolved on Windows but as-lstat on POSIX. **This means a symlink loop COULD hang the indexer on POSIX**, but the contract states the live path is Windows. Symlink loops are also unlikely in `knowledge/memories/` which is auto-mirrored by `memory-mirror-to-vault.mjs`. Still, this is a P2 robustness gap that pre-existed (same `walkMd` is used for ARCH_DIR / TRIBAL_DIR / CODE_TRIBAL_DIR with no symlink protection) — not introduced by the change.

Now the frontmatter parser nested-object concern (Q4). Look at the parser carefully:

The parser is **scalar-only with array exception**. When it sees `metadata:` with empty `rawVal`, it falls into the non-array branch: `fm[key] = rawVal.replace(...)` → `fm["metadata"] = ""` (empty string). Then the subsequent indented `node_type: memory` / `type: feedback` lines: `raw` = `"  node_type: memory"`. The seq regex `^\s+-\s+` does NOT match (no `-`). Then `raw.trim() !== ""`, not a comment, falls to kv match `^([a-z_-]+)\s*:\s*(.*)$/i` — **WILL match `node_type: memory`** at the top level, polluting `fm.node_type` and `fm.type` (then `type: feedback` matches and sets `fm.type = "feedback"`).

**Net effect on the memory-typing logic at lines 271-275:**
- `fm.metadata` = `""` (string, not object), so `fm.metadata && typeof fm.metadata === "object"` is FALSE → skips the metadata.type branch
- Falls to `fm.type || pathSegment || "uncategorized"`
- `fm.type` was set to `"feedback"` by the orphaned indented line (a happy accident!)
- Result: `type = "memory-feedback"` ✓

For `feedback_alpha_owns_reaper.md`, the file at `feedback/feedback_alpha_owns_reaper.md` has `metadata: type: feedback`. The orphan-line parsing accidentally sets `fm.type = "feedback"`. The path-segment fallback would also g
... [+3302 chars truncated]

### Assistant | 2026-05-15T03:27:45.771Z

[tool_use: Read]

### User | 2026-05-15T03:27:46.566Z

[tool_result] 1	---
2	schema_version: 1.0.0
3	kind: mirrored_memory
4	source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/reference_lathe_handoff.md
5	source_filename: reference_lathe_handoff.md
6	content_hash: de0e6cd125a5e00171688bf9dd7908837108c02eb9b7f93d0d426cc9fc03f6fb
7	mirror_ts: 2026-05-05T13:00:09.537Z
8	mirror_engine: ObsidianMemorySyncEngine
9	---
10	Any time the user wants to con
... [+384 chars truncated]

### Assistant | 2026-05-15T03:27:53.611Z

This is a P1 finding. `reference_lathe_handoff.md` at flat top-level has frontmatter with NO `name`, NO `type`, NO `metadata.type`. Path-segment = null. Result: `type = "memory-uncategorized"`.

But the file's NATURAL category is `reference` (from its slug prefix). The categorization is lost for flat-top-level files even though the slug encodes it.

Now the dedup `seenMemoryNames` issue — for this flat file `name = "reference_lathe_handoff"` (basename fallback). When the subdir copy at `knowledge/memories/reference/reference_lathe_handoff.md` is walked LATER (walk order: top-level files at `r…` come before subdir `r…` because `reference_*` flat files appear sequentially with subdir interleaved by sort order)... let me verify:

### Assistant | 2026-05-15T03:27:55.659Z

[tool_use: Bash]

### User | 2026-05-15T03:27:59.241Z

[tool_result]  70 D reference
 71 F reference_blueprint_ocr_training_ms1_collision.md
 72 F reference_box_programs.md
 73 F reference_harness_hang_prevention.md
 74 F reference_lathe_handoff.md
 75 F reference_memory_seeding.md
 76 F reference_prism_inventory.md
 77 F reference_reverse_merge_then_ff_only.md

### Assistant | 2026-05-15T03:28:11.376Z

Walk order: **`reference/` (DIR) at index 70 → walks subdir RECURSIVELY → THEN sibling flat files at 71+**. So `walkMd` returns subdir files FIRST, then flat-top-level files. This confirms the comment's claim that "subdir copy is encountered before the flat copy" → **subdir wins via dedup**, which is the desired behavior (subdir copies have proper frontmatter, flat copies often don't).

Good. The dedup actually rescues the flat-file-with-bad-frontmatter case because the subdir copy (which has `name:` + `metadata: type:`) is added to `seenMemoryNames` FIRST, then the flat copy is skipped by the `seenMemoryNames.has(name)` check on line 258. Wait — the flat copy has `name = "reference_lathe_handoff"` (from basename fallback since no `fm.name`). Does the subdir copy with proper `fm.name = "reference_lathe_handoff"` collide? Yes — same string. Dedup correctly fires. ✓

Now the **really important edge case**: a flat file whose slug is unique and has NO subdir counterpart. `devops_improvements.md` is exactly this case: no `feedback/devops_improvements.md` exists. Result: ONE entry with `type = "memory-uncategorized"`. The slug prefix `devops_improvements` is NOT a category, so even slug-prefix heuristics couldn't have helped. The contract caveat at lines 266-269 explicitly notes this: "for a flat top-level file like `devops_improvements.md` the first segment IS the filename, which would mint a useless one-off type". Default to `"uncategorized"` is the right call. ✓

Final concerns — let me confirm the unused-MEMORIES_DIR diagnostic mentioned in the contract (Q6) is gone, by re-scanning the script for references:

### Assistant | 2026-05-15T03:28:12.818Z

[tool_use: Grep]

### User | 2026-05-15T03:28:13.400Z

[tool_result] 50:const MEMORIES_DIR = process.env.PRISM_WIKI_MEMORIES_DIR || resolve(PRISM_ROOT, "knowledge/memories");
245:  if (existsSync(MEMORIES_DIR)) {
246:    for (const f of walkMd(MEMORIES_DIR)) {
249:      const rel = relative(MEMORIES_DIR, f).replace(/\\/g, "/");

### Assistant | 2026-05-15T03:29:31.706Z

MEMORIES_DIR is used at lines 245/246/249 — diagnostic resolved. ✓

Inline-constant violations: I checked — `DESC_MAX`, `MAX_BOOST_KEYWORDS`, all corpus dir paths, ARRAY_KEYS — all canonicalized. Type prefix `"memory-"` is a literal string format token (not a physics/business constant). ✓

Dispatcher wiring (Q7): this is a `scripts/` regen, not an engine — no dispatcher wiring is required. The output `_leaf-index.jsonl` is consumed by `wiki-precheck-inject.mjs` (passive type-agnostic reader) and `build-wiki-embeddings.mjs` (default-include). ✓

Honest stub assertions (Q8): no stubs introduced; the dedup `seenMemoryNames` Set, the path-segment fallback, and the `.md` strip are all real defensive logic with verifiable behavior. ✓

I have enough to grade.

---

## Code Quality Analysis Report

### Summary
- **Overall Quality Score: 8.5 / 10**
- **Files Analyzed:** 1 (`H:/prism/scripts/build-wiki-leaf-index.mjs`)
- **Contract Compliance:** Honored — with 1 P1 truthiness gap, 2 P2 documented edge cases
- **Technical Debt Estimate:** ~1 hour (one tightening edit + one comment correction)

### Grade: **PASS** (with P1 noted below — does not block ship; data-quality is structurally sound, dedup works as advertised, consumer hooks tolerate the new type universe)

### Rationale
The fourth corpus integration is correct in practice and the dedup logic actually does what the comment claims (verified empirically: `feedback/` directory is enumerated at index 2 BEFORE the `feedback_*.md` flat files at index 3+ in `readdirSync`; same pattern for `reference/`, `project/`, `user/`, etc — Windows lex order with `_` (0x5F) > alpha keeps the bare-name subdir first). The path-segment fallback correctly rescues categorization for subdir-mirrored files. Flat top-level files with no subdir counterpart degrade to `memory-uncategorized` (documented intent, lines 266-269). Consumer hook (`wiki-precheck-inject.mjs:238`) is type-agnostic (`category: r.type || ""`). Embeddings builder defaults to 
... [+10756 chars truncated]
