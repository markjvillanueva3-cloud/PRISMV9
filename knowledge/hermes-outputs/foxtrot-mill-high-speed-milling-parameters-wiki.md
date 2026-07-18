# High-Speed Milling Parameters (FOXTROT)

**Galaxy:** FOXTROT (Mill)
**Status:** Core Strategy - Master Level

## Description
High-speed milling uses high spindle speeds, low stepover, and optimized engagement to achieve high material removal rates with lower tool wear and better surface finish.

## Key Parameters
- Spindle speed: Often 15,000–40,000+ RPM
- Stepover: 5–15% of diameter
- Feed per tooth: Adjusted for constant chip load
- Axial depth: Often 2–4× diameter with low radial engagement

## PRISM Implementation
- Milling Wizard + SpeedFeedOrchestratorEngine integration
- Real-time power, torque, and stability checks

## JM Die Notes
- HSM is the default for most roughing on tool steel
- Requires modern machines with high-speed spindles and good look-ahead

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)