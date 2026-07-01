# Fusion 360 Intelligence Panel — Architecture & Technical Notes

## Overview

The `FusionFeedsCalculator.py` (698 lines) implements a full Fusion 360 add-in that:
1. Connects to PRISM MCP server via REST API
2. Loads 95K tools, 2,957 materials, 910 machines from registries
3. Calculates optimized speeds/feeds using Kienzle/Taylor/SLD physics
4. Applies results to Fusion 360 CAM operations with safety validation
5. Gracefully degrades to local Kienzle when PRISM is offline

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│         Fusion 360 CAM (Addin Runtime)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  PanelCommandCreatedHandler ─────┐                          │
│        ↓ initialize UI             │                        │
│   ┌────────────────────┐           │                        │
│   │  Material Tab      │ ← Load from PRISM/Fallback        │
│   │  Tool Tab          │ ← Load from PRISM/Fallback        │
│   │  Cutting Tab       │                                    │
│   │  Results Tab       │                                    │
│   └────────────────────┘                                    │
│        ↓                                                     │
│  PanelInputChangedHandler ─────────────────────────────────┐│
│        • Material selected → N/A                            ││
│        • Tool diameter → load_tools() → search PRISM ───┐  ││
│        • Tool selected → populate fields + calc         │  ││
│        • Machine selected → populate RPM/power          │  ││
│        • DOC/WOC → update WOC%, trigger calc            │  ││
│        ↓                                                 │  ││
│  run_calculation(inputs)                                │  ││
│        ↓                                                 │  ││
│    gather_params() ────────────────────────────────────┐│  ││
│        ↓                                                ││  ││
│    calculate(params) ───────────────────────────────────┤│  ││
│        ├─ Try PRISM API ──────────────────────────────┐ │  ││
│        │   ├─ calc_speed_feed()                      │ │  ││
│        │   │   → speed-feed/orchestrate              │ │  ││
│        │   │       (Kienzle/Taylor/SLD/MonteCarlo)   │ │  ││
│        │   ├─ calc_stability()                       │ │  ││
│        │   ├─ calc_tool_life()                       │ │  ││
│        │   ├─ get_tribal_tips()                      │ │  ││
│        │   └─ result with confidence                 │ │  ││
│        │                                              │ │  ││
│        └─ If PRISM fails → calculate_local()         │ │  ││
│            └─ Kienzle fallback (hardcoded formulas)  │ │  ││
│                └─ lower confidence (0.70 vs 0.85+)   │ │  ││
│        ↓                                              │ │  ││
│    Format & display results (color-coded)            │ │  ││
│        ├─ Confidence: green/yellow/red               │ │  ││
│        ├─ Warnings: yellow (ISSUE: should be red)    │ │  ││
│        ├─ Stability zone: green/yellow/red           │ │  ││
│        └─ Tribal tips: fetched from PRISM            │ │  ││
│        ↑                                              │ │  ││
└────────────────────────────────────────────────────────┘ │  ││
                      │ (data to dropdown)                   │  ││
        ┌─────────────┘                                      │  ││
        │  PanelExecuteHandler                              │  ││
        │      • if "Apply to CAM Operation" checked        │  ││
        │      • apply_to_operation()                       │  ││
        │          ├─ Validate safety (gate!)              │  ││
        │          ├─ Write to op.parameters               │  ││
        │          └─ Show confirmation                     │  ││
        │                                                    │  ││
        └───────────────────────────────────────────────────────┘│
                                                                  │
        └─ PRISM Server ──────────────────────────────────────────┘
            ├─ /health (connectivity check)
            ├─ /data/material/search → MaterialRegistry
            ├─ /data/tool/search → ToolRegistry
            ├─ /data/machine/search → MachineRegistry
            ├─ /speed-feed/orchestrate → SpeedFeedOrchestratorEngine
            ├─ /vibration/stability-lobes → ChatterStabilityLobeEngine
            ├─ /sfc/* → SurfaceFinish calculators
            ├─ /safety/validate → SafetyValidationEngine
            └─ /safety/knowledge/search → TribalKnowledgeRegistry

```

---

## Data Flow

### **Initialization (PanelCommandCreatedHandler.notify)**

```python
1. Create UI tabs (Material, Tool, Cutting, Results)
2. Check prism_live() — call /health
3. If PRISM online:
   - Load materials(100) → cache as mat:*
   - Dropdown shows live materials (ISSUE: unsorted)
4. If offline:
   - Use FALLBACK_MATERIALS (18 materials, sorted)
5. Load machines(30) and tool types
6. Set input defaults
7. Call run_calculation(inputs) — initial state
```

### **Input Changed (PanelInputChangedHandler.notify)**

```python
if changed.id == 'toolDia':
   → load_tools(dia_mm, max_20)
     → API call (NOT cached) — 200ms latency
   → update 'toolSelect' dropdown
   → NO calc trigger (ISSUE)

if changed.id == 'toolSelect':
   → load_tools(selected_name, max_5) again!
   → extract fields: diameter, flutes, flute_length, stickout
   → (MISSING: coating, corner_radius)
   → NO calc trigger (ISSUE)

if changed.id == 'machine':
   → load_machines(name, max_5) (NOT cached)
   → extract: max_rpm, power_kw
   → NO calc trigger (ISSUE)

if changed.id in ['woc', 'toolDia']:
   → update woc_percent (read-only)

call run_calculation() ← only if woc/toolDia change
```

### **Calculation (run_calculation → calculate → PRISM/Fallback)**

```python
PRISM path (if online):
  1. calc_speed_feed(params)
     - Input: material, tool_diameter_mm, flutes, doc_mm, woc_mm, max_rpm, max_power_kw
     - POST to /speed-feed/orchestrate
     - Result: spindle_rpm, feed_rate_mmmin, confidence, warnings
  
  2. calc_stability(params)
     - POST to /vibration/stability-lobes
     - Result: stability_assessment {zone, suggested_rpm}
  
  3. calc_tool_life(params)
     - POST to /sfc/tool-life
     - Result: tool_life_min
  
  4. calc_surface_finish(params)
     - POST to /sfc/surface-finish
     - Result: surface_finish_Ra_um
  
  5. get_tribal_tips(material, operation)
     - POST to /safety/knowledge/search
     - Result: [tips]
  
  6. validate_safety(params, rpm, feed)
     - POST to /safety/validate
     - If OK: continues
     - If FAIL: blocks apply (good!)
     - If API fails: returns {"ok": True} ← ISSUE (unsafe default)

Fallback path (if PRISM offline or API fails):
  1. calculate_local(params)
     - Use FALLBACK_MATERIALS
     - Use CANONICAL_KC/VC (ISO group hardness-derating)
     - Kienzle force: Fc = kc1.1 × ap × fz^(1-mc)
     - Chip thinning factor (CTF) if ae < d/2
     - Deflection: delta = F*L^3 / (3*E*I), E=620000 MPa
     - Lower confidence to 0.70
     - NO stability lobes, tips, or surface finish
```

### **Apply to CAM (apply_to_operation)**

```python
1. Find selected CAM operation in Fusion
2. gather_params() → extract all UI values
3. calculate(params)
4. validate_safety(params, rpm, feed) ← GATE!
   - If violations: show error, STOP, return
   - If OK: continue
5. Write to operation parameters:
   - tool_spindleSpeed = rpm
   - tool_feedCutting = feed (mm/min)
   - tool_feedPlunge = feed × 0.5 (hardcoded ratio!)
   - tool_feedRamp = feed × 0.5 (hardcoded ratio!)
6. Show confirmation with applied params + confidence
```

---

## Caching Strategy (Current)

**Global `_cache = {}`**

```python
# Materials ONLY
def load_materials(query="", max_results=100):
    key = f"mat:{query}"
    if key in _cache:
        return _cache[key]  ← ✓ Cache hit
    r = prism("data/material/search", ...)
    _cache[key] = r["result"]  ← ✓ Cache miss, store
    return _cache[key]

# Tools NOT cached
def load_tools(...):
    r = prism("data/tool/search", ...)  ← API call every time
    return r["result"]

# Machines NOT cached
def load_machines(...):
    r = prism("data/machine/search", ...)  ← API call every time
    return r["result"]
```

**Problem:**
- Every tool diameter search (user types slowly) → API call → 200ms delay
- Every machine selection → API call → 200ms delay
- Material list is cached but only when loading initial dropdown

**Solution:**
- Cache tools by `(query, tool_type, diameter_mm, max_results)`
- Cache machines by `(query, max_results)`
- Add cache invalidation (TTL = 5 minutes or manual refresh button)

---

## Physics Constants (Fallback Only)

Located in file directly (lines 159-189). These are **canonical** and should match `src/physics/constants.ts`:

```python
CANONICAL_KC = {"P": 1800, "M": 2100, "K": 1100, "N": 700, "S": 2800, "H": 3200}
CANONICAL_VC = {
    "P": (120, 250), "M": (80, 180), "K": (150, 300),
    "N": (300, 800), "S": (30, 80), "H": (60, 100),
}
COATINGS = {
    "Uncoated": 0.70, "TiN": 0.85, "TiCN": 0.90,
    "TiAlN": 1.00, "AlTiN": 1.05, "AlCrN": 1.00,
    "Diamond/DLC": 1.20, "CBN": 1.15,
}
FALLBACK_MATERIALS = {18 materials with kc1.1, mc, hardness}
```

When PRISM is offline:
1. Get material from FALLBACK_MATERIALS (18 common alloys)
2. Apply hardness derating: vc *= (ref_h / hardness)^0.3
3. Calculate chip thinning factor if ae < d/2
4. Apply Kienzle: Fc = kc1.1 × ap × fz^(1-mc)
5. Return confidence = 0.70 (vs. 0.85+ for PRISM)

---

## API Endpoints Used

| Endpoint | Method | Purpose | Cache | Fallback |
|----------|--------|---------|-------|----------|
| `/health` | GET | Check PRISM availability | No | N/A |
| `/data/material/search` | POST | Search 2,957 materials | Yes | 18-item hardcoded |
| `/data/tool/search` | POST | Search 95K tools | **No** → Issue | Manual entry |
| `/data/machine/search` | POST | Search 910 machines | **No** → Issue | Manual entry |
| `/speed-feed/orchestrate` | POST | Main S/F calculation | No | Kienzle local |
| `/vibration/stability-lobes` | POST | Chatter stability | No | Return "unknown" |
| `/sfc/tool-life` | POST | Taylor tool life | No | Return 0 |
| `/sfc/surface-finish` | POST | Ra prediction | No | Return 0 |
| `/safety/knowledge/search` | POST | Tribal tips (3.7K+) | No | Return "Connect PRISM..." |
| `/safety/validate` | POST | Pre-apply validation | No | **Default OK** ← Issue |

**Critical gaps:**
- Tool search not cached → 200ms latency per diameter change
- Machine search not cached → 200ms latency per selection
- Safety validation defaults to OK if API fails → gate may be bypassed

---

## Error Handling

### **API Call Failures (prism function)**

```python
def prism(endpoint, body=None, method="POST"):
    try:
        # ... make request ...
        return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None  ← Fails silently, returns None
```

**Consequences:**
- `load_tools(...)` returns `[]` (empty list)
- `load_machines(...)` returns `[]` (empty list)
- `calc_speed_feed(...)` returns `None` → fallback to Kienzle
- `validate_safety(...)` returns `None` → defaults to `{"ok": True}` (unsafe!)
- `get_tribal_tips(...)` returns `[]` → shows "Connect PRISM..."

**Issue:** No logging, no user notification for API failures (except safety default behavior).

### **Calculation Errors (run_calculation)**

```python
def run_calculation(inputs):
    try:
        p = gather_params(inputs)
        r = calculate(p)
        # ... update UI ...
    except Exception:
        pass  ← Swallows error, leaves UI stale
```

**Issue:** Old calculation results remain visible. User doesn't know calculation failed.

### **Parameter Application Errors (apply_to_operation)**

```python
for pname, val, label in [...]:
    try:
        par = params.itemByName(pname)
        if par:
            par.expression = val
            applied.append(label)
    except Exception:
        pass  ← Silent skip if param not found
```

**Issue:** If machine/operation doesn't have `tool_feedPlunge`, it's silently skipped. User thinks plunge feed was applied.

---

## Unit Conversions

**Critical bug:** Fusion 360 value inputs are in **centimeters**, but no UI label indicates this.

```python
# Lines 515-520 (gather_params):
"tool_diameter_mm": inputs.itemById('toolDia').value * 10,  # Assumes cm, multiply by 10
"flute_length_mm": inputs.itemById('fluteLen').value * 10,
"stickout_mm": inputs.itemById('stickout').value * 10,

# Lines 345-348 (UI labels):
mg.addValueInput('toolDia', 'Diameter', 'mm', ...)  ← Says "mm" but input is in cm!
```

**Example user confusion:**
- User sees: "Diameter: mm" → types "12"
- App reads: 12 cm (Fusion default) × 10 = 120 mm
- App calculates speed/feed for 120 mm tool instead of 12 mm
- User gets completely wrong S/F values

**Fix:** Change UI label to `'Diameter (cm)'` or convert internally.

---

## Material Hardness Derating

When offline, hardness affects cutting speed via:

```python
ref_h = {"P": 200, "M": 200, "K": 200, "N": 100, "S": 350, "H": 350}
if hardness > 0:
    vc *= math.pow(ref_h.get(iso, 200) / hardness, 0.3)
```

Formula: vc_adjusted = vc_base × (ref_h / actual_h)^0.3

**Example:**
- Steel 4140, ref_h=200, actual=280 (harder): vc × (200/280)^0.3 = vc × 0.95 (slower)
- Steel 4140, ref_h=200, actual=180 (softer): vc × (200/180)^0.3 = vc × 1.03 (faster)

This is conservative and matches ISO/Sandvik methodology.

---

## Offline Behavior Summary

| Feature | PRISM Online | PRISM Offline |
|---------|--------------|---------------|
| Material dropdown | PRISM live results (unsorted) | Fallback 18 materials (sorted) |
| Tool search | API call, max 20 results | Disabled (no feedback) |
| Machine search | API call, max 5 results | Disabled (no feedback) |
| Calculation | Full Kienzle/Taylor/SLD | Local Kienzle only |
| Stability lobes | SLD chart | "unknown" |
| Tool life | Taylor formula | N/A |
| Surface finish | Ra prediction | N/A |
| Tribal tips | 3.7K+ shop tips | "Connect PRISM..." |
| Safety validation | API checks | Defaults to OK (unsafe) |
| Confidence | 0.85–0.95 | 0.70 |
| Manual entry | Always available | Always available |

---

## Performance Metrics

**Current (unoptimized):**
- Material dropdown load: 200–500ms (API, cached on repeat)
- Tool search: 200–500ms per diameter change (NOT cached, every keystroke)
- Machine selection: 200–500ms (NOT cached)
- Calculation: 100–300ms (API), 5–20ms (local fallback)
- **Total flow:** ~1 second from input change to visible results

**With caching:**
- Material dropdown: 200ms first load, 0ms cached
- Tool search: 200ms first load, 0ms cached (by diameter)
- Machine selection: 200ms first load, 0ms cached (by name)
- **Total flow:** 200ms first load, 50ms (calc) for repeats

**Estimated improvement:** 900ms → 250ms on typical workflow (3.6× faster)

---

## Testing Recommendations

### **Unit Tests Needed**

1. **calculate_local()** — Kienzle fallback
   - Verify kc1.1 values match constants.ts
   - Verify hardness derating formula
   - Verify chip thinning factor
   - Verify deflection calculation

2. **gather_params()** — Parameter extraction
   - Verify cm→mm conversion
   - Verify defaults
   - Test with edge cases (zero flutes, negative diameter)

3. **validate_safety()** — Safety gate
   - Verify API call when online
   - Verify fallback when offline
   - Verify blocks on violation

### **Integration Tests Needed**

1. **Material sort** — verify materials are alphabetized both online and offline
2. **Tool caching** — verify same diameter returns cached results
3. **Offline fallback** — verify local Kienzle used when PRISM down
4. **Apply to operation** — verify parameters written to Fusion correctly

### **Manual Tests Needed**

1. Select tool from library → verify all fields populate → verify calc runs
2. Select machine → verify RPM/power populate → verify calc runs
3. Change diameter → verify tool search (no manual refresh needed)
4. Change WOC → verify WOC% updates immediately
5. Click "Apply" with invalid params → verify safety blocks it
6. Disconnect PRISM → verify offline fallback works
7. Reconnect PRISM → verify results improve

---

## Known Limitations

1. **No multi-operation support** — only applies to single selected operation
2. **Hardcoded plunge/ramp ratios** — always 50% of main feed (no user control)
3. **No feed optimization** — chip load calculation is simple, not machine-adaptive
4. **No 5-axis support** — assumes 3-axis milling
5. **No thermal compensation** — doesn't account for machine thermal growth
6. **Single tool holder type** — no automatic holder selection based on tool
7. **No cost/tool-life tradeoff** — doesn't optimize for tool cost vs. cycle time
8. **No CAM strategy recommendation** — doesn't suggest trochoidal/adaptive based on stickout

---

## Future Enhancements

1. **Smart caching with TTL** — invalidate after 5 minutes or on reconnection
2. **Predictive prefetch** — load common tools while user types material
3. **Multi-operation apply** — select multiple operations, apply to all
4. **Tool life cost analysis** — show tool cost vs. cycle time tradeoff
5. **Thermal prediction** — estimate spindle thermal growth and compensate
6. **Machine kinematics** — verify tool can reach part geometry
7. **5-axis contour** — generate 5-axis toolpaths directly
8. **Live SLD visualization** — show chatter lobes graph in Fusion window
9. **Persistent favorites** — remember user's last material/machine/tool selections
10. **Cloud sync** — sync preferences across multiple machines

---

## File Structure

```
H:/prism/mcp-server/scripts/fusion360-addin/
├── FusionFeedsCalculator.py (698 lines)
│   ├── PRISM API Client (lines 22-41)
│   ├── Data Loaders (lines 49-80)
│   ├── Physics Calls (lines 86-153)
│   ├── Offline Fallback (lines 159-247)
│   ├── UI Panel (lines 267-408)
│   ├── Input Handler (lines 414-482)
│   ├── Execute Handler (lines 485-497)
│   ├── Apply Logic (lines 599-659)
│   └── Main/Stop (lines 662-698)
├── UX_REVIEW_REPORT.md (full analysis, 12 checkpoints)
├── UX_FINDINGS_SUMMARY.txt (executive summary, issues by priority)
├── QUICK_FIX_CHECKLIST.md (actionable fixes with code)
└── ARCHITECTURE_NOTES.md (this file)
```

---

## Contact & Review

- **Reviewed:** 2026-03-31
- **Reviewer:** Code Quality Analyzer
- **Next Review:** After fixes applied
- **Ownership:** PRISM Fusion 360 Integration Team
