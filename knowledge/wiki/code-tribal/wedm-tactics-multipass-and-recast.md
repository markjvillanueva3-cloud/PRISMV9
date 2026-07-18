---
schema: ideablock-v1
title: "Wire-EDM tactics — multi-pass skim scheduling + recast-layer management"
domain: "Wire EDM tactics"
category: wedm-tactics
version_state: Current
confidence: 0.95
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Electrical Discharge Machining
  - Sodick / Mitsubishi / Makino WEDM operator manuals
  - ASM Handbook §Surface Integrity (recast / white layer / HAZ)
  - 4245-tribal corpus WEDM subset
extracted_via: human-authored
extracted_at: 2026-05-21T12:05:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-WEDM-MULTIPASS-RECAST)
---

## Question

How many WEDM passes, what offset per pass, and what does the recast layer cost me — the multi-pass schedule that decides finish + accuracy + surface integrity?

## Answer (canonical — rough pass for bulk, skim passes for finish + accuracy; recast is the hidden tax)

### Why multi-pass — the rough/skim split

A single WEDM pass at high discharge energy is fast but leaves:
- A wide, slightly tapered/bowed kerf (wire deflects under discharge + flushing force)
- A thick recast layer (50-150 μm of resolidified melted metal — see below)
- Poor surface finish (Ra 2-5 μm)

Multi-pass solves all three:

| Pass | Discharge energy | Offset | Removes | Purpose |
|---|---|---|---|---|
| **Rough (cut 1)** | High | Largest (leaves stock) | ~90 % of kerf material | Bulk removal, fast, accepts poor finish |
| **Skim 1 (trim 1)** | Medium | Smaller | Roughing-pass damage layer | Removes recast + corrects bow/taper |
| **Skim 2 (trim 2)** | Low | Smaller still | Skim-1 damage | Finish + accuracy refinement |
| **Skim 3+ (trim 3+)** | Very low | Tiny | Skim-2 damage | Final finish (Ra < 0.4 μm) + thinnest recast |

### Pass count by spec

| Requirement | Passes | Final Ra | Final recast |
|---|---|---|---|
| Bulk separation, finish irrelevant | 1 (rough only) | 2-5 μm | 50-150 μm |
| Standard tolerance, moderate finish | 2 (rough + 1 skim) | 1-2 μm | 20-50 μm |
| Tight tolerance, good finish | 3 (rough + 2 skim) | 0.4-1.0 μm | 5-20 μm |
| Precision die / mold, mirror finish | 4-6 (rough + 3-5 skim) | < 0.4 μm | < 5 μm |
| Aerospace / medical, recast-controlled | 5-8 + verified | < 0.2 μm | near-zero (verified by cross-section) |

Each added skim pass costs cycle time but buys finish + accuracy + recast reduction. The economic decision is the same as turning's [[machining-tactics-material-removal-economics]] — match the pass count to the spec, don't over-machine.

### Offset scheduling — the geometry

Each pass cuts at a programmed *offset* from the final part line:

```
offset_pass_N = wire_radius + spark_gap_pass_N + remaining_stock_pass_N
```

- **Rough pass**: offset leaves stock (e.g. +0.05-0.10 mm of material on the part side) for the skims to remove.
- **Each skim**: offset shrinks toward the final part line; the last skim's offset = wire_radius + finish-spark-gap exactly.
- The CAM/control computes these from the wire dia + the per-pass discharge settings; the operator verifies the *last* skim lands on the part line.

Constant-stock-per-skim is the goal — like turning's constant chip area. If skim 1 removes 40 μm and skim 2 removes 5 μm, skim 2 is barely cutting (wasted) and skim 1 is overloaded.

### The recast layer — the hidden tax

WEDM is a thermal process: each spark melts a micro-volume of metal; the dielectric quenches it. Some melted metal resolidifies on the cut surface as the **recast layer** (also "white layer"):

| Zone | Depth | Property |
|---|---|---|
| **Recast / white layer** | 2-150 μm (pass-dependent) | Resolidified melt; hard, brittle, micro-cracked, different microstructure |
| **Heat-affected zone (HAZ)** | below recast, 10-100 μm | Tempered/transformed but not melted; altered hardness |
| **Bulk** | below HAZ | Unaffected parent material |

**Why recast matters:**
1. **Fatigue life** — the micro-cracked brittle recast is a crack-initiation site. For fatigue-loaded parts (aerospace, medical), recast must be removed or minimized.
2. **Corrosion** — recast has different composition (may include wire-material transfer + carbon from dielectric breakdown); galvanic + pitting risk.
3. **Dimensional** — recast IS material on the surface; if not accounted, the part measures oversize.
4. **Hardness mismatch** — recast hardness ≠ bulk; for mating/sliding surfaces this matters.

**Recast control:** lower discharge energy on the final skims = thinner recast. Aerospace/medical specs often require recast < 5 μm verified by metallographic cross-section, OR a post-process (polish, etch, or a light grind) to remove it entirely. The skim-pass schedule IS the recast-control lever.

### Skim-pass anti-patterns from the floor

- **"More skim passes = always better."** Past the spec requirement, skim passes are wasted cycle time. A part that needs Ra 1.0 μm doesn't need 6 passes; 3 gets there. Match passes to spec.

- **"Recast doesn't matter, it's just surface."** For static non-critical parts, often true. For fatigue-loaded / corrosion-exposed / precision-mating parts, recast is a failure mode. Know the part's service condition before deciding skim count.

- **"The last skim removes the recast from the rough pass."** No — each pass leaves ITS OWN recast (thinner each time as energy drops). The last skim's recast is what ships. You can't "skim away" recast to zero with WEDM alone; below ~2-5 μm you need a post-process.

- **"Constant offset reduction per pass."** The offset reduction should track the *damage layer* each pass needs to remove, not be a fixed decrement. Skim 1 removes the thick rough recast; later skims remove progressively thinner layers. Fixed decrements either under-cut (recast remains) or over-cut (wasted).

- **"Rough pass accuracy doesn't matter, skims fix it."** Skims can correct ~50-80 % of rough-pass bow/taper, not 100 %. A grossly bowed rough pass leaves error the skims can't fully remove. The rough pass still needs reasonable flushing + tension ([[wedm-tactics-wire-and-flushing]]).

### Tie-ins

- [[wedm-tactics-wire-and-flushing]] — sibling WEDM tactical entry (wire + tension + flushing)
- [[wedm-wiring-backlog-bridge]] — tribal anchor for WEDM multi-pass + recast + HAZ engine wiring
- [[operation-ordering-rough-finish-sandwich]] — WEDM rough/skim IS the rough/finish sandwich for EDM
- [[synthesis-thermal-envelope]] — recast/HAZ are thermal phenomena; WEDM is fully thermal
- [[quality-first-article-inspection-and-spc-cadence]] — recast verification by cross-section is an inspection step
- [[machining-tactics-material-removal-economics]] — pass-count = the WEDM cost/spec trade-off

## Provenance

Distilled from the WEDM subset of the 4245-tribal corpus + Machinery's Handbook 31e §EDM + Sodick/Mitsubishi/Makino operator manuals + ASM Handbook §Surface Integrity. Authored 2026-05-21 by slot:hotel under U-WIKI-WEDM-MULTIPASS-RECAST — **40th canonical entry** of the wiki+tribal pivot. **Second WEDM tactical leaf** — with [[wedm-tactics-wire-and-flushing]] closes the WEDM tribal-coverage gap flagged in [[wedm-wiring-backlog-bridge]].

System injection: `tribal-by-domain-inject` auto-surfaces on `WEDM multi-pass`, `skim pass`, `trim pass`, `rough pass EDM`, `recast layer`, `white layer`, `HAZ`, `heat-affected zone`, `wire offset`, `WEDM finish`, `surface integrity EDM`, `pass schedule` keywords. Zero new wiring required.

## Cross-references

- [[wedm-tactics-wire-and-flushing]] — sibling WEDM tactical entry
- [[wedm-wiring-backlog-bridge]] — WEDM engine-wiring bridge (this is a tribal anchor)
- [[operation-ordering-rough-finish-sandwich]] — rough/skim = rough/finish for EDM
- [[synthesis-thermal-envelope]] — recast/HAZ thermal physics
- [[quality-first-article-inspection-and-spc-cadence]] — recast cross-section verification
- [[machining-tactics-material-removal-economics]] — pass-count economics
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule
