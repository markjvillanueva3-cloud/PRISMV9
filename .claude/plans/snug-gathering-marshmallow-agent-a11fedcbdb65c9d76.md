# QA Review: SFC Calculator -- Bugs, Edge Cases, and Crash Scenarios

## Files Reviewed
1. `web/src/pages/SfcCalculatorPage.tsx`
2. `web/src/components/sfc/MachineModeTabs.tsx`
3. `web/src/data/operations.ts`
4. `web/src/components/sfc/ParameterPanel.tsx`
5. `web/src/hooks/useSfc.ts`
6. Supporting: `comparison-types.ts`, `api/sfc.ts`, `api/client.ts`, `machineModes.ts`, `toolpathStrategies.ts`, `camSoftware.ts`

---

## CRITICAL ISSUES (Will cause crashes or incorrect results)

### BUG-01: Division by zero -- 0 flutes / 0 diameter sent to API
**Severity**: CRITICAL
**File**: `SfcCalculatorPage.tsx` line 236-263, `ParameterPanel.tsx` line 46-53
**Scenario**: User types `0` in "Number of Teeth" or `0` in "Tool Diameter".

The `ParameterPanel.set()` function (line 46-53) accepts any numeric value including zero. The HTML `min="1"` and `min="0.1"` attributes are advisory only -- they do NOT prevent manual entry of `0` or negative values. The browser allows typing `0` or `-5` and pressing Enter.

The `handleCalculate()` function (line 236) has no guard for zero values. It sends `number_of_teeth: 0` and `tool_diameter: 0` directly to the API. The server-side SFC formula uses `spindle_speed = (Vc * 1000) / (pi * D)` and `feed_rate = fz * z * n`. With `D=0`, spindle_speed becomes `Infinity`. With `z=0`, feed_rate becomes `0`, but many downstream calculations divide by feed_rate.

Several non-traditional operations (plasma, sinker EDM, laser) have **defaults with `tool_diameter: 0` and `number_of_teeth: 0`** in `operations.ts` lines 111-133. Simply selecting "HiDef Plasma" and clicking Calculate will send zeros to the API.

**Fix**: Add client-side validation before `calc.execute()`. For non-traditional operations that genuinely have no tool diameter (plasma, laser, EDM), the API must handle zeros gracefully. For chip-cutting operations, clamp to minimum positive values.

---

### BUG-02: Stale `operation` closure in `handleToolpathChange`
**Severity**: CRITICAL
**File**: `SfcCalculatorPage.tsx` line 194-203
**Scenario**: Rapid mode switching, or selecting a toolpath strategy before an operation is set.

```typescript
const handleToolpathChange = useCallback((strategy: ToolpathStrategy | null) => {
    setToolpathStrategy(strategy);
    if (strategy && operation) {  // <-- `operation` is captured at useCallback creation time
      setParams((prev) => ({
        ...prev,
        depth: +(operation.defaults.depth * strategy.docMultiplier).toFixed(3),
        width: +(operation.defaults.width * strategy.wocMultiplier).toFixed(3),
      }));
    }
  }, [operation]);  // dependency is correct, but see below
```

The dependency `[operation]` means this callback is recreated each time `operation` changes. However, `ToolpathStrategySelector` receives this callback as a prop. If the user rapidly: (1) changes mode (which nulls operation), (2) new sub-operation auto-selects, (3) user clicks a toolpath strategy -- the callback may still reference the **previous** operation object during the transient null state. This is a React batching timing issue. If `operation` is null and a strategy fires, the `if (strategy && operation)` guard catches it, so it won't crash, but the params won't update -- the user sees stale depth/width values.

**Verdict**: Not a crash, but a silent data integrity bug. The user sees outdated params.

---

### BUG-03: `handleCalculate` returns stale result reference from `makeSnapshot`
**Severity**: HIGH
**File**: `SfcCalculatorPage.tsx` lines 220-262
**Scenario**: `calc.data` might be `null` inside `makeSnapshot` after `handleCalculate` calls it.

```typescript
const handleCalculate = async () => {
    // ...
    const result = await calc.execute({...});
    if (result) {
      const snap = makeSnapshot(result);  // makeSnapshot checks `material` and `operation` from closure
```

`makeSnapshot` captures `material` and `operation` via `useCallback` deps. If the user changes material or operation *while the API call is in flight*, `makeSnapshot` will use the **new** values (because `useCallback` recreates on dep change), but the `result` is from the **old** request. This creates a snapshot with mismatched material/operation and result data. The abort mechanism in `useSfc.ts` cancels the old request, but there's a race window: if the old request completes before `abort()` fires, the result is returned.

**Fix**: Capture `material` and `operation` at the time `handleCalculate` is called, not at snapshot time.

---

### BUG-04: `useSfc` hook sets state after unmount (React memory leak warning)
**Severity**: HIGH
**File**: `useSfc.ts` lines 23-34
**Scenario**: User navigates away from the SFC page while a calculation is in progress.

The `useApiCall` hook does check `controller.signal.aborted` before setting state on success (line 26), but on the **error** path (line 33), there is no abort check. If the component unmounts and the API call fails (e.g., network error), the `setState` on line 33 fires on an unmounted component.

```typescript
} catch (e: unknown) {
    if ((e as Error).name === "AbortError") return null;  // only catches AbortError
    const msg = (e as ApiError).message || "Calculation failed";
    setState({ data: null, loading: false, error: msg });  // fires even if unmounted
    return null;
}
```

**Fix**: Check `controller.signal.aborted` before `setState` in the catch block, or use a mounted ref.

---

## HIGH SEVERITY ISSUES

### BUG-05: No machine RPM cap warning before calculation
**Severity**: HIGH
**File**: `SfcCalculatorPage.tsx` lines 318-319
**Scenario**: Calculated RPM exceeds machine's max RPM.

```typescript
const requiredRpm = calc.data?.spindle_speed ?? 0;
```

This value is only populated **after** calculation. The `CompatibilityValidator` (line 354-362) receives `requiredRpm` and presumably warns the user. But the issue is: there is zero pre-calculation validation. The user clicks Calculate, gets results with 25,000 RPM, and *then* sees a warning their machine maxes at 12,000. The results are already displayed and could be saved to history with the un-achievable RPM.

**Fix**: Either (a) cap the result to machine max RPM and recalculate feed accordingly, or (b) add a warning badge on the results display, or (c) prevent saving to history when RPM exceeds machine capability.

---

### BUG-06: `ParameterPanel` silently drops non-numeric input instead of showing error
**Severity**: HIGH
**File**: `ParameterPanel.tsx` lines 46-53
**Scenario**: User types "abc", "12.34.56", or pastes text into a numeric field.

```typescript
const set = useCallback(
    (field: keyof SfcParams, value: string) => {
      const num = parseFloat(value);
      if (field === "tool_material" || field === "coolant") {
        onChange({ ...params, [field]: value });
      } else if (!isNaN(num)) {
        const mmVal = imperial ? inToMm(num) : num;
        onChange({ ...params, [field]: mmVal });
      }
      // else: silently does nothing -- no feedback to user
    },
```

If `parseFloat` fails, the input silently refuses to update. The HTML `<input>` shows the typed text, but `params` still has the old value. This creates a visual mismatch: the user sees "abc" in the field but the internal state is `12`. They click Calculate thinking diameter is "abc" but it actually uses `12`.

**Fix**: Either (a) use controlled inputs that revert to the last valid value, or (b) show a validation error message, or (c) set the value to 0 and show a warning.

---

### BUG-07: `handleSubOperationChange` with non-matching ID silently does nothing
**Severity**: HIGH
**File**: `SfcCalculatorPage.tsx` lines 169-177
**Scenario**: A sub-operation ID from `machineModes.ts` doesn't exist in `operations.ts`.

```typescript
const handleSubOperationChange = useCallback((subOpId: string | null) => {
    setSubOperation(subOpId);
    if (subOpId) {
      const op = getOperationById(subOpId);
      if (op) handleOperationChange(op);
      // else: subOperation is set but operation is NOT updated
    }
```

If `getOperationById` returns `undefined` (which happens if someone adds a sub-operation to `machineModes.ts` but forgets to add it to `operations.ts`), the sub-operation pill appears selected (highlighted), but `operation` state is never set. The user sees the pill as active, but the Calculate button may be disabled (no operation), or worse -- the **previous** operation is still active with mismatched parameters.

Currently all IDs match between the two files, but this is a maintenance trap with zero guardrails.

**Fix**: Either (a) throw an error during development if IDs don't match, or (b) null out `operation` when lookup fails, or (c) add a build-time assertion that all sub-operation IDs exist in operations.ts.

---

### BUG-08: `thread_rolling` operation has `depth: 0` default
**Severity**: HIGH
**File**: `operations.ts` line 76
**Scenario**: User selects Threading mode > Thread Rolling. Defaults load `depth: 0`.

```typescript
{ id: "thread_rolling", ..., defaults: { tool_diameter: 10, number_of_teeth: 1, depth: 0, width: 10, ... } }
```

`depth: 0` is sent to the API as `depth: 0 * priorityCfg.docMult = 0`. Depending on the server calculation, this either returns zero MRR or causes a division-by-zero in downstream formulas.

**Fix**: Either use a small positive epsilon (e.g., `0.001`) or add validation that depth > 0 before allowing calculation.

---

## MEDIUM SEVERITY ISSUES

### BUG-09: localStorage quota exceeded -- silent failure
**Severity**: MEDIUM
**File**: `comparison-types.ts` line 36-38
**Scenario**: localStorage is full (5MB typical limit).

```typescript
function saveJson(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch { /* storage full or unavailable */ }
}
```

The error is silently swallowed. The user thinks their history/comparison is saved, but on page reload it's gone. With 100 history entries, each containing a full `SfcCalculateResult` with `meta` (an open `Record<string, unknown>`), the serialized data could easily approach the localStorage limit.

**Fix**: (a) Show a toast/warning when save fails, (b) implement a LRU eviction strategy, (c) trim `meta` before storage.

---

### BUG-10: Clearing 100 history entries has no confirmation dialog
**Severity**: MEDIUM
**File**: `SfcCalculatorPage.tsx` lines 289-292
**Scenario**: User accidentally clicks "Clear History".

```typescript
const handleClearHistory = useCallback(() => {
    setFullHistory([]);
    saveFullHistory([]);
}, []);
```

Immediately and irreversibly clears all history. No confirm dialog, no undo. This is especially bad because the comparison view is separate -- clearing history does NOT clear comparison entries, so the user might not realize the data is also in localStorage.

**Fix**: Add a confirmation dialog or undo mechanism.

---

### BUG-11: Rapid mode switching causes wasteful re-renders and API noise
**Severity**: MEDIUM
**File**: `SfcCalculatorPage.tsx` lines 124-152, `MachineModeTabs.tsx`
**Scenario**: User clicks through Mill > Lathe > Drilling > Grinding quickly.

Each click calls `handleModeChange` which triggers 8+ `setState` calls:
- `setMachineMode`, `setOperation(null)`, `setTool(null)`, `setToolpathStrategy(null)`, `setMachineConfig(...)`, `setToolHolder(...)`, `setFixtureId(null)`, `setStockDims(...)`, `setSubOperation(...)`, `setOperation(op)`, `setParams(...)`.

React batches these in event handlers, so it's one render. BUT: the auto-scroll `useEffect` in `MachineModeTabs` (line 31-37) fires on each `value` change, and the `CompatibilityValidator` component recalculates on each render. If the API is somehow triggered (unlikely in this flow since Calculate is manual), multiple abort/retry cycles would fire.

**Verdict**: Not a crash but noticeable UI jank on low-end devices. The `scrollIntoView` with `behavior: "smooth"` will queue multiple animations.

---

### BUG-12: `handleAddToComparison` stale closure on `comparison`
**Severity**: MEDIUM
**File**: `SfcCalculatorPage.tsx` lines 265-272
**Scenario**: Two rapid clicks on "+ Compare" button.

```typescript
const handleAddToComparison = useCallback((entry: CalcSnapshot) => {
    if (comparison.length >= 4) return;  // stale `comparison` from closure
    if (comparison.some((c) => c.id === entry.id)) return;
    const updated = [...comparison, entry];
    setComparison(updated);
    saveComparison(updated);
}, [comparison]);
```

The dependency on `[comparison]` means the callback is recreated on each comparison change, which is correct. But `setComparison` does not use a functional updater -- it uses the closure value directly. If two calls happen in the same React batch before the callback is recreated, the second call uses the stale `comparison` array and may add a duplicate or exceed the 4-item limit.

**Fix**: Use `setComparison(prev => ...)` pattern instead of closure capture.

---

### BUG-13: `handleRemoveFromComparison` same stale closure pattern
**Severity**: MEDIUM
**File**: `SfcCalculatorPage.tsx` lines 274-278
**Scenario**: Rapid removal clicks.

Same pattern as BUG-12. Uses closure `comparison` instead of functional updater.

---

### BUG-14: `requiredAxes` logic is too simplistic
**Severity**: MEDIUM
**File**: `SfcCalculatorPage.tsx` line 320

```typescript
const requiredAxes = operation?.category === "milling" ? 3 : 2;
```

This assumes all milling is 3-axis and everything else is 2-axis. But 5-axis milling exists (profile milling on complex surfaces), and some boring/threading operations require 3+ axes. Also, non-traditional operations (laser, waterjet, plasma) can have 2-5 axes. This feeds into `SmartMachineSelector` which presumably filters machines, potentially hiding valid machines or showing invalid ones.

---

### BUG-15: `useApiCall` return value leaks after abort
**Severity**: MEDIUM
**File**: `useSfc.ts` lines 26-29

```typescript
if (!controller.signal.aborted) {
    setState({ data: res.result, loading: false, error: null });
}
return res.result;  // <-- returns result even when aborted!
```

When aborted, state is not updated (correct), but `execute` still returns `res.result` to the caller. In `handleCalculate`, the returned `result` is used to create a snapshot and save to history. So an aborted (stale) result can still be saved to history.

**Fix**: Return `null` when aborted, same as the AbortError catch.

---

### BUG-16: `makeSnapshot` uses `Date.now()` in ID -- not guaranteed unique
**Severity**: LOW-MEDIUM
**File**: `SfcCalculatorPage.tsx` line 223

```typescript
id: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
```

The `Math.random()` part adds sufficient entropy for practical uniqueness. However, the `Date.now()` portion means two snapshots created in the same millisecond could theoretically have ID prefix collisions. The random suffix makes a full collision extremely unlikely (~1 in 2.8 trillion). This is acceptable.

**Verdict**: Technically fine, noting for completeness.

---

## LOW SEVERITY ISSUES

### BUG-17: Imperial/metric toggle in ParameterPanel does not round-trip cleanly
**Severity**: LOW
**File**: `ParameterPanel.tsx` lines 31-36, 58-59

```typescript
function mmToIn(mm: number): number { return +(mm / 25.4).toFixed(4); }
function inToMm(inch: number): number { return +(inch * 25.4).toFixed(3); }
```

Toggling metric -> imperial -> metric loses precision due to different rounding:
- `12 mm` -> `0.4724 in` -> `12.003 mm` (not 12)

Repeatedly toggling accumulates error. The internal state is always in mm, and `displayVal` converts for display, so the stored value stays at 12mm. But if the user toggles to imperial, sees `0.4724`, edits nothing, and toggles back -- the display will show `12` again (no round-trip through the setter). However, if they type `0.4724` in imperial mode, `inToMm(0.4724) = 12.003mm`, which is a subtle error.

**Fix**: Use higher precision in conversion or store values in both unit systems.

---

### BUG-18: `applyPreset` in ParameterPanel ignores current tool selection
**Severity**: LOW
**File**: `ParameterPanel.tsx` lines 62-75

When a preset is applied ("Conservative", "Standard", "Aggressive"), it resets `tool_diameter` and `number_of_teeth` to operation defaults, ignoring any tool selection the user made. The tool selector state (`tool`) is not cleared, so the UI shows a tool selected but params don't match it.

---

### BUG-19: `groupedModes()` in MachineModeTabs recalculates on every render
**Severity**: LOW
**File**: `MachineModeTabs.tsx` line 28

```typescript
const groups = groupedModes();
```

Called on every render without memoization. `MACHINE_MODES` is static, so this is a minor performance waste. Should use `useMemo` or move to module scope.

---

### BUG-20: `PRESETS` in ParameterPanel are incomplete
**Severity**: LOW
**File**: `ParameterPanel.tsx` lines 25-29

```typescript
const PRESETS: Record<string, Partial<SfcParams>> = {
  Conservative: { depth: 0.5, width: 2 },
  Standard: {},       // <-- empty
  Aggressive: {},     // <-- empty
};
```

"Standard" and "Aggressive" presets have empty partial overrides. The `applyPreset` function uses a scale factor for these, but the preset objects themselves carry no meaningful data. This is not a bug per se, but it's confusing code -- the presets dict exists but two of three entries are unused.

---

## SUMMARY TABLE

| ID | Severity | Category | File | Brief Description |
|----|----------|----------|------|-------------------|
| BUG-01 | CRITICAL | Crash/Math | operations.ts + SfcCalculatorPage | Division by zero: 0 flutes/diameter sent to API (plasma, EDM, laser defaults) |
| BUG-02 | CRITICAL | Race | SfcCalculatorPage | Stale operation closure in toolpath change during rapid mode switching |
| BUG-03 | HIGH | Race | SfcCalculatorPage | Snapshot material/operation mismatch during in-flight API |
| BUG-04 | HIGH | Memory leak | useSfc.ts | setState after unmount on error path |
| BUG-05 | HIGH | UX/Data | SfcCalculatorPage | No RPM cap -- results saved with un-achievable spindle speed |
| BUG-06 | HIGH | UX | ParameterPanel | Silent drop of invalid input creates visual/state mismatch |
| BUG-07 | HIGH | Maintenance | SfcCalculatorPage | Missing sub-op ID silently leaves stale operation |
| BUG-08 | HIGH | Math | operations.ts | thread_rolling depth=0 default causes zero MRR |
| BUG-09 | MEDIUM | Data loss | comparison-types.ts | Silent localStorage quota failure |
| BUG-10 | MEDIUM | UX | SfcCalculatorPage | No confirmation on clear 100 history entries |
| BUG-11 | MEDIUM | Perf | SfcCalculatorPage + MachineModeTabs | Rapid mode switching causes cascading state updates |
| BUG-12 | MEDIUM | Race | SfcCalculatorPage | handleAddToComparison stale closure can duplicate/exceed limit |
| BUG-13 | MEDIUM | Race | SfcCalculatorPage | handleRemoveFromComparison stale closure |
| BUG-14 | MEDIUM | Logic | SfcCalculatorPage | requiredAxes oversimplified (3 for milling, 2 for all else) |
| BUG-15 | MEDIUM | Race | useSfc.ts | Aborted request still returns result to caller |
| BUG-16 | LOW | ID gen | SfcCalculatorPage | Date.now() in ID (mitigated by random suffix) |
| BUG-17 | LOW | Precision | ParameterPanel | Imperial/metric round-trip precision loss |
| BUG-18 | LOW | UX | ParameterPanel | Presets override tool params without clearing tool selection |
| BUG-19 | LOW | Perf | MachineModeTabs | groupedModes() not memoized |
| BUG-20 | LOW | Code quality | ParameterPanel | Two of three presets are empty objects |

---

## RECOMMENDED FIX PRIORITY

### Phase 1 -- Must fix before release
1. **BUG-01**: Add input validation in `handleCalculate` -- reject `tool_diameter <= 0` and `number_of_teeth <= 0` for chip-cutting operations. For non-traditional ops, route to a different calculation path that doesn't use these values.
2. **BUG-08**: Change `thread_rolling` depth default from `0` to a small positive value, or add a zero-depth guard.
3. **BUG-15**: Return `null` after `setState` is skipped due to abort.
4. **BUG-04**: Add abort check in the catch block of `useApiCall`.
5. **BUG-06**: Use controlled inputs with validation feedback.

### Phase 2 -- Fix before beta
6. **BUG-03**: Capture `material` and `operation` at calculate-time, not snapshot-time.
7. **BUG-07**: Add development-time assertion for sub-op ID matching, or null out operation on lookup failure.
8. **BUG-12/13**: Switch to functional updater pattern `setComparison(prev => ...)`.
9. **BUG-09**: Show a toast on localStorage save failure.
10. **BUG-10**: Add confirmation dialog for clear history.

### Phase 3 -- Polish
11. All LOW severity items.
