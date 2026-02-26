---
name: prism-fft-chatter
description: |
  FFT-based chatter prediction from MIT 18.086/2.830. Vibration analysis, stability lobe diagrams, real-time chatter onset detection.

  MIT 18.086 (Computational Science), MIT 2.830 (Control of Manufacturing)
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "chatter", "vibration", "FFT", "stability lobe", "chatter detection", "frequency analysis", "spindle speed", "machining dynamics"
- Source: `C:/PRISM/extracted/algorithms/PRISM_FFT_PREDICTIVE_CHATTER.js`
- Category: manufacturing

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-fft-chatter")`
2. Functions available: analyzeVibration, generateStabilityLobes, predictChatter
3. Cross-reference with dispatchers:
   - prism_calc
   - prism_safety
   - prism_manufacturing

### What It Returns
- **Format**: Structured computation results with parameters and formulas
- **Location**: Loaded into context via skill_content
- **Source Code**: `C:/PRISM/extracted/algorithms/PRISM_FFT_PREDICTIVE_CHATTER.js`

### Examples
**Example 1**: Direct function call
-> Load skill -> Apply analyzeVibration() with parameters -> Return result

**Example 2**: Auto-triggered by context
-> User mentions keyword -> Skill auto-loads -> Relevant functions available

# Prism Fft Chatter

## Source
**MIT 18.086 (Computational Science), MIT 2.830 (Control of Manufacturing)**

## Functions
analyzeVibration, generateStabilityLobes, predictChatter

## Integration
- Extracted from: `PRISM_FFT_PREDICTIVE_CHATTER.js`
- Mapped engines: See ALGORITHM_REGISTRY.json
- Auto-load triggers: chatter, vibration, FFT, stability lobe, chatter detection
