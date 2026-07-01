---
policy:
  tier: 3
  triggers:
    - "forge2"
---
# /forge2 — Project-Local Mirror

This file mirrors the user-global authoritative skill at `H:/.claude/commands/forge2.md`. The user-global file contains the full 6-phase pipeline (Phase 0 Preflight → Phase 0.5 Intelligence Routing → Phase 1 Smart+Knowledge → Phase 2 Brainstorm → Phase 2B Toolkit → Phase 3 Generate → Phase 4 Execute → Phase 5 Consensus Scrutiny → Phase 6 Handoff). Read it directly — do not duplicate the body here (drift risk).

**Authoritative path:** `H:/.claude/commands/forge2.md`

**Sibling skill:** `/rgs2` at `H:/.claude/commands/rgs2.md` — orchestrated by /forge2 Phase 3 to generate the 12-stage milestone envelope.

**Companion:** `/rgs-sync` (project-local) handles multi-CLI roadmap coordination.

**Live counts (refresh via `node scripts/update-prism-inventory.mjs --quiet`):**
3,165+ engines · 97 dispatchers · 7,302 actions · 413 hooks · 520 skills · 770 wiki · 189 memories · 4,245 tribal · 540+ scripts · 9 MCP plugins · 6 Ollama models · 40+ AI/ML engines.

**Audit-of-record:** `/forge-audit` 2026-05-08 dev-tool surface scan informed v2's 6-phase pipeline. Coverage delta v1→v2: ~4% → ~15%. v3 (forge3) targets ~40%.

If `/forge2` is invoked here without the user-global file present, fall back: read this mirror, redirect to "see authoritative spec at H:/.claude/commands/forge2.md", and bail with an error rather than running a partial pipeline.
