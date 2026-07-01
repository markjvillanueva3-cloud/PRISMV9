---
name: bibryam-large-codebase-8-patterns
description: "Bibryam's 8 patterns for Claude Code in large codebases (Context Cascade, Repo Map, Noise Filter, Symbol Lookup, Just-in-Time Skill, Scoped Skill, Scout Subagent, Search-as-a-Tool). PRISM is the literal namesake of pattern 1 — coverage map shows PRISM at 7.5/8. Source — x.com/bibryam/status/2059359166188208142 2026-05-26."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.477Z
aliases: reference_bibryam_large_codebase_8_patterns_2026_05_28
---


## Context
PRISM's `CLAUDE.md §DOMAIN-GALAXY-DOCTRINE-MS0` already cites "Bibryam Context Cascade" as the canonical pattern for per-domain context partitioning. PRISM has already shipped commit `U-BIBRYAM-LARGE-CODEBASE-PATTERNS-APPLIED` (slot:alpha /loop iter16, ref `a7729181a` per the regressions list). This newer tweet is the canonical published reference; this memory maps PRISM coverage per pattern.

## The 8 patterns (Bibryam, x.com/bibryam, 2026-05-26)

### 1. Context Cascade Pattern ✅ PRISM CANONICAL
Multiple CLAUDE.md files at directory levels. Root = global rules + pointers. Subdirs = local commands/conventions.

**PRISM:** DOMAIN-GALAXY-DOCTRINE-MS0/MS1 → 5 galactic-center sentinels → expanded to 24 per-slot galaxies (this session). `mcp-server/src/engines/<galaxy>/CLAUDE.md` per chat slot domain.

### 2. Repo Map Pattern ✅ PRISM
Small markdown at root: folder | owner | purpose | entry points. No essays.

**PRISM:** `DIRECTORY_DIGEST.md` (215 dirs with purposes) + `ENGINE_DIGEST.md` (engines + 1-line each) + `DISPATCHER_DIGEST.md`. Plus per-slot `PATHS.md` (H:/-wide path atlas — shipped this session).

### 3. Noise Filter Pattern ✅ PRISM
Commit default exclusions in `.claude/settings.json`. Exclude generated files, vendor deps, snapshots.

**PRISM:** `.claude/settings.json` permissions deny + matchers + hooks excludes. Plus the c-to-h mirror excludes (cache/locks/credentials/statsig/shell-snapshots/ide).

### 4. Symbol Lookup Pattern ⚠ PRISM PARTIAL
LSP-based symbol resolution instead of text search.

**PRISM:** No LSP integration. `prism_session:master_index_query` (BM25 graph search) is the closest substitute — graph-resolved lookup, not LSP. Mostly works for typed engines, weaker for `(symbol_name).resolve()` inquiries.

**Gap:** could wire actual LSP via Claude Code's `LSP` tool (already in tool list per system reminders). Worth adding to per-slot TOOLBELT.md for typed-language slots (papa = backend-helper, foxtrot = mill, etc).

### 5. Just-in-Time Skill Pattern ✅ PRISM
Skills load on demand, not in base context.

**PRISM:** ~440 skills with `skill-auto-trigger.mjs` UserPromptSubmit hook reading `_skill-triggers.jsonl`. The 48 per-slot skill wrappers (`/galaxy-buildout-<slot>` + `/smart-<slot>`) generated this session extend this pattern.

### 6. Scoped Skill Pattern ⚠ PRISM PLANNED-NOT-SHIPPED
Bind skills to specific paths so they only auto-load when relevant subdir is touched.

**PRISM:** Skills exist but aren't path-scoped. Per CLAUDE.md `§DOMAIN-GALAXY-DOCTRINE-MS0`: "Next phase B (path-scoped skills) gated by `PRISM_SKILL_AUTO_TRIGGER_DISABLE=1` — re-enable before shipping." This is the **one** pattern PRISM has explicitly planned but not yet enabled.

**Action:** re-enable `PRISM_SKILL_AUTO_TRIGGER` once path-scoped skill triggers are validated. Then per-slot skills (e.g. `/galaxy-buildout-mill`) only fire when `cwd` is under the relevant galaxy subtree.

### 7. Scout Subagent Pattern ✅ PRISM
Read-only subagent for discovery; writes findings to a file; main agent reads summary.

**PRISM:** `Agent` tool with `Explore` subagent type. Operator-confirmed (this session) that parallel 4-reviewer dispatch with `isolation: worktree` is the canonical pattern. The /forge-audit-v2 + scrutiny-3way + per-file scrutiny gate all use this.

### 8. Search-as-a-Tool Pattern ✅ PRISM
Connect Claude to org search system via MCP. Backend agnostic.

**PRISM:** Three layers cover this:
- `prism_session:master_index_query` — unified ranked search across system-viz graph + Obsidian vault + capability index + BUILD_STATE
- `prism_knowledge:search` — wiki + tribal-tips search
- `prism_memory:semantic_search` + Qdrant — vector semantic search over MEMORY entries

## Score: PRISM at 7.5/8

| # | Pattern | Status |
|---|---------|--------|
| 1 | Context Cascade | ✅ canonical (we ARE this pattern) |
| 2 | Repo Map | ✅ |
| 3 | Noise Filter | ✅ |
| 4 | Symbol Lookup | ⚠ partial (graph not LSP) |
| 5 | Just-in-Time Skill | ✅ |
| 6 | Scoped Skill | ⚠ planned, gated |
| 7 | Scout Subagent | ✅ |
| 8 | Search-as-a-Tool | ✅ |

## Two action items

1. **Wire LSP into Pattern 4** — Claude Code's `LSP` tool already exists. Per-slot TOOLBELT.md should mention LSP usage for typed-language slots. Add to the brief generator.

2. **Re-enable path-scoped skills (Pattern 6)** — unblock `PRISM_SKILL_AUTO_TRIGGER` once the Phase B path-binding validates. Per-slot `/galaxy-buildout-<slot>` and `/smart-<slot>` would only auto-suggest when cwd is under the slot's galaxy subtree.

Source: x.com/bibryam/status/2059359166188208142, 2026-05-26, 12.7K views.  
Full version: generativeprogrammer.com/p/how-teams-scale-claude-code-across

Related:
- [[reference_karpathy_obsidian_4layer_framework_2026_05_28]] — Cyril's complementary framework
- [[reference_zodchii_self_correcting_claude_md_2026_05_28]] — zodchii's self-correcting pattern
- [[feedback_master_index_system_viz_first]] — Pattern 8 enforcement
- CLAUDE.md §DOMAIN-GALAXY-DOCTRINE-MS0 — PRISM's canonical citation of Pattern 1
