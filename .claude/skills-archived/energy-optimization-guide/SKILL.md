---
name: energy-optimization-guide
description: 'Energy and sustainability optimization guide. Use when the user needs to reduce energy consumption, optimize coolant usage, minimize waste, or track environmental metrics.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: Sustainability
---

# Energy & Sustainability Optimization Guide

## When to Use
- Reducing energy consumption per part (kWh/part)
- Optimizing coolant flow rates and MQL strategies
- Minimizing material waste (buy-to-fly ratio)
- Tracking carbon footprint and sustainability metrics

## How It Works
1. Baseline energy usage via machine power monitoring
2. Analyze per-operation energy via `prism_calc→energy_per_part`
3. Optimize parameters for energy efficiency (lower RPM where possible)
4. Evaluate MQL vs. flood coolant via `prism_intelligence→coolant_strategy`
5. Generate sustainability report

## Returns
- Energy consumption breakdown per operation (kWh)
- Coolant optimization recommendation (flood, MQL, dry)
- Material utilization and waste metrics (buy-to-fly)
- Carbon footprint estimate per part

## Example
**Input:** "Reduce energy for titanium hip implant machining, currently 8.4 kWh/part"
**Output:** Current: 8.4 kWh/part (rough 5.1, finish 2.1, idle 1.2). Optimizations: (1) Reduce idle time with program optimization: -0.8 kWh. (2) Adaptive roughing reduces rough to 4.2 kWh (-18%). (3) MQL for finish pass: coolant pump energy -0.3 kWh. Projected: 5.5 kWh/part (35% reduction). Buy-to-fly: 8.2:1 → consider near-net forging at 3.1:1 for volumes >500/yr.
