<!--
  DELTA P1 MERGE PLAYBOOK — de-risks U-MERGE-SLOT-DELTA (slot/delta → cad-fusion-live-ms0).
  Built 2026-06-10 (loop 0e708167 iter3, slot delta) as merge-readiness PREP — NOT an
  execution record. The merge itself is OPERATOR-GATED / coordinated-session (fleet-impacting:
  19 conflict files incl settings.json hook wiring + the 564-action cadDispatcher core).
  Two prior delta sessions correctly deferred mid-loop execution. This playbook makes the
  eventual coordinated session fast + safe. Author: slot delta.
-->

# DELTA P1 MERGE PLAYBOOK — `U-MERGE-SLOT-DELTA`

**Scope:** merge `slot/delta` → `cad-fusion-live-ms0` (trunk). **410 commits / 3970 files ahead.**
**Why:** the bulk of delta's CAD work (CAD-PIPELINE-WIRE-MS0 135, CAD-ASSEMBLY-GEN-MS0 72, MS-CAM-MASTERY 58, CAD-TRAINING-PIPELINE 34+17, ELECTRODE-GEN 29, AP242-EMITTER, STEP round-trip…) + the **real CAD CLIs** (`cad-generate-stepped-trilobe-cli.mjs`, `cad-analyze-step.mjs`) live ONLY in worktree `H:/prism-slot-delta`. Until merged, P6/P7 (feature-recognition, smooth-solid NURBS emit) **cannot be built on trunk without worsening this conflict**. This merge is the #1 structural unblock.
**Status:** ⛔ NOT executed — coordinated/operator-gated. Merge-base `aa58c8f3eb`. Conflict surface: **19 files** (3951 slot-only files fast-apply clean).

---

## ⚠ Pre-conditions (do NOT start without all four)
1. **Fleet-quiet window** — announce on `AGENT_CHAT.jsonl`; the merge rewrites `.claude/settings.json` (every chat's hook wiring) + `cadDispatcher.ts` (564-action core). A peer editing either mid-merge corrupts the result. Target: no active CAD/CAM/AI slot (delta/kilo/echo/india) mid-build.
2. **Backups** — `git branch slot-delta-PREMERGE-backup slot/delta && git branch trunk-PREMERGE-backup cad-fusion-live-ms0`. (Reversal levers; never delete.)
3. **Clean trunk** — `git -C H:/prism status` shows no uncommitted critical files (25,677 untracked exist — NEVER `git add .`; stage explicit paths only).
4. **Full build budget** — needs `npm run build` (full tsc+esbuild, 16 GB heap) + `npx vitest run` after resolve. Do NOT start in a near-full context window.

---

## Per-file resolution (the 19 conflicts, bucketed)

### Bucket A — delta-authoritative UNION (CAD-domain owner's deeper work + trunk's recent additions; keep BOTH)
| file | slot Δ | trunk Δ | strategy |
|---|---|---|---|
| `mcp-server/src/engines/cad/MEMORY.md` | +139 | +88 | **union** — slot's galaxy buildout + trunk's ledger pointer (today). |
| `mcp-server/src/engines/cad/CLAUDE.md` | +126 | +157 | **union** — both extend cad doctrine; merge sections, dedup headers. |
| `mcp-server/src/engines/cad/PATHS.md` | ✓ | ✓ | **union** (delta owns; keep both file-map additions). |
| `mcp-server/src/engines/cad/TOOLBELT.md` | ✓ | ✓ | **union** (delta owns; keep both dispatcher/skill additions). |
| `knowledge/wiki/architecture/cad-galaxy.md` | ✓ | ✓ | **union** (delta owns CAD wiki). |
| `.claude/hooks/delta-cad-awareness-inject.mjs` | ✓ | ✓ | **3-way, prefer slot** (delta's own hook) — but keep any trunk bugfix; `node --check` after. |

### Bucket B — append/index UNION (both append; keep all entries)
| file | strategy |
|---|---|
| `knowledge/wiki/index.md` | **union** — keep both sides' index rows (sort/dedup by name). |
| `knowledge/wiki/log.md` | **union** — chronological; keep both sides' log lines. |
| `.gitignore` | **union** — additive ignore lines; dedup. |

### Bucket C — ⚠ CRITICAL CODE — careful 3-way, DROP NOTHING, rebuild+test
| file | slot Δ | trunk Δ | strategy + validation |
|---|---|---|---|
| `mcp-server/src/tools/dispatchers/cadDispatcher.ts` | +119 | **+1502/-3** | **HIGHEST EFFORT.** Trunk is far ahead (564-action core grew +1502). Take **trunk as base**, then re-apply slot's **+119** as ADDED actions/cases — verify each slot action isn't already on trunk (dedup), keep both `z.enum` action lists merged. VALIDATE: `npm run build` 0 errors + action-enum count ≥ max(both) + a dispatcher round-trip test. |
| `.claude/settings.json` | +5 | **+20/-24** | **FLEET-BREAKER.** Union ALL hook wirings — slot's +5 (likely `delta-cad-awareness-inject`) + trunk's +20. VALIDATE: JSON parses (`node -e "require()"`) + hook count ≥ max(both) + spot-check MINIMAL_ALLOWLIST gates (scrutinize-before-stop, slot-bind-enforce) all present. A dropped hook silently breaks every chat. |
| `mcp-server/src/engines/MultiModelConsensusEngine.ts` | ✓ | ✓ | 3-way; `npm run build` + its test green. |
| `scripts/lib/graphsage-trainer.mjs` | ✓ | ✓ | 3-way (india/NN owns logic — coordinate); `node --check` + NN-graph tests. |
| `scripts/ollama-prism-bridge.mjs` + `scripts/__tests__/ollama-prism-bridge.test.mjs` | ✓ | ✓ | 3-way; keep both tool additions; run the bridge test (86 cases). |
| `.claude/helpers/precompact-handoff.mjs` + `.claude/helpers/precompact-handoff-loop-state.test.mjs` | ✓ | ✓ | 3-way (session-continuity infra); run the test. |

### Bucket D — doctrine / data
| file | slot Δ | trunk Δ | strategy |
|---|---|---|---|
| `CLAUDE.md` | +3/-3 | **+527/-600** | Take **trunk base** (heavy rework) + re-apply slot's 3-line change (identify via `git diff aa58c8f3eb slot/delta -- CLAUDE.md`). Verify section markers intact. |
| `mcp-server/data/state/HYPERMILL_SDK_APIS.json` | ✓ | ✓ | Take newer/superset (likely trunk, cam-domain); VALIDATE JSON parses. |

---

## Execution sequence
```bash
# 0. PRE (announce + backup) — see Pre-conditions
git -C H:/prism branch slot-delta-PREMERGE-backup slot/delta
git -C H:/prism branch trunk-PREMERGE-backup cad-fusion-live-ms0
# 1. dry merge on trunk (expect 19 conflicts; 3951 slot-only files apply clean)
git -C H:/prism checkout cad-fusion-live-ms0
git -C H:/prism merge --no-commit --no-ff slot/delta     # → CONFLICTS in the 19
# 2. resolve per bucket above (A/B union, C/D careful) — git checkout --ours/--theirs per file, then hand-union
# 3. BUILD (full)         : cd mcp-server && npm run build           # 0 tsc errors
# 4. TEST                 : npx vitest run                            # green (esp. cadDispatcher, BliskCADEngine, the 6 Bucket-C suites)
# 5. VALIDATE (numbers)   : settings.json hook count ≥ max(both) ; cadDispatcher action-enum ≥ max(both) ; CAD CLIs present on trunk (ls scripts/cad-*-cli.mjs)
# 6. COMMIT               : [MAIN] [CAD-FUSION-LIVE-MS0]/U-MERGE-SLOT-DELTA: merge 410-commit slot/delta → trunk (19 conflicts resolved, build+test green)
# 7. POST                 : announce on AGENT_CHAT.jsonl; peers rebase their slot branches onto the new trunk
```

## Abort / rollback
- Mid-resolve: `git -C H:/prism merge --abort` → trunk restored to pre-merge HEAD, clean.
- Post-commit regret: `git -C H:/prism reset --hard trunk-PREMERGE-backup` (only if not yet pushed/peers-rebased).
- Backups `slot-delta-PREMERGE-backup` + `trunk-PREMERGE-backup` preserve both sides indefinitely (never delete per [[feedback_never_delete_only_disable]]).

## Risk register
1. **settings.json dropped hook** → silent fleet-wide hook breakage (the worst failure). Mitigation: explicit hook-count assert + MINIMAL_ALLOWLIST spot-check in step 5.
2. **cadDispatcher.ts dropped/duplicated action** → broken or duplicate CAD action. Mitigation: action-enum count assert + dispatcher round-trip test.
3. **Peer edits settings.json/cadDispatcher mid-merge** → corruption. Mitigation: fleet-quiet window (pre-condition 1).
4. **25,677 untracked files** → never `git add .`; stage explicit paths only.

---
_Built by slot delta 2026-06-10 (loop 0e708167 iter3). Surfaced to operator as the recommended next-window coordinated action. Pointer: `state/shared/DELTA-CONTEXT-LEDGER.md` §1._
