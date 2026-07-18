# /traveler — Job Traveler & Machine Dispatch

Manage job travelers (routing steps with dual time tracking), machine dispatch
queues, and shop floor scanning operations.

## Engine Coverage
- **JobTravelerEngine** — E2-style job traveler with ordered routing steps, setup/cycle
  dual time tracking, predecessor validation, quantity/scrap tracking, outside service
  fields, inspection gates, lot/serial tracking, and hold state
- **MachineDispatchEngine** — machine-centric dispatch queue with smart sorting
  (rush first, due date, setup group affinity, priority), what-if simulation,
  and queue reordering

## Actions (via prism_business dispatcher)
### Job Traveler
- `traveler_create` — create a traveler with routing steps for a job
- `traveler_start_setup` — begin setup phase on a routing step (validates predecessors)
- `traveler_start_cycle` — transition from setup to cycle run
- `traveler_complete` — complete or skip a routing step (tracks parts_complete, scrap)
- `traveler_get` — get traveler summary for a specific job
- `traveler_list_active` — list all active travelers
- `traveler_scan` — QR/barcode scan endpoint for quick job-step transitions

### Machine Dispatch
- `dispatch_queue` — assign a job to a machine's queue
- `dispatch_get_queue` — get queue for a specific machine
- `dispatch_reorder` — reorder entries in a machine's queue
- `dispatch_board` — get full planning board (all machine queues)
- `dispatch_what_if` — simulate inserting a job into a queue
- `dispatch_remove` — remove a queued job (requires entry_id and removed_by)

## Routes
- `POST /api/v1/traveler` — create traveler
- `GET  /api/v1/traveler/:jobId` — get traveler
- `GET  /api/v1/traveler` — list active travelers
- `POST /api/v1/traveler/:jobId/steps/:step/start-setup` — start setup
- `POST /api/v1/traveler/:jobId/steps/:step/start-cycle` — start cycle
- `POST /api/v1/traveler/:jobId/steps/:step/complete` — complete step
- `POST /api/v1/traveler/scan` — scan barcode
- `GET  /api/v1/dispatch/board` — planning board
- `GET  /api/v1/dispatch/queue/:machineId` — machine queue
- `POST /api/v1/dispatch/assign` — assign to queue
- `POST /api/v1/dispatch/reorder` — reorder queue
- `POST /api/v1/dispatch/what-if` — simulate
- `POST /api/v1/dispatch/remove` — remove from queue

## Usage
When the user asks about job routing, shop floor operations, machine queue
management, job step tracking, setup/cycle times, or dispatch planning, use
the actions above. Traveler actions go through prism_business dispatcher;
route endpoints call engines directly.

$ARGUMENTS
