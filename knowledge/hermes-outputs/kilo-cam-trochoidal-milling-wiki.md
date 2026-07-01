# Trochoidal Milling Strategy (KILO)

**Galaxy:** KILO (CAM)
**Status:** Core Strategy - Master Level

## Description
Circular (trochoidal) toolpath that maintains constant engagement while allowing high feedrates.

## Key Parameters
- Trochoid diameter: Typically 1.5–3× tool diameter
- Stepover: Very low (5–10%)
- Feedrate: 2–4× conventional

## PRISM Implementation
- ToolpathStrategyRegistry supports trochoidal
- Integrated with physics engine for optimal parameters

## Best Use Cases
- Deep pocketing in hard materials
- Thin wall roughing
- When machine power is limited

## JM Die Notes
- Excellent for 5-axis roughing of complex cavities
- Requires careful entry/exit strategy

**Last Updated:** 2026-06-12