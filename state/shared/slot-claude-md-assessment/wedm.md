# wedm — slot:mike

## Current state

**File:** `H:/prism/mcp-server/src/engines/wedm/CLAUDE.md`
**Size:** 16,459 bytes / 193 lines
**Quality grade:** PARTIAL

### What's accurate and working
- Domain scope definition (§1) is correct: wire-EDM only; excludes sinker/fast-hole/micro-hole EDM and all chip-formation domains.
- Kienzle/Taylor exclusion rule (§2 + SOUL.md refuses) is accurate and critical — EDM is electrical, not mechanical chip removal.
- Engine-name inventory (§3) is largely accurate: verified EDMPostProcessGCodeEngine, EDMQualityOrchestratorEngine, EDMCuttingParamFlushEngine, EDMMaterialMachineWireEngine, EDMStartHoleSetupEngine, EDMMonitorSurfaceIntegrityEngine, EDMBiMaterialCompensationEngine, EDMDrawingInterpretationEngine all exist on disk (19 EDM*.ts + 145 WEDM*.ts = 164 total engine files).
- Test commands (§4) are syntactically correct.
- Tribal pointers (§6 — 4 JMD files) verified: `knowledge/wiki/code-tribal/tribal-wedm-jmd-001..004.md` all exist; 89 tip files total at `knowledge/tribal/wedm-knowledge-tips-*.md`.
- Cross-galaxy edges (§7) are accurate and symmetric.
- Closed-loop india integration stanza is accurate.
- SOUL.md refuses list is excellent and domain-specific (verified on disk, generated 2026-06-11).

### Stale / inaccurate / fabricated content found
1. **§2 constant table rows marked "(verify)"** — `mcp-server/src/registries/edm-wires.ts` and `mcp-server/src/registries/edm-dielectrics.ts` are NOT verified to exist (not in the check above). The PATHS.md uses `mcp-server/src/data/edm-material-db.ts` (verified) and `mcp-server/src/data/wire-spec-sheets.ts` (verified) instead. The registry paths in CLAUDE.md §2 are unverified — mark `// UNVERIFIED` or replace with verified paths.
2. **§5 gotchas is explicitly EMPTY** — admitted honest stub but still a gap. SOUL.md `refuses` list covers domain-specific safety, but the physics gotchas section itself contributes nothing to an active wedm chat.
3. **TOOLBELT.md states `case 'wedm_`** but grep returns 280 cases with double-quotes (`case "wedm_"`). Minor but a toolbelt grep pattern that fails is a waste.
4. **`prism_edm:wedm_feasibility` in TOOLBELT.md** — the actual dispatcher action is `wedm_assess_feasibility` (verified: `grep -c` returns 280 cases; first hit `case "wedm_assess_feasibility"`). The alias `wedm_feasibility` is unverified.
5. **CLAUDE.md §6 tribal pointer for `knowledge/tribal/wedm/*.md`** — actual tribal files are at `knowledge/tribal/wedm-knowledge-tips-*.md` (flat, 89 files), NOT in a `knowledge/tribal/wedm/` subdirectory. The subdirectory does not exist.
6. **`GALAXY-CLAUDEMD-FILL` auto-block (lines 96–137)** — Ollama-distilled summary uses vague language ("advanced neural orchestration", "CAM knowledge synthesis") with unverifiable `reference/node_formula_*` node IDs. These are auto-generated graph-node IDs from system-viz — useful pointers but misleading as plain facts. The block is advisory (clearly marked), but the node IDs cannot be cited in code or commits without verification.
7. **AI-SYSTEMS-STATE and CRITIC-KEEPWORKING stanzas** are boilerplate cloned fleet-wide and add ~30 lines of noise that is already in the universal root CLAUDE.md.

---

## KEEP

The following sections are accurate and load-bearing for a wedm chat:

- **§1 Domain scope** — essential disambiguation; wire-EDM vs sinker vs chip-formation.
- **§2 Canonical constants reference** — the "Kienzle/Taylor DO NOT APPLY" rule is the single most important safety rail for this domain. Keep the hard rule; replace the unverified registry paths with verified ones (`edm-material-db.ts`, `wire-spec-sheets.ts`).
- **§3 Engine clusters** — the by-category breakdown (Physics / Wire mechanics / Surface integrity / P2P pipeline / LoRA / ML / Post router / Quality) is accurate per PATHS.md and highly useful. Cite PATHS.md as authoritative for full cluster map to avoid drift.
- **§4 Test commands** — correct; keep as-is.
- **Cross-galaxy edges §7 and Related galaxies** — accurate, symmetric, load-bearing.
- **Closed-loop india integration stanza** — the `xproc_outcome_publish`, `xproc_kg_project_features`, `prism_knowledge:tribal_capture` contract is the correct wire-in for this domain.
- **Algorithm primitives block (MEMORY.md)** — the 5 signal-processing algorithms (`signal_savgol`, `ml_dtw`, `ml_viterbi`, `ml_gmm`, `spatial_ransac_fit`) are genuinely wedm-specific (discharge-signal telemetry) and not covered by the root CLAUDE.md. Port this into CLAUDE.md from MEMORY.md.
- **SOUL.md refuses list** — domain-correct, auto-generated from verified sources. Embed the 8 refuses into CLAUDE.md §safety or a dedicated §refuses section so they appear without requiring SOUL.md load.

---

## DROP

The following sections waste tokens and are generic or redundant:

1. **AI-SYSTEMS-STATE stanza (lines 180–187 in CLAUDE.md)** — pure boilerplate injected fleet-wide; already covered by root CLAUDE.md and auto-memory feeds. Drop from galaxy file; pointer to `knowledge/memories/patterns/ai-systems-fleet-state.md` is enough.
2. **CRITIC-KEEPWORKING stanza (lines 189–193)** — R12 + R6 doctrine; exact duplicates of root CLAUDE.md rules. Drop entirely; the universal-core pointer handles it.
3. **`GALAXY-CLAUDEMD-FILL` auto-block** — Ollama summary in vague terms + unverifiable graph-node IDs. Replace with the 5 concrete bullet facts in MEMORY.md High-ROI section, keeping the `⚠ advisory` label and removing the node-ID strings which are graph internals not human-readable doctrine.
4. **Cross-refs footer (lines 139–146)** — `state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md` is not wedm-specific doctrine; the `feedback_engine_tests_in_tests_dir` and `feedback_always_build` pointers are universal. Drop; they belong in root or the universal-core pointer only.
5. **Header disclaimer "alpha (mill specialist) is NOT the wedm specialist"** — historically useful but now outdated (SOUL.md is wedm-specialist, slot mike formally assigned per SOUL.md `generated_at: 2026-06-11`). Replace with a one-line "Owner: slot:mike (wedm-specialist)" header.
6. **Operational context blocks in TOOLBELT.md** — `OPERATIONAL-CONTEXT` auto-wired block is fleet-generic (Ollama tiers, hardware, loop design). Already in root CLAUDE.md. The TOOLBELT.md correctly serves wedm-specific grep/glob/bash patterns; strip the generic ops block from TOOLBELT, not from CLAUDE.md.

---

## ADD (domain-specific — the heart of this assessment)

### A. Verified dispatcher surface (currently missing from CLAUDE.md)
The PATHS.md lists the dispatcher but CLAUDE.md never names the critical actions. Add a concise action table:

| Action | Purpose |
|--------|---------|
| `prism_edm:wedm_assess_feasibility` | pre-flight gate (verified: `case "wedm_assess_feasibility"` in edmDispatcher.ts) |
| `prism_edm:wedm_check_conductivity` | material conductivity validation before cut (verified) |
| `prism_edm:wedm_estimate_time` | cut-time estimate before NC emit (verified) |
| `prism_edm:wedm_multipass` | rough+skim pass schedule (TOOLBELT.md alias; verify against `case "wedm_multipass"` before use) |
| `prism_edm:wedm_post_mitsubishi_generate` | FA-10S G-code emit (TOOLBELT.md; verify) |
| `prism_edm:wedm_knowledge_index_query` | unified tribal+wiki query (PATHS.md, WEDM_WIKI_KNOWLEDGE.json) |
| `prism_knowledge:tribal_capture slot=mike` | write tribal (NOT direct markdown writes to `knowledge/tribal/wedm-*.md`) |
| `prism_memory:semantic_search query="wedm"` | master-brain pull |

Dispatcher file: `mcp-server/src/tools/dispatchers/edmDispatcher.ts` (3,262 lines, 280 `wedm_` occurrences, confirmed double-quote case syntax).

### B. Verified data / constants surface (currently scattered across §2 and §3)
Consolidate into a single "canonical data paths" table. All paths below verified to exist:

| Need | Verified path |
|------|--------------|
| Tribal tips source-of-truth (122 entries) | `mcp-server/src/data/wedm-knowledge-tips.ts` |
| JM Die FA-10S tech tables (E12xx / E28xx per-pass) | `mcp-server/src/data/jm-die-wedm-tech-tables.ts` |
| JM Die ground-truth program patterns (4 analyses) | `mcp-server/src/data/jm-die-wedm-program-patterns.ts` |
| EDM material DB + wire spec sheets | `mcp-server/src/data/edm-material-db.ts` · `mcp-server/src/data/wire-spec-sheets.ts` |
| Action schemas (1,124 lines) | `mcp-server/src/schemas/edmActionSchemas.ts` |
| Live digest (read, never hardcode counts) | `mcp-server/data/state/WEDM_DIGEST.json` |
| Knowledge index (unified query surface) | `mcp-server/data/state/WEDM_WIKI_KNOWLEDGE.json` |
| Runtime state files (48, including lattice/GNN/LoRA) | `mcp-server/data/state/WEDM_*.{json,jsonl}` |

**HARD RULE (wedm-specific):** Never inline E-code discharge constants, MRR values, spark-gap offsets, or recast-depth values. Source from `mcp-server/src/physics/constants.ts` (fleet-wide) AND from `jm-die-wedm-tech-tables.ts` (JM Die shop-specific). Physics constants from web sources stay in `knowledge/wiki/wedm/_staging/` (UNVERIFIED) until mike validates against actual FA-10S tables.

### C. JM Die machine + post fact (missing from CLAUDE.md)
The shop's machine is a **Mitsubishi FA-10S** (wire-EDM, deionized water dielectric). This is the primary test target for every NC emit. Key paths:
- Post processor (JM Die primary): `JM DIE/POST PROCESSORS/2. PRISM ENHANCED/wire-edm/PRISM-Master-Mitsubishi-FA10S-WEDM.cps`
- 5 vendor post dialects: Agie/Fanuc-ROBOCUT/Makino-U/Mitsubishi-FA10S/Sodick-AQ (all at `JM DIE/POST PROCESSORS/2. PRISM ENHANCED/wire-edm/`)
- Engine: `WEDMPostDialectRouterEngine` routes to per-vendor engines `WEDMPostMitsubishi`, `WEDMPostSodick`, `WEDMPostMakino`, `WEDMPostAgie`, `WEDMPostFanuc`
- JM Die archive: `JM DIE/WIRE EDM/` (4,058 files, 99 customers); access via `prismSelfAwarenessEngine.getJMDieCustomerPath()` ONLY — never Glob the tree.
- E-code families: `E12XX_STANDARD_4PASS` (straight D2 steel), `E12XX_HEAVY_5PASS`, `E28XX_TAPER_5PASS` (SS with UV taper guide) — canonical in `jm-die-wedm-tech-tables.ts`.

### D. Discharge-physics gotchas (§5 was explicitly empty — this fills it)
These are from SOUL.md refuses + MEMORY.md hint topics + `reference_mike_wedm_discharge_gotchas_2026_05_29` (15 issues; content not read this session — **owner mike must validate before marking as verified doctrine**):

**Candidate gotchas for mike to verify and promote:**
1. **Pulse-on/off ratio governs surface finish vs MRR tradeoff** — longer pulse-on = higher MRR but thicker recast layer; skim cuts require short pulse-on + high frequency.
2. **Wire tension vs. straightness vs. break risk** — higher tension = straighter cut; excessive tension on thin/worn wire = break; titanium and carbide are high-break-risk materials.
3. **Flushing pressure adequacy** — insufficient dielectric flow = chip buildup = arc damage = wire break. High-pressure flushing for deep cuts, low-pressure for thin/delicate features. `wedm_flush_adequacy_evaluate` dispatcher action gates this.
4. **Recast layer depth is application-specific** — aerospace/medical tooling often requires post-EDM recast removal (acid etch or grinding); PRISM must surface this when Ra < 0.4 µm or HAZ > spec.
5. **Taper cut wire-deflection compensation** — at taper angles the wire bows; `WEDMTaperErrorBudget` and `WEDMWireDeflectionEngine` compute the offset correction; do NOT use the nominal taper angle as the programmed angle.
6. **No-core cut sequencing** — skim cuts must return to rough-cut entry/exit paths; out-of-sequence skims leave micro-tabs and damage wire by hitting unsupported slug.
7. **Kienzle/Taylor do NOT apply** — cutting force, specific cutting energy, tool-life Taylor equation are all chip-formation concepts. EDM material removal is thermal-electric, not mechanical. Never map `kc1.1`, `C`, `n` constants to EDM engines.
8. **Gap voltage ≠ open-circuit voltage** — the working gap voltage is lower than the OC voltage by an amount dependent on dielectric condition and wire speed. `WEDMGapVoltageControlEngine` models the correction.

**Mark all above as `// OWNER-GATE: mike validates vs JM Die FA-10S observed data`** — they are literature-consistent but not yet empirically verified against PRISM's actual JM Die programs.

### E. Domain-specific "what NOT to do" list (currently absent)
```
NEVER in wedm galaxy:
- Apply Kienzle, Taylor, or specific-cutting-energy (kc1.1) to any EDM engine
- Inline discharge-energy constants, E-code pass parameters, or MRR values — import from constants.ts + jm-die-wedm-tech-tables.ts
- Use `getJMDieCustomerPath()` result directly in Glob — it returns a base path; build the full subpath and pass to Read
- Write directly to `knowledge/tribal/wedm-*.md` — they are auto-generated from wedm-knowledge-tips.ts; use `prism_knowledge:tribal_capture slot=mike`
- Glob the JM DIE/WIRE EDM/ tree (4,058 files) — use the dispatcher + prismSelfAwarenessEngine.getJMDieCustomerPath()
- Confuse `JM DIE/CNC LATHE/NORTHERN WIRE/` with wire-EDM programs — it is a lathe customer named "Northern Wire"
- Read edmDispatcher.ts in full (3,262 lines) — Grep `case "wedm_xxx"` then Read offset+limit
- Read wedm-knowledge-tips.ts in full (105K) — Grep the tip id then Read offset limit:30
- Emit G-code without running wedm_assess_feasibility first
- Create new EDM/WEDM engines without checking ENGINE_DIGEST.md + duplicationGuardEngine — 164 engines already exist
```

### F. Algorithm primitives for discharge-signal telemetry (currently only in MEMORY.md)
Port these into CLAUDE.md so a wedm chat sees them without loading MEMORY.md:
- `signal_savgol` (SavitzkyGolayFilter via `prism_algorithm`) — smooth gap-voltage / spark-frequency traces without smearing discharge peaks
- `ml_dtw` (DynamicTimeWarping) — align discharge-signal time-series for wire-wear signature matching and cut-vs-cut comparison
- `ml_viterbi` / `ml_beam_search` — decode wire-break-risk or short-circuit sequences from gap telemetry
- `ml_gmm` / `ml_knn` — cluster discharge regimes for nearest-neighbour E-code/pulse-param recommendation
- `spatial_ransac_fit` (RANSACHyperplane) — robust trend fit over gap telemetry that rejects transient short-circuit spikes

### G. Wiki index (6 verified entries — name them so a chat hits them directly)
```
knowledge/wiki/wedm/wedm-foundations.md
knowledge/wiki/wedm/wedm-source-atlas.md
knowledge/wiki/wedm/wedm-applied-practice.md
knowledge/wiki/wedm/wedm-advanced-techniques.md
knowledge/wiki/wedm/wedm-resource-atlas.md
knowledge/wiki/wedm/_staging/deep-domain-research-2026-06-09.md  ← UNVERIFIED numerics, owner-gate only
```

---

## IDEAL SECTION OUTLINE

A wedm chat that loads only this galaxy CLAUDE.md should need nothing else except the universal-core pointer:

```
## 0. Owner + scope
   slot:mike, voice:discharge-physics-rigorous, domain:wire|edm|discharge|pulse|gap|dielectric

## 1. Domain scope
   What counts as wedm; what is excluded (sinker, fast-hole, chip-formation)

## 2. EDM physics foundation (the hard physics rules)
   - Kienzle/Taylor DO NOT APPLY
   - EDM is thermal-electric not mechanical
   - Constant surface: discharge energy E=½CV², gap voltage, pulse-on/off ratio, MRR
   - Verified constant paths: constants.ts + jm-die-wedm-tech-tables.ts (NOT inline, NOT web values)

## 3. WHAT NOT TO DO in this domain
   (the 10-item "never" list above — compact, non-negotiable)

## 4. Domain refuses (from SOUL.md — promote here)
   (8 refuses: using-mill-cutting-energy-formulas, ignoring-dielectric-flush-rate, etc.)

## 5. Discharge-physics gotchas (owner-verified)
   (8 candidate items from §D above, with OWNER-GATE annotations until mike validates)

## 6. Key engines — cluster map
   (the 6 clusters by function from §3, with size annotations on the fat engines)
   Pointer: full list at PATHS.md §A engine clusters

## 7. Verified data / constants paths
   (the 8-row table from §B above)

## 8. JM Die machine + post fact
   (FA-10S, 5 vendor dialects, archive path, E-code families)

## 9. Dispatcher surface — daily actions
   (8-row table from §A above; dispatcher file path + action grep pattern)

## 10. Algorithm primitives for telemetry
    (5 prism_algorithm actions from §F)

## 11. Test commands
    (current §4, unchanged)

## 12. Wiki index (6 entries, named)

## 13. Tribal surface
    wedm-knowledge-tips.ts (122 source), 89 tip files, 4 JMD tribal files;
    query via prism_edm:wedm_knowledge_index_query NOT Grep over 89 files

## 14. Cross-galaxy edges
    (current §7 — accurate, keep)

## 15. Closed-loop india integration
    (current stanza — accurate, keep)

## 16. AI + algorithm substrate (pointer)
    Pointer to SOUL.md (AI-synergy score 1/strong) + TOOLBELT.md + PATHS.md
    galaxy-reasoning-bridge: node scripts/lib/galaxy-reasoning-bridge.mjs wedm "<q>"

## 17. Universal-core pointer
    (see §UNIVERSAL-CORE POINTER below)
```

---

## UNIVERSAL-CORE POINTER

The following rules must remain available to a wedm chat but should NOT be duplicated in the galaxy CLAUDE.md. A single pointer section at the end of the galaxy file is sufficient:

```markdown
## Universal doctrine (root CLAUDE.md — do NOT duplicate here)
See `H:/prism/CLAUDE.md` for:
- R1–R15 (Karpathy discipline + agent-era rules)
- SCRUTINY GATE (3-of-3 per-file + Stop gate)
- PER-CHAT HANDOFF (`per-agent-handoff.mjs`)
- Commit format `[SCOPE]/U-ID: title` + slot/mike branch discipline
- UNITS-FIRST rule (G20/G21, STEP unit parsing) — applies to EDM workpiece geometry
- No-stub + comprehensive-build-enforce hooks
- MCP dispatcher map (`DISPATCHER_DIGEST.md`)
- ENGINE_DIGEST.md check + duplicationGuardEngine before creating assets
- Ollama fallback ladder (qwen2.5-coder:32b → gpt-oss:120b → sonnet subagent)
- AI system routing (prism_calc / prism_safety / prism_ai)
- Fleet-reaper + golf slot hygiene
- Session continuity (per-agent-handoff, precompact)
Galaxy files do NOT repeat these — they extend them with domain-specific content only.
```
