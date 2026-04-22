# UX Critique: PRISM v9 SFC Calculator Page

## Scope
Structured senior-level UX review of `SfcCalculatorPage.tsx` and its supporting components (`MachineModeTabs`, `MachineConfigPanel`, `machineModes.ts`, plus all child selectors in the three-column layout).

---

## 1. INFORMATION HIERARCHY AND TASK FLOW

### Finding 1.1 -- Machine Selection is Physically Divorced from Machine Configuration
**Severity: CRITICAL**

The `SmartMachineSelector` (choose your CNC machine by model) lives at the **bottom of the right column** (line 515-520 in `SfcCalculatorPage.tsx`), while `MachineConfigPanel` (controller, spindle, ATC/turret) sits at the **top of the left column** (line 370-374). These are the same conceptual domain -- "what machine am I running on?" -- but they are separated by the entire width of the screen.

A machinist's mental model is: "I'm on a Haas VF-2, it has a CAT40 spindle doing 12,000 RPM with a 24-pocket ATC." Machine identity and machine configuration are inseparable. The current layout forces the user to configure spindle and ATC on the left while picking the actual machine on the far right, creating a split-attention problem.

**Recommendation:** Merge `SmartMachineSelector` into (or immediately adjacent to) `MachineConfigPanel` in the left column. The machine model should come first -- select the machine, then its configuration details auto-populate or become refinements beneath it. This matches the user's stated expectation that selection and configuration belong in the same area.

---

### Finding 1.2 -- Center Column is Overloaded and Buries the Primary Action
**Severity: HIGH**

The center column stacks, top to bottom:
1. CAM Software Selector (card)
2. Cutting Priority Selector (card)
3. Toolpath Strategy Selector (card)
4. Parameter Panel (card)
5. Preset Manager (card)
6. **Calculate Button** (primary CTA)
7. Disabled-state hint text
8. Results Display
9. Compare / PDF buttons
10. Charts / Compare / History tabs + tab content

That is **10 distinct UI zones** in a single column. The Calculate button -- the entire reason the page exists -- is the 6th item down, below three selector cards and a parameter panel. On a typical 1080p display, the Calculate button is likely below the fold. Users will scroll past configuration, past presets, and only then find the action.

**Recommendation:** Pin the Calculate button to a fixed or sticky position, or move it immediately below the parameter inputs. Consider collapsing CAM Software and Cutting Priority into a compact row (they each have 4 options -- they could be a segmented control and a dropdown, not full cards). The Preset Manager could be an icon/dropdown rather than a dedicated card.

---

### Finding 1.3 -- Sub-Operation Pills Duplicate Toolpath Strategy
**Severity: MEDIUM**

The sub-operation pill bar (e.g., "Face Milling", "Slot Milling", "Pocket Milling" under the Mill tab) and the `ToolpathStrategySelector` card in the center column both present overlapping concepts. A user sees "Face Milling" in the pill bar AND "Face Milling" in the Toolpath Strategy list. The internal data model maps sub-operations to `OperationType` while toolpath strategies modify multipliers, but from the user's perspective the distinction is unclear.

**Recommendation:** Clarify the relationship with explicit labeling. The pills could be labeled "Operation Type" with a subtle header. The strategy selector should be labeled "Toolpath Approach" or "Cutting Strategy" and visually distinguished (e.g., "How you cut" vs "What you cut"). Consider whether both are truly needed at the same time, or whether the strategy should auto-filter based on the selected sub-operation (it partially does via `operationCategory`, but the visual overlap remains confusing).

---

## 2. MODE TAB BAR (13 TABS)

### Finding 2.1 -- 13 Mode Tabs is Approaching Cognitive Overload
**Severity: HIGH**

The tab bar presents 13 machine modes in a horizontally scrollable row: Mill, Lathe, Drilling, Boring, Grinding, Honing, Threading, Broaching, Wire EDM, Sinker EDM, Laser, Waterjet, Plasma. Even with the three group separators ("Chip Removal", "Finishing", "Non-Traditional"), this is a dense control. On screens below ~1400px the row will scroll, and group labels at `text-[9px]` become nearly invisible.

The grouping is sound conceptually, but the flat tab presentation treats a 5-axis HMC and a plasma table as peers, when in practice most users work primarily in 1-3 modes.

**Recommendation:**
- Option A: Two-tier navigation. First tier: pick the group (Chip Removal / Finishing / Non-Traditional). Second tier: pick the mode within that group. This cuts the visible tabs from 13 to 3-5 at any time.
- Option B: A "favorites" or "pinned modes" feature so users see only the 2-4 modes relevant to their shop, with an "All Modes" expansion.
- Option C: At minimum, make the group labels larger (at least `text-xs`) with clearer visual boundaries (a background tint or bordered section) so they function as real section headers rather than whisper-level hints.

---

### Finding 2.2 -- Group Labels at 9px are Below Minimum Legibility
**Severity: HIGH**

The group labels use `text-[9px]`. On a standard monitor at normal viewing distance, 9px text is below the widely accepted 11-12px minimum for legibility. Combined with `text-slate-500` on a `bg-slate-800/60` background, the contrast ratio is likely failing WCAG AA (4.5:1 for small text). These labels serve an important organizational function but are practically invisible.

**Recommendation:** Increase to at least `text-[11px]` or `text-xs` (12px). Use `text-slate-400` at minimum for the color. Consider making them vertical or badge-style to give them more visual weight without consuming horizontal space.

---

### Finding 2.3 -- Mode Tab Labels at 10px with Emojis -- Inconsistent Iconography
**Severity: MEDIUM**

Mode tabs use emoji icons (factory, wrench, bolt, etc.). Emojis render differently across operating systems and can appear blurry at small sizes. "Threading" and "Wire EDM" both use the thread/yarn emoji, making them visually identical. "Laser" uses a diamond-with-dot emoji that does not clearly communicate "laser" to most users.

**Recommendation:** Replace emojis with consistent SVG icons from a machining-appropriate icon set. If emojis must be kept, at minimum deduplicate (Threading and Wire EDM should not share an icon) and ensure each icon has a clear semantic connection to its mode.

---

## 3. SUB-OPERATION PILL BAR

### Finding 3.1 -- Pills Lack a Visible Label Explaining What They Are
**Severity: MEDIUM**

The pill bar appears as a row of small rounded buttons below the mode tabs. There is no heading or label explaining "Select a sub-operation" or "Operation Type". A first-time user sees the mode tabs, then a row of unlabeled pills, then the three-column layout. The pills look like they could be filters, tags, or secondary navigation. Their role as the primary operation selector is not self-evident.

**Recommendation:** Add a small label to the left of the pill row: "Operation:" or "Cut Type:" in a visible weight. Alternatively, display the pill bar with a subtle heading or integrate it into the mode tab card with a clear "Step 2: Choose operation" progression indicator.

---

### Finding 3.2 -- First Sub-Operation is Auto-Selected, Hiding That Choice Was Made
**Severity: LOW**

When a mode is selected, `handleModeChange` auto-selects the first sub-operation (line 136-137). This is efficient for experienced users but means a new user landing on the page may not realize the first pill is actively selected and determining downstream behavior. The active pill styling (`bg-primary-600 text-white`) helps but is identical to the mode tab active style, making both levels of selection look the same.

**Recommendation:** Differentiate the visual treatment of the active sub-operation pill from the active mode tab. Consider a distinct accent color or outline style for pills vs tabs. Alternatively, flash or animate the pill briefly on auto-selection to draw attention.

---

## 4. THREE-COLUMN LAYOUT

### Finding 4.1 -- Column Content Does Not Follow User's Decision Sequence
**Severity: HIGH**

The natural decision sequence for a machinist calculating speeds and feeds is:

1. What machine am I on? (machine + mode)
2. What am I cutting? (material + stock)
3. What operation? (sub-operation type)
4. What tool? (cutter, holder, insert)
5. What strategy/parameters? (DOC, WOC, feed approach)
6. Calculate -> review results

The current layout distributes this across columns non-sequentially:
- Left: Machine Config, Material, Stock (steps 1 partial, 2)
- Center: CAM, Priority, Strategy, Params, Presets, Calculate, Results (steps 5, 6, plus CAM which is step 0.5)
- Right: Tool, Holder, Insert, Fixture, Machine (steps 4, 1 partial)

The user zigzags: left (material) -> right (tool) -> center (strategy) -> center (calculate). The eye path is inefficient.

**Recommendation:** Reorganize to match the decision flow. One approach:
- Left: Machine (merged selector + config), Material, Stock
- Center: Tool + Holder + Insert, Fixture, Parameters, Calculate, Results
- Right: Charts, Compare, History (output/analytics)

This creates an input-left / action-center / output-right flow that reads naturally left to right.

---

### Finding 4.2 -- Right Column Mixes Input and Output Concerns
**Severity: MEDIUM**

Before this review, the Charts/Compare/History tabs were in the right column (the variable is still named `rightTabs` on line 322). They have since been moved into the center column below the results (lines 458-485). However, the right column now contains only tool-related inputs (SmartToolSelector, ToolHolderSelector, InsertSelector, FixtureSelector, SmartMachineSelector). On non-traditional modes where `showToolHolder` is false, the right column shows only Tool, Fixture, and Machine -- potentially leaving a lot of empty space.

**Recommendation:** For modes where tool holder/insert are hidden, consider collapsing the right column or widening the center to avoid a lopsided layout. A responsive approach where the right column adapts its width based on content would prevent the empty-shelf feeling.

---

### Finding 4.3 -- 3-Column Layout on Sub-1600px Screens
**Severity: MEDIUM**

The grid uses `xl:grid-cols-[...]` which means the three-column layout only activates at `>=1280px`. Below that, all cards stack into a single column, creating an extremely long scrollable page (potentially 15+ cards). There is no intermediate two-column breakpoint.

**Recommendation:** Add an `lg:grid-cols-2` breakpoint (>=1024px) that groups left+right inputs into one column and center into another, or uses a two-column stacked approach. This prevents the cliff from "3 columns" directly to "1 column."

---

## 5. DEAD ENDS AND MISSING FEEDBACK

### Finding 5.1 -- Non-Traditional Modes Show Placeholder Text Instead of Actual Controls
**Severity: HIGH**

For Wire EDM, Sinker EDM, Laser, and Waterjet modes, the `MachineConfigPanel` renders a static text box saying "Wire material, diameter, dielectric, and flushing configured in parameters below" (lines 98-123). But these parameters are NOT actually present in the center column's `ParameterPanel` -- that panel was designed for milling/turning parameters (tool_diameter, number_of_teeth, depth, width, tool_material, coolant per `DEFAULT_PARAMS`).

This creates a dead end: the user selects "Wire EDM", sees a message telling them to configure parameters "below", but the parameter panel shows milling defaults (12mm tool diameter, 4 teeth, etc.) that are meaningless for EDM.

**Recommendation:** Either implement mode-specific parameter panels that render the correct inputs per mode (guided by `paramSections` in `MachineModeConfig`), or hide the "configured below" message and show an honest "Coming soon -- not yet supported" indicator so users are not misled.

---

### Finding 5.2 -- No Progress Indicator or Wizard Guidance
**Severity: MEDIUM**

The page presents all options simultaneously with no indication of completeness. A user does not know whether they have filled in enough information to calculate. The only feedback is the disabled state of the Calculate button and a `text-xs text-slate--400` hint ("Select a material and operation to enable calculation"). This hint is tiny and easy to miss.

**Recommendation:** Add a progress indicator or checklist summary showing required vs. completed selections: "Material: selected / Operation: selected / Tool: optional / Machine: optional". This could be a compact horizontal bar above the Calculate button. It provides both guidance and status at a glance.

---

### Finding 5.3 -- CompatibilityValidator Banner Appears Before User Has Made Selections
**Severity: LOW**

The `CompatibilityValidator` is rendered at line 353 between the mode tabs and the three-column layout, regardless of whether the user has selected anything. On initial load with null material, null tool, null machine, it likely renders empty or with a "no issues" state, wasting vertical space. After calculation, if there are compatibility issues, the banner is far above the results display and may be scrolled out of view.

**Recommendation:** Only render the compatibility banner when there are actual issues to display. Consider positioning it closer to the Calculate button or results area where the user's attention is focused at decision time.

---

## 6. TEXT LEGIBILITY ON DARK BACKGROUNDS

### Finding 6.1 -- Systematic Use of Sub-Minimum Font Sizes
**Severity: HIGH**

Across the components reviewed, the following critically small font sizes appear:
- `text-[9px]` -- group labels in MachineModeTabs (line 53), overhang ratio in ToolHolderSelector (line 82), insert use description (line 44 of InsertSelector)
- `text-[10px]` -- mode tab labels (line 73-74 of MachineModeTabs), sub-operation pills, cutting priority descriptions, toolpath multiplier readouts, coating temperature, fixture force, insert geometry nose radius, badge counts

These sizes are below the 11px minimum recommended by WCAG and most platform HIG guidelines. On high-DPI displays they may be technically readable but cause eye strain; on standard monitors they are genuinely hard to read.

**Recommendation:** Establish a minimum body text size of `text-xs` (12px) throughout the calculator. Metadata and secondary labels can go to 11px but no smaller. Audit every `text-[9px]` and `text-[10px]` instance and bump them up.

---

### Finding 6.2 -- Low Contrast Text on Dark Surfaces
**Severity: HIGH**

Multiple components use `text-slate-500` on `bg-slate-800` backgrounds. Tailwind's `slate-500` is approximately `#64748b` and `slate-800` is approximately `#1e293b`. The contrast ratio between these is roughly 3.2:1, which fails WCAG AA for all text sizes (requires 4.5:1 for normal text, 3:1 for large text only).

Affected locations:
- Group labels in tab bar: `text-slate-500` on `bg-slate-800/60`
- Insert grade "use" descriptions: `text-slate-500` on `bg-slate-800/50`
- Overhang ratios: `text-slate-500` on `bg-slate-800/50`
- Fixture "Not applicable" message: `text-slate-400` on implicit dark card
- Toolpath "Select an operation first": `text-slate-400`
- Coating max-temp info: `text-slate-500`
- Spindle specs labels: `text-slate-500` on `bg-slate-800/40`

**Recommendation:** Upgrade all secondary text from `text-slate-500` to at least `text-slate-400` (approximately `#94a3b8`, yielding ~4.6:1 on slate-800). For critical informational text, use `text-slate-300`. Run an automated contrast audit across all card components.

---

## 7. MISSING ELEMENTS FOR COMPLETE USER FLOW

### Finding 7.1 -- No Unit System Toggle is Visible Before Parameters
**Severity: MEDIUM**

The imperial/metric toggle is buried inside the `ParameterPanel` component (line 408: `onToggleUnits`), but stock dimensions, tool holder shank diameters, and other components all depend on the `imperial` flag. A user who wants to work in inches must scroll to the parameter panel and find the toggle, even though their first interaction (stock dimensions) already needs it.

**Recommendation:** Surface the imperial/metric toggle as a global control in the page header or adjacent to the mode tabs. It should be visible and accessible before the user encounters any dimensional input.

---

### Finding 7.2 -- No Save/Export of Full Configuration State
**Severity: MEDIUM**

The `PresetManager` saves materialId, operationId, and params. But it does not save the machine mode, machine selection, tool holder config, insert config, fixture, CAM software, cutting priority, or toolpath strategy. A user who carefully configures a full setup cannot save and restore it.

**Recommendation:** Extend presets to capture the complete page state (all 15+ state variables), or add a separate "Save Setup" feature that serializes the entire configuration to a named profile.

---

### Finding 7.3 -- No Undo/Reset Capability
**Severity: LOW**

Once the user changes the machine mode, all downstream state is reset (line 124-151 `handleModeChange`). There is no undo mechanism. Accidentally clicking a different mode tab wipes material, tool, strategy, and config selections. For a page with this many inputs, an accidental mode switch is costly.

**Recommendation:** Add a confirmation dialog for mode changes when significant state exists ("You have an active configuration. Switching modes will reset all selections. Continue?"). Or implement a simple undo that can restore the previous state.

---

### Finding 7.4 -- Comparison Limited to 4 Entries with No Explanation
**Severity: LOW**

The `handleAddToComparison` function caps at 4 entries (line 266) and the button silently disables. There is no tooltip or message explaining why the user cannot add more.

**Recommendation:** When the Compare button is disabled at 4/4, show a tooltip: "Remove an existing comparison entry to add a new one."

---

## 8. SUMMARY TABLE

| # | Finding | Severity | Category |
|---|---------|----------|----------|
| 1.1 | Machine Selection separated from Machine Configuration | CRITICAL | Information Architecture |
| 1.2 | Center column overloaded, Calculate button below fold | HIGH | Task Flow |
| 1.3 | Sub-operation pills duplicate Toolpath Strategy | MEDIUM | Conceptual Clarity |
| 2.1 | 13 mode tabs approach cognitive overload | HIGH | Navigation |
| 2.2 | Group labels at 9px below minimum legibility | HIGH | Accessibility |
| 2.3 | Emoji icons inconsistent and duplicated | MEDIUM | Visual Design |
| 3.1 | Sub-operation pills lack label/heading | MEDIUM | Discoverability |
| 3.2 | Auto-selected first pill hides implicit choice | LOW | Feedback |
| 4.1 | Column content does not match user decision sequence | HIGH | Information Architecture |
| 4.2 | Right column mixes input/output, empty on some modes | MEDIUM | Layout |
| 4.3 | No intermediate 2-column breakpoint | MEDIUM | Responsiveness |
| 5.1 | Non-traditional modes show placeholder, no real controls | HIGH | Completeness |
| 5.2 | No progress indicator for required selections | MEDIUM | Guidance |
| 5.3 | Compatibility banner renders when empty | LOW | Layout Efficiency |
| 6.1 | Systematic use of 9-10px font sizes | HIGH | Accessibility |
| 6.2 | Low contrast text on dark backgrounds (fails WCAG AA) | HIGH | Accessibility |
| 7.1 | Unit toggle buried in parameter panel | MEDIUM | Discoverability |
| 7.2 | Presets do not save full configuration state | MEDIUM | Completeness |
| 7.3 | No undo/reset; accidental mode switch wipes state | LOW | Error Recovery |
| 7.4 | Comparison cap at 4 with no explanation | LOW | Feedback |

## Priority Action Items (Recommended Order)

1. **Merge machine selection + configuration** into a single left-column area (Finding 1.1)
2. **Fix font sizes and contrast** -- global audit, minimum 12px body, slate-400 for secondary text (Findings 6.1, 6.2, 2.2)
3. **Restructure center column** -- move Calculate button higher, collapse CAM/Priority into compact controls (Finding 1.2)
4. **Implement mode-specific parameter panels** for non-traditional modes or show honest "not yet supported" (Finding 5.1)
5. **Rethink 13-tab navigation** -- add two-tier selection or favorites (Finding 2.1)
6. **Reorder columns** to match natural decision sequence (Finding 4.1)
7. **Surface unit toggle globally** before dimensional inputs (Finding 7.1)
8. **Add progress indicator** for required fields (Finding 5.2)
9. **Extend presets** to save full configuration (Finding 7.2)
10. **Add responsive 2-column breakpoint** (Finding 4.3)
