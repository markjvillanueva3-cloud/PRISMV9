---
type: tribal-consolidation
topic: stock_model_creation
iso_week: 2026-24
cluster_size: 10
cluster_size_synthesized: 10
aggregate_confidence: 90.0
tags: ["document-learned", "doc:doc-hypermill-hypermill-manual-en-1", "stock_model", "bounding_geometry", "CAD_model", "operation:profiling", "resolution", "accuracy"]
materials: []
operations: ["profiling", "turning", "5_axis"]
_consolidatedAt: 2026-06-09T06:33:51.702Z
epistemic_only: true
consumed_by_machining: false
milestone: OBSIDIAN-COMPOUND-MS1/S6/U-TRIBAL-CONSOLIDATE
---
# Tribal: stock_model_creation — 2026-24

_10 tips clustered on 'stock_model_creation' with mean confidence 90.0/100. The vault is supposed to talk back; this is what it heard from the shop floor this week._

## Top Tips (10)

### 1. Define bounding geometry for stock model creation

- **id:** `TK-DL-doc-hypermill-hypermill-manual-en-1-042` · **confidence:** 90/100 · **usage:** 0
- **source:** document:doc-hypermill-hypermill-manual-en-1
- **tags:** bounding_geometry, CAD_model, document-learned, doc:doc-hypermill-hypermill-manual-en-1, operation:profiling

Use the profile, box/cylinder, or surfaces of the CAD model as the basis for creating a stock model.

### 2. Set resolution for stock model calculation

- **id:** `TK-DL-doc-hypermill-hypermill-manual-en-1-043` · **confidence:** 90/100 · **usage:** 0
- **source:** document:doc-hypermill-hypermill-manual-en-1
- **tags:** resolution, accuracy, document-learned, doc:doc-hypermill-hypermill-manual-en-1

Specify the maximum permissible distance between the faceted surface of the polyhedron model and the real model surface.

### 3. Create a cast stock model based on the current CAD model

- **id:** `TK-DL-doc-hypermill-hypermill-manual-en-1-044` · **confidence:** 90/100 · **usage:** 0
- **source:** document:doc-hypermill-hypermill-manual-en-1
- **tags:** cast_stock, offset, document-learned, doc:doc-hypermill-hypermill-manual-en-1

Use the 'Cast offset' option to create a cast stock model that is based on the outer boundary of the loaded model.

### 4. Select a frame for the turning axis

- **id:** `TK-DL-doc-hypermill-hypermill-manual-en-1-045` · **confidence:** 90/100 · **usage:** 0
- **source:** document:doc-hypermill-hypermill-manual-en-1
- **tags:** turning_axis, frame, document-learned, doc:doc-hypermill-hypermill-manual-en-1, operation:turning

Choose the frame that corresponds to the turning axis of the turning stock, and define any required resolution or offset.

### 5. Define a stock model based on the stock model of a reference job

- **id:** `TK-DL-doc-hypermill-hypermill-manual-en-1-046` · **confidence:** 90/100 · **usage:** 0
- **source:** document:doc-hypermill-hypermill-manual-en-1
- **tags:** reference_job, stock_model, document-learned, doc:doc-hypermill-hypermill-manual-en-1

Use the 'From job' option to define a stock model based on the stock model of a previously defined reference job.

### 6. Calculate stock model in the job definition

- **id:** `TK-DL-doc-hypermill-hypermill-manual-en-1-047` · **confidence:** 90/100 · **usage:** 0
- **source:** document:doc-hypermill-hypermill-manual-en-1
- **tags:** job_definition, stock_model, document-learned, doc:doc-hypermill-hypermill-manual-en-1

On the Setup dialogue page of a job, select the 'Generate resulting stock' option to calculate and store the stock model.

### 7. Calculate stock model in the browser

- **id:** `TK-DL-doc-hypermill-hypermill-manual-en-1-048` · **confidence:** 90/100 · **usage:** 0
- **source:** document:doc-hypermill-hypermill-manual-en-1
- **tags:** browser, stock_model, document-learned, doc:doc-hypermill-hypermill-manual-en-1

In the hyperMILL browser, select a job and use the 'Create → stockmodel' function to calculate the stock model.

### 8. Optimize stock model generation in 5X machining

- **id:** `TK-DL-doc-hypermill-hypermill-manual-en-1-049` · **confidence:** 90/100 · **usage:** 0
- **source:** document:doc-hypermill-hypermill-manual-en-1
- **tags:** 5X_machining, cutting_length, document-learned, doc:doc-hypermill-hypermill-manual-en-1

Ensure the Cutting length parameter is defined in the tool definition for optimal stock model generation.

### 9. Mirror stock models individually or for a job list

- **id:** `TK-DL-doc-hypermill-hypermill-manual-en-1-050` · **confidence:** 90/100 · **usage:** 0
- **source:** document:doc-hypermill-hypermill-manual-en-1
- **tags:** mirror_stock, job_list, document-learned, doc:doc-hypermill-hypermill-manual-en-1

Use the 'Mirror stock' function to create mirrored versions of individual stock models or all stock models in a job list.

### 10. Combine multiple stock models into a compound stock

- **id:** `TK-DL-doc-hypermill-hypermill-manual-en-1-051` · **confidence:** 90/100 · **usage:** 0
- **source:** document:doc-hypermill-hypermill-manual-en-1
- **tags:** compound_stock, multiple_stocks, document-learned, doc:doc-hypermill-hypermill-manual-en-1, operation:5_axis

Use the 'New compound stock' function to merge multiple stock models into a single compound stock for simultaneous machining.

## Common Threads

Top tags across the cluster: `document-learned`, `doc:doc-hypermill-hypermill-manual-en-1`, `stock_model`, `bounding_geometry`, `CAD_model`, `operation:profiling`, `resolution`, `accuracy`.

## Sources Cited

- document:doc-hypermill-hypermill-manual-en-1 (10)

## Citations

- [[TK-DL-doc-hypermill-hypermill-manual-en-1-042]]
- [[TK-DL-doc-hypermill-hypermill-manual-en-1-043]]
- [[TK-DL-doc-hypermill-hypermill-manual-en-1-044]]
- [[TK-DL-doc-hypermill-hypermill-manual-en-1-045]]
- [[TK-DL-doc-hypermill-hypermill-manual-en-1-046]]
- [[TK-DL-doc-hypermill-hypermill-manual-en-1-047]]
- [[TK-DL-doc-hypermill-hypermill-manual-en-1-048]]
- [[TK-DL-doc-hypermill-hypermill-manual-en-1-049]]
- [[TK-DL-doc-hypermill-hypermill-manual-en-1-050]]
- [[TK-DL-doc-hypermill-hypermill-manual-en-1-051]]

