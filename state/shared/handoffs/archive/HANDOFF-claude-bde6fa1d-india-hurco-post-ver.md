---
session: claude-bde6fa1d
topic: india-hurco-post-verify
slot: india
written_at: 2026-05-23T03:42:39.433Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-bde6fa1d
status: active
---

# HANDOFF: claude-bde6fa1d
Updated: 2026-05-23T03:42:39.433Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-bde6fa1d

## STATE
Session bde6fa1d / slot india. Discovered Hurco post processor has 25 failing tests in core engine file (50% fail rate on canonical output contract; 10 auxiliary pipelines pass). Wrote verification report + raw failure list. Operator corrected one critical engine misconception (G05.3 is real Hurco smoothing code). NO code changes shipped this session — pivoted to honest assessment + report. Tasks 6,7,8,9 completed with appropriate deferral markers. Awaiting /compact.

## RESUME
HURCO-POST-REMEDIATION pending. State: 25/50 tests fail in src/__tests__/HurcoV11MillMasterPostEngine.test.ts (engine 1664 LOC). Operator confirmed real Hurco V11 smoothing G-code is G05.3 (NOT G187 Haas, NOT comment-only). Engine line 597-606 has WRONG authoritative comment claiming Hurco has no inline UltiMotion code. NEXT: 1) Fix engine UltiMotion block (~lines 595-607) to emit 'G05.3 P${mode}' when cfg.use_ultimotion=true. 2) Update 2 UltiMotion tests (lines 723-735) to assert G05.3 not G187. 3) Fix G54.1 P# extended work-offset at engine line 766 (currently emits 'G${cfg.work_offset}' → for work_offset>9 needs 'G54.1 P${n}'). 4) Fix physics_checks count 4→5 in getStats line 1006 (need to add missing 5th check — count actual checks in performPhysicsChecks lines 887-991 to find which is documented but missing). 5) Fix 'Cutting force ... contains kc1_1=1500' check string — engine emits 'Cutting force 666 N vs machine limit 2000 N' without constants; need to interpolate kc1_1 and mc into the check string per test line 718-719. Categories C (5 material-override validation tests, U-PPGH04) is safety-relevant — silent-accept of out-of-range kc1_1 is the bug class that pushes 4x canonical force into a real spindle. Per CLAUDE.md per-file scrutiny gate: 2 reviewers per file before next file. Per 3-of-3: all arms PASS before commit. Full failure breakdown: state/shared/specs/HURCO-POST-VERIFICATION-2026-05-22.md. Raw list: state/shared/specs/HURCO-POST-VERIFICATION-FAILURES-2026-05-22.txt. WinMax PC verified installed at C:/Program Files/Hurco/MT WinMax Desktop/WinMaxMill.exe v11.4.3.31916. WinMax GUI driver DEFERRED until engine green (premature on broken foundation). User will use Fusion 360 to post real Hurco programs for runtime verification — Fusion uses its OWN cps post, separate from PRISM engine. DO NOT commit unrelated work; this is a single-purpose chat (slot india).

## CONTEXT
Engine: mcp-server/src/engines/HurcoV11MillMasterPostEngine.ts (1664 LOC). Test file: mcp-server/src/__tests__/HurcoV11MillMasterPostEngine.test.ts. JM Die archive has ZERO .HCM files (Hurco conversational format), 43 .NC files mostly Okuma/Haas (not Hurco-targeted), 12042 .MIN files (Okuma lathe). Regression-against-historical-corpus plan is NOT viable. Discovery scripts: scripts/hurco-post-discovery.mjs (lib), state/shared/hurco-quick.json + hurco-ncfiles.json (outputs). WinMaxMill.exe CRASHES on /? flag (ACCESS_VIOLATION 0xC0000005) — does not accept CLI help. .nc IS a registered Windows file type but no default app bound. Engine has 11 test files total — only HurcoV11MillMasterPostEngine.test.ts is failing. ENGINE_DIGEST shows MasterPostHurcoV11 is graph node L10/built — system thinks it's healthy; reality is partial. This is the kind of silent-half-built debt the verification report exists to surface.
