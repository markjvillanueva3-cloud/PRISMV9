# Thermal-Wear Coupling Model (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Advanced Topic - Master Level

## Description
Coupled model of cutting temperature and tool wear rate using Usui wear model and RK4 integration.

## Key Equations
- Temperature: ΔT = f(V, f, ap, material)
- Wear rate: dW/dt = A · σ^n · exp(-Q/RT)
- Coupled ODE solved with RK4

## PRISM Implementation
- ThermalWearCouplingEngine
- Real-time wear prediction during simulation

## Tribal Notes
- High-speed milling of hardened steel: Temperature dominates wear
- Always monitor for built-up edge at low speeds

**Last Updated:** 2026-06-12