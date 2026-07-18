---
name: reference_fusion_scratch_close_enforce_2026_06_01
description: Fusion scratch-doc auto-close enforcement (R14 for windows) — add-in /doc/close + scratch registry + lib + CLI + Stop hook; needs Fusion restart + golf wiring
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.583Z
aliases: reference_fusion_scratch_close_enforce_2026_06_01
---


# Fusion scratch-document close enforcement — U-FUSION-DOC-CLOSE-ENFORCE (slot:kilo, 2026-06-01)

Operator directive: *"build whatever we need to auto enforce you to close fusion files when you're done with them or we're going to end up with hundreds of windows and unnecessary usage of ram/cpu/gpu."* → R14 ("close your tool calls") applied to **Fusion documents**.

## Shipped stack
- **Add-in** `mcp-server/scripts/fusion360-addin/fusion360_api_server.py`: `GET /documents` (list open docs + per-doc scratch flag), `POST /doc/close` (targets `scratch`|`active`|`name`). Module global `_prism_scratch_docs` registry + helpers `_register_scratch_doc`/`_safe_remove_scratch`/`_is_scratch_doc`. `/new` now defaults **unnamed** docs to scratch (names them `PRISM-SCRATCH-N`, registers + attribute-tags `PRISM_DRIVE/scratch`). py_compile OK.
- **Lib** `scripts/lib/fusion-scratch-close.mjs` — `closeFusionScratch()`/`probeAndClose()`/`parsePorts()`, fail-soft, injectable `fetchImpl`. **8/8 tests** (`*.test.mjs`).
- **CLI** `scripts/fusion-close-scratch.mjs` — `node scripts/fusion-close-scratch.mjs [--list] [--ports a,b] [--json]`.
- **Stop hook** `.claude/hooks/stop-close-fusion-scratch.mjs` (tier T3, advisory) — auto-closes scratch on every Stop.

## SAFETY (load-bearing) — the per-add-in scratch REGISTRY, not the port
`/doc/close target=scratch` closes ONLY docs THIS add-in process registered via `/new` (`_prism_scratch_docs`), **discard-only** (`saveChanges` always false; promoted/saved scratch is skipped). delta's live CAD docs are never registered → **CAD work can never be lost**, regardless of which Fusion/port the add-in binds. Port is in flux (delta may hold :18365 now per [[reference_delta_live_closed_loop_proven_2026_06_01]]; 2 Fusion PIDs) — the registry guarantee is port-independent because each add-in process has its own `app.documents` + its own registry. Default port `:18365`, configurable via `PRISM_FUSION_CLOSE_PORTS`.

## Bugs caught + fixed
**P0 (3-of-3 scrutiny caught — I missed it; commit U-FUSION-DOC-CLOSE-FIX):** `_nav_safe` + ALL the U-FBN01 nav endpoints (`_design_tree`/`_post_library`/`_design_*`) were defined in `class FusionAPIHandler`, but `dispatch()` runs on a **`_FusionAPILogic()`** instance (`_run_on_main_thread` line ~125). So `self._nav_safe`/`self._design_tree` raised NameError/AttributeError at runtime → caught by dispatch try/except → **error body at HTTP 200** → the lib read no `count` → `scratchCount=0` → SILENT no-op. The whole feature AND U-FBN01's `/design/*`+`/post/*` endpoints were **DEAD on a restarted Fusion** (U-FBN01 was only ever proven via `/execute`, never the endpoints). `py_compile` passed (runtime error); lib tests passed (mocked a clean `/documents` shape) — textbook **"hermetic fakes don't prove wiring"**. FIX: relocated the 269-line nav block from `FusionAPIHandler` INTO `_FusionAPILogic` (where dispatch + my close methods live); fixed 7 bare/`self._nav_safe` sites; added **real-shape `test_doc_close.py`** (imports the actual module, mocks only adsk, mutation-verified to fail on the regression — 4/4); lib now surfaces a 200-error-envelope as `documents-bad-shape` loudly (R12), +1 lib test (9/9). LESSON: an add-in endpoint must be proven via the ENDPOINT (dispatch path), not via `/execute`; and a JS client that reads a remote shape must fail-loud on a bad shape, never coerce to a benign zero. → [[feedback_always_update_wiki_on_bug_finding]]

**P0 (self-caught, R12 — was failing SILENT):** Stop hook's `await import(absolutePath)` threw `ERR_UNSUPPORTED_ESM_URL_SCHEME` on Windows (dynamic import needs a `file://` URL) — caught by try/catch → hook silently no-op'd forever. Fixed with `pathToFileURL(...).href`. Verified: hook emits the restart hint live.

## ACTIVATION (two steps — NOT yet live)
1. **Restart Fusion** — new add-in routes aren't loaded (verified live 2026-06-01: `:18365 /status`=200 but `/documents`=404 → OLD add-in still running; no hot-reload).
2. **Wire the Stop hook** — golf adds ONE Stop entry at merge so file+wiring land together (wiring now would point at not-yet-merged `H:/prism/.claude/hooks/...` and error fleet-wide). Snippet in `state/shared/fusion-backend/FUSION-SCRATCH-CLOSE-ENFORCEMENT.md`. `continueOnError:true` required.

Knobs: `PRISM_FUSION_CLOSE_DISABLE=1`, `PRISM_FUSION_CLOSE_PORTS`. Doc: `state/shared/fusion-backend/FUSION-SCRATCH-CLOSE-ENFORCEMENT.md`. Pairs with [[reference_kilo_fusion_backend_nav_map_2026_05_31]] (U-FBN01).
