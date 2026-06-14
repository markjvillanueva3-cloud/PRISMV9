# Fleet-wide lathe task inventory — whiskey 2026-05-24

Operator question: *"extract all work from mike, pertaining to lathe. gather all other lathe related tasks across all rgs from all chat slots"*. Compiled by whiskey iter21.

## Shipped this session by SLOT

### whiskey (this chat) — 13 units, milestone `JM-DIE-LATHE-UPGRADE-MS0`
Upgrade + audit + safety pipeline. See `state/shared/dashboards/jm-die-lathe-audit-findings-2026-05-24.md` for full ledger.
- `U-V2-PHYSICS` — physics-driven S/F via UltimateSpeedFeedEngine
- `U-BATCH-V2-WIRE` — batch CLI version-switch
- `U-V2-CRITIQUE-CLOSEOUT` — V2 critique closure
- `U-OUTCOME-CAPTURE-DISABLE-KNOB` — 52× regen throughput
- `U-AUDIT-PIPELINE` — 3-stage audit engine + 31 tests + dispatcher
- `U-AUDIT-MACHINE-MAP-FIX` — full 7/7 machine envelope coverage
- `U-AUDIT-FINDINGS-BRIEF` — operator briefing
- `U-UPGRADE-BODY-RESCALE` — envelope-fit gate (primary safety)
- `U-GCANALYZER-MODAL-F-TRACK` — leading-dot decimal regex (-49% Stage-A criticals)
- `U-GCANALYZER-OKUMA-START-BLOCK` — okuma safe-start dialect (-5× HIGH-18)
- `U-OKUMA-LATHE-G50-CHECK` — HIGH-19 max-RPM-clamp safety
- `U-RECENT-SHIPMENTS-INBOX` — golf-drain inbox
- `U-AUDIT-FULL-CORPUS-DASHBOARD` — 114,646-variant audit
- `U-PROGRAM-LIBRARY` — frontend-facing aggregator (in-flight, this turn)

### mike — 7 units, milestones `MIKE-LATHE-CAPABILITY-MS0` + `LATHE-POST-AUDIT`
Capability inventory + ground-truth + OSP controller profile. Highly complementary to whiskey's work.
- `U-MIKE-LATHE-GROUND-TRUTH` × 2 commits (6ec0620381, 20c15a9065)
- `U-MIKE-LATHE-DEEP-CAPABILITY` × 2 commits (a7c85d1636, a225b0c1b2)
- `U-MIKE-LATHE-CAPABILITY-DOCS` (d1f7a8f208)
- `U-MIKE-LATHE-CAPABILITY-ENGINE` (b3a0d1ea76)
- `U-MIKE-LATHE-POST-AUDIT` (6a5bd90897)

**Engines mike built:**
- `JMDieLatheCapabilityEngine.ts` — per-machine capability data + PSN-synergy
- `JMDieLatheDeepCapabilityEngine.ts` — deep capability profiling
- `OkumaLatheOSPProfileEngine.ts` — OSP controller capability profile + parameter recommender

**Data mike produced:**
- `state/shared/JM-LATHE-PROGRAM-GROUND-TRUTH-2026-05-24.json` — ground-truth from real JM Die programs
- `mcp-server/src/data/jm-die-lathe-capabilities.ts` — capability registry

## Synergy: whiskey + mike → next-gen lathe upgrader

Mike's `OkumaLatheOSPProfileEngine` + `JMDieLatheCapabilityEngine` could feed whiskey's V2 upgrader:
- Per-machine capability constraints (max DOC, max chip load, etc.) → tighter envelope-fit gate
- OSP-aware S/F windows → smarter `optimize_for: 'productivity'` recommendations
- Ground-truth program extents → real-data-trained envelope tolerances

**Proposed follow-up:** `U-UPGRADE-CAPABILITY-AWARE` — wire mike's CapabilityEngine into whiskey's V2 upgradeOne.

## Fleet-wide lathe TASKS not yet claimed (from RGS indexes)

### From `data/roadmap-index.json` (36 lathe-related entries)

**Core Lathe track (10 milestones):**
- `LATHE-MS0` · `LATHE-MS0.5` · `LATHE-MS1` · `LATHE-MS2` · `LATHE-MS3` · `LATHE-MS4` · `LATHE-MS5` · `LATHE-MS6` · `LATHE-MS7` · `LATHE-MS8`

**Lathe-PRO program (13 milestones):**
- `LATHE-PRO-MS-1`, `LATHE-PRO-MS-2` (prerequisites)
- `LATHE-PRO-MS0` through `LATHE-PRO-MS12` (incl. Hard Turning + Grinding Replacement at MS5)

**Single-milestone tracks (mixed mill/lathe):**
- "Multi-Process Unified Pipeline (Turning+EDM+Grinding+Laser+Waterjet)"
- "Turning Profiles + 2D Nesting + DXF/SVG Import"
- "Minor Gap Engines — Diamond Turning, Laser Interferometer, STEP Parser"
- "Turning Pipeline Completion"
- "Full Machine Coverage (VMC/HMC/5-Axis/Lathe/Mill-Turn/EDM)"
- "Turning/Mill-Turn + Medical Domain"

### From `state/shared/specs/ROADMAP-CONSOLIDATED.json` (41 unique lathe units)

**AI training (5):**
- `U-AITRAIN-LATHE-LATHE-DEEP-LEARNING`
- `U-AITRAIN-LATHE-LATHE-DEEP-LEARNING-INTELLIGENCE`
- `U-AITRAIN-LATHE-LATHE-KINEMATICS-DEEP-LEARNING`
- `U-AITRAIN-LATHE-LATHE-META-LEARNING`
- `U-AITRAIN-LATHE-LATHE-SPEED-FEED-DEEP-LEARNING-ADVISOR`

**Print-to-program 13-stage pipeline (DPM0):**
- `U-DPM0-LATHE-PRINT_INTAKE` · `U-DPM0-LATHE-PRINT_OCR` · `U-DPM0-LATHE-MATERIAL_SELECT`
- `U-DPM0-LATHE-TOOLING_SELECT` · `U-DPM0-LATHE-FIXTURE_DESIGN` · `U-DPM0-LATHE-OPERATION_SEQUENCE`
- `U-DPM0-LATHE-TOOLPATH_GEN` · `U-DPM0-LATHE-POST_PROCESS` · `U-DPM0-LATHE-SIMULATE`
- `U-DPM0-LATHE-OPERATOR_GATE` · `U-DPM0-LATHE-MACHINE_RUN` · `U-DPM0-LATHE-QUALITY_VERIFY`
- `U-DPM0-LATHE-LEARNING_LOOP`

**Direct lathe surfaces:**
- `U-WIRE-BACKLOG-LATHE`
- `U-LATHE-MIN-DIALECT-POST` — Okuma .MIN-format post-processor
- `U-LATHE-DIRECT-SAFETY-GATE` — Omega S(x) clearance pre-write

**Revenue tracks:**
- `U-REV-MS0-HOIST-LATHE-01` · `U-REV-MS0-HOIST-LATHE-02`
- `U-REV-LATHE-01` · `U-REV-LATHE-02`

## Operator action items

1. **Wire mike's capability engines into whiskey's V2 upgrader** — `U-UPGRADE-CAPABILITY-AWARE` highest-leverage next-step.
2. **DPM0 13-stage print-to-program lathe pipeline** is a coherent revenue feature — assign to a slot.
3. **LATHE-PRO-MS5 Hard Turning + Grinding Replacement** is a high-margin sales angle — pair with revenue track.
4. **`U-LATHE-DIRECT-SAFETY-GATE` (Omega-pre-write)** complements whiskey's `U-UPGRADE-BODY-RESCALE` — same architectural layer, different threshold.
5. Active claims in `state/shared/slot-task-claims.json` show 0 lathe tasks claimed right now — every milestone above is **pickup-able**.

## Combined session stats

- **Total lathe units shipped today**: 20 (whiskey 13 + mike 7)
- **Total lathe milestones documented across fleet RGS**: ~24
- **Total lathe units across fleet RGS**: ~77 (36 roadmap-index + 41 ROADMAP-CONSOLIDATED, deduplicated estimate)
