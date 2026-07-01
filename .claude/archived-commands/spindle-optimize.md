# Spindle Optimize — Harmonic-Aware RPM Selection

Find the optimal spindle speed that avoids exciting machine structural resonances, maximizing surface quality.

## Args: $ARGUMENTS
- `[rpm] [flutes]`: Quick analysis at specific RPM with N flutes
- `[rpm_min]-[rpm_max] [flutes]`: Sweep range to find optimal RPM
- `map [rpm_min]-[rpm_max] [flutes]`: Generate quality map across range
- Empty: interactive — ask for machine modes and cutting parameters

## Workflow

1. **Gather Input**: Machine natural frequencies (from tap test or spec sheet), number of flutes, RPM range
2. **Analyze**: Call `prism_calc` with action `spindle_harmonic_analysis` or `spindle_optimal_rpm`
3. **Report**: Show quality score, harmonic excitations, RPMs to avoid, sweet spots
4. **Surface Impact**: Show surface_penalty_factor — multiply theoretical Ra by this value

## Quick Reference

**Tooth Passing Frequency**: TPF = RPM x Flutes / 60 [Hz]
**Rule of thumb**: Avoid RPMs where TPF harmonics (1x, 2x, 3x...) land on machine natural frequencies.
**Common machine modes**: 500-1500 Hz (tool bending), 1000-3000 Hz (spindle), 2000-5000 Hz (structure)

## Example

```
/spindle-optimize 3000-12000 4
```
Sweeps 3000-12000 RPM with 4-flute endmill, reports:
- Optimal RPM with highest quality score
- Top 5 best RPMs
- RPMs to avoid (resonance zones)
- Sweet spot ranges for programming

## Actions Used
- `spindle_harmonic_analysis` — single RPM analysis
- `spindle_optimal_rpm` — range sweep with ranking
- `spindle_quality_map` — full map for visualization
