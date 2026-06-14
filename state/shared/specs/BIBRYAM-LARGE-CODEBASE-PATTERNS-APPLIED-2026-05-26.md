# Bibryam "Adapt Claude Code to Large Codebases" — applied to PRISM (2026-05-26, slot:alpha)

**Source:** Bilgin Ibryam (@bibryam) X article 2059359166188208142, 2026-05-26: "How to Adapt Claude Code to Large Codebases" — 8 of 13 patterns based on Anthropic's guidance. Full post: [generativeprogrammer.com/p/how-teams-scale-claude-code-across](https://generativeprogrammer.com/p/how-teams-scale-claude-code-across).

**Why this matters here:** PRISM is exactly the codebase the article describes — large monorepo (32k+ files), multiple domain teams (mill/lathe/wedm/cad/cam), generated/vendored noise, undocumented ownership boundaries, knowledge spread across CLAUDE.md (74KB) + wiki (722 entries) + memories (641 entries) + system-viz graph (110K nodes).

## Per-pattern PRISM gap analysis

### 1. Context Cascade Pattern — **HIGH ROI gap**
- **Pattern:** Multiple CLAUDE.md files at directory levels. Root = globals + critical gotchas. Subdirs = local commands, conventions, domain terms, tests. Claude loads them path-cascade.
- **PRISM state:** ONE root CLAUDE.md (74KB, 610 lines). All mill/lathe/wedm/cad/cam knowledge lives there. Slot-soul injection layer (`slot-soul-inject.mjs`) covers per-SLOT specialization but doesn't pivot on CWD.
- **What to ship:** Per-domain `mcp-server/src/engines/{mill,lathe,wedm,cad,cam}/CLAUDE.md` files with local conventions + canonical-constants reminders + per-domain test commands.
- **Depends-on:** None.
- **Blocks:** A future `U-CLAUDE-MD-PRUNE` (shrink root from 74KB to ≤200 lines per the doctrine in §JULIETT-12CHAT-ALLOCATION-MS0).

### 2. Repo Map Pattern — **MEDIUM ROI gap**
- **Pattern:** Small root Markdown with top-level folder name + owner + purpose + entry points. Boring + factual.
- **PRISM state:** `mcp-server/data/docs/DIRECTORY_DIGEST.md` covers 215 directories (comprehensive but large). No tight ~50-line root-level repo map.
- **What to ship:** `REPO_MAP.md` at H:/prism/ root — top-15 directories only, 1 line each: name, owner-slot, purpose, entry point.
- **Depends-on:** None — DIRECTORY_DIGEST already has the data.
- **Blocks:** Orientation cost for new chats; current SessionStart injection has to do its own digest.

### 3. Noise Filter Pattern — **HIGHEST ROI gap (ship-now)**
- **Pattern:** Commit default exclusions in `.claude/settings.json` so every developer inherits the same Glob/Grep defaults.
- **PRISM state:** 14,058 uncommitted modified files + 28,000+ untracked (per session-start git status). Every Glob/Grep over `H:/prism/` includes ALL of them. Direct evidence: this session has had MULTIPLE Grep/Glob timeouts hitting that volume.
- **What to ship:** `.claude/settings.json` permission rule + `permissions.deny` style exclusions for `H:/prism/extracted_modules/**`, `H:/prism/state/shared/system-viz/staging/**`, `H:/prism/JM DIE/**`, `H:/prism/data/extracted_*/**`, `node_modules/**`, `dist/**`, `.git/**`, `*.bak-*`, `*.tmp`.
- **Depends-on:** None.
- **Blocks:** Glob/Grep performance fleet-wide. This is the dominant Glob/Grep latency cause.
- **Risk:** Excluding too much hides legitimate files. Mitigation: conservative defaults + document per-file-pattern override commands.

### 4. Symbol Lookup Pattern — **MEDIUM ROI gap**
- **Pattern:** LSP integration so Claude resolves symbols via Language Server Protocol instead of text search.
- **PRISM state:** `LSP` tool is available in the harness (goToDefinition, findReferences, hover, documentSymbol, workspaceSymbol). Master-index pre-search injector partially fills this (top-K graph hits before Grep). LSP itself isn't surfaced by any hook.
- **What to ship:** `pre-grep-lsp-hint-inject.mjs` PreToolUse hook — when Grep target is a symbol-like pattern (CamelCase, camelCase, snake_case identifier), nudge with "try LSP.workspaceSymbol or LSP.findReferences first".
- **Depends-on:** None.
- **Blocks:** Wasted Grep fires for symbol lookups; would compound with Phase-4 C1 backendAuditChain retune.

### 5. Just-in-Time Skill Pattern — **LOW (already implemented)**
- **PRISM state:** `skill-auto-trigger.mjs` already implements keyword-based JIT skill loading per `_skill-triggers.jsonl`. Documented in CLAUDE.md §DEV-VELOCITY-AUTOTRIGGER-MS0.
- **What to ship:** Nothing — already shipped.

### 6. Scoped Skill Pattern — **HIGH ROI gap**
- **Pattern:** Skills bound to paths via globs in metadata; local expertise stays near local code.
- **PRISM state:** ~200+ skills, all globally visible. `lathe-studio`, `mill-studio`, `wire-edm-studio` skills are available everywhere — wastes prompt space when working outside those domains. Slot wrappers (`checkin-alpha`, `checkin-papa`, etc.) hint at domain affinity but don't path-scope.
- **What to ship:** Extend `_skill-triggers.jsonl` schema with optional `pathGlob` field. `skill-auto-trigger.mjs` checks cwd against pathGlob before suggesting the skill.
- **Depends-on:** Existing `skill-auto-trigger.mjs` + schema extension.
- **Blocks:** Skill-noise pollution; ~200 skills compete for the same `💡 Skill auto-trigger` injection budget.

### 7. Scout Subagent Pattern — **LOW (already adopted)**
- **PRISM state:** Agent tool with `subagent_type="Explore"` is read-only by definition. CLAUDE.md operating-rules already says "delegate broad research to Agent with Explore subagent". Pattern established.
- **What to ship:** Nothing — doctrine already in CLAUDE.md.

### 8. Search-as-a-Tool Pattern — **LOW (already shipped, just needs take-rate improvement)**
- **PRISM state:** `prism_session:master_index_query`, `prism_knowledge:search`, `prism_session:dispatcher_map_compact`, `prism_dev:code_search` all exist. Master-index covers the system-graph (110K nodes) including wiki + memory. The issue is TAKE-RATE (0.2% as of this session), not availability.
- **What to ship:** This session's Phase-4 C1 (backendAuditChain retune, commit `ce605dfb39`) + Phase-5 Wave-2 take-rate measurement infrastructure already address it.

## High-ROI ship sequencing for next iters

| Rank | Pattern | Unit ID | Effort | Token-savings potential |
|------|---------|---------|--------|------------------------|
| 1 | #3 Noise Filter | U-BIBRYAM-3-NOISE-FILTER | ~10 lines settings.json | Massive — every Glob/Grep affected fleet-wide |
| 2 | #6 Scoped Skill | U-BIBRYAM-6-SKILL-PATH-GLOB | ~30 LOC + schema | Per-prompt skill-trigger injection budget reclaimed |
| 3 | #1 Context Cascade | U-BIBRYAM-1-CONTEXT-CASCADE | 5 new CLAUDE.md files | Domain-specific context only when working in that domain |
| 4 | #4 Symbol Lookup | U-BIBRYAM-4-LSP-HINT | ~50 LOC + 1 new hook | Reduce Grep on symbol patterns |
| 5 | #2 Repo Map | U-BIBRYAM-2-REPO-MAP | ~50-line MD file | Marginal — DIRECTORY_DIGEST already covers it |

## PSN-leg synergy map

- **#1 Context Cascade** → Leg #1 (Obsidian brain) + Leg #2 (PRISM OS) — local conventions cached at the directory level join the brain
- **#3 Noise Filter** → Leg #6 (System Viz) — graph queries faster; reduces stale `system-viz-regen FAILED` cycle root cause (28k file scan)
- **#6 Scoped Skill** → Leg #5 (Tribal) + Leg #11 (PRISM AI router) — skills become path-aware = domain-specialized routing
- **#4 Symbol Lookup** → Leg #6 (System Viz) — LSP is the symbol-graph analog of master-index for code-symbol-graph
- **#2 Repo Map** → Leg #2 (PRISM OS) + Leg #6 (System Viz) — orientation substrate

## Cross-refs

- Article: [How to Adapt Claude Code to Large Codebases](https://x.com/bibryam/status/2059359166188208142)
- Long-form: [generativeprogrammer.com/p/how-teams-scale-claude-code-across](https://generativeprogrammer.com/p/how-teams-scale-claude-code-across)
- Sibling enumerations: `DORMANT-FEATURES-ENUMERATION-2026-05-26.md` (Phase-1, Phase-4 shipped) + `DORMANT-FEATURES-PHASE5-TELEMETRY-GAP-2026-05-26.md` (Phase-5 wires shipped iter11-15)
- CLAUDE.md §JULIETT-12CHAT-ALLOCATION-MS0 (slot-soul = runtime analog of Context Cascade)
- CLAUDE.md §DEV-VELOCITY-AUTOTRIGGER-MS0 (already implements #5 JIT skills)
