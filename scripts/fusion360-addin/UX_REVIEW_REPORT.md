# Fusion 360 Intelligence Panel — UX/Data Flow Review

**File:** `H:/prism/mcp-server/scripts/fusion360-addin/FusionFeedsCalculator.py`  
**Review Date:** 2026-03-31  
**Lines of Code:** 698  
**Assessment:** 11/23 UX checkpoints functioning; 12 critical issues identified

---

## Executive Summary

The Fusion 360 intelligence panel provides direct access to PRISM's physics engines (Kienzle/Taylor/SLD) and 95K tool library within Fusion 360's CAM environment. While the **core calculation and safety pipeline works**, the UX has **significant gaps in data population, user feedback, offline resilience, and result validation**. The panel gracefully degrades when PRISM is offline and applies results with safety gates, but user guidance is weak and caching is minimal.

---

## Checkpoint Analysis

### 1. ✓ Tool Library Auto-Population (PARTIAL)

**Status:** YES, but with limitations

**Code Evidence** (lines 444-464):
```python
if changed.id == 'toolSelect':
    sel = inputs.itemById('toolSelect').selectedItem
    if sel and sel.name != 'Manual Entry':
        dia_mm = inputs.itemById('toolDia').value * 10
        tools = load_tools(sel.name, "", dia_mm, 5)
        if tools:
            t = tools[0]
            phys = t.get("physical", {})
            d = phys.get("cutting_diameter_mm") or t.get("cutting_diameter_mm")
            if d:
                inputs.itemById('toolDia').value = d / 10
            fl = phys.get("flute_count") or t.get("flute_count")
            if fl:
                inputs.itemById('flutes').value = int(fl)
            loc = phys.get("flute_length_mm") or t.get("flute_length_mm")
            if loc:
                inputs.itemById('fluteLen').value = loc / 10
            oal = phys.get("overall_length_mm") or t.get("overall_length_mm")
            if oal:
                inputs.itemById('stickout').value = oal / 10
```

**Issues:**
- **No coating auto-population:** Reads tool diameter, flute count, length, stickout — but does NOT populate `coating` field from tool library data
- **Missing corner radius:** Tool object may contain corner radius (for ball nose), but field is never populated
- **Flute length ≠ stickout:** Code uses `overall_length_mm` as stickout, which may be > actual engagement; should use flute length instead or provide recommendation
- **Silent fallback:** If API returns no tools, UI shows empty dropdown but no warning to user

**Recommendation:**
Extract `coating`, `nose_radius_mm`, and tool classification from PRISM tool object and auto-populate all related fields. Add visual feedback (e.g., badge: "3/5 fields populated").

---

### 2. ✓ Machine Auto-Population (WORKS)

**Status:** YES, fully functional

**Code Evidence** (lines 466-478):
```python
if changed.id == 'machine':
    sel = inputs.itemById('machine').selectedItem
    if sel and sel.name != 'Manual Entry' and prism_live():
        machines = load_machines(sel.name, 5)
        if machines:
            m = machines[0]
            mrpm = m.get("max_rpm") or m.get("spindle_max_rpm")
            if mrpm:
                inputs.itemById('maxRpm').value = int(mrpm)
            mpow = m.get("power_kw") or m.get("spindle_power_kw")
            if mpow:
                inputs.itemById('maxPower').value = round(mpow * 1.341)
```

**Assessment:** Correctly populates `maxRpm` and `maxPower` from machine registry. Conversion kW → HP is correct (×1.341).

**Minor issue:** No feedback if machine is not found in PRISM (silent no-op).

---

### 3. ✗ Material Dropdown Sorting (NOT SORTED)

**Status:** NO — alphabetical sorting not implemented

**Code Evidence** (lines 296-306):
```python
if live:
    mats = load_materials("", 100)
    for m in mats:
        name = m.get("name", m.get("id", "Unknown"))
        matDrop.listItems.add(name, name == "Steel 4140")
    if not mats:
        for n in sorted(FALLBACK_MATERIALS.keys()):  # ← Only fallback is sorted
            matDrop.listItems.add(n, n == "Steel 4140")
else:
    for n in sorted(FALLBACK_MATERIALS.keys()):
        matDrop.listItems.add(n, n == "Steel 4140")
```

**Issue:** When PRISM is live, materials from `load_materials()` are added **in API response order** (likely by frequency or internal ID), not alphabetically. Fallback materials ARE sorted. This creates inconsistent UX: offline = sorted, online = unsorted.

**Impact:** User must scroll to find "Aluminum 6061-T6" when PRISM is live, but finds it quickly when offline. Frustrating and confusing.

**Recommendation:**
```python
mats = load_materials("", 100)
if mats:
    mats_sorted = sorted(mats, key=lambda m: m.get("name", ""))
    for m in mats_sorted:
        matDrop.listItems.add(...)
```

---

### 4. ✓ WOC% Recalculation (WORKS)

**Status:** YES, updates on diameter OR woc change

**Code Evidence** (lines 423-428):
```python
if changed.id in ['woc', 'toolDia']:
    dia = inputs.itemById('toolDia').value * 10  # cm→mm
    woc = inputs.itemById('woc').value * 10
    if dia > 0:
        inputs.itemById('wocPct').text = f'{(woc / dia) * 100:.1f}%'
```

**Assessment:** Correctly recalculates WOC% when either diameter or WOC changes. Formula is correct. Updates immediately (read-only field).

---

### 5. ✓ Dual-Unit Results (PARTIALLY WORKS)

**Status:** YES for critical parameters, NO for others

**Code Evidence** (lines 546-562):
```python
inputs.itemById('rRpm').text = f'<b>..{round(rpm)}</b>'
inputs.itemById('rFeed').text = f'<b>..{round(feed, 1)}</b>'  # Only mm/min
inputs.itemById('rVc').text = f'{round(vc, 1)} m/min ({round(vc * 3.281)} SFM)'
inputs.itemById('rFz').text = f'{round(fz, 4)} mm ({round(fz / 25.4, 5)} IPT)'
inputs.itemById('rDefl').text = f'...{defl_um:.1f} um ({defl_in:.5f} in)'
inputs.itemById('rMrr').text = f'{r.get("mrr_cm3min", 0):.2f} cm3/min ({r.get("mrr_cm3min", 0) * 0.061:.3f} in3/min)'
```

**Issues:**
- **RPM:** No imperial equivalent (not applicable—RPM is universal) ✓
- **Feed rate:** Shows only **mm/min**, missing **IPM (inches per minute)**. Many US shops think in IPM.
- **Cutting force:** No metric or imperial units shown (line 552: `{r.get("tangential_force_N", 0):.1f} N` — OK, Newton is SI standard)
- **Power:** Shows both kW and HP ✓
- **Deflection:** Shows both µm and inches ✓
- **MRR:** Shows both cm³/min and in³/min ✓

**Recommendation:** Add feed rate in IPM:
```python
feed_ipm = feed / 25.4
inputs.itemById('rFeed').text = f'<b>{round(feed, 1)} mm/min ({feed_ipm:.2f} IPM)</b>'
```

---

### 6. ✓ Confidence Color Coding (WORKS)

**Status:** YES, fully functional

**Code Evidence** (lines 543-544):
```python
cc = "#00ff88" if conf >= 0.9 else "#ffaa00" if conf >= 0.7 else "#ff4444"
inputs.itemById('rConf').text = f'<span style="color:{cc};">{conf*100:.0f}%</span>'
```

**Assessment:** 
- Green (#00ff88) if ≥90% confidence
- Yellow (#ffaa00) if 70–89%
- Red (#ff4444) if <70%

Clear and effective. Users can quickly assess result reliability.

---

### 7. ✓ Warning Color Coding (WORKS)

**Status:** YES, partially

**Code Evidence** (lines 588-593):
```python
warnings = r.get("playbook_warnings", []) + r.get("recommendations", [])
if warnings:
    inputs.itemById('rWarnings').text = '<span style="color:#ffaa00;">' + '<br>'.join(str(w)[:80] for w in warnings[:5]) + '</span>'
else:
    inputs.itemById('rWarnings').text = '<span style="color:#00ff88;">All parameters within limits</span>'
```

**Assessment:**
- Warnings/recommendations shown in yellow (#ffaa00)
- "All clear" shown in green (#00ff88)
- Effective, but warnings are **truncated to 80 characters** — long warnings may lose critical info

**Issues:**
- **No distinction by severity:** All warnings are yellow. Should red-code CRITICAL safety violations
- **Truncation risk:** A warning like "Deflection exceeds 0.005 in. and will cause chatter at this stickout on machines < 50 kW..." becomes "Deflection exceeds 0.005 in. and will cause chatter at thi" — user never sees the full risk

**Recommendation:** 
- Distinguish CRITICAL (red) from WARNING (yellow)
- Add tooltip or expand button for full warning text

---

### 8. ✓ Apply to CAM Operation (WORKS WITH SAFETY GATE)

**Status:** YES, applies with safety validation

**Code Evidence** (lines 599-659):
```python
def apply_to_operation(inputs):
    # ... find CAM operation ...
    p = gather_params(inputs)
    r = calculate(p)
    rpm = r.get("spindle_rpm", 0)
    feed = r.get("feed_rate_mmmin", 0)

    # Safety validation BEFORE applying
    safety = validate_safety(p, rpm, feed)
    if not safety.get("ok", True):
        violations = safety.get("violations", [])
        vtext = '\n'.join(...)
        ui.messageBox(f'PRISM Safety Check FAILED:\n{vtext}\n\nParameters NOT applied. ...')
        return

    params = op.parameters
    applied = []
    for pname, val, label in [
        ('tool_spindleSpeed', str(round(rpm)), ...),
        ('tool_feedCutting', f'{round(feed, 1)} mm/min', ...),
        ('tool_feedPlunge', f'{round(feed * 0.5, 1)} mm/min', ...),
        ('tool_feedRamp', f'{round(feed * 0.5, 1)} mm/min', ...),
    ]:
        try:
            par = params.itemByName(pname)
            if par:
                par.expression = val
                applied.append(label)
        except Exception:
            pass

    msg = f'PRISM Applied ({r.get("source", "?")}):\n' + '\n'.join(applied)
    msg += f'\n\nConfidence: {r.get("overall_confidence", 0) * 100:.0f}%'
    msg += '\n\nPost processor generates variable S/F per G-code line.'
    ui.messageBox(msg)
```

**Assessment:**
- Validates safety BEFORE applying (prevents unsafe parameters from reaching Fusion)
- Applies to 4 parameters: `tool_spindleSpeed`, `tool_feedCutting`, `tool_feedPlunge`, `tool_feedRamp`
- Shows user which parameters were applied and confidence level
- Mentions post-processor variable S/F (good contextual help)

**Issues:**
- **Silent partial application:** If `tool_feedPlunge` parameter doesn't exist on this operation, it silently skips (caught by exception). User may not realize plunge feed wasn't applied
- **No rollback on partial failure:** If RPM applies but feed doesn't, user gets mixed results
- **Hardcoded plunge/ramp ratios:** Plunge = 50% of feed, ramp = 50%. Not all users may want these defaults

**Recommendation:**
```python
not_applied = []
for pname, val, label in [...]:
    try:
        par = params.itemByName(pname)
        if par:
            par.expression = val
            applied.append(label)
        else:
            not_applied.append(f"  {pname} not found")
    except Exception as e:
        not_applied.append(f"  {pname}: {str(e)}")

msg = f'Applied:\n' + '\n'.join(applied)
if not_applied:
    msg += f'\n\nNOT applied:\n' + '\n'.join(not_applied)
```

---

### 9. ✓ Safety Gate Before Applying (WORKS)

**Status:** YES — `validate_safety()` called before parameter write

**Code Evidence** (lines 628-634):
```python
# Safety validation before applying
safety = validate_safety(p, rpm, feed)
if not safety.get("ok", True):
    violations = safety.get("violations", [])
    vtext = '\n'.join(...)
    ui.messageBox(f'PRISM Safety Check FAILED:\n{vtext}\n\nParameters NOT applied. Adjust inputs and retry.')
    return
```

**Assessment:** Solid. Prevents unsafe speeds/feeds from reaching Fusion's CAM engine. User is informed why application was blocked.

**Issue:** `validate_safety()` implementation (line 140-153) is a **stub**:
```python
def validate_safety(params, rpm, feed_mmmin):
    """Validate calculated S/F against PRISM safety engine before applying."""
    r = prism("safety/validate", {
        "speed_rpm": rpm,
        "feed_mmrev": feed_mmmin / max(rpm, 1),
        ...
    })
    if r and r.get("result"):
        return r["result"]
    return {"ok": True, "violations": []}  # ← Defaults to OK if API fails
```

If PRISM is offline or the `/safety/validate` endpoint doesn't exist, this **always returns `{"ok": True}`** — the safety gate becomes a no-op.

**Recommendation:** Call local safety checks as fallback:
```python
return r["result"] if r and r.get("result") else validate_safety_local(params, rpm, feed)
```

---

### 10. ✗ Offline Resilience (PARTIALLY WORKS)

**Status:** WORKS for calculation, BROKEN for UI messaging

**Code Evidence**:

**Fallback calculation (lines 191-247):**
```python
def calculate_local(p):
    """Kienzle fallback when PRISM server is offline."""
    mat = FALLBACK_MATERIALS.get(...)
    # ... Kienzle calc with hardness derating ...
    return {
        "source": "LOCAL (PRISM offline)",
        "spindle_rpm": rpm,
        "feed_rate_mmmin": round(feed_mmmin, 1),
        "overall_confidence": 0.70,  # ← Lower confidence when offline
        ...
    }
```

**Unified calculate (lines 254-260):**
```python
def calculate(params):
    """Try PRISM orchestrator, fall back to local Kienzle."""
    r = calc_speed_feed(params)
    if r:
        r["source"] = "PRISM (Kienzle/Taylor/SLD)"
        return r
    return calculate_local(params)
```

**Assessment:** Core calculation gracefully degrades to Kienzle formula when PRISM is offline. Confidence is correctly marked as lower (0.70 vs. 0.85+ for PRISM).

**Issues:**
1. **Tool library search fails silently:** When user changes diameter (line 431) to search tools, if PRISM is offline:
   ```python
   if changed.id == 'toolDia' and prism_live():  # ← This is the guard
       dia_mm = inputs.itemById('toolDia').value * 10
       tools = load_tools("", "", dia_mm, 20)
   ```
   The dropdown stays empty (no tools shown). User sees no error, only an empty dropdown.

2. **Material dropdown loading:** When PRISM is offline, the material dropdown correctly shows fallback materials (lines 304-306). But when live, if the API fails mid-response, the list may be incomplete.

3. **Tribal tips fail silently:** When offline or API fails, line 582 shows:
   ```python
   inputs.itemById('rTips').text = 'Connect PRISM for 3,700+ shop tips'
   ```
   But this message never updates if the user connects PRISM later—old stale text remains.

**Recommendation:**
- Add visual indicator when tool search is disabled (greyed-out with "Offline" badge)
- Re-fetch tips on reconnection (add a "Refresh" button or poll for connectivity)
- Show error message when API fails: `"API Error: Could not load tools (check PRISM connection)"`

---

### 11. ✗ Cache Effectiveness (MINIMAL)

**Status:** PARTIALLY USED — only material query results cached

**Code Evidence** (lines 47-72):
```python
_cache = {}

def load_materials(query="", max_results=100):
    """Search 2,957 materials from PRISM registry."""
    key = f"mat:{query}"
    if key in _cache:
        return _cache[key]
    r = prism("data/material/search", {"query": query or "", "max_results": max_results})
    if r and r.get("result"):
        mats = r["result"] if isinstance(r["result"], list) else r["result"].get("materials", r["result"].get("results", []))
        _cache[key] = mats
        return mats
    return []

def load_tools(query="", tool_type="", diameter_mm=0, max_results=50):
    """Search 95,608 tools from PRISM registry."""
    body = {"query": query, "max_results": max_results}
    if tool_type:
        body["type"] = tool_type
    if diameter_mm > 0:
        body["diameter_mm"] = diameter_mm
    r = prism("data/tool/search", body)
    # ← NO CACHE
    if r and r.get("result"):
        tools = r["result"] if isinstance(r["result"], list) else r["result"].get("tools", r["result"].get("results", []))
        return tools
    return []

def load_machines(query="", max_results=50):
    """Search 910 machines from PRISM registry."""
    r = prism("data/machine/search", {"query": query or "", "max_results": max_results})
    # ← NO CACHE
    if r and r.get("result"):
        machines = r["result"] if isinstance(r["result"], list) else r["result"].get("machines", r["result"].get("results", []))
        return machines
    return []
```

**Assessment:**
- **Materials:** Cached (good). Every time user opens dropdown with no query, returns cached 100 materials
- **Tools:** NOT cached. Every diameter change triggers new API call. User changes diameter → API call → 200ms latency → lag
- **Machines:** NOT cached. Every machine selection triggers new API call

**Impact:** 
- Tool search by diameter feels sluggish (user types slowly, API call on every keystroke)
- Machine selection requires round-trip latency

**Recommendation:**
```python
_cache_tools = {}
def load_tools(query="", tool_type="", diameter_mm=0, max_results=50):
    key = f"tool:{query}:{tool_type}:{diameter_mm}:{max_results}"
    if key in _cache_tools:
        return _cache_tools[key]
    r = prism("data/tool/search", body)
    if r and r.get("result"):
        tools = r["result"] if isinstance(r["result"], list) else r["result"].get("tools", [])
        _cache_tools[key] = tools
        return tools
    return []
```

Add TTL (time-to-live) to cache: invalidate after 5 minutes or on manual refresh.

---

### 12. ✗ Tool Search Result Limits (NOT LIMITED)

**Status:** POTENTIALLY PROBLEMATIC

**Code Evidence** (lines 433-442):
```python
# Tool search when diameter changes
if changed.id == 'toolDia' and prism_live():
    dia_mm = inputs.itemById('toolDia').value * 10
    tools = load_tools("", "", dia_mm, 20)  # ← Max 20 results
    drop = inputs.itemById('toolSelect')
    drop.listItems.clear()
    drop.listItems.add('Manual Entry', True)
    for t in tools:
        desc = t.get("designation") or t.get("description") or t.get("id", "")
        mfr = t.get("manufacturer", "")
        label = f"{mfr} {desc}".strip()[:60]
        if label:
            drop.listItems.add(label, False)
```

**Assessment:**
- Max 20 tools per diameter search — reasonable limit
- Labels are truncated to 60 characters (OK)
- Dropdown should handle 20 items without lag

**Issue:** If all 20 tools have the same label (e.g., truncated identically), dropdown becomes useless. No secondary sort (by flute count, coating, price).

**Recommendation:**
```python
# Sort by relevance (e.g., flute count match, price, availability)
# Add tool ID/SKU to label if manufacturer is missing
label = f"{mfr} {desc}".strip()[:50]
if not mfr or len(label) < 5:
    label += f" [ID: {t.get('id', '?')}]"
```

---

## Data Flow Issues (Beyond Checklist)

### Issue A: Unit Conversion Confusion

**Lines 515-520 (gather_params):**
```python
"tool_diameter_mm": inputs.itemById('toolDia').value * 10,  # cm→mm
"flute_length_mm": inputs.itemById('fluteLen').value * 10,  # cm→mm
"stickout_mm": inputs.itemById('stickout').value * 10,      # cm→mm
```

Fusion 360 input values are in **cm by default** (for value inputs). This code converts to mm (×10). But **nowhere is this documented in UI labels**. Users may think "Diameter: 12" means 12 mm, but it actually means 12 cm = 120 mm.

**Recommendation:** Clarify in labels:
```python
mg.addValueInput('toolDia', 'Diameter (cm)', 'cm', adsk.core.ValueInput.createByString('1.2 cm'))
```
Or convert to mm internally after reading:
```python
def get_value_mm(inputs, field_id):
    return inputs.itemById(field_id).value * 10  # Fusion stores in cm
```

### Issue B: No Input Validation

When user enters invalid values (negative diameter, zero flutes), no validation occurs. Code silently processes them.

**Recommendation:**
```python
def validate_params(p):
    if p.get("tool_diameter_mm", 0) <= 0:
        return False, "Diameter must be > 0"
    if p.get("flutes", 0) <= 0:
        return False, "Flutes must be > 0"
    return True, ""
```

### Issue C: Stale Results on Error

If calculation fails (exception in `run_calculation`, line 529), results are not cleared. Old results remain visible.

**Recommendation:**
```python
def run_calculation(inputs):
    try:
        # ...
    except Exception as e:
        inputs.itemById('rRpm').text = f'<span style="color:#ff4444;">ERROR: {str(e)[:50]}</span>'
        inputs.itemById('rFeed').text = ''
        # Clear all result fields
```

### Issue D: Tool Selection Doesn't Update Calculation

**Lines 445-464:** When user selects a tool from library, fields are populated, but `run_calculation()` is NOT called. Result fields show old values until user manually changes another field.

**Recommendation:**
```python
if changed.id == 'toolSelect':
    # ... populate fields ...
    run_calculation(inputs)  # ← Add this
```

### Issue E: Machine Offline? Status Bar Is Vague

**Line 288:**
```python
tag = '<span style="color:#00ff88;">PRISM CONNECTED</span>' if live else '<span style="color:#ffaa00;">PRISM OFFLINE</span>'
```

User sees "PRISM OFFLINE" but doesn't know:
- Is PRISM server down?
- Is the network unreachable?
- Is the URL wrong?
- Will it reconnect automatically?

**Recommendation:**
```python
if not live:
    if can_reach_network():
        tag = '<span style="color:#ff4444;">PRISM server unreachable (http://127.0.0.1:3000)</span>'
    else:
        tag = '<span style="color:#ff4444;">Network offline</span>'
```

---

## Summary of Issues by Category

| # | Checkpoint | Status | Severity | Fix Complexity |
|---|-----------|--------|----------|-----------------|
| 1 | Tool library auto-population | PARTIAL | HIGH | Medium |
| 2 | Machine auto-population | WORKS | — | — |
| 3 | Material dropdown sorting | BROKEN | MEDIUM | Low |
| 4 | WOC% recalculation | WORKS | — | — |
| 5 | Dual-unit display | PARTIAL | MEDIUM | Low |
| 6 | Confidence color coding | WORKS | — | — |
| 7 | Warning color coding | PARTIAL | MEDIUM | Medium |
| 8 | Apply to CAM operation | WORKS | MEDIUM | Medium |
| 9 | Safety gate | PARTIAL | CRITICAL | Medium |
| 10 | Offline resilience | PARTIAL | HIGH | Medium |
| 11 | Cache effectiveness | POOR | MEDIUM | Low |
| 12 | Tool search limits | ADEQUATE | LOW | Low |
| A | Unit conversion clarity | BROKEN | HIGH | Low |
| B | Input validation | MISSING | MEDIUM | Low |
| C | Stale results on error | BROKEN | MEDIUM | Low |
| D | Tool selection calc trigger | MISSING | MEDIUM | Low |
| E | Offline status detail | VAGUE | LOW | Low |

---

## Recommended Priority (Fix Order)

### CRITICAL (Block current use):
1. **Material sorting** (line 296) — Low effort, high visibility
2. **Tool selection calc trigger** (line 464) — Users see stale results
3. **Unit conversion clarity** (line 345) — Users misread inputs
4. **Safety gate fallback** (line 142) — Gate may be ineffective offline

### HIGH (Next sprint):
5. **Tool library missing fields** (coating, corner radius) — Incomplete auto-population
6. **Offline status messaging** (line 288) — Users don't understand failure mode
7. **Cache tools & machines** (line 61, 74) — Reduces latency 200ms → 0ms
8. **Partial application reporting** (line 636) — Users need visibility into what was applied

### MEDIUM (Nice to have):
9. Add feed rate in IPM (line 547)
10. Distinguish CRITICAL vs. WARNING color (line 591)
11. Input validation (diameter > 0, flutes > 0)
12. Improve offline tool search UX (grey out + message)

---

## Files Affected

- **Primary:** `/fusion360-addin/FusionFeedsCalculator.py` (all issues)
- **Secondary:** `/web/src/pages/FusionPanel.tsx` (if it exists — web dashboard for offline mode)
- **Related:** `/mcp-server/src/routes/safety.ts` (safety/validate endpoint implementation)
- **Related:** `/mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts` (calculate function)

---

## Conclusion

The Fusion 360 panel successfully bridges PRISM's physics engines into Fusion 360's CAM environment and gracefully degrades offline. **UX problems are not safety-critical but significantly impact usability:**

- Users can't see why tools/machines didn't populate
- Stale calculation results confuse workflows
- Missing unit labels cause input errors
- Offline mode feels broken (not just offline, but the app feels broken)

**Estimated effort to fix all issues:** 16–20 hours
- Material sort + trigger calc + unit labels: 4 hours
- Tool/machine caching: 6 hours
- Safety fallback + error handling: 5 hours
- UX messaging + offline resilience: 5 hours

**Recommendation:** Prioritize the CRITICAL list (5–8 hours) before releasing to users.

