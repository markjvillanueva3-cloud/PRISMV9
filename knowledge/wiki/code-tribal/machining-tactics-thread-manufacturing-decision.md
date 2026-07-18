---
schema: ideablock-v1
title: "Thread manufacturing decision — tap vs thread-mill vs single-point vs roll-form"
domain: "Machining tactics"
category: machining-tactics
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Threads and Threading
  - Sandvik / Emuge / OSG / Vargus threading technical guides
  - ASME B1.1 (Unified) + ISO 261/262 (metric threads)
  - 4245-tribal corpus threading subset
extracted_via: human-authored
extracted_at: 2026-05-21T13:15:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MACHTACT-THREAD-DECISION)
---

## Question

Tap, thread-mill, single-point, or roll-form — which threading method for which job, and what's the failure mode of each?

## Answer (canonical — the method is decided by hole/shaft type, material, size, quantity, and risk tolerance)

### The 4 threading methods

| Method | What it is | Internal/External | Key trait |
|---|---|---|---|
| **Tapping** | A multi-flute tap cuts (or forms) the full thread in one axial pass | Internal | Fast; one tool one pass; tap-in-hole = scrap if it breaks |
| **Thread milling** | A single thread-form tool helically interpolates the thread | Both | Recoverable on break; one tool many sizes; needs 3-axis helical |
| **Single-point** | A lathe tool traces the thread in multiple passes | Both (lathe) | Total control; slow; the lathe-threading default |
| **Roll forming** | A form tap (or thread rolls) displaces material — no chip | Both | Strongest thread (grain flow preserved); no chips; ductile materials only |

### Decision matrix

| Situation | Preferred method | Reason |
|---|---|---|
| Small hole (< M6 / < 1/4"), high volume, ductile material | **Roll-form tap** | Fast, strong, no chips to evacuate, no tap-flute clogging |
| Small hole, general | **Cut tap** | The default for most internal threads |
| Large hole (> M12), or near-net-cost material | **Thread mill** | Tap breakage in a large expensive part = scrap; thread mill is recoverable |
| Blind hole, limited depth | **Thread mill** | Mills can thread to the bottom; taps need run-out room for the chamfer + chip room |
| Hard material (> 35 HRC) | **Thread mill** (carbide) | Taps struggle in hard material; carbide thread mills handle it |
| Any thread on a lathe, OD or ID | **Single-point** | The lathe's native method; total pitch + form control |
| Multi-start thread | **Single-point or thread-mill** | Taps are single-start only |
| Tapered thread (NPT) | **Tap (taper tap)** OR single-point | Form-specific tooling |
| Thin wall / fragile part | **Thread mill** | Low radial force; tapping torque can distort or crack a thin boss |
| One-off, no tap on hand | **Thread mill** | One thread mill covers many pitches of the same form |

### The break-recovery argument (why thread-milling wins for expensive parts)

A tap that breaks **inside the hole** is the worst outcome in threading:
- The broken tap is hardened HSS/carbide — drilling it out is nearly impossible.
- EDM tap-removal is slow + expensive.
- Often the part is scrapped.

If the part is a $5 aluminum bracket, tap-and-pray is fine. If the part is a $5,000 near-finished aerospace housing in setup 3 of 3, a broken tap destroys hours of accumulated value. **Thread milling never leaves a broken tool in the hole** — a broken thread mill retracts. For expensive / near-net / late-in-sequence threads, thread milling's recoverability is worth its slower cycle.

This is the same cost-asymmetry logic as [[machining-tactics-pre-cut-prep]] — the cheap insurance vs the expensive failure.

### Roll forming — the strongest thread

A roll-form (form) tap doesn't cut — it *displaces* material plastically into the thread form. Result:
- No chips (huge advantage in blind holes + automated cells).
- Grain flow follows the thread contour → ~10-30 % stronger thread than a cut thread.
- Better surface finish on the flanks.

But: roll forming needs **ductile material** (aluminum, low-carbon steel, copper). It cannot form brittle materials (cast iron, hardened steel) — they crack instead of flowing. And the pre-thread hole size is different (larger) than for a cut tap — the material has to have somewhere to flow. Using a cut-tap drill size with a form tap → broken tap or torn thread.

### Tap-drill sizing — the universal mistake

The pre-thread hole determines thread engagement (% of full thread depth):

```
Cut tap:   hole_dia = major_dia - (pitch × %engagement/100 × 1.08)   (approx; use the chart)
Form tap:  hole_dia is LARGER than for a cut tap (material flows inward)
```

- **75 % engagement** is the standard target — most of the strength of 100 %, far less tapping torque.
- **100 % engagement** is rarely worth it — the last 25 % of engagement adds ~5 % strength but dramatically more torque + break risk.
- **50 % engagement** for hard materials or hand-tapping — sacrifices some strength to survive.

Always use the tap-drill chart for the exact size; the formula is an approximation. PRISM's `prism_thread:calculate_tap_drill` + `prism_machining_kb:kb_calc_tap_drill` give the exact value. See [[machining-tactics-gcode-safety-and-macros]] for the rigid-tap G84 cycle.

### Anti-patterns from the floor

- **"Tap everything, it's fastest."** Fastest per-hole, yes — but a broken tap in an expensive part erases the time savings 100×. Match the method to the part value + thread position in the sequence.

- **"Form tap = cut tap with a different drill."** The hole size is genuinely different (larger for form). Use a cut-tap drill with a form tap → the material has nowhere to flow → broken tap. Use the FORM-tap drill chart.

- **"Roll form anything for strength."** Only ductile materials. Cast iron, hardened steel, brittle alloys crack under the displacement. Roll forming is a ductile-material method.

- **"100 % thread engagement is strongest, so use it."** The strength gain from 75 % → 100 % is marginal (~5 %); the torque + break-risk increase is large. 75 % is the engineering default for a reason.

- **"Thread milling is slow, avoid it."** Per-thread, yes slower than tapping. But it's recoverable, handles hard material + large + blind, covers many sizes with one tool, and applies low radial force. For the right job it's not "slow" — it's the only method that doesn't risk scrapping the part.

- **"Single-point threading is just for lathes."** Mostly — but it's the *total-control* method: any pitch, any form, multi-start, custom threads. When the thread is non-standard, single-point (or thread-mill) is the answer; taps only exist for standard threads.

### Tie-ins

- [[machining-tactics-gcode-safety-and-macros]] — G84 rigid-tap cycle + the M19 orient for single-point
- [[machining-tactics-pre-cut-prep]] — the cost-asymmetry logic (cheap insurance vs expensive failure)
- [[part-setup-multi-op-planning]] — thread position in the operation sequence drives the method choice
- [[tooling-selection-by-material-and-feature]] — tap/thread-mill substrate + coating selection
- [[operation-ordering-hole-sequence]] — threading is the last step of the spot→drill→bore→thread chain
- [[machining-tactics-material-removal-economics]] — the break-recovery cost calculation

## Provenance

Distilled from the threading subset of the 4245-tribal corpus + Machinery's Handbook 31e §Threads and Threading + Sandvik/Emuge/OSG/Vargus technical guides + ASME B1.1 + ISO 261/262. Authored 2026-05-21 by slot:hotel under U-WIKI-MACHTACT-THREAD-DECISION — **44th canonical entry** of the wiki+tribal pivot. Tier-2 universal (every shop threads holes); gives the tap-vs-mill-vs-single-point-vs-roll decision its own canonical leaf.

System injection: `tribal-by-domain-inject` auto-surfaces on `threading`, `tap`, `thread mill`, `single-point thread`, `roll form tap`, `form tap`, `tap drill`, `thread engagement`, `broken tap`, `G84 rigid tap`, `thread method`, `tapping torque` keywords. Zero new wiring required.

## Cross-references

- [[machining-tactics-gcode-safety-and-macros]] — G84 rigid-tap cycle
- [[machining-tactics-pre-cut-prep]] — cost-asymmetry logic
- [[part-setup-multi-op-planning]] — thread position in sequence
- [[tooling-selection-by-material-and-feature]] — tap/mill substrate selection
- [[operation-ordering-hole-sequence]] — threading as the chain's last step
- [[machining-tactics-material-removal-economics]] — break-recovery economics
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule
