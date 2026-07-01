# Operating System — Shell Bootstrap, Job Desk, Program Release, Scheduling, Shop Floor

Interact with the PRISM operating-system layer: shell bootstrap, employee desks, job desk aggregator, program release catalog, scheduling study, and shop floor check-in.

## Args: $ARGUMENTS
- Empty: show shell bootstrap overview (desk counts, pinned/recent entities)
- `shell [profileId]`: get role-filtered employee shell bootstrap (machinist, programmer, lead, quality, manager, engineer)
- `profiles`: list all employee shell profiles
- `desk [jobId]`: get job desk record with traveler steps, shortages, approvals, timeline
- `catalog`: show program release catalog (part classes, machines, toolholders, fixtures, stock, CAD sources)
- `workspace [partClassId] [machineId]`: build program release workspace with DfM findings, GD&T, cost breakdown
- `scheduling [algorithm]`: aggregate scheduling study results (job-shop, single-machine, johnsons, cpm)
- `shop-floor register [jobId]`: register job on shop floor
- `shop-floor check-in [department]`: check into department
- `shop-floor tasks [department] [role]`: get tracked tasks by department and role
- `shop-floor roi`: get ROI signals

## Execution

### Shell Bootstrap
Call `prism_operating_system → shell_bootstrap` with optional jobs array and approvalCount.
Returns desk counts, pinned entities, recent entities for the operating-system shell.

### Employee Shell
Call `prism_operating_system → shell_employee_bootstrap` with profileId.
Returns role-filtered nav groups, home modules, access cards, shift priorities, attention items, restricted surfaces.

### Job Desk Aggregator
Call `prism_operating_system → job_desk` with job record and optional hotJobIds.
Returns traveler steps derived from routing, shortage detection, 3-stage approval chain (Engineering/Quality/Shipping), over-estimate flagging, timeline, and tracking packet.

### Program Release Catalog
Call `prism_operating_system → program_release_catalog` for full catalog.
Call `prism_operating_system → program_release_workspace` with partClassId, machineId, toolholderId, toolingPackageId, fixtureId, stockId, cadSourceId for workspace build.

### Scheduling Study Aggregator
Call `prism_operating_system → scheduling_studies` with algorithm results:
- jobShopResult: makespan, utilization, machine lanes, bottleneck detection
- singleResult: SPT sequence, avg flow time, weighted completion
- johnsonsResult: two-machine flow shop, idle time analysis
- cpmResult: critical path, project duration, slack analysis

### Shop Floor Check-In
Call `prism_operating_system → shop_floor_check_in` with action:
- `register`: register job via QR scan or manual entry
- `check-in`: department check-in with duplicate detection
- `build-tasks`: get tracked tasks filtered by department and role
- `roi-signals`: throughput, cycle variance, extra parts, completion signals
