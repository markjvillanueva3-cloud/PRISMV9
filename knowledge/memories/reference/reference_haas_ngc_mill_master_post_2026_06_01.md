---
name: reference_haas_ngc_mill_master_post_2026_06_01
description: "HaasNGCMillMasterPostEngine — the Haas mill full post (closed condition-2 Haas gap); ground-truth-mirrored, wired into master_post_by_machine"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.602Z
aliases: reference_haas_ngc_mill_master_post_2026_06_01
---


# HaasNGCMillMasterPostEngine — Haas mill full post (slot:echo, 2026-06-01, U-PT-HAAS-ENGINE)

Closed the **condition-2 "Haas full-post coverage GAP"**: JM VMC-03/04 (Haas VF-class) previously had only cheap `.cps` coverage (proven 15/15 dialect-clean) and `master_post_by_machine` HARD-REJECTED Haas — there was NO PRISM full post for Haas. Now there is.

**Engine:** `mcp-server/src/engines/HaasNGCMillMasterPostEngine.ts` (singleton `haasNGCMillMasterPostEngine`). Full-post sibling of `HurcoV11MillMasterPostEngine` / `OkumaOSPMillMasterPostEngine`. **Ground-truth-mirrored** from a REAL JM Haas program `JM DIE/CNC MILL HAAS/ALL STAR/ALL STAR.NC` (Mastercam-posted) — NOT invented.

**Haas dialect (the load-bearing differences):** `()` paren comments (Fanuc family, NOT Okuma `[]`); `N`-numbered blocks step-2 (real JM Haas uses them, unlike Hurco); `G20`/`G21` units-first; safe-start `G0 G17 G40 G49 G80 G90`; per-op `T# M6` → `G0 G90 G54 X.. Y.. S.. M3` → `G43 H# Z..` → `M8` → moves → `M5` → `G91 G28 Z0. [M9]` → `M01`; footer `M5`/`G91 G28 Z0.`/`G28 X0. Y0.`/`M30`/`%`. **`G187` high-speed smoothing is CORRECT for Haas (opt-in `use_g187`, OFF by default — older JM baseline emits none) — the OPPOSITE of Hurco where G187 is wrong (→G05.3).**

**Wiring:** `camDispatcher.ts` `master_post_by_machine` — Haas branch matches `HAAS`/`VF-`/`VF2` (placed AFTER the Hurco branch so VM10/VM20/VMX can't mis-route; Haas **UMC = 5-axis is deliberately NOT matched** — needs 5-axis logic, tracked follow). Returns raw `{success,gcode,...}` (mirrors the Hurco router branch; not sealed).

**Physics:** Kienzle Fc + Taylor life from canonical `physics/constants.ts` (NEVER inlined). Machine limits (VF-2: 8100 RPM, advisory 2200 N force de-rate) are guideline warnings, never block emission.

**Proven:** `scripts/haas-post-proof.ts` → 3/3 corpus jobs **0 dialect-ERR + structural-100%** (the same bar as the other 3 posts) + **27/27 unit tests** (`src/__tests__/HaasNGCMillMasterPostEngine.test.ts`) + **2-of-2 per-file scrutiny PASS**. Scrutiny CAUGHT a real **inch-mode 25.4× scale P0** (geometry+feed emitted in mm magnitudes in G20 mode) — FIXED: `fmt`/`fmtFeed` now scale ALL geometry + feed to output units + guard non-finite feed (no `FInfinity`) + flag center-less arcs + warn on missing first-XY. UNITS-FIRST lesson reinforced (a units mismatch = 25.4× scrap/crash).

**Follow-ons (documented, NOT shipped):** canned-cycle emission (`G81/G83/G99/G80` — the engine currently emits literal `G0/G1/G2/G3` move-lists like the Hurco/Okuma siblings, since the corpus contract is a move-list not hole-positions); a dispatcher round-trip E2E test (needs the `:3100` rebuild path); UMC 5-axis post. See [[reference_echo_winmax_bridge]], [[reference_post_knowledge_enrich_2026_06_01]]. Build spec: `state/shared/post-training/MASTER-POST-HAAS-BUILD-SPEC.md`.
