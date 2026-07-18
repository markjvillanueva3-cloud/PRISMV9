# POST-BRIDGE-SYNERGY-MS0/U-INVENTOR-ADDIN-RESOURCES — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-INVENTOR-ADDIN-RESOURCES (slot:echo /loop iter35 /yolo): Inventor HSM add-in resource-manifest substrate — closes 3-of-3 bridge enabler triad.

**Commit:** `1ddbb96ba8f5` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T02:34:01-05:00
**Tags:** post-bridge-synergy-ms0, u-inventor-addin-resources, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-INVENTOR-ADDIN-RESOURCES (slot:echo /loop iter35 /yolo): Inventor HSM add-in resource-manifest substrate — closes 3-of-3 bridge enabler triad.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-INVENTOR-ADDIN-RESOURCES (slot:echo /loop iter35 /yolo): Inventor HSM add-in resource-manifest substrate — closes 3-of-3 bridge enabler triad.

Parallel to iter33 (Mastercam) + iter34 (hyperMILL). Inventor HSM is the
Autodesk Inventor CAM module (shared engine with Fusion 360 HSM —
historically 'HSMWorks'). Dialect inherits canonical Fanuc primary tokens
AND Fusion-tuned probing + adaptive overrides.

addinTarget = 'inventor_hsm' (fail-loud refuses 'mastercam' OR 'hypermill'
cross-bridge loads).

RESOURCE_CATEGORIES = 11 (7 baseline + 4 Inventor-specific):
  + iam_assembly_template     — Inventor assembly (.iam) post template
  + idw_drawing_template      — Inventor drawing (.idw) post template
  + adaptive_clearing_preset  — HSM adaptive-clearing preset XML
                                (requires licenseTier ∈ {premium,ultimate})
  + probing_routine           — Renishaw-style probing macro (.cnc/.f3d)

INVENTOR_DIALECT_MAP carries Fanuc-compatible primary tokens (G54..G59,
G81/G82/G83/G84/G85, M8/M9/M88/M89) + Inventor-specific extensions:
  rigid_tap_cycle      = 'G84.2' (vs G84 floating)
  probe_pre_position   = 'G65 P9810' (Renishaw pre-position)
  probe_single_surface = 'G65 P9811'
  probe_bore_id        = 'G65 P9812'
  probe_boss_od        = 'G65 P9814'
  adaptive_load_factor / adaptive_min_radius — Fusion HSM-only tokens
  retract_mode_safe / retract_mode_optimized — operator-pref toggle

INVENTOR_PROBING_MACROS (7) is the Renishaw whitelist; isProbingMacro()
case-insensitive ends-with lookup so the add-in can validate any
P-macro reference parsed from G-code before injecting probing logic
('P9810'→true, 'P9999'→false).

INVENTOR_HSM_LICENSE_TIERS = ['hsm_express', 'hsm_premium', 'hsm_ultimate']
gates adaptive_clearing_preset resources — Express tier never gets
adaptive output (it's Premium+ only), so the manifest fail-louds at
validate when an adaptive_clearing_preset lacks a licenseTier (cannot
silently downgrade to Express).

14 exports. 52 concrete-value tests with hand-checked Renishaw P-macros
(P9810=pre-position, P9812=bore-id, P9814=boss-od), Inventor-specific
G-codes (G84.2 rigid tap), 11-category invariant, byLicenseTier
cross-tabulation (2× Premium + 1× Ultimate verified).

CLOSES 3/3 BRIDGE ENABLERS in POST-BRIDGE-SYNERGY-MS0:
  ✓ U-MASTERCAM-ADDIN-RESOURCES (iter33, 47 tests)
  ✓ U-HYPERMILL-ADDIN-RESOURCES (iter34, 51 tests)
  ✓ U-INVENTOR-ADDIN-RESOURCES (iter35, 52 tests)
Total triad: 150 tests over 3 add-in manifest substrates, 9 unique
controller targets, 27 dialect tokens. Next: U-BRIDGE-CONTRACT-VERIFY
(iter36) — cross-target parity proof.
```

## Files touched (3)
- scripts/lib/inventor-addin-resource-manifest.mjs   | 227 ++++++++++++++++
- .../lib/inventor-addin-resource-manifest.test.mjs  | 301 +++++++++++++++++++++
- 2 files changed, 528 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1ddbb96ba8f5`
- Milestone envelope: `mcp-server/data/milestones/POST-BRIDGE-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._