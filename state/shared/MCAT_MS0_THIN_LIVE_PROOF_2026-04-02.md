# MCAT-MS0 Thin Live Proof

Generated: 2026-04-03T02:34:22.165Z  
Roadmap lane: `MCAT-MS0 / P1-U01-support`  
Unit: `U-MVAR06`

## Outcome

`U-MVAR06` is complete.

This unit proved the active machine-catalog convergence in two places:

- the calculator machine-selection surface
- the downstream Program Release / Print to CNC machine surfaces

It also surfaced and fixed a real downstream defect: Program Release was emitting duplicate machine ids, which caused duplicate-key warnings in the web page.

## Calculator Live Proof

Route: `http://127.0.0.1:3100/calculator`

### Case 1: Okuma GENOS M460V-5AX

- Result: `pass`
- Controller: `Okuma OSP-P300MA-H`
- Spindle: `15,000 RPM CAT 40 Big+`
- Tool magazine: `48`
- Enabled controller features:
  - `CAS collision avoidance`
  - `Machining Navi`
  - `High-speed machining mode`
  - `High-precision contour control`
  - `TCP / 5-axis kinematics`
  - `Tilted workplane`
- Enabled coolant strategies:
  - `Flood`
  - `Through-spindle`
  - `Through-air`
  - `Air blast`
- Holder surface:
  - `Tool crib: CAT 40 Big+`
  - `173 compatible tool holders`
- Artifact: [calculator-okuma-live-proof-2026-04-02.png](H:/PRISM/output/playwright/calculator-okuma-live-proof-2026-04-02.png)

### Case 2: Haas ST-20Y

- Result: `pass_with_open_verification`
- Controller: `Haas NGC`
- Spindle: `4,000 RPM A2-6 spindle`
- Turret presets visible: `8`, `10`, `12`, `16`, `24`
- Installed turret count: `12`
- Coolant strategies: `Flood`, `Through-spindle`
- Honest verification warnings remained visible instead of being flattened away:
  - `Live tooling` recommended but not yet confirmed
  - `Bar feeder / support` recommended but not yet confirmed

### Case 3: Citizen Cincom L20

- Result: `pass_with_fallback`
- Controller: `Cincom / Mitsubishi Meldas`
- Spindle: `10,000 RPM Swiss spindle set`
- Gang station presets visible: `6`, `8`, `10`, `12`
- Installed gang station count: `8`
- Coolant strategies: `Flood`, `Through-spindle`
- Holder surface degraded honestly to fallback:
  - `Fallback holder library`
  - `Swiss gang package`
  - `1 compatible holder`
- Artifact: [calculator-citizen-live-proof-2026-04-02.png](H:/PRISM/output/playwright/calculator-citizen-live-proof-2026-04-02.png)

## Downstream Program Release Proof

Route: `http://127.0.0.1:3100/print-to-cnc`

### REST proof

- `POST /api/v1/operating-system/program-release/catalog`
  - live machine count: `789`
  - duplicate machine ids after fix: `0`
- `POST /api/v1/operating-system/program-release/machine-search` with `manufacturer=okuma`
  - total: `56`
- `POST /api/v1/operating-system/program-release/machine-search` with `query=GENOS M460V-5AX`
  - total: `1`
- `GET /api/v1/operating-system/program-release/machine/machine-okuma-genos-m460v-5ax`
  - controller: `Okuma OSP-P300MA-H`
  - spindle: `CAT 40 Big+ 15,000rpm`
  - family: `5-Axis Machining Center`

### Browser proof

- Page mounted successfully
- Console errors after the backend refresh: `0`
- Successful live requests included:
  - `POST /api/v1/operating-system/program-release/catalog`
  - `GET /api/v1/operating-system/program-release/machine-profile/default/shell-default`
  - `POST /api/v1/operating-system/program-release/machine-search`
  - `POST /api/v1/operating-system/program-release/workspace`
- Artifact: [program-release-live-proof-2026-04-02.png](H:/PRISM/output/playwright/program-release-live-proof-2026-04-02.png)

## Real Defect Found And Fixed

### Duplicate downstream machine ids

Observed during live browser proof:

- Program Release emitted duplicate machine ids
- React threw duplicate-key warnings for downstream machine selectors

Root cause:

- [programReleaseMachineCatalog.ts](H:/PRISM/mcp-server/src/utils/programReleaseMachineCatalog.ts) merged profiles by `label + kinematics`
- downstream selectors key on `machine.id`
- some profiles survived as multiple records sharing the same `machine.id`

Fix landed:

- canonical second-pass dedupe by `machine.id` in [programReleaseMachineCatalog.ts](H:/PRISM/mcp-server/src/utils/programReleaseMachineCatalog.ts)
- regression coverage added in [operating-system-engines.test.ts](H:/PRISM/mcp-server/src/__tests__/operating-system-engines.test.ts)

## Verification

- Focused backend tests: `50/50` passing
  - [operating-system-engines.test.ts](H:/PRISM/mcp-server/src/__tests__/operating-system-engines.test.ts)
- Fast backend bundle: passed
- Full backend `npm run build`: still blocked by the existing prebuild safety gate unrelated to this slice

## Next

Advance to `U-MVAR07`.

Most logical continuation:

- promote concrete recovery slices from `U-MVAR05`
- start with the highest-denominator families still trapped in fallback-only or partial-backend state
