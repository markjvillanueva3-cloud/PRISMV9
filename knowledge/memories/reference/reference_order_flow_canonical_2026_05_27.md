---
name: reference-order-flow-canonical-2026-05-27
description: "JM Die canonical order flow — Fusion 360 CAD → hyperMILL CAM (mill) + Fusion or Mastercam CAM (lathe, whichever is more feature-packed for the job). Locked 2026-05-27 by operator directive."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.688Z
aliases: reference_order_flow_canonical_2026_05_27
---


# Canonical order flow — JM Die (2026-05-27 lock)

## The pipeline

```
┌─────────────┐    ┌─────────────────────┐    ┌──────────────────────────────────┐
│  Blueprint  │ →  │ CAD: Fusion 360     │ →  │ CAM:                              │
│ (PDF/print) │    │ (delta lane)        │    │  • Mill → hyperMILL              │
│             │    │ (operator-driven)   │    │  • Lathe → Fusion OR Mastercam   │
└─────────────┘    └─────────────────────┘    │      (pick most feature-packed)  │
                                              │  (echo lane)                      │
                                              └──────────────────────────────────┘
                                                          ↓
                                              ┌──────────────────────────────────┐
                                              │ Post + G-code (india lane)        │
                                              └──────────────────────────────────┘
```

## Stage assignments

| Stage | Tool | Slot | Notes |
|---|---|---|---|
| Blueprint / print intake | pypdf + Tesseract (planned) + BlueprintOCREngine | **kilo** | PMI extraction + unit gate + part-class hint via `print-to-cad-handoff.py` |
| CAD generation | **Fusion 360** | **delta** | All CAD is born in Fusion. Has hardware key on `DESKTOP-N7MI1VB`. STEP export is the canonical CAM handoff format. |
| Mill CAM programming | **hyperMILL** | **echo** | Vendor key + install at `H:/PRISM/resources/HYPERMILL/hyperMILL/{31.0,33.0}/`. 1,163 native `.f3d` parts feed here via STEP. |
| Lathe CAM programming | **Fusion 360** OR **Mastercam X8** | **echo / india** | Pick whichever has the better feature set for the specific job. Default to Fusion for simple turn; default to Mastercam for advanced (Swiss, multi-axis live tooling, complex grooving). |
| Post + G-code emit | Master Post (PRISM canonical) | **india** | Multi-controller (Fanuc, Okuma OSP, Mitsubishi, Heidenhain, Mazatrol). |

## Why this matters for kilo's substrate

- **PMI extraction targets** must align with what Fusion CAD ingests (STEP AP242 PMI for tolerances + GD&T).
- **`partClassHint`** in `print-to-cad-handoff.json` must steer delta to the right Fusion feature template (hub_revolve + blade_loft + polar_pattern for turbines, etc.).
- **The unit-gate decision** must propagate through to hyperMILL/Mastercam — those CAM systems ingest both inch and mm but produce different post output. Silent conversion (the 2026-05-27 failure) is forbidden.
- **The 1,163 `.f3d` files** at `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/` are all Fusion-native (delta's lane) — the new binary format requires STEP-export to handoff to hyperMILL.

## CAM-decision heuristics for the lathe Fusion-vs-Mastercam fork

| Job shape | Pick Fusion if… | Pick Mastercam if… |
|---|---|---|
| Simple straight turn + face | Single setup, no Swiss, no live tooling | (default to Fusion) |
| Multi-axis (B-axis + C-axis indexing) | Fusion millturn module enabled | More than 2 cross-spindle ops |
| Swiss-type | (rare for Fusion) | Always Mastercam (Swiss is a Mastercam strength) |
| Live tooling + driven tools | Fusion handles basic driven | Complex sync pairs → Mastercam |
| Custom thread (variable pitch, multi-start) | Fusion variable-pitch threading available | Mastercam threadmilling library is larger |
| Bar puller + part catcher | Either | Mastercam has more catcher M-code variants |
| Hard turning (CBN inserts) | Either | Mastercam has more wear-comp cycles |

Default tiebreaker: **whichever has the most-recent customer-validated post for this machine**.

## Cross-refs

- [[reference_cam_corpus_locations]] — every CAM asset path on H:
- [[reference_cad_cam_seat_paths_2026_05_27]] — vendor seat install paths
- [[reference_kilo_cam_pivot_2026_05_24]] — kilo CAM-specialist pivot
- [[feedback_wiki_for_how_to_memory_for_pointers]] — this is a fact, hence memory not wiki
- `state/shared/specs/PRINT-TO-CAD-HANDOFF-CONTRACT-2026-05-27.md` — the kilo→delta handoff contract
