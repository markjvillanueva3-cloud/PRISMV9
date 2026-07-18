# Shop Setup Wizard

Configure shop-wide rates, machines, and overhead for accurate costing across all PRISM engines.

## When To Use
- Setting up a new shop profile (first-time configuration)
- Updating labor rates, machine rates, or overhead percentages
- Adding or removing machines from the shop floor
- Verifying that costing engines are reading the correct shop configuration

## How To Use
Run `/shop-setup` with an optional sub-command:

- `/shop-setup` — show current shop profile summary
- `/shop-setup rates` — display and update shop rates (labor, overhead, machine rates)
- `/shop-setup machines` — list, add, update, or remove machines
- `/shop-setup validate` — run validation checks on current profile
- `/shop-setup reset` — reset to factory defaults (requires confirmation)

## Steps
1. Call `prism_business` with action `shop_config_get` to load the current profile
2. Display the profile summary:
   - Shop name, overhead %, material markup %
   - Labor, setup, programming, inspection rates
   - Machine list with types and hourly rates
   - Validation warnings (if any)
3. If the user wants changes:
   - Use `shop_config_update` for profile-level fields
   - Use `shop_config_rates` for rate updates
   - Use `shop_config_machines` for machine CRUD
4. After changes, call `shop_config_get` again to show updated state
5. Mention that changes propagate to ERPIntegrationEngine, JobCostingEngine, CapacityPlanningEngine, and QuoteEstimatorEngine automatically

## What It Returns
- Current shop profile with all rates and machines
- Validation status (warnings for out-of-range values)
- Stats: machine count, avg machine rate, total weekly capacity hours

## Examples
```
> /shop-setup
Shop Profile: Default Shop
  Overhead: 15% | Material Markup: 10%
  Labor: $45/hr | Setup: $55/hr | Programming: $75/hr
  Machines: 8 (avg $82.50/hr, 400 weekly capacity hrs)
  Status: VALID (0 warnings)

> /shop-setup rates
  laborRate: $45.00/hr → update? [enter new value or skip]
  ...
```
