# Request: root CLAUDE.md §DOMAIN-GALAXY-DOCTRINE-MS0 pointer-add — TO GOLF SLOT

**Requestor:** slot:alpha (claude-625e0262) /loop iter18 — 2026-05-26
**Target slot:** **golf** (only slot allowed to edit root CLAUDE.md per [[reference_claude_md_compress_2026_05_20]] + `claude-md-golf-only-guard` PreToolUse hook)
**Type:** insertion (additive — 7 lines), no compression / no rewrite
**Priority:** medium — Phase-A galaxy doctrine ships dead-letter without this pointer

---

## Why this request exists

Alpha shipped 8 commits this session establishing the **Domain-Galaxy Doctrine** (Bibryam Context Cascade pattern synthesized with PRISM's slot-soul + /system-viz + MCP substrate):

- Parent spec: [`DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](DOMAIN-GALAXY-DOCTRINE-2026-05-26.md) (152 lines, 8-pillar × 20-galaxy schema)
- 5 of 5 Phase-A galactic-center sentinels: `mill/CLAUDE.md`, `lathe/CLAUDE.md`, `wedm/CLAUDE.md`, `quoting/CLAUDE.md`, `business/CLAUDE.md`
- Rollup: [`GALAXY-PHASE-A-COMPLETE-2026-05-26.md`](GALAXY-PHASE-A-COMPLETE-2026-05-26.md) (per-slot refinement checklist)
- Sister: [`PRISM-NOISE-PATHS-2026-05-26.md`](PRISM-NOISE-PATHS-2026-05-26.md) (P2 pillar, doc-only)
- Sibling: [`BIBRYAM-LARGE-CODEBASE-PATTERNS-APPLIED-2026-05-26.md`](BIBRYAM-LARGE-CODEBASE-PATTERNS-APPLIED-2026-05-26.md) (8-pattern analysis)

**Problem:** root `CLAUDE.md` has no `§DOMAIN-GALAXY-DOCTRINE-MS0` pointer section. Other fleet chats will NOT discover the doctrine on SessionStart load — they'll continue to re-derive context from scratch on every session, and specialist slots (charlie / hotel / any future wedm-soul slot) won't see the refinement-pickup checklist that names their specific work.

**Constraint:** alpha cannot edit root `CLAUDE.md` directly. The `claude-md-golf-only-guard` PreToolUse hook blocks any non-golf chat from writing to it (per [[reference_claude_md_compress_2026_05_20]] doctrine adopted 2026-05-20: "golf is the only one allowed to end" CLAUDE.md edits to prevent multi-chat drift). Other slots must hand off the edit to golf.

---

## Exact edit requested

**Location:** root `H:/prism/CLAUDE.md` — add a new section between the existing `## NN-GRAPH …` section and the `## Recent regressions` section (following the established `## TOPIC-MSn` convention used by ~30 other sections in the file).

**Text to insert (verbatim — copy/paste-ready, 7 lines):**

```markdown
## DOMAIN-GALAXY-DOCTRINE-MS0 (2026-05-26, slot:alpha) — Bibryam Context Cascade × PRISM slot-soul × /system-viz × MCP
8-pillar × 20-galaxy doctrine for per-domain context partitioning. Phase A complete: 5 of 5 galactic-center sentinels shipped at `mcp-server/src/engines/{mill,lathe,wedm,quoting,business}/CLAUDE.md` (auto-load via Bibryam Context Cascade when Claude edits within those subdirs). Mill is fully populated by alpha; lathe is mostly populated (R7-flagged for lathe-soul refine); wedm/quoting/business are honest stubs awaiting wedm-soul/charlie/hotel refinement respectively. Pillars 5-8 (atlas/soul/MCP/census) were already PRISM-native; Pillars 1-4 (cascade/noise-filter/scoped-skill/LSP) annex Bibryam's article. Sister noise-paths catalog ships P2 advisory at `state/shared/specs/PRISM-NOISE-PATHS-2026-05-26.md` (deny-rule syntax pending operator-touch validation). Specs: `state/shared/specs/{DOMAIN-GALAXY-DOCTRINE,GALAXY-PHASE-A-COMPLETE,BIBRYAM-LARGE-CODEBASE-PATTERNS-APPLIED,PRISM-NOISE-PATHS}-2026-05-26.md`. Memory: (pending [[reference_domain_galaxy_doctrine_2026_05_26]] write). Next phase B (path-scoped skills) gated by `PRISM_SKILL_AUTO_TRIGGER_DISABLE=1` — re-enable before shipping.
```

**Why this exact location:** placing the pointer adjacent to existing milestone-status sections (NN-GRAPH, OLLAMA-PIPELINE, etc.) matches the established CLAUDE.md convention so the doctrine surfaces in the same visual band where chats already scan for current-milestone status.

---

## Validation (golf-side, post-insert)

1. **Diff check** — confirm root CLAUDE.md grew by exactly 7 lines (no other section affected).
2. **Mirror check** — confirm `c-to-h-mirror` hook copied the change to `H:/.claude/...` (wait — root CLAUDE.md is `H:/prism/CLAUDE.md` not `H:/.claude/CLAUDE.md`, mirror does NOT apply; this is the project-level CLAUDE.md).
3. **Cross-link check** — confirm the 4 spec paths in the inserted text all resolve. They were committed this session (commits `c30db8e851`, `6db4ae601a`, `[7 more]`).
4. **Test:** start a fresh chat in any slot, observe whether `DOMAIN-GALAXY-DOCTRINE-MS0` appears in the auto-injected context. If yes → ship validated.

---

## Optional follow-up (golf discretion)

- Write `knowledge/memories/reference/reference_domain_galaxy_doctrine_2026_05_26.md` to make `[[reference_domain_galaxy_doctrine_2026_05_26]]` resolvable.
- Add to `## Recent regressions` log: `2026-05-26 | DOMAIN-GALAXY-DOCTRINE-MS0 Phase A shipped (5 galaxy CLAUDE.md sentinels + 4 spec docs, alpha iter12-17)` — same one-line format as other recent-regressions entries.
- Per [[feedback_reflect_all_changes_post_update]] — also update `state/shared/RECENT-SHIPMENTS-<date>.md` if active.

---

## Cross-refs

- Parent: [`DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)
- Rollup: [`GALAXY-PHASE-A-COMPLETE-2026-05-26.md`](GALAXY-PHASE-A-COMPLETE-2026-05-26.md)
- Doctrine source: [[reference_claude_md_compress_2026_05_20]] (golf-only edit rule)
- Hook: `H:/prism/.claude/hooks/claude-md-golf-only-guard.mjs` (PreToolUse Write block)
- Discovery path for golf: this file is at `state/shared/specs/REQ-*` so golf's spec-scan picks it up.
