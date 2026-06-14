---
name: reference_jm_lathe_corpus_and_lightsout_subroutines_2026_06_02
description: "JM Die lathe program corpus + lights-out subroutines (batch .min search 2026-06-02). 16,583 .min/.sub files; 16,566 in H:/PRISM/JM DIE/CNC LATHE (the canonical lathe corpus — operator confirmed ALL programs are there), +13 CNC OKUMA MULTUS, +4 MACRO PROGRAMS. The lights-out bar-loader subroutine is OBAR01.SSB (Okuma .SSB subroutine): bar-load + auto top-cut + SEQUENCE-RESTART guard (VRSTT EQ 128) + machine-lock guard (VMLCK) + end-of-bar signal (VDIN[24]) + M436 LOAD BAR + M77/M76 parts-catcher + M84/M83 spindle unclamp/clamp + G50 S1500 cap + RPM-from-SFM (SFM*3.82/STOK). A generated lights-out program MUST CALL OBAR at each part cycle top AND carry the VRSTT restart guard so a mid-program restart does not re-load a bar. Restart points also flagged as ( FINISH PASS RESTART Nxxx ). Corpus map: state/shared/specs/WHISKEY-JM-MIN-CORPUS-2026-06-02.json."
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:09.172Z
aliases: reference_jm_lathe_corpus_and_lightsout_subroutines_2026_06_02
---


# JM lathe .min corpus + lights-out subroutines (slot:whiskey, 2026-06-02)

Batch `.min/.sub` search across the JM Die lathe folders (operator: "H:/PRISM/JM DIE should have ALL the programs, check the lathe specific folders"). Map: `state/shared/specs/WHISKEY-JM-MIN-CORPUS-2026-06-02.json`.

## Corpus (16,583 .min/.sub)
- **`H:/PRISM/JM DIE/CNC LATHE` = 16,566** — the canonical lathe program corpus (operator confirmed). This is the print->program training/comparison ground-truth set.
- `CNC OKUMA MULTUS` = 13 (mill-turn). `MACRO PROGRAMS` = 4. `LATHE`/`OKUMA` top-level = 0 .min (other formats/empty).
- 589 subroutine-shaped files (O-number named / SUB). Restart-tagged: only 4 (`( FINISH PASS RESTART Nxxx )` + OBAR's VRSTT guard) — restart logic is SUBROUTINE-resident, not per-program comment.

## Lights-out bar-loader + restart subroutine — `OBAR01.SSB` (Okuma OSP)
Found at `CNC LATHE/NATHANS USB/.../PROG. SAMPLE/OBAR01.SSB` (+ OMG copy). This is THE lights-out building block. Anatomy:

```
OBAR (BAR LOADING PROGRAM)
IF [VRSTT EQ 128] NEND   (skip load on SEQUENCE RESTART — do NOT re-load a bar mid-restart)
IF [VMLCK EQ 128] NEND   (skip on MACHINE LOCK / dry-run)
IF [VDIN[24] EQ 1] NLOAD (end-of-bar digital-input signal -> go load)
IF [V200 NE 1] NEND      (V200 = manual-top-cut flag)
VUACM[1]='MANL TOP CUT'  (user alarm comment) ; VDOUT[991]=1 ; GOTO NTOP
NLOAD G140               (loading mode)
  M331 (buffer prohibit — stop look-ahead so M-codes fire in order)
  M77  (parts catcher ADVANCE)
  M84  (UNCLAMP main spindle)
  M51  (spindle jog air blow ON)
  M436 (LOAD BAR — bar feeder push/advance)
  M50  (air blow OFF) ; G4 F.5 (dwell)
  M76  (parts catcher RETRACT)
  M83  (CLAMP main spindle) ; M01
NTOP (TOP CUT — face the new bar end to length)
  G0 G90 X50 Z50 ; G50 S1500                 (safe + RPM CAP)
  G0 Z=ZPOS T060606 G97 S=SFM*3.82/STOK+.2 M3 M63  (RPM from SFM/dia: 12/pi≈3.82)
  X=STOK+.2 ; G96 S=SFM M8                    (switch to CSS + coolant)
  G1 X=STOK-.3 F=FEED ; X-.03 F=FEED/2        (face to center)
  M76 ; G0 G91 Z.2 M5 M63 M9 ; G90 X50 Z50 ; V200=0 ; M01
NEND
RTS
```

## How to apply (closed-loop generation, R12)
1. A **lights-out** generated program must CALL the bar-loader (`CALL OBAR` / Okuma schedule) at the TOP of each part cycle, and the bar-loader MUST carry the `IF [VRSTT EQ 128] NEND` **sequence-restart guard** — otherwise a mid-program restart re-loads a bar and crashes. This is the operator's "bar pusher subroutine + program restart subroutine for lights-out machining."
2. Reproduce the canonical M-code handshake order: M331 buffer-prohibit BEFORE the load M-codes; M84 unclamp -> M436 load -> M83 clamp; M77 advance / M76 retract the parts catcher around the cut; G50 cap on the top-cut; RPM computed `SFM*3.82/STOK` (don't hardcode a top-cut RPM).
3. `VRSTT`/`VMLCK`/`VDIN[24]`/`V200`/`VUACM`/`VDOUT` are Okuma OSP system/common variables — preserve them verbatim; they are NOT Fanuc-portable.
4. Restart points in main programs appear as `( FINISH PASS RESTART Nxxx )` block-number labels — the restart subroutine resumes at the labeled N-block.

Companion wiki: `knowledge/wiki/code-tribal/okuma-bar-loader-lights-out-subroutine.md`. Pairs with [[reference_jm_lathe_finishing_allowances_carbide_pressfit_2026_06_01]] + [[reference_whiskey_jm_param_optimization_audit_2026_06_02]].
