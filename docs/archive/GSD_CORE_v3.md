# PRISM GSD CORE v3.0
## Ultra-Compact | MEGA ROADMAP v2.0 Aligned | Generator-First
---

## CURRENT MISSION

```
TARGET: 9,649 Resources (Skills:1,227 | Hooks:6,632 | Scripts:1,257 | Engines:447)
NOW AT: 761 Resources (8% complete)
STRATEGY: Build Generators First → 80× Multiplier → Mass Production
PHASE: 0 - Generator Infrastructure (Sessions 0.1-0.6)
```

## THE 4 LAWS

```
1. SAFETY     → S(x) ≥ 0.70 or BLOCKED
2. COMPLETE   → No placeholders, 100% done  
3. NO REGRESS → New ≥ Old always
4. PREDICT    → 3 failure modes first
```

## PHASE TRACKER

```
PHASE 0: Generators     [▓░░░░░] 0/6 sessions  ← CURRENT
PHASE 1: Mass Prod      [░░░░░░] 0/8 sessions  (9,116 resources)
PHASE 2: P0 Engines     [░░░░░░] 0/8 sessions  (45 engines)
PHASE 3: P1 Engines     [░░░░░░] 0/4 sessions  (60 engines)
PHASE 4: P2 Engines     [░░░░░░] 0/4 sessions  (92 engines)
PHASE 5: Databases      [░░░░░░] 0/6 sessions  (materials + machines)
PHASE 6: Integration    [░░░░░░] 0/3 sessions
─────────────────────────────────────────────────
TOTAL: 39 sessions | 117 hours | 38× speedup
```

## PHASE 0: GENERATOR BUILD ORDER

```
0.1 HookGenerator     → 320 hooks/hr    C:\PRISM\mcp-server\src\generators\
0.2 SkillGenerator    → 80 skills/hr    
0.3 ScriptGenerator   → 64 scripts/hr   
0.4 EngineGenerator   → 16 engines/hr   
0.5 SwarmOrchestrator → Parallel coord  
0.6 MCP Integration   → AI-accessible   
```

## SESSION PROTOCOL

```
START:
1. Check phase: Which generator/task is next?
2. Read: C:\PRISM...\CURRENT_STATE.json
3. Load skills via: py -3 C:\PRISM\scripts\gsd_startup.py "task"

DURING:
4. Build in C:\PRISM\mcp-server\src\ (TypeScript) or C:\PRISM\scripts\ (Python)
5. Checkpoint every 5-8 items
6. Track: 🟢0-8 | 🟡9-14 | 🔴15-18 | ⚫19+ STOP

END:
7. Update CURRENT_STATE.json with phase progress
8. Test new generator/component
```

## CRITICAL PATHS

```
Roadmap:      C:\PRISM...\PRISM_MEGA_ROADMAP_v2.md
State:        C:\PRISM...\CURRENT_STATE.json
MCP Server:   C:\PRISM\mcp-server\src\
Generators:   C:\PRISM\mcp-server\src\generators\ (TO CREATE)
Skills:       C:\PRISM\skills-consolidated\
Scripts:      C:\PRISM\scripts\
```

## GENERATOR ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│  GENERATORS (Phase 0) produce RESOURCES (Phase 1+)          │
├─────────────────────────────────────────────────────────────┤
│  HookGenerator ──────► 6,632 hooks (58 domains)             │
│  SkillGenerator ─────► 1,227 skills (29 categories)         │
│  ScriptGenerator ────► 1,257 scripts (34 categories)        │
│  EngineGenerator ────► 447 engines (11 categories)          │
│  SwarmOrchestrator ──► 8-clone parallel execution           │
└─────────────────────────────────────────────────────────────┘
```

## MCP SERVER STABILITY

```
STABLE (rarely changes):     DYNAMIC (grows via generators):
├── registries/              ├── Generated hooks
├── engines/ (orchestration) ├── Generated skills  
├── tools/ (core 128)        ├── Generated scripts
└── hooks/ (framework)       └── Generated engines

Orchestrator = STABLE infrastructure that USES growing resources
```

## QUALITY GATES

```
Ω(x) = 0.25·R + 0.20·C + 0.15·P + 0.30·S + 0.10·L ≥ 0.70
S(x) ≥ 0.70 → HARD BLOCK (safety-critical)
```

## 10 COMMANDMENTS

```
1. USE IT EVERYWHERE     6. EXPLAIN ALL
2. FUSE UNFUSABLE        7. FAIL GRACEFULLY
3. TRUST BUT VERIFY      8. PROTECT ALL
4. LEARN FROM ALL        9. PERFORM ALWAYS
5. PREDICT UNCERTAINTY  10. OBSESS USERS
```

---

## QUICK REFERENCE

```
┌─────────────────────────────────────────────────────────────┐
│  PRISM v3.0 | 9,649 Target | Generator-First Strategy       │
├─────────────────────────────────────────────────────────────┤
│  CURRENT: Phase 0 - Build generators (80× multiplier)       │
│  NEXT: Session 0.1 - HookGenerator (320 hooks/hr)           │
│  ROADMAP: C:\PRISM...\PRISM_MEGA_ROADMAP_v2.md      │
│  MCP: Stable orchestration, dynamic content                 │
└─────────────────────────────────────────────────────────────┘
```

---
**v3.0 | 2026-02-01 | MEGA ROADMAP v2.0 Aligned | ~1.5KB**
