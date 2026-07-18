> **UNREVIEWED HERMES DRAFT** — UNIT-0021, generated 2026-07-02 via ollama (qwen2.5-coder:32b) by hermes-unit-plan-harness.
> A specialist/Claude slot MUST verify before build or any safety-relevant use.
> Never wire numeric thresholds from this draft into gates without confirmation.
# DRAFT EXECUTION PACKAGE for UNIT-0021

## Implementation Plan — dependency-ordered concrete steps closing ONLY the real gaps.

### Step 1: Enumerate schemaVersioned Files in `data/state/`
- **Objective:** Identify all files within `data/state/` that require schema versioning.
- **Actions:**
  - Traverse the `data/state/` directory to list and count all JSON files.
  - Document each file's current schemaVersion status (if any).
- **Deliverable:** A comprehensive list of schemaVersioned files and their current versions.

### Step 2: Expand MigrationEngine Coverage
- **Objective:** Extend the `MigrationEngine` to cover all identified schemaVersioned files.
- **Actions:**
  - Update the `stateMigrations.ts` registry to include all schemaVersioned files from Step 1.
  - Ensure that each file has a defined migration path and is correctly tracked by the `MigrationEngine`.
- **Deliverable:** Updated `stateMigrations.ts` with comprehensive coverage.

### Step 3: Implement ForwardCompatChecker
- **Objective:** Develop and integrate a forward-compatibility checker into `prism_dev`.
- **Actions:**
  - Create a new script/module `ForwardCompatChecker.ts` that:
    - Verifies the existence of migration paths for proposed version bumps.
    - Performs round-trip checks using `migrateToLatest()` to ensure compatibility.
    - For physics/rules changes, greps consumer imports of `physics/constants.ts` and emits a blast-radius report.
- **Deliverable:** The `ForwardCompatChecker` module integrated into `prism_dev`.

### Step 4: Validate on Rule Changes
- **Objective:** Test the forward-compatibility checker against a real rule change.
- **Actions:**
  - Select a recent rule change (e.g., the 2026-06-29 G170/G168 Okuma dialect regression).
  - Use `ForwardCompatChecker` to validate that the rule change maintains forward compatibility.
  - Document the results and verify that all checks pass as expected.
- **Deliverable:** A validation report detailing the outcome of the test.

### Step 5: Add Semantic Versioning for Physics Constants
- **Objective:** Introduce semantic versioning for physics constants in `constants.ts`.
- **Actions:**
  - Modify `physics/constants.ts` to include a version metadata field.
  - Update scripts and processes to track changes and report impact surfaces for each version bump.
- **Deliverable:** Updated `constants.ts` with versioning and impact reporting.

### Step 6: Add Version Metadata to Souls
- **Objective:** Ensure that souls have version metadata beyond git tracking.
- **Actions:**
  - Update soul files in `state/shared/slot-souls/` to include a schemaVersion field in their frontmatter.
  - Verify that the version metadata is correctly applied and tracked.
- **Deliverable:** Updated soul files with schemaVersion metadata.

## Draft Knowledge Content — the substantive domain knowledge (models, mechanisms, parameter ranges). Cite sources where known; mark every numeric threshold [UNVERIFIED] unless it comes from the gap analysis citations.

### Versioning Schema
- **Centralized Schema Version Migration Registry:**
  - Located in `mcp-server/src/migrations/stateMigrations.ts`.
  - Manages migration paths for schemaVersioned files with a `LATEST_VERSION` map and `migrateToLatest()` function.
  
### Forward Compatibility Checker Mechanism
- **Components:**
  - **Migration Path Verification:** Ensures that each proposed version bump has a defined migration path.
  - **Round-Trip Check:** Uses `migrateToLatest()` to verify compatibility by migrating data back and forth between versions.
  - **Blast-Radius Report Generation:** Greps consumer imports of `physics/constants.ts` to identify affected components.

### Semantic Versioning for Physics Constants
- **Implementation:**
  - Add a version field to `physics/constants.ts`.
  - Track changes and report impact surfaces using automated scripts.

## Validation & Test Plan — real reference-value tests + live-data validation steps (JM Die where applicable).

### Reference-Value Tests
- **Test Case:** 2026-06-29 G170/G168 Okuma Dialect Regression
  - **Steps:**
    - Apply the rule change.
    - Run `ForwardCompatChecker` to validate forward compatibility.
    - Verify that all checks pass and no issues are detected.

### Live-Data Validation Steps
- **Test Case:** Validate New Version Bump with Real Data
  - **Steps:**
    - Select a real-world data file for testing.
    - Propose a version bump and apply the changes.
    - Run `ForwardCompatChecker` to ensure compatibility.
    - Verify that no data loss or corruption occurs.

## Risks & Open Questions

### Risks
- **Migration Path Incompleteness:** Risk of incomplete migration paths leading to data corruption during version bumps.
- **Semantic Versioning Complexity:** Increased complexity in managing semantic versioning for physics constants.
- **ForwardCompatChecker False Positives/Negatives:** Potential for false positives or negatives in the forward-compatibility checks.

### Open Questions
- **Migration Path Coverage:** How can we ensure that migration paths are always complete and up-to-date?
- **Semantic Versioning Granularity:** What level of granularity is necessary for semantic versioning of physics constants?
- **Checker Performance:** How will the performance of `ForwardCompatChecker` scale with an increasing number of files and versions?
