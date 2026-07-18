# HANDOFF: claude-6ac8fa2d
Updated: 2026-05-05 end of session
Family: Claude | Machine: MARKV | Session: claude-6ac8fa2d
Branch: work/ppgh05 | Worktree: H:/prism-ppgh05
Topic: cam-exhaust-ms0 (auto-derived from latest commit `[CAM-EXHAUST-MS0]/U-PPGOH05`)

## RESUME

Build `OkumaMultusB250IIMasterPostEngine` from scratch using the 5 parity primitives now proven on HurcoV11 + OkumaOSPMill (setup_sheet / postSingle / op.tool shadowing / stickout / Kienzle feed-clamp). New engine — Multus is mill-turn (B-axis live tooling, sub-spindle, multi-channel $1/$2 program structure). JM Die's machine: LTH-07 "Okuma Multus B250II", controller OSP-P300SA, post `OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps`. Worktree: `H:/prism-ppgh05` on `work/ppgh05`. Commit format: `[CAM-EXHAUST-MS0]/U-PPGOM01..NN`. Use `git -C H:/prism-ppgh05` (NOT `cd && git`) so commit-ownership-guard reads the right index.

## STATE — session result (2026-05-05, 11 units shipped on work/ppgh05, all pushed)

### Phase 1: HurcoV11 sync-path bug cleanup (6 units, U-PPGH10..15)

The crashed predecessor chat (claude-9435742c) had landed U-PPGH06 (HSMDwellAtCornerEngine restore + UltiMotion alignment) and parked at 16 fail / 59 pass / 75 total on `HurcoV11MillMasterPostEngine.test.ts`. Closed every remaining failure:

| Unit | Title | After |
|---|---|---|
| U-PPGH10 | structured `setup_sheet` payload | 9 fail |
| U-PPGH11 | `postSingle` simplified API + 4 hardening tests | 5 fail |
| U-PPGH12 | align stale spindle test to U-PPGM13 sidecar contract | 4 fail |
| U-PPGH13 | `op.tool` structured shadowing unifies postSingle path | 3 fail |
| U-PPGH14 | stickout deflection physics check | 2 fail |
| U-PPGH15 | `max_cutting_force_N` Kienzle-bounded feed clamp | **0 fail** |

End state: **88 / 88 GREEN** on HurcoV11 test file. tsc clean. Zero regressions.

### Phase 2: Okuma M460V-5AX parity port (5 units, U-PPGOH01..05)

User asked to port the same primitives to `OkumaOSPMillMasterPostEngine` for the M460V-5AX path. JM Die preset (osp_family P300, G56_HA TLC, G131 nano-smooth, G169_G170 TCP) gained 2 new keys for setup_sheet identification.

| Unit | HurcoV11 source | New tests |
|---|---|---|
| U-PPGOH01 | U-PPGH10 — setup_sheet, machine="Okuma Genos M460V-5AX", controller="OSP-P300MA-H" | 8 |
| U-PPGOH02 | U-PPGH11 — `MillTool`/`MillMaterial`/`PostMove` types + `postSingle` API | 8 |
| U-PPGOH03 | U-PPGH13 — `op.tool` structured shadowing on verbose path | 4 |
| U-PPGOH04 | U-PPGH14 — stickout deflection physics check | 4 |
| U-PPGOH05 | U-PPGH15 — Kienzle feed clamp + `OkumaFeedOptimization` audit | 6 |

End state: **189 / 189 GREEN** across all 8 OkumaOSPMill suites (was 65). tsc clean.

### Commits (all on origin/work/ppgh05)

```
30dad27f2 U-PPGOH05  Kienzle-bounded feed clamp on sync path
44f86c589 U-PPGOH04  stickout deflection physics check
e896c060d U-PPGOH03  op.tool structured shadowing on verbose path
892a19bdb U-PPGOH02  MillTool/MillMaterial/PostMove + postSingle API
025f09f94 U-PPGOH01  structured setup_sheet payload (M460V-5AX flavored)
30dbc1938 U-PPGH15   HurcoV11 Kienzle-bounded feed clamp on sync path
e5e133019 U-PPGH14   HurcoV11 stickout deflection physics check
3ba7e56fb U-PPGH13   HurcoV11 op.tool structured shadowing on verbose path
165febc98 U-PPGH12   HurcoV11 align stale spindle test to U-PPGM13 sidecar contract
5b76842c7 U-PPGH11   HurcoV11 postSingle simplified API + structured tool flow
22cd1b965 U-PPGH10   HurcoV11 structured setup_sheet payload
```

## CONTEXT — Multus B250II next-priority detail

### Machine identity (jm-die-profile.ts:246)

- machine_id: `LTH-07`
- machine_name: **Okuma Multus B250II** (multi-tasking mill-turn)
- controller_family: `okuma`
- controller_model: **OSP-P300SA**
- post_processor: `OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps`

### Why a new engine (not an extension of OkumaB250Lathe)

`OkumaB250LatheMasterPostEngine` covers the **LB250II-M** (stationary 2-axis lathe + sub-spindle) — different machine class. Multus B250II is a multi-tasking mill-turn with:

- B-axis live tooling (tilting milling head)
- Sub-spindle handoff (full part-transfer flow)
- Multi-channel programs ($1/$2 dual-process syntax on Okuma)
- C-axis mode toggle (G7.1 / G13.1)
- Polar coordinate interpolation (G12.1 / G13.1)
- Cylindrical interpolation (G7.1)
- Mill-on-lathe ops (face/contour with C+X+Z, not the C-axis-as-spindle classical lathe)

These ops aren't representable in either `MillOperation` (no spindle-as-axis) or `OkumaB250LatheMasterPostEngine.LatheOperation` (no live-tool B-axis). New shape needed.

### Source post for dialect cross-validation

`H:/prism/Resources/OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps` — Mark's PRISM-modified Fusion post in active production at JM Die. Same cross-validation pattern used for U-PPGOH01 (`.cps` wins over `.def` when they disagree).

### Recommended unit decomposition (~12 units, U-PPGOM01..NN)

**Phase A — foundation (3 units):**

- **U-PPGOM01**: scaffolding — engine class + `MultusOperation` type + dialect (OSP-P300SA via ControllerDialectEngine; may need new dialect entry), header / safe-start emit, baseline tests
- **U-PPGOM02**: turning-only path (G50 max RPM, G96/G97, T<n><o> turret 4-digit format unique to Okuma multus, X/Z + canned cycles G71/G72/G73/G74/G75/G76)
- **U-PPGOM03**: milling-only path (B-axis tilting, C-axis mode toggle, polar G12.1, live-tool RPM via M133/M134)

**Phase B — multi-tasking primitives (4 units):**

- **U-PPGOM04**: multi-channel $1/$2 sync — wait codes (M119/M120) + dual-channel emission ordering
- **U-PPGOM05**: sub-spindle handoff (M203/M204 part transfer, sub-spindle approach, parting cycle)
- **U-PPGOM06**: cylindrical interpolation G7.1 (wrap milling around the workpiece OD)
- **U-PPGOM07**: B-axis tilting positioning (G56.1 tool-length offset for B-axis, kinematics chain)

**Phase C — primitive parity (5 units, mirrors U-PPGH10..15 minus the postSingle / shadowing split since they merge cleanly here):**

- **U-PPGOM08**: structured setup_sheet (machine="Okuma Multus B250II", controller="OSP-P300SA")
- **U-PPGOM09**: `MillTool` + `MillMaterial` + `TurningTool` + `PostMove` types + `postSingle` simplified API for both turning and milling ops
- **U-PPGOM10**: `op.tool` structured shadowing on verbose path (both turning and milling tool emit paths)
- **U-PPGOM11**: stickout / deflection check (drives differ for turning insert vs live-tool endmill — separate logic per op type)
- **U-PPGOM12**: `max_cutting_force_N` Kienzle-bounded feed clamp — Kienzle force model applies to both turning and milling, but kc1_1/mc resolution and fz vs fn semantics differ (turning uses `fn_mmrev` not `fz_mmtooth`)

### Architecture decisions to keep (proven this session)

1. **Engines stay independent** — don't import types from HurcoV11 or OkumaOSPMill. Define parallel `MillTool` / `MillMaterial` / `PostMove` and a NEW `TurningTool` / `TurningMove` (Multus turns + mills). Same architecture chosen for HurcoV11 ↔ OkumaOSP ↔ MitsubishiWEDM.
2. **Physics constants ONLY from `src/physics/constants.ts`** — never inline kc1_1/mc/Taylor C/n. Use `CANONICAL_KIENZLE` and `CANONICAL_TAYLOR`.
3. **Sentinel parity** — reuse `KIENZLE_CLAMP_LEVEL_SENTINEL = -1` value in the new engine's local declaration so cross-engine consumers can filter both engines uniformly (already done for OkumaOSP — see `OKUMA_KIENZLE_CLAMP_LEVEL_SENTINEL`).
4. **block_id pad-digit awareness** — `n_number_pad_digits` config respected in `feed_optimizations[].block_id` (so it matches `block_annotations[].block_id` exactly). Fixed in U-PPGOH05.

### Hooks gotchas (learned this session)

- **commit-ownership-guard** reads staged files from the BASH SUBPROCESS CWD, not the parent shell. When committing on a worktree from a parent shell at `H:/prism`, `cd H:/prism-ppgh05 && git commit` triggers a false-positive block (the hook reads the main repo's index). **Always use `git -C H:/prism-ppgh05 commit ...`** instead — that gives the hook the right CWD.
- **TestLegitimacy gate** blocks `expect(x).toBeDefined()` and `result.foo!` non-null assertions. Use a `must<T>(v: T | undefined): T` helper that throws on undefined and returns T. Then assert concrete values. (See `mustOkumaSheet` in the OkumaOSP test file.)
- **Magic-number hook** misfires on `const X = 7777` style constant declarations themselves — those ARE the named constants. Ignore those warnings.
- **CodeCompleteness gate** blocks "// removed code" style comments. Don't leave stubs or commented-out code in commits — git history has it.

### Test infrastructure reminders

- vitest path: `node H:/prism/node_modules/vitest/vitest.mjs run <file>` from `H:/prism-ppgh05/mcp-server`
- tsc: needs `NODE_OPTIONS=--max-old-space-size=16384` (heap OOMs without it)
- Filter syntax: `vitest run <file> -t "<describe-or-it-name-pattern>"`
- Advanced-pipeline tests can be flaky on first run (async pipeline interaction). Re-run before deciding it's a regression.

### Out-of-scope follow-ups parked on this branch (still unresolved)

- `MasterPostMitsubishiMV1200R.integration.test.ts` fails to *load* due to missing schema file `mcp-server/src/schemas/camxMs22U01ActionSchemas.ts` — `camDispatcher.ts` imports it but the file wasn't cherry-picked into `work/ppgh05`. Schema lives in main `H:/prism/mcp-server/src/schemas/camxMs22U01ActionSchemas.ts`. Coordinate with peer chat owning camDispatcher.ts before fixing.
- **U-PPGM17d**: wire `verify_tier` through `master_post_mitsubishi_mv1200r` + `master_post_by_machine` cases in `camDispatcher.ts` (RESUME_POSTS_TOMORROW.md Priority 1, was blocked by peer claim in prior session).

## Worktree state at session end

- Branch: `work/ppgh05` at `H:/prism-ppgh05`
- node_modules: junction → `H:/prism/mcp-server/node_modules` (already in place)
- Working tree: clean, all 11 units committed and pushed
- Latest HEAD: `30dad27f2` (U-PPGOH05)

## Twin handoff

A duplicate of this file (with the explicit `ppgh05` topic) is at `state/shared/handoffs/HANDOFF-claude-6ac8fa2d-ppgh05.md`. Both files exist; this `cam-exhaust-ms0` copy is the one the per-agent-handoff helper will resolve via the topic auto-derivation (latest commit's SCOPE-MS#).
