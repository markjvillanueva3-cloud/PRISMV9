# /cam-fixture — Fixture Design Assistant

Design and validate workholding fixtures for machining operations.

## Usage
```
/cam-fixture <part_model> [--machine <id>] [--operations <ops>] [--generate]
```

## Workflow

1. **Part Analysis**
   - Identify clamping surfaces
   - Determine cutting forces per operation
   - Calculate required holding force
   - Identify datum surfaces

2. **Fixture Selection**
   - Standard vises and fixtures
   - Custom soft jaws
   - Vacuum fixtures
   - Magnetic workholding
   - Modular fixturing

3. **Force Analysis**
   - **Query VariabilityEnvelopeEngine for worst-case forces**
   - Calculate clamp force requirements
   - Verify no part movement under cutting
   - Check for distortion risk

4. **Accessibility Check**
   - Tool clearance verification
   - Multi-side access planning
   - Op-to-op transition feasibility
   - Probe access for in-process inspection

5. **Output**
   - Fixture recommendation
   - Clamp locations and forces
   - Setup sheet generation
   - CAD model of fixture (if --generate)

## Engines Used
- FixtureDesignEngine
- WorkholdingForceCalculator
- CuttingForceEngine
- VariabilityEnvelopeEngine (Phase 0.25)
- ClampingAnalysisEngine

## Example
```
/cam-fixture H:/parts/bracket.step --machine okuma-mu5000 --generate
```
