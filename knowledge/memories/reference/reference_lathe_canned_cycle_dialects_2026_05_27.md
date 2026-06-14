---
name: reference-lathe-canned-cycle-dialects-2026-05-27
description: G71/G70/G76/G75 canned-cycle syntax variations across Fanuc/Haas/Okuma/Doosan/Mazak controllers. Distilled from iter49-iter54 + iter66 corpus. Direct input to LathePostProcessor controller-specific output.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:09.187Z
aliases: reference_lathe_canned_cycle_dialects_2026_05_27
---


# Lathe canned-cycle dialect map

## G71 Stock-Removal (Roughing)

**Fanuc Oi-TF (modern, Type-II default):**
```
G71 U2.0 R0.5             ;DOC=2.0, retract=0.5
G71 P100 Q200 U0.02 W0.005 F0.012   ;P=start, Q=end, U=X-stock, W=Z-stock
N100 G00 X10.0 Z0.1
...
N200 G00 X50.0 Z-25.0
```
Type-II supports concave + non-monotonic profiles. Older Fanuc Type-I requires monotonic-Z profile.

**Haas NGC (Fanuc-compatible but variations):**
```
G71 U2.0 R0.5
G71 P100 Q200 U0.02 W0.005 F0.012
```
Identical to Fanuc Type-II in modern NGC; legacy Haas Classic restricts to Type-I (monotonic).

**Okuma OSP:**
```
G85 NL1 NLF1 D2.0 U0.04 W0.01 F0.012   ;OSP "LAP" cycle, not strict G71
NL1: shape definition starts here
... profile blocks ...
NLF1: shape definition end marker
```
Okuma uses NL/NLF (start/end labels) instead of P/Q block-numbers. OSP also exposes higher-level "CAM"-style cycles via Advanced One Touch IGF (similar to Mazatrol).

**Doosan/DN Solutions (Fanuc-compatible):**
```
G71 U2.0 R0.5
G71 P100 Q200 U0.02 W0.005 F0.012
```
Identical to Fanuc Oi-TF (most JM-fleet Doosans run Fanuc 0i / DOOSAN-Fanuc).

**Mazak (EIA/ISO mode):**
```
G71 P100 Q200 I0.02 K0.005 D2000 F0.012
```
Note: Mazak uses **D=DOC×1000** + **I=X-stock** + **K=Z-stock** (different letter assignments vs Fanuc's U+W). Easy mistake → 1000× wrong DOC if confused with Fanuc U2.0 = 2.0mm vs Mazak D2000 = 2.000mm.

## G70 Finish-Pass

Universal across controllers:
```
G70 P100 Q200 F0.005   ;follow profile P→Q with new feed
```
Always paired with the preceding G71 sequence — references same P/Q (or NL/NLF on Okuma).

## G76 Threading (Modern roughing+finish canned cycle)

**Fanuc/Haas (2-line form):**
```
G76 P020060 Q50 R0.003               ;P=#passes/chamfer/angle, Q=min DOC, R=finish stock
G76 X28.0 Z-25.0 P1300 Q300 F2.0     ;X=minor dia, Z=end, P=thread depth×1000, Q=first DOC×1000, F=pitch
```

**Okuma (single-line form):**
```
G33 X28.0 Z-25.0 F2.0 H1.3 D0.3 A60 K5 P0.003
```
Okuma G33 with H/D/A/K/P arg-letters does what Fanuc 2-line G76 does.

**Mazak (process-record in Mazatrol mode):**
```
PROCESS: THR
TYPE: STR (straight, not taper)
DIA: 30.0
PITCH: 2.0
DEPTH: 1.3
PASS-NO: 6
```
No G-code at all in conversational mode.

## G75 Grooving (peck cycle)

**Fanuc/Haas:**
```
G75 R0.5                             ;retract amount
G75 X20.0 Z-15.0 P3000 Q5000 F0.008  ;X=groove-OD-final, Z=groove-axial-end, P=X-peck×1000, Q=Z-step×1000
```

**Okuma:**
```
G73 X20.0 Z-15.0 I0.5 K0.5 F0.008    ;I=X-peck, K=Z-step
```
Note: Okuma G73 is the grooving cycle (NOT the rough-pattern G73 in Fanuc; Okuma reuses the number for different op).

## Doctrine for the wizard

1. **Detect controller from program header / file extension** (`.MIN`/`.PIM` Mazak; `.NC` Fanuc-default; `.OSP` Okuma)
2. **Emit dialect-specific canned-cycle blocks** via LathePostProcessor controller-routing
3. **Never assume Fanuc-syntax is portable** — Mazak's D=DOC×1000 vs Fanuc U2.0 = 2.0mm is the most-common silent miss
4. **Validate semantic equivalence** when migrating programs between controllers (G71 P/Q ↔ Okuma NL/NLF; G75 ↔ Okuma G73 grooving)

## Anti-patterns surfaced in JM-Die archive likely

- ❌ Fanuc-syntax program loaded into a Mazak controller running ISO/EIA mode but the conversion script didn't remap U→I, W→K, DOC×1000 vs DOC literal
- ❌ Okuma G73-grooving program mistakenly run on a Fanuc (Fanuc G73 = rough-pattern, not grooving = collision)
- ❌ Haas Classic program (Type-I G71) ported to a part needing Type-II (concave profile) without rewriting

## Related

- [[reference_mazatrol_vs_gmcode_paradigm_2026_05_27]] — paradigm-level distinction
- [[reference_lathe_program_quality_rubric_2026_05_27]] — Category D (canned-cycle discipline)
- [[reference_whiskey_lathe_corpus_state_2026_05_27_iter101]] — corpus from iter49-iter54+iter66
- LathePostProcessor + WinMax/Mazatrol-compatible post-routes
