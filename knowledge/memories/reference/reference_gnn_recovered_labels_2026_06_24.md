---
name: reference_gnn_recovered_labels_2026_06_24
description: India 2026-06-24 -- 2 GNN ref-pool labels RECOVERED (the payoff of U-GNN-FEEDER-SPECULATIVE-WARN 4b0aa55769) -- both were being silently dropped by a SPECULATIVE_RE trigger word; verified each engine's ACTUAL dispatcher wiring (file:line) and re-asserted in clean minable phrasing. ZuluFleetGovernorEngine->prism_session is a STARVED class.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.592Z
aliases: reference_gnn_recovered_labels_2026_06_24
---


# GNN recovered labels -- india 2026-06-24

The fail-loud `speculativeSkipped` WARN (shipped 4b0aa55769) surfaced 2 TRUE ground-truth wirings that
the vault feeder was silently dropping because a trigger word sat on the same line (oscar's "is now
wired", zulu's "UNWIRED" tag). I VERIFIED each engine's ACTUAL dispatcher wiring (real import +
invocation, not a comment or a memory claim -- R12) and re-assert them here in clean minable phrasing
so `vault-to-gnn-refpool` mines them. Both are sparse/balanced additions (the measured-safe regime per
[[reference_codebase_wired_refpool_rejected_2026_06_18]]); ZuluFleetGovernor lands in the STARVED
prism_session class (high macro-F1 value).

## Recovered labels (verified, clean of any SPECULATIVE_RE trigger word)

- hsmAdvisorComparatorBridgeEngine wired into prism_calc (calcDispatcher.ts:10392, real import + .run() invocation).
- ZuluFleetGovernorEngine wired into prism_session (sessionDispatcher.ts:4570, real import; 3 invocation sites 4570/4575/4613, the HZD-02 read-only authority gate).

## Provenance
The dropped originals (do NOT edit cross-lane; recovered here instead):
oscar's `reference_oscar_hsmadvisor_live_wire_2026_06_01.md` ("is now wired" -> SPECULATIVE_RE `is \w+ wired`),
zulu's `reference_zulu_governor_wire_2026_06_01.md` ("UNWIRED" tag). The 3rd surfaced line
(EWMAEngine, "verify ... is wired") is a genuine QUESTION and is correctly left dropped.

Sibling: [[reference_gnn_feeder_speculative_warn_2026_06_24]] (the fix) + [[reference_gnn_confirmed_wiring_labels_2026_06_24]] (the +11). India soul: ground-truth only, no faking; sparse+balanced.
