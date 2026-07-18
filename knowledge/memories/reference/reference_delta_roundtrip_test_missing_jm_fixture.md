---
name: reference-delta-roundtrip-test-missing-jm-fixture
description: "cad-step-roundtrip.test.mjs hardcodes H:/PRISM/JM DIE/_PART LIBRARY/JM EXAMPLE PARTS/trilobe-example.step; the file is absent on this machine so all 8 roundtrip tests (146-153) fail at module load (ENOENT). Pre-existing fixture gap, not a code regression. 145/153 pass."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.550Z
aliases: reference_delta_roundtrip_test_missing_jm_fixture
---


# Roundtrip test missing JM fixture (delta, 2026-05-28)

`scripts/lib/cad-step-roundtrip.test.mjs:12` reads a hardcoded absolute path:
`const JM_PATH = "H:/PRISM/JM DIE/_PART LIBRARY/JM EXAMPLE PARTS/trilobe-example.step"` via `readFileSync(JM_PATH)`.

On this machine (DESKTOP-N7MI1VB) that file is **absent** — verified `ls` returns not-found. So all 8 tests in that file (146–153: parse 536 entities, round-trip identity, scaleAst uniform/anisotropic, radii, dangling-ref check) fail at module load. The other 145 tests (synth-lib 137 + ap242-emitter) PASS — they need no fixture.

**This is a pre-existing environment/fixture gap, not a code regression** — the delta galaxy buildout (2026-05-28) touched only `.md` files. The fixture existed when the toolchain was built (iter123-130) but is now missing from the JM DIE corpus path.

**Fix (future unit, NOT galaxy-buildout scope):** restore `trilobe-example.step` to the path, OR make the test skip-loud when the fixture is absent (R12 — `test.skip` with a clear message beats ENOENT crash). Candidate: `U-DELTA-ROUNDTRIP-FIXTURE-GUARD`.

**RESOLVED 2026-05-28 (commit `be68011183`, slot:delta /loop):** option (b) shipped — `U-DELTA-ROUNDTRIP-FIXTURE-GUARD`. The test now imports `existsSync`; `JM_PATH` is env-overridable via `PRISM_JM_TRILOBE_STEP`; absent fixture → all 8 fixture-dependent tests carry `{skip: <reason>}` (skip-loud — node:test prints the reason, never silent). Result: **8 ENOENT-fail → 8 skip, 0 fail, CAD suite green + honest**. A machine that restores the fixture (or sets `PRISM_JM_TRILOBE_STEP`) runs all 8 unchanged.

See [[reference_delta_cad_toolchain_session_2026_05_27]] · [[reference_jm_trilobe_example_step_analysis_2026_05_27]].
