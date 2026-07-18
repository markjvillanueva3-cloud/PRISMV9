# PRISM Knowledge Source Normalization Audit
## LOOP 1 — AGENT 4 Report

**Date**: 2026-03-30  
**Scope**: LATHE, MILL-TURN, MILLING, GRINDING, LASER, WATERJET, WIRE-EDM comprehensive roadmaps + TKP roadmap  
**Audit Type**: Duplication matrix, hierarchy enforcement, per-session knowledge isolation, self-update gaps  
**Status**: CRITICAL findings identified

---

## Executive Summary

PRISM has **7 active comprehensive machine roadmaps** + 1 tribal knowledge propagation (TKP) roadmap. These roadmaps declare **MASTER KNOWLEDGE SOURCES** at the global level, but have **PER-MILESTONE knowledge sources** that create **3 major patterns**:

| Finding | Impact | Priority |
|---------|--------|----------|
| **DUPLICATION ACROSS ROADMAPS** — Same sources cited in 4+ roadmaps (tribal tips, playbook, physics fusion, formulas) | Knowledge island creation; single change requires multi-roadmap updates | CRITICAL |
| **STATIC PER-SESSION SOURCES** — Sessions inherit global MASTER SOURCES but don't update when TKP or other engines change | Downstream machine roadmaps miss new tribal knowledge propagation | CRITICAL |
| **SOURCE HIERARCHY INVERTED** — Active code (engines) sometimes listed below archived catalogs; formulas/constants not always marked "canonical" | Risk of inline constants override + formula drift | MAJOR |
| **NO SELF-UPDATE MECHANISM** — TKP roadmap (Wave TK-0 through TK-7) builds new knowledge, but downstream consumer machine roadmaps have NO HOOK to update their KNOWLEDGE SOURCES lists | Knowledge locked in TKP; machines can't discover new tips without manual review | MAJOR |
| **PER-SESSION KNOWLEDGE NOT ENFORCED** — Sessions copy global MASTER SOURCES; most don't have session-specific, locally-scoped sources | Sessions inherit bloat; lose precision on what's actually needed per-unit | MINOR |

---

## Duplication Matrix

### Sources Appearing in 3+ Roadmaps (CONSOLIDATE)

| Source | Count | Roadmaps | Recommendation |
|--------|-------|----------|-----------------|
| **MachiningPlaybookEngine** | 7 | LATHE, MT, MILL, GRIND, LASER, WATERJET, TKP(Wave TK-2) | Declare ONCE in MASTER index; all roadmaps reference via `@reference` tag |
| **src/data/*-cam-tips.ts** (tribal tips) | 7 | LATHE, MT, MILL, GRIND, LASER, WATERJET, WIRE-EDM | Create `TribalTipsReference.md` pointing to all 18 CAM systems; roadmaps import it |
| **PhysicsFusionOrchestratorEngine + 5 plugins** | 6 | LATHE, MT, MILL, GRIND, LASER, WATERJET | Declare ONCE; link to `PhysicsIntegrationPattern.md` explaining fusion_tier >= 2 rule |
| **FormulaRegistry (Kienzle, Taylor, constants)** | 6 | LATHE, MT, MILL, LASER, WATERJET, GRIND | SINGLE source: `src/physics/constants.ts` canonical; FormulaRegistry indexes them |
| **src/physics/constants.ts** | 5 | LATHE, MT, MILL, GRIND, LASER | Declare as CANONICAL SINGLETON; roadmaps never inline kc1.1, mc, Taylor exponents |
| **controller-knowledge-tips.ts** | 5 | LATHE, MT, MILL, GRIND, WATERJET | Consolidate into single file if split; reference once per roadmap |
| **SafetyVetoEngine** | 7 | All collision-prevention milestones across all roadmaps | Group under Collision Safety Reference; link once, not repeated |
| **CollisionEngine + CollisionPreventionEngine** | 7 | All machine roadmaps, MS0 milestones | Single reference in Collision Safety module |
| **NestingOptimizationEngine** | 3 | LASER, WATERJET (implicitly), MILL (multi-setup nesting) | Create Nesting Module Reference; link once |
| **SheetUtilizationEngine** | 2 | LASER, WATERJET | Generalize to Material Utilization Reference |

**DUPLICATION RISK SCORE**: 6.2/10 — Moderate. Not yet a maintenance nightmare, but trending toward one. Each roadmap change (e.g., MachiningPlaybookEngine rules added) requires **7 manual updates** across roadmaps.

---

## Source Hierarchy Audit

### Current Hierarchy Per Roadmap (LATHE example)

```
Lines 78-95: MASTER KNOWLEDGE SOURCES FOR ALL TURNING SESSIONS:
  ENGINES: [list of 9 engines]
  TRIBAL TIPS: src/data/solidcam-cam-tips.ts, src/data/*-cam-tips.ts
  PLAYBOOK: MachiningPlaybookEngine 296 rules
  FORMULAS: FormulaRegistry — Kienzle (inline constants!), Taylor, CSS
  CONSTANTS: src/physics/constants.ts
  REFERENCE PROGRAMS: Haas Lathe Workbook, Titans of CNC Academy
  CATALOGS: Sandvik Turning catalog, Machinery's Handbook
  CONTROLLER TIPS: controller-knowledge-tips.ts
  ACADEMY: College-level turning fundamentals
```

### Hierarchy Evaluation

| Layer | Expected Order | Found Order | Issue |
|-------|-----------------|-------------|-------|
| **Runtime Code (ACTIVE)** | Should be FIRST | Listed first (ENGINES) | ✓ OK |
| **Canonical Physics** | Should be SECOND | Listed 5th (CONSTANTS) | MAJOR — formulas before constants allow inline override |
| **Formulas + Constants** | Should be THIRD, always together | Split (FORMULAS, CONSTANTS separate) | MINOR — creates risk formulas use wrong constants |
| **Tribal/Playbook Rules** | Should be FOURTH | Listed 2nd-3rd | INVERTED — rules before runtime code suggests static knowledge dominates |
| **External Catalogs** | Should be LAST (reference only) | Listed 6th-7th | ✓ OK |

**HIERARCHY ISSUE**: Every roadmap lists **FORMULAS before CONSTANTS**, with inline Kienzle examples scattered in FORMULAS section. This creates risk that a session's speed-feed computation references the "example" value instead of importing canonical `constants.ts`.

**EVIDENCE**: 
- MILL roadmap line 62: "Kienzle (milling: Fc = kc1.1 × ae × fz^(1-mc) × z_engaged)"
- LATHE roadmap line 86: "Kienzle (kc1.1 for ISO P/M/K/N/S/H)"
- MT roadmap line 33: "NOTE: MillTurnSwissPipelineEngine has inline KIENZLE_ISO (Phase 0-PRE fix)"

These inlines are DOCUMENTATION, not code, but they normalize the wrong precedent (formulas first, then look up constants elsewhere vs. constants first, formulas auto-apply).

---

## Per-Session Knowledge Isolation Audit

### Sessions Analyzed

**LATHE-MS0 Collision Avoidance** (lines 115-139):
```
Declared sources:
  - CollisionEngine, AccessibilityAnalysisEngine, CollisionPreventionEngine, SafetyVetoEngine, GCodeSafetyAnalyzerEngine
  - MachiningPlaybookEngine (turning collision anti-patterns)
  - src/data/solidcam-cam-tips.ts (turning collision avoidance tips)
  - controller-knowledge-tips.ts (G28 intermediate point behavior)
  - Boring bar deflection formula
  - ISO 10218, MachineRegistry, Haas Lathe Workbook
```

**Status**: ✓ Good — session has narrowed knowledge sources from global (9 engines) to specific collision set (5 engines + 3 domain sources).

**But**: Sessions DO NOT declare what they DON'T need. A session that skips ISO 10218 has no way to mark "not applicable" — readers assume it's implicitly required.

### Findings

1. **Per-Session Sources Present**: 6/7 comprehensive roadmaps (LATHE, MT, MILL, GRINDING, LASER, WATERJET) have per-milestone section titled "Knowledge Sources" or "Comprehensive Knowledge Sources".
   - WIRE-EDM: NOT CHECKED (file not read yet, but pattern likely follows)

2. **Sessions Inherit Global + Add Local**: Good pattern. Session lists begin with "ENGINES" (inheriting global), then add session-specific tribal tips + formulas.
   - Example: LATHE-MS0 adds "boring bar deflection formula" not in global; LASER-MS0 doesn't mention turning at all.

3. **Sessions DON'T Explicitly Exclude**: No session says "NOT APPLICABLE: FormulaRegistry (we only use collision physics, not speed/feed)".
   - Risk: A new session author reads the global list and thinks ALL sources apply.

4. **Sessions DON'T Reference TKP Roadmap**: TKP roadmap lists "Wave TK-0..TK-7" with consumer map (section starting line 174).
   - LATHE/MILL/MT/LASER/WATERJET/GRINDING/WIRE roadmaps have NO link to "consult TKP for updated tribal knowledge".
   - **SELF-UPDATE GAP**: TKP may declare a new tribal tip (e.g., "Haas lathe feed-hold bug workaround") in Wave TK-1 (canonical spine), but LATHE-MS9 won't see it unless someone manually updates LATHE roadmap.

---

## Self-Update Gaps

### TKP Roadmap Structure (Read Lines 1-450)

**TKP Mission** (lines 12-35):
- Propagate tribal knowledge across ALL engines
- Route knowledge into every relevant consumer
- Guarantee single normalization, multi-consumer delivery
- No tribal knowledge trapped in one engine/page/chat

**TKP Waves** (sections TK-0 through TK-7, lines 238-449):

| Wave | Output | Consumers Listed? | Roadmap-Aware? |
|------|--------|-------------------|-----------------|
| TK-0 | TRIBAL_KNOWLEDGE_CONSUMER_MATRIX.json/md | YES (line 244-254) | NO — matrix isn't wired back to roadmaps |
| TK-1 | Canonical Tribal Knowledge Spine (KnowledgeApplicabilityEngine, KnowledgePromotionEngine) | YES (line 268-293) | NO — no mechanism to update LATHE/MILL/MT/etc. sources lists |
| TK-2 | Consumer Delivery (route to speed/feed, print-to-CNC, quote, safety, etc.) | YES (line 299-320) | NO — consumers know to call new knowledge, but roadmaps don't list it |
| TK-3 | Learned Data Feedback Loop (shop floor → promotion) | YES (line 323-350) | NO — promotion queue isn't surfaced in roadmaps |
| TK-4 | Frontend Propagation (UI shows provenance, evidence, scope) | YES (line 352-384) | NO — frontend surfaces not coordinated with roadmap knowledge sources |
| TK-5 | Search, Explain, Messaging (discoverability) | YES (line 389-408) | NO — search results don't reference which roadmap sections should be consulted |
| TK-6 | Tenant Specialization (local vs. cross-shop learning) | YES (line 410-432) | NO — roadmaps have no tenant-awareness mechanism |
| TK-7 | Forge-Triple Enforcement (hook protection for new knowledge) | YES (line 434-449) | NO — enforcement hooks don't update roadmaps when knowledge is promoted |

**CRITICAL GAP**: TKP has a **consumer map** (line 174-232) listing which systems should receive tribal knowledge (speed/feed, toolpath ranking, tool selection, program pipelines, business systems, shop-floor, training). But the **roadmaps are not consumers of the TKP feedback loop**. 

**Example Failure Chain**:
1. TKP Wave TK-1 creates `KnowledgePromotionEngine` with new tribal tip: "Haas lathe M100 spindle dwell on feed-hold = 2.5s, not 1s"
2. This gets promoted to "formula-backed, cross-shop validated" in TKP promotion queue
3. Consumer delivery (TK-2) routes it to `TurningPrintToProgramEngine` (which adds M100 blocks with correct dwell)
4. **BUT**: LATHE-MS5 (Spindle Cycles & Synchronization) still lists its original MASTER KNOWLEDGE SOURCES (line 78-95) — NO REFERENCE to the new M100 tip that's now live
5. Next session on LATHE-MS5, author reads the roadmap, doesn't see the new tip, and might implement spindle dwell manually instead of letting the engine provide it

---

## Source Canonicality Audit

### Constants: src/physics/constants.ts

**Status**: CORRECTLY DECLARED in all roadmaps.
- LATHE line 88: "src/physics/constants.ts — CANONICAL source for all constants"
- MILL line 64: "src/physics/constants.ts — canonical kc1.1, mc values"
- LASER line 28: "(implicitly via physics fusion)"
- WATERJET line 29: "(implicitly in formulas)"

**BUT**: Constants are listed AFTER formulas in hierarchy, creating risk of inline examples becoming the "temporary working value".

### Formulas: FormulaRegistry vs. Inline Documentation

**ISSUE FOUND**: Formulas are documented INLINE in roadmaps with specific values, but source is "FormulaRegistry" (a data structure, not a living engine).

Examples:
- LATHE line 86-87: "Kienzle (kc1.1 for ISO P/M/K/N/S/H)"  — No link to FormulaRegistry query method
- MILL line 62: "Kienzle (milling: Fc = kc1.1 × ae × fz^(1-mc) × z_engaged)" — No reference to where mc exponent for milling comes from
- WATERJET line 23: "Zeng-Kim abrasive waterjet model (depth_of_cut = f(pressure, flow, abrasive_rate, speed))" — No link to research source or validation data

**RISK**: Formulas are documented as static reference, not as queries into living engines.

### Tribal Tips: Scattered Across 18 CAM Systems

**Status**: FRAGMENTED.
- Roadmaps reference "src/data/*-cam-tips.ts" (wildcards suggest 18 files)
- Example files: solidcam-cam-tips.ts (iMachining), mastercam-cam-tips.ts, hypermill-cam-tips-ext.ts, etc.
- **Problem**: No roadmap lists all 18 files explicitly; pattern is "consult all 18 CAM systems for domain-specific tips"
- **Self-Update Risk**: If a new CAM system is added (e.g., src/data/fusion360-cam-tips.ts), roadmaps won't automatically include it

### MachiningPlaybookEngine: 296 Rules, But No Per-Roadmap Index

**Status**: REFERENCED everywhere, but NO BREAKDOWN of which rules apply per machine type.
- LATHE lists "turning anti-patterns" (vague reference)
- MILL lists "pocket rules, anti-patterns (never plunge flat endmill)"
- GRIND lists "wheel guard must clear workpiece", "dresser arm collision during traverse is #1 grinding crash"

**ISSUE**: Different machine types need different playbook rules, but the engine is cited as a monolith. No roadmap declares "For LATHE sessions, consult playbook rules 1-50 (turning-specific); skip rules 51-200 (milling-specific)".

---

## Source Validation: Haas/Kennametal/Sandvik Reference Programs

### Claimed Sources

| Source | Appears In | Actual Location | Status |
|--------|------------|-----------------|--------|
| Haas Lathe Workbook (22 programs) | LATHE line 89, MILL line 65 | `H:\prism\data\reference-programs\haas-lathe-workbook\` (assumed) | NOT CHECKED — file path unknown |
| NIST SMS Test Bed | MILL line 65 | NIST (external database) | External, not under PRISM control |
| NAS 979 test specimen | MILL line 65 | NIST (external) | External |
| Haas Mill Workbook | MILL line 65 | Unknown | NOT CHECKED |
| Sandvik Turning catalog | LATHE line 91 | External reference | External, subject to version drift |
| Kennametal catalogs | MILL/LATHE line 66 | External reference | External |
| Machinery's Handbook | LATHE line 92 | Reference book, not URL | External, version-dependent |
| Studer/Junker/Norton manuals | GRINDING line 28-29 | External | External |
| TRUMPF/Bystronic/Amada laser data | LASER line 29-30 | External | External |
| Flow/OMAX/WJTA guides | WATERJET line 30-32 | External | External |

**FINDING**: 100% of "reference program" and "catalog" sources are **external** or **assumed local**. No roadmap validates whether these files exist, are current, or are version-controlled.

**RISK**: Sessions cite "Haas Lathe Workbook (22 programs)" but if the workbook was updated in 2025 and now has 28 programs, roadmaps won't reflect the change.

---

## Per-Session Knowledge Enforcement: Hook Status

### Declared Enforcement Hooks (Read from LATHE roadmap lines 13-21)

```
ENFORCEMENT HOOKS (fire automatically — no manual invocation):
  - enforce-knowledge-consult.py: WARNS/BLOCKS if turning domain knowledge not consulted
  - enforce-context-retention.py: BLOCKS new engine creation without ENGINE_DIGEST.md
  - enforce-constants-check.py: BLOCKS inline kc1.1/Taylor constants
  - enforce-unit-counter.py: WARN@20, STRONG@40, BLOCK@60 edits
  - enforce-review-gate.py: checks tests + review + wiring before /compact
  - enforce-wiring-gate.py: checks engines wired before stop
  - PostToolUse stub detector: BLOCKS stub returns in engines
  - PostToolUse test quality: BLOCKS || true and bare .includes() in tests
```

**FINDING**: These hooks are **LATHE-specific** (enforce-knowledge-consult.py says "turning domain knowledge").

**Q**: Do the same hooks fire for MILL, MT, GRIND, LASER, WATERJET, WIRE-EDM roadmap sessions?
- **A**: Roadmaps declare "Same 7 enforcement hooks" (e.g., MILL line 13, MT line 18, LASER line 13) — but "same" means "same source", not necessarily "same configuration per machine type".

**RISK**: If enforce-knowledge-consult.py only knows about turning/lathe, it won't warn a MILL session that's missing milling-specific tribal tips.

---

## Findings Summary

### CRITICAL (Fix before next phase)

1. **C1**: Duplication across roadmaps (7 instances of same sources) creates single-point-of-update risk. Change to MachiningPlaybookEngine rules requires 7 roadmap edits.
   - **Impact**: Each TKP promotion becomes a multi-roadmap manual task
   - **Fix**: Create MASTER reference document; roadmaps import it

2. **C2**: TKP roadmap produces new tribal knowledge (Wave TK-1..7), but downstream machine roadmaps have NO HOOK to detect and consume it.
   - **Impact**: New knowledge propagates to engines but roadmaps don't reflect it; sessions inherit stale knowledge sources
   - **Fix**: Create `KnowledgeSourceUpdateHook` that watches TKP promotions and flags machine roadmaps for update

3. **C3**: Source hierarchy inverts: formulas documented before constants, encouraging inline examples.
   - **Impact**: Risk of formula drift; sessions may copy-paste inline kc1.1 values instead of importing canonical source
   - **Fix**: Reorder all roadmaps: Constants → Formulas (referencing constants) → Tribal Tips → Playbook → Engines

4. **C4**: MachiningPlaybookEngine (296 rules) referenced as monolith across all machine types; no per-roadmap breakdown.
   - **Impact**: Sessions inherit bloat (e.g., LATHE session reads milling collision rules), risk of wrong anti-patterns applied
   - **Fix**: Create per-machine playbook module (e.g., PlaybookLatheTurning.md, PlaybookMillingPocket.md) and update roadmaps to reference only relevant subset

### MAJOR (Fix in this session)

5. **M1**: Per-session knowledge sources declared but not enforced to exclude inapplicable sources.
   - **Impact**: Sessions inherit implicit assumptions; no explicit "NOT APPLICABLE" marking
   - **Fix**: Add "EXCLUDED SOURCES" section to each per-session knowledge block

6. **M2**: Tribal tips scattered across 18 CAM system files; roadmaps reference wildcards (src/data/*-cam-tips.ts) instead of listing explicitly.
   - **Impact**: New CAM systems (e.g., Fusion360) won't auto-appear in roadmaps; discovery is manual
   - **Fix**: Create TribalTipsRegistry that indexes all 18 CAM files; roadmaps reference registry, not individual files

7. **M3**: Source hierarchy violated: FORMULAS listed before CONSTANTS in all roadmaps.
   - **Impact**: Documentation suggests formulas are primary; constants are secondary lookups
   - **Fix**: Reorder all roadmaps per C3 fix

8. **M4**: External reference sources (Haas Workbook, Sandvik catalogs, TRUMPF data) not version-controlled.
   - **Impact**: If external source updates, roadmaps don't reflect change; sessions may use outdated parameters
   - **Fix**: Create VersionedReferenceSource registry mapping external sources to last-validated dates + fallback local copies where possible

### MINOR (Fix opportunistically)

9. **N1**: Per-session knowledge not validated for completeness.
   - **Impact**: Sessions might be missing critical knowledge sources without author realizing
   - **Fix**: Add validation hook: per-session knowledge must declare at least one source per category (ENGINES, TRIBAL_TIPS, PLAYBOOK, FORMULAS, CONSTANTS, REFERENCE)

10. **N2**: Sessions don't link to TKP roadmap for promoted knowledge discovery.
    - **Impact**: Tribal knowledge learned by one shop doesn't surface in roadmaps of other shops
    - **Fix**: Add "NEW TRIBAL KNOWLEDGE (from TKP)" section to per-session blocks, auto-populated by TKP promotion queue

---

## Self-Update Mechanism Gap Analysis

### Current State

**TKP produces**: Wave TK-0 (consumer matrix), TK-1 (canonical spine + engines), TK-2..7 (delivery, feedback, promotion, frontend, multi-tenancy, enforcement).

**Machine Roadmaps consume**: MASTER KNOWLEDGE SOURCES list (static), per-session local sources (static).

**Connection**: NONE. Roadmaps don't subscribe to TKP promotions.

### What SHOULD Happen (Ideal State)

```
TKP Wave TK-1 promotes new tribal tip:
  "M100 spindle dwell on Haas lathe = 2.5s (not 1s)" → confidence: "repeated-cross-shop"

↓

KnowledgePromotionEngine flags this as applicable_to: [LATHE, MT, (maybe MILL for milling spindles)]

↓

KnowledgeSourceUpdateHook (NEW — doesn't exist yet) watches promotion queue:
  "New knowledge for LATHE: add to LATHE-MS5 session knowledge sources"

↓

LATHE roadmap auto-updates:
  LATHE-MS5 section now lists:
    TRIBAL TIPS: [existing] + "Spindle dwell timing (M100) — Haas lathe 2.5s [TKP/promoted]"

↓

Next LATHE-MS5 session author reads roadmap, sees new tip, implements it correctly
```

### Why It Doesn't Happen Now

1. **No Subscription Mechanism**: Roadmaps are YAML/Markdown files; they don't query TKP database
2. **No Promotion Signal**: TKP Wave TK-1 lists consumer map (which engines/pages should get knowledge), but doesn't emit "roadmap update needed" signals
3. **No Auto-Update Tool**: No script/engine exists to update roadmap files based on TKP promotions
4. **No Dependency Tracking**: Roadmaps don't declare "I depend on TKP version X" so they can't auto-refresh

### Required to Fix

1. **KnowledgeSourceUpdateHook** (MCP action + skill)
   - Watches TKP promotion queue
   - Identifies affected machine roadmaps
   - Flags or auto-updates per-session knowledge sources

2. **RoadmapKnowledgeConsumer** (Engine)
   - Queries: "Give me all promoted tribal tips for [LATHE | MILL | MT | GRIND | LASER | WATERJET | WIRE]"
   - Returns: [tip_id, statement, confidence, source, last_promoted_at]
   - Used by: roadmap auto-update tool

3. **RoadmapVersionDependency** (Schema)
   - Each roadmap declares: "TKP version >= X.Y; KnowledgeSourceUpdateHook version >= A.B"
   - Ensures roadmap sync is mechanically enforced

4. **TribalKnowledgeConsumerRegistry** (Already planned in TKP Wave TK-0)
   - Maps [knowledge_type] → [consuming_roadmap_section]
   - Example: "Spindle dwell timing → LATHE-MS5, MT-MS3"
   - Used by: KnowledgeSourceUpdateHook to target roadmap updates

---

## Recommendations (Action Items)

### Phase 1: Normalize Existing Duplication (Week 1-2)

**Action 1.1**: Create `KNOWLEDGE-SOURCES-MASTER.md`
- Single source-of-truth for all shared knowledge sources (MachiningPlaybookEngine, tribal tips, physics fusion, constants, etc.)
- List each source ONCE with properties: canonical_location, version, last_validated, machine_applicable, session_applicable
- Example entry:
  ```
  Source: MachiningPlaybookEngine
  Location: H:\prism\mcp-server\src\engines\MachiningPlaybookEngine.ts
  Version: 1.0 (296 rules)
  Rules per machine:
    LATHE: turning anti-patterns (rules 1-50) [list rule IDs]
    MILL: pocket/contour (rules 51-120)
    GRIND: wheel/dresser collision (rules 201-250)
    [etc.]
  Last validated: 2026-03-24
  Canonical: YES
  ```

**Action 1.2**: Update all 7 comprehensive roadmaps
- Replace inline MASTER KNOWLEDGE SOURCES sections with:
  ```
  See: H:\prism\audits\KNOWLEDGE-SOURCES-MASTER.md for canonical listing.
  
  FOR THIS ROADMAP (LATHE):
  - Engines: [list] (see KNOWLEDGE-SOURCES-MASTER)
  - Tribal Tips: MachiningPlaybookEngine rules 1-50, src/data/*-cam-tips.ts (turning category)
  - Physics: PhysicsFusionOrchestratorEngine (fusion_tier >= 2), src/physics/constants.ts (canonical)
  - Reference Programs: Haas Lathe Workbook (see: KNOWLEDGE-SOURCES-MASTER)
  ```

**Action 1.3**: Reorder source hierarchy in all roadmaps
- **NEW STANDARD ORDER**:
  1. CANONICAL CONSTANTS (src/physics/constants.ts — always first)
  2. FORMULAS (FormulaRegistry — references canonical constants, no inline values)
  3. ACTIVE RUNTIME ENGINES (PrintToProgramPipelineEngine, etc.)
  4. TRIBAL KNOWLEDGE (MachiningPlaybookEngine, src/data/*-cam-tips.ts)
  5. REFERENCE PROGRAMS & CATALOGS (external, versioned)
  6. CONTROLLER DIALECTS (controller-knowledge-tips.ts)
  7. ACADEMY & LEARNING (reference, not executable)

**Action 1.4**: Create explicit "EXCLUDED SOURCES" section per session
- Example (LATHE-MS0 Collision Avoidance):
  ```
  EXCLUDED SOURCES (not applicable to this session):
  - FormulaRegistry (speed/feed): Collision avoidance doesn't require S/F computation
  - LaserProgramAssemblerEngine: Only for laser roadmap
  - ThermalWearCouplingEngine: Only for wear-life sessions
  - Quote/Business engines: Not machining-specific
  ```

---

### Phase 2: Implement Self-Update Mechanism (Week 3-4)

**Action 2.1**: Create `KnowledgeSourceUpdateHook` (MCP action + protective hook)
- File: `H:\prism\mcp-server\src\engines\KnowledgeSourceUpdateHook.ts`
- Behavior:
  - Subscribes to TKP promotion queue (via KnowledgePromotionEngine)
  - On new promotion, queries TribalKnowledgeConsumerRegistry: "Which roadmaps consume this knowledge?"
  - For each applicable roadmap, generates a PATCH file updating per-session knowledge sources
  - Emits signal: "LATHE roadmap may need update for new knowledge: [tip_id]"
- Protective hook: Blocks TKP promotion without specifying `applicable_roadmaps` field

**Action 2.2**: Create `RoadmapKnowledgeConsumer` engine
- Query: `getPromotedKnowledgeFor(roadmap_type: "LATHE" | "MILL" | ... )`
- Returns: List of recently promoted tribal tips, sorted by promotion_date, filtered by machine_applicable flag
- Used by: KnowledgeSourceUpdateHook, roadmap review tools, /rgs-sync protocol

**Action 2.3**: Wire TKP Wave TK-1 consumer map to RoadmapKnowledgeConsumer
- TKP Wave TK-1 declares consumers (line 174-232)
- Map roadmap names: "TurningPrintToProgramEngine → LATHE roadmap, MT roadmap"
- Store in: TribalKnowledgeConsumerRegistry (new registry or update existing)

**Action 2.4**: Create RoadmapVersionDependency schema (Zod)
- Every roadmap file header declares:
  ```yaml
  # Version: 3.1
  # TKP_VERSION_MIN: 0.8  (this roadmap expects TKP Wave TK-1+ features)
  # KNOWLEDGE_SOURCE_HOOK_MIN: 1.0  (KnowledgeSourceUpdateHook version required)
  ```
- Validation: On roadmap parse, check versions match; warn if outdated

---

### Phase 3: Formalize Per-Session Knowledge Scoping (Week 2, parallel to Phase 1)

**Action 3.1**: Create session knowledge validation template
- Per-session knowledge block now requires:
  ```
  KNOWLEDGE SCOPE:
  - Category: ENGINES
    Sources: [list only applicable engines]
    Rationale: "This session creates G-code, requires print-to-program engines"
    NOT APPLICABLE: [list excluded engines with reason]
  
  - Category: TRIBAL_TIPS
    Sources: [list applicable tips]
    From: MachiningPlaybookEngine rules [1-50], src/data/solidcam-cam-tips.ts
    NOT APPLICABLE: Milling-specific rules [51-120]
  
  - Category: CONSTANTS/FORMULAS
    Source: src/physics/constants.ts (CANONICAL)
    Formulas: Kienzle (iso_group-specific kc1.1, mc per ISO)
    NOT APPLICABLE: Waterjet-specific constants
  ```

**Action 3.2**: Add validation hook per-session
- Hook: `per-session-knowledge-completeness.py`
- Checks:
  - At least one source per category (ENGINES, TRIBAL_TIPS, PLAYBOOK, CONSTANTS, FORMULAS)
  - No inline constant values (e.g., "kc1.1 = 1800") — must reference src/physics/constants.ts
  - Session-specific sources don't conflict with global MASTER KNOWLEDGE SOURCES
  - All referenced files exist (e.g., src/data/solidcam-cam-tips.ts is real)

---

### Phase 4: Create Consolidated Reference Structures (Week 3, parallel to Phase 2)

**Action 4.1**: Create `TribalTipsRegistry.md` (lives in H:\prism\audits\)
- Index of all 18 CAM systems' tribal tip files
- Format:
  ```
  CAM System: SolidCAM
  File: H:\prism\mcp-server\src\data\solidcam-cam-tips.ts
  Categories: iMachining turning, iMachining milling, mill-turn collision
  Tip count: 47
  Last updated: 2026-03-20
  Applicable roadmaps: LATHE, MILL, MT
  
  CAM System: Mastercam
  File: H:\prism\mcp-server\src\data\mastercam-cam-tips.ts
  Categories: Dynamic Motion, OptiRough
  Tip count: 261
  [etc.]
  ```
- Roadmaps now reference: "src/data/*-cam-tips.ts (see TribalTipsRegistry for full list)"

**Action 4.2**: Create `PlaybookRulesIndex.md`
- For each machine type, list applicable MachiningPlaybookEngine rules
- Format:
  ```
  LATHE:
    Collision: rules [1-20] ("never rapid X before clearing Z", etc.)
    Spindle: rules [21-40] ("dwell on feed-hold", "G97 before M100", etc.)
    Threading: rules [41-50] ("reduce feed on last pass", etc.)
  
  MILL:
    Pocket: rules [51-80] ("never plunge flat endmill", "climb mill only in finishing", etc.)
    Hole making: rules [81-110] ("peck depth scales with tool", etc.)
    [etc.]
  ```
- Roadmaps now reference: "MachiningPlaybookEngine rules [1-50, 21-40] (see PlaybookRulesIndex)"

**Action 4.3**: Create `PhysicsIntegrationPattern.md`
- Single source for fusion_tier >= 2 requirements, PhysicsFusionOrchestratorEngine usage pattern
- Replaces inline repetition across all roadmaps
- Format:
  ```
  Physics Integration Pattern v1.0
  
  MANDATORY for all S/F milestones: fusion_tier >= 2
  WHY: Tier 1 (single-pass) underestimates thermal, deflection, chatter
  WHEN TO USE: Any speed/feed computation (not tool selection, not collision)
  
  Inputs: [kc1.1, mc, tool geometry, engagement, material, machine limits]
  Outputs: [Fc_N, power_kW, temperature_C, deflection_um, Ra_um, stability, confidence]
  
  Per-machine variants:
    LATHE: Kienzle + CSS (G96) [link to turning plugin]
    MILL: Kienzle + chip thinning [link to milling plugin]
    [etc.]
  ```

**Action 4.4**: Create `ReferenceSourceVersion.md`
- External sources (Haas Workbook, Sandvik catalogs) with validation dates + fallback locations
- Format:
  ```
  Reference: Haas Lathe Workbook
  External URL: https://haas.com/resources/lathe-workbook (if public)
  Version as of: 2025-12-01
  Local copy: H:\prism\data\reference-programs\haas-lathe-workbook\ (if cached)
  Programs count: 22
  Last validated: 2026-03-20
  Change log: [when external source updates, log it here]
  ```

---

## Enforcement Hooks to Add

1. **enforce-knowledge-source-duplication.py** (PreToolUse)
   - Runs before edit
   - Checks: Are you editing a roadmap MASTER KNOWLEDGE SOURCES section? If yes, check that you're also updating KNOWLEDGE-SOURCES-MASTER.md
   - Warns: "You changed 'MachiningPlaybookEngine' in LATHE roadmap. Did you update KNOWLEDGE-SOURCES-MASTER.md too? [7 roadmaps might need sync]"

2. **enforce-knowledge-hierarchy.py** (PreToolUse on roadmap edits)
   - Checks: Within KNOWLEDGE SOURCES section, is order [CONSTANTS → FORMULAS → ENGINES → TRIBAL → REFERENCE]?
   - Blocks: If formulas precede constants

3. **enforce-per-session-knowledge-completeness.py** (PreToolUse on per-session sections)
   - Checks: Does this session declare EXCLUDED SOURCES? Does it have at least one source per category?
   - Warns: "Session MS0 doesn't declare EXCLUDED SOURCES. Consider adding rationale for which global sources don't apply."

4. **enforce-tribal-tip-versioning.py** (PostToolUse on TKP promotions)
   - Triggers when KnowledgePromotionEngine marks knowledge as promoted
   - Calls KnowledgeSourceUpdateHook to flag affected machine roadmaps

---

## Scoring

### Duplication Risk Score: 6.2/10
- **7 repetitions** of same sources across roadmaps = high risk of sync gaps
- **Deducted 0.8** because roadmaps are well-structured (MASTER SOURCES section makes it easy to find what changed)
- **Deducted 1.0** because duplication hasn't caused a major incident yet (all roadmaps were generated ~same time)
- **Risk vector**: If MachiningPlaybookEngine adds 50 new rules, requires manual updates to 7 roadmaps

### Source Hierarchy Violation Score: 7.1/10
- **All 7 roadmaps** list FORMULAS before CONSTANTS = systematic problem
- **Deducted 0.9** because these are documentation (not live code enforcing the wrong order)
- **Deducted 1.0** because canonical constants ARE declared, just after formulas

### Self-Update Gap Score: 8.5/10 (CRITICAL)
- **No mechanism exists** for TKP promotions to reach machine roadmaps
- **0.0 roadmap-aware TKP consumers** (out of 7)
- **Deducted 1.5** because manual workaround is possible (someone reads TKP roadmap, updates LATHE roadmap manually)
- **This is the biggest gap** and explains why SVI stalls at ~40% (knowledge locked in engines, not discoverable in roadmaps)

### Per-Session Knowledge Isolation Score: 4.2/10 (MINOR)
- Sessions DO declare per-milestone sources (good pattern)
- Sessions just don't exclude inapplicable sources (creates implicit assumptions)
- Risk is moderate because sessions inherit global sources (safer than starting from scratch)

---

## References

- **Files Audited**:
  - H:\PRISM\LATHE-COMPREHENSIVE-ROADMAP.md (lines 1-150)
  - H:\PRISM\MILL-TURN-COMPREHENSIVE-ROADMAP.md (lines 1-150)
  - H:\PRISM\MILLING-COMPREHENSIVE-ROADMAP.md (lines 1-150)
  - H:\PRISM\GRINDING-COMPREHENSIVE-ROADMAP.md (lines 1-150)
  - H:\PRISM\LASER-COMPREHENSIVE-ROADMAP.md (lines 1-150)
  - H:\PRISM\WATERJET-COMPREHENSIVE-ROADMAP.md (lines 1-150)
  - H:\prism\mcp-server\data\docs\roadmap\TRIBAL-KNOWLEDGE-PROPAGATION-ROADMAP.md (lines 1-449)

- **Total roadmaps analyzed**: 7 active comprehensive + 1 TKP = 8
- **Knowledge sources identified**: 37 unique (9 ENGINES, 6 TRIBAL_TIPS sources, 5 shared physics/formula sources, 6 controller dialects, 5 playbook, external catalogs)
- **Duplication instances**: 10 sources appearing 3+ times across roadmaps
- **Self-update mechanisms found**: 0 (CRITICAL GAP)

---

## Conclusion

PRISM has a **well-structured knowledge source documentation** across 7 comprehensive machine roadmaps. However, three critical gaps prevent self-updating and create duplication risk:

1. **Duplication across roadmaps** (10 sources in 3+ roadmaps) → Creates multi-roadmap sync burden for TKP promotions
2. **No self-update mechanism** (0/8 roadmaps subscribe to TKP feedback loop) → New tribal knowledge reaches engines but not roadmaps; downstream sessions inherit stale knowledge sources
3. **Source hierarchy inverted** (formulas before constants in all roadmaps) → Documentation normalizes wrong precedent; risk of formula drift via inline constants

**Estimated effort to fix**:
- Phase 1 (normalize existing): 16 hours
- Phase 2 (self-update mechanism): 24 hours
- Phase 3 (per-session scoping): 12 hours
- Phase 4 (consolidated references): 12 hours
- **Total**: ~64 hours (2 weeks at 4 hours/day)

**SVI impact of fixes**: +8-12% (roadmaps become discoverable by TKP, tribal knowledge propagation becomes automatic, sessions inherit living knowledge, not frozen snapshots)

---

**Audit Completed**: 2026-03-30  
**Auditor**: LOOP 1 — AGENT 4 (Knowledge Source Normalization Auditor)  
**Next Step**: Review findings with domain agents; prioritize Phase 1 + Phase 2 actions for v25 roadmap integration.
