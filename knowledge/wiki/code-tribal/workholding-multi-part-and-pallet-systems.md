---
schema: ideablock-v1
title: "Multi-part fixturing — tombstone, pallet, sub-plate decisions for production"
domain: "Workholding"
category: workholding
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Fixturing for Production
  - Jergens "Fixture Workbook" + Pioneer Pallet System catalog
  - System 3R / Erowa zero-point clamping system docs
  - Sandvik Coromant — Productivity guide §Multi-part
  - 4245-tribal corpus workholding subset (n=426)
extracted_via: human-authored
extracted_at: 2026-05-21T04:15:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-WORKHOLD-MULTIPART)
---

## Question

When does multi-part fixturing (tombstone, sub-plate, pallet) pay off, and which system fits the production scenario?

## Answer (canonical — amortize setup time across parts, but only when economics work)

### The amortization math

```
total_cycle_per_part = (machine_cycle_per_part) + (setup_time / parts_per_setup)
```

Single-part vise: parts_per_setup = 1, setup_time fully loaded onto every part.
N-part fixture: parts_per_setup = N, setup_time divided by N. Each additional N halves the setup penalty (diminishing returns past N ≈ 10).

**Where it pays off:**
- Cycle time < setup time (otherwise the cycle dominates and setup is small noise)
- N ≥ 4 parts per setup (below 4, fixture cost + design time rarely amortizes)
- Production run ≥ 50 parts (below 50, dedicated fixture cost exceeds saved time)
- Job recurs (one-time job = no amortization)

**Where it doesn't:**
- 1-off prototype
- Cycle time > 30 min per part (setup is single-digit % of total — fixture investment buys nothing)
- Tiny lot (< 20 parts and no recurrence)
- Part requires multiple orientations that one fixture can't hold

### System tier comparison

| System | Capacity | Repeatability | Setup time | Cost | When |
|---|---|---|---|---|---|
| **Single vise** | 1 part | 0.05-0.15 mm part-to-part | 5-15 min/part | $500-2000 vise | Prototyping, low volume, one-off |
| **Vise with multi-jaw stop** | 2-4 parts on one vise | 0.02-0.08 mm | 3-8 min/part | + $50-200 stop | Small runs of small parts |
| **Sub-plate + toe clamps** | 4-16 parts on a fixture plate | 0.03-0.10 mm | 8-20 min for full plate | $300-1500 plate + clamps | Medium-volume rectangular parts |
| **Dedicated fixture (machined)** | 4-32 parts in a custom holding scheme | 0.005-0.025 mm | 3-10 min for full fixture (auto-locating) | $2k-15k design+build | High-volume recurring jobs (> 500 parts/year) |
| **Tombstone (HMC 4-side)** | 4-32 parts across 4 vises/fixtures | 0.005-0.020 mm | 15-40 min full setup, amortized across all sides | $3k-20k tombstone + jaws | HMC production, multi-feature parts where flip is needed |
| **Quick-change pallet (System 3R, Erowa, Schunk)** | Pallet swap < 30 s; off-line setup | 0.002-0.005 mm | < 30 s pallet swap + off-line setup | $5k-50k system + N pallets | Continuous production, < 1 min cycles, multi-job mixed |
| **Bar feeder + sub-spindle (mill-turn)** | Continuous feed from bar stock | 0.005-0.020 mm | Initial bar load + program | $30k-200k mill-turn add-on | Round-stock high-volume |
| **3D-printed sacrificial nest** | Per-job, one-shot | 0.05-0.15 mm | 1-4 h print + cure | $20-100 in filament | Bridge between prototype and dedicated; one-time fixtures |

### Selection by production scenario

**Scenario: 1 part, ±0.05 mm tolerance, one-off**
→ Single vise + indicate. Don't over-engineer.

**Scenario: 20 parts, ±0.025 mm tolerance, monthly recurring**
→ Sub-plate with 4-stop locators + soft jaws cut once. Total fixture cost amortizes in 2-3 months.

**Scenario: 500 parts, ±0.010 mm tolerance, weekly recurring**
→ Dedicated 4-up fixture with dowels + threaded clamps. Build cost amortizes in the first batch.

**Scenario: 5000 parts/year, mixed lot sizes**
→ Pallet system with quick-change. Pallet swap in 30 s while off-line operator preps the next.

**Scenario: HMC with 4-axis trunnion, 50-piece batches**
→ Tombstone with 4 sides loaded simultaneously. Cycle one face while operator unloads another.

**Scenario: Round bar parts, lights-out**
→ Mill-turn with bar feeder + sub-spindle. Operator-free for the bar's length.

### The hidden cost of multi-part fixtures

Setup amortization is the headline benefit. The hidden costs that bite shops 6 months in:

1. **Crash radius is larger.** A vise crash damages 1 part + 1 vise. A tombstone crash damages 4-32 parts + 1 tombstone + possibly a spindle. Prove-out discipline (see [[machining-tactics-pre-cut-prep]]) is *more* critical with multi-part, not less.

2. **Tool change overhead multiplies.** A 4-tool program on a 1-part fixture is 4 changes per part. On a 16-part fixture (program treats all 16 as one cycle), it's still 4 changes — total — across 16 parts. That's the savings. But: if you tool-change *between* each part (one tool, all 16 parts, change, next tool, all 16), the gain disappears. The CAM strategy must tool-change *globally*, not per-part.

3. **Re-fixture-on-failure penalty.** When ONE part on the fixture goes bad (chatter scrap, broken tool, wrong feature), you must decide: scrap one and continue, or stop the whole cycle. The economics depend on whether the bad part can be removed and the rest finished — often it can't, especially with shared toolpaths.

4. **Tolerance transfer between positions on the fixture.** Each clamping position has its own micro-coordinate-frame. A part at position 1 and a part at position 16 have a position-stack-up of (manufacturing tolerance × N × variability factor). If your part tolerance is tighter than the fixture's repeatability across positions, half the parts will be out.

5. **Operator load time.** Loading 16 parts into 16 positions takes ~15-30 minutes IF the parts are awkward (orientation-sensitive, easy to mis-clamp). The 30s-per-position estimate is optimistic — measure your shop's actual rate before signing off on amortization math.

### Decision tree (used per-job, not per-shop)

```
Cycle < 5 min AND volume > 100 AND recurring?
  ├─ YES → multi-part justified
  │        ├─ Tolerance < 0.01 mm? → pallet or dedicated fixture
  │        ├─ HMC available?      → tombstone
  │        └─ Bar stock?          → mill-turn + bar feeder
  └─ NO  → single-part holder
           ├─ Tolerance < 0.025 mm? → soft jaws
           └─ Else                  → vise with hard jaws
```

### Modular vs dedicated — when to commit to a custom fixture

| Aspect | Modular (re-usable components) | Dedicated (one-job-only build) |
|---|---|---|
| Build cost | $500-2000 in components, reusable | $2000-15000 design + build |
| Build time | 1-4 h (assemble from kit) | 1-3 weeks (design + machine + validate) |
| Repeatability | 0.020-0.050 mm | 0.005-0.025 mm |
| Re-deployment | High — components return to crib | Low — only this job |
| When | < 100 parts, or first run of a new part | > 500 parts/year, or critical-tolerance job |

A common shop pattern: modular fixture for the first production run, then dedicated if it recurs and modular is the throughput bottleneck. The modular run pays for itself + funds the dedicated build.

### Anti-patterns from the floor

- **"Tombstone everything."** Tombstones are great for vertical-faced HMC parts. They're terrible for parts with 5-axis features (no swivel), for parts wider than the tombstone face (no real estate), for parts whose datums don't lock to vertical surfaces, and for prototypes (no amortization).

- **"More positions = more savings."** Past about 16 positions, the load-time-per-position dominates. A 32-position fixture loaded inattentively (because there's so many) ships more scrap than a careful 16-position run.

- **"Just buy the pallet system and figure it out."** A $50k pallet system without a multi-job mix to amortize across is a $50k paperweight. The system pays off when 3-5 different jobs share the same machine and pallets cycle between them off-line — not for a single job.

- **"Dedicated fixture pays for itself instantly."** Sometimes — but the design + build time (1-3 weeks) is *also* a cost. A shop with a 4-week lead time on the dedicated fixture loses 4 weeks of production at the slower rate. Compute total-time-to-first-good-part, not just per-cycle savings.

- **"Soft jaws ARE the fixture."** Soft jaws are a *part-of* the fixture, not the whole strategy. They give vise-class holders fixture-class repeatability for that *one* part shape. For multi-part, you still need the sub-plate / tombstone / pallet structure beneath the soft jaws.

### Tie-ins

- [[workholding-clamp-force-and-selection]] — multi-part fixtures multiply the force-budget calculation (each position needs its own grip)
- [[workholding-locators-and-soft-jaws]] — each fixture position needs its own locator scheme; reuse becomes a soft-jaw decision per position
- [[part-setup-multi-op-planning]] — tombstone strategy ties directly to the setup-count math; a 4-sided tombstone reduces N from 4 to 1
- [[machining-tactics-pre-cut-prep]] — prove-out for multi-part is critical; a single bad zero ruins N parts not 1
- [[tooling-tool-life-and-wear-management]] — tool-change strategy on multi-part is global, not per-position; sister tools matter more

## Provenance

Distilled from the 426 workholding tips in the 4245-tribal corpus + Machinery's Handbook 31e §Fixturing for Production + Jergens / Pioneer / System 3R / Erowa / Schunk catalogs + Sandvik Productivity guide. Authored 2026-05-21 by slot:hotel under U-WIKI-WORKHOLD-MULTIPART — third canonical workholding entry, completing the tri-axis: force budget [[workholding-clamp-force-and-selection]] + locator geometry [[workholding-locators-and-soft-jaws]] + production scale (this entry).

System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces on `tombstone`, `pallet`, `quick-change`, `Erowa`, `System 3R`, `Schunk`, `multi-part`, `sub-plate`, `fixture amortization`, `dedicated fixture`, `modular fixture`, `bar feeder`, `mill-turn`, `4-sided`, `HMC fixture`, `fixture cost`, `setup amortization` keywords. Zero wiring required.

## Cross-references

- [[workholding-clamp-force-and-selection]] — force budget per fixture position
- [[workholding-locators-and-soft-jaws]] — locator scheme per position
- [[part-setup-multi-op-planning]] — tombstone reduces setup count
- [[machining-tactics-pre-cut-prep]] — prove-out criticality scales with N parts at risk
- [[tooling-tool-life-and-wear-management]] — global tool-change strategy
- [[reference_tribal_coverage_audit_2026_05_18]] — coverage audit; workholding now has 3 canonical entries (tri-axis complete)
- [[feedback_do_optional_high_roi_work]] — standing rule honored
