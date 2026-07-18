---
name: reference_echo_legal_gate_masterpost
description: MS-MASTERPOST (44 units) is GATED on U-LEGAL-13 — public-manual re-derive only (post-processor galaxy / slot echo)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.561Z
aliases: reference_echo_legal_gate_masterpost
---


The MS-MASTERPOST 44-unit product ship is **blocked on U-LEGAL-13**: post-processor dialect codes must be re-derived from **public** manuals only — Fanuc B-61395E, Haas 96-0284, Mitsubishi IB-1501279, Siemens 840D, Okuma OSP-P300. Re-deriving from copyrighted/proprietary manuals trips the gate.

**Safe vs gated:** iterating on already-existing JM `.cps` files + PRISM's own engine surface does NOT trip U-LEGAL-13. Touching manufacturer documentation to extract new dialect codes DOES. echo's stub-wiring + JM .cps upgrade work (iterations on existing artifacts) is clear; net-new manual extraction is gated.

Source: `state/shared/specs/POST-PROCESSOR-CONSOLIDATION-2026-05-25-echo.md` §1/§6. See [[reference_echo_masterpost_engine_surface]], [[feedback_no_public_h_drive]].
