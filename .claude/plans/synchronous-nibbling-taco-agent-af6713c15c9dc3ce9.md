# hyperMILL Training Manual Mining Gap Analysis
## Plan file: synchronous-nibbling-taco-agent-af6713c15c9dc3ce9.md
## Created: 2026-04-03

---

## FINDINGS SUMMARY

After deep inspection of all 8 source directories (4 full_text + 4 knowledge.json from manuals, plus
8 video result.json files in tutorials/_output), here is the authoritative gap analysis.

---

## SOURCE MATERIAL INVENTORY (actual)

### Manuals (hypermill-manual-en-1 through 4 — knowledge.json)
| Manual | Title | Pages | Items Extracted |
|--------|-------|-------|-----------------|
| Part 1 | CAM Basics & Workflow | 111 | 78 |
| Part 2 | Turning | 33 | 12 |
| Part 3 | 2D Machining | 31 | 35 |
| Part 4 | 3D Machining | 63 | 43 |
| **TOTAL** | | **238** | **168** |

### Videos (tutorials/_output — 8 videos processed, not 4)
| Video | Duration | Transcript | Items |
|-------|----------|------------|-------|
| DAY_1 Interface | 25.2 min | 17,072 chars | 33 |
| HyperMILL 5-axis Lesson 1 | 42.3 min | 2,309 chars | 30 |
| HyperMILL Webinar (MAXX+barrel) | ~60 min | full text | 0 (NOT processed into tribal knowledge!) |
| HyperMill Project Assistance | 26.3 min | 18,784 chars | 30 |
| AUTOMATION Center Basic | 18.7 min | 11,586 chars | 27 |
| MAXX Machining example | 4.3 min | 99 chars | 1 |
| Hypermill 3+2 machining | 16.5 min | 0 chars | 4 (keyframes only) |
| hypermill 3D ISO machining | 4.2 min | 0 | 0 |
| hypermill Arbitrary stock Roughing | 8.5 min | 0 | 2 (keyframes only) |
| IMTS 2022 Basic Setup | 3.6 min | 3,075 chars | 4 |

**Key finding:** The "4 training videos not yet processed" described in the prompt actually refers to
4 videos with 0 transcript chars that were keyframe-only analyzed. However the HyperMILL Webinar
has a 25,000+ word transcript that was transcribed but has 0 knowledge items — it was NOT run
through /video-learn forge-triple. This is the biggest video gap.

---

## SCORE CARD

### 1. TIP EXTRACTION COMPLETENESS — Score: 52/100

**What we have:** 200 total tribal tips (117 in TribalKnowledgeEngine.ts + 83 in
hypermill-cam-tips-ext.ts). The HYPERMILL_CAM_TIPS_EXT adds hm-118 to hm-160 (43 tips).
The TribalKnowledgeEngine has 117 hm-prefixed embedded tips.

**Critical gaps found by reading full_text:**
- Part 1 (111 pages, 78 items): The knowledge.json extraction pulled primarily safety warnings
  with truncated bodies ("be defined parallel to the z axis of the ncs"). The full_text contains
  rich content on: Project Assistant workflow (9-step sequence not captured as skills),
  frame setup procedures, nightSHIFT batch processing, stock model workflows, collision check
  configuration, tool linking/updating procedures, CPF (Customised Process Features), feature
  mapping, transformation jobs. NONE of these are in TribalKnowledgeEngine.
- Part 2 (33 pages, 12 items): Turning content is severely under-extracted. The full text has
  complete turning cycle documentation (16 cycle types), infeed mode diagrams (constant/
  ascending/descending/ramp), chipbreak-Z configuration, section-based machining, approach/
  retract macro logic. Only 12 items extracted — approximately 90% of turning knowledge is missing.
- Part 3 (31 pages, 35 items): 2D machining has reasonable coverage but missing: adaptive
  pocket parameters (full-cut behavior feedrate adjustment), NC parameters section (machining
  tolerance constraints), stock mode procedure, contour extraction from features workflow.
- Part 4 (63 pages, 43 items): 3D machining missing: scallop height formula relationship,
  negative allowance constraint formulas (complex: |allowance + XY allowance| < tool_radius -
  tolerance), clearance distance vs. clearance plane distinction and when to use each,
  retract mode taxonomy (4 modes), guide curve strategies for round parts, slope-dependent
  machining, 5-axis head collision monitoring rules.

**Under-represented categories:**
- Turning workflows (almost zero)
- Batch/automation (nightSHIFT not documented)
- Feature mapping (CPF files, feature-to-job wiring)
- Transformation jobs (mirroring, rotation, offset patterns)
- Simulation/verification workflow steps
- Tool linking and update management

---

### 2. PARAMETER TABLE EXTRACTION — Score: 38/100

**What we have:**
- hypermill-speed-feed-catalog.ts: 18 material/tool combinations, 14 HYPERMILL_FORMULAS
  (extracted from IM_Tool_DB_V2023.1.db). Only 3 materials: 16MnCr5, AlZnMg, VA.
- hypermill-cutting-tech.json: ~57,000 lines of cutting technology data
- HyperMillCycleDefaultsEngine.ts: 138 cycle parameter defaults from Metric.cfg

**Gaps:**
- Scallop height formula: h = R - sqrt(R² - (ae/2)²) where h=scallop height, R=tool radius,
  ae=stepover. Manual defines it clearly but it's NOT in FormulaRegistry (only F-SURFACE-001
  which is a different surface finish formula).
- Negative allowance constraint formula: |allowance_z + allowance_xy| < tool_radius -
  machining_tolerance. This exists in HyperMillSafetyHooks.ts but not in FormulaRegistry.
- Stepdown from scallop formula: ae = 2*sqrt(R*h - h²) — inverse of above. Not extracted.
- Infeed limit formula (1.1*tool_diameter + 4*stock_tolerance) for stock model bounding — present
  in full_text but not extracted.
- Collision check tolerance derivation: automatically derived from stock tolerance — not captured.
- 5-axis head clearance/security plane formula — not extracted.
- Tool life split formula: the tolerance factor system (tool_life ± tolerance_factor*tool_life).
  Present in part 1 full_text but not extracted.
- Chip load per tooth tables for stainless, titanium, inconel — only 3 material groups in
  speed-feed catalog. Missing: Cast iron (K), High temp alloys (S), Hardened steel (H).
- The 14 HYPERMILL_FORMULAS in speed-feed-catalog.ts are from Automation Center DB but
  NOT registered in FormulaRegistry — they're stranded in the catalog file.
- Ramp angle calculation: ramp_angle = arctan(vertical_stepdown / horizontal_arc_radius)
  mentioned in cycle defaults but not as a standalone formula.

---

### 3. SAFETY RULE EXTRACTION — Score: 41/100

**What we have:** HyperMillSafetyHooks.ts has 6 real, substantive validation functions:
1. validateClearancePlane — clearance above workpiece
2. validateNegativeAllowance — nose-dive prevention
3. validateGeometryCheckEnabled — auto geometry check warning
4. validateMeasurementSystem — metric/inch mismatch detection
5. validateTurningHPM — round inserts only in High Performance Mode
6. validateRestMaterialToolChange — rest material cycle tool diameter sync

**Gaps identified from full_text (not in hooks):**
- NCS/Frame axis must be parallel to Z axis of machine coordinate system — currently just a
  truncated safety-001 fragment, not a callable validation function
- Clearance plane is NOT collision-checked rule (rapid moves across clearance plane are
  unverified — critical omission, only partially mentioned in existing hook)
- Global clearance plane lock/unlink warning: if "Use global clearance plane" is ON, the
  per-job clearance plane is greyed out and locked — need a hook to warn when user tries
  to override this
- Stock resolution accuracy warning: 0.005mm/0.0002in limit for turning area calculation
- Feature mapping frame assignment rule: if "Prefer featurelist frame" is OFF and NCS
  orientation differs from feature frame, jobs get the NCS, not the feature frame
- Tool free tip geometry restriction: only available for specific cycles (Profile Finishing,
  Z-Level Shape Finishing, Optimised Roughing, 5X Rework, 5X Swarf, 5X Tangent Machining).
  Currently exists as comment in TribalKnowledgeEngine but not as validation hook.
- Transformation toolpath safety: collision check uses 0.05mm tolerance for transformed jobs,
  not the tighter stock tolerance — not currently a hook
- Adaptive pocket + ball mill restriction: adaptive pocket option not available for ball mills —
  this is a knowledge.json decision rule but not a hook
- 5-axis head/spindle collision zones: head clearance during orientation change — not extracted
- Turning chipbreak-Z must be > 0 when "Use sections" is enabled — not validated
- nightSHIFT queue safety: jobs must be calculated successfully before batch submission — not extracted

---

### 4. WORKFLOW EXTRACTION — Score: 35/100

**What we have:**
- HyperMillStrategyEngine.ts: strategy selector (geometry type → cycle recommendation)
- HyperMillCycleCatalogEngine.ts: 120+ cycle catalog with codes
- TribalKnowledgeEngine embedded tips: hm-116 through hm-120 (AC basic workflow, NCS,
  stock definition, clearance plane, second setup from AC tutorial)
- knowledge.json procedures: 4 partial workflow descriptions (truncated)

**Gaps — workflows that should be skills:**
- The 9-step "From Model to NC Program" workflow in Manual Part 1 page 1 is the core hyperMILL
  workflow — it covers: CAD/CAM setup → basic settings → define origin/frame → define tool →
  prepare geometry → structure project → collision check prep → calculate/analyze → simulate/NC.
  This is explicitly documented as a numbered sequence but NOT captured as a skill.
- Project Assistant step-by-step workflow (5 steps: model+technology, NCS orientation, stock
  size, NCS position, frames+names) — not a skill, only partially in tribal tips
- NC Generation workflow: calculate → simulate → verify → generate NC file. Not a skill.
- Feature mapping workflow for hole features → job assignment. Not extracted.
- Stock model creation workflow (4 modes: bounding box, profile+rotation, profile+translation,
  edit/split). Barely touched.
- Collision check setup workflow: define milling area → define clamping area → set tolerances.
  Not a skill.
- Turning cycle setup procedure (14 steps in part 2 knowledge.json but truncated/degenerate).
- Multi-setup transformation workflow (mirror/rotate job lists). Not extracted.
- Tool database link/update workflow. Not extracted.

---

### 5. FORMULA EXTRACTION — Score: 44/100

**What we have:** FormulaRegistry has 17 hardcoded formulas (F-KIENZLE-001 through F-RPCA-001).
The hypermill-speed-feed-catalog.ts has 14 HYPERMILL_FORMULAS but they are NOT registered
in FormulaRegistry — they are stranded in a data file.

**Gaps — formulas in manuals NOT in FormulaRegistry:**
- Scallop height from ball mill: h = R - sqrt(R² - (ae/2)²)
- Stepover from scallop: ae = 2 * sqrt(2*R*h - h²) (ball mill)
- Stepover for barrel cutter: ae = 2 * sqrt(2*Rb*h - h²) where Rb is barrel radius (much larger)
- Negative allowance max gap: gap_max = 2 * (tool_radius + allowance) for nose-dive check
- Additional allowance XY limit: |allowance + allowance_xy| < tool_radius - tolerance
- Tool life split tolerance bounds: min = tool_life * (1 - factor), max = tool_life * (1 + factor)
- HDC (High Dynamic Cutting) speed adjustment: Vc_HDC = 3.020905 * Vc_ref * (ae/d * 100)^(-0.304)
  — this IS in HYPERMILL_FORMULAS but NOT in FormulaRegistry
- HDC feed adjustment: fz_HDC = 2.348095 * fz_ref * sqrt(ae_ref/d) * (ae/d*100)^(-0.193) / sqrt(ae/d)
  — same, stranded in catalog
- MAXX feedrate: f_MAXX = fz * z * n * 2.5 (MAXX multiplier formula)
  — in HYPERMILL_FORMULAS[9] but not FormulaRegistry
- apMAXX: ap_MAXX = cutting_length * 0.85
- aeMAXX: ae_MAXX = d * 0.15 (radial depth for MAXX roughing)
- Finishing spindle speed boost: n_finishing = (Vc * 1000) / (d * pi) * 1.12
- Reduced feedrate: f_reduced = fz * z * n * 0.7

**Bottom line:** 14 hyperMILL formulas are in the speed-feed catalog but not in FormulaRegistry.
Plus at least 5 purely manual-derived formulas that haven't been extracted at all.

---

### 6. VIDEO LEARNING GAP — Score: 28/100

**What we have:** 8 videos were run through the pipeline (not 4 as stated). They produced 98 total
knowledge items which were saved to tutorials/_output/pipeline-results.json. The extracted items
are vision-based descriptions and transcript snippets.

**Critical gap:** NONE of these 98 items appear to have been ingested into TribalKnowledgeEngine
or any registry. The pipeline-results.json exists but there's no evidence the items were
forge-triple processed (no hm- prefixed entries in TribalKnowledgeEngine matching these videos).

The hm-116 through hm-120 entries (AC Basic Tutorial) and hm-113 through hm-117 (webinar) WERE
processed but appear to have come from a separate earlier pass, not the pipeline-results.json run.

**Specific video gaps:**
- HyperMILL Webinar (longest video, ~60 min): Full transcript exists with rich barrel cutter,
  MAXX machining, surface extension, tangent machining content. 0 knowledge items extracted.
  Should yield 40-60 tips.
- DAY_1 Interface (33 items extracted but not ingested into any registry/skill)
- 5-axis Lesson 1 (30 items extracted but not ingested)
- 3+2 machining (keyframe only, 4 items — transcript was not extracted)
- hypermill Arbitrary stock Roughing (keyframe only, 2 items — no transcript)
- 3D ISO machining (4.2 min, 0 items — completely unprocessed)
- MAXX Machining example (1 item from 4.3 min video with 99 chars transcript — undertranscribed)

---

## DELIVERABLES: WHAT SHOULD BE CREATED

### A. Skills to Generate (from unextracted manual content)

1. `hypermill-project-setup` skill (already exists as a skill in skills list — but needs
   enhancement to match the full 9-step workflow from Manual Part 1, especially:
   nightSHIFT batch mode, collision check prep, stock model modes)

2. `hypermill-turning-setup` skill (NEW) — complete turning job creation workflow from
   Manual Part 2: contour selection, feature auto-creation, infeed modes (constant/ascending/
   descending/ramp), chipbreak-Z, sections, clearance radius vs. clearance plane for turning

3. `hypermill-2d-workflow` skill (NEW or enhance existing) — full 2D pocket/contour/face
   workflow from Manual Part 3: adaptive pocket full-cut behavior, NC parameters page,
   stock mode for pocket milling, plunge point strategies

4. `hypermill-3d-strategy-guide` skill (already exists — enhance with): scallop height
   calculation, negative allowance constraint workflow, retract mode selection guide,
   guide curve strategies for round parts

5. `hypermill-stock-model` skill (NEW) — 4 stock model creation modes (bounding box,
   profile rotation, profile translation, edit/split), VIS vs. STL format selection,
   resolution setting guidance

6. `hypermill-collision-check-prep` skill (NEW) — milling area definition, clamping area
   setup, tolerance settings, 5-axis head clearance configuration

7. `hypermill-nc-generation` skill (NEW) — calculate → simulate → hyperVIEW verify →
   generate NC file workflow, hyperVIEW machine definition, nightSHIFT batch queue

8. `hypermill-feature-mapping` skill (NEW) — CPF (Customised Process Feature) workflow,
   feature recognition to job assignment, hole feature → frame creation modes

9. `hypermill-transformation-jobs` skill (NEW) — mirror/rotate/translate job list patterns,
   multi-setup offset workflows

10. `hypermill-maxx-barrel` skill (NEW, from Webinar video) — barrel cutter geometry setup,
    bounding toolpath for corner cleanup, tangent machining for ruled surfaces, global fitting
    for multi-surface barrel operations

### B. Hooks to Create (from safety/best-practice content)

1. `validateClearancePlaneRapidRisk` — Warn that the clearance plane is NOT collision-checked.
   Source: Manual 1. The existing clearancePlane hook validates position but doesn't explicitly
   warn about the unverified-rapid-move risk.

2. `validateGlobalClearancePlaneLock` — Warn when per-job clearance plane conflicts with global
   clearance plane setting. Source: Manual 1, p.36.

3. `validateToolFreeTipCycleCompatibility` — Block "use free tip geometry for calculation" when
   cycle is not in the supported list. Source: Manual 1 + 4.

4. `validateTransformationCollisionTolerance` — Warn that transformed toolpaths use 0.05mm
   collision tolerance regardless of job tolerance setting. Source: Manual 1.

5. `validateAdaptivePocketBallMill` — Reject adaptive pocket option when tool is a ball mill.
   Source: Manual 3 knowledge item.

6. `validateChipbreakZWithSections` — If chipbreak-Z > 0 and Use sections enabled, validate
   that the infeed Z = chipbreak_Z * sections doesn't exceed material depth. Source: Manual 2.

7. `validateTurningClearanceRadius` — Validate that clearance radius (X) for turning is
   sufficient for the part OD plus tool holder width. Source: Manual 2.

8. `validateNightShiftJobState` — Ensure all jobs in a nightSHIFT queue are in "calculated"
   state before submitting batch. Source: Manual 1.

9. `validateFeatureFramePreference` — Warn when "Prefer featurelist frame" is off and NCS
   orientation differs from feature frame (jobs will silently use wrong frame). Source: Manual 1.

10. `validateStockResolutionForTurning` — Warn when turning area calculation tolerance is
    above 0.005mm (0.0002in). Source: Manual 1, turning area specification.

### C. Scripts to Automate Common Workflows

1. `hypermill-batch-job-calculator.ts` — Script to iterate all uncalculated jobs in a job list
   and calculate them, then collect warnings. Automates the Calculate step in nightSHIFT prep.

2. `hypermill-stock-model-generator.ts` — Script that takes model bounds and generates
   appropriate stock model (bounding box mode) with user-defined offsets per axis.

3. `hypermill-frame-setup-validator.ts` — Script to validate all frames in a job list have
   correct NCS alignment, clearance plane above stock top, and orthogonal frame orientations.

4. `hypermill-turning-contour-extractor.ts` — Script to auto-extract 2D contours from turning
   model for roughing, grooving, parting operations (the "Feature → 2D Contour" workflow
   documented in Manual 2).

5. `hypermill-nc-output-report.ts` — Script to verify NC file generation: list all jobs,
   check post-processor assignment, validate output directory exists.

6. `hypermill-tool-database-sync.ts` — Script to check all document tools for broken external
   database links and batch-update linked tools with stale data.

7. `hypermill-scallop-to-stepover.ts` — Calculator script: given tool radius/barrel radius and
   target scallop height, output optimal stepover. Uses missing scallop formulas.

8. `hypermill-negative-allowance-checker.ts` — Given allowance, XY allowance, tool radius,
   corner radius: validate the full constraint chain from Manual 4.

### D. Data Tables Not Yet Extracted

1. **Speed/feed tables for missing material groups** — Only 3 materials in hypermill-speed-feed-catalog.ts:
   16MnCr5 (P steel), AlZnMg (N aluminum), VA (M stainless). Missing: Cast iron K-group,
   titanium/Inconel S-group, hardened steel H-group.

2. **14 HYPERMILL_FORMULAS registration** — Formulas exist in hypermill-speed-feed-catalog.ts
   but are NOT registered in FormulaRegistry. These should be registered as:
   F-HM-SPINDLE-001 (fS), F-HM-FEED-001 (fF), F-HM-HDC-VC-001 (VcHDC),
   F-HM-HDC-FZ-001 (fzHDC), F-HM-MAXX-FEED-001 (MAXX), etc.

3. **Scallop height formulas** — h = R - sqrt(R² - (ae/2)²) and ae = 2*sqrt(2Rh - h²)
   Not in FormulaRegistry at all.

4. **NC Generator post config table** — 17 NcGenerator configs captured in
   hypermill-post-configs.json (79 lines). This is thin. The actual NcGenerator directory
   at H:/prism/HYPERMILL/NcGenerator/31.0/ likely has the full set.

5. **Cycle parameter defaults extended table** — HyperMillCycleDefaultsEngine.ts has 138
   entries from Metric.cfg. The 33.0 version may have updated defaults worth extracting for
   newer cycle variants.

6. **Turning tool insert geometry table** — Manual Part 2 defines insert types, approach
   angles, free angles for each turning cycle. Not captured as a structured table.

7. **5-axis head clearance table** — The security plane calculation rules for different
   kinematics (BC table-head, AC spindle-tilt, etc.) from Manual 1. Currently only partially
   referenced in safety hooks without a full table.

8. **hypermill-cam-tips-ext.ts pipeline items** — The 98 video knowledge items in
   pipeline-results.json should be ingested into the tribal knowledge system. Currently
   stranded in the output JSON.

---

## PRIORITY EXECUTION ORDER

**Highest ROI (do first):**
1. Register 14 HYPERMILL_FORMULAS into FormulaRegistry — pure data migration, no new content
2. Add scallop height formulas to FormulaRegistry (h and ae)
3. Create `validateAdaptivePocketBallMill` and `validateToolFreeTipCycleCompatibility` hooks
   (simple guard conditions already described in manuals)
4. Run /video-learn on HyperMILL Webinar transcript (60-min barrel/MAXX content — highest
   density video not yet processed)
5. Create `hypermill-turning-setup` skill from Manual Part 2 full content

**Medium ROI:**
6. Create `hypermill-stock-model` and `hypermill-collision-check-prep` skills
7. Ingest pipeline-results.json 98 items into TribalKnowledgeEngine
8. Create `hypermill-nc-generation` skill
9. Add 5 turning-specific safety hooks

**Lower ROI:**
10. Extract speed/feed tables for K/S/H material groups
11. Verify NcGenerator 33.0 has updated post configs
12. Create transformation jobs and feature mapping skills
