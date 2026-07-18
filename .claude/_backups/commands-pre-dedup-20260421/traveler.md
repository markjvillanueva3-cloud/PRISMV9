# /traveler — Job Traveler & Machine Dispatch

Manage E2-style job travelers with ordered routing steps, dual time tracking (setup + cycle), QR scan, and machine dispatch queues.

## Usage

```
/traveler <job_id>                — Show traveler summary for a job
/traveler active                  — List all active travelers
/traveler board                   — Show machine dispatch planning board
/traveler scan <code> <operator>  — QR/barcode scan (auto-detects action)
```

## Implementation

### Traveler (JobTravelerEngine via /api/v1/traveler/*)
- `POST /traveler` — Create traveler with routing steps
- `GET /traveler/:jobId` — Get traveler summary (steps, times, variance)
- `GET /traveler` — List active travelers
- `POST /traveler/:jobId/steps/:step/start-setup` — Start setup timer
- `POST /traveler/:jobId/steps/:step/start-cycle` — Transition to cycle run
- `POST /traveler/:jobId/steps/:step/complete` — Complete step (records times)
- `POST /traveler/scan` — QR/barcode scan endpoint

### Dispatch (MachineDispatchEngine via /api/v1/dispatch/*)
- `GET /dispatch/board` — Planning board (all machines + queues)
- `GET /dispatch/queue/:machineId` — Single machine queue
- `POST /dispatch/assign` — Queue a job on a machine
- `POST /dispatch/reorder` — Reorder machine queue
- `POST /dispatch/what-if` — Simulate inserting a job
- `POST /dispatch/remove` — Remove queued job

## QR Code Format
`JOB-{jobId}-STEP-{stepNumber}` — targets specific step
`JOB-{jobId}` — auto-targets next pending step

## Dual Time Tracking
Each routing step tracks setup time and cycle time separately:
1. Scan/start-setup: operator begins fixturing, tool loading
2. Scan/start-cycle: setup complete, production running
3. Scan/complete: cycle done, times recorded

Variance reporting compares actual vs estimated for both setup and cycle.

## Safety
- Dual time enforced by `pre-routing-step-dual-time` hook
- All steps complete → JobLifecycleEngine auto-transitions job to "complete"
- Setup + cycle totals feed ActualCostEngine for cost variance
- OEE data published via EventBus for MachineDispatchEngine completions
