---
name: prism-troubleshooting-chatter
description: 'Chatter troubleshooting guide. Use when the user has chatter or vibration during machining and needs to diagnose the source, select stable parameters, or apply stability lobe analysis.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M122
  category: operator-knowledge
---

# Troubleshooting Chatter

## When to Use
- Audible chatter marks on workpiece surface
- Vibration during roughing or finishing operations
- Selecting stable spindle speeds using stability lobe diagrams
- Diagnosing chatter source (tool, workpiece, fixture, spindle)

## How It Works
1. Identify chatter type: regenerative, forced, or mode coupling
2. Count chatter marks to find frequency: `freq = marks × RPM / 60`
3. Check against stability lobes via `prism_calc→stability_lobe_analyze`
4. Apply corrective action (RPM shift, DOC reduction, or damping)
5. Verify fix via test cut and surface inspection

## Returns
- Chatter frequency and likely source identification
- Stability lobe diagram with current operating point
- Recommended stable RPM zones (sweet spots between lobes)
- Additional fixes: variable helix tools, damping, workholding stiffness

## Example
**Input:** "Chatter when face milling 304SS, 63mm face mill, 4 inserts, 800 RPM"
**Output:** Chatter frequency: count marks — if 8 marks/rev → 8 × 800/60 = 107 Hz. This is likely workpiece/fixture natural frequency. Options: (1) Change RPM to stable zone: try 750 RPM (lobe valley) or 880 RPM (next valley). Stability lobes show stable pockets at 680-760 and 850-920 RPM for this system. (2) Reduce Ap from 3mm to 2mm (below stability limit at 800 RPM). (3) Use 5-insert cutter (changes tooth passing frequency). Quick fix: try 720 RPM with 2.5mm Ap — both within stable region.
