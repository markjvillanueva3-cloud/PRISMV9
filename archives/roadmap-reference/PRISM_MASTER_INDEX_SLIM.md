# PRISM MASTER INDEX — SLIM v14.5
# Load THIS for normal sessions. Full PRISM_MASTER_INDEX.md for phase gates only.
# ~200 lines, ~1.5K tokens (vs ~618 lines, ~4.5K tokens for full)

## SYSTEM STATE
```
Dispatchers: 31 | Actions: 368 | Engines: 37 | Build: 3.9MB (esbuild)
Materials: 3518+ (127 params) | Machines: 824+ (43 mfg) | Alarms: 10033+
Tools: 1944+ | Formulas: 500 | Strategies: 697 | Skills: 126
Hooks: 53 (30 auto-cadence) | NL Hooks: 5 | Skill Chains: 6
Safety: S(x)>=0.70 HARD BLOCK | Quality: Omega>=0.70 release
Build: npm run build (NEVER standalone tsc — OOM)
```

## SESSION WORKFLOW
```
1. Read PRISM_RECOVERY_CARD.md (Steps 0-2: env detect, find position, load phase doc)
2. Execute from current position in phase doc
3. Update CURRENT_POSITION.md every 3 calls
4. Flush results to disk after each logical unit
5. At session end: write SESSION_HANDOFF.md, update position + tracker
For full protocol details: PRISM_PROTOCOLS_BOOT.md
For deep reference: PRISM_PROTOCOLS_CORE.md
```

## PHASE REGISTRY
| ID | Title | Status | Sessions |
|----|-------|--------|----------|
| P0 | Full System Activation | **complete** | — |
| DA | Development Acceleration | **in-progress** | 14-20 |
| R1 | Registry + Data Foundation | **in-progress** (MS0-4) | 2-3 more |
| R2 | Safety + Engine Validation | not-started | 2-3 |
| R3 | Intelligence + Data Campaigns | not-started | 4-6 |
| R4 | Enterprise + API Layer | not-started | 3-4 |
| R5 | Visual Components + Production | not-started | 4-6 |
| R6 | Production Hardening | not-started | 2-3 |
| R7 | Intelligence Evolution | not-started | 5-7 |
| R8 | User Experience + App Skills | not-started | 7-9 |
| R9 | Real-World Integration | not-started | 10-14 |
| R10 | Manufacturing Revolution | vision-phase | 12-24mo |
| R11 | Product Packaging | not-started | 6-10 |

## PHASE DOCS (all at data/docs/roadmap/)
```
PHASE_P0_ACTIVATION.md         (complete — skip)
PHASE_DA_DEV_ACCELERATION.md   (1404 lines — active)
PHASE_R1_REGISTRY.md           (1513 lines — skip to MS4.5+)
PHASE_R2_SAFETY.md             (778 lines)
PHASE_R3_CAMPAIGNS.md          (1004 lines)
PHASE_R4_ENTERPRISE.md         (243 lines)
PHASE_R5_VISUAL.md             (289 lines)
PHASE_R6_PRODUCTION.md         (308 lines)
PHASE_R7_INTELLIGENCE.md       (1040 lines)
PHASE_R8_EXPERIENCE.md         (920 lines)
PHASE_R9_INTEGRATION.md        (604 lines)
PHASE_R10_REVOLUTION.md        (989 lines)
PHASE_R11_PRODUCT.md           (227 lines)
```

## KEY DOCS
```
PRISM_RECOVERY_CARD.md         — Boot/recovery (load EVERY session)
ROADMAP_SECTION_INDEX.md       — 572 anchors, load section by line number
CURRENT_POSITION.md            — Where you are (structured state)
SESSION_HANDOFF.md             — What was done + what's next
ROADMAP_TRACKER.md             — Milestone completion log
PRISM_PROTOCOLS_BOOT.md        — Essential rules (Tier A, every session)
PRISM_PROTOCOLS_CORE.md        — Full reference (Tier B+C, on-demand)
DECISIONS_LOG.md               — Append decisions for continuity
SKILL_TIER_MAP.json            — 15A/33B/51C skill classification
ROLE_MODEL_EFFORT_MATRIX.md    — All 95 milestones with role/model/effort
```

## ESSENTIAL RULES (duplicated from Recovery Card for quick reference)
```
BUILD:     npm run build (NEVER standalone tsc)
SAFETY:    S(x) >= 0.70 is HARD BLOCK
POSITION:  Update CURRENT_POSITION.md every 3 calls
FLUSH:     Write results to disk after each logical unit
ERRORS:    Fix ONE build error. Rebuild. Repeat. >5 from one edit — revert.
STUCK:     3 same-approach fails — try different. 6 total — skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
```