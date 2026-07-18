# KNOWLEDGE INGESTION & LEARNING PIPELINE ROADMAP
## LEARN-MS0 through LEARN-MS5 | 6 Milestones | 30 Units | 10 Sessions
## Est. 12-18 Session-Hours

**Authority:** This roadmap governs unified content ingestion and learning pipeline wiring.
**Owner:** Claude (backend + engine wiring) | Codex (frontend + visualization)
**Target:** Make PRISM learn from ANY external CNC content — pasted tips, videos, documents, social media posts.
**Revenue Tier:** PRO (knowledge capture) → PRODUCTION (auto-courses) → ENTERPRISE (fleet learning)

---

## WIRING AUDIT (Stage 2 — what exists vs what's needed)

### ALREADY WIRED (don't rebuild):
| Engine | Dispatcher | Actions | Status |
|--------|-----------|---------|--------|
| ApprenticeEngine | knowledgeExtDispatcher | 10 (explain, lesson, assess, capture...) | WIRED |
| KnowledgeGraphEngine | knowledgeExtDispatcher + knowledgeDispatcher | 10+ | WIRED |
| TribalKnowledgeEngine | knowledgeDispatcher | 4 (capture, search, suggest, stats) | WIRED |
| LearningProgressionEngine | operatingSystemDispatcher | courses, enrollment, checkpoints | WIRED |
| LearningPathEngine | businessDispatcher | 4 (assess, plan, progress, recommend) | WIRED |
| JobLearningEngine | intelligenceDispatcher | 2 (job_record, job_insights) | WIRED |
| MachineLearningStrategyRankerEngine | camDispatcher | 4 (record, rank, sample, transfer) | WIRED |
| FleetLearningStrategyEngine | camDispatcher | 3 (aggregate, shrink, fleet_insights) | WIRED |
| SelfLearningCAMEngine | camDispatcher | 5 (cut_learn, twin_sync, strategy_rank...) | WIRED |
| CourseBuilderEngine | knowledgeDispatcher | partial (import exists) | PARTIAL |
| DocumentLearningDispatcher | own dispatcher | 5 (upload, extract, list, get, delete) | WIRED |

### NOT WIRED (this roadmap wires them):
| Engine | LOC | Key Methods | Gap |
|--------|-----|-------------|-----|
| VideoLearningEngine | ~600 | processVideo(), extractTranscript(), generateKnowledgeItems() | No dispatcher action |
| InteractiveLearningSessionEngine | ~400 | createSession(), submitAction(), getClarifyingQuestion() | No dispatcher action |
| MachineLearningFeedbackEngine | ~500 | recordMeasurement(), autoCalibrate(), detectDrift() | No dispatcher action |
| TransferLearningEngine | ~400 | machineSimilarity(), scaleParameters(), gpTransfer() | No dispatcher action |
| FleetDeploymentLearningEngine | ~500 | getFleetStatus(), generateUpdatePlan(), ingestFeedback() | No dispatcher action |
| KnowledgeCurriculumBridgeEngine | ~300 | generateProblemFromTribal(), adaptDifficulty() | No dispatcher action |

### MISSING (this roadmap builds):
| Component | Purpose |
|-----------|---------|
| ContentIngestionPipelineEngine | Unified router: text/video/doc → correct engine → knowledge graph |
| Auto-tagger (NLP) | Extract material/operation/machine tags from raw text |
| Deduplication | Detect near-duplicate tips before storing |
| Web UI | Paste tip / drop video / upload doc → see it in knowledge graph |

---

## DEPENDENCY GRAPH
```
LEARN-MS0 (Content Ingestion Pipeline Engine) ← ROOT
    ↓
LEARN-MS1 (Video + Interactive Learning Wiring)
    ↓
LEARN-MS2 (Knowledge Graph Enrichment + Cross-Reference)
    ↓                         ↓
LEARN-MS3 (Course Auto-Gen)   LEARN-MS4 (Feedback + Fleet Learning)
    ↓                         ↓
LEARN-MS5 (Web UI — Ingestion + Knowledge Browser + Course Viewer) ← depends on MS3+MS4
```

---

## MCP SESSION PROTOCOL (MANDATORY — EVERY SESSION)

SESSION START: `context_boot → dispatcher_map → memory_recall("learn-pipeline") → system_snapshot → action_search "<goal>"`
DURING WORK: `auto_checkpoint (every 5-10 calls) → action_search → tool_route_best`
SESSION END: `memory_save → system_snapshot → checkpoint_enhanced`
REVIEW: `/prism-review` at every session exit + `/scrutinize` for engine modifications
TESTING: `npx vitest run [file]` after every test file creation
COMPACT: `/compact` after every 3 units
4-LOOP: Every unit follows BUILD → SCRUTINIZE → GAP FILL → TIE UP

---

## UNIVERSAL UNIT TEMPLATE (applies to ALL 30 units)

Every unit MUST include:
- FILES_CREATED and/or FILES_MODIFIED
- ABORT_CRITERIA (>= 3 measurable conditions that trigger automatic stop)
- ROLLBACK: `git checkout [files] && npx vitest run` to restore baseline

## UNIVERSAL EXIT GATE TEMPLATE (applies to ALL 6 milestones)

Every exit gate MUST include:
- `[ ] All pre-existing tests still passing` (regression)
- `[ ] npx tsc --noEmit = 0 errors` (build)
- `[ ] New tests >= [N] passing` (coverage)
- `[ ] Action completes in < 5s for typical inputs` (performance)
- OMEGA_FLOOR: >= 1.0 (per user preference)

---

# LEARN-MS0: Content Ingestion Pipeline Engine
**Sessions: 2 | Units: 6 | Priority: P0-CRITICAL | DEPENDS_ON: none (ROOT)**
**Revenue tier: PRO — every shop has tribal knowledge to capture**

The unified entry point: paste a CNC tip, drop a video file, upload a document → PRISM auto-routes to the right engine, auto-tags, stores in knowledge graph.

### SESSION LEARN-MS0-S1: ContentIngestionPipelineEngine
**SMART CONFIG:** Role=R2-Engine + R7-Product | Model=OPUS | Effort=MAX | Context_Budget=80K

**KNOWLEDGE SOURCES:**
- TribalKnowledgeEngine (capture, search, suggest — already wired)
- VideoLearningEngine (processVideo, extractTranscript, generateKnowledgeItems — NOT wired)
- DocumentLearningDispatcher (doc_upload, doc_extract — already wired)
- KnowledgeGraphEngine (query, infer, traverse — already wired)
- ManufacturingKnowledgeGraphEngine (queryNL, recommend — already wired)

**INTENT:** User pastes "When machining 316L, reduce feed by 20% in corners due to work hardening" → PRISM auto-tags as material=316L, operation=milling, tip_type=feed_adjustment → stores in TribalKnowledgeEngine → links in KnowledgeGraphEngine.

**WORK:**
U-LEARN01: ContentIngestionPipelineEngine — unified router
  - Accept input: { content_type: "text" | "video" | "document" | "url", content: string | Buffer, source?: string, metadata?: {} }
  - Route: text → TribalKnowledgeEngine.captureTip() + auto-tag
  - Route: video → VideoLearningEngine.processVideo() → knowledge items → TribalKnowledgeEngine
  - Route: document → DocumentLearningDispatcher pipeline → knowledge items
  - Route: url → fetch content → detect type → re-route
  - Return: IngestionResult { items_created, tags_applied, graph_nodes_added, source_attribution }
  - FILES_CREATED: [src/engines/ContentIngestionPipelineEngine.ts]
  - ABORT_CRITERIA: [engine returns zero items for valid input, auto-tagger tags nothing, graph insertion fails]
  - ROLLBACK: `git checkout src/engines/ContentIngestionPipelineEngine.ts`

U-LEARN02: NLP Auto-Tagger
  - Extract from raw text: material mentions (ISO group, alloy names), operation types (milling, turning, drilling...), machine brands/models, tool types, controller references
  - Use existing MaterialRegistry (2,957 materials), MachineRegistry (910 machines), ToolRegistry (95,608 tools) for entity recognition
  - Fuzzy matching: "stainless" → "316L" → ISO M, "VMC" → "vertical machining center"
  - Return: TagResult { materials[], operations[], machines[], tools[], controllers[], confidence }
  - FILES_CREATED: [src/engines/ContentAutoTaggerEngine.ts]
  - ABORT_CRITERIA: [tagger finds zero tags in "machine 4140 steel at 3000 RPM", confidence always 0, crashes on empty string]
  - ROLLBACK: `git checkout src/engines/ContentAutoTaggerEngine.ts`

U-LEARN03: Deduplication Engine
  - Compare incoming tip against existing 3,700+ tips via cosine similarity on TF-IDF vectors
  - Threshold: similarity > 0.85 = duplicate, 0.65-0.85 = related, < 0.65 = novel
  - On duplicate: merge metadata (add source, update confidence), don't create new tip
  - On related: link in knowledge graph as "see also"
  - Return: DeduplicationResult { is_duplicate, similarity_score, existing_tip_id?, action_taken }
  - FILES_CREATED: [src/engines/KnowledgeDeduplicationEngine.ts]
  - ABORT_CRITERIA: [identical tips not flagged as duplicate, all tips flagged as duplicate, similarity score NaN]
  - ROLLBACK: `git checkout src/engines/KnowledgeDeduplicationEngine.ts`

**EXIT GATE LEARN-MS0-S1:**
- [ ] ContentIngestionPipelineEngine routes text to TribalKnowledge
- [ ] Auto-tagger extracts material/operation from natural text
- [ ] Dedup engine detects identical and near-identical tips
- [ ] All pre-existing tests still passing (regression gate)
- [ ] npx tsc --noEmit = 0 errors
- [ ] New tests >= 20 passing
- OMEGA_FLOOR: >= 1.0

### SESSION LEARN-MS0-S2: Dispatcher Wiring + Tests
**SMART CONFIG:** Role=R2-Engine + R3-Wiring | Model=OPUS | Effort=MAX | Context_Budget=60K

**WORK:**
U-LEARN04: Wire to knowledgeDispatcher (or new learnDispatcher)
  - Actions: learn_ingest_text, learn_ingest_video, learn_ingest_document, learn_ingest_url
  - Actions: learn_auto_tag, learn_dedup_check
  - Actions: learn_search_knowledge, learn_get_stats
  - Key-value extractors for all 8 actions
  - Zod schemas for all 8 actions
  - FILES_MODIFIED: [src/tools/dispatchers/knowledgeDispatcher.ts OR new learnDispatcher.ts]
  - ABORT_CRITERIA: [action not in z.enum, lazy import fails, schema validation rejects valid input]

U-LEARN05: Integration tests (20+)
  - Text ingestion: CNC tip → tagged → stored → searchable
  - Duplicate detection: same tip twice → merged
  - Auto-tagging accuracy: "4140 steel at 3000 RPM with a 10mm endmill" → material=4140, rpm=3000, tool_diameter=10
  - Edge cases: empty content, non-CNC text, mixed language
  - FILES_CREATED: [src/__tests__/learn-ingestion-pipeline.test.ts]

U-LEARN06: Tribal knowledge batch import utility
  - Bulk ingest: accept array of tips (for importing from external sources)
  - Progress tracking: { total, processed, duplicates_skipped, new_items, errors }
  - Source attribution: tag all items with source (e.g., "mr.cnc2 Facebook", "Haas YouTube")
  - FILES_MODIFIED: [src/engines/ContentIngestionPipelineEngine.ts]

**EXIT GATE LEARN-MS0-S2:**
- [ ] 8 dispatcher actions working end-to-end
- [ ] Batch import processes 100+ tips in < 10s
- [ ] Source attribution preserved through pipeline
- [ ] All pre-existing tests still passing
- [ ] New tests >= 20 passing
- OMEGA_FLOOR: >= 1.0
- FORGE-TRIPLE: hook=enforce-knowledge-source | action=learn_ingest_text,learn_ingest_video | skill=/ingest

---

# LEARN-MS1: Video + Interactive Learning Wiring
**Sessions: 2 | Units: 5 | Priority: P0 | DEPENDS_ON: LEARN-MS0**
**Revenue tier: PRO — learn from YouTube/shop floor videos**

### SESSION LEARN-MS1-S1: Wire VideoLearningEngine
**SMART CONFIG:** Role=R2-Engine + R3-Wiring | Model=OPUS | Effort=MAX | Context_Budget=80K

**KNOWLEDGE SOURCES:**
- VideoLearningEngine (extractTranscript, extractKeyframes, analyzeFrames, processVideo)
- InteractiveLearningSessionEngine (createSession, submitAction, getClarifyingQuestion)
- Existing video-learned data: data/video-learned/transcripts/ (15+ processed videos)

**INTENT:** User drops a machining video → PRISM extracts transcript + keyframes → generates structured knowledge items → user reviews and corrects → knowledge stored permanently.

**WORK:**
U-LEARN07: Wire VideoLearningEngine to dispatcher
  - Actions: learn_video_process (full pipeline), learn_video_transcript (transcript only), learn_video_keyframes (keyframe analysis only), learn_video_knowledge (extract knowledge items)
  - Lazy import VideoLearningEngine
  - Return structured knowledge items with timestamps and confidence scores
  - FILES_MODIFIED: [src/tools/dispatchers/knowledgeDispatcher.ts or learnDispatcher.ts]
  - ABORT_CRITERIA: [action crashes on valid MP4 path, transcript empty for audio file, keyframes empty for video with scenes]

U-LEARN08: Wire InteractiveLearningSessionEngine to dispatcher
  - Actions: learn_session_create, learn_session_submit, learn_session_clarify, learn_session_summary
  - User reviews extracted actions from video, confirms/corrects, teaches improvements
  - Corrections feed back into confidence scoring
  - FILES_MODIFIED: [src/tools/dispatchers/knowledgeDispatcher.ts or learnDispatcher.ts]
  - ABORT_CRITERIA: [session creation fails, submit crashes, clarification question always empty]

U-LEARN09: Video-to-knowledge integration tests (15+)
  - Transcript extraction from test audio
  - Knowledge item generation from transcript text
  - Interactive session create → submit → summary flow
  - Edge cases: silent video, very short clip, non-English audio
  - FILES_CREATED: [src/__tests__/learn-video-pipeline.test.ts]

### SESSION LEARN-MS1-S2: URL Content Fetching + Social Media
**SMART CONFIG:** Role=R2-Engine | Model=OPUS | Effort=MAX | Context_Budget=60K

**KNOWLEDGE SOURCES:**
- ContentIngestionPipelineEngine (from LEARN-MS0 — routes content to correct engine)
- ContentAutoTaggerEngine (from LEARN-MS0 — NLP entity extraction)
- TribalKnowledgeEngine (captureTip — destination for extracted text tips)
- VideoLearningEngine (processVideo — destination for video URLs)

**INTENT:** User pastes a YouTube URL or a link to a CNC forum post → PRISM auto-detects content type → extracts knowledge → stores with source attribution.

**WORK:**
U-LEARN10: URL Content Extractor
  - Accept URL → detect content type (article, video page, forum post)
  - For articles: extract text → route to text ingestion
  - For video pages (YouTube): extract video ID → route to video pipeline
  - For forum/social posts: extract text + images → route to text + vision analysis
  - HTML cleanup: strip ads, navigation, extract main content
  - FILES_CREATED: [src/engines/URLContentExtractorEngine.ts]

U-LEARN11: Social media post parser
  - Parse CNC-specific social media formats: tips with images, before/after photos, setup photos
  - Extract: text content, image analysis (tool setup, machine config, part photo)
  - Auto-detect: speeds/feeds mentioned, tool info, material info, machine brand
  - Tag with source: "Facebook/mr.cnc2", "Instagram/@cncmachinist", etc.
  - FILES_CREATED: [src/engines/SocialMediaParserEngine.ts]

**EXIT GATE LEARN-MS1:**
- [ ] Video processing extracts transcript and generates knowledge items
- [ ] Interactive sessions allow user correction of extracted knowledge
- [ ] URL extractor handles articles and video page URLs
- [ ] Social media parser extracts CNC-relevant info from posts
- [ ] All pre-existing tests still passing
- [ ] New tests >= 15 passing
- OMEGA_FLOOR: >= 1.0
- FORGE-TRIPLE: hook=enforce-video-quality | action=learn_video_process,learn_session_create | skill=/learn-video

---

# LEARN-MS2: Knowledge Graph Enrichment + Cross-Reference
**Sessions: 2 | Units: 5 | Priority: P1 | DEPENDS_ON: LEARN-MS1**
**Revenue tier: PRODUCTION — connected knowledge is worth more than isolated tips**

### SESSION LEARN-MS2-S1: Graph Enrichment Pipeline
**SMART CONFIG:** Role=R2-Engine | Model=OPUS | Effort=MAX | Context_Budget=80K

**KNOWLEDGE SOURCES:**
- KnowledgeGraphEngine (query, infer, discover, predict, traverse)
- ManufacturingKnowledgeGraphEngine (populateGraph, queryNL, recommend, gapDetect)
- MachiningKnowledgeBaseEngine (Kienzle, Taylor, speed/feed tables)
- ContentAutoTaggerEngine (from LEARN-MS0)

**INTENT:** Every ingested tip automatically links to related materials, tools, machines, operations, and existing tips in the knowledge graph. "When machining Inconel 718..." auto-links to ISO-S material node, nickel alloy properties, recommended tools, existing Inconel tips.

**WORK:**
U-LEARN12: Auto-linking pipeline
  - After ingestion: auto-tagger output → graph node creation → edge creation to existing nodes
  - Edge types: "relates_to_material", "uses_tool", "applies_to_machine", "conflicts_with", "supports"
  - Conflict detection: new tip contradicts existing tip → flag for review
  - FILES_MODIFIED: [src/engines/ContentIngestionPipelineEngine.ts]

U-LEARN13: Knowledge gap detection
  - Analyze graph: which material/operation/machine combos have < 3 tips?
  - Generate "wanted" list: "We have 47 tips for 4140 Steel milling but 0 for 4140 boring"
  - Prioritize gaps by usage frequency (which combos are most commonly queried?)
  - FILES_MODIFIED: [src/engines/ManufacturingKnowledgeGraphEngine.ts]

U-LEARN14: Cross-reference enrichment
  - Link tribal tips to formulas: "reduce feed in corners" → links to Kienzle force model showing WHY
  - Link tips to playbook rules: correlate tribal knowledge with MachiningPlaybookEngine's 296 rules
  - Validate tips against physics: "I run 316L at 5000 RPM with 12mm endmill" → Vc = 188 m/min → check if reasonable
  - MANDATORY: import kc1.1, Taylor C/n, Vc limits from src/physics/constants.ts — NEVER inline
  - Safety hook: tips that violate machine limits or produce Fc > spindle capacity get flagged "unverified"
  - FILES_CREATED: [src/engines/KnowledgePhysicsValidatorEngine.ts]

### SESSION LEARN-MS2-S2: Search + Recommendations
**SMART CONFIG:** Role=R2-Engine | Model=OPUS | Effort=MAX | Context_Budget=60K

**KNOWLEDGE SOURCES:**
- KnowledgeQueryEngine (unifiedSearch, crossRegistryQuery, formulaQuery)
- ManufacturingKnowledgeGraphEngine (queryNL, recommend, gapDetect)
- MachiningPlaybookEngine (296 rules — correlate with tips)
- SpeedFeedOrchestratorEngine (validate tip parameters against physics)
- src/physics/constants.ts (canonical Kienzle kc1.1, Taylor C/n for validation)

**INTENT:** Machinist asks "what should I watch out for when machining Inconel?" → gets unified results from tribal tips, playbook anti-patterns, physics warnings, and relevant training videos — all from one search.

**WORK:**
U-LEARN15: Enhanced knowledge search
  - Semantic search across ALL knowledge sources: tribal tips + playbook rules + formulas + videos
  - Query: "how to avoid chatter in thin walls" → returns tips + playbook rules + SLD formula reference
  - Ranking: relevance + recency + source credibility + validation status
  - FILES_MODIFIED: [src/engines/KnowledgeQueryEngine.ts]

U-LEARN16: Context-aware recommendations
  - Given current job (material + tool + machine + operation) → recommend relevant tips
  - "You're machining 7075-T6 with a 10mm endmill on a Haas VF-2. Here are 12 relevant tips from the knowledge base."
  - Include physics validation: only recommend tips that pass physics sanity check
  - FILES_MODIFIED: [src/engines/ManufacturingKnowledgeGraphEngine.ts]

**EXIT GATE LEARN-MS2:**
- [ ] Ingested tips auto-link to knowledge graph nodes
- [ ] Gap detection identifies missing material/operation combos
- [ ] Physics validation catches physically impossible tips
- [ ] Semantic search returns relevant results across all knowledge sources
- [ ] All pre-existing tests still passing
- [ ] New tests >= 15 passing
- OMEGA_FLOOR: >= 1.0
- FORGE-TRIPLE: hook=enforce-knowledge-link | action=learn_search_knowledge,learn_gap_detect | skill=/knowledge-search

---

# LEARN-MS3: Course Auto-Generation
**Sessions: 2 | Units: 5 | Priority: P1 | DEPENDS_ON: LEARN-MS2**
**Revenue tier: PRODUCTION — training content sells**

### SESSION LEARN-MS3-S1: Wire Course Generation Pipeline
**SMART CONFIG:** Role=R2-Engine + R7-Product | Model=OPUS | Effort=MAX | Context_Budget=80K

**KNOWLEDGE SOURCES:**
- CourseBuilderEngine (buildCourseFromTribalTips, buildCourseFromPlaybookRules, generateQuiz)
- KnowledgeCurriculumBridgeEngine (generateProblemFromTribal, adaptDifficulty)
- LearningProgressionEngine (createCourse, enrollStudent, submitCheckpoint)

**INTENT:** PRISM auto-generates training courses from accumulated knowledge. "Generate a course on machining stainless steel" → 8 modules with lessons, quizzes, and practice problems drawn from tribal tips, playbook rules, and physics formulas.

**WORK:**
U-LEARN17: Wire CourseBuilderEngine fully to dispatcher
  - Actions: learn_course_generate, learn_course_catalog, learn_course_pricing
  - Auto-generate from: topic + material + difficulty → structured course
  - Include: tribal tips as case studies, playbook rules as "do/don't" lessons, physics as theory
  - FILES_MODIFIED: [src/tools/dispatchers/knowledgeDispatcher.ts]

U-LEARN18: Wire KnowledgeCurriculumBridgeEngine to dispatcher
  - Actions: learn_quiz_generate, learn_problem_generate, learn_difficulty_adapt
  - Auto-generate practice problems: "What feed rate for 4140 steel with 10mm endmill?" with physics-backed answer
  - Adaptive difficulty: easier for beginners, harder for experienced machinists
  - FILES_MODIFIED: [src/tools/dispatchers/knowledgeDispatcher.ts]

U-LEARN19: Course generation integration tests (15+)
  - Generate course from topic → verify modules have content
  - Quiz generation → verify answers are physics-correct
  - Difficulty adaptation → verify scaling
  - FILES_CREATED: [src/__tests__/learn-course-generation.test.ts]

### SESSION LEARN-MS3-S2: Source-Specific Courses
**SMART CONFIG:** Role=R2-Engine | Model=OPUS | Effort=MAX | Context_Budget=60K

**KNOWLEDGE SOURCES:**
- CourseBuilderEngine (buildCourseFromTribalTips — source filtering)
- TribalKnowledgeEngine (search by source tag)
- data/video-learned/transcripts/ (15+ video transcripts with source attribution)
- LearningProgressionEngine (course enrollment and progression tracking)

**INTENT:** Shop owner says "Build me a training course from all the mr.cnc2 tips we ingested" → PRISM filters by source → generates a structured course with quizzes → exports as printable PDF or web module.

**WORK:**
U-LEARN20: Source-attributed course generation
  - "Generate a course from all mr.cnc2 tips" → filters by source → builds course from that subset
  - "Generate a course from Haas training videos" → uses video-learned knowledge items
  - Source mixing: combine tips from multiple sources into unified curriculum
  - FILES_MODIFIED: [src/engines/CourseBuilderEngine.ts]

U-LEARN21: Course export formats
  - Markdown: printable course document
  - JSON: structured data for web UI
  - SCORM: industry-standard e-learning format (basic compliance)
  - FILES_MODIFIED: [src/engines/CourseBuilderEngine.ts]

**EXIT GATE LEARN-MS3:**
- [ ] Course generation produces structured modules from tribal tips
- [ ] Quiz answers are physics-validated
- [ ] Source-specific courses filter correctly
- [ ] Export works in markdown and JSON formats
- [ ] All pre-existing tests still passing
- [ ] New tests >= 15 passing
- OMEGA_FLOOR: >= 1.0
- FORGE-TRIPLE: hook=enforce-course-quality | action=learn_course_generate,learn_quiz_generate | skill=/generate-course

---

# LEARN-MS4: Feedback Loop + Fleet Learning Wiring
**Sessions: 1 | Units: 4 | Priority: P2 | DEPENDS_ON: LEARN-MS2**
**Revenue tier: ENTERPRISE — continuous improvement across machine fleet**

### SESSION LEARN-MS4-S1: Wire Remaining Learning Engines
**SMART CONFIG:** Role=R2-Engine + R3-Wiring | Model=OPUS | Effort=MAX | Context_Budget=80K

**KNOWLEDGE SOURCES:**
- MachineLearningFeedbackEngine (recordMeasurement, autoCalibrate, detectDrift)
- TransferLearningEngine (machineSimilarity, scaleParameters, gpTransfer)
- FleetDeploymentLearningEngine (getFleetStatus, generateUpdatePlan, ingestFeedback)

**INTENT:** Shops run parts → measure results → feed back to PRISM → physics coefficients auto-calibrate → next recommendation is more accurate. Cross-machine: "Your Haas VF-2 learning transfers to your new Haas VF-4."

**WORK:**
U-LEARN22: Wire MachineLearningFeedbackEngine to dispatcher
  - Actions: learn_record_measurement, learn_auto_calibrate, learn_detect_drift, learn_get_profile
  - Ingest: CMM data, micrometer readings, surface finish measurements
  - Output: updated kc1.1, Taylor C/n, Ra bias per machine
  - MANDATORY: calibrated values bounded by ±30% of canonical constants from src/physics/constants.ts
  - Safety: auto-calibration NEVER produces values that would exceed machine limits or violate safety thresholds
  - FILES_MODIFIED: [src/tools/dispatchers/knowledgeDispatcher.ts]

U-LEARN23: Wire TransferLearningEngine to dispatcher
  - Actions: learn_transfer_params, learn_machine_similarity, learn_validate_transfer
  - Cross-machine: transfer learned coefficients from Machine A to similar Machine B
  - Physics-informed scaling (power ratio, stiffness ratio, spindle taper)
  - FILES_MODIFIED: [src/tools/dispatchers/knowledgeDispatcher.ts]

U-LEARN24: Wire FleetDeploymentLearningEngine to dispatcher
  - Actions: learn_fleet_status, learn_fleet_update_plan, learn_fleet_feedback
  - Fleet overview: which machines have learned what, version tracking
  - Update planning: prioritize calibration for underperforming machines
  - FILES_MODIFIED: [src/tools/dispatchers/knowledgeDispatcher.ts]

U-LEARN25: Feedback loop integration tests (15+)
  - Record measurement → auto-calibrate → verify coefficient update
  - Transfer learning → verify parameter scaling between similar machines
  - Fleet status → verify machine inventory and learning state
  - FILES_CREATED: [src/__tests__/learn-feedback-fleet.test.ts]

**EXIT GATE LEARN-MS4:**
- [ ] Measurement recording updates machine profile
- [ ] Auto-calibration adjusts physics coefficients
- [ ] Transfer learning scales parameters between similar machines
- [ ] Fleet status reports accurate machine inventory
- [ ] All pre-existing tests still passing
- [ ] New tests >= 15 passing
- OMEGA_FLOOR: >= 1.0
- FORGE-TRIPLE: hook=enforce-calibration-safety | action=learn_record_measurement,learn_auto_calibrate | skill=/calibrate-machine

---

# LEARN-MS5: Web UI — Ingestion + Knowledge Browser + Course Viewer
**Sessions: 2 | Units: 5 | Priority: P1 | DEPENDS_ON: LEARN-MS3 + LEARN-MS4**
**Revenue tier: PRO — the interface that makes knowledge accessible**

### SESSION LEARN-MS5-S1: Knowledge Ingestion Page
**SMART CONFIG:** Role=R5-Frontend + R7-Product | Model=OPUS | Effort=MAX | Context_Budget=80K

**INTENT:** One page: paste a tip, drop a video, upload a document, paste a URL → watch PRISM learn it in real-time. Knowledge browser: search, filter, explore the graph visually.

**WORK:**
U-LEARN26: KnowledgeIngestionPage.tsx
  - 4 input modes: Text (paste box), Video (file drop), Document (file upload), URL (paste)
  - Real-time feedback: "Extracted 3 tips, tagged as 4140 Steel + milling, linked to 7 existing tips"
  - Source attribution field: "Where did this come from?" (optional)
  - Bulk mode: paste multiple tips separated by newlines
  - FILES_CREATED: [web/src/pages/KnowledgeIngestionPage.tsx]

U-LEARN27: KnowledgeBrowserPage.tsx
  - Search bar with faceted filters (material, operation, machine, source, confidence)
  - Results: tip cards with tags, source, confidence score, linked knowledge
  - Knowledge graph visualization (force-directed graph of connected tips)
  - Stats dashboard: total tips, coverage by material/operation, gap analysis
  - FILES_CREATED: [web/src/pages/KnowledgeBrowserPage.tsx]

U-LEARN28: Route wiring + navigation
  - /knowledge/ingest route → KnowledgeIngestionPage
  - /knowledge/browse route → KnowledgeBrowserPage
  - Add to sidebar navigation under "Knowledge" section
  - FILES_MODIFIED: [web/src/components/shell/shellCatalog.ts, web/src/routes/]

### SESSION LEARN-MS5-S2: Course Viewer + Fleet Dashboard
**SMART CONFIG:** Role=R5-Frontend | Model=OPUS | Effort=MAX | Context_Budget=60K

**KNOWLEDGE SOURCES:**
- CourseBuilderEngine (getCatalog, getPricingTiers — course data for UI)
- LearningProgressionEngine (enrollment, checkpoints — progress tracking for UI)
- MachineLearningFeedbackEngine (getProfile, detectDrift — fleet learning state for dashboard)
- FleetDeploymentLearningEngine (getFleetStatus — machine inventory for dashboard)
- TransferLearningEngine (machineSimilarity — transfer suggestions for dashboard)

**INTENT:** Training manager browses auto-generated courses, assigns them to operators, tracks completion. Fleet manager sees which machines have self-calibrated, which need recalibration, and which can inherit settings from similar machines.

**WORK:**
U-LEARN29: CourseViewerPage.tsx
  - Course catalog: browse auto-generated courses by topic/difficulty
  - Course detail: modules → lessons → quizzes → progress tracking
  - Quiz interface: multiple choice + fill-in + physics-calculation questions
  - Certificate: completion badge with score
  - FILES_CREATED: [web/src/pages/CourseViewerPage.tsx]

U-LEARN30: FleetLearningDashboard.tsx (widget or page)
  - Per-machine learning state: "Haas VF-2 — 23 measurements, kc1.1 calibrated to 1842 (was 1800)"
  - Drift alerts: "Mazak VCN-530C showing 8% force over-prediction — recalibration recommended"
  - Transfer suggestions: "New DMG DMU-50 can inherit 89% of settings from existing VF-2"
  - FILES_CREATED: [web/src/pages/FleetLearningDashboardPage.tsx]

**EXIT GATE LEARN-MS5:**
- [ ] User can paste a CNC tip → see it stored with auto-tags
- [ ] Knowledge browser returns search results with faceted filtering
- [ ] Course viewer shows auto-generated courses with quizzes
- [ ] Fleet dashboard shows per-machine learning state
- [ ] All pre-existing tests still passing
- [ ] Web build succeeds
- OMEGA_FLOOR: >= 1.0
- FORGE-TRIPLE: hook=enforce-knowledge-ui | action=learn_search_knowledge | skill=/knowledge

---

## MILESTONE SUMMARY

| ID | Title | Sessions | Units | Tier | Status |
|----|-------|----------|-------|------|--------|
| LEARN-MS0 | Content Ingestion Pipeline | 2 | 6 | PRO | not_started |
| LEARN-MS1 | Video + Interactive Learning | 2 | 5 | PRO | not_started |
| LEARN-MS2 | Knowledge Graph Enrichment | 2 | 5 | PRODUCTION | not_started |
| LEARN-MS3 | Course Auto-Generation | 2 | 5 | PRODUCTION | not_started |
| LEARN-MS4 | Feedback + Fleet Learning | 1 | 4 | ENTERPRISE | not_started |
| LEARN-MS5 | Web UI — Ingestion + Browser | 2 | 5 | PRO | not_started |
| **TOTAL** | | **11** | **30** | | |

## ENFORCEMENT HOOKS ACTIVE DURING EXECUTION
- Physics agent reviews every engine for formula correctness
- Constants checker blocks inline physics values
- Stub detector blocks placeholder returns
- Wiring agent verifies MCP readiness
- Test quality blocks `|| true` and bare `.includes()`
- Auto-compact at 15/25/35 edit thresholds
- Forge-triple gate blocks compaction without hook + action + skill

## FEATURE CASCADE (cumulative new artifacts)

| Milestone | NEW_ENGINES | NEW_ACTIONS | NEW_HOOKS | NEW_SKILLS |
|-----------|-------------|-------------|-----------|------------|
| LEARN-MS0 | ContentIngestionPipelineEngine, ContentAutoTaggerEngine, KnowledgeDeduplicationEngine | learn_ingest_text, learn_ingest_video, learn_ingest_document, learn_ingest_url, learn_auto_tag, learn_dedup_check, learn_search_knowledge, learn_get_stats (8) | enforce-knowledge-source | /ingest |
| LEARN-MS1 | URLContentExtractorEngine, SocialMediaParserEngine | learn_video_process, learn_video_transcript, learn_video_keyframes, learn_video_knowledge, learn_session_create, learn_session_submit, learn_session_clarify, learn_session_summary (8) | enforce-video-quality | /learn-video |
| LEARN-MS2 | KnowledgePhysicsValidatorEngine | learn_gap_detect, learn_validate_physics (2) | enforce-knowledge-link | /knowledge-search |
| LEARN-MS3 | — (wire existing) | learn_course_generate, learn_course_catalog, learn_course_pricing, learn_quiz_generate, learn_problem_generate, learn_difficulty_adapt (6) | enforce-course-quality | /generate-course |
| LEARN-MS4 | — (wire existing) | learn_record_measurement, learn_auto_calibrate, learn_detect_drift, learn_get_profile, learn_transfer_params, learn_machine_similarity, learn_validate_transfer, learn_fleet_status, learn_fleet_update_plan, learn_fleet_feedback (10) | enforce-calibration-safety | /calibrate-machine |
| LEARN-MS5 | — (frontend only) | — (uses existing actions) | enforce-knowledge-ui | /knowledge |
| **TOTAL** | **5 new engines** | **34 new actions** | **6 new hooks** | **6 new skills** |

## CROSS-ROADMAP INTEGRATION POINTS
- **PP-REV**: OptimizationReportEngine can reference ingested tribal tips in recommendations
- **SpeedFeedOrchestrator**: MachineLearningFeedbackEngine calibration feeds directly into S/F calculations
- **MachiningPlaybookEngine**: New ingested tips auto-correlate with existing 296 playbook rules
- **PostProcessorPipeline**: Fleet learning calibrations improve per-block physics (Stage 1.1 Kienzle)

## ESTIMATED VALUE
- **LEARN-MS0 alone** (content ingestion) makes PRISM the only post-processor that learns
- **LEARN-MS0 + MS1** (+ video learning) captures knowledge from YouTube/social media — no competitor does this
- **LEARN-MS2 + MS3** (graph + courses) auto-generates training content — monetizable as standalone product
- **LEARN-MS4** (fleet learning) is unique — self-calibrating physics across machine fleets
- **LEARN-MS5** (web UI) makes it all accessible to non-technical shop personnel
