# Inconel & Nickel Superalloy Machining (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Material-Specific - Master Level

## Description
Nickel-based superalloys (Inconel 718, 625, Waspaloy, etc.) are extremely difficult to machine due to high strength at temperature and work hardening.

## Recommended Parameters (Carbide)
- Speed: 20-50 m/min
- Feed: 0.03-0.10 mm/tooth
- Depth of cut: Light (0.3-1.0 mm)
- Tool: Coated carbide or ceramic (for high speed)

## Key Challenges
- Rapid work hardening
- High cutting forces
- Very poor tool life compared to steel
- Notch wear is common

## PRISM Implementation
- Dedicated superalloy model with high kc1.1 and low recommended speeds
- Strong emphasis on UQ due to high variability

## JM Die Notes
- Very little superalloy work, but when it appears it is high-value
- Ceramic tools sometimes used for roughing at higher speeds

**Last Updated:** 2026-06-12