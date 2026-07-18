---
name: reference_charlie_tsx_reexec_e2e_env_robust_2026_06_22
description: Env-brittle E2E test fix — quoting-train-cycle tsx-reexec breaker case asserted a Node-24-specific ok:false; rewrote to pin the env-independent honest-verdict invariant (slot:charlie 2026-06-22)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.514Z
aliases: reference_charlie_tsx_reexec_e2e_env_robust_2026_06_22
---


**U-QP-TSX-REEXEC-E2E-ENV-ROBUST** (commit `5fc84e6fbf`, branch `cad-fusion-live-ms0`, slot:charlie, 2026-06-22). Test-only, 1 file (+17/-6).

**Symptom:** `node scripts/quoting-pipeline-verify.mjs` was RED (470/471). The single failure was the E2E case "breaker set → NO re-exec under bare node → honest engine-load failure" in `scripts/quoting-train-cycle.tsx-reexec.test.mjs` (charlie's OWN freshly-shipped test from U-QP-TSX-REEXEC). It asserted `json.ok === false`.

**Root cause:** the assertion's premise was environment-specific. The bug U-QP-TSX-REEXEC pins is a **Node-24 native-TS-type-strip** failure (the SRC-first `.ts` orchestrator loads but its dynamic `import("./X.js")` → ERR_MODULE_NOT_FOUND). This box runs **Node v22.12.0**. With the breaker on (`PRISM_QTC_REEXEC=1` → no re-exec), the bare-node run's SRC-first `.ts` import fails and the **documented SRC-first/dist-fallback** (`quoting-train-cycle.mjs:435-447`) loads the real orchestrator → a legitimate `ok:true` full cycle (5436 actuals priced). That is correct designed behavior ("tsx-absent → dist-fallback + honest error, never worse"), so `ok===false` was the wrong oracle — the TEST was wrong, not the code (R12; verified live before touching code).

**Fix:** rewrote the E2E breaker case to assert the **environment-independent invariant** the original opaque crash actually violated: the run terminates with an HONEST structured JSON verdict (a parseable line + `typeof json.ok === "boolean"`), NEVER a no-verdict ERR_MODULE_NOT_FOUND crash. The `ok` VALUE is deliberately not asserted (env-dependent: `ok:false` on Node≥24+no-dist, `ok:true` via dist-fallback otherwise). Teeth retained — the original opaque-crash regression emits no JSON line → `assert.ok(line)` still fails. Breaker-honoring stays pinned by the pure `planTsxReexec` unit tests; sibling test 18 still asserts the reexec-on `ok:true` path. 20/20 + pipeline-verify 471/471; per-file 2-arm scrutiny PASS (both arms verified it's a correctness fix, not a softening).

**Why (generalizable lesson):** an E2E/integration test that asserts a specific failure-mode VALUE (`ok:false`) is brittle when that value depends on the runtime (Node version) or build state (dist presence). The sibling of R9 "tests verify intent, not environment."

**How to apply:** pin the **environment-independent invariant** at the E2E layer (honest structured verdict / no opaque crash / no faked success) and push value-specific assertions to where the environment is controlled — the pure-decision unit test (`planTsxReexec`) and the positive-path sibling test. Before flipping any assertion to make a suite green, prove which side is wrong by OBSERVING the live behavior; never weaken to pass. Related: [[reference_charlie_train_cycle_tsx_reexec_2026_06_22]] · [[feedback_r5_thru_r12_doctrine]] · [[feedback_verify_actual_contract_not_proxy]].
