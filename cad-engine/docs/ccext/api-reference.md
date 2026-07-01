# CC-EXT API Reference

## MS1: PDF Extraction (`src/extraction/`)

### pdf_ingestion.PdfIngestion
- `ingest(path: str) -> PdfDocument`: Load PDF, extract text and structure
- `extract_pages(doc, start, end) -> list[PageContent]`: Extract page range

### table_extractor.TableExtractor
- `extract_tables(page: PageContent) -> list[Table]`: Detect and parse tables
- `to_dataframe(table: Table) -> dict`: Convert to row/column dict

### param_parser.ParamParser
- `parse(text: str, material: str) -> list[KnowledgeEntry]`: Extract cutting parameters
- `parse_speed_feed(text: str) -> dict`: Parse speed/feed tables

### catalog_extractor.CatalogExtractor
- `extract(doc: PdfDocument) -> list[KnowledgeEntry]`: Full catalog extraction pipeline

### physics_validator.PhysicsValidator
- `validate(entry: KnowledgeEntry) -> ValidationResult`: Check against physics bounds

---

## MS2: Operator Feedback (`src/feedback/`)

### feedback_api.FeedbackApi
- `submit(entry: FeedbackEntry) -> str`: Submit operator feedback, returns entry_id
- `query(material, operation) -> list[FeedbackEntry]`: Query stored feedback
- `get_audit_trail(entry_id) -> list[AuditEvent]`: Full history for an entry

### consensus_builder.ConsensusBuilder
- `build(entries: list[FeedbackEntry]) -> ConsensusResult`: Weighted averaging with outlier detection
- `group_by_context(entries) -> dict[str, list]`: Group by material/operation

### conflict_resolver.ConflictResolver
- `detect(entries: list) -> list[Conflict]`: Find parameter conflicts
- `resolve(conflict: Conflict) -> Resolution`: Apply resolution strategy

### kb_updater.KbUpdater
- `update(consensus: ConsensusResult, mode: str) -> UpdateResult`: Apply KB update
- `rollback(version: int) -> bool`: Rollback to previous version
- Modes: `merge`, `replace`, `append`, `validate_only`

### experience_scorer.ExperienceScorer
- `score(operator: OperatorProfile) -> float`: 4-factor score (years, specialization, accuracy, consistency)

### feedback_metrics.FeedbackMetrics
- `per_operator(operator_id) -> OperatorMetrics`: Per-operator statistics
- `system_metrics() -> SystemMetrics`: System-wide metrics with anomaly detection

---

## MS3: Sensor Learning (`src/sensors/`)

### sensor_ingestion.SensorIngestion
- `ingest(source: str, protocol: str) -> SensorStream`: MTConnect/OPC-UA/CSV
- `configure(channels: list[str], sample_rate: int)`: Set up channels

### signal_processor.SignalProcessor
- `process(stream: SensorStream) -> FeatureSet`: Time + frequency domain features
- `extract_features(window: ndarray) -> dict`: Per-window feature extraction

### anomaly_detector.AnomalyDetector
- `detect(features: FeatureSet) -> list[AnomalyReport]`: Detect chatter/breakage/thermal/power
- `cusum_drift(signal: ndarray) -> DriftResult`: CUSUM drift detection

### condition_correlator.ConditionCorrelator
- `correlate(features, params) -> list[Correlation]`: vibration->DOC, power->MRR
- `predict_surface_quality(features) -> float`: Surface quality from vibration

### wear_predictor.WearPredictor
- `predict(features, params) -> WearPrediction`: Hybrid Taylor+sensor wear model
- `remaining_life(current_wear) -> float`: Estimated remaining tool life

### stream_simulator.StreamSimulator
- `simulate(scenario: dict) -> SensorStream`: Generate synthetic sensor data

---

## MS4: Quality Feedback (`src/quality/`)

### cmm_importer.CmmImporter
- `import_dmis(path: str) -> InspectionData`: Import DMIS format
- `import_qif(path: str) -> InspectionData`: Import QIF format

### inspection_schema.InspectionSchema
- Schema definitions for inspection features, measurements, tolerances

### tolerance_correlator.ToleranceCorrelator
- `correlate(data, params) -> TolerancePrediction`: IT grade prediction
- `sensitivity_analysis(param) -> SensitivityResult`: Parameter sensitivity

### surface_finish_model.SurfaceFinishModel
- `predict(params) -> SurfacePrediction`: Theoretical Ra + corrections (BUE/chatter/thermal)
- `update_factors(measured: float, predicted: float)`: Learn correction factors

### dimensional_accuracy.DimensionalAccuracy
- `predict(params) -> DimensionalPrediction`: Thermal + deflection + positioning
- `combine_errors(sources: list) -> float`: RSS error combination

---

## MS5: Cross-Source Synthesis (`src/synthesis/`)

### source_aggregator.SourceAggregator
- `aggregate(sources: dict[SourceType, list]) -> UnifiedKnowledgeStore`: Normalize and merge
- `aggregate(..., store=existing) -> UnifiedKnowledgeStore`: Incremental merge

### confidence_scorer.ConfidenceScorer
- `score(entry: UnifiedEntry) -> ConfidenceScore`: 6-factor weighted score
- `score_batch(entries: list) -> list[ConfidenceScore]`: Batch scoring

### cross_source_resolver.CrossSourceResolver
- `resolve_all(store: UnifiedKnowledgeStore) -> ConflictReport`: Detect + resolve all conflicts
- Resolution hierarchy: physics > multi-source consensus > highest-confidence > newest > escalate

### knowledge_graph.KnowledgeGraph
- `build_from_entries(entries: list[UnifiedEntry])`: Build graph
- `recommend(material, operation) -> list[Recommendation]`: Get recommendations
- `find_knowledge_gaps() -> list[Gap]`: Detect coverage gaps
- `compute_stats() -> GraphStats`: Node/edge counts, coverage metrics
- `to_dict() -> dict` / `from_dict(data) -> KnowledgeGraph`: Serialization
