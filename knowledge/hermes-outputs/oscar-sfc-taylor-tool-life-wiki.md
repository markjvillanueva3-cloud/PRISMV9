# Taylor Tool Life Equation (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Core Formula - Master Level

## Formula
V · T^n = C

Where:
- V = Cutting speed (m/min)
- T = Tool life (min)
- n = Taylor exponent (material + tool dependent)
- C = Constant (material + tool dependent)

## Typical n Values
- HSS on steel: 0.1–0.15
- Carbide on steel: 0.2–0.3
- Ceramic on steel: 0.4–0.6
- CBN/PCD: 0.5–0.8

## PRISM Extensions
- Extended Taylor with wear rate
- Multi-pass tool life model
- Temperature-adjusted C

## Edge Cases
- Interrupted cutting → Reduce C by 30-50%
- High temperature alloys → n drops significantly

**Last Updated:** 2026-06-12