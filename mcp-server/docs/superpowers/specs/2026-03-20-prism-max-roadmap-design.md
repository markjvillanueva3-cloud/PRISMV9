# PRISM MAX — Master Enhancement Roadmap

**Date**: 2026-03-20
**Status**: APPROVED
**Scope**: 5 tracks, 15 milestones, 78 units
**Vision**: Transform PRISM from dev-tool to production manufacturing
intelligence platform — SaaS API, desktop app, shop floor kiosk,
autonomous agent, and machinist training academy.

## Architecture Overview

```
TRACK A: PRODUCTION READINESS (Foundation)
  PROD-MS0  Build Quality Hardening           7 units
  PROD-MS1  Web App Consolidation + Auth      5 units
  PROD-MS2  Deployment Pipeline               5 units

TRACK B: REVENUE & VALUE EXPANSION
  REV-MS0   SaaS API Layer                    5 units
  REV-MS1   Desktop App (Tauri)               5 units
  REV-MS2   Shop Floor Kiosk Mode             5 units
  REV-MS3   Training Marketplace              5 units

TRACK C: TECHNICAL DEPTH
  TECH-MS0  Output Schema + Completions       5 units
  TECH-MS1  Sampling Workflows                5 units
  TECH-MS2  Real-Time Machine Intelligence    5 units

TRACK D: KNOWLEDGE LEVERAGE
  KNOW-MS0  Manufacturing Knowledge Graph     5 units
  KNOW-MS1  AI-Powered Troubleshooting        5 units

TRACK E: PRISM ACADEMY (Machinist Training)
  ACAD-MS0  Curriculum Engine + 3 Courses     6 units
  ACAD-MS1  Advanced Courses + Visual Lab     5 units
  ACAD-MS2  Master Level + Certification      5 units
```

---

## Track A: Production Readiness

### PROD-MS0: Build Quality Hardening

| ID | Unit | Description | Exit |
|----|------|-------------|------|
| P0-U01 | TypeScript strict mode | Enable `"strict": true` in tsconfig.json, fix all resulting errors | 0 TS errors with strict |
| P0-U02 | Fix `as any` casts | Replace 5 unsafe casts in src/mcp/ with proper type narrowing | 0 `as any` in src/mcp/ |
| P0-U03 | Error logging | Add structured error logging to resource.ts catch blocks (4) | All catches log before returning |
| P0-U04 | Fix annotations | CAM/CAD `idempotentHint: false`, audit all 67 dispatchers | Annotation audit complete |
| P0-U05 | Digest reconciliation | Regenerate DISPATCHER_DIGEST from z.enum arrays | Digest matches code |
| P0-U06 | Pre-commit hooks | husky + lint-staged (lint + type-check on staged files) | Hooks fire on commit |
| P0-U07 | Dynamic paths | Replace hardcoded Windows paths in agentConfig.ts | Works on Linux/Mac/Docker |

### PROD-MS1: Web App Consolidation + Auth

| ID | Unit | Description | Exit |
|----|------|-------------|------|
| P1-U01 | Merge web apps | Consolidate /web into mcp-server/web, delete duplicate | Single web app |
| P1-U02 | Three.js viewer | Add @react-three/fiber + drei + three, wire 3D viewer | Toolpath renders in browser |
| P1-U03 | OAuth route guards | Wire Wave 5 OAuth to web routes, protect /admin /erp | Unauthenticated = redirect |
| P1-U04 | Login flow | Login/signup pages, role-based nav (operator/engineer/admin) | Login works end-to-end |
| P1-U05 | Learning module | Complete 8 stub components with real content | Material/tool/machine wizards work |

### PROD-MS2: Deployment Pipeline

| ID | Unit | Description | Exit |
|----|------|-------------|------|
| P2-U01 | docker-compose.yml | server + web + postgres, single `docker compose up` | Stack runs locally |
| P2-U02 | CI lint+test | GitHub Actions: eslint + vitest on PR | PRs get status checks |
| P2-U03 | CI build+deploy | GitHub Actions: Docker build + push to registry | Images auto-published |
| P2-U04 | Core docs | ARCHITECTURE.md, GETTING_STARTED.md, DEPLOYMENT.md | New dev onboards in 15min |
| P2-U05 | Health probes | /health, /ready, /live endpoints for K8s | Probes return 200 |

---

## Track B: Revenue & Value Expansion

### REV-MS0: SaaS API Layer

| ID | Unit | Description | Exit |
|----|------|-------------|------|
| R0-U01 | REST routes | Express routes wrapping MCP dispatchers (/api/v2/*) | All 67 dispatchers accessible via HTTP |
| R0-U02 | Rate limiting | Per-tier limits (free 100/day, pro 10K, enterprise unlimited) | Rate limit headers in responses |
| R0-U03 | OpenAPI spec | Auto-generate from MCP schemas, Swagger UI at /api/docs | Interactive API docs work |
| R0-U04 | Usage metering | Track API calls per key, Stripe billing integration | Usage dashboard shows counts |
| R0-U05 | Developer portal | Hosted docs, API key management, example code | Self-service API access |

### REV-MS1: Desktop App (Tauri)

| ID | Unit | Description | Exit |
|----|------|-------------|------|
| R1-U01 | Tauri shell | Wrap mcp-server/web in Tauri, native window | App launches, renders web UI |
| R1-U02 | Embedded MCP | Local stdio MCP server in Tauri sidecar | Works offline |
| R1-U03 | File integration | Open .nc/.stp/.igs from OS file explorer | Double-click opens in PRISM |
| R1-U04 | System tray | Machine status via MTConnect/MQTT in tray | Tray icon shows machine state |
| R1-U05 | Auto-update | GitHub Releases + Tauri updater | Update notification works |

### REV-MS2: Shop Floor Kiosk Mode

| ID | Unit | Description | Exit |
|----|------|-------------|------|
| R2-U01 | Kiosk layout | Large touch buttons, simplified nav, dark theme | Usable with gloves |
| R2-U02 | Quick S/F calc | 3-tap: material -> tool -> calculate | Answer in <3 seconds |
| R2-U03 | Alarm scanner | Type alarm code, get meaning + fix steps | Decode works for all 10K alarms |
| R2-U04 | Setup sheet viewer | Display setup sheets from SetupSheetFromGCode | Paperless setup at machine |
| R2-U05 | Tool life tracker | Scan/enter tool, see remaining life vs Taylor | Tool change countdown visible |

### REV-MS3: Training Marketplace

| ID | Unit | Description | Exit |
|----|------|-------------|------|
| R3-U01 | Course builder | Auto-generate lesson content from tribal tips | Lessons created from 3700+ tips |
| R3-U02 | Quiz engine | Scenario-based from playbook rules | Quizzes from 296 rules |
| R3-U03 | Progress tracking | Per-user progress, badges, leaderboard | Dashboard shows completion % |
| R3-U04 | CAM comparison | Side-by-side modules for 18 CAM systems | Student picks primary CAM |
| R3-U05 | Video integration | VideoLearningEngine -> interactive lessons | Video content plays in courses |

---

## Track C: Technical Depth

### TECH-MS0: Output Schema + Completion Coverage

| ID | Unit | Description | Exit |
|----|------|-------------|------|
| T0-U01 | calcDispatcher schemas | Output schemas for top 100 actions | 115 schemas (was 15) |
| T0-U02 | camDispatcher schemas | Output schemas for all 115 actions | Full CAM coverage |
| T0-U03 | Tool completions | Prefix-search autocomplete for 94K tools | Type "ken" -> Kennametal results |
| T0-U04 | Alarm completions | Prefix-search autocomplete for 10K alarms | Type "EX" -> alarm matches |
| T0-U05 | Safety schemas | Output schemas for all safety-critical actions | Validated safety results |

### TECH-MS1: Sampling Workflows

| ID | Unit | Description | Exit |
|----|------|-------------|------|
| T1-U01 | Feasibility sampling | Tool set for auto-resolving fixture/access | Sampling resolves fixture choices |
| T1-U02 | CAM strategy sampling | Tool set for optimal strategy selection | Sampling picks strategy + explains |
| T1-U03 | Post-processor sampling | Tool set for dialect selection | Auto-selects controller dialect |
| T1-U04 | Print-to-program chain | Full autonomous: description -> G-code | G-code generated without intervention |
| T1-U05 | Self-correcting S/F | Calculate -> simulate -> adjust loop | Converges within 3 iterations |

### TECH-MS2: Real-Time Machine Intelligence

| ID | Unit | Description | Exit |
|----|------|-------------|------|
| T2-U01 | MTConnect dashboard | Live spindle load vs Kienzle prediction | Real-time comparison chart |
| T2-U02 | Chatter auto-reduction | MQTT vibration -> FFT -> feed reduction | Auto-adjust within 2 seconds |
| T2-U03 | Thermal compensation | Sensor -> CTE -> offset calculation loop | Sub-micron drift tracking |
| T2-U04 | Tool life countdown | Actual wear vs Taylor, optimal change time | Countdown updates per block |
| T2-U05 | Time-series storage | InfluxDB/TimescaleDB for machine history | 30-day retention, trend queries |

---

## Track D: Knowledge Leverage

### KNOW-MS0: Manufacturing Knowledge Graph

| ID | Unit | Description | Exit |
|----|------|-------------|------|
| K0-U01 | Graph schema | material<->tool<->machine<->operation<->strategy | Schema supports all relationships |
| K0-U02 | Auto-populate | From 2957 materials, 910 machines, 94K tools | Graph has all existing data |
| K0-U03 | NL queries | "What tools for Inconel on 5-axis?" | Natural language returns results |
| K0-U04 | Recommendations | Similar parts -> proven setups | Top 3 recommendations with scores |
| K0-U05 | Gap detection | Untested material/tool combinations | Report shows coverage map |

### KNOW-MS1: AI-Powered Troubleshooting

| ID | Unit | Description | Exit |
|----|------|-------------|------|
| K1-U01 | Decision trees | Symptom -> root cause (52+ nodes) | Guided problem solving works |
| K1-U02 | Photo diagnosis | Upload bad part photo -> identify defect | Classifies top 3 defect types |
| K1-U03 | Audio chatter | Microphone -> FFT -> stability lobe lookup | Chatter frequency identified |
| K1-U04 | Predictive failure | Alarm history + sensor -> prediction | Predicts failure 2-8 hours ahead |
| K1-U05 | Tribal matching | Problem description -> relevant CAM tips | Returns top 5 applicable tips |

---

## Track E: PRISM Academy (Machinist Training)

### ACAD-MS0: Curriculum Engine + Foundation Courses

| ID | Unit | Description | Exit |
|----|------|-------------|------|
| A0-U01 | CurriculumEngine | Course/module/lesson/quiz model, progress tracking, prerequisites, spaced repetition | Engine passes 20+ tests |
| A0-U02 | LessonRendererEngine | Embedded PRISM calculators, annotated SVG diagrams, animations, G-code highlighting, sandbox panels | Renders all content types |
| A0-U03 | AssessmentEngine | 4 question types (MC, calculation, visual ID, troubleshooting tree), adaptive difficulty, certificates | All question types work |
| A0-U04 | Course 1: Manufacturing Fundamentals | 12 modules (machine types, coordinates, tools, materials, S/F concept, drawings, surface finish, tolerances, workholding, coolant, safety) — Novice level, ~8hr | All 12 modules render + test |
| A0-U05 | Course 2: Speed/Feed Mastery | 10 modules (chip load, Kienzle, Taylor, SFM/RPM, feed rate, stability lobes, chip thinning, ISO groups, deflection, full walkthrough) — Intermediate, ~6hr | Live calculators + 50 practice problems |
| A0-U06 | Course 3: G-Code Programming | 10 modules (structure, motion, canned cycles, offsets, tool changes, cutter comp, subprograms, program structure, mistakes, reading programs) — Intermediate, ~8hr | GCodeSafetyAnalyzer reviews student code |

### ACAD-MS1: Advanced Courses + Visual Lab

| ID | Unit | Description | Exit |
|----|------|-------------|------|
| A1-U01 | VisualLabEngine | Three.js interactive 3D: rotating tool/workpiece, chip animation, toolpath preview (color-coded feed), IPW removal, stress/heat overlays, parameter manipulation | 3D lab renders and responds to input |
| A1-U02 | Course 4: Milling Operations | 12 modules (face, pocket, slot, contour, plunge, adaptive/HSM, rest, 3D surfacing, thread mill, drilling, tapping, micro) — with operation animations + playbook rules per op | All 12 operations animated |
| A1-U03 | Course 5: Turning Operations | 10 modules (OD rough/finish, facing, groove, thread, bore, part-off, live tool, sub-spindle, Swiss) — rotational animations + insert geometry from catalog | All 10 operations animated |
| A1-U04 | Course 6: CAM System Mastery | 18 mini-modules (1 per CAM system) — top 10 tribal tips each, unique features, common pitfalls, cross-system comparison. Student picks primary CAM for deep-dive | All 18 systems covered |
| A1-U05 | Course 7: Material Science | 8 modules (steels, aluminum, stainless, titanium, superalloys, plastics, composites, exotic) — visual chip comparisons, property data from 2957-material DB | Interactive material comparison tool |

### ACAD-MS2: Master Level + Certification

| ID | Unit | Description | Exit |
|----|------|-------------|------|
| A2-U01 | Course 8: 5-Axis Machining | 8 modules (3+2 vs simultaneous, lead/lag/tilt, TCPC/RTCP, singularity, collision, port machining, impeller, post considerations) — uses FiveAxisToolpathIntegrationEngine | All 8 with kinematic animations |
| A2-U02 | Course 9: Process Optimization | 8 modules (Monte Carlo, Taguchi, SPC/Cpk, tool wear prediction, thermal compensation, vibration analysis, energy optimization, cost optimization) — uses live PRISM engines | All 8 with interactive charts |
| A2-U03 | Course 10: Troubleshooting | 10 modules (chatter, poor finish, tool breakage, dimensional errors, chip evacuation, coolant, fixtures, crashes, alarms, post issues) — uses TroubleshootingAssistant's 52 nodes | All 10 with diagnostic trees |
| A2-U04 | CertificationEngine | 3 levels: Operator (courses 1-3, >=80%), Programmer (1-7, >=85%), Master (all 10, >=90%). Timed finals, PDF certificates, verification codes, leaderboard | Cert generation + verification works |
| A2-U05 | AdaptiveLearningEngine | Performance tracking by topic, weak-area detection, auto-remedial, difficulty adjustment, role-based paths, spaced repetition, skill tree visualization | Adaptive recommendations accurate |

---

## Visual Design System (Track E)

### Pedagogy Pattern (every lesson)
1. **Show it** — diagram/animation/3D first
2. **Explain it** — plain English, manufacturing analogies
3. **Calculate it** — live PRISM calculator with visible formulas
4. **Try it** — interactive exercise using real engines
5. **Test it** — scenario-based assessment

### Color System
- Green = safe/optimal zone
- Yellow = caution (approaching limits)
- Red = danger (will break tool/damage part)
- Blue = calculated/predicted values
- Orange = user-entered values

### Interactive Elements
- Parameter sliders with real-time result updates
- Before/after comparisons (wrong vs right S/F)
- Annotated SVG diagrams with hover tooltips
- G-code syntax highlighting with error markers
- 3D toolpath/workpiece with orbit controls

---

## Execution Timeline

### Q1 2026 (Now -> +3 months)
- PROD-MS0: Build hardening (7 units)
- TECH-MS0: Schema + completions (5 units)
- ACAD-MS0: Curriculum engine + 3 courses (6 units)

### Q2 2026
- PROD-MS1: Web consolidation + auth (5 units)
- PROD-MS2: Deployment pipeline (5 units)
- TECH-MS1: Sampling workflows (5 units)
- ACAD-MS1: Advanced courses + visual lab (5 units)

### Q3 2026
- REV-MS0: SaaS API (5 units)
- REV-MS1: Desktop app (5 units)
- TECH-MS2: Real-time intelligence (5 units)
- ACAD-MS2: Master + certification (5 units)

### Q4 2026
- REV-MS2: Kiosk mode (5 units)
- REV-MS3: Training marketplace (5 units)
- KNOW-MS0: Knowledge graph (5 units)
- KNOW-MS1: AI troubleshooting (5 units)

---

## Dependencies

```
PROD-MS0 -> PROD-MS1 -> PROD-MS2 (sequential)
PROD-MS1 -> REV-MS0 (auth required for API)
PROD-MS1 -> REV-MS1 (web app required for desktop)
PROD-MS1 -> ACAD-MS0 (web app required for courses)
TECH-MS0 -> REV-MS0 (schemas required for API docs)
ACAD-MS0 -> ACAD-MS1 -> ACAD-MS2 (sequential)
TECH-MS2 -> KNOW-MS1 (real-time data for AI troubleshooting)
```

## Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Engines | 1070+ | 1090+ |
| Actions | 2650+ | 2750+ |
| Output schemas | ~40 | 250+ |
| Web pages | 44 (broken) | 50+ (working) |
| CLI commands | 24 | 30+ |
| Test count | 17,374+ | 20,000+ |
| Courses | 0 | 10 |
| Certifications | 0 | 3 levels |
| API tiers | 0 | 3 (free/pro/enterprise) |
| Desktop platforms | 0 | 3 (Win/Mac/Linux) |
