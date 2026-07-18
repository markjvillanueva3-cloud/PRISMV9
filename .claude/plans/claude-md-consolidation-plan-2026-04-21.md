# CLAUDE.md Consolidation Plan — 2026-04-21

## Current state: 4 files, layered hierarchy

| File | Lines | Purpose | Writable |
|---|---:|---|---|
| `H:\.claude\CLAUDE.md` | 262 | **Global ops playbook** (cross-PC, plugins, MCPs, auto-invoke) | ✓ (just written) |
| `H:\CLAUDE.md` | 308 | PRISM root master — deep detail on pipelines, physics, handoffs | ✗ (hook-protected) |
| `H:\PRISM\CLAUDE.md` | ~unknown | Project-level PRISM rules (safety, dispatchers, schema versioning) | ✓ |
| `H:\PRISM\mcp-server\CLAUDE.md` | ~unknown | Subproject — build commands, engine categories, JM Die, creative reasoning | ✓ |

Claude Code loads nearest + all ancestors → when cwd=`H:\PRISM\mcp-server`, **all 4 are active**.

## Identified duplication (manual review)

| Content | In how many files | Recommended home |
|---|:-:|---|
| Expert role directive | 2 (global + root) | **global only** |
| Canonical physics constants (kc1.1 values) | 3 (global + root + mcp-server) | **mcp-server only** (closest to enforcement hook) |
| "Never inline Kienzle/Taylor" | 4 (all) | **global mentions, mcp-server details** |
| Build commands (`npm run build:fast`, etc.) | 2 (root + mcp-server) | **mcp-server only** |
| JM Die test-shop facts | 3 (global + root + mcp-server) | **mcp-server only** (domain scope); global keeps a one-liner pointer |
| PRISM inventory reference | 4 (all) | **root only**; others point |
| Dispatcher list | 3 (global + root + mcp-server) | **global has top-11 table; mcp-server has full 90**; root deprecated |
| Engine categories | 2 (global + mcp-server) | **mcp-server only** (domain); global pointer |
| Self-awareness / duplication guard | 4 (all) | **global has API summary; mcp-server has full code example** |
| Per-chat handoff | 3 (global + root + mcp-server) | **global only** (cross-project concept) |
| Auto-invoke trigger rules | 2 (global + mcp-server) | **global only** |
| RTK | 2 (global + root's header) | **global only** |
| Cross-PC portability | 1 (global) | ✓ right home |

## Proposed end state

```
H:\.claude\CLAUDE.md         ←  Global ops playbook — plugins, MCPs, cross-PC, auto-invoke, RTK, checklist  (~220 lines after trim)
H:\PRISM\CLAUDE.md           ←  PRISM project rules — safety, dispatcher index pointer, schema versioning, session hygiene  (~80 lines)
H:\PRISM\mcp-server\CLAUDE.md ← Deep PRISM detail — build/test, physics constants table, JM Die facts, creative reasoning, engine categories, duplication guard code  (~180 lines)
H:\CLAUDE.md                 ←  RETIRE. Move residual content to root CLAUDE.md, leave 3-line pointer: "see H:\PRISM\CLAUDE.md and H:\.claude\CLAUDE.md"
```

Net savings: ~400 lines of duplication eliminated across the 4 files.

## Why not consolidate to 1 file
Claude Code loads by cwd. A monolithic master loads for every cwd — wastes tokens when user works outside PRISM. Layered is optimal: global loads everywhere, project-specific only when relevant.

## Blocker on H:\CLAUDE.md
Edit attempt errored `EPERM: mkdir 'H:\'`. Either `protect-document-content.mjs` or `document-preserve-guard.mjs` is blocking. Three options:
1. Temporarily disable the hook, edit, re-enable.
2. Delete + Write a new H:\CLAUDE.md (Write succeeded for H:\.claude\CLAUDE.md but failed for H:\CLAUDE.md once — needs test).
3. Leave H:\CLAUDE.md alone, update the other 3 to handle all content.

**Recommended:** option 3 (leave H:\CLAUDE.md as archival/legacy). The global master at H:\.claude\CLAUDE.md is the real load point.

## Execution phases
Phase 1 — trim duplication (safe, reversible):
  - Edit `H:\PRISM\CLAUDE.md` to remove content now in global master; replace with 1-line pointers.
  - Edit `H:\PRISM\mcp-server\CLAUDE.md` to remove content now in global; keep domain depth.
Phase 2 — add pointers to legacy H:\CLAUDE.md:
  - Try Write; if blocked, accept legacy status.
Phase 3 — verify: open a session in each cwd, count tokens loaded.

Not executing now; captured plan for a focused follow-up.
