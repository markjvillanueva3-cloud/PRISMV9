---
name: reference-whiskey-jm-v2-envelope-fit-gate-2026-05-29
description: JM-Die V2 lathe upgrade output is NOT geometry-correct for a different target envelope — it must pass the envelope-fit gate (U-UPGRADE-BODY-RESCALE, shipped iter15) before any shop-floor run. Safety doctrine.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:11.044Z
aliases: reference_whiskey_jm_v2_envelope_fit_gate_2026_05_29
---


**Standing lathe SAFETY doctrine.** The JM-Die V2 program-upgrade pipeline (`JMDieLatheProgramUpgraderV2`) is a near-pure annotation pass-through ([[reference_iter218_alcoa_outlier_retraction_2026_05_27]]) — it does NOT body-rescale toolpaths to a target part envelope. A 32,756-variant audit (iter13, handoff `HANDOFF-claude-902de304-whiskey-jm-die-lathe.md`) found **99.9% FAIL (32,722/32,756)** when variants were checked against envelope fit. **An upgraded/regenerated variant is dimensionally unsafe to run on a different envelope until it passes the envelope-fit gate.**

**Resolution (R12 — verified, not stale):** the operator directive "pull no variant onto shop floor until U-UPGRADE-BODY-RESCALE ships" is **SATISFIED** — `U-UPGRADE-BODY-RESCALE` shipped iter15 (commit `44ddc4d1ef`, "envelope-fit gate"). The rule is therefore: **every V2/regenerated variant MUST pass the envelope-fit gate before shop floor; do not bypass it.** (Was an open blocker iter13→15; now a mandatory standing gate.)

**Apply:** in the GSD validate ladder, the envelope-fit gate is a hard pre-ship gate for any AI-upgraded/regenerated turning program — alongside `/lathe-lint` (physics) + dialect lint (echo). AI-generated G-code is dimensionally suspect by default. Related: [[feedback_jm_die_b_versions_are_ai_not_human_upgrade]] · [[reference_whiskey_lathe_gsd_protocol_2026_05_29]].
