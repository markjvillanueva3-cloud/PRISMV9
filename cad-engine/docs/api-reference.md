# CAD Engine API Reference

## Module: feature_analyze

### FeatureAnalyzer
Extracts geometric features from part descriptions for manufacturability validation.

```python
analyzer = FeatureAnalyzer(material="steel")
result = analyzer.analyze(part_id, features_list)
```

**Constructor:**
- `material` (str): Material name (e.g., "steel", "aluminum", "titanium")

**Methods:**
- `analyze(part_id: str, features: list[dict]) -> FeatureAnalysisResult`
  - `features`: List of dicts with keys: `type`, `dimensions`, `tolerances` (optional), `position` (optional)
  - Supported types: hole, pocket, slot, wall, boss, fillet, chamfer, thread, counterbore, countersink, groove, face, step

### FeatureAnalysisResult
- `part_id: str` — Part identifier
- `feature_count: int` — Number of features
- `features: list[GeometricFeature]` — Extracted features
- `bounding_box: tuple[float, float, float]` — Part bounding box (x, y, z)
- `material: str` — Material name
- `features_by_type(ftype: FeatureType) -> list[GeometricFeature]`
- `critical_features -> list[GeometricFeature]` — Features with tight tolerances
- `to_dict() -> dict` — Serialize to dictionary

---

## Module: mfg_checker

### ManufacturabilityChecker
Validates features against machine envelope, tool library, and material properties. **S(x) >= 0.70 hard block enforced.**

```python
checker = ManufacturabilityChecker(material="steel")
report = checker.validate(analysis)
```

**Constructor:**
- `material` (str): Material name
- `machine_envelope` (dict, optional): Machine limits (x, y, z, max_rpm, etc.)
- `available_tools` (list[float], optional): Available tool diameters
- `available_drills` (list[float], optional): Available drill diameters

**Methods:**
- `validate(analysis: FeatureAnalysisResult) -> ManufacturabilityReport`

### ManufacturabilityReport
- `part_id: str` — Part identifier
- `overall_safety_score: float` — S(x) safety score (0.0-1.0)
- `is_manufacturable: bool` — Whether part passes all checks
- `blocked: bool` — True if S(x) < 0.70
- `block_reason: str` — Reason for blocking
- `feature_validations: list[FeatureValidation]` — Per-feature results
- `total_checks: int` / `passed_checks: int` — Check counts
- `to_dict() -> dict` — Serialize to dictionary

**5 Validation Checks (each 0.20 weight):**
1. `tool_available` — Matching tool exists in library
2. `depth_ok` — Depth within L/D ratio limits
3. `tolerance_capable` — Process can achieve required tolerance
4. `material_ok` — Material machinability adequate
5. `aspect_ratio_ok` — Feature aspect ratio within capability

---

## Module: cam_safety_overlay

### CAMSafetyOverlay
Cross-references CAM parameters against Kienzle force model limits. **S(x) >= 0.70 hard block enforced.**

```python
overlay = CAMSafetyOverlay(max_spindle_power_kw=15.0, max_spindle_rpm=12000)
sv = overlay.validate_strategy(strategy_id, material, operation_type, ...)
report = overlay.validate_all(strategies_list)
```

**Constructor:**
- `max_spindle_power_kw` (float): Spindle power limit (default: 15.0)
- `max_spindle_rpm` (int): Spindle RPM limit (default: 12000)
- `max_cutting_force_N` (float): Force limit (default: 5000.0)
- `fixture_rigidity` (float): Fixture factor 0.0-1.0 (default: 1.0)

**Methods:**
- `validate_strategy(strategy_id, material, operation_type, tool_diameter, ...) -> StrategyValidation`
- `validate_all(strategies: list[dict]) -> CAMSafetyReport`

### StrategyValidation
- `strategy_id: str` — Strategy identifier
- `cutting_force_N: float` — Computed Kienzle cutting force
- `cutting_power_kW: float` — Computed cutting power
- `safety_score: float` — S(x) score
- `is_safe: bool` — True if S(x) >= 0.70
- `checks: list[ParameterCheck]` — Individual parameter checks
- `to_dict() -> dict`

**6 Parameter Checks:**
1. `surface_speed` — Within material speed range
2. `feed_per_tooth` — Within operation feed range
3. `spindle_rpm` — Within machine RPM limit
4. `cutting_force` — Kienzle force within fixture limit
5. `cutting_power` — Within spindle power limit
6. `doc_ratio` — Depth-of-cut ratio within operation limits

---

## Module: shop_safety_validator

### ShopSafetyValidator
Validates shop practices against physics and safety constraints. **S(x) >= 0.70 hard block enforced.**

```python
validator = ShopSafetyValidator(machine_max_rpm=12000)
pv = validator.validate_practice(practice_dict)
report = validator.validate_all(practices_list)
```

**Constructor:**
- `machine_max_rpm` (int): Machine RPM limit (default: 12000)
- `machine_max_power_kw` (float): Machine power limit (default: 15.0)

**Methods:**
- `validate_practice(practice: dict) -> PracticeValidation`
  - Practice dict keys: `practice_id`, `title`, `category`, `description`, `steps`, `warnings`, `applicable_materials`
- `validate_all(practices: list[dict]) -> ShopSafetyReport`

### Validation Rules
1. **Unsafe keywords** — "remove guard", "bypass interlock", etc. (critical, -0.50)
2. **Missing warnings** — Risky operations without safety warnings (minor, -0.05)
3. **RPM limits** — Checked against material-safe RPM tables (major, -0.30)
4. **DOC limits** — Depth-of-cut checked against material limits (major, -0.25)
5. **Coolant requirements** — Dry machining forbidden for titanium/inconel/stainless (critical, -0.50)
6. **Contradictory steps** — "increase speed" + "reduce speed" (minor, -0.10)

---

## Module: nl_query

### NLQueryHandler
Cross-domain natural language query handler. Classifies operator queries by domain and intent.

```python
handler = NLQueryHandler()
response = handler.handle("Draw me a bearing block")
# or step-by-step:
classification = handler.classify(query)
response = handler.route(classification)
```

**Methods:**
- `classify(query: str) -> QueryClassification` — Classify domain + intent
- `route(classification: QueryClassification) -> QueryResponse` — Route and respond
- `handle(query: str) -> QueryResponse` — Full pipeline (classify + route)

### QueryDomain
`CAD`, `CAM`, `SHOP`, `TROUBLESHOOT`, `GENERAL`

### QueryIntent
`DRAW`, `EXPLAIN`, `RECOMMEND`, `TROUBLESHOOT`, `SETUP`, `COMPARE`, `CALCULATE`, `TEACH`, `LOOKUP`

---

## Module: guidance_gen

### GuidanceGenerator
Generates platform-specific step-by-step guidance with menu paths.

```python
gen = GuidanceGenerator()
doc = gen.generate_cad_guidance(operation="extrude", parameters={"depth": 20.0}, platform="solidworks")
doc = gen.generate_cam_guidance(strategy_type="adaptive", parameters={...}, platform="mastercam", material="steel")
```

**Supported CAD Platforms:** SolidWorks, Fusion 360, CATIA, NX, Creo
**Supported CAM Platforms:** Mastercam, hyperMILL, PowerMill, Fusion CAM, ESPRIT

---

## Module: teach_me

### TeachMeMode
On-demand learning pipeline: URL -> ingest -> extract -> validate -> store -> report.

```python
tm = TeachMeMode()
report = tm.run_full_pipeline(url="https://...", content_text="...", title="...")
# or step-by-step:
report = tm.start_pipeline(url, title)
report = tm.extract_knowledge(report, content_text)
report = tm.validate_knowledge(report)
report = tm.finalize(report)
```

### LearningReport
- `source_url: str` — Source URL
- `content_type: str` — "video", "document", "webpage"
- `domains_covered: list[str]` — Detected domains
- `extracted_count: int` — Total extracted knowledge items
- `validated_count: int` — Items passing validation
- `rejected_count: int` — Items failing validation
- `pipeline_status: str` — "pending", "extracting", "validating", "complete", "failed"
- `to_dict() -> dict`

---

## Safety Constants

All safety-critical modules enforce the same threshold:

```python
SAFETY_THRESHOLD = 0.70  # S(x) >= 0.70 hard block
```

When `S(x) < 0.70`, the report is marked `blocked=True` and no output is allowed downstream.
