---
name: prism-signal-algo
description: |
  Signal processing algorithms from MIT 18.086. FFT/IFFT, PSD, FIR/IIR filter design, spectrogram, Hilbert transform, correlation.

  MIT 18.086, Berkeley EE120/EE123, Stanford EE263
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "FFT", "signal processing", "filter design", "FIR", "IIR", "Butterworth", "spectrogram", "power spectrum", "Hilbert transform", "correlation"
- Source: `C:/PRISM/extracted/algorithms/PRISM_SIGNAL_ALGORITHMS.js`
- Category: signal-processing

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-signal-algo")`
2. Functions available: fft, ifft, psd, designFIR, butterworth, iirFilter, convolve, crossCorrelation, autocorrelation, spectrogram, hilbert
3. Cross-reference with dispatchers:
   - prism_calc
   - prism_knowledge

### What It Returns
- **Format**: Structured computation results with parameters and formulas
- **Location**: Loaded into context via skill_content
- **Source Code**: `C:/PRISM/extracted/algorithms/PRISM_SIGNAL_ALGORITHMS.js`

### Examples
**Example 1**: Direct function call
-> Load skill -> Apply fft() with parameters -> Return result

**Example 2**: Auto-triggered by context
-> User mentions keyword -> Skill auto-loads -> Relevant functions available

# Prism Signal Algo

## Source
**MIT 18.086, Berkeley EE120/EE123, Stanford EE263**

## Functions
fft, ifft, psd, designFIR, butterworth, iirFilter, convolve, crossCorrelation, autocorrelation, spectrogram, hilbert

## Integration
- Extracted from: `PRISM_SIGNAL_ALGORITHMS.js`
- Mapped engines: See ALGORITHM_REGISTRY.json
- Auto-load triggers: FFT, signal processing, filter design, FIR, IIR
