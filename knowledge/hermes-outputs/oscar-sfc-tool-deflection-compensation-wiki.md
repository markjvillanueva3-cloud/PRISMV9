# Tool Deflection Compensation (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Advanced Topic - Master Level

## Description
Tool deflection under load changes the actual depth of cut and can cause dimensional errors, especially with long or small-diameter tools.

## Key Model
Deflection ≈ (Force × Length³) / (3 × EI)

Where E = modulus, I = moment of inertia.

## PRISM Implementation
- Deflection modeling in SpeedFeedOrchestratorEngine
- Dynamic depth compensation in finishing passes

## Edge Cases
- Long tools in hard materials
- 5-axis where tool orientation changes deflection

## JM Die Notes
- Deflection is a major source of error in deep cavity and thin wall work
- Rule: Apply deflection compensation on any tool with L/D > 5 in finishing

**Last Updated:** 2026-06-12 (4-LOOP + RGS + Critic + Self-Review + Persistent Memory enforced)