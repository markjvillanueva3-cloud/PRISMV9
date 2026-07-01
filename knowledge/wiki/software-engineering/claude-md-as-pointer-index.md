---
name: claude-md-as-pointer-index
category: software-engineering
domain: backend-dev
tags: [claude-md, pointer-index, doctrine, line-budget, prism-development, ai-development]
last_updated: 2026-05-18
---

# CLAUDE.md as Pointer Index — discipline for the always-loaded doctrine surface

CLAUDE.md is loaded into EVERY chat's context on EVERY prompt. It's the most-leveraged doctrine surface in PRISM — and the most token-expensive. Three rails keep it useful + compact.

## The ≤200 line rule

The empirical finding (from the @Mnilax article that gave PRISM its R5-R12 rules): past ~200 lines total, CLAUDE.md compliance collapses. Models stop honoring all the rules and start cherry-picking what they remember.

PRISM's CLAUDE.md is currently FAR over 200 lines, but the EXPECTATION is moving toward compliance via the OBSOLESCENCE-CLEANUP-MS0/U-OBS-F2 collapse-milestones tool. Long-term direction: collapse milestone narratives to wiki pointers; CLAUDE.md retains only the load-bearing doctrine + Recent regressions ledger.

## What CLAUDE.md SHOULD contain

- The 12-rule discipline header (R1-R12 with one-line each)
- Canonical paths (engine/dispatcher/registry/hook locations)
- The Recent regressions ledger (append-only, indefinite)
- High-leverage hooks + gates (the 25 hard-block hooks named)
- One-paragraph pointers to wiki entries for each milestone/feature
- Knobs that operators actually use (env vars for disable/enable)

What CLAUDE.md SHOULD NOT contain:
- Multi-paragraph milestone narratives → collapse to wiki pointer
- Full code examples → wiki entries
- API specifications → schema files or dispatcher docstrings
- Historical "we used to do X, now we do Y" → memory files or regression entries
- Per-engine docs → engine docstring + wiki

## The collapse-milestones tool (U-OBS-F2, 2026-05-17)

`scripts/claude-md-collapse-milestones.mjs` analyzes CLAUDE.md, finds milestone narratives that have a corresponding wiki page, and collapses them to one-line pointers. Live dry-run showed potential 783→334 lines.

Idempotency: it checks the headerPrefix FIRST then replacement-presence (Reviewer A P1 fix). Re-running on already-collapsed sections is a no-op.

Live application is DEFERRED because CLAUDE.md is owned by a peer chat — coordinate via chat-bus before applying.

## The pointer pattern

A milestone narrative gets collapsed to:

```
## MILESTONE-MS0 (2026-05-DD, N units) — one-line headline
> Doctrine + artifact map at [[wiki-name]]. Knobs: ENV_VAR_1, ENV_VAR_2.
```

The wiki entry carries the detail. CLAUDE.md retains the headline + cross-link.

## The "Recent regressions" exception

This section is APPEND-ONLY and grows over time. Don't collapse it. Each entry is a fail-on-revert mark. The ledger IS the doctrine for "what NOT to do again".

Lines per entry: 1 (date | headline | observed-in | fix | verify) for trivial; up to 8 lines for high-leverage regression classes. The 2026-05-18 regression-prevention-doctrine documents the format.

## How CLAUDE.md gets loaded

The harness reads CLAUDE.md into the system prompt on EVERY session. Auto-resume after /compact also re-reads. The cost is per-prompt + per-session-start.

Current PRISM CLAUDE.md is ~50KB. At ~3.5 tokens/byte that's ~14k tokens — significant against a 30k/session R6 ceiling.

## The "edit CLAUDE.md in a peer chat" rule

CLAUDE.md is shared state. If a peer chat is editing it, your edit will conflict. Protocol:

1. `prism_context:claim_file CLAUDE.md` — claim before editing
2. Edit, commit, release
3. If claim fails: post to chat-bus what you wanted to add; the owning chat will integrate

For Recent regressions entries specifically: the `regression-auto-write.mjs` Stop hook automates this — your commit message + diff scan produces a regression entry without manual CLAUDE.md edits.

## The "patch-sibling" convention for peer-locked surfaces

When CLAUDE.md is peer-claimed and you have a doctrine update that can't wait, write a patch-sibling at:

```
state/shared/dashboards/patches/CLAUDE-MD-PATCH-<topic>-<date>.md
```

The owning chat reads patch-siblings on next session and integrates. This is the "elevation" pattern from U-DOC-REFLECTION-GATE-WITH-PATCH-SIBLINGS.

## CLAUDE.md sections (canonical structure)

The current PRISM CLAUDE.md has these top-level sections:
1. EXPERT ROLE / TOKEN ECONOMY / KARPATHY DISCIPLINE / R5-R12
2. FAST RESOURCE LOOKUP (digests + DSL shortcodes + quick paths)
3. AI SYSTEM ROUTING / DEVELOPMENT SKILLS / HOOK ENFORCEMENT GATES
4. MULTI-AGENT PATTERNS / SAFETY RAILS
5. PER-FILE SCRUTINY GATE / SCRUTINY GATE (UNIVERSAL)
6. PER-CHAT HANDOFF / SESSION CONTINUITY STACK / GOLF SLOT
7. ENGINE WIRING / MCP DISPATCHERS / MANDATORY SELF-AWARENESS
8. CRITICAL SLASH COMMANDS / TEST SHOP / KNOWLEDGE VAULT
9. WIKI PROTOCOL / CREATIVE REASONING / Recent regressions
10. Milestone-specific pointers (target: collapse to one-paragraph each)

## When to add a new top-level section

Almost never. Adding a section is a high-friction change. Prefer:
- Add a pointer paragraph under an existing section
- Add a wiki entry + cross-link from existing CLAUDE.md text
- Add to Recent regressions if it's a fix-doctrine entry

A new top-level section is only justified for a fundamentally new mechanism (e.g. SLOT-WORKTREE-MS0 warranted its own section because it changed how every chat operates).

## Verification

After editing CLAUDE.md:
- Line count: `wc -l H:/prism/CLAUDE.md`. Trending up = future collapse needed.
- Cross-link check: every `[[name]]` should resolve to a wiki entry that exists.
- Pointer freshness: a pointer to "U-XXX (2026-04-01, in progress)" that's now complete should update to "U-XXX (complete 2026-04-15)".

## Related

- [[doc-reflection-rule]] — CLAUDE.md is surface 1 of the 4
- [[memory-curation-discipline]] — CLAUDE.md is NOT a 6th namespace
- [[regression-prevention-doctrine]] — Recent regressions format
- [[wiki-index-and-discovery]] — wiki entries hosted by CLAUDE.md pointers
- CLAUDE.md itself — the canonical instance
- OBSOLESCENCE-CLEANUP-MS0/U-OBS-F2 — collapse tool
