---
name: reference_haas_tap_bare_g84_no_m29
description: Haas mills tap with a bare G84 (always rigid) — M29 is Fanuc-only and would hang a Haas control
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.602Z
aliases: reference_haas_tap_bare_g84_no_m29
---


Haas mill controls (Pre-NGC and NGC) execute rigid tapping with a **bare `G84`** canned cycle — they are always in rigid-tap mode (rigid-tap option), so NO M-code prefix is needed. Golden-archive byte-truth: `JM DIE/CNC MILL HAAS/ALL STAR/ALL STAR.NC` taps with `G99 G84 Z-.625 R.1 F18.9` (no M29).

**`M29` is the FANUC rigid-tap activator, NOT a Haas tapping code.** On Haas, `M29` = "set output relay + wait for M-FIN" — emitting it before `G84` would HANG the control mid-tap (silent, broken-tap/scrap class). A Fanuc post that "spits M29" must NOT have that pattern copied into a Haas post.

**Why:** caught as a P0 in `U-PT-HAAS-CANNED-CYCLES` scrutiny (2026-06-01, slot echo, commit a1acfda90b). The two reviewers disagreed (A: remove M29 / FAIL, B: keep / PASS) — settled by **byte-equivalence vs the golden NC**, not opinion (echo soul rule #4: dialect codes from the controller-DB / golden archive, never re-derived from a manual). R7 conflict-fork: pick the corpus-evidenced claim.

**How to apply:** in any Haas post (`HaasNGCMillMasterPostEngine`, Haas `.cps`), a tap = bare `{G98|G99} G84 X Y Z R F`. The tap feed MUST equal pitch × rpm (the caller / oscar owns feed; echo emits it verbatim). Never emit M29 on Haas. Cross-dialect: a Fanuc post DOES use `M29 S<rpm>` before G84 — the codes look identical but the dialect contract differs, which is exactly why [[feedback_psn_definition]] dialect-rigor + golden-archive verification matters.
