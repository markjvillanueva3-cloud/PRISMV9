# PRISM Add-in Direct CAM API Architecture Specification

## Version: 1.0.0
## Date: 2026-04-08

## Overview

This document defines the canonical architecture for how the PRISM Fusion 360 add-in
passes physics-optimized machining parameters to CPS post processors.

**Key principle:** The CPS runtime is sandboxed. It has NO `HTTPClient`, no network
access, and `getGlobalParameter()` CANNOT read custom add-in attributes. All PRISM
physics data must arrive through Fusion 360's native CAM API mechanisms.

## Architecture

### Data Flow

```
PRISM Server ──HTTP──> PRISM Add-in (Python) ──adsk.cam API──> Fusion 360 CAM Kernel
                                                                      │
                                                            CAM generates toolpaths
                                                                      │
                                                              Post Processor (CPS)
                                                              reads normal S/F values
                                                                      │
                                                              G-code output with
                                                              physics-optimized S/F
```

### Mechanism 1: Direct S/F Modification (PRIMARY)

The add-in modifies operation parameters directly via `adsk.cam.Operation.parameters`:

```python
# In PRISM Fusion 360 Add-in (Python)
import adsk.cam

def apply_prism_physics(operation: adsk.cam.Operation, prism_result: dict):
    """Apply PRISM-computed S/F to a CAM operation."""
    params = operation.parameters

    # Set spindle speed (RPM)
    rpm_param = params.itemByName("tool_spindleSpeed")
    if rpm_param:
        rpm_param.expression = str(prism_result["rpm"])

    # Set surface speed (SFM/m-min) — for CSS operations
    sfm_param = params.itemByName("tool_surfaceSpeed")
    if sfm_param:
        sfm_param.expression = str(prism_result["surface_speed"])

    # Set feed per tooth
    fz_param = params.itemByName("tool_feedPerTooth")
    if fz_param:
        fz_param.expression = str(prism_result["feed_per_tooth"])

    # Set cutting feedrate
    feed_param = params.itemByName("tool_feedCutting")
    if feed_param:
        feed_param.expression = str(prism_result["feedrate"])
```

The post processor then reads these values normally:
```javascript
// In CPS post processor — reads standard CAM parameters
var rpm = spindleSpeed;       // Already PRISM-optimized
var feed = feedOutput.format(feed);  // Already PRISM-optimized
```

### Mechanism 2: Operation Comment JSON (SECONDARY)

For additional physics data that doesn't map to standard CAM parameters (force,
power, confidence, tool life, stability), the add-in writes structured JSON to the
operation's comment field:

```python
# In PRISM Add-in
import json

def embed_prism_metadata(operation: adsk.cam.Operation, prism_result: dict):
    """Embed PRISM physics metadata in operation comment."""
    existing_comment = operation.comment or ""

    prism_data = {
        "prism": {
            "version": "1.0.0",
            "force_N": prism_result.get("force_N"),
            "power_kW": prism_result.get("power_kW"),
            "confidence": prism_result.get("confidence"),
            "tool_life_min": prism_result.get("tool_life_min"),
            "stable_rpm_min": prism_result.get("stable_rpm_min"),
            "stable_rpm_max": prism_result.get("stable_rpm_max"),
            "wear_VB_mm": prism_result.get("wear_VB_mm"),
            "thermal_index": prism_result.get("thermal_index"),
            "safety_score": prism_result.get("safety_score"),
            "iso_group": prism_result.get("iso_group"),
            "kc1_1": prism_result.get("kc1_1"),
            "chip_thickness_mm": prism_result.get("chip_thickness_mm")
        }
    }

    # Append PRISM JSON after any existing comment
    separator = " | " if existing_comment else ""
    operation.comment = existing_comment + separator + "PRISM:" + json.dumps(prism_data)
```

The post reads via `getParameter('operation:comment')`:
```javascript
// In CPS post processor
function parsePrismComment(section) {
  var comment = getParameter("operation:comment", "");
  var prismIdx = comment.indexOf("PRISM:");
  if (prismIdx < 0) return null;

  try {
    var jsonStr = comment.substring(prismIdx + 6);
    var data = JSON.parse(jsonStr);
    return data.prism || null;
  } catch (e) {
    return null;
  }
}
```

### Mechanism 3: Sidecar JSON Export (TERTIARY)

For full pipeline optimization context, the add-in writes a JSON sidecar file
alongside the posted G-code:

```python
def export_prism_sidecar(output_path: str, context: dict):
    """Write PRISM sidecar JSON for offline pipeline optimization."""
    sidecar_path = output_path.replace(".nc", ".prism.json")
    with open(sidecar_path, "w") as f:
        json.dump({
            "prism_version": "1.0.0",
            "machine": context["machine"],
            "material": context["material"],
            "tools": context["tools"],
            "operations": context["operations"],
            "physics_results": context["physics_results"]
        }, f, indent=2)
```

## Fallback Behavior

When the PRISM add-in is NOT installed or NOT active:

1. **S/F values** — Post reads CAM-programmed values (user-entered or Fusion defaults)
2. **Operation comment** — `parsePrismComment()` returns `null`, post skips physics annotations
3. **Sidecar file** — Does not exist, no impact on G-code
4. **Post behavior** — Functions normally, produces standard G-code without PRISM annotations

The post MUST work correctly in all cases. PRISM data is additive enhancement, never a requirement.

## Comment JSON Schema

```typescript
interface PrismCommentData {
  prism: {
    version: string;           // Semantic version, e.g., "1.0.0"
    force_N?: number;          // Cutting force (Kienzle Fc), Newtons
    power_kW?: number;         // Cutting power, kilowatts
    confidence?: number;       // Physics confidence 0-1
    tool_life_min?: number;    // Estimated tool life, minutes
    stable_rpm_min?: number;   // Stable RPM range lower bound
    stable_rpm_max?: number;   // Stable RPM range upper bound
    wear_VB_mm?: number;       // Estimated flank wear, mm
    thermal_index?: number;    // Thermal accumulation index
    safety_score?: number;     // Overall safety score 0-1
    iso_group?: string;        // Material ISO group (P/M/K/N/S/H)
    kc1_1?: number;            // Specific cutting force, MPa
    chip_thickness_mm?: number; // Mean chip thickness, mm
  }
}
```

## Version Negotiation

The `prism.version` field enables forward compatibility:

- Post checks `prism.version` major number
- If major version mismatch, post logs warning and uses only standard S/F
- Minor version differences are forward-compatible (new fields ignored by old posts)

```javascript
function isPrismVersionCompatible(data) {
  if (!data || !data.prism || !data.prism.version) return false;
  var major = parseInt(data.prism.version.split(".")[0], 10);
  return major === 1; // Current post supports v1.x.x
}
```

## Security Considerations

- No sensitive data in operation comments (no API keys, no server URLs)
- Comment JSON is human-readable — machinists can inspect it
- Sidecar files may contain machine configuration — handle with shop-level access controls
- The add-in authenticates to PRISM server, not the post processor

## Anti-Patterns (DO NOT USE)

| Pattern | Why It Fails |
|---------|-------------|
| `getGlobalParameter('prism:rpm_T1')` | CPS runtime cannot read add-in custom attributes |
| `HTTPClient` / `httpGet` / `httpPost` | Do not exist in CPS sandbox |
| `XMLHttpRequest` / `fetch` | Do not exist in CPS sandbox |
| Property bridge via design attributes | `getGlobalParameter` only reads CAM kernel globals |
| Environment variables | CPS runtime has no access to env vars |

## Confidence Semantics (Monte Carlo UQ)

### Definition

The `prism.confidence` field in the comment JSON represents the **95% Monte Carlo
confidence interval half-width on feed rate, expressed as a fraction**.

| confidence | Meaning | Example |
|-----------|---------|---------|
| 0.05 | Feed accurate within ±5% | High confidence, well-characterized material |
| 0.08 | Feed accurate within ±8% | Normal confidence, typical cutting conditions |
| 0.15 | Feed accurate within ±15% | Moderate uncertainty — verify manually |
| 0.25 | Feed accurate within ±25% | High uncertainty — prove-out mode recommended |
| 0.40 | Feed accurate within ±40% | Very high uncertainty — fallback to conservative |

### Source

Computed by `SpeedFeedOrchestratorEngine`'s Monte Carlo UQ pass:
1. Sample N=1000 parameter combinations (kc1_1±σ, mc±σ, tool geometry±tol)
2. Compute feed for each sample via Kienzle model
3. confidence = (97.5th percentile - 2.5th percentile) / (2 * median feed)

### CPS Behavior

The PRISM-Master.cps `checkConfidenceWarnings()` function reads `prism.confidence`:

- **confidence ≤ 0.15**: No warning. Physics data is reliable.
- **0.15 < confidence ≤ 0.25**: G-code comment:
  `(PRISM WARNING: Feed uncertainty ±{N}% — verify manually)`
- **confidence > 0.25**: G-code comment:
  `(PRISM WARNING: Feed uncertainty ±{N}% — PROVE-OUT MODE RECOMMENDED)`

### Absence

If `prism.confidence` is not provided (add-in didn't compute it, or server was
offline), the CPS skips confidence checks entirely. No default value is assumed
in the CPS. The bridge defaults to 0.7 (30% uncertainty) when the server doesn't
return a confidence value, which will trigger the prove-out recommendation.

### Tool Life Display

When `prism.tool_life_min` is provided:
- CPS writes: `(TOOL LIFE: ~{N} min)` after each tool change
- If tool_life_min < 15: additional warning comment recommending speed reduction

### Wear Derating

When `prism.wear_fraction` is provided (0.0 = fresh, 1.0 = fully worn):
- 0% wear → 100% feed (no derating)
- 40% wear → 92.5% feed
- 80%+ wear → 85% feed (capped)
- Linear interpolation between 0% and 80%
- CPS writes: `(WEAR DERATING: {N}%)` when derating is applied

### Chatter Stability

When `prism.stable_rpm_min` and `prism.stable_rpm_max` are provided:
- CPS `clampToStableRange()` checks if RPM is within stable zone
- If outside: shifts to nearest boundary (≤20% shift)
- If shift >20%: warning only, no auto-shift
- CPS writes: `(PRISM: RPM shifted S{old}→S{new} for chatter stability)`
