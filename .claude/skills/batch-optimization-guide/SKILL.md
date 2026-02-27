---
name: batch-optimization-guide
description: 'Batch and production optimization guide. Use when the user needs to optimize batch sizes, reduce setup times, improve throughput, or implement lean manufacturing principles.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: Optimization
---

# Batch & Production Optimization Guide

## When to Use
- Optimizing batch sizes for cost vs. inventory tradeoff
- Reducing setup/changeover times (SMED principles)
- Improving machine throughput and OEE
- Implementing cellular manufacturing or family scheduling

## How It Works
1. Analyze current production data (cycle times, setup times, demand)
2. Calculate EOQ via `prism_calc→economic_order_qty`
3. Identify setup reduction opportunities via `prism_intelligence→setup_analysis`
4. Simulate batch scenarios via `prism_scheduling→batch_simulate`
5. Recommend optimal batch size and production sequence

## Returns
- Optimal batch size with cost curve (setup vs. inventory cost)
- Setup time reduction opportunities ranked by impact
- Throughput improvement estimate (parts/shift)
- Family grouping for similar parts to minimize changeover

## Example
**Input:** "Optimize batch size for 5 part families, current setup 45min avg, demand 200/month each"
**Output:** Current: 200pc batches, 45min setup, 4.2% setup time. Optimal: Family A/B combined run (similar tooling) at 150pc, Family C/D at 100pc, Family E at 200pc. Setup reduction: quick-change tooling saves 28min (17min avg setup). Result: 38% less WIP inventory, throughput +12%, OEE improvement from 68% to 76%.
