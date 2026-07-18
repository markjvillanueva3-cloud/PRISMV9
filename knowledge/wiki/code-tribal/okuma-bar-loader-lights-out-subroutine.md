---
title: Okuma OSP bar-loader + sequence-restart subroutine (lights-out lathe) — OBAR01.SSB
type: code-tribal
domain: lathe
tags: [lathe, okuma, osp, lights-out, unattended, bar-feeder, bar-loader, restart, subroutine, jm-die, OBAR, VRSTT]
created: 2026-06-02
by: claude-57dfea65 (slot:whiskey)
source: JM Die corpus — H:/PRISM/JM DIE/CNC LATHE/**/PROG. SAMPLE/OBAR01.SSB
---

# Okuma OSP bar-loader + sequence-restart subroutine (lights-out)

> The JM Die lights-out building block. A generated unattended lathe program CALLs this at the top of each part cycle. It loads fresh bar stock, faces the new end (top cut), and — critically — **guards against re-loading a bar on a mid-program sequence restart**. Operator directive: "include the bar pusher subroutine and program restart subroutine for lights-out machining."

## Why it matters
Lights-out (unattended/overnight) bar-fed turning runs the same part cycle hundreds of times off one bar. Two failure modes the subroutine prevents:
1. **Bar exhaustion** — `VDIN[24]` (end-of-bar digital input) triggers the load sequence to push fresh stock; otherwise the machine air-cuts.
2. **Mid-program restart re-loading a bar** — if the operator restarts a program mid-run (after an alarm/stop), Okuma sets `VRSTT EQ 128`. The subroutine checks this FIRST and skips the load (`NEND`), so it does not push a bar into a clamped/partly-machined part. **Omitting this guard is a crash.**

## Anatomy (OBAR01.SSB)
Guards (top of sub): `IF [VRSTT EQ 128] NEND` (sequence-restart) · `IF [VMLCK EQ 128] NEND` (machine-lock/dry-run) · `IF [VDIN[24] EQ 1] NLOAD` (end-of-bar -> load) · `IF [V200 NE 1] NEND` (manual-top-cut flag).

Load sequence (`NLOAD`): `G140` (load mode) · `M331` (buffer prohibit — halt look-ahead so the M-code handshake executes in order) · `M77` (parts-catcher advance) · `M84` (unclamp main spindle) · `M51` (spindle-jog air-blow on) · `M436` (**LOAD BAR** — bar-feeder advance) · `M50` (air-blow off) · `G4 F.5` (dwell) · `M76` (parts-catcher retract) · `M83` (clamp main spindle) · `M01`.

Top cut (`NTOP` — face the new bar end square): `G0 G90 X50 Z50` -> `G50 S1500` (**RPM cap**) -> `G0 Z=ZPOS T060606 G97 S=SFM*3.82/STOK+.2 M3 M63` (start spindle in constant-RPM at **RPM computed from SFM and stock dia** — `12/π ≈ 3.82`, so `RPM = SFM*3.82/D`) -> `X=STOK+.2` -> `G96 S=SFM M8` (switch to CSS + coolant) -> `G1 X=STOK-.3 F=FEED` -> `X-.03 F=FEED/2` (face to center) -> retract `G0 G91 Z.2 M5 M63 M9` -> `G90 X50 Z50` -> `V200=0` -> `M01`. `NEND` -> `RTS` (return from sub).

## Generator rules (R12, do not paraphrase the handshake)
- A lights-out program CALLs the bar-loader at each part-cycle top; the loader MUST carry the `IF [VRSTT EQ 128] NEND` restart guard.
- Preserve the M-code order: `M331` buffer-prohibit BEFORE loads; `M84` unclamp → `M436` load → `M83` clamp; `M77`/`M76` catcher advance/retract bracket the cut.
- Cap the top cut with `G50`; compute top-cut RPM as `SFM*3.82/STOK` — never hardcode.
- `VRSTT / VMLCK / VDIN[] / V200 / VUACM / VDOUT` are **Okuma OSP** system/common variables — NOT Fanuc-portable. Keep verbatim; flag if porting to another controller.
- Main-program restart points are labeled `( FINISH PASS RESTART Nxxx )` — the restart resumes at that N-block.

## Related
- Memory: `reference_jm_lathe_corpus_and_lightsout_subroutines_2026_06_02`
- Corpus map: `state/shared/specs/WHISKEY-JM-MIN-CORPUS-2026-06-02.json` (16,566 lathe .min in CNC LATHE)
- Finishing allowances: `[[jm-lathe-finishing-allowances]]`
