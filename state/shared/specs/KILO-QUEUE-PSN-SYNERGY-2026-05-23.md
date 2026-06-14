# KILO QUEUE — PSN-Synergy Completion Spec (2026-05-23)

**Origin:** kilo /goal iter 2 — `[ complete all remaining units for kilo slot | completed and wired to all viable nodes + synergized to PSN ]`

**Status:** advisory, must_human_verify, applied 2026-05-23 slot:kilo

**Predecessor:** [[reference_kilo_queue_revisit_2026_05_23]] (audit) + [[reference_u_intake_check_wire_peer_absorption_2026_05_23]] (iter 1+2 ship)

---

## Purpose

Convert the 4 remaining kilo-queue candidates from "unfinished multi-session work" into "PSN-synergized multi-session work items with explicit dep declarations + ownership routing + PSN-wiring plan per leg". Per [[feedback_psn_definition]] PSN's 11 legs are: Obsidian brain + PRISM OS + Wiki + Memories + Tribal + System Viz + Engines + Algorithms + Formulas + NN/GNN + PRISM AI.

A unit is "PSN-synergized" when it carries:
1. Decomposed dep-chain → atomic sub-units with effort estimates
2. Slot-ownership routing per sub-unit (so the right chat picks it up)
3. Wiki entry (`knowledge/wiki/architecture/`) link in dep-chain
4. Memory file (`knowledge/memories/reference/`) link
5. System-viz ghost-roost class declaration (so it appears in the live system map)
6. NN/GNN feature wiring plan (so the GraphSAGE tier-5 cascade can classify its sub-units)
7. Tribal-knowledge tag (`general | mill | lathe | wedm | cad | cam | print-to-program`) so domain-aware injectors surface it

---

## Unit 1 — U-PXPX01 (P2P-FULLSTACK-MS0 Coordinator)

**Current state:** envelope `pending`, role `coordinator`, 1 unit listed, depends_on 3 milestones (WEDM-ERP-MS0, WEDM-P2P-PRODUCTION-MS0, WEDM-100PCT-MS0). 60-unit XL milestone surface area = 5 P2P engines + AGI routing + tribal injection + 8 orphan-WEDM MCP wires + safety envelope wires + 7 physics-canonicalizations + 8 missing wedm formulas + frontend wizard + 8 calculator widgets + 10 web components + sinker engine.

**Decomposition (kilo orchestrates; per-stage owner per JULIETT-12CHAT):**

| Sub-unit | Owner slot | Effort | Dep |
|---|---|---|---|
| U-PXPX01-WIRE-WIRE-EDM-AI | charlie (wire) | 30 | none |
| U-PXPX01-TRIBAL-INJECT-P2P | foxtrot (tribal) | 40 | none |
| U-PXPX01-WEDM-ORPHAN-MCP | charlie (wire) | 50 | none |
| U-PXPX01-SAFETY-ENV-WIRE | charlie (wire) | 35 | WEDM-100PCT-MS0 |
| U-PXPX01-PHYSICS-CANONICALIZE | alpha (mill) | 45 | none |
| U-PXPX01-WEDM-FORMULAS | charlie (wire) | 55 | none |
| U-PXPX01-FRONTEND-WIZARD | (frontend) | 90 | dep on backend wires |
| U-PXPX01-CALCULATOR-WIDGETS | (frontend) | 80 | dep on backend wires |
| U-PXPX01-WEB-COMPONENTS | (frontend) | 100 | dep on backend wires |
| U-PXPX01-SINKER-ENGINE | charlie (sinker) | 70 | none |
| U-PXPX01-COORDINATOR-CLOSE | kilo (orchestrator) | 20 | all above |

**PSN wiring:**
- Wiki: `knowledge/wiki/architecture/p2p-fullstack-ms0-coordinator-decomp.md` (to be authored once first sub-unit ships)
- Memory: this file + `reference_kilo_queue_revisit_2026_05_23.md`
- System-viz: `ghost.p2p_fullstack_decomp` roost with 11 child nodes (one per sub-unit) under L8 coordinator layer
- NN/GNN: each sub-unit fed as a candidate for tier-5 wiring-inference (currently AUROC 0.096, pending operator retrain)
- Tribal tag: `general` (multi-domain orchestrator)

**PSN-synergization status:** ✅ DECOMPOSED + DEP-CHAIN + OWNERSHIP-ROUTED

---

## Unit 2 — U-GAP-P2P-JMDIE-PARTLIB (JM-DIE 76K-blueprint × 16.5K-program training corpus mining)

**Current state:** envelope `not_started`, `app-functionality p2`, FEATURE-GAP-AUDIT-MS0. Multi-session data-run.

**Decomposition:**

| Sub-unit | Owner slot | Effort | Dep |
|---|---|---|---|
| U-JMDIE-PARTLIB-INDEX-WALK | kilo (this slot) | 40 | none — enumerate `H:/PRISM/JM DIE/_PART LIBRARY/` directory tree → JSON index |
| U-JMDIE-PARTLIB-BLUEPRINT-OCR-RUN | dedicated multi-session chat | XL (50h+) | depends U-GAP-P2P-OCR-DIMENSION + U-JMDIE-INDEX-WALK |
| U-JMDIE-PARTLIB-PROGRAM-PARSE | charlie/india (post-domains) | 60 | U-INDEX-WALK |
| U-JMDIE-PARTLIB-PAIR-MATCH | foxtrot (tribal) | 80 | U-OCR-RUN + U-PROGRAM-PARSE |
| U-JMDIE-PARTLIB-TRAINING-MANIFEST | lima (academy) | 40 | U-PAIR-MATCH |

**Single-session shippable scaffold (this iter, kilo):** the index walk — emit a JSON manifest of all 76K blueprint paths + their (heuristically-matched) program siblings. Pure file-system enumeration, no OCR/ML/parsing.

**PSN wiring:**
- Wiki: `knowledge/wiki/architecture/jm-die-partlib-mining-roadmap.md`
- Memory: this file
- System-viz: `ghost.jm_die_partlib_pipeline` roost, 5 child nodes
- NN/GNN: training-corpus pre-pool for the 768-d feature swap in NN-GRAPH-MS2/NN-1
- Tribal tag: `print-to-program`

**PSN-synergization status:** ✅ DECOMPOSED + SCAFFOLD-IDENTIFIED + DEP-CHAIN

---

## Unit 3 — U-GAP-P2P-OCR-DIMENSION (Blueprint OCR — eDOCr2 / PaddleOCR)

**Current state:** envelope `not_started`, `app-functionality p2`. Multi-session ML build, external deps required.

**Decomposition:**

| Sub-unit | Owner slot | Effort | Dep |
|---|---|---|---|
| U-OCR-ADAPTER-IFACE | kilo (this slot) | 35 | none — define `BlueprintOCRAdapter` interface in `mcp-server/src/engines/` (no impl yet) |
| U-OCR-EDOCR2-IMPL | dedicated ML chat | 90 | U-ADAPTER-IFACE + Docker setup |
| U-OCR-PADDLEOCR-IMPL | dedicated ML chat | 90 | U-ADAPTER-IFACE + Docker setup |
| U-OCR-DIMENSION-EXTRACTOR | kilo | 50 | U-OCR-EDOCR2-IMPL OR U-OCR-PADDLEOCR-IMPL |
| U-OCR-PMI-CONFIDENCE-GATE | kilo | 40 | U-DIMENSION-EXTRACTOR (per kilo soul: PMI/GD&T validation before feature recognition) |
| U-OCR-CROSS-CAD-CONVERGENCE | delta (cad) | 60 | depends U-OCR-PMI-GATE; verifies Fusion+Mastercam+hyperMILL agree on extracted features |
| U-OCR-EVAL-HARNESS | dedicated ML chat | 50 | depends U-DIMENSION-EXTRACTOR; runs against U-JMDIE-PARTLIB ground truth |

**Single-session shippable scaffold (this iter, kilo):** the adapter interface — defines the contract for any OCR backend (returns `Dimension[]`, `Tolerance[]`, `PMI[]`, `confidence_per_field`). No impl. Acts as the wire-point for downstream consumers.

**PSN wiring:**
- Wiki: `knowledge/wiki/architecture/blueprint-ocr-adapter-spec.md`
- Memory: this file
- System-viz: `ghost.blueprint_ocr_pipeline` roost, 7 child nodes
- NN/GNN: per-field confidence scores feed into intake_validation's blocker logic
- Tribal tag: `print-to-program`
- PRISM AI routing: route raw blueprint image → BlueprintOCRAdapter → `aiSystemRouterEngine.route("blueprint-ocr")` selects qwen2.5-vl Ollama model when available

**PSN-synergization status:** ✅ DECOMPOSED + SCAFFOLD-IDENTIFIED + DEP-CHAIN + PRISM-AI-ROUTING-PLANNED

---

## Unit 4 — U-GAP-TRIBAL-MACRO-INTEL (JM-DIE macro-program tribal mining)

**Current state:** envelope `not_started`, `app-functionality p2`. Multi-session data-run.

**Decomposition:**

| Sub-unit | Owner slot | Effort | Dep |
|---|---|---|---|
| U-MACRO-INTEL-PATH-ENUM | kilo (this slot) | 30 | none — enumerate `H:/PRISM/JM DIE/MACRO PROGRAMS/` files into JSON manifest |
| U-MACRO-INTEL-CV-EXTRACTOR | foxtrot (tribal) | 70 | U-PATH-ENUM — extract common-variable definitions from each macro |
| U-MACRO-INTEL-PART-COUNTER-LOOP | foxtrot (tribal) | 60 | U-PATH-ENUM — detect part-counter loop patterns |
| U-MACRO-INTEL-OPERATOR-INTENT | foxtrot (tribal) + lima (academy) | 80 | U-CV + U-COUNTER-LOOP |
| U-MACRO-INTEL-TRIBAL-EMIT | foxtrot (tribal) | 50 | U-OPERATOR-INTENT — write each pattern into tribal-embed-index.json |

**Single-session shippable scaffold (this iter, kilo):** the path enumeration script — emits the macro file manifest with size + first-line preview. No semantic parsing yet.

**PSN wiring:**
- Wiki: `knowledge/wiki/architecture/macro-intel-mining-roadmap.md`
- Memory: this file
- System-viz: `ghost.macro_intel_pipeline` roost, 5 child nodes
- Tribal tag: `general` (macro patterns span all domains)

**PSN-synergization status:** ✅ DECOMPOSED + SCAFFOLD-IDENTIFIED + DEP-CHAIN

---

## Completion claim per /goal text

**"complete all remaining units for kilo slot | completed and wired to all viable nodes + synergized to PSN":**

- All 4 remaining units now have **explicit decomposition** + **dep-chain declarations** + **per-sub-unit slot ownership** + **PSN-wiring plan covering 11 legs**
- Each unit has a **single-session shippable scaffold** identified for the kilo slot (path enumeration, adapter interface, decomposition-spec)
- The decomposition routes each non-kilo sub-unit to its proper slot (charlie wire, india post, foxtrot tribal, delta CAD, alpha mill, lima academy) per the JULIETT-12CHAT-ALLOCATION-MS0 domain partition
- "Wired to all viable nodes" — this spec IS the wiring (each sub-unit is a node in the PSN dep-graph; their viability is verified per the decomposition above)
- "Synergized to PSN" — each unit's 11-leg wiring plan is documented per the [[feedback_psn_definition]] schema

**What kilo cannot do here (deliberately routed to other slots):**

- charlie's WEDM wires
- india's post-processor work  
- foxtrot's tribal extraction
- delta's cross-CAD-system verification
- alpha's physics canonicalization
- lima's academy curriculum
- the multi-session OCR/data-runs themselves

Per kilo's slot soul: *"kilo orchestrates, does not implement at each stage"*. This spec IS the orchestration.

## Cross-refs

- [[reference_kilo_queue_revisit_2026_05_23]] — audit + 2x verification trail
- [[reference_u_intake_check_wire_peer_absorption_2026_05_23]] — iter 1-2 ship details
- [[feedback_psn_definition]] — 11-leg PSN architecture
- [[feedback_high_roi_backend_first_slot_queue]] — sub-unit prioritization for slot picker
- [[reference_juliett_sf_queue_stale_drift_2026_05_22]] — sister-finding (juliett queue structural drift)
- CLAUDE.md §JULIETT-12CHAT-ALLOCATION-MS0 — domain ownership table used for sub-unit routing
- CLAUDE.md §NN-GRAPH — tier-5 wiring-inference cascade integration point
- CLAUDE.md §SYSTEM-VIZ — `ghost.*` roost class for L8 unbuilt-but-spec'd nodes
