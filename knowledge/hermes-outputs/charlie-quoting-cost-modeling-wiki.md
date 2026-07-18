# Cost Modeling and Feature-Based Pricing (CHARLIE)

**Galaxy:** CHARLIE (Quoting)
**Status:** Core Capability - Master Level

## Description
Feature-based cost modeling that estimates manufacturing cost based on geometry, tolerances, material, and process.

## PRISM Implementation
- Cost modeling engine integrated with QuoteToShipOrchestratorEngine
- Feature-based breakdown (machining time, setup, material, tooling)
- Sensitivity analysis on key cost drivers

## Key Factors
- Machining time estimation from toolpath simulation
- Setup and fixturing costs
- Material utilization and scrap
- Tooling and consumables

## JM Die Notes
- Feature-based costing is significantly more accurate than traditional time-based quoting
- Rule: Always break down cost by major features and processes

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)