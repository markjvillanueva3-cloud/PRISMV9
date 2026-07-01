# CAD Engine Troubleshooting Guide

## Common Issues

### Query Not Routed Correctly

**Symptom:** Query classified to wrong domain (e.g., CAM instead of troubleshooting).

**Cause:** Queries with keywords spanning multiple domains may get misclassified.

**Fix:** Be more specific in your query. Use explicit problem language ("I'm having a problem with...", "I'm getting chatter...") to trigger troubleshooting routing. The system applies 2x weight to troubleshoot signals to prioritize problem indicators.

---

### Safety Score Below Threshold (Blocked)

**Symptom:** `blocked=True`, output not returned.

**Cause:** One or more validation checks scored below S(x) = 0.70.

**Fix:**
1. Check `block_reason` in the report for the specific issue
2. For CAD: Ensure features have standard tool sizes, reasonable aspect ratios, achievable tolerances
3. For CAM: Verify cutting speed is within material range, RPM within machine limit, force within fixture capacity
4. For SHOP: Remove unsafe keywords, add safety warnings, use coolant for titanium/inconel

---

### ManufacturabilityChecker: "No tool available"

**Symptom:** `tool_available` check fails.

**Cause:** Feature requires a tool diameter smaller than any in the library.

**Fix:**
- Check `min_tool_diameter` on the feature — is it realistic?
- Provide a custom `available_tools` list to the checker if your shop has non-standard sizes
- For holes: custom `available_drills` can be passed

---

### CAMSafetyOverlay: "Cutting speed exceeds max"

**Symptom:** `surface_speed` check warns or fails.

**Cause:** Specified Vc exceeds material speed range for carbide tooling.

**Fix:**
- Check the material speed ranges:
  - Aluminum: 200-1200 m/min
  - Steel: 60-250 m/min
  - Stainless: 40-180 m/min
  - Titanium: 20-80 m/min
  - Inconel: 15-50 m/min
- Reduce cutting speed to fall within range
- If using HSS tooling, use lower values within the range

---

### CAMSafetyOverlay: "Cutting force exceeds limit"

**Symptom:** `cutting_force` check warns or fails.

**Cause:** Kienzle force calculation shows force exceeding fixture capacity.

**Fix:**
- Reduce axial depth of cut (ap)
- Reduce feed per tooth (fz)
- Use a smaller tool diameter
- If fixture is light, set `fixture_rigidity < 1.0` in the overlay constructor

---

### ShopSafetyValidator: "Unsafe practice" (critical)

**Symptom:** Practice blocked with "Unsafe practice: 'remove guard'" or similar.

**Cause:** Practice description contains safety-critical keywords that are categorically unsafe.

**Blocked keywords include:**
- "remove guard"
- "bypass interlock"
- "disable safety"
- "hand near spindle"
- "loose clothing near spindle"
- "no eye protection"
- "leave chuck key in"

**Fix:** Remove the unsafe instruction from the practice. These practices are never allowed.

---

### ShopSafetyValidator: "Dry machining forbidden"

**Symptom:** Practice blocked for dry machining titanium, inconel, or stainless steel.

**Cause:** These materials require coolant to prevent fire, tool failure, or workpiece damage.

**Fix:** Add coolant to the practice. Use flood coolant for titanium and inconel. MQL (Minimum Quantity Lubrication) is acceptable for stainless steel.

---

### Teach-Me: Knowledge Item Rejected

**Symptom:** `rejected_count > 0` in learning report.

**Cause:** Extracted values failed physics validation.

**Common rejection reasons:**
- Cutting speed > 2000 m/min (unrealistic)
- RPM > 60,000 (exceeds safe maximum)
- Feed per tooth > 1.0 mm/tooth (tool breakage risk)
- Content contains unsafe practices

**Fix:** These are usually errors in the source material. Review the `warnings` list in the report for specific rejection reasons.

---

### Import Errors

**Symptom:** `ModuleNotFoundError` when importing CAD engine modules.

**Fix:**
1. Ensure Python 3.12+ is installed
2. Ensure the working directory includes the `cad-engine` root
3. Check that `src/__init__.py` exists
4. Verify: `sys.path` includes the cad-engine root directory

---

### Performance Issues

**Symptom:** Operations taking longer than expected.

**Expected performance:**
- Feature analysis: < 50ms per feature
- Manufacturability check: < 100ms per part
- CAM validation: < 100ms per strategy
- NL query: < 50ms per query
- Guidance generation: < 50ms per document
- Teach-me pipeline: < 200ms per run

**Fix:**
- Ensure no excessive feature counts (> 100 features per part)
- Batch operations use `validate_all()` for efficiency
- Avoid redundant re-initialization of modules
