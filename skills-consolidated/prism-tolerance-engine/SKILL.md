# PRISM Tolerance Engine

## Purpose
ISO 286 tolerance analysis and shaft/hole fit calculations. Validates dimensional tolerances, calculates interference/clearance fits, and predicts assembly outcomes.

## Actions (via prism_calc)
- `tolerance_analysis` — ISO 286 tolerance lookup for given size and grade
- `fit_analysis` — Shaft/hole fit calculation (clearance, transition, interference)

## Tolerance Grades
IT01 through IT18 for nominal sizes 0-500mm per ISO 286-1.

## Fit Classes
- Clearance: H7/f6, H7/g6, H8/f7
- Transition: H7/k6, H7/m6, H7/n6
- Interference: H7/p6, H7/r6, H7/s6

## Usage
Provide nominal diameter, tolerance grade or fit class. Engine returns upper/lower deviations, min/max clearance or interference, and assembly force estimates for press fits.

## Key Parameters
- `nominal_mm` — Nominal diameter (0.1-500mm)
- `grade` — IT grade (IT01-IT18) for tolerance_analysis
- `hole` — Hole tolerance (e.g., "H7") for fit_analysis
- `shaft` — Shaft tolerance (e.g., "g6") for fit_analysis
- `material` — For interference fit force calculations

## Safety
Warns when calculated interference exceeds material yield stress. Blocks if tolerance stack-up produces negative clearance in clearance-fit assemblies.
