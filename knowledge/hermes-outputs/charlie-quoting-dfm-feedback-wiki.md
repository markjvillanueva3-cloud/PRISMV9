# DFM Feedback and Scoring (CHARLIE)

**Galaxy:** CHARLIE (Quoting)
**Status:** Core Capability - Master Level

## Description
Automated Design for Manufacturability (DFM) feedback that scores parts for producibility and provides actionable recommendations.

## PRISM Implementation
- DFMFeedbackEngine integrated with QuoteToShipOrchestratorEngine
- Multi-factor scoring (geometry, material, tolerances, process)
- Severity classification (Critical / Major / Minor)

## Key Factors
- Wall thickness, draft angles, hole depth-to-diameter ratios
- Feature accessibility and tool reach
- Tolerance stack-up feasibility
- Material-process compatibility

## JM Die Notes
- DFM feedback is one of the most valuable parts of the quoting process
- Rule: Always provide specific, actionable DFM recommendations rather than generic warnings

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)