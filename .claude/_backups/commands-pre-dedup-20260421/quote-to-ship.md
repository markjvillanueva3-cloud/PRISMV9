# Quote-to-Ship Pipeline

Run the 21-stage QuoteToShip pipeline from blueprint intake through shipping.

## Advisor Strategy (`advisor_20260301`)
Use Anthropic's advisor tool for the `run` subcommand:
- **Executor**: Sonnet 4.6 (drives the 21-stage pipeline, calls MCP tools)
- **Advisor**: Opus 4.6, `max_uses: 2`
- **When Sonnet should call advisor**: (1) after intake, before DFM/quoting — to validate material, quantity, and pipeline readiness, (2) after quote generation — to sanity-check pricing against known ranges
- For `validate` and status (no args): no advisor needed (diagnostic/read-only).

## Usage
- `/quote-to-ship` — Show pipeline status and stage descriptions
- `/quote-to-ship run <material> <quantity>` — Run the full pipeline
- `/quote-to-ship validate <material>` — Validate input before running

## Procedure

### 1. Parse Arguments
If no arguments: call `prism_business:quote_to_ship_status` to get all 21 stage descriptors and display them.

If `run <material> <quantity>`:
- Call `prism_business:quote_to_ship_validate` with `{ material_spec: "<material>" }` first
- If valid, call `prism_business:quote_to_ship_run` with the full input
- Display per-stage results (pass/fail/skip) in a table

If `validate <material>`:
- Call `prism_business:quote_to_ship_validate` with `{ material_spec: "<material>" }`
- Report errors and warnings

### 2. Display Results

For status (no args):
```
QuoteToShip Pipeline — 21 Stages
=================================
 1. INTAKE              — Blueprint/STEP Intake [BlueprintOCREngine, StepImportEngine]
 2. FEATURE_RECOGNITION — Feature Recognition [FeatureRecognitionEngine]
 3. DFM_CHECK           — Design for Manufacturability [DFMFeedbackEngine]
 ...
21. SHIPPING            — Shipping & Packing Slip [PackingSlipEngine]
```

For run results:
```
QuoteToShip Pipeline Run: QTS-xxxxx
=====================================
Status: complete | Duration: 12.3s

Stage Results:
  1. INTAKE              PASS   (45ms)
  2. FEATURE_RECOGNITION PASS   (120ms)
  ...

Quote Summary:
  Total Cost: $45.50 (CI95: $38.00 - $53.00)
  Lead Time: 5 business days
  Programs: 2 files generated
```

### 3. Error Handling
If the pipeline fails at a stage, show which stage failed and why:
```
Pipeline FAILED at stage 5 (QUOTE)
  Error: QuoteEstimatorEngine could not resolve material "unobtanium"
  Suggestion: Check material_spec against the material registry
```

### 4. Resume After Approval
If the pipeline returns "awaiting_approval":
```
Pipeline paused at APPROVAL_GATE
  Quote: $45.50 for 10x 6061-T6 bracket
  To resume: /quote-to-ship resume --approved
```
