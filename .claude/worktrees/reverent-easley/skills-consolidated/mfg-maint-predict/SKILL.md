---
name: mfg-maint-predict
description: Predict maintenance needs and schedule proactively
---

# Predictive Maintenance Scheduler

## When To Use
- Planning maintenance windows to minimize production disruption
- Predicting when a component will need replacement based on usage patterns
- Scheduling preventive maintenance based on remaining useful life estimates
- Optimizing maintenance intervals between too-early and too-late

## How To Use
```
prism_intelligence action=maint_predict params={machine_id: "DMG-5X-01", component: "spindle_bearings", horizon: "6_months"}
prism_intelligence action=maint_schedule params={machine_id: "DMG-5X-01", maintenance_type: "spindle_service", preferred_window: "weekends"}
```

## What It Returns
- `predicted_failure_date` — estimated date range for component failure
- `remaining_useful_life` — estimated hours/days remaining before service needed
- `confidence_interval` — confidence range for the prediction (e.g., 80-120 days at 90%)
- `scheduled_date` — recommended maintenance date optimized for production
- `cost_impact` — estimated cost of planned maintenance vs. unplanned failure

## Examples
- Predict spindle bearing life: `maint_predict params={machine_id: "DMG-5X-01", component: "spindle_bearings"}` — returns 2,400 hours remaining useful life, recommend service in 90-110 days at current utilization
- Schedule ballscrew replacement: `maint_schedule params={machine_id: "HAAS-VF2-03", maintenance_type: "z_ballscrew", preferred_window: "weekends"}` — schedules for March 15 weekend, estimated 8hr downtime, $4,200 cost vs. $18,000 unplanned
- Predict coolant pump failure: `maint_predict params={machine_id: "MORI-NLX-02", component: "coolant_pump", horizon: "3_months"}` — returns 65% probability of failure within 60 days based on pressure drop trend
