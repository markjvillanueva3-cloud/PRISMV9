# PRISM ROADMAP v16.0 — CLAUDE CODE NATIVE
## Revised for Claude Code (toggle mode) as primary execution engine
## Date: 2026-02-20 | Status: DRAFT

---

## PHILOSOPHY

Claude Code handles ~90% of execution: file editing, multi-file refactors, builds, testing,
wiring, implementation. It reads CLAUDE.md, has filesystem access, runs commands directly.

Chat handles ~10%: MCP dispatcher queries (manufacturing calcs, registry lookups, safety
validation, omega scores), architecture planning where 31 dispatchers add value, and
state coordination where survival/recovery systems matter.

**The old roadmap assumed every step was a Chat+MCP orchestration with agent swarms,
cadence triggers, and tool call budgets. That overhead disappears with Code.**

---

## WHAT'S COMPLETE (no changes needed)

- DA: Dev Acceleration ✅
- R1-MS0 through R1-MS8A ✅
- U0-A/B/C/D: Utilization Activation ✅ (Ω=0.77, 31 dispatchers, 29,569 entries)
- H1: Hardening ✅ (MemGraph persistence, param normalization, boot smoke, cross-session learning)
- Context System v3 ✅ (compaction fix, hybrid recovery, session digest)
- Git infrastructure ✅ (commits, CLAUDE.md, pre-commit hook, .claude/settings.json)

---

## EXECUTION MODE DEFINITIONS

| Mode | When | Who |
|------|------|-----|
| **CODE** | File editing, multi-file refactors, implementation, builds, tests, wiring | Claude Code (toggle) |
| **CHAT** | MCP queries, manufacturing calcs, registry lookups, omega/ralph validation, planning | Chat + MCP Server |
| **HYBRID** | Architecture decisions needing both file access AND MCP intelligence | Start in Chat (plan), switch to Code (execute), switch to Chat (validate) |

**Switching protocol:**
1. Chat: plan + validate (MCP queries, omega compute, safety checks)
2. Code: execute (edit files, build, test)
3. Chat: verify (MCP-based validation, registry checks)

---

## PHASE R2: SAFETY + ENGINE VALIDATION

### Goal: Validate all safety engines, cutting calcs, and physics against golden benchmarks

| MS | Step | Mode | What | Why Code/Chat |
|----|------|------|------|---------------|
| MS0 | 50-Calc Test Matrix | CODE | Create test script, run all 50 calcs, capture results | File creation + execution |
| MS0 | Golden benchmark comparison | CHAT | prism_calc calls to get expected values, prism_validate for safety scores | MCP dispatchers have the physics engines |
| MS1 | Safety Engine Activation (29 actions) | HYBRID | Code writes test harness, Chat runs prism_safety for each action | Safety engines only accessible via MCP |
| MS1.5 | Calc Regression Suite | CODE | Lock golden dataset as JSON, create regression runner | Pure file work |
| MS2 | AI-Generated Edge Cases | CODE | Generate edge case tests from material/machine combos | File generation |
| MS2 | Edge case validation | CHAT | Run edge cases through prism_calc + prism_safety | MCP physics validation |
| MS3 | Fix Cycle | CODE | Fix any failing engines/calcs | Pure implementation |
| MS4 | Build Gate | HYBRID | Code builds, Chat runs omega + ralph | Omega/Ralph are MCP-only |

### R2 Summary: ~60% Code, ~40% Chat (heavy MCP validation phase)

---

## PHASE R3: CAMPAIGN SYSTEM + MATERIAL ENRICHMENT

### Goal: Multi-operation campaign workflows, material database enrichment

| MS | Step | Mode | What | Why Code/Chat |
|----|------|------|------|---------------|
| MS0 | Campaign data model | CODE | Design schema, create engine, wire dispatcher | Pure implementation |
| MS1 | Material enrichment pipeline | CODE | Script to enrich 3,533 materials with missing fields | Data processing |
| MS1 | Enrichment validation | CHAT | prism_data material_get spot-checks, prism_validate | Registry verification |
| MS2 | Campaign execution engine | CODE | Multi-op sequencing, tool change logic, cycle time | Implementation |
| MS3 | Campaign safety validation | CHAT | prism_safety full chain validation on campaign sequences | Safety is MCP-only |
| MS4 | Integration + gate | HYBRID | Code builds, Chat validates | Standard gate |

### R3 Summary: ~75% Code, ~25% Chat

---

## PHASE R4: ENTERPRISE FEATURES

### Goal: Multi-tenant isolation, compliance templates, API gateway hardening

| MS | Step | Mode | What | Why Code/Chat |
|----|------|------|------|---------------|
| MS0 | Tenant isolation hardening | CODE | Namespace enforcement, data scoping, resource limits | Implementation |
| MS1 | Compliance template expansion | CODE | Add ISO 9001, NADCAP, custom templates | File creation |
| MS1 | Compliance validation | CHAT | prism_compliance gap_analysis + check_compliance | MCP compliance engine |
| MS2 | Bridge/API gateway hardening | CODE | Rate limiting, auth improvements, endpoint security | Implementation |
| MS3 | Enterprise integration tests | CODE | Create comprehensive test suite | File creation |
| MS4 | Gate | HYBRID | Code builds, Chat validates | Standard gate |

### R4 Summary: ~85% Code, ~15% Chat

---

## PHASE R5: VISUAL + POST PROCESSOR

### Goal: G-code generation, post processor, toolpath visualization

| MS | Step | Mode | What | Why Code/Chat |
|----|------|------|------|---------------|
| MS0 | Post processor engine | CODE | Controller-specific G-code output (Fanuc, Siemens, Haas, etc.) | Implementation |
| MS1 | G-code generation expansion | CODE | Support for all 680 toolpath strategies | Implementation |
| MS1 | G-code validation | CHAT | prism_calc gcode_snippet + prism_safety toolpath checks | Physics validation |
| MS2 | Toolpath visualization (SVG/canvas) | CODE | 2D/3D path rendering from strategy params | Frontend implementation |
| MS3 | Cycle time estimation | HYBRID | Code writes engine, Chat validates against prism_calc | Calc engine comparison |
| MS4 | Gate | HYBRID | Standard | Standard |

### R5 Summary: ~80% Code, ~20% Chat

---

## PHASE R6: PRODUCTION DEPLOYMENT

### Goal: Production-ready packaging, monitoring, deployment

| MS | Step | Mode | What | Why Code/Chat |
|----|------|------|------|---------------|
| MS0 | Docker containerization | CODE | Dockerfile, compose, health checks | Pure DevOps |
| MS1 | Monitoring + alerting | CODE | Prometheus metrics, Grafana dashboards | Implementation |
| MS2 | CI/CD pipeline | CODE | GitHub Actions, automated testing, deployment | Implementation |
| MS3 | Performance optimization | HYBRID | Code profiles/optimizes, Chat validates via telemetry | Telemetry is MCP |
| MS4 | Load testing + gate | HYBRID | Code runs load tests, Chat validates omega | Standard |

### R6 Summary: ~90% Code, ~10% Chat

---

## PHASE R7-R11: FUTURE (High-Level)

| Phase | Focus | Mode Split |
|-------|-------|------------|
| R7: Intelligence | Advanced ML/pattern recognition, predictive scheduling | 70% Code / 30% Chat |
| R8: Experience | UI/UX, web dashboard, operator interface | 95% Code / 5% Chat |
| R9: Integration | MTConnect, OPC-UA, ERP connectors | 85% Code / 15% Chat |
| R10: Revolution | Real-time adaptive machining, digital twin | 60% Code / 40% Chat |
| R11: Product | SaaS packaging, billing, onboarding | 90% Code / 10% Chat |

---

## CODE-FIRST EXECUTION PROTOCOL

### For Code Sessions:
1. Read CLAUDE.md (auto-loaded)
2. Read CURRENT_POSITION.md for context
3. Execute task (edit, build, test)
4. Run `npm run build:fast` or `npm run build` after changes
5. Run `scripts/verify-build.ps1` after build
6. Update CURRENT_POSITION.md with results
7. Git commit with descriptive message

### For Chat Sessions:
1. prism_dev→session_boot (loads state)
2. Run MCP queries as needed (calcs, safety, validation)
3. prism_omega→compute for quality scores
4. Update state files with findings

### For Hybrid (Chat→Code→Chat):
1. Chat: Plan + identify what MCP queries are needed
2. Chat: Run queries, capture results to disk (e.g. golden benchmarks)
3. Switch to Code: Implement using captured data
4. Switch to Chat: Validate results via MCP dispatchers

---

## WHAT CHANGES FROM v15.2

| v15.2 (Chat-Native) | v16.0 (Code-Native) |
|---------------------|---------------------|
| Every step = MCP tool calls | Most steps = direct file editing |
| Agent swarms for parallel work | Code handles multi-file directly |
| Cadence system orchestrates | Code reads CLAUDE.md for rules |
| Token budgets per milestone | No token budgets (Code has its own context) |
| Opus/Sonnet/Haiku model split | Code uses its assigned model; Chat uses Opus for validation |
| ~93 tool calls for U0 alone | Most work is Code sessions, Chat validates |
| Role assignments per step | Code is the implementer, Chat is the validator |
| swarm_pipeline for wiring | Code does sequential edits directly |
| ATCS for multi-session | Git branches + Code sessions |

### What STAYS the same:
- Safety Laws (S(x)≥0.70, no placeholders, NEW≥OLD)
- Build protocol (npm run build, verify-build.ps1)
- Anti-regression validation
- Git commit discipline
- CURRENT_POSITION.md + ACTION_TRACKER.md for continuity
- CLAUDE.md as the source of truth for Code
- MCP dispatchers for physics/safety/validation (Chat-only)

---

## IMMEDIATE NEXT STEPS

1. **Update CLAUDE.md** — Add R2 context, current position, Code-first workflow
2. **Start R2-MS0 in Code** — Create 50-calc test matrix script
3. **Switch to Chat** — Run golden benchmark calcs via prism_calc
4. **Back to Code** — Compare results, fix failures
5. **Chat** — Omega + Ralph validation for R2 gate
