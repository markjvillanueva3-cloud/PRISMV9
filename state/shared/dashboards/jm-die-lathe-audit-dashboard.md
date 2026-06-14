# JM Die Lathe Variant Audit Dashboard
Generated: 2026-05-24T22:28:56.681Z  ·  Engine: LatheProgramAuditPipelineEngine v1.0.0

## Verdict counts
- audited:        114646
- pass:           0 (0.0%)
- pass_with_notes:0 (0.0%)
- warn:           143 (0.1%)
- fail:           114503 (99.9%)
- no-motion-moves: 140 (parsed nothing; non-G-code or header-only)

## Findings totals
- Stage-A critical: 3997595
- Stage-A high:     114653
- Stage-A medium:   4060
- Stage-C collisions: 2297375
- Stage-C near_miss:  134112

## Per-machine breakdown
| Machine | Audited | Pass | Warn | Fail | Collisions | Near-miss |
|---|---:|---:|---:|---:|---:|---:|
| LTH-01 | 16378 | 0 | 17 | 16361 | 350619 | 19114 |
| LTH-02 | 16378 | 0 | 17 | 16361 | 352171 | 19270 |
| LTH-03 | 16378 | 0 | 17 | 16361 | 353403 | 19272 |
| LTH-04 | 16378 | 0 | 17 | 16361 | 347525 | 19114 |
| LTH-05 | 16378 | 0 | 17 | 16361 | 347525 | 19114 |
| LTH-06 | 16378 | 0 | 41 | 16337 | 198607 | 19114 |
| LTH-07 | 16378 | 0 | 17 | 16361 | 347525 | 19114 |

## Worst 20 failures (lowest score first)
| Score | Machine | Part | Collisions | First-rule | Line | Variant |
|---:|---|---|---:|---|---:|---|
| 0 | LTH-02 | A57-CC-68-2-C | 1320 | envelope_x | 19 | PRISM_UPGRADED/Okuma_GENOS_L200E-M/A57-CC-68-2-C.nc |
| 0 | LTH-01 | A57-CC-68-2-C | 1320 | envelope_x | 19 | PRISM_UPGRADED/Okuma_GENOS_L300-M/A57-CC-68-2-C.nc |
| 0 | LTH-04 | A57-CC-68-2-C | 1320 | envelope_x | 19 | PRISM_UPGRADED/Okuma_LB-3000EX/A57-CC-68-2-C.nc |
| 0 | LTH-05 | A57-CC-68-2-C | 1320 | envelope_x | 19 | PRISM_UPGRADED/Okuma_LB-3000EX_II/A57-CC-68-2-C.nc |
| 0 | LTH-03 | A57-CC-68-2-C | 1320 | envelope_x | 19 | PRISM_UPGRADED/Okuma_LNC8/A57-CC-68-2-C.nc |
| 0 | LTH-07 | A57-CC-68-2-C | 1320 | envelope_x | 19 | PRISM_UPGRADED/Okuma_Multus_B250II/A57-CC-68-2-C.nc |
| 0 | LTH-06 | A57-CC-68-2-C | 1307 | chuck_clearance | 34 | PRISM_UPGRADED/Okuma_LB-3000EX-BigBore/A57-CC-68-2-C.nc |
| 0 | LTH-02 | A0763-64-06-C | 1124 | envelope_x | 24 | PRISM_UPGRADED/Okuma_GENOS_L200E-M/A0763-64-06-C.nc |
| 0 | LTH-01 | A0763-64-06-C | 1124 | envelope_x | 24 | PRISM_UPGRADED/Okuma_GENOS_L300-M/A0763-64-06-C.nc |
| 0 | LTH-04 | A0763-64-06-C | 1124 | envelope_x | 24 | PRISM_UPGRADED/Okuma_LB-3000EX/A0763-64-06-C.nc |
| 0 | LTH-05 | A0763-64-06-C | 1124 | envelope_x | 24 | PRISM_UPGRADED/Okuma_LB-3000EX_II/A0763-64-06-C.nc |
| 0 | LTH-03 | A0763-64-06-C | 1124 | envelope_x | 24 | PRISM_UPGRADED/Okuma_LNC8/A0763-64-06-C.nc |
| 0 | LTH-07 | A0763-64-06-C | 1124 | envelope_x | 24 | PRISM_UPGRADED/Okuma_Multus_B250II/A0763-64-06-C.nc |
| 0 | LTH-06 | A0763-64-06-C | 1111 | chuck_clearance | 36 | PRISM_UPGRADED/Okuma_LB-3000EX-BigBore/A0763-64-06-C.nc |
| 0 | LTH-02 | A57-CC-68-2-Y | 1064 | envelope_x | 19 | PRISM_UPGRADED/Okuma_GENOS_L200E-M/A57-CC-68-2-Y.nc |
| 0 | LTH-01 | A57-CC-68-2-Y | 1064 | envelope_x | 19 | PRISM_UPGRADED/Okuma_GENOS_L300-M/A57-CC-68-2-Y.nc |
| 0 | LTH-04 | A57-CC-68-2-Y | 1064 | envelope_x | 19 | PRISM_UPGRADED/Okuma_LB-3000EX/A57-CC-68-2-Y.nc |
| 0 | LTH-05 | A57-CC-68-2-Y | 1064 | envelope_x | 19 | PRISM_UPGRADED/Okuma_LB-3000EX_II/A57-CC-68-2-Y.nc |
| 0 | LTH-03 | A57-CC-68-2-Y | 1064 | envelope_x | 19 | PRISM_UPGRADED/Okuma_LNC8/A57-CC-68-2-Y.nc |
| 0 | LTH-07 | A57-CC-68-2-Y | 1064 | envelope_x | 19 | PRISM_UPGRADED/Okuma_Multus_B250II/A57-CC-68-2-Y.nc |

**Operator should NOT load any FAIL variant onto the shop floor until the underlying rule is addressed in the upgrader (Stage-A) or the program is re-fixtured to fit the envelope (Stage-C).**