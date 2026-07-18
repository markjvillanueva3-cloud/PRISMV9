---
session: claude-671e2b1f
topic: tribal-node-binder
written_at: 2026-05-11T03:01:37.722Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-671e2b1f
status: active
---

# HANDOFF: claude-671e2b1f
Updated: 2026-05-11T03:01:37.722Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-671e2b1f

## STATE
F1 sink index.json shipped. Mid-enumeration for F2+ when context capped.

## RESUME
F-track tribal-viz integration. Mid-enumeration when context hit precompact hard threshold. F1 SHIPPED (c95b62a33 on work/tribal-node-binder): TribalCardSink writes index.json (schema 1.0.0, sorted by nodeId, atomic upsert, loadIndex+removeFromIndex APIs, skipIndex opt-out). 130/130 tests green across D+E+F. Next: COMPLETE enumeration of system-viz integration touchpoints, then write the comprehensive F2-Fn plan. Touchpoints already read: scripts list (12 viz scripts), commits since 14d (U-VIZ-SATURATE 1-4, U-VIZ-FULL-SATURATION 11k wiki entries + streaming bridge + auto-regen hook, U-VIZ-LAYER-SATURATE L5/L6/L7/L8, U-SYSTEM-VIZ-SINGLEWRITER PID guard), directive (state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md is 8353 bytes — atomic-first tier ordering, rgs/forge integration rules, refresh cadence, failure modes), file sizes (system-graph.json now 95MB up from 74MB, simple.html 573 lines, system-viz.html 2060 lines, _server.cjs 8431 bytes). Still need to read: _server.cjs (where to add /api/tribal-cards endpoint), system-viz-obsidian-bridge-v2.mjs (existing obsidian integration to mirror), system-viz-on-commit.mjs (auto-regen — should also trigger tribal regen?), system-viz-query.mjs (CLI adapter — add tribal-cards subcommand?). LANE DISCIPLINE: simple.html/system-viz.html/_server.cjs/scripts/system-viz-*.mjs all live in main tree H:/prism — touching them crosses lanes. PLAN must propose a clean contract the main-tree viz can consume WITHOUT requiring me to edit those files. Best approach: keep sink-side integration in worktree, ship a standalone Node static-server (worktree-local) that serves tribal-cards dir + CORS, ship a standalone viewer.html that proves the pattern. Main-tree integration becomes a follow-on for the chat that owns simple.html. Per comprehensive-build directive: enumerate the ENTIRE solution space (F2 server, F3 viewer, F4 obsidian-bridge contract, F5 on-commit regen integration, F6 query adapter subcommand) BEFORE narrowing or writing. NO HALF-BUILDS.

## CONTEXT
Harness fix ba85e3636 (main tree, cad-fusion-live-ms0): bound hook-bundle concurrency via PRISM_HOOK_BUNDLE_CONCURRENCY (default 6). Plus untracked patch to H:/.claude/bin/portable-node: NODE_OPTIONS=--max-old-space-size=4096 default + collapse spawn-failure exit codes (126/127/0xC0000142) to 0 so retry loop no longer amplifies fork storm. Both verified: 12/12 bundle smoke tests pass, bounded-pool wall-time 190ms@conc=6 vs 526ms@conc=2 vs 188ms@conc=0. portable-node 4144MB heap confirmed via v8.getHeapStatistics. Per current trace, sub-hook env-inherit means bundle children also get 4GB now. Lane status: I'm on H:/prism-tribal-binder branch work/tribal-node-binder; main tree is on cad-fusion-live-ms0; chats claude-99eca613 (audit-findings), claude-d9860be8 (scripts/generate-*.mjs) hold claims on main-tree paths. Tribal track suite to date: 11 commits (P0 spike → P4 telemetry → D1-D3 render+sink+wire → E1-E3 frontmatter → F1 index), 130 tests across 8 files. Spec at H:/prism-tribal-binder/state/shared/specs/2026-05-09-tribal-node-binder-design.md §14.4 lists open follow-ons: system-viz-on-commit chain hook (deferred-lane), real frontmatter loader ✅, live-fallback (telemetry-gated), cross-session cooldown (telemetry-gated), manual Phase-0 validation (user action).
