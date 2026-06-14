---
name: reference-mazatrol-vs-gmcode-paradigm-2026-05-27
description: Conversational programming (Mazatrol/dialog) vs ISO G/M-code paradigm distinction. Surfaced from iter50 Mazak Mazatrol corpus (2354 segs/104591 chars — biggest single corpus contribution this session). Affects lathe-wizard output strategy.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:09.203Z
aliases: reference_mazatrol_vs_gmcode_paradigm_2026_05_27
---


# Mazatrol vs G/M-code paradigm

## The two paradigms

**ISO G/M-code (Fanuc/Haas/Okuma/Doosan/Siemens):**
- Programmer writes explicit blocks: `G00 X1.0 Z0.1`, `G96 S180 M03`, `G71 P10 Q20 U0.02 W0.005 D2000 F0.012`
- Tool offset numbers reference table entries: `T0101` = tool 1 + offset 1
- Canned cycles abstract roughing/finishing/threading/grooving (G71/G70/G76/G75)
- CAM software output target
- Every commercial PRISM bridge (Mastercam/Fusion 360/hyperMILL/Esprit/Inventor HSM) emits this

**Mazatrol (Mazak proprietary, also Okuma Advanced One Touch IGF):**
- Conversational/dialog programming — fill out form fields per process: "PROCESS: BAR", "MAT'L: STEEL", "DIA: 50", "DEPTH: 25"
- Control synthesizes the toolpath internally — no explicit G-code shown unless converted
- Faster for shop-floor edits + new part programming without CAM
- Limited CAM support (most CAM packages emit ISO + a Mazak-flavored post)

## Impact on lathe-wizard output strategy

When the wizard targets a Mazak with Mazatrol:
1. Emit Mazatrol process records (not G/M code)
2. Map operations to Mazatrol process names: BAR-OUT/IN, CPY-OUT/IN, EDG/CRN/CNR, THR (threading), GRV (grooving), DRL/TAP, MNP (manual)
3. Tool-data table format differs from Fanuc T-offset
4. ISO-output is still possible (Mazak supports EIA/ISO mode) but loses the conversational benefit

When wizard targets ISO G/M-code (everything else):
1. Emit canonical PRISM G-code structure
2. Canned cycles per controller dialect (G71 Type-I vs Type-II Fanuc variants etc.)

## Detection signal

Programs in `H:/PRISM/JM DIE/CNC LATHE/` ending `.MIN` are typically Fanuc/Mazatrol-export ISO (Mazak's `.MIN` is the EIA-mode dump). Programs ending `.PIM` are pure Mazatrol process files.

## Related

- [[feedback_jm_machine_manual_coverage_doctrine]] — JM fleet has Mazak lathes
- [[reference_whiskey_lathe_corpus_state_2026_05_27_iter101]] — session corpus including iter50 Mazatrol tutorial
- LatheCAMIntelligenceEngine + LatheCSSOptimizerEngine output should respect this distinction when emitting target-specific programs
