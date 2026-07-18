# Quality Dashboard

Aggregate and display the PRISM development quality dashboard.

## Usage
- `/quality-dashboard` — Compute fresh dashboard snapshot
- `/quality-dashboard read` — Show last computed dashboard
- `/quality-dashboard summary` — Show compact summary

## Actions
1. If "read" or "summary" argument: use `prism_dev:quality_dashboard_read` or `prism_dev:quality_dashboard_summary`
2. Otherwise: run `prism_dev:quality_dashboard` to compute fresh snapshot
3. Display results with alerts highlighted

## What It Shows
- System Q (min/mean across all engines)
- Per-dimension averages (W=Wiring, T=Tests, P=Physics, S=Security, D=Docs, A=Automation)
- SVI / Psi reachability
- Formula accuracy (AUTO-5)
- Self-improvement patterns and auto-fix pipeline stats (AUTO-6)
- Test pass rate and schema coverage
- Per-domain breakdown (physics, CAM, business, quality, system)
- Regression alerts (Q drop, Psi decrease, accuracy drift)
- Trend over last 10 snapshots
