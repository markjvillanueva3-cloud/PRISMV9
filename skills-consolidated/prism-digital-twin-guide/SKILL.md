---
name: prism-digital-twin-guide
version: 1.0.0
description: |
  Digital twin interaction and interpretation skill for real-time adaptive
  machining. Uses the AdaptiveControlEngine for constant chip load, chatter
  suppression, wear compensation, and thermal drift management.

  Modules Covered:
  - AdaptiveControlEngine (adaptive_chipload, adaptive_chatter, adaptive_wear, adaptive_thermal, adaptive_override)

  Gateway Routes: prism_intelligence → adaptive_*
  R10 Revolution: Rev 9 — Real-Time Adaptive Machining
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "digital twin", "adaptive", "real-time", "chip load", "chatter", "wear compensation", "thermal drift"
- User is setting up real-time feed/speed override systems
- User needs to understand adaptive machining control loops
- User wants to configure controller-specific override commands

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-digital-twin-guide")`
2. Identify the adaptive control scenario
3. Use adaptive actions:
   - `prism_intelligence→adaptive_chipload` — Calculate feed override for constant chip load through variable engagement
   - `prism_intelligence→adaptive_chatter` — Detect chatter frequency and find stable spindle RPM via stability lobes
   - `prism_intelligence→adaptive_wear` — Estimate tool wear and compute feed compensation
   - `prism_intelligence→adaptive_thermal` — Calculate thermal drift compensation per axis
   - `prism_intelligence→adaptive_override` — Generate controller-specific override commands (Fanuc/Siemens/Haas/Mazak)

### What It Returns
- **Format**: Structured JSON with override percentages, stable RPM options, wear estimates, compensation vectors
- **Success**: Ready-to-use override values or controller commands with safety validation
- **Failure**: Missing sensor data → specifies which inputs are needed

### Examples
**Example 1**: "Engagement is 150° in a corner, what feed override?"
→ `adaptive_chipload(engagement_angle: 150, nominal_chipload: 0.1)` → Feed override 73%, corrected chipload 0.098mm

**Example 2**: "I'm hearing chatter at 1200 Hz, 4-flute endmill at 8000 RPM"
→ `adaptive_chatter(frequency: 1200, flutes: 4, current_rpm: 8000)` → Stable RPM options: 7200, 6000; Recommended: 7200 RPM (-10% from current)

# DIGITAL TWIN GUIDE

## Adaptive Control Modes

### 1. Constant Chip Load
Maintains uniform chip thickness through variable engagement zones:
- Corner entry: Engagement increases → Feed must decrease
- Slot exit: Engagement decreases → Feed can increase
- Formula: `correction = sin(π/4) / sin(engagement/2)`
- Clamped to configured min/max feed override limits

### 2. Chatter Suppression
Uses stability lobe theory to find optimal RPM:
- Identifies chatter frequency from vibration sensor or audio
- Calculates stable RPM lobes: `RPM = 60 × f_chatter / (flutes × (k + 0.5))`
- Selects conservative (lower) stable RPM from options for k=1..5
- Feed tracks spindle change proportionally

### 3. Tool Wear Compensation
Triple estimation fusing time, load, and VB measurements:
- Time-based: `wear = cutting_time / expected_life`
- Load-based: `wear = (current_load / nominal_load - 1) × 2`
- VB-based: `wear = current_VB / VB_max (0.3mm ISO)`
- Feed compensation: reduces feed above 50% wear
- Replacement alert at 85% estimated wear

### 4. Thermal Drift Compensation
Per-axis compensation for temperature-induced drift:
- Z-axis: `drift = ΔT × thermal_coefficient` (largest effect)
- X/Y axes: `drift = ΔT × thermal_coefficient × 0.3`
- Machine modifiers: horizontal=0.8, gantry=0.6 (less thermal sensitivity)
- Active compensation when drift > 2 μm

## Supported Controllers
| Controller | Protocol | Feed Override | Spindle Override |
|------------|----------|---------------|-----------------|
| Fanuc | FOCAS2 | cnc_setfeedovrd | cnc_setspindleovrd |
| Siemens | OPC-UA | feedRateOvr node | spindleSpeedOvr node |
| Haas | Macro | #4009 | #4014 |
| Mazak | MT-LINKi | /cnc/feed_override | /cnc/spindle_override |
