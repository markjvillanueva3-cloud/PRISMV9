# CLAUDE.md Duplication Candidates — Advisory
**Date:** 2026-05-17 · slot mike · OBSOLESCENCE-CLEANUP-MS0/U-OBS-C2
**Generator:** `comm -12` of L2 headings between project + global CLAUDE.md

## 2 shared L2 headings detected

| Heading | Project line | Global line | Proposed canonical |
|---|---|---|---|
| `## EXPERT ROLE (ALWAYS ACTIVE)` | 3 | 7 | **Global** (cross-project doctrine) |
| `## GOLF SLOT (7th hygiene chat — CLEANUP-MS0)` | 137 | 136 | **Project** (PRISM-specific slot semantics) |

## Why not collapse now

Per the plan's risk register (entry C3 / now C2 after Phase F insertion):
> "C2 (collapse sections) breaks chats reading the moved section. Mitigation: Phase C2 LAST; emit deprecation pointer in both files for 7 days before removal."

We're mid-session with **2 peer chats active** in the same shared tree. A destructive content collapse risks confusing concurrent chats whose context includes the pre-collapse text.

## 7-day grace window

**Phase A (this session, NOW):** Emit cross-ref pointers in each duplicated section pointing to the other file. Both bodies remain.

**Phase B (after 7 days, ≥2026-05-24):** Operator confirms no live chats have stale context referring to the duplicate; then:
- For **EXPERT ROLE**: keep global body verbatim, replace project body with `## EXPERT ROLE → see C:/Users/wompu/.claude/CLAUDE.md §EXPERT ROLE` pointer (single line).
- For **GOLF SLOT**: keep project body verbatim, replace global body with same shape.

**Phase C (no fixed date):** Reverse-merge: integrate any project-specific elaboration into the global doctrine if applicable.

## Cross-ref inserts (Phase A this session)

Both files annotated with `<!-- DUPLICATE-CANDIDATE: see <other-file>... -->` HTML comments at the top of the section. Comments are invisible to rendered markdown but searchable for the Phase B collapse.

## Verify

```bash
comm -12 <(grep '^## ' H:/prism/CLAUDE.md | sort -u) <(grep '^## ' C:/Users/wompu/.claude/CLAUDE.md | sort -u)
```
Expected at Phase A close: still returns 2 lines (cross-refs added, bodies preserved).
Expected at Phase B close: returns 0 lines (one body collapsed to pointer in each).

## Out-of-scope shared content (deeper duplication)

L2 heading match is a coarse signal. Deeper prose duplication exists between:
- Project §KARPATHY DISCIPLINE vs Global §KARPATHY DISCIPLINE (mental checklist) — different L2 headings ("KARPATHY DISCIPLINE" vs "KARPATHY DISCIPLINE (mental checklist every 5 tasks)") so they don't match `comm`
- Project §TOKEN ECONOMY vs Global §TOKEN ECONOMY
- Project §RTK section vs Global §RTK (Rust Token Killer) section

These three are full-paragraph duplications that the heading-only diff doesn't catch. Follow-up: run a paragraph-level fingerprint diff in a future audit.
