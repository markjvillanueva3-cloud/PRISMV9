# Turning Strategies (WHISKEY)

**Galaxy:** WHISKEY (Lathe)
**Status:** Core Strategy - Master Level

## Description
Standard turning operations including roughing, finishing, threading, grooving, and parting.

## Key Strategies
- Rough turning with optimized depth and feed
- Finishing with controlled cusp height
- Threading (G76/G92, multi-pass)
- Grooving and parting with chip control
- Boring and internal turning

## PRISM Implementation
- Lathe Wizard + TurningPrintToProgramEngine
- Integrated with SpeedFeedOrchestratorEngine for optimal parameters

## JM Die Notes
- Most production turning is on tool steel and stainless
- Rule: Use G76 for threading whenever possible for consistency and control

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)