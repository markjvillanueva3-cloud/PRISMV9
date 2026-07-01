---
type: architecture
created: 2026-05-17
slot: echo
chatId: claude-dacc6809
unit: /forge-audit-v2
links: [[system-viz]], [[ollama-pipeline-ms0]], [[knowledge-conversion-ms0]], [[reference_fleet_reaper_ms1]]
---

# Dev-Tool Bug + Conflict + Inefficiency Audit — 2026-05-17

Boris-discipline audit (`/forge-audit-v2`) of PRISM's development-tool layer (hooks, scripts, skills, dispatchers, settings). Re-runnable measurement shipped, peer-reviewer-corrected, 8 actionable Track-J/K units queued.

## Headline numbers
- **1,210 dev-tool files** scanned (~680 scripts + 528 hooks + 6 bundles).
- **13 file-write conflicts** detected (baseline=6); 5 confirmed clobber-risk + 1 known canonical + 2 latent races + 5 helper/append false-positives queued for filter refinement.
- **376 / 528 hook files (71%) are filesystem orphans** — not in `settings.json` and not a child of any bundle.
- **64 H:/ vs H:/prism/ skill mirrors** with drift up to 35× (`startup.md` 629B vs 22.2KB).
- **13 superseded skill files** (forge..forge6 + rgs..rgs5 + 2 backup files) inject ~250KB into every SessionStart.

## Findings (post-peer-review)

| # | Severity | Finding | Track |
|---|---|---|---|
| F1+F11 | HIGH | `system-graph.json` has **3** independent writers (`generate-system-viz.mjs`, `regen-viz.mjs`, `system-viz-add-node.mjs`); `system-viz-add-node.mjs` self-documents the one-way-fence race | J |
| F4 | HIGH | `roadmap-index.json` has 5 writers; 3 non-atomic; `register-*` after `close-out-milestone` re-introduces stale `pending` | J |
| F5 | HIGH | Forge v1..v6 + RGS v1..v5 + 2 `.fullcopy-bak-*` files = 13 dead skills (~250KB) in SessionStart injection | J |
| F6 | MED | `INTEL-OLLAMA-OBSIDIAN-MS0.json` — 4 envelope writers; v1+v2 superseded but on disk + exec-bit | K |
| F7 | MED | `scripts/one-off/cad-uix-*.mjs` — 4 historical patch scripts for closed milestones still on disk | K |
| F8 | MED | 5 one-off `_rewire-*.mjs` + `u-*` scripts that mutate `settings.json` (drift if rerun) | K |
| F9 | MED | 64 H:/ vs H:/prism/ skill mirrors with size deltas up to 35× | K |
| F10 | LOW | 376 orphan hook files on disk | K |
| F2 | LOW (latent) | `error-memory.json` has 2 writers; one is orphan — race materializes on wiring | K |
| F3 | LOW (latent) | `skill-usage-stats.json` has 2 writers; both orphan — race latent | K |

## META artifact (compounding-gains tax)

`scripts/dev-tool-conflict-detector.mjs` — re-runnable scan; exit non-zero on regression beyond baseline. CLI: `--json --baseline=N --include-known --paths-only`.

## Resolved-since-CLAUDE.md (NOT live bugs)

- `stop-force-loop-continue.mjs` — `status !== "active"` → `!== "running"` (verified line 174 + comment + 180).
- 5 of 6 error-learn hooks ARE wired today (`error-fix-vault-bridge`, `error-pattern-promote` w/2,560 fires, `error-block-prewarn`, `error-pattern-capture`, `error-block-capture`); only `error-pattern-learner` + `error-pattern-memory` remain orphan.

## Peer-reviewer corrections applied

Worktree-isolated reviewer agent `abd240de561947257` BLOCKED F2 + F3 (both writers orphan — race not live); corrected F7 count 5→4, F8 count 6→5, F9 count 63→64; added F11 (third system-graph.json writer with self-documented race).

## See also

- `state/shared/specs/DEV-TOOL-CONFLICT-AUDIT-2026-05-17.md` — full audit body
- `scripts/dev-tool-conflict-detector.mjs` — META artifact
- `CLAUDE.md ## Recent regressions` — F1+F11, F4, F2+F3 latent, F5 entries appended this session
