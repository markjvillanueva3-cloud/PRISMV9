# Fusion Scratch-Document Close Enforcement (R14 for Fusion windows)

**Owner:** kilo · **Date:** 2026-06-01 · **Unit:** U-FUSION-DOC-CLOSE-ENFORCE
**Operator directive:** *"build whatever we need to auto enforce you to close fusion files when you're done with them or we're going to end up with hundreds of windows and unnecessary usage of ram and cpu and gpu."*

## What this is
R14 ("close your tool calls") applied to **Fusion documents**. Driving Fusion via the live bridge opens throwaway "scratch" documents; left open they pile up into hundreds of windows that burn RAM/CPU/GPU. This makes closing them automatic.

## The stack (all shipped this unit)
| Layer | File | Role |
|---|---|---|
| **Add-in capability** | `mcp-server/scripts/fusion360-addin/fusion360_api_server.py` | `GET /documents` (list open docs + scratch flag), `POST /doc/close` (close scratch/active/named), scratch registry + `/new` auto-registers unnamed docs |
| **Shared lib** | `scripts/lib/fusion-scratch-close.mjs` | `closeFusionScratch()` / `probeAndClose()` — fail-soft probe+close, dependency-injectable fetch |
| **CLI** | `scripts/fusion-close-scratch.mjs` | on-demand close: `node scripts/fusion-close-scratch.mjs [--list] [--ports a,b] [--json]` |
| **Stop hook** | `.claude/hooks/stop-close-fusion-scratch.mjs` (tier T3) | auto-closes scratch at every session Stop |
| **Test** | `scripts/lib/fusion-scratch-close.test.mjs` | 8/8 — down / old-addin / zero-scratch / close / dryRun / port-safety / parse / no-fetch |

## SAFETY (load-bearing — both add-ins share ONE Fusion `app.documents`)
- Default port is **ONLY `:18365`** (kilo/CAM scratch). `:18362` (delta/CAD live docs) is **never** closed by default.
- `POST /doc/close target=scratch` closes **only documents the add-in process itself registered via `/new`** (the `_prism_scratch_docs` registry). Delta's live CAD docs are never registered → **CAD work can never be lost.**
- `saveChanges` is **always `false`** for scratch (disposable; discard, never save). A scratch doc that was *promoted* (saved into a project) is **skipped, not discarded**.
- Non-scratch `active`/`name` closes refuse to discard a **modified** doc unless `force:true` or `saveChanges:true`.

## Scratch identification (3 signals, any → scratch)
1. Registered in `_prism_scratch_docs` this add-in session (primary).
2. Document attribute `PRISM_DRIVE/scratch` (survives, best-effort).
3. Name prefix `PRISM-SCRATCH` / `PRISM_CAM`.
`/new` now defaults **unnamed** docs to scratch (names them `PRISM-SCRATCH-N`, registers them). A **named** doc, or `scratch:false`, is intentional and never auto-closed.

## ACTIVATION — two steps
1. **Restart Fusion** to load the new add-in routes. *(Verified 2026-06-01: Fusion is currently running an OLD `PRISM_Fusion_Drive` — `/status`=200 but `/documents`=404. The CLI + hook detect this and emit a "restart Fusion" hint until then.)*
2. **Wire the Stop hook** (golf applies at merge so the file + the wiring land together — wiring it now would reference a not-yet-merged `H:/prism/.claude/hooks/...` path and error fleet-wide). Add ONE entry to the global Stop array in `C:\Users\wompu\.claude\settings.json` (auto-mirrors to `H:/.claude/settings.json`):
   ```json
   { "type": "command", "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop-close-fusion-scratch.mjs", "continueOnError": true }
   ```
   `continueOnError:true` is required — this is an advisory T3 observer, it must NEVER block Stop.

## Use it NOW (before wiring, after Fusion restart)
```
node scripts/fusion-close-scratch.mjs            # close scratch docs on :18365
node scripts/fusion-close-scratch.mjs --list     # show open docs, close nothing
```
The kilo CAM drive loop should call the CLI (or the lib's `closeFusionScratch()`) after each part for *proactive* mid-session cleanup — the Stop hook is the end-of-session safety net.

## Knobs
- `PRISM_FUSION_CLOSE_DISABLE=1` — disable the Stop hook.
- `PRISM_FUSION_CLOSE_PORTS=18365,18362` — override ports (default `18365` only).

Memory: [[reference_fusion_scratch_close_enforce_2026_06_01]]. Pairs with [[reference_kilo_fusion_backend_nav_map_2026_05_31]] (U-FBN01 nav endpoints) + R14 [[feedback_close_background_tasks_at_stop]].
