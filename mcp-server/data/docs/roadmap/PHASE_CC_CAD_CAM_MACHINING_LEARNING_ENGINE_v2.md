# PHASE CC: CAD/CAM/MACHINING LEARNING ENGINE
## PRISM Modular Roadmap — Phase Document
## Version 2.0 | Updated 2026-02-24

---

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PHASE CC — CAD/CAM/MACHINING LEARNING ENGINE                                ║
║  Status: NOT STARTED                                                         ║
║  Priority: HIGH (new capability vertical)                                    ║
║  Prerequisites: P0 complete, R1-MS4 complete                                 ║
║  Estimated Duration: 39-45 sessions | ~117-135 hours                         ║
║  Dependencies: CadQuery (Python), yt-dlp, ffmpeg, Tesseract OCR,            ║
║                Anthropic Vision API                                          ║
║                                                                               ║
║  ENV: Claude Code 60% / MCP 40%                                             ║
║  CC: bulk file gen, pipeline scripts, test harnesses                         ║
║  MCP: safety calcs, architecture decisions, validation logic                 ║
║                                                                               ║
║  MODEL ROUTING:                                                               ║
║  Opus  → Architecture, safety validation, knowledge graph design,            ║
║          vision analysis of keyframes, machining practice evaluation          ║
║  Sonnet → Implementation, pipeline code, extraction prompts                  ║
║  Haiku  → Bulk transcript processing, OCR cleanup, metadata tagging          ║
║                                                                               ║
║  THREE LEARNING DOMAINS:                                                      ║
║  1. CAD  → Part geometry, feature modeling, parametric design                ║
║  2. CAM  → Toolpath strategies, programming, post-processing                ║
║  3. SHOP → Machining practices, setup, fixturing, troubleshooting            ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

# TABLE OF CONTENTS

1. [Phase Overview](#1-phase-overview)
2. [Three Learning Domains](#2-three-learning-domains)
3. [Problem Statement](#3-problem-statement)
4. [Architecture](#4-architecture)
5. [Milestone Definitions](#5-milestone-definitions)
   - CC-MS0: Foundation — CadQuery Integration + CAD Kernel
   - CC-MS1: Video Ingestion Pipeline + Vision Analysis
   - CC-MS2: Knowledge Extraction Engine (All Three Domains)
   - CC-MS3: Parametric Code Generator (CAD — DRAW)
   - CC-MS4: Feature Primitive Library (CAD — LEARN)
   - CC-MS5: CAM Strategy Learning Engine (CAM — LEARN)
   - CC-MS6: Machining Practice Knowledge Base (SHOP — LEARN)
   - CC-MS7: Persistent Memory System + Boot Integration (RETAIN)
   - CC-MS8: Cross-Platform Operation Mapping
   - CC-MS9: Manufacturability Validation Bridge
   - CC-MS10: Operator Guidance Interface
   - CC-MS11: Integration Testing + Safety Certification
6. [Mandatory Requirements](#6-mandatory-requirements)
7. [New Dispatcher Specification](#7-new-dispatcher-specification)
8. [Database Schema Extensions](#8-database-schema-extensions)
9. [Risk Register](#9-risk-register)
10. [Success Metrics](#10-success-metrics)
11. [Handoff Package Template](#11-handoff-package-template)

---

# 1. PHASE OVERVIEW

## What This Phase Delivers

A complete manufacturing knowledge learning system across **three domains** that can:

1. **CAD — DRAW** — Generate real geometry (STEP, DXF, STL) from natural language descriptions using a parametric CAD kernel
2. **CAD — LEARN** — Extract part design techniques, feature trees, and modeling procedures from YouTube tutorials across all major CAD platforms
3. **CAM — LEARN** — Extract toolpath strategies, CAM programming procedures, post-processor configurations, and machining sequences from YouTube tutorials across all major CAM platforms
4. **SHOP — LEARN** — Extract real-world machining practices: workholding/fixturing methods, setup procedures, chip management, coolant strategies, tool selection rationale, feeds/speeds reasoning, troubleshooting techniques, and shop floor wisdom from YouTube machinists
5. **RETAIN** — Persist ALL learned knowledge across sessions with automatic boot loading, searchable memory, and compound growth with every video ingested
6. **VALIDATE** — Cross-check everything against PRISM's physics engine before it reaches an operator

## Why This Matters

YouTube is the world's largest repository of manufacturing knowledge. Experienced machinists like Titans of CNC, This Old Tony, Abom79, NYC CNC, Edge Precision, and hundreds of others have collectively uploaded **tens of thousands of hours** of practical machining instruction. This knowledge covers everything from basic lathe operations to 5-axis simultaneous programming to exotic material machining.

PRISM currently has the physics engine (Kienzle, Johnson-Cook), the material database (3,533), the machine database (1,016), and the tool database (13,967). What it's missing is the **practical knowledge layer** — the "here's how an experienced machinist actually approaches this problem" knowledge that lives in tutorial videos and shop floor experience.

Phase CC turns PRISM into a system that **watches, learns, remembers, validates, and teaches.**

## Supported Platforms (Video Learning Targets)

### CAD Platforms
| Platform | Priority | Notes |
|----------|----------|-------|
| SolidWorks | P0 | Most common in job shops |
| Fusion 360 | P0 | Free tier widely used |
| AutoCAD | P0 | 2D drafting standard |
| Inventor | P1 | Autodesk parametric |
| CATIA | P1 | Aerospace/automotive |
| Creo (Pro/E) | P1 | Legacy shops |
| Siemens NX | P2 | Enterprise |
| Onshape | P2 | Cloud-native |

### CAM Platforms
| Platform | Priority | Notes |
|----------|----------|-------|
| Mastercam | P0 | #1 installed CAM worldwide |
| Fusion 360 CAM | P0 | Integrated CAD/CAM |
| SolidWorks CAM | P0 | Integrated |
| Siemens NX CAM | P1 | High-end production |
| GibbsCAM | P1 | Job shop favorite |
| Esprit | P1 | Multi-axis specialist |
| BobCAD-CAM | P2 | Budget option |
| OneCNC | P2 | Mill/turn |
| HSMWorks | P2 | SolidWorks integrated |
| PowerMill | P2 | Complex 5-axis |

### Machining Practice Sources (YouTube Channels / Content Types)
| Source Type | Examples | Knowledge Extracted |
|-------------|----------|-------------------|
| Professional machinists | Titans of CNC, NYC CNC, Edge Precision | Production techniques, high-volume strategies |
| Shop floor educators | This Old Tony, Abom79, Joe Pieczynski | Practical setup, troubleshooting, manual machining |
| CNC manufacturers | HAAS Automation, Okuma, Mazak | Machine-specific best practices, features |
| Tooling manufacturers | Kennametal, Sandvik, Harvey Tool | Tool selection, application guides, cutting data |
| Workholding companies | Kurt, Schunk, 5th Axis | Fixturing strategies, workholding solutions |
| Process specialists | Tormach, Datron, Kern | Specialized processes (micro machining, high speed) |
| Trade education | MIT OpenCourseWare, trade school channels | Theory + fundamentals |

---

# 2. THREE LEARNING DOMAINS

## Domain 1: CAD (Part Design & Geometry)

**What PRISM learns from CAD tutorials:**
- Feature modeling sequences (sketch → extrude → fillet → pattern → etc.)
- Parametric design principles (what should be a parameter vs hardcoded)
- Design for manufacturing considerations shown in tutorials
- GD&T application (tolerancing, datums, feature control frames)
- Assembly design patterns (fits, clearances, fastener selection)
- Standard feature dimensions (keyways per ANSI B17.1, O-ring grooves per AS568, etc.)
- Sheet metal design (bend radius, K-factor, relief cuts)
- Weldment design (joint types, prep, symbols)

**Output:** Parametric CadQuery recipes + reusable feature primitives

## Domain 2: CAM (Toolpath Programming)

**What PRISM learns from CAM tutorials:**
- Toolpath strategy selection (when to use adaptive vs pocket vs contour vs trochoidal)
- Strategy parameter rationale (why 25% stepover for this material, why full-depth slotting here)
- Tool selection logic (why a 3-flute vs 4-flute, why carbide vs HSS, why that coating)
- Multi-operation sequencing (rough → semi-finish → finish → deburr)
- Fixture offset and WCS setup in CAM software
- Post-processor configuration and G-code output
- Simulation and verification practices
- Multi-axis programming (3+2 positioning, simultaneous 4th/5th)
- Mill-turn programming (combined milling and turning operations)
- Electrode/EDM programming (sinker, wire)

**Output:** Strategy knowledge records + parameter recommendation engine + platform-specific workflow guides

## Domain 3: SHOP (Machining Practices)

**What PRISM learns from machining practice videos:**

### Setup & Workholding
- Vise setup (tramming, jaw types, soft jaws, step jaws)
- Chuck types and selection (3-jaw, 4-jaw, collet, ER, 5C, scroll)
- Fixture design (modular, custom, tombstone, trunnion)
- Part location strategies (datums, stop pins, edge finders)
- Zero-setting methods (tool touch-off, probing, electronic edge finder)
- Multi-op setup strategies (op1/op2 flip, indexing, transfer machining)

### Cutting Practices
- Feeds and speeds rationale (not just the numbers — WHY those numbers)
- Chip load targets per material and operation
- Climb vs conventional milling — when and why
- Chip management (chip fans, coolant-through, air blast, conveyor)
- Coolant strategies (flood, mist, MQL, dry, coolant-through-tool, high pressure)
- Tool engagement strategies (arc-in, ramp, helix, pre-drill)
- Surface finish optimization (speed, feed, nose radius, wiper inserts)
- Tool deflection management (short stickout, reduced DOC, spring passes)

### Tool Management
- Tool selection rationale from experienced machinists
- Insert grade selection (when to use coated vs uncoated, CVD vs PVD)
- Tool life management (wear patterns, when to change, visual inspection)
- Tool measurement (presetter, touch-off, laser measurement)
- Toolholder selection (shrink-fit, hydraulic, ER collet, weldon, CAT, BT, HSK)

### Troubleshooting
- Chatter diagnosis and remediation (speed change, DOC change, damping)
- Built-up edge (BUE) solutions
- Poor surface finish diagnosis
- Dimension drift troubleshooting
- Tool breakage root cause analysis
- Thermal growth compensation
- Workpiece deflection solutions

### Materials-Specific Knowledge
- Aluminum machining tips (sticky, gummy grades, high-silicon)
- Steel machining by grade (1018 vs 4140 vs 4340 vs D2 vs S7)
- Stainless steel challenges (work hardening, heat management)
- Titanium machining (low speed, high feed, constant engagement)
- Inconel/superalloy machining (ceramic inserts, low speed)
- Plastics machining (sharp tools, single flute, chip evacuation)
- Brass/copper machining (zero-rake, high speed)
- Cast iron (gray vs ductile, dust management)

### Machine-Specific Knowledge
- HAAS-specific tips (settings, macros, probing cycles)
- Okuma-specific (THINC, OSP controls, collision avoidance)
- FANUC conversational programming
- Siemens ShopMill/ShopTurn
- Mazak Mazatrol programming
- Machine maintenance (way oil, spindle warmup, ballscrew compensation)

**Output:** Searchable practice knowledge base + contextual advice engine + troubleshooting decision trees

---

# 3. PROBLEM STATEMENT

## The Full Gap

```
TODAY:
  Operator asks: "I need to machine a bearing block, 6061-T6, on my HAAS VF-2"
  PRISM says:    "Here are cutting parameters for 6061-T6..."
  Operator:      *draws part themselves*
                 *figures out CAM strategy themselves*
                 *figures out workholding themselves*
                 *troubleshoots chatter themselves*

AFTER PHASE CC:
  Operator asks: "I need to machine a bearing block, 6061-T6, on my HAAS VF-2"
  PRISM says:
  
  [CAD] "Here's the parametric STEP file — 25mm bore, 4x M8 bolt pattern,
         8mm walls validated for 6061-T6."
  
  [CAM] "Recommended strategy: Adaptive clearing with 12mm 3FL endmill at
         25% stepover, 8200 RPM, 2400mm/min. Then contour finish with
         same tool at 10000 RPM, 3000mm/min, 0.1mm stock. I learned this
         approach from 23 similar parts across Mastercam and Fusion 360.
         In your CAM software (Mastercam), this is: Toolpaths → 2D → 
         Dynamic Mill → [these parameters]."
  
  [SHOP] "Hold in a Kurt D688 vise with 0.75" parallels. Indicate off
          the fixed jaw. Touch off Z on top face. For the bore, I'd
          recommend a 25mm U-drill rather than interpolating — it's
          faster and holds better tolerance. Watch for chip packing in
          the bolt hole drilling — peck at 3x diameter. This is similar
          to the approach Edge Precision used in their bearing housing
          video [source link]."
```

## The YouTube Knowledge Problem (Expanded)

There are **hundreds of thousands** of manufacturing tutorial videos on YouTube spanning:
- **CAD modeling tutorials** — how to design parts in every CAD package
- **CAM programming tutorials** — how to program toolpaths in every CAM package  
- **Machining practice videos** — how experienced machinists actually make parts
- **Tooling application videos** — manufacturer guidance on tool selection and use
- **Machine-specific tutorials** — OEM and user guides for specific CNC controllers
- **Troubleshooting videos** — diagnosing and fixing machining problems

This knowledge is:
- **Trapped in video format** — not searchable, not queryable, not machine-readable
- **Platform-specific** — a Mastercam tutorial doesn't help a Fusion 360 user
- **Unvalidated** — many tutorials use unsafe or suboptimal cutting parameters
- **Ephemeral** — operators watch, forget, re-watch; no institutional retention
- **Scattered across domains** — CAD in one video, CAM in another, shop tips in a third
- **Experience-dependent** — a beginner can't evaluate whether advice is good or bad

Phase CC turns ALL of that video knowledge into **structured, validated, persistent, cross-platform, cross-domain manufacturing intelligence** that PRISM loads into memory every session and compounds over time.

---

# 4. ARCHITECTURE

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       VIDEO INGESTION LAYER                              │
│                                                                          │
│  YouTube URL ──→ yt-dlp ──→ Transcript (SRT/VTT + cleaned text)        │
│                    │                                                     │
│                    ├──→ ffmpeg ──→ Keyframes (PNG, scene-change detect)  │
│                    │                  │                                   │
│                    │                  ├──→ Tesseract OCR (UI text, dims) │
│                    │                  │                                   │
│                    │                  └──→ Vision Analysis (Opus API)    │
│                    │                       ├─ CAD: what operation?       │
│                    │                       ├─ CAM: what strategy/params? │
│                    │                       └─ SHOP: what setup/practice? │
│                    │                                                     │
│                    └──→ Metadata (title, channel, tags, description)     │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE EXTRACTION ENGINE                            │
│                                                                          │
│  Domain Classifier ──→ Which domain(s) does this video cover?           │
│  ├── CAD content? ──→ CAD extraction pipeline                           │
│  ├── CAM content? ──→ CAM extraction pipeline                           │
│  └── SHOP content? ──→ Machining practice extraction pipeline           │
│       (videos can trigger MULTIPLE pipelines)                            │
│                                                                          │
│  CAD Pipeline:   Feature tree + dimensions + design rationale           │
│  CAM Pipeline:   Strategy + parameters + tool selection + sequencing    │
│  SHOP Pipeline:  Setup + practices + troubleshooting + material tips    │
│                                                                          │
│  ALL → Platform detection + confidence scoring + provenance tracking    │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  CAD GENERATOR   │ │  CAM KNOWLEDGE   │ │  SHOP KNOWLEDGE  │
│                  │ │                  │ │                  │
│  Feature Tree    │ │  Strategy DB     │ │  Practice DB     │
│  → CadQuery      │ │  Parameter DB    │ │  Setup DB        │
│  → STEP/DXF/STL  │ │  Sequence DB     │ │  Troubleshoot DB │
│  → Parametric .py│ │  Platform Map    │ │  Material Tips   │
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
         │                    │                     │
         └────────────────────┼─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      VALIDATION BRIDGE                                    │
│                                                                          │
│  prism_calc ◄──── Cutting parameters vs Kienzle model                   │
│  prism_data ◄──── Material properties vs recommendations                │
│  prism_validate ◄─ Safety gate S(x)≥0.70                               │
│  Machine DB ◄──── Work envelope + spindle speed limits                  │
│  Tool DB ◄─────── Tool geometry vs feature requirements                 │
│  Alarm DB ◄────── Error code cross-reference for troubleshooting        │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   PERSISTENT MEMORY SYSTEM                               │
│                       (with boot integration)                            │
│                                                                          │
│  C:\PRISM\state\cad\                                                    │
│  ├── recipes/        ← CAD: Complete part parametric code               │
│  ├── primitives/     ← CAD: Reusable feature patterns                  │
│  ├── strategies/     ← CAM: Toolpath strategy knowledge                │
│  ├── sequences/      ← CAM: Multi-operation sequences                  │
│  ├── practices/      ← SHOP: Machining practice records                │
│  ├── setups/         ← SHOP: Workholding/fixturing knowledge           │
│  ├── troubleshoot/   ← SHOP: Problem → diagnosis → solution trees      │
│  ├── material_tips/  ← SHOP: Per-material machining wisdom             │
│  ├── machine_tips/   ← SHOP: Per-machine/controller knowledge          │
│  ├── rules/          ← ALL: Design/process constraints learned         │
│  ├── platform_map/   ← CAM: Cross-platform equivalencies              │
│  ├── provenance/     ← ALL: Source tracking per knowledge entry        │
│  ├── memory.db       ← SQLite FTS5 search index                       │
│  ├── boot_manifest.json ← What to load at session start               │
│  └── learning_log.jsonl ← Append-only audit trail                     │
│                                                                          │
│  SESSION BOOT: prism_cad→memory_boot loads:                            │
│  ├── memory index (always)                                              │
│  ├── high-confidence knowledge summary (top N per domain)               │
│  ├── recent learning log (last 50 entries)                              │
│  └── active project context (if operator has set one)                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Technology | Justification |
|-----------|------------|---------------|
| CAD Kernel | CadQuery 2.x (Python, on OpenCascade) | Parametric modeling via code; STEP/DXF/STL/IGES export |
| Video Transcripts | yt-dlp + YouTube auto-captions | Best-in-class YouTube extraction |
| Fallback Transcription | OpenAI Whisper | When auto-captions unavailable |
| Frame Extraction | ffmpeg | Scene change detection; configurable FPS |
| OCR | Tesseract 5.x | Open source; good on UI screenshots with preprocessing |
| Vision Analysis | Anthropic API (Opus) | Frame interpretation beyond OCR — understands what's happening visually |
| Knowledge Extraction | Anthropic API (Sonnet bulk, Opus complex) | Structured extraction from transcript + frames + vision |
| Geometry Validation | Open3D / trimesh (Python) | Manifold checks, volume computation |
| Storage | JSON + Python files + SQLite FTS5 | Consistent with PRISM state management |
| Boot Integration | prism_cad→memory_boot action | Automatic loading at session start |

---

# 5. MILESTONE DEFINITIONS

---

## CC-PRE: Pre-Work — Bridge, Legal Framework, Safety Architecture (3-4 sessions)

> **Added by scrutiny review.** These 7 requirements MUST be complete before CC-MS0 begins. They address the 3 CRITICAL findings from the Phase CC scrutiny pass.

**Duration:** 3-4 sessions (~9-12 hours)
**Model:** Opus (architecture) + Sonnet (implementation)
**Role:** Platform Architect

### CC-PRE-1: Python/TypeScript Bridge Architecture
- Design process communication protocol using execFileNoThrow for safe cross-language communication
- JSON IPC over stdin/stdout (no shell injection surface)
- Configurable timeouts: 30s default, 120s for vision analysis
- Max 3 concurrent Python processes (process pool manager)
- Define error propagation: Python exceptions → TypeScript error objects with stack traces
- **Deliverable:** `src/bridges/python-bridge.ts` (~200 lines) + bridge design doc

### CC-PRE-2: Python Process Pool Manager
- Implement warm pool of Python interpreters (pre-loaded CadQuery, yt-dlp)
- Health check heartbeat (5s interval)
- Graceful shutdown with 10s kill timeout
- Memory limit per process: 512MB
- **Deliverable:** `src/bridges/python-pool.ts` (~150 lines)

### CC-PRE-3: Bridge Integration Tests
- Round-trip latency tests (target < 100ms for simple calls)
- Concurrent load tests (3 simultaneous processes)
- Error propagation tests (Python crash → clean TS error)
- Timeout tests (verify 30s/120s limits work)
- **Deliverable:** `src/bridges/__tests__/python-bridge.test.ts` (~150 lines, ≥15 tests)

### CC-PRE-4: YouTube Legal Framework
- Creator whitelist mechanism (opt-in list of approved channels)
- Attribution system (source channel, video title, timestamp, URL)
- Content consent verification (check channel Terms of Service)
- Automated DMCA takedown compliance workflow
- Fair use documentation per extraction
- **Deliverable:** `src/engines/legal-framework.ts` (~120 lines) + legal policy doc

### CC-PRE-5: Multi-Parameter Compound Safety Architecture
- Design Level 1-4 safety validation chain:
  - L1: Single parameter (existing S(x) ≥ 0.70)
  - L2: Parameter pairs (speed+feed, depth+width)
  - L3: Full cut sets (speed+feed+depth+width+material+tool)
  - L4: Process chains (roughing→finishing→deburring)
- Integration points with existing prism_safety dispatcher
- **Deliverable:** `src/engines/compound-safety.ts` (~250 lines) + safety architecture doc

### CC-PRE-6: Vision API Cost Model + Budget Controls
- Per-video cost estimate: ~$0.48 (15 key frames × $0.032/frame)
- Monthly budget cap: $500 (Phase CC video analysis)
- Cost tracking in `state/CC/vision-costs.json`
- Auto-pause ingestion when 80% budget reached
- **Deliverable:** Cost tracking integration in bridge config

### CC-PRE-7: Phase CC Test Harness Setup
- Vitest configuration for Python bridge tests
- Mock Python subprocess for unit tests
- Test fixtures: sample video metadata, extraction results
- **Deliverable:** Test infrastructure in `src/bridges/__tests__/`

### CC-PRE Exit Conditions
- [ ] Python bridge passes all integration tests (≥15 tests passing)
- [ ] Legal framework documented and implemented
- [ ] Safety architecture designed and Level 1-2 implemented
- [ ] Vision cost tracking operational
- [ ] `npm run build` passes clean with new bridge code

---

## CC-MS0: Foundation — CadQuery Integration + CAD Kernel
**Duration:** 2 sessions (~6 hours)
**Model:** Sonnet (implementation) → Opus (architecture review)
**Role:** Platform Engineer
**Execution:** CC 80% / MCP 20%

### Entry Conditions
- [ ] P0 complete (32 dispatchers operational, verified)
- [ ] R1-MS4 complete (registries loaded — 14 registries, 29,569 entries)
- [ ] Python 3.10+ available on DIGITALSTORM-PC
- [ ] `npm run build` passes clean

### Steps

| # | Task | Tool | Time |
|---|------|------|------|
| 1 | Install CadQuery 2.x + dependencies (OCP, build123d as alt) | CC: pip install | 15min |
| 2 | Create `C:\PRISM\cad-engine\` directory structure | CC: mkdir | 5min |
| 3 | Build CadQuery wrapper module (`cad_kernel.py`) with standardized API: `create_sketch()`, `extrude()`, `revolve()`, `fillet()`, `chamfer()`, `hole()`, `pattern()`, `shell()`, `export()` | CC: write | 2hr |
| 4 | Build geometry validator module (`geo_validator.py`): manifold check, volume computation, bounding box, minimum wall thickness detection | CC: write | 1.5hr |
| 5 | Build export module (`cad_export.py`): STEP, DXF, STL, IGES with configurable tolerances | CC: write | 45min |
| 6 | Test harness: generate 10 reference parts (cube, cylinder, flanged plate, bracket, bearing block, shaft collar, gusset, spacer, bushing, manifold block) | CC: write + run | 1hr |
| 7 | Architecture review: API surface matches planned dispatcher actions | MCP: Opus review | 30min |

### Exit Conditions
- [ ] CadQuery generates valid STEP files for all 10 reference parts
- [ ] Geometry validator detects intentional defects (non-manifold, thin wall, zero volume)
- [ ] Export module produces valid files in all 4 formats
- [ ] API surface documented in `C:\PRISM\cad-engine\API.md`

---

## CC-MS1: Video Ingestion Pipeline + Vision Analysis
**Duration:** 3 sessions (~9 hours)
**Model:** Sonnet (implementation) → Opus (vision prompt engineering)
**Role:** Data Engineer
**Execution:** CC 70% / MCP 30%

### Entry Conditions
- [ ] CC-MS0 complete
- [ ] yt-dlp, ffmpeg, Tesseract OCR installed and functional
- [ ] Anthropic API key configured for vision calls

### Steps

| # | Task | Tool | Time |
|---|------|------|------|
| 1 | Build transcript extractor (`video_ingest.py`): URL → SRT/VTT → cleaned plaintext with timestamps | CC: write | 1hr |
| 2 | Build frame sampler (`frame_extract.py`): scene change detection via ffmpeg, configurable min interval (default 2s), output PNG with timestamp metadata | CC: write | 1hr |
| 3 | Build OCR pipeline (`ui_ocr.py`): frame → preprocessed (contrast, denoise, crop to UI regions) → Tesseract → structured text (menu items, dimension values, parameter fields) | CC: write | 1.5hr |
| 4 | **BUILD VISION ANALYSIS PIPELINE (`vision_analyze.py`)**: send keyframes to Opus API with domain-specific prompts. Three analysis modes: | MCP: Opus prompt engineering + CC: write | 3hr |
| | **CAD mode:** "What modeling operation is shown? What are the visible dimensions? What feature is being created?" | | |
| | **CAM mode:** "What toolpath strategy is displayed? What parameters are visible in the dialog? What tool is selected?" | | |
| | **SHOP mode:** "What setup/workholding is shown? What machine? What operation is happening? Any visible issues?" | | |
| 5 | Build domain classifier (`domain_classify.py`): analyze title + first 60s transcript + first 10 frames → classify as CAD, CAM, SHOP, or multiple. Examples: "Mastercam Dynamic Milling Tutorial" → CAM. "Making a Bearing Block from Start to Finish" → CAD + CAM + SHOP. | CC: write | 1hr |
| 6 | Build platform detector (`platform_detect.py`): identify software + version from frames and transcript | CC: write | 30min |
| 7 | Integration test: process 8 real YouTube tutorials (covering all 3 domains) end-to-end | CC: run + validate | 1hr |

### Vision Analysis — Why This Matters

Many tutorial creators show critical information **without speaking it:**
- A Mastercam dialog showing stepover = 0.030" — never mentioned verbally
- A machinist indicating off a vise jaw — shown for 3 seconds, never explained
- A tool assembly being put together — the viewer is expected to see the holder type
- A HAAS control screen showing G54 offset values — flashed briefly
- Chatter visible on a part surface — experienced machinists recognize it visually

**OCR alone catches text in frames. Vision analysis catches MEANING in frames.**

The Opus vision prompt structure:

```
System: You are an expert manufacturing engineer analyzing a CNC machining
tutorial video frame. Extract all visible manufacturing knowledge.

Frame Analysis Request:
- What CAD/CAM software is shown? (if applicable)
- What operation or action is being performed?
- What numerical values are visible? (dimensions, feeds, speeds, offsets)
- What tooling is visible? (type, size, holder, coating if identifiable)
- What workholding is shown? (vise type, chuck, fixture, parallels)
- What machine is shown? (make, model, controller if visible)
- What material is being machined? (chip color, surface finish, coolant behavior)
- Are there any visible issues? (chatter marks, tool wear, chip packing, poor finish)
- What is the skill level of the content? (beginner/intermediate/advanced)
- Confidence score for each observation (0-1)
```

### Exit Conditions
- [ ] Pipeline processes a YouTube URL → produces: transcript.json, frames/*.png, ocr_results.json, vision_analysis.json, domain_classification.json, platform_id.json, metadata.json
- [ ] 8 real tutorial videos processed (at least 2 per domain)
- [ ] Vision analysis extracts information not present in transcript for at least 5/8 videos
- [ ] Domain classifier correctly categorizes all 8 test videos
- [ ] Processing time < 8 minutes per 15-minute video (vision calls add time)

### Output Directory Structure
```
C:\PRISM\state\cad\ingest\{video_id}\
├── metadata.json          # Title, channel, duration, URL
├── domain_class.json      # CAD / CAM / SHOP / multi
├── platform_id.json       # Detected software + version + confidence
├── transcript.json        # Timestamped text segments
├── frames/                # Keyframes as PNG
│   ├── frame_0012.png
│   └── ...
├── ocr_results.json       # Per-frame OCR output
├── vision_analysis.json   # Per-frame Opus vision interpretation
└── processing_log.json    # Timing, errors, fallbacks, costs
```

---

## CC-MS2: Knowledge Extraction Engine (All Three Domains)
**Duration:** 3 sessions (~9 hours)
**Model:** Opus (prompt engineering + schema design) → Sonnet (implementation)
**Role:** Knowledge Engineer
**Execution:** CC 50% / MCP 50%

### Entry Conditions
- [ ] CC-MS1 complete (ingestion pipeline with vision analysis functional)
- [ ] Anthropic API key configured for structured extraction calls
- [ ] At least 8 ingested video datasets available (mixed domains)

### Steps

| # | Task | Tool | Time |
|---|------|------|------|
| 1 | Design universal knowledge schema covering ALL THREE DOMAINS | MCP: Opus architecture | 2hr |
| 2 | Build CAD extraction prompts (P0 platforms): SolidWorks, Fusion 360, AutoCAD | MCP: Opus prompt engineering | 1.5hr |
| 3 | Build CAM extraction prompts (P0 platforms): Mastercam, Fusion 360 CAM, SolidWorks CAM | MCP: Opus prompt engineering | 1.5hr |
| 4 | Build SHOP extraction prompts: setup/fixturing, cutting practices, tool management, troubleshooting, material-specific tips, machine-specific tips | MCP: Opus prompt engineering | 2hr |
| 5 | Build extraction orchestrator (`knowledge_extract.py`): loads ingested data → classifies domain → selects prompts → merges transcript + OCR + vision analysis → calls API → validates → stores | CC: write | 1.5hr |
| 6 | Build extraction validators per domain: CAD (feature tree logic), CAM (parameter sanity), SHOP (practice consistency) | CC: write | 1hr |
| 7 | Test on 8 ingested videos, compare extracted knowledge to manual review across all domains | CC + MCP: validate | 1hr |

### Universal Knowledge Schema (v2 — Three Domains)

```json
{
  "schema_version": "2.0",
  "source": {
    "video_id": "abc123",
    "url": "https://youtube.com/watch?v=...",
    "title": "Machining a Bearing Block — Complete Guide",
    "channel": "Titans of CNC",
    "domains": ["CAD", "CAM", "SHOP"],
    "platform": "Mastercam 2025",
    "extraction_confidence": 0.87,
    "vision_contribution": 0.34
  },

  "cad_knowledge": {
    "part_description": {
      "name": "Bearing Block",
      "category": "fixture_component",
      "material_mentioned": "6061-T6 Aluminum",
      "material_prism_id": "AL-6061-T6",
      "overall_dimensions": { "x": 100, "y": 75, "z": 50, "unit": "mm" }
    },
    "feature_tree": [
      {
        "order": 1,
        "operation": "extrude",
        "description": "Base block from rectangle sketch",
        "dimensions": { "width": 100, "height": 75, "depth": 50 },
        "timestamp": "02:14",
        "confidence": 0.92,
        "source": "transcript+vision"
      }
    ],
    "design_rationale": [
      "Wall thickness 8mm chosen for rigidity under clamping forces",
      "Bolt pattern at 60mm PCD to clear the bore and provide even clamping"
    ]
  },

  "cam_knowledge": {
    "operations": [
      {
        "order": 1,
        "strategy": "dynamic_mill",
        "prism_canonical": "trochoidal_roughing",
        "description": "Rough out the external profile",
        "tool": {
          "type": "endmill",
          "diameter": 12,
          "flutes": 3,
          "material": "carbide",
          "coating": "AlTiN",
          "selection_rationale": "3-flute for aluminum chip evacuation"
        },
        "parameters": {
          "rpm": 8000,
          "feed_mmpm": 2500,
          "stepover_pct": 25,
          "doc_mm": 25,
          "coolant": "flood",
          "engagement_angle": 40
        },
        "parameter_rationale": {
          "rpm": "Calculated for 300 SFM in 6061",
          "stepover": "25% for dynamic milling — maintains constant chip load",
          "doc": "Full depth — dynamic mill controls engagement radially"
        },
        "timestamp": "08:30",
        "confidence": 0.88,
        "prism_validation": null
      }
    ],
    "operation_sequence_rationale": "Rough all features first with dynamic, then bore, then finish contour. Roughing first prevents thin-wall chatter during finishing.",
    "post_processor": "HAAS NGC",
    "simulation_shown": true
  },

  "shop_knowledge": {
    "setup": {
      "workholding": {
        "type": "machining_vise",
        "brand": "Kurt D688",
        "jaw_type": "hardened steel",
        "parallels": true,
        "parallel_height": 0.75,
        "parallel_unit": "inches",
        "clamping_notes": "Part sits on parallels, 0.5\" in jaw, tap down with dead blow",
        "timestamp": "01:15",
        "confidence": 0.85,
        "source": "vision"
      },
      "wcs": {
        "method": "edge_finder",
        "x_reference": "left side of part",
        "y_reference": "fixed jaw face",
        "z_reference": "top of part",
        "offset": "G54",
        "timestamp": "03:20"
      },
      "number_of_setups": 1,
      "setup_notes": "Single setup — all features accessible from top"
    },
    "cutting_practices": [
      {
        "topic": "chip_management",
        "observation": "Using air blast during drilling to prevent chip packing",
        "applies_to": "drilling aluminum",
        "timestamp": "12:45",
        "confidence": 0.80,
        "source": "vision+transcript"
      },
      {
        "topic": "coolant_strategy",
        "observation": "Flood coolant for roughing, mist for finishing to see the cut",
        "applies_to": "aluminum_general",
        "timestamp": "14:20",
        "confidence": 0.75,
        "source": "transcript"
      }
    ],
    "troubleshooting": [
      {
        "problem": "Slight chatter on deep pocket wall",
        "diagnosis": "Tool deflection — 12mm endmill at 4xD stickout",
        "solution": "Reduced DOC to 15mm and added a semi-finish pass",
        "timestamp": "18:30",
        "confidence": 0.90,
        "source": "transcript+vision"
      }
    ],
    "material_tips": [
      {
        "material": "6061-T6",
        "tip": "Keep feeds high to avoid rubbing — aluminum sticks to slow-moving tools",
        "confidence": 0.85
      }
    ],
    "machine_specific": {
      "machine": "HAAS VF-2",
      "tips": [
        "Setting 191 (smoothing) set to medium for better surface finish on contours"
      ]
    }
  }
}
```

### Exit Conditions
- [ ] Universal schema v2 covers all three domains
- [ ] Extraction prompts produce structured output for all three domains with >80% accuracy
- [ ] Vision analysis data integrated into extraction (fills gaps transcript missed)
- [ ] Cross-domain linking works (CAD features reference CAM operations that reference SHOP practices)

---

## CC-MS3: Parametric Code Generator (CAD — DRAW)
**Duration:** 2 sessions (~6 hours)
**Model:** Sonnet (implementation) → Opus (edge case review)
**Role:** CAD Engineer
**Execution:** CC 70% / MCP 30%

### Entry Conditions
- [ ] CC-MS0 complete (CadQuery kernel functional)
- [ ] CC-MS2 complete (knowledge extraction produces feature trees)

### Steps

| # | Task | Tool | Time |
|---|------|------|------|
| 1 | Build feature-to-CadQuery translator (`feature_translator.py`): maps each operation type to CadQuery API calls | CC: write | 2hr |
| 2 | Build parametric template generator: dimensions become named parameters with types, ranges, units | CC: write | 1hr |
| 3 | Build code assembler (`code_gen.py`): assembled operations → complete CadQuery script with imports, parameter block, feature sequence, export calls, provenance header | CC: write | 1hr |
| 4 | Build code validator: generated script must parse, execute, produce non-zero-volume geometry, pass manifold check | CC: write | 45min |
| 5 | Test: generate CadQuery code from 3 extracted feature trees, compare output geometry to reference | CC + MCP: validate | 45min |
| 6 | Edge case handling: revolved features, patterns, mirror, multi-body, assemblies | MCP: Opus design | 30min |

### Exit Conditions
- [ ] Feature translator handles all operations in the universal schema
- [ ] Generated code executes and produces valid geometry for 3+ test parts
- [ ] All dimensions parameterized (zero hardcoded values)
- [ ] Provenance header links back to source video

---

## CC-MS4: Feature Primitive Library (CAD — LEARN)
**Duration:** 2 sessions (~6 hours)
**Model:** Opus (pattern recognition) → Sonnet (implementation)
**Role:** Knowledge Architect
**Execution:** CC 50% / MCP 50%

### Entry Conditions
- [ ] CC-MS2 complete (extraction engine functional)
- [ ] CC-MS3 complete (code generator functional)
- [ ] At least 10 CAD-domain videos ingested and extracted

### Steps

| # | Task | Tool | Time |
|---|------|------|------|
| 1 | Design primitive abstraction framework: detect recurring patterns across extracted feature trees | MCP: Opus | 1.5hr |
| 2 | Build pattern detector (`pattern_detect.py`): cluster similar feature sub-sequences across N extractions | CC: write | 2hr |
| 3 | Build primitive generator (`primitive_gen.py`): cluster → parameterized CadQuery function with documented params and ranges | CC: write | 1.5hr |
| 4 | Seed library with 20 foundational primitives (bolt_circle, o_ring_groove, keyway, counterbore, countersink, tapped_hole, shoulder, step, pocket, slot, boss, rib, gusset, fillet_break, chamfer_break, draft_wall, shell, thread_relief, undercut, dovetail) | CC: write | 1hr |

### Exit Conditions
- [ ] 20 foundational primitives authored and tested
- [ ] Pattern detector identifies recurring patterns from 10+ videos
- [ ] Primitives are searchable by tag, parameter, process, tool requirement

---

## CC-MS5: CAM Strategy Learning Engine (CAM — LEARN)
**Duration:** 2 sessions (~6 hours)
**Model:** Opus (strategy evaluation + safety) → Sonnet (implementation)
**Role:** Manufacturing Engineer
**Execution:** MCP 60% / CC 40% (parameter safety is MCP-dominant)

### Entry Conditions
- [ ] CC-MS2 complete (CAM extraction produces strategy records)
- [ ] prism_calc operational
- [ ] Tool database loaded (13,967 tools)

### Steps

| # | Task | Tool | Time |
|---|------|------|------|
| 1 | Build CAM strategy database schema + storage (`strategies/`): one record per strategy-material-machine combination, with parameter ranges learned from multiple videos | CC: write | 1.5hr |
| 2 | Build strategy aggregator (`strategy_aggregate.py`): when multiple videos teach the same strategy for the same material, combine into consensus parameters with confidence bands (mean, min, max, stddev across sources) | CC: write | 1.5hr |
| 3 | Build strategy recommender (`strategy_recommend.py`): given part features + material + machine → recommend ranked strategies with parameter sets, rationale from source videos, and PRISM validation status | CC: write + MCP: validate | 1.5hr |
| 4 | Build tool selection knowledge base (`tool_select_kb.py`): learned rationale for tool choices (when 3FL vs 4FL, when indexable vs solid, when rougher vs finisher), stored per material/operation | CC: write | 1hr |
| 5 | Build operation sequencing learner: from extracted multi-operation videos, learn sequencing patterns (rough before finish, face before profile, drill before bore, etc.) with rationale | CC: write | 30min |

### CAM Strategy Record Structure
```json
{
  "strategy_id": "trochoidal_rough_aluminum_6061",
  "prism_canonical": "trochoidal_roughing",
  "material_family": "aluminum_wrought",
  "specific_materials": ["6061-T6", "7075-T6", "6082-T6"],
  "machine_types": ["3axis_vertical", "5axis"],
  
  "parameter_consensus": {
    "rpm": { "mean": 8500, "min": 6000, "max": 12000, "stddev": 1500, "sources": 23 },
    "feed_mmpm": { "mean": 2800, "min": 1500, "max": 4500, "stddev": 800, "sources": 23 },
    "stepover_pct": { "mean": 22, "min": 10, "max": 35, "stddev": 6, "sources": 23 },
    "doc_mm": { "mean": 20, "min": 8, "max": 50, "stddev": 10, "sources": 18 },
    "engagement_angle": { "mean": 42, "min": 25, "max": 60, "stddev": 8, "sources": 12 }
  },
  
  "tool_consensus": {
    "type": "endmill_solid_carbide",
    "flutes": { "most_common": 3, "alternatives": [2] },
    "coating": { "most_common": "ZrN", "alternatives": ["AlTiN", "uncoated"] },
    "diameter_range_mm": [6, 20],
    "selection_rationale": "3-flute preferred for chip evacuation in aluminum; 2-flute for deep pockets"
  },
  
  "when_to_use": [
    "Deep pockets where conventional pocketing would cause tool deflection",
    "Hard materials where reduced engagement extends tool life",
    "High material removal rate needed with modest tool diameter"
  ],
  
  "when_NOT_to_use": [
    "Thin-wall parts where vibration from entry/exit matters",
    "Very shallow features where conventional is faster",
    "Parts requiring specific corner geometry (trochoidal leaves scallops)"
  ],
  
  "source_videos": ["abc123", "def456", "ghi789"],
  "prism_validated": true,
  "safety_score_range": [0.72, 0.91]
}
```

### Exit Conditions
- [ ] Strategy database populated from extracted CAM videos
- [ ] Aggregator combines multi-source parameters into consensus ranges
- [ ] Recommender returns ranked strategies with rationale for test cases
- [ ] Tool selection KB captures rationale (not just "what" but "why")
- [ ] ALL stored parameters validated against prism_calc

---

## CC-MS6: Machining Practice Knowledge Base (SHOP — LEARN)
**Duration:** 2 sessions (~6 hours)
**Model:** Opus (practice evaluation + safety review) → Sonnet (implementation)
**Role:** Master Machinist (virtual)
**Execution:** MCP 60% / CC 40% (safety review is MCP-dominant)

### Entry Conditions
- [ ] CC-MS2 complete (SHOP extraction produces practice records)
- [ ] Machine database loaded (1,016 machines)
- [ ] Alarm code database loaded (10,033 codes)

### Steps

| # | Task | Tool | Time |
|---|------|------|------|
| 1 | Build practice knowledge base schema + storage for ALL practice categories: | CC: write | 2hr |
| | **Setup & Workholding:** vise setups, chuck setups, fixture designs, part location methods, zero-setting procedures, multi-op strategies | | |
| | **Cutting Practices:** feed/speed rationale, climb vs conventional, chip management, coolant strategies, tool engagement methods, surface finish optimization, deflection management | | |
| | **Tool Management:** selection rationale, insert grade selection, tool life patterns, measurement methods, holder selection | | |
| | **Troubleshooting:** chatter → solutions, BUE → solutions, poor finish → solutions, dimension drift → solutions, tool breakage → root causes | | |
| | **Material Tips:** per-material machining wisdom collected from experienced machinists | | |
| | **Machine Tips:** per-machine/controller specific knowledge, settings, macros, features | | |
| 2 | Build practice aggregator (`practice_aggregate.py`): when multiple machinists address the same topic, synthesize into weighted consensus (weight by channel authority, view count, like ratio) | CC: write | 1hr |
| 3 | Build troubleshooting decision tree generator (`trouble_tree.py`): from extracted troubleshooting knowledge, build navigable decision trees (symptom → possible causes → diagnostic steps → solutions) | CC: write | 1.5hr |
| 4 | Build material tips consolidator: per-material, aggregate all machining tips from all sources into ranked lists | CC: write | 30min |
| 5 | Safety review: ensure no stored practice contradicts physics or creates unsafe conditions. Cross-reference against prism_calc and known alarm conditions | MCP: Opus (SAFETY) | 1hr |

### Practice Record Structure
```json
{
  "practice_id": "setup_vise_aluminum_3axis",
  "category": "setup_workholding",
  "subcategory": "vise_setup",
  "applies_to": {
    "materials": ["aluminum_wrought"],
    "machines": ["3axis_vertical"],
    "operations": ["milling_general", "pocketing", "profiling"]
  },
  
  "knowledge": {
    "workholding": "Kurt-style 6\" vise, hardened jaws, 0.75\" parallels",
    "procedure": [
      "Indicate fixed jaw with DTI — should be within 0.0005\" over travel",
      "Place parallels, set part on parallels with 0.5\" minimum in jaws",
      "Tighten vise finger-tight, tap part down with dead blow hammer",
      "Verify part is seated on parallels (try to slide parallels — should be trapped)",
      "Final tighten — do not overtighten aluminum (will deform)"
    ],
    "wcs_setup": "Edge find X off left side, Y off fixed jaw, Z off top of part → G54",
    "tips": [
      "For thin parts, use soft jaws machined to part profile",
      "For second ops, use step jaws to locate off first-op features",
      "Always deburr first-op edges before second setup to ensure seating"
    ],
    "common_mistakes": [
      "Part not seated on parallels (will be 0.001-0.003 high)",
      "Overtightening vise on aluminum (part deforms, dimensions off)",
      "Not indicating jaw before each session (thermal drift)"
    ]
  },
  
  "sources": [
    { "video_id": "abc123", "channel": "Titans of CNC", "confidence": 0.92 },
    { "video_id": "def456", "channel": "NYC CNC", "confidence": 0.88 }
  ],
  "consensus_strength": 0.90,
  "prism_safety_validated": true
}
```

### Troubleshooting Decision Tree Structure
```json
{
  "tree_id": "chatter_diagnosis",
  "symptom": "Visible chatter marks on machined surface, audible vibration during cut",
  "nodes": [
    {
      "id": "root",
      "question": "When does chatter occur?",
      "options": [
        { "answer": "During roughing", "next": "rough_chatter" },
        { "answer": "During finishing", "next": "finish_chatter" },
        { "answer": "Only at certain depths", "next": "resonance_chatter" }
      ]
    },
    {
      "id": "rough_chatter",
      "question": "What is your tool stickout relative to diameter?",
      "options": [
        { "answer": "> 4:1 L/D ratio", "next": "deflection_solution" },
        { "answer": "< 4:1 L/D ratio", "next": "engagement_solution" }
      ]
    },
    {
      "id": "deflection_solution",
      "solution": "Reduce stickout. If not possible: reduce DOC by 50%, increase stepover to maintain MRR, add semi-finish pass. Consider stub-length or reinforced endmill.",
      "sources": ["abc123", "def456"],
      "confidence": 0.92
    },
    {
      "id": "engagement_solution",
      "solution": "Reduce radial engagement (stepover). Try trochoidal/dynamic toolpath. Change RPM ±10-15% to move away from resonance. Check spindle hours — worn bearings cause chatter.",
      "sources": ["ghi789"],
      "confidence": 0.85
    }
  ]
}
```

### Exit Conditions
- [ ] All 6 practice categories populated from extracted videos
- [ ] Aggregator produces weighted consensus across multiple machinists
- [ ] At least 5 troubleshooting decision trees built
- [ ] Material tips consolidated for P0 materials (aluminum, steel, stainless)
- [ ] Safety review: zero unsafe practices stored
- [ ] All practice records have provenance and confidence scores

---

## CC-MS7: Persistent Memory System + Boot Integration (RETAIN)
**Duration:** 2 sessions (~6 hours)
**Model:** Opus (architecture) → Sonnet (implementation)
**Role:** Systems Architect
**Execution:** CC 60% / MCP 40%

### Entry Conditions
- [ ] CC-MS2 through CC-MS6 complete (all three domains have stored knowledge)
- [ ] PRISM session boot sequence documented (prism_dev→session_boot)

### Steps

| # | Task | Tool | Time |
|---|------|------|------|
| 1 | Build SQLite FTS5 search index (`memory_index.py`): indexes ALL knowledge across all three domains with full-text search + tag filtering + domain filtering + material filtering + machine filtering + confidence thresholds | CC: write | 1.5hr |
| 2 | Build memory writer (`memory_write.py`): atomic writes with provenance, dedup, versioning, confidence, cross-domain linking | CC: write | 1hr |
| 3 | Build memory reader (`memory_read.py`): query interface supporting natural language search, filters, similarity scoring | CC: write | 1hr |
| 4 | Build compaction/dedup: consolidate near-duplicate entries, merge consensus, archive low-confidence entries | CC: write | 45min |
| 5 | **BUILD BOOT INTEGRATION (`memory_boot.py`):** | CC: write + MCP: architecture | 1.5hr |
| | - Creates `boot_manifest.json` — what to load at session start | | |
| | - Loads memory index (always) | | |
| | - Loads high-confidence knowledge summary (top 50 per domain) | | |
| | - Loads recent learning log (last 50 entries) | | |
| | - Loads active project context (if operator has set one) | | |
| | - Integrates with `prism_dev→session_boot` sequence | | |
| 6 | **BUILD SESSION BOOT ACTION (`prism_cad→memory_boot`):** | CC: write | 30min |
| | - Registered in boot sequence after state_load, before todo_update | | |
| | - Loads boot_manifest.json into context | | |
| | - Reports: "CAD/CAM/SHOP memory loaded: X recipes, Y strategies, Z practices" | | |

### Boot Manifest Structure
```json
{
  "manifest_version": "1.0",
  "generated_at": "2026-02-24T10:00:00Z",
  "stats": {
    "total_recipes": 45,
    "total_primitives": 32,
    "total_strategies": 67,
    "total_practices": 128,
    "total_troubleshoot_trees": 12,
    "total_material_tips": 89,
    "total_machine_tips": 34,
    "total_rules": 56,
    "total_videos_ingested": 203,
    "last_learning": "2026-02-24T09:30:00Z"
  },
  "high_confidence_summary": {
    "cad": "45 part recipes (bearing blocks, brackets, housings most common). 32 primitives. Strongest coverage: prismatic parts in aluminum and steel.",
    "cam": "67 strategy records. Best coverage: trochoidal roughing, adaptive clearing, contour finishing. Consensus parameters available for aluminum, 4140, 304SS.",
    "shop": "128 practice records. 12 troubleshooting trees. Strong: vise setup, chatter diagnosis, aluminum tips. Weak: 5-axis fixturing, exotic materials."
  },
  "recent_learning": [
    { "video": "How to Machine Titanium", "domains": ["CAM", "SHOP"], "when": "2 hours ago" },
    { "video": "SolidWorks Bracket Design", "domains": ["CAD"], "when": "yesterday" }
  ],
  "active_project": null,
  "boot_load_size_tokens": 1200
}
```

### Session Boot Integration

```
EXISTING BOOT SEQUENCE:
  prism_dev→session_boot
  ├── load state
  ├── load GSD
  ├── load key memories
  ├── integrity checks
  └── prism_context→todo_update

UPDATED BOOT SEQUENCE:
  prism_dev→session_boot
  ├── load state
  ├── load GSD
  ├── load key memories
  ├── integrity checks
  ├── prism_cad→memory_boot        ← NEW
  │   ├── load boot_manifest.json
  │   ├── report knowledge stats
  │   └── inject high-confidence summary into context
  └── prism_context→todo_update
```

### Exit Conditions
- [ ] Full-text search returns relevant results in < 100ms across all three domains
- [ ] Deduplication correctly identifies near-duplicate entries
- [ ] Boot integration loads memory summary in < 2 seconds
- [ ] Boot manifest stays under 2000 tokens (lean context injection)
- [ ] Memory persists across PRISM session restarts
- [ ] Session boot reports knowledge stats on every startup
- [ ] New action `prism_cad→memory_boot` registered in boot sequence

---

## CC-MS8: Cross-Platform Operation Mapping
**Duration:** 1 session (~3 hours)
**Model:** Opus (mapping design) → Haiku (bulk processing)
**Role:** Knowledge Engineer
**Execution:** MCP 60% / CC 40%

### Entry Conditions
- [ ] CC-MS2 complete (extractions from multiple platforms exist)
- [ ] CC-MS5 complete (CAM strategies identified)

### Steps

| # | Task | Tool | Time |
|---|------|------|------|
| 1 | Design cross-platform equivalency schema for CAD operations (extrude in SW = extrude in Fusion = pad in CATIA) AND CAM operations (Dynamic Mill = Adaptive Clearing = Trochoidal) | MCP: Opus | 1hr |
| 2 | Build initial mapping table for P0 platforms covering: CAD features (25+ operations), CAM roughing strategies, CAM finishing strategies, drilling cycles, turning operations | CC: write | 1hr |
| 3 | Build mapping query API + auto-mapper for extraction pipeline | CC: write | 1hr |

### Exit Conditions
- [ ] P0 platforms mapped for CAD features AND CAM strategies
- [ ] Auto-mapper identifies known operations during extraction with >85% accuracy

---

## CC-MS9: Manufacturability Validation Bridge
**Duration:** 2 sessions (~6 hours)
**Model:** Opus (safety validation design) → Sonnet (implementation)
**Role:** Safety Engineer
**Execution:** MCP 70% / CC 30% (SAFETY-CRITICAL — MCP-dominant)

### Entry Conditions
- [ ] CC-MS3 complete (geometry generation functional)
- [ ] CC-MS5 complete (CAM strategies stored)
- [ ] CC-MS6 complete (shop practices stored)
- [ ] prism_calc, prism_validate operational
- [ ] Machine + Tool databases loaded

### Steps

| # | Task | Tool | Time |
|---|------|------|------|
| 1 | Design validation pipeline: geometry → feature analysis → per-feature manufacturability check against machine + tool + material constraints | MCP: Opus (SAFETY) | 2hr |
| 2 | Build feature analyzer: extract all geometric features from CadQuery model | CC: write | 1.5hr |
| 3 | Build manufacturability checker: per-feature validation against tooling, machine envelope, material constraints, tolerance capability | CC: write + MCP: validate | 1.5hr |
| 4 | Build CAM parameter safety overlay: cross-reference ALL stored CAM parameters against prism_calc Kienzle model; flag violations, suggest corrections | MCP: Opus (SAFETY) | 45min |
| 5 | Build shop practice safety validator: ensure no stored practice contradicts physics or machine limits | MCP: Opus (SAFETY) | 15min |

### Validation Checks (Complete List — All Three Domains)

```
GEOMETRY CHECKS (CAD):
├── [ ] Part fits within target machine work envelope
├── [ ] No features smaller than minimum tool diameter
├── [ ] All internal corner radii >= smallest available endmill radius
├── [ ] All pocket depths achievable with available tool lengths
├── [ ] No wall thickness below material-specific minimum
├── [ ] All holes are standard sizes (or flagged as custom)
├── [ ] Thread specifications are standard (ISO/UNC/UNF)
├── [ ] Draft angles present where required by process

CAM PARAMETER CHECKS:
├── [ ] Spindle speed within machine capability AND material-safe range
├── [ ] Feed rate validated against Kienzle model for material
├── [ ] Depth of cut within tool specification
├── [ ] Stepover within recommended range for strategy
├── [ ] Safety score S(x) ≥ 0.70 for ALL operations
├── [ ] Chip load within recommended range (not rubbing, not overloading)
├── [ ] Tool engagement angle within strategy limits
├── [ ] Coolant type appropriate for material (no water on cast iron, etc.)

SHOP PRACTICE CHECKS:
├── [ ] Workholding method appropriate for forces generated
├── [ ] Clamping force sufficient but not deforming part
├── [ ] Tool stickout within safe L/D ratio for operation
├── [ ] Setup allows access to all features without collision
├── [ ] Troubleshooting solutions don't create new problems
├── [ ] Material tips consistent with physics (no contradictions)
├── [ ] Machine-specific tips valid for referenced controller version
```

### Exit Conditions
- [ ] Validation pipeline catches ALL intentional defects in test cases
- [ ] S(x) ≥ 0.70 enforced as hard block on all CAM parameters
- [ ] No geometry, parameter, or practice reaches operator without validation
- [ ] **MATHPLAN gate passed for all safety calculations**

---

## CC-MS10: Operator Guidance Interface
**Duration:** 1 session (~3 hours)
**Model:** Sonnet (implementation) → Opus (UX review)
**Role:** Application Engineer
**Execution:** CC 70% / MCP 30%

### Entry Conditions
- [ ] CC-MS7 complete (memory system queryable with boot integration)
- [ ] CC-MS8 complete (cross-platform mapping functional)
- [ ] CC-MS9 complete (validation bridge functional)

### Steps

| # | Task | Tool | Time |
|---|------|------|------|
| 1 | Build natural language query handler spanning ALL three domains: | CC: write | 1.5hr |
| | "Draw me a bearing block" → CAD recipe + STEP file | | |
| | "Best strategy for roughing 4140?" → CAM recommendation | | |
| | "How do I set up for this part on my HAAS?" → SHOP guidance | | |
| | "I'm getting chatter on this cut" → troubleshooting tree | | |
| 2 | Build step-by-step guidance generator: recipe + target platform → ordered steps with platform-specific menu paths | CC: write | 1hr |
| 3 | Build "teach me" mode: operator can say "teach me from this video: [URL]" and PRISM runs the full learn pipeline, reports what it learned, and adds to memory | CC: write | 30min |

### Exit Conditions
- [ ] Queries across all three domains return relevant, validated responses
- [ ] "Teach me" mode runs full pipeline from URL to stored knowledge
- [ ] All responses include validation status and provenance

---

## CC-MS11: Integration Testing + Safety Certification
**Duration:** 3 sessions (~9 hours)
**Model:** Opus (safety certification — MANDATORY)
**Role:** Quality Engineer
**Execution:** MCP 80% / CC 20% (SAFETY-CRITICAL)

### Entry Conditions
- [ ] ALL previous milestones complete (CC-MS0 through CC-MS10)
- [ ] At least 30 videos ingested across all three domains
- [ ] At least 5 CAD recipes, 10 CAM strategies, 20 shop practices stored

### Steps

| # | Task | Tool | Time |
|---|------|------|------|
| 1 | End-to-end integration test per domain: | CC: run + MCP: validate | 3hr |
| | **CAD:** URL → ingest → extract → code gen → validate → store → query → STEP file | | |
| | **CAM:** URL → ingest → extract → strategy store → validate → query → recommendation | | |
| | **SHOP:** URL → ingest → extract → practice store → validate → query → guidance | | |
| | **Cross-domain:** URL (full machining video) → all three domains extracted + linked | | |
| 2 | Safety audit: ALL validation checks, zero bypass paths, S(x)≥0.70 hard block | MCP: Opus (SAFETY) | 2hr |
| 3 | Boot integration test: restart session → verify memory loads → query succeeds with loaded knowledge | CC: run | 30min |
| 4 | Vision analysis audit: compare vision-only extractions to transcript-only; quantify vision contribution | CC: run + MCP: validate | 1hr |
| 5 | Anti-regression: all 32+1 dispatchers functional, `npm run build` passes | CC: run | 30min |
| 6 | Performance benchmarks | CC: run | 30min |
| 7 | Documentation: API docs, operator guide, troubleshooting guide | CC: write | 1hr |
| 8 | Omega computation: Ω ≥ 0.70 for release | MCP: Opus (MANDATORY) | 30min |

### Test Matrix

```
VIDEO SOURCES (minimum 30):
├── CAD-focused:      8 videos (SolidWorks, Fusion 360, AutoCAD)
├── CAM-focused:      8 videos (Mastercam, Fusion CAM, SW CAM)
├── SHOP-focused:     8 videos (setup, tooling, troubleshooting, materials)
└── Cross-domain:     6 videos (full build videos covering CAD+CAM+SHOP)

DOMAINS VALIDATED:
├── CAD:   5+ recipes, 20+ primitives, geometry exports clean
├── CAM:   10+ strategies, parameter consensus validated, recommendations work
├── SHOP:  20+ practices, 5+ troubleshoot trees, material tips consolidated
└── Cross: queries spanning domains return coherent multi-domain responses

SAFETY SCENARIOS:
├── CAD:  thin wall generated → caught
├── CAD:  impossible feature (tool can't reach) → caught
├── CAM:  unsafe RPM from tutorial → corrected
├── CAM:  excessive DOC from tutorial → corrected
├── SHOP: unsafe practice (no eye protection mentioned) → flagged
├── SHOP: conflicting advice from two sources → flagged for review
└── ALL:  S(x) < 0.70 → hard blocked, no output
```

### Exit Conditions
- [ ] All end-to-end tests pass across all three domains
- [ ] Safety audit: zero bypass paths
- [ ] Boot integration: knowledge loads and is queryable after restart
- [ ] Vision analysis contributes extractable knowledge on >60% of videos
- [ ] Anti-regression: zero existing capability loss
- [ ] Ω ≥ 0.70 achieved
- [ ] S(x) ≥ 0.70 enforced on all outputs

---

# 6. MANDATORY REQUIREMENTS

| # | Requirement | Enforcement |
|---|-------------|-------------|
| MR-1 | S(x) ≥ 0.70 on ALL CAM parameters before export | Hard block in validation bridge |
| MR-2 | Ω ≥ 0.70 for phase release | omega_compute gate |
| MR-3 | No geometry export without manufacturability validation | Pipeline enforced — no bypass |
| MR-4 | All knowledge entries have provenance (source video, timestamp, confidence) | Schema enforced — required fields |
| MR-5 | Anti-regression: all 32 existing dispatchers remain functional (verified) | validate_anti_regression before merge |
| MR-6 | MATHPLAN gate on all safety calculations | Required before execution |
| MR-7 | Generated parametric code must execute and produce valid geometry | Code validator in pipeline |
| MR-8 | No hardcoded dimensions in generated code — all parameterized | Code generator enforced |
| MR-9 | Cross-platform mappings must have bidirectional verification | Mapping validator |
| MR-10 | Memory persistence verified across session restart | Integration test CC-MS11 |
| MR-11 | Boot integration loads knowledge summary at every session start | Boot sequence validation |
| MR-12 | Vision analysis runs on every ingested video (not optional) | Ingestion pipeline enforced |
| MR-13 | Shop practices validated against physics before storage | Safety pipeline enforced |
| MR-14 | Troubleshooting trees never recommend unsafe remediation | Opus safety review |
| MR-15 | Conflicting advice from multiple sources flagged, not silently merged | Aggregator logic enforced |
| MR-16 | Python/TS bridge uses execFileNoThrow with JSON IPC — no shell injection surface | Bridge architecture enforced (CC-PRE-1) |
| MR-17 | Max 3 concurrent Python processes with 512MB memory limit each | Process pool manager enforced (CC-PRE-2) |
| MR-18 | YouTube creator whitelist + attribution + consent verification before any ingestion | Legal framework enforced (CC-PRE-4) |
| MR-19 | Multi-parameter compound safety (Level 1-4) operational before CC-MS9 gate | Safety architecture required (CC-PRE-5) |
| MR-20 | Vision API monthly budget cap ($500) with auto-pause at 80% | Cost tracking enforced (CC-PRE-6) |
| MR-21 | All bridge calls have configurable timeouts (30s default, 120s vision) with clean error propagation | Bridge tests verify (CC-PRE-3) |

---

# 7. NEW DISPATCHER SPECIFICATION

## `prism_cad` — CAD/CAM/Machining Learning Engine Dispatcher

### Actions (22 total)

```
# VIDEO LEARNING
prism_cad→ingest_video          # YouTube URL → transcript + frames + OCR + vision
prism_cad→extract_knowledge     # Ingested data → structured knowledge (all domains)
prism_cad→learn_from_video      # Full pipeline: URL → ingest → extract → validate → store
prism_cad→learning_stats        # Show what's been learned: counts, confidence, coverage

# CAD — DRAW
prism_cad→draw_part             # Description + constraints → STEP/DXF/STL + parametric code
prism_cad→adapt_part            # Existing recipe + new constraints → modified part
prism_cad→export_part           # Recipe → specific format (STEP/DXF/STL/IGES)
prism_cad→list_recipes          # List all learned part recipes
prism_cad→list_primitives       # List all feature primitives

# CAM — STRATEGIES
prism_cad→recommend_strategy    # Part + material + machine → ranked CAM strategies
prism_cad→list_strategies       # List all learned CAM strategies
prism_cad→explain_strategy      # Strategy name → full explanation with platform-specific setup
prism_cad→compare_strategies    # Compare two strategies for a given scenario

# SHOP — PRACTICES
prism_cad→recommend_setup       # Part + machine → workholding + WCS recommendation
prism_cad→troubleshoot          # Symptom → diagnosis → solution (decision tree)
prism_cad→material_tips         # Material → all collected machining tips
prism_cad→machine_tips          # Machine/controller → specific tips and settings
prism_cad→list_practices        # List all shop practices

# SYSTEM
prism_cad→memory_boot           # Load knowledge into session context (boot sequence)
prism_cad→recall                # Natural language search across all domains
prism_cad→validate_geometry     # CadQuery model → manufacturability report
prism_cad→map_operation         # Operation + platform → cross-platform equivalents
```

### Registration in AutoPilot.ts
```typescript
// Add to decision tree in AutoPilot.ts
if (intent.matches(
    // CAD triggers
    'cad', 'draw', 'part', 'sketch', 'model', 'geometry', 'step', 'dxf', 'stl',
    'bearing', 'bracket', 'block', 'housing', 'plate', 'shaft', 'collar',
    // CAM triggers
    'toolpath', 'strategy', 'roughing', 'finishing', 'adaptive', 'dynamic', 'trochoidal',
    'cam', 'mastercam', 'fusion', 'solidworks', 'program',
    // SHOP triggers
    'setup', 'fixture', 'workholding', 'vise', 'chuck', 'chatter', 'vibration',
    'coolant', 'chip', 'surface finish', 'troubleshoot', 'deflection',
    // Learning triggers
    'youtube', 'tutorial', 'learn', 'video', 'watch', 'teach',
    // Memory triggers
    'what did you learn', 'what do you know about', 'how many recipes'
)) {
  route → prism_cad dispatcher
}
```

---

# 8. DATABASE SCHEMA EXTENSIONS

## New Tables / Collections

### `cad_recipes` — Learned part designs
```
recipe_id, name, category, material_ids, parameters, feature_count,
source_videos, confidence, validation_status, safety_score,
cadquery_code, created_at, updated_at, version
```

### `cad_primitives` — Reusable feature patterns
```
primitive_id, name, category, parameters, standards, min_tool_req,
frequency, source_videos, cadquery_function
```

### `cam_strategies` — Toolpath strategy knowledge
```
strategy_id, prism_canonical, material_family, specific_materials,
machine_types, parameter_consensus, tool_consensus, when_to_use,
when_not_to_use, source_videos, prism_validated, safety_score_range
```

### `cam_sequences` — Multi-operation sequences
```
sequence_id, part_type, material, operations_ordered, rationale,
source_videos, confidence
```

### `shop_practices` — Machining practice records
```
practice_id, category, subcategory, applies_to, knowledge,
sources, consensus_strength, prism_safety_validated
```

### `shop_troubleshoot` — Troubleshooting decision trees
```
tree_id, symptom, nodes (tree structure), source_videos, confidence
```

### `shop_material_tips` — Per-material machining wisdom
```
material_id, tips (ranked list), source_videos, confidence_per_tip
```

### `shop_machine_tips` — Per-machine/controller knowledge
```
machine_family, controller, tips, settings, macros, source_videos
```

### `cad_platform_map` — Cross-platform equivalencies
```
canonical_name, platform_entries, key_parameters, description
```

### `cad_rules` — Design/process constraints
```
rule_id, category, applies_to, constraint, evidence, confidence, conflicts
```

---

# 9. RISK REGISTER

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| YouTube API rate limiting | Ingestion blocked | Medium | yt-dlp handles throttling; queue with backoff; cache |
| OCR accuracy on UI screenshots | Poor dimension extraction | Medium | Vision analysis as primary; OCR as supplement |
| Vision API costs per video | Budget overrun | Medium | Batch frames, send only key frames, cache results |
| CadQuery limitation on complex geometry | Cannot generate some parts | Low | Fall back to build123d; document limitations |
| Extraction hallucination | Wrong dimensions/parameters stored | Medium | Confidence thresholds; cross-video validation; require >0.80 |
| Unsafe tutorial parameters stored | DANGEROUS | HIGH | prism_calc validation MANDATORY; S(x)≥0.70 hard block |
| Unsafe shop practices stored | DANGEROUS | Medium | Opus safety review; physics cross-check; flagging system |
| Conflicting advice from sources | Confusing recommendations | Medium | Flagging system; weighted consensus; human review queue |
| Memory bloat | Slow queries, disk usage | Low | Compaction/dedup; archiving low-confidence entries |
| Cross-platform mapping errors | Wrong operation suggested | Medium | Bidirectional verification; confidence flags; disclaimers |
| Boot manifest too large | Slow session start | Low | Token budget (2000 max); summary-only injection |
| **[SCRUTINY-C1]** Python/TS bridge failure | All CC features offline | HIGH | execFileNoThrow + JSON IPC + process pool + health heartbeat (CC-PRE-1,2) |
| **[SCRUTINY-C2]** YouTube legal/IP liability | Legal action; project shutdown | HIGH | Creator whitelist + attribution + consent + DMCA workflow (CC-PRE-4) |
| **[SCRUTINY-C3]** Multi-param safety gap | Dangerous compound cuts approved | CRITICAL | 4-level compound safety chain (CC-PRE-5); blocks CC-MS9 gate |
| **[SCRUTINY-H1]** Vision API cost overrun | Budget exhaustion | Medium | $500/month cap, auto-pause at 80%, per-video estimate $0.48 (CC-PRE-6) |
| **[SCRUTINY-H2]** Bridge latency under load | Degraded user experience | Medium | Process pool warm start, < 100ms target, 3 concurrent max (CC-PRE-2) |
| **[SCRUTINY-H3]** Session duration increase (27→39-45) | Developer fatigue; scope creep | Medium | CC-PRE absorbs highest-risk items early; milestone gates prevent drift |
| **[SCRUTINY-H4]** Test coverage gap for bridge | Silent bridge regressions | Medium | CC-PRE-3 requires ≥15 bridge tests before CC-MS0 begins |
| **[SCRUTINY-M1]** Vision-only vs transcript accuracy drift | Extraction quality degradation | Low | CC-MS11 vision audit step; periodic accuracy sampling |
| **[SCRUTINY-M2]** Python dependency version conflicts | Build failures on update | Low | Pin exact versions in requirements.txt; CI pin check |
| **[SCRUTINY-M3]** Knowledge base scaling beyond 10K entries | Query performance degradation | Low | FTS5 indexing; pagination; archival of low-confidence entries |
| **[SCRUTINY-M4]** Concurrent bridge processes memory pressure | System instability | Low | 512MB per-process cap; OOM handler; graceful degradation |

---

# 10. SUCCESS METRICS

## Phase Completion Criteria

| Metric | Target |
|--------|--------|
| Ω (Release Readiness) | ≥ 0.70 |
| S(x) (Safety Score) | ≥ 0.70 on all outputs |
| Video ingestion success rate | ≥ 90% |
| Extraction accuracy (all domains) | ≥ 80% vs manual review |
| Vision analysis contribution rate | ≥ 60% of videos have vision-only extractions |
| Code generation success rate | ≥ 85% valid geometry |
| Manufacturability check catch rate | 100% on known defects |
| CAM parameter safety catch rate | 100% on unsafe parameters |
| Shop practice safety catch rate | 100% on unsafe practices |
| Query response latency | < 2 seconds |
| Boot load time | < 2 seconds |
| Anti-regression | 32/32 + prism_cad operational |

## Growth Metrics (Post-Launch)

| Metric | 30 days | 90 days | 180 days |
|--------|---------|---------|----------|
| Videos ingested | 50 | 300 | 1000 |
| CAD recipes | 20 | 80 | 200 |
| CAD primitives | 30 | 60 | 100 |
| CAM strategies | 30 | 100 | 250 |
| Shop practices | 50 | 200 | 500 |
| Troubleshoot trees | 10 | 30 | 60 |
| Material tip entries | 30 | 80 | 150 |
| Machine tip entries | 15 | 50 | 100 |
| Platforms mapped | 3 (P0) | 6 (P0+P1) | 10+ |
| Operator queries answered | 100 | 1000 | 5000 |

---

# 11. HANDOFF PACKAGE TEMPLATE

```json
{
  "phase": "CC",
  "current_milestone": "CC-MS?",
  "current_step": "?",
  "status": "in_progress|blocked|complete",
  "files_changed": [],
  "files_created": [],
  "tests_passing": true,
  "build_status": "clean",
  "knowledge_stats": {
    "recipes": 0,
    "primitives": 0,
    "strategies": 0,
    "practices": 0,
    "troubleshoot_trees": 0,
    "videos_ingested": 0
  },
  "next_action": "description of exactly what to do next",
  "blockers": [],
  "notes": "",
  "timestamp": "ISO-8601"
}
```

Save to: `C:\PRISM\state\HANDOFF_CC.json`

---

# APPENDIX A: SESSION PLANNING

```
SESSION MAP (39-45 sessions total, post-scrutiny revised):
═══════════════════════════════════════════════════════════════════
Sessions 1-4:   CC-PRE   Pre-work (Python bridge, legal framework, safety arch)  [3-4 sessions]
Sessions 5-7:   CC-MS0   Foundation + CAD Kernel + Bridge                        [2-3 sessions]
Sessions 8-11:  CC-MS1   Video Ingestion + Vision Analysis                       [3-4 sessions]
Sessions 12-15: CC-MS2   Knowledge Extraction (All 3 Domains)                    [3-4 sessions]
Sessions 16-18: CC-MS3   Parametric Code Generator (CAD DRAW)                    [2-3 sessions]
Sessions 19-21: CC-MS4   Feature Primitive Library (CAD LEARN)                   [2-3 sessions]
Sessions 22-24: CC-MS5   CAM Strategy Learning Engine                            [2-3 sessions]
Sessions 25-27: CC-MS6   Machining Practice Knowledge Base                       [2-3 sessions]
Sessions 28-30: CC-MS7   Persistent Memory + Boot Integration                    [2-3 sessions]
Sessions 31-32: CC-MS8   Cross-Platform Mapping                                  [1-2 sessions]
Sessions 33-36: CC-MS9   Manufacturability Validation Bridge (compound safety)   [3-4 sessions]
Sessions 37-38: CC-MS10  Operator Guidance Interface                             [1-2 sessions]
Sessions 39-43: CC-MS11  Integration Testing + Safety Certification              [4-5 sessions]
Sessions 44-45: Buffer / overflow / polish                                       [1-2 sessions]
═══════════════════════════════════════════════════════════════════

NOTE: Session increase from 27→39-45 reflects scrutiny findings:
  - +3-4 sessions: CC-PRE pre-work (Python/TS bridge, legal, safety)
  - +2-3 sessions: CC-MS9 compound safety (4-level validation)
  - +1-2 sessions: CC-MS11 expanded testing (vision audit, meta-safety)
  - +3-4 sessions: distributed across milestones for bridge overhead

CRITICAL PATH:
MS0 → MS1 → MS2 ─→ MS3 ──→ MS9 ──→ MS11
                ├→ MS4 ─↗         ↗
                ├→ MS5 ─→ MS9 ──↗
                ├→ MS6 ─→ MS9 ──↗
                └→ MS7 ─→ MS10 ─↗
                └→ MS8 ─→ MS10 ─↗

PARALLEL TRACKS (after MS2):
Track A (CAD):  MS3 → MS4 ──────→ MS9
Track B (CAM):  MS5 ────────────→ MS9
Track C (SHOP): MS6 ────────────→ MS9
Track D (SYS):  MS7 → MS8 → MS10
All converge at MS9 (validation) → MS11 (certification)
```

# APPENDIX B: DEPENDENCY INSTALLATION

```bash
# Python dependencies (on DIGITALSTORM-PC)
pip install cadquery==2.4.0
pip install build123d
pip install OCP
pip install yt-dlp
pip install openai-whisper
pip install pytesseract
pip install Pillow
pip install trimesh
pip install open3d

# System dependencies
# ffmpeg: choco install ffmpeg
# tesseract: choco install tesseract

# Anthropic API (already configured in PRISM)
# Used for: vision analysis, knowledge extraction, safety review
```

# APPENDIX C: FILE LOCATIONS

```
C:\PRISM\cad-engine\                    # NEW — All code
├── cad_kernel.py                        # CadQuery wrapper
├── geo_validator.py                     # Geometry validation
├── cad_export.py                        # Multi-format export
├── video_ingest.py                      # YouTube → transcript + frames
├── frame_extract.py                     # Scene change sampling
├── ui_ocr.py                           # OCR pipeline
├── vision_analyze.py                    # Opus vision interpretation
├── domain_classify.py                   # CAD/CAM/SHOP classifier
├── platform_detect.py                   # Software identification
├── knowledge_extract.py                 # Extraction orchestrator
├── feature_translator.py               # Feature tree → CadQuery
├── code_gen.py                          # Parametric code assembler
├── pattern_detect.py                    # Pattern identification
├── primitive_gen.py                     # Primitive generalization
├── strategy_aggregate.py               # CAM strategy consensus
├── strategy_recommend.py               # CAM recommendation engine
├── tool_select_kb.py                    # Tool selection knowledge
├── practice_aggregate.py               # Shop practice consensus
├── trouble_tree.py                      # Troubleshooting tree builder
├── memory_index.py                      # SQLite FTS5 search
├── memory_write.py                      # Atomic memory writes
├── memory_read.py                       # Query interface
├── memory_boot.py                       # Session boot loader
├── mfg_check.py                         # Manufacturability validation
├── feature_analyze.py                   # Geometry feature extraction
├── platform_map.json                    # Cross-platform equivalencies
├── API.md                               # Complete API documentation
└── tests/
    ├── test_cad_kernel.py
    ├── test_ingestion.py
    ├── test_vision.py
    ├── test_extraction_cad.py
    ├── test_extraction_cam.py
    ├── test_extraction_shop.py
    ├── test_codegen.py
    ├── test_strategies.py
    ├── test_practices.py
    ├── test_memory.py
    ├── test_boot.py
    ├── test_validation.py
    └── test_integration.py

C:\PRISM\state\cad\                     # NEW — Persistent memory
├── recipes/                             # CAD: Complete parts
├── primitives/                          # CAD: Reusable features
├── strategies/                          # CAM: Toolpath strategies
├── sequences/                           # CAM: Operation sequences
├── practices/                           # SHOP: Machining practices
├── setups/                              # SHOP: Workholding knowledge
├── troubleshoot/                        # SHOP: Decision trees
├── material_tips/                       # SHOP: Per-material wisdom
├── machine_tips/                        # SHOP: Per-machine knowledge
├── rules/                               # ALL: Constraints learned
├── platform_map/                        # Cross-platform data
├── provenance/                          # Source tracking
├── ingest/                              # Raw video processing
├── memory.db                            # SQLite FTS5 index
├── boot_manifest.json                   # Session boot payload
└── learning_log.jsonl                   # Append-only audit trail

C:\PRISM\mcp-server\src\dispatchers\prism_cad\  # NEW dispatcher
├── index.ts                             # Dispatcher entry point (22 actions)
├── actions/                             # Action handlers
└── types.ts                             # TypeScript types
```

---

# APPENDIX D: SCRUTINY FINDINGS SUMMARY

**Scrutiny Pass Date:** 2026-02-24
**Total Findings:** 11 (3 CRITICAL, 4 HIGH, 4 MEDIUM)
**Resolution:** All findings addressed via CC-PRE pre-work section + expanded risk register + MR-16 through MR-21

| # | Severity | Finding | Resolution | Status |
|---|----------|---------|------------|--------|
| C1 | CRITICAL | Python/TS bridge architecture undefined — no error handling, timeout, or concurrency spec | CC-PRE-1,2,3: Bridge arch + pool manager + tests | DESIGNED |
| C2 | CRITICAL | YouTube legal exposure — no creator consent, attribution, or DMCA compliance | CC-PRE-4: Legal framework with whitelist + attribution + consent | DESIGNED |
| C3 | CRITICAL | Multi-parameter compound safety — single S(x) insufficient for parameter combinations | CC-PRE-5: 4-level compound safety (L1-L4) | DESIGNED |
| H1 | HIGH | Vision API costs unbudgeted — ~$0.48/video × growth target could exceed $500/month | CC-PRE-6: Monthly cap + auto-pause at 80% | DESIGNED |
| H2 | HIGH | Bridge latency impact — Python subprocess overhead could degrade UX | CC-PRE-2: Warm process pool + health heartbeat + <100ms target | DESIGNED |
| H3 | HIGH | Session estimate undercount — 27 sessions doesn't account for bridge overhead + safety work | Revised to 39-45 sessions (Appendix A rewritten) | APPLIED |
| H4 | HIGH | Test coverage gap for bridge — no bridge-specific test infrastructure | CC-PRE-3: ≥15 bridge tests required before CC-MS0 | DESIGNED |
| M1 | MEDIUM | Vision-only vs transcript accuracy drift over time | CC-MS11 vision audit step added | DESIGNED |
| M2 | MEDIUM | Python dependency version conflicts | requirements.txt pinning + CI check | DESIGNED |
| M3 | MEDIUM | Knowledge base scaling beyond 10K entries | FTS5 indexing already in design; pagination added | DESIGNED |
| M4 | MEDIUM | Concurrent bridge processes memory pressure | 512MB per-process cap + OOM handler | DESIGNED |

---

**END OF PHASE CC DOCUMENT v2.1**

**Document Version:** 2.1
**Created:** 2026-02-24
**Updated:** 2026-02-24
**Author:** Claude + Mark
**Status:** DRAFT — Scrutiny-refined, integrated into master roadmap
**Changes from v2.0:**
- Added CC-PRE pre-work section (7 requirements, 3-4 sessions)
- Added MR-16 through MR-21 (6 new mandatory requirements from scrutiny)
- Updated session estimate from 27 to 39-45 sessions (Appendix A rewritten)
- Updated registry counts: materials 3,533, machines 1,016, tools 13,967, alarms 10,033
- Updated dispatcher counts: 32 verified (was 31)
- Expanded risk register with 11 scrutiny findings (SCRUTINY-C1 through SCRUTINY-M4)
- Added Appendix D: Scrutiny Findings Summary
**Changes from v1.0:**
- Added Domain 2: CAM Strategy Learning (CC-MS5)
- Added Domain 3: Machining Practice Knowledge Base (CC-MS6)
- Added Vision Analysis pipeline (CC-MS1 expanded)
- Added Boot Integration for session memory loading (CC-MS7 expanded)
- Expanded from 10 to 12 milestones, 18 to 27 sessions
- Expanded dispatcher from 14 to 22 actions
- Added 10 new database schema tables
- Added 5 new mandatory requirements (MR-11 through MR-15)
- Added troubleshooting decision tree architecture
- Added material-specific and machine-specific tip systems
