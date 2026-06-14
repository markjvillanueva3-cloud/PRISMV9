---
name: reference_kilo_cam_gsd_2026_05_29
description: CAM-domain GSD (session-lifecycle + dev protocol) — the galaxy's 5th brain file mcp-server/src/engines/cam/GSD.md
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.181Z
aliases: reference_kilo_cam_gsd_2026_05_29
---


slot:kilo generated a CAM-domain **GSD** (Get-Stuff-Done session-lifecycle + dev protocol) — the galaxy's **5th brain file** `mcp-server/src/engines/cam/GSD.md` (cascade-injects under `engines/cam/` alongside CLAUDE/MEMORY/PATHS/TOOLBELT). Per the fleet-wide directive *"check all previous sessions + domain docs → generate memories / CLAUDE-rules / GSD protocols / wikis / tribal, then wire/test/validate/synergize to PSN + galaxy"* (siblings: [[reference_oscar_sfc_gsd_2026_05_29]], [[reference_whiskey_lathe_gsd_protocol_2026_05_29]], [[reference_delta_cad_asset_generation_2026_05_29]]).

Distilled from kilo session history (CAM-mastery, post-bridge, SF-PSN, master-post, cad-fusion, quoting, galaxy buildout, awareness surface, the wiring campaign). Six sections:
1. **Session bootstrap** — galaxy brain auto-loads → awareness digest auto-injects → `cam-awareness-snapshot --stdout` (full) → `cam-galaxy-verify` (8 checks) → read handoff.
2. **CAM work routing** — 3 dispatchers (prism_cam / camFunctionDispatcher / prism_toolpath), the triad, route-before-grep.
3. **The engine-wiring pattern** — audit ground-truth (not BUILD_STATE's transitive) → dedup → read engine API → ACTIONS+handler → wire-test (MockMCPServer + z.enum-membership guard + concrete assertions) → vitest + isolated tsc → 3-of-3 → commit.
4. **Hard-won gotchas** — the security-reminder hook false-flags the node spawn API + the bare regex match-method token (so build galaxy scripts spawn-free: read git via `.git/HEAD` + reflog with `fs`, use `matchAll`); Bash cwd resets after a session resume (chain `cd && rtk git` in ONE sequence or SLOT-COMMIT-ENFORCE blocks + unstages); PowerShell here-strings fail in the Bash tool (use `-m` flags); the Workflow tool's schema-StructuredOutput + parallel fan-out is rate-limit-fragile (inline audit beats it); worktree-vs-main staleness is not a real gap (golf merges).
5. **The 5 kilo invariants** (constants-import / collision-gate / cross-CAM-registry / shop_floor tier / defer-G-code-to-echo).
6. **Close-out** — per-file scrutiny + 3-of-3 + doc-reflection + campaign-memory + india outcome publish.

Complements the fleet-wide `data/docs/gsd/GSD_QUICK.md` with CAM specifics so future kilo sessions don't re-derive the dev patterns. Wired: referenced from `cam/CLAUDE.md` §Cross-refs. Pairs with [[reference_kilo_cam_galaxy_buildout_2026_05_28]] · [[reference_kilo_cam_awareness_surface_2026_05_28]] · [[reference_kilo_cam_wiring_campaign_2026_05_29]].
