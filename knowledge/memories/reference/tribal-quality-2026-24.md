---
type: tribal-consolidation
topic: quality
iso_week: 2026-24
cluster_size: 144
cluster_size_synthesized: 10
aggregate_confidence: 88.7
tags: ["hypermill", "hypercad-s", "inspection", "offset", "import", "first-article", "deburring", "datum"]
materials: []
operations: ["chamfering", "wire_edm"]
_consolidatedAt: 2026-06-09T06:33:51.702Z
epistemic_only: true
consumed_by_machining: false
milestone: OBSIDIAN-COMPOUND-MS1/S6/U-TRIBAL-CONSOLIDATE
---
# Tribal: quality — 2026-24

_144 tips clustered on 'quality' with mean confidence 88.7/100. The vault is supposed to talk back; this is what it heard from the shop floor this week._

## Top Tips (10)

### 1. First-article inspection shortcut

- **id:** `tk-008` · **confidence:** 90/100 · **usage:** 44
- **source:** operator:quality_machinist
- **tags:** first-article, inspection, offset

For first article: machine the first part 0.05mm oversize on all critical dimensions. Measure, calculate offsets, then cut the final dimensions. One extra part saves you from scrapping $500+ worth of material and 2 hours of machine time.

### 2. Deburring sequence matters

- **id:** `tk-010` · **confidence:** 93/100 · **usage:** 26
- **source:** operator:inspection_lead
- **tags:** deburring, inspection, datum, operation:chamfering

Always deburr BEFORE final inspection, AFTER all machining. But critical: deburr the datum surfaces FIRST so your measurement references are clean. A burr on a datum face can shift your entire measurement by 0.02mm+.

### 3. JM Die offset cascade verification — H-values must strictly decrease per pass

- **id:** `jm-die-013` · **confidence:** 96/100 · **usage:** 0
- **source:** jm_die_production_analysis
- **tags:** wire-edm, jm-die, h-register, offset, cascade, quality-check

A critical quality check for any JM Die wire EDM program: H-register offset values must strictly decrease from rough to final skim. Typical cascade: H1=0.0085 > H2=0.0068 > H3=0.0059 > H4=0.0054 (inches). If any H-value equals or exceeds th…

### 4. Check autocorrelation BEFORE applying SPC charts

- **id:** `TK-DL-2830j-003` · **confidence:** 95/100 · **usage:** 0
- **source:** document:mit2830j@lecture9
- **tags:** spc, autocorrelation, independence, false-alarm, thermal-drift

Standard SPC charts (Shewhart, EWMA, CUSUM) assume observations are independent. If your process data is autocorrelated (common in CNC with thermal drift), these charts produce excessive false alarms. ALWAYS check lag-1 autocorrelation firs…

### 5. Cpk vs Cp: always use Cpk for real processes

- **id:** `TK-DL-2830j-009` · **confidence:** 95/100 · **usage:** 0
- **source:** document:mit2830j@lecture3
- **tags:** capability, cpk, cp, tolerance, centering, scrap-rate

Cp measures potential capability assuming process is centered. Cpk measures ACTUAL capability including mean offset. Cpk = min((USL-μ)/(3σ), (μ-LSL)/(3σ)). A process with Cp=2.0 but off-center can have Cpk=0.5 and produce 10% scrap. Always …

### 6. Check quality/healing for imported geometry

- **id:** `TK-DL-hm-075` · **confidence:** 95/100 · **usage:** 0
- **source:** document:hypercad-s-v33@p177
- **tags:** hypermill, hypercad-s, healing, import, geometry-repair

Use Analysis → Check quality / healing to diagnose imported CAD problems: vertex-edge gaps, face tolerance mismatches, incorrect edge sequences, non-manifold gaps, self-intersecting boundaries, entities smaller than tolerance, and irregular…

### 7. Align faces orientation for correct tool position

- **id:** `TK-DL-hm-077` · **confidence:** 94/100 · **usage:** 0
- **source:** document:hypercad-s-v33@p265
- **tags:** hypermill, hypercad-s, face-normals, import, toolpath

Use Modify → Align faces orientation to fix inconsistent face normals on imported data. 'Uniform orientation' → Align auto-orients the face nearest the user outward and propagates to connected faces topologically. This is critical for CAM: …

### 8. Probing result analysis and trend tracking

- **id:** `TK-DL-hm-089` · **confidence:** 94/100 · **usage:** 0
- **source:** document:hypercad-s-v33@p562
- **tags:** hypermill, hypercad-s, probing, quality, measurement

Enable 'Create logs for CAD import' in probing settings BEFORE running probing jobs. Import results via CAM → Import probing data (*.txt, *.log, *.ompr). Deviations are measured in face normal direction. The Trend tab tracks accuracy across…

### 9. Cycle-to-cycle (CtC) control: check stability with K < 1

- **id:** `TK-DL-2830j-004` · **confidence:** 93/100 · **usage:** 0
- **source:** document:mit2830j@lecture20
- **tags:** ctc-control, feedback, stability, process-gain, controller-tuning

In cycle-to-cycle manufacturing control, the loop gain K = Kc × Kp must satisfy |K| < 1 for stability. K_p is process gain (often ≈1), K_c is controller gain. Start with Kc = 0.3-0.5 and tune up. Going above K=1 causes oscillation that INCR…

### 10. Dimension once — never repeat across views

- **id:** `TK-DL-cad-drawing-03` · **confidence:** 93/100 · **usage:** 0
- **source:** document:cad_drawing_standards@section3
- **tags:** drawing, dimensioning, over-dimensioning, tolerance-stack

Every dimension should appear exactly once on the drawing. Repeating a dimension in multiple views creates conflicting tolerance interpretations and confuses the machinist. Place dimensions in the view that best shows the feature's true sha…

## Common Threads

Top tags across the cluster: `hypermill`, `hypercad-s`, `inspection`, `offset`, `import`, `first-article`, `deburring`, `datum`.

## Sources Cited

- operator:quality_machinist (1)
- operator:inspection_lead (1)
- jm_die_production_analysis (1)
- document:mit2830j@lecture9 (1)
- document:mit2830j@lecture3 (1)

## Citations

- [[tk-008]]
- [[tk-010]]
- [[jm-die-013]]
- [[TK-DL-2830j-003]]
- [[TK-DL-2830j-009]]
- [[TK-DL-hm-075]]
- [[TK-DL-hm-077]]
- [[TK-DL-hm-089]]
- [[TK-DL-2830j-004]]
- [[TK-DL-cad-drawing-03]]

