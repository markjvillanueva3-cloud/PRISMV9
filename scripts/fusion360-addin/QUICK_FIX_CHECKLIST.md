# Fusion 360 Panel — Quick Fix Checklist

## Immediate (Do Now — 30 minutes)

- [ ] **Material sort** (Line 296)
  ```python
  # BEFORE:
  for m in mats:
      matDrop.listItems.add(name, ...)
  
  # AFTER:
  mats_sorted = sorted(mats, key=lambda m: m.get("name", ""))
  for m in mats_sorted:
      matDrop.listItems.add(name, ...)
  ```
  
- [ ] **Tool selection triggers calc** (Line 464, after populate tool fields)
  ```python
  # ADD at end of tool population block:
  run_calculation(inputs)
  ```

- [ ] **Unit labels clarity** (Lines 345-348)
  ```python
  # BEFORE:
  mg.addValueInput('toolDia', 'Diameter', 'mm', ...)
  
  # AFTER:
  mg.addValueInput('toolDia', 'Diameter (cm)', 'cm', ...)
  mg.addValueInput('fluteLen', 'Flute Length (cm)', 'cm', ...)
  mg.addValueInput('stickout', 'Stickout (cm)', 'cm', ...)
  ```

- [ ] **Feed rate in IPM** (Line 547)
  ```python
  # BEFORE:
  inputs.itemById('rFeed').text = f'<b>{round(feed, 1)}</b>'
  
  # AFTER:
  feed_ipm = feed / 25.4
  inputs.itemById('rFeed').text = f'<b>{round(feed, 1)} mm/min ({feed_ipm:.2f} IPM)</b>'
  ```

## Next Sprint (High Impact — 2 hours)

- [ ] **Tool caching** (Line 61-72)
  ```python
  _cache_tools = {}
  
  def load_tools(query="", tool_type="", diameter_mm=0, max_results=50):
      key = f"tool:{query}:{tool_type}:{diameter_mm}:{max_results}"
      if key in _cache_tools:
          return _cache_tools[key]
      r = prism("data/tool/search", {...})
      if r and r.get("result"):
          tools = r["result"] if isinstance(r["result"], list) else r["result"].get("tools", [])
          _cache_tools[key] = tools
          return tools
      return []
  ```

- [ ] **Machine caching** (Line 74-80)
  ```python
  _cache_machines = {}
  
  def load_machines(query="", max_results=50):
      key = f"machine:{query}:{max_results}"
      if key in _cache_machines:
          return _cache_machines[key]
      r = prism("data/machine/search", {...})
      if r and r.get("result"):
          machines = r["result"] if isinstance(r["result"], list) else r["result"].get("machines", [])
          _cache_machines[key] = machines
          return machines
      return []
  ```

- [ ] **Safety validation fallback** (Line 140-153)
  ```python
  def validate_safety(params, rpm, feed_mmmin):
      r = prism("safety/validate", {...})
      if r and r.get("result"):
          return r["result"]
      # FALLBACK: local safety checks
      return validate_safety_local(params, rpm, feed_mmmin)
  
  def validate_safety_local(params, rpm, feed_mmmin):
      violations = []
      if rpm > params.get("max_rpm", 12000) * 1.1:
          violations.append("RPM exceeds machine maximum")
      # Add more local checks
      return {"ok": len(violations) == 0, "violations": violations}
  ```

- [ ] **Tool population missing fields** (Line 450-464)
  ```python
  # ADD after current tool population:
  coat = phys.get("coating") or t.get("coating")
  if coat:
      inputs.itemById('coating').selectedItem = coat  # Find matching item
  
  nose = phys.get("corner_radius_mm") or t.get("nose_radius_mm")
  if nose:
      inputs.itemById('cornerRad').value = nose / 10
  ```

- [ ] **Error message on API fail** (Line 431-442)
  ```python
  if changed.id == 'toolDia' and prism_live():
      dia_mm = inputs.itemById('toolDia').value * 10
      tools = load_tools("", "", dia_mm, 20)
      drop = inputs.itemById('toolSelect')
      drop.listItems.clear()
      drop.listItems.add('Manual Entry', True)
      if not tools:
          drop.listItems.add('No tools found (check PRISM connection)', False)
      for t in tools:
          # ... existing code ...
  ```

- [ ] **Partial application reporting** (Line 636-656)
  ```python
  not_applied = []
  for pname, val, label in [...]:
      try:
          par = params.itemByName(pname)
          if par:
              par.expression = val
              applied.append(label)
          else:
              not_applied.append(f"{pname} not found")
      except Exception as e:
          not_applied.append(f"{pname}: {str(e)}")
  
  msg = f'Applied:\n' + '\n'.join(applied)
  if not_applied:
      msg += f'\n\nNOT applied:\n' + '\n'.join(not_applied)
  ```

- [ ] **Offline status detail** (Line 288)
  ```python
  # BEFORE:
  tag = '<span style="color:#ffaa00;">PRISM OFFLINE</span>' if not live else ...
  
  # AFTER:
  if live:
      tag = '<span style="color:#00ff88;">PRISM CONNECTED</span>'
  elif can_reach_network():
      tag = '<span style="color:#ff4444;">PRISM server unreachable (http://127.0.0.1:3000)</span>'
  else:
      tag = '<span style="color:#ff4444;">Network offline</span>'
  
  def can_reach_network():
      try:
          request = Request('http://8.8.8.8:53')
          request.method = 'HEAD'
          with urlopen(request, timeout=2):
              return True
      except:
          return False
  ```

## Nice-to-Have (Polish — 1.5 hours)

- [ ] **Input validation** (gather_params)
  ```python
  def validate_params(p):
      if p.get("tool_diameter_mm", 0) <= 0:
          return False, "Diameter must be > 0"
      if p.get("flutes", 0) <= 0:
          return False, "Flutes must be > 0"
      if p.get("max_rpm", 0) <= 0:
          return False, "Max RPM must be > 0"
      return True, ""
  
  # Call in run_calculation:
  ok, msg = validate_params(p)
  if not ok:
      inputs.itemById('rRpm').text = f'<span style="color:#ff4444;">ERROR: {msg}</span>'
      return
  ```

- [ ] **Clear stale results on error** (Line 596)
  ```python
  except Exception as e:
      err_msg = str(e)[:60]
      inputs.itemById('rRpm').text = f'<span style="color:#ff4444;">Error: {err_msg}</span>'
      inputs.itemById('rFeed').text = ''
      inputs.itemById('rConf').text = ''
      inputs.itemById('rVc').text = ''
      # Clear other fields
  ```

- [ ] **Warning severity stratification** (Line 589-593)
  ```python
  warnings = r.get("playbook_warnings", [])
  critical = [w for w in warnings if w.get("severity") == "CRITICAL"]
  normal = [w for w in warnings if w.get("severity") != "CRITICAL"]
  
  warn_html = ""
  for w in critical[:3]:
      warn_html += f'<span style="color:#ff4444;">• {str(w)[:70]}</span><br>'
  for w in normal[:2]:
      warn_html += f'<span style="color:#ffaa00;">• {str(w)[:70]}</span><br>'
  ```

- [ ] **Tool label uniqueness** (Line 440)
  ```python
  # BEFORE:
  label = f"{mfr} {desc}".strip()[:60]
  
  # AFTER:
  label = f"{mfr} {desc}".strip()[:60]
  if not mfr or len(label) < 5:
      tool_id = t.get('id', t.get('sku', '?'))
      label = f"{label} [SKU: {tool_id}]"
  ```

- [ ] **Reconnection detection** (Top-level)
  ```python
  # Add periodic check (every 5 seconds):
  import time
  
  class ConnectivityChecker:
      last_check = 0
      cached_status = False
      
      def check(self):
          now = time.time()
          if now - self.last_check > 5:  # Check every 5 sec
              self.cached_status = prism_live()
              self.last_check = now
          return self.cached_status
  
  checker = ConnectivityChecker()
  
  # In run_calculation, after calculating, if offline → try refresh:
  if not checker.check() and r.get("source") == "LOCAL (PRISM offline)":
      if checker.check():  # Recheck
          r = calc_speed_feed(p)  # Retry with PRISM
  ```

---

## Testing Checklist

Before committing, verify:

- [ ] Material dropdown is alphabetically sorted (both PRISM and offline)
- [ ] Selecting a tool from library updates all fields AND recalculates results
- [ ] Unit labels clearly say "(cm)" or "(mm)"
- [ ] Feed result shows both mm/min and IPM
- [ ] Changing diameter searches tools (max 20 shown) with no lag
- [ ] Selecting machine populates RPM/power
- [ ] Applying to CAM operation shows which params were applied and which weren't
- [ ] Offline mode shows "PRISM server unreachable..." not vague "PRISM OFFLINE"
- [ ] Negative diameter/flutes rejected with error message
- [ ] Calculation errors clear old results instead of leaving stale values
- [ ] Safety validation prevents applying unsafe parameters

---

## Rollout Plan

1. **Batch 1 (1 hour):** Material sort, tool calc trigger, unit labels, feed IPM
   → Push as patch (v0.2.1)

2. **Batch 2 (2 hours):** Caching, safety fallback, error reporting
   → Push as minor (v0.3.0)

3. **Batch 3 (1.5 hours):** Validation, warning colors, reconnection
   → Push as polish (v0.3.1)

Total: ~4.5 hours elapsed time (highest ROI improvements first)

---

## File Paths for Reference

- **Main panel:** `H:/prism/mcp-server/scripts/fusion360-addin/FusionFeedsCalculator.py`
- **Full review:** `H:/prism/mcp-server/scripts/fusion360-addin/UX_REVIEW_REPORT.md`
- **Summary:** `H:/prism/mcp-server/scripts/fusion360-addin/UX_FINDINGS_SUMMARY.txt`
- **This checklist:** `H:/prism/mcp-server/scripts/fusion360-addin/QUICK_FIX_CHECKLIST.md`
