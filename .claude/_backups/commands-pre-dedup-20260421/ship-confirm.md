# /ship-confirm — Shipment Confirmation and Documentation

Confirm shipment readiness and generate shipping documentation.

## Usage
```
/ship-confirm <job_id> [--carrier <name>] [--generate-docs] [--quality-check]
```

## Workflow

1. **Pre-Ship Validation**
   - All operations complete
   - Quality inspection passed
   - Dimensions within tolerance
   - **Check against VariabilityEnvelopeEngine specs**

2. **Documentation Check**
   - Cert of conformance
   - Material certs
   - Inspection reports
   - Test results

3. **Quality Gate**
   - Final dimensional check
   - Visual inspection
   - Surface finish verification
   - **Verify no EdgeCaseCaptureEngine boundary violations**

4. **Documentation Generation**
   - Packing slip
   - Certificate of conformance
   - Material test reports
   - First article inspection

5. **Shipment Processing**
   - Carrier selection
   - Label generation
   - Tracking number
   - ERP update

## Engines Used
- ShipmentConfirmationEngine
- DocumentGeneratorEngine
- QualityGateEngine
- VariabilityEnvelopeEngine (Phase 0.25)
- EdgeCaseCaptureEngine (Phase 0.25)

## Example
```
/ship-confirm J-2024-0456 --carrier ups --generate-docs --quality-check
```
