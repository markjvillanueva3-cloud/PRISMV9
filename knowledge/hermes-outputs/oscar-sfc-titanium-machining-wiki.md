# Titanium Machining Parameters (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Material-Specific - Master Level

## Description
Titanium (especially Ti-6Al-4V) has very different behavior from steel due to low thermal conductivity and high chemical reactivity.

## Recommended Parameters (Carbide Tools)
- Speed: 40-80 m/min (much lower than steel)
- Feed: 0.05-0.15 mm/tooth
- Depth of cut: 0.5-2.0 mm (light cuts preferred)
- Coolant: High pressure through tool strongly recommended

## Key Challenges
- Built-up edge is common
- Work hardening occurs quickly
- Poor thermal conductivity leads to high tool temperatures

## PRISM Implementation
- Dedicated titanium model in MaterialRegistry
- Strong emphasis on chip thinning and high-pressure coolant checks

## JM Die Notes
- Most titanium work is 5-axis
- Tool life is highly sensitive to speed — small increases cause large drops in life

**Last Updated:** 2026-06-12