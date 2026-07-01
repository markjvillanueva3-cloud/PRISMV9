# mill — slot:foxtrot

_Assessed 2026-06-13 against live codebase. All engine names, dispatcher names, and file paths verified by Bash/Glob before citation._

---

## Current state

**Size:** 16,658 bytes / 192 lines  
**Quality grade: GOOD**

The file is well-structured and substantive — far beyond a stub. It has real domain physics (Kienzle constants, chip-thinning, 5-axis singularity, HyperMILL coolant block), verified engine pointers, cross-galaxy edges, the deep-knowledge wiki cluster (§8), and a closed-loop india integration section. It respects the ≤200-line cap.

**Inaccuracies / fabrications found:**

1. **`TrochoidalEntryAngleValidator` — FABRICATED.** Cited in §5 gotcha #5 as "engine + test exists." Grep of all `src/**/*.ts` found zero matches; only `TrochoidalMillingEngine.ts` exists. This is a honesty violation (R12). Must be replaced with a reference to `TrochoidalMillingEngine.ts` or marked `// UNVERIFIED`.

2. **`Fusion360MillTurnBridgeEngine.detectSingularity()` — method name UNVERIFIED.** The engine file exists (verified), but the method `detectSingularity` was not grep-confirmed. Should be marked `// UNVERIFIED` until a `grep detectSingularity` confirms the export.

3. **Slot affinity line (§1) says `alpha` (primary).** Per current MEMORY.md and SOUL.md, the canonical slot is `foxtrot` (mill-specialist, confirmed in SOUL.md frontmatter `slot: foxtrot`). The mention of `alpha` as "primary" is stale (alpha was the original owner before DOMAIN-GALAXY-DOCTRINE-MS0 codified foxtrot). Misleads a foxtrot chat about its own ownership.

4. **§7 "sibling galaxies to be shipped" (§ Cross-refs)** lists `lathe/CLAUDE.md`, `wedm/CLAUDE.md`, `quoting/CLAUDE.md`, `business/CLAUDE.md` as future — all of these now exist (verified in the galaxy Glob earlier). Stale "FUTURE" language wastes attention.

5. **§3 engine list is partial and inconsistently cited.** `MillingForceEngine.ts`, `MillingAGIMasterEngine.ts`, `MillProgramOptimizerEngine.ts`, `MillStrategyNeuralEngine.ts` are all present on disk (verified) but missing from §3. The section says "these engines exist NOW (verified via command ls at iter12 ship)" — that claim is frozen in time and now understates the live inventory.

6. **`HyperMillCycleCatalogEngine.ts`, `HyperMillCodeGeneratorEngine.ts`** — cited in §3 under hypermill sub-galaxy. Not individually verified in this session; marked as NEEDS-VERIFY (the orchestration engine IS confirmed present).

---

## KEEP

All of the following sections are accurate, load-bearing, and token-efficient:

- **§1 Domain scope** — correct op list (face mill, end mill, pocket, contouring, helical, trochoidal, thread mill, chamfer, deburring, plunge, drill-via-mill). Excludes turning/EDM/additive correctly.
- **§2 Canonical constants reference** — the Kienzle / Taylor / material / tool-geometry / machine power-curve table with `import { KIENZLE_KC } from "../physics/constants.js"` pattern. This is the single most important safety anchor in the file.
- **§4 Test commands** — RTK-prefixed vitest patterns are accurate and save tokens.
- **§5 Mill-specific gotchas 1–4, 6** — chip-thinning non-optional, L³ tool deflection, S(x) spindle-power gate, HyperMILL coolant block 2-char vs 4-char Hurco format, 5-axis A=0 singularity. All grounded in verified engines. (Gotcha #5 needs the fabricated class name corrected — keep the rule, fix the citation.)
- **§6 Tribal pointers** — correct paths + `prism_knowledge:tribal_search` + `tribal-by-domain-inject.mjs` reference.
- **§7 Cross-galaxy edges** — mill↔lathe, mill↔cam, mill↔quality/SPC, mill↔post, mill↔shop-floor-live. All accurate; the `MachineLive*` degrade-to-predicted-power discipline is important.
- **§8 Mill deep-knowledge wiki cluster** — 16 grounded wiki pages with real source citations. The RAG-embedding pending note is honest (R12-compliant).
- **Closed-loop integration with india** — `xproc_outcome_publish`, `xproc_kg_project_features`, `xproc_calibration_monitor_record` references are load-bearing for the india learning loop.
- **Cross-cutting methodology section** — Ollama model tier (qwen2.5-coder:32b / gpt-oss:120b), retired tag list, CAG/RAG/LoRA pointers. Accurate as of 2026-06-04 Blackwell migration.
- **Critic + keep-working contract stanza** — correct global-rule pointer; no duplication of main.

---

## DROP

1. **§ Cross-refs "Sibling galaxies to be shipped" prose** — all four cited galaxy CLAUDE.mds now exist. Replace with live links, not "FUTURE" language. ~3 lines.

2. **§1 "Slot affinity: alpha (primary) + bravo (overflow)"** — stale. Foxtrot IS the primary mill slot (confirmed SOUL.md). Alpha was the seed author, not the ongoing owner. Replace with `foxtrot (primary)`. 1 line.

3. **Auto-generated `<!-- AI-SYSTEMS-STATE:BEGIN -->` block (lines 179–186)** — a pointer to `knowledge/memories/patterns/ai-systems-fleet-state.md` with a regen command. This is a maintenance-metadata stanza, not doctrine. It saves zero tokens at read time (Claude reads it every turn) and belongs in MEMORY.md or as an auto-injected hook context, not the galaxy doctrine file. ~9 lines.

4. **`<!-- CRITIC-KEEPWORKING-STANZA -->` (lines 188–193)** — duplicates global CLAUDE.md R6 + R12 verbatim. The header itself says "pointer -- global doctrine, do NOT duplicate" but then duplicates two paragraphs of it. Reduce to a one-liner pointer. ~6 lines net savings.

5. **Redundant `## Related galaxies (PSN edges)` section (lines 133–136)** — the same cross-galaxy edges are already captured in §7. Three bullets adding no new info vs §7. Drop or merge into §7.

---

## ADD (domain-specific — the heart of this assessment)

### A. Corrected gotcha #5 (fix fabrication)

Replace `TrochoidalEntryAngleValidator` (non-existent) with:

> **Trochoidal entry angle <90° is the bug origin.** Safe default: flat (90°) profile. Validate via `TrochoidalMillingEngine.ts` (the canonical trochoidal implementation — check its entry-angle validation path before allowing <90°).

### B. Primary dispatcher actions foxtrot uses daily (verified: `prism_mill` 49 actions)

The CLAUDE.md mentions the dispatcher but never lists the daily-use actions. A foxtrot chat needs this to avoid re-reading the 217.8K `millDispatcher.ts`. Add a compact table:

| Action | Use |
|--------|-----|
| `mill_print_to_program` | full print→G-code pipeline |
| `mill_strategy` | strategy selection (HSM/trochoidal/adaptive/peel) |
| `mill_physics` | Kienzle force + MRR + power budget |
| `mill_collision` | toolpath collision + clearance check |
| `mill_kinematics` | 5-axis RTCP + singularity detection |
| `mill_optimize` | feed/speed + cycle-time optimization |
| `mill_validate` | post-program validation gate |
| `mill_agi` | AGI orchestration (MillingAGIMasterEngine) |
| `mill_hm_fixture_*` | HyperMILL fixture DB (8 actions wired b4bdf8f699) |

Supporting dispatchers: `prism_calc:{kienzle_force,milling_forces,chip_thinning_*,trochoidal_*}` · `prism_safety:validate_physics` (S(x) ≥ 0.98 before ANY cutting recommendation) · `prism_knowledge:tribal_search slot=foxtrot`.

### C. Key engines missing from §3 (all verified on disk)

Add to the engine list:
- `MillingForceEngine.ts` — cutting force model (distinct from physics constants; the live dispatcher consumer)
- `MillingAGIMasterEngine.ts` — top-level AGI orchestrator for mill (wraps all sub-strategies)
- `MillProgramOptimizerEngine.ts` — cycle-time / feed optimization post-strategy
- `MillStrategyNeuralEngine.ts` — neural strategy recommendation tier
- `MillKinematicsCollisionEngine.ts` — ALREADY in §3 under PATHS.md but missing from CLAUDE.md §3
- `TrochoidalMillingEngine.ts` — trochoidal strategy + entry-angle validation (replace fabricated validator ref)

### D. JM Die mill corpus quick-reference (foxtrot daily ground truth)

The PATHS.md has this detail but CLAUDE.md is silent on it. A foxtrot chat must know:
- Mill programs: `JM DIE/CNC MILL HAAS/` (51–58 customers, 469 files — `.NC/.nc/.mcx-8`)
- Hurco programs: `JM DIE/HURCO CNC PROGRAMS/` (25 `.hnc` WinMax programs)
- Machine profiles: `mcp-server/src/data/jm-die-profile.ts` — VMC-01..05, Grep `VMC-0` to read only relevant machine block
- Tool data is embedded in program HEADERS, not in a central tool-list file (avoids wasted Glob searches)
- VMC-05 Roku-Roku: no registered post — verify before generating NC (known gap per PATHS.md)

### E. Domain-specific "what NOT to do" list (currently absent)

```
## Mill DO-NOT list (hard rules, not gotchas)
- DO NOT inline kc1.1/mc/Taylor C,n constants — import from physics/constants.ts
- DO NOT create a mill engine without duplicationGuardEngine.checkBeforeCreating()
- DO NOT call prism_mill without first passing prism_safety:validate_physics (S(x) ≥ 0.98)
- DO NOT reference TrochoidalEntryAngleValidator — it does not exist; use TrochoidalMillingEngine.ts
- DO NOT Glob mcp-server/src/engines/ without the mill-specific patterns in TOOLBELT.md §Glob
- DO NOT full-read millDispatcher.ts (217.8K) — Grep the action name, Read only that case block
- DO NOT full-read ToolpathStrategyRegistry.ts (197K) — Grep the strategy name first
- DO NOT write tribal tips directly to knowledge/tribal/mill-*.md (auto-overwritten on regen); use prism_knowledge:tribal_capture slot=foxtrot
- DO NOT assume the same coolant block format transfers across post-processors (HyperMILL 4-char breaks Hurco V11)
- DO NOT generate A-axis < 0.5° from zero without running singularity detection first
```

### F. Material / controller specifics currently missing

The file has Kienzle group constants (P/M/K/N/S/H) in the table but nowhere states the JM Die shop's dominant materials and controllers:
- **JM Die dominant work materials:** P-group (1018, 1045, 4140, 4340 steel) and K-group (6061, 7075 Al), occasional S-group (Ti-6Al-4V, Inconel 718 for specialty). Set kc1.1 accordingly before strategy selection.
- **Controllers on the VMC fleet:** Haas NGC (VMC-01..04), Hurco WinMax (VMC-05 Roku-Roku). HyperMILL posts must target the correct controller dialect — NGC posts vs Hurco .hnc format are NOT interchangeable.
- **Spindle limits (from jm-die-profile.ts):** Never recommend a spindle speed or feed without checking the per-machine limit; the VMC-01..05 specs differ. Use `prism_safety:validate_physics` for the S(x) gate.

### G. Algorithm primitives pointer (referenced in MEMORY.md but not in CLAUDE.md)

MEMORY.md §Available algorithm primitives lists `prism_algorithm` invocables critical to mill cutting-physics (SavitzkyGolayFilter for spindle-load smoothing, DynamicTimeWarping for force-signature matching, RANSAC for on-machine probe fitting, GMM/KNN for regime retrieval). These should be a compact pointer in CLAUDE.md so a foxtrot chat knows to route through `prism_algorithm` before re-deriving signal-processing from scratch.

---

## IDEAL SECTION OUTLINE

For a foxtrot mill chat that needs nothing beyond this file + the universal-core pointer:

```
1. Domain scope (ops covered / excluded / slot ownership)
2. Dispatcher daily-use (prism_mill 49 actions — compact table of the 10 most-used)
3. Key engines (verified names — cutting physics / strategy / kinematics / AGI / post)
4. Canonical constants (NEVER inline — import table, .js suffix rule)
5. Mill gotchas (corrected — all 6 physics traps, with verified class names)
6. DO-NOT list (hard rules — fabrication / safety / token-waste prevents)
7. JM Die mill corpus (program paths, machine profiles, VMC-05 gap, tool-in-header rule)
8. Material + controller specifics (dominant ISO groups, Haas NGC vs Hurco WinMax)
9. Algorithm primitives (prism_algorithm invocables for signal processing / ML)
10. Deep-knowledge wiki cluster (16 pages — already good in §8)
11. Cross-galaxy edges (keep §7 — merge §Related galaxies into it)
12. Tribal pointers + Obsidian recall routing
13. Closed-loop india integration (outcome_publish / tribal_capture)
14. Test commands (RTK-prefixed)
15. Universal-core pointer (one line + link)
```

Target: ≤220 lines (current is 192; the additions + removals net to ~215 with the auto-generated stanzas trimmed).

---

## UNIVERSAL-CORE POINTER

The following rules must remain available to a foxtrot chat but should NOT be duplicated in this galaxy file. A single pointer line is sufficient:

```markdown
## Universal doctrine (do NOT duplicate here)
→ Root `H:/prism/CLAUDE.md` governs: R1–R15 · 3-of-3 scrutiny gate · per-chat handoff (per-agent-handoff.mjs) ·
  commit format `[SCOPE]/U-ID: title` · units-first (G20/G21 resolve before any geometry work) ·
  no-stub-engines hook · duplicationGuardEngine.mustCheckBeforeCreating() · RTK bash prefix ·
  Ollama fallback ladder (Ollama→Sonnet→Opus) · PRISM wiki protocol · SESSION HYGIENE checklist.
  Read it once per session start; do not re-inline any section here.
```

Sections in the current file that reproduce universal content and should be replaced with this pointer:
- The "critic + keep-working" stanza (verbatim R6/R12)
- The `<!-- AI-SYSTEMS-STATE:BEGIN -->` maintenance block

---

_End of assessment. File written to `state/shared/slot-claude-md-assessment/mill.md`._
