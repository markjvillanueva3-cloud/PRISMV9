# CC-EXT Architecture — Cross-Source Knowledge Synthesis

## System Overview

CC-EXT is a 5-engine pipeline that extracts machining knowledge from multiple sources, synthesizes it with confidence scoring and conflict resolution, and produces a queryable knowledge graph.

## Data Flow

```
PDF/Manual ──→ [MS1: PDF Extraction] ──→ KnowledgeEntry ─┐
Operator FB ──→ [MS2: Feedback Loop] ──→ ConsensusResult ─┤
Sensor Data ──→ [MS3: Sensor Learn]  ──→ CorrelationResult┤
CMM/Quality ──→ [MS4: Quality FB]    ──→ Predictions ─────┘
                                                           │
                              ┌─────────────────────────────┘
                              ▼
                    [MS5: Cross-Source Synthesis]
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        Source Adapters  Confidence     Conflict
        (4 adapters)     Scorer (6F)   Resolver (5S)
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                    UnifiedKnowledgeStore
                              │
                              ▼
                    KnowledgeGraph
                    (Nodes + Edges)
                              │
                    ┌─────────┼──────────┐
                    ▼         ▼          ▼
              Recommend  Path Query  Gap Detect
```

## Engine Descriptions

### MS1: PDF/Manual Knowledge Extraction
- **Input**: PDF files (catalogs, handbooks, manuals)
- **Output**: `KnowledgeEntry` with `entry_id`, `knowledge_type`, `material`, `operation`, `value`, `confidence`
- **Key modules**: `pdf_ingestion.py`, `table_extractor.py`, `param_parser.py`, `catalog_extractor.py`

### MS2: Operator Feedback Loop
- **Input**: `OperatorFeedback` (operator observations + parameter modifications)
- **Output**: `ConsensusResult` with `recommended_params` (weighted mean/stddev per parameter)
- **Key modules**: `feedback_schema.py`, `consensus_builder.py`, `conflict_resolver.py`, `experience_scorer.py`

### MS3: Sensor-Based Learning
- **Input**: `SensorStream` (vibration, power, temperature, AE channels)
- **Output**: `CorrelationResult`, `WearPrediction`, `AnomalyReport`
- **Key modules**: `sensor_ingestion.py`, `signal_processor.py`, `anomaly_detector.py`, `condition_correlator.py`, `wear_predictor.py`

### MS4: Quality Feedback Learning
- **Input**: CMM inspection data (DMIS/QIF format)
- **Output**: `TolerancePrediction`, `SurfaceFinishPrediction`, `DimensionalPrediction`
- **Key modules**: `cmm_importer.py`, `tolerance_correlator.py`, `surface_finish_model.py`, `dimensional_accuracy.py`

### MS5: Cross-Source Synthesis
- **Components**:
  - `source_aggregator.py` — 4 source adapters, UnifiedEntry normalization, dedup
  - `confidence_scorer.py` — 6-factor weighted scoring (source count, authority, diversity, recency, consistency, physics)
  - `cross_source_resolver.py` — 5-strategy resolution hierarchy (physics > sensor > consensus > confidence > escalate)
  - `knowledge_graph.py` — Typed graph with recommend(), path_query(), gap detection, JSON persistence

## Key Data Types

| Type | Module | Description |
|------|--------|-------------|
| `UnifiedEntry` | source_aggregator | Normalized knowledge entry from any source |
| `SourceProvenance` | source_aggregator | Tracks origin (source_type, source_id, date, confidence) |
| `ConfidenceScore` | confidence_scorer | Total score + 6-factor breakdown |
| `ConflictEntry` | cross_source_resolver | Pair of conflicting entries with severity |
| `ResolutionResult` | cross_source_resolver | Conflict resolution with strategy and winner |
| `GraphNode` | knowledge_graph | Material, Tool, Operation, Parameter, Quality, Machine |
| `GraphEdge` | knowledge_graph | requires, produces, affects, correlates, recommends, used_in |
| `Recommendation` | knowledge_graph | Parameter recommendation with confidence |

## Confidence Scoring (6 Factors)

| Factor | Weight | Description |
|--------|--------|-------------|
| Source Count | 0.20 | 1 source=0.3, 2=0.6, 3+=0.9 |
| Source Authority | 0.25 | CMM=0.90, PDF=0.85, Sensor=0.80, Operator=0.70 |
| Source Diversity | 0.15 | Different source types count more |
| Recency | 0.10 | Linear decay over max_age_days |
| Consistency | 0.15 | Low variance across source confidences |
| Physics | 0.15 | Agreement with physics models |

**Thresholds**: High >= 0.8 (auto-approve), Low < 0.4 (quarantine)

## Conflict Resolution Hierarchy

1. **Physics Arbitration** — Entry closer to physics model wins
2. **Sensor Precedence** — Sensor data (confidence >= 0.7) beats static PDF
3. **Multi-Source Consensus** — More supporting sources wins (min 2)
4. **Highest Confidence** — Higher scored entry wins (min 0.05 gap)
5. **Escalate** — Quarantined for human review

## File Locations

```
cad-engine/src/synthesis/
  __init__.py              # Package exports
  source_aggregator.py     # Adapters + UnifiedKnowledgeStore + SourceAggregator
  confidence_scorer.py     # ConfidenceScorer + PhysicsValidator interface
  cross_source_resolver.py # CrossSourceResolver + ConflictReport
  knowledge_graph.py       # KnowledgeGraph + queries + persistence

cad-engine/tests/
  test_source_aggregator.py      # 27 unit tests
  test_confidence_scorer.py      # 12 unit tests
  test_cross_source_resolver.py  # 15 unit tests
  test_knowledge_graph.py        # 26 unit tests
  integration/test_synthesis_e2e.py  # 14 integration tests
  e2e/test_ccext_pipeline.py     # 25 E2E tests (3 scenarios)
  e2e/test_ccext_safety.py       # 22 safety tests
  e2e/test_ccext_performance.py  # 12 performance benchmarks
```
