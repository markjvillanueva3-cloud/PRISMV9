# PHASE R9: REAL-WORLD INTEGRATION
### RECOMMENDED_SKILLS: prism-design-patterns, prism-codebase-packaging, prism-hook-system
### HOOKS_EXPECTED: ALL
### DATA_PATHS: C:\PRISM\mcp-server\src

<!-- ANCHOR: r9_connecting_prism_to_running_machines_cam_systems_and_the_physical_shop_floor -->
## Connecting PRISM to Running Machines, CAM Systems, and the Physical Shop Floor
<!-- ANCHOR: r9_v14_2_prerequisites_r3_actions_r7_intelligence_r8_experience_layer -->
## v14.2 | Prerequisites: R3 (actions), R7 (intelligence), R8 (experience layer)
# DEPENDS ON: R3 complete (campaign actions), R7 complete (intelligence), R8 complete (experience layer)

---

<!-- ANCHOR: r9_quick_reference_standalone_after_compaction_no_other_doc_needed -->
## QUICK REFERENCE (standalone after compaction â€” no other doc needed)
```
BUILD:      npm run build (NEVER standalone tsc â€” OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit â†’ git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails â†’ try different approach. 6 total â†’ skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R9 = Hybrid MCP + Code | Sonnetâ†’Opus. Integration Architect.
```

---

<!-- ANCHOR: r9_knowledge_contributions_what_this_phase_feeds_into_the_hierarchical_index -->
## KNOWLEDGE CONTRIBUTIONS (what this phase feeds into the hierarchical index)
```
BRANCH 1 (Execution Chain): External system integration patterns â€” API adapters, protocol bridges,
  data transformation chains for CAM, ERP, MES systems.
BRANCH 4 (Session Knowledge): Integration protocol decisions, data format mapping choices,
  error handling patterns for unreliable external services, retry strategies.
AT PHASE GATE: CODEBASE_INDEX.json updated with integration bridge chains.
```

---

<!-- ANCHOR: r9_phase_objective -->
## PHASE OBJECTIVE

R1-R8 operate inside the conversation. R9 breaks through the chat window and connects
to the **physical world**: running CNC machines, CAM software, measurement devices,
ERP systems, and the machinist's phone on the shop floor.

PRISM without R9 is an advisor. PRISM with R9 is an **operator**.

---


---

<!-- ANCHOR: r9_context_bridge -->
## CONTEXT BRIDGE

WHAT CAME BEFORE: R8 built the user experience layer (intent engine, persona formatting,
workflow chains, setup sheets). PRISM is intelligent and usable but offline.

WHAT THIS PHASE DOES: Connects PRISM to the physical shop floor. MTConnect/OPC-UA for live
machine data, CAM plugins for parameter injection, DNC for G-code transfer, mobile interfaces
for tablet-at-machine usage, ERP/MES for production scheduling integration.

WHAT COMES AFTER: R10 (Manufacturing Revolution) builds paradigm-shifting features on top of
the connected foundation: digital twins, generative process planning, self-optimizing parameters,
multi-machine orchestration. R11 (Product Packaging) runs in parallel for market launch.

<!-- ANCHOR: r9_ms0_mtconnect_opc_ua_data_ingestion -->
## MS0: MTConnect / OPC-UA DATA INGESTION
<!-- ANCHOR: r9_role_integration_engineer_model_opus_protocol_arch_sonnet_adapter_impl_effort_xl_25_calls_sessions_2 -->
### Role: Integration Engineer | Model: Opus (protocol arch) â†’ Sonnet (adapter impl) | Effort: XL (25 calls) | Sessions: 2
<!-- ANCHOR: r9_sessions_2_effort_xl_prerequisites_r7_ms0_physics_predictions -->
### Sessions: 2 | Effort: XL | Prerequisites: R7-MS0 (physics predictions)

<!-- ANCHOR: r9_the_opportunity -->
### The Opportunity

Every modern CNC machine broadcasts real-time data over MTConnect (open standard) or
OPC-UA (industrial standard). A Haas with MTConnect exposes:

```
Spindle speed (actual RPM)        Spindle load (% of rated)
Feed rate (actual vs commanded)   Axis positions (X, Y, Z, A, B, C)
Execution state (running/idle)    Part count
Program name                      Active tool number
Coolant state (on/off/pressure)   Alarms (active + history)
Cycle time (current part)         Power consumption
```

This data flows continuously at 100ms-1s intervals. **Nobody is using it intelligently.**
Machine monitoring solutions (MachineMetrics, Memex, etc.) display dashboards and calculate
OEE. They don't use it for **physics-informed decisions**.

PRISM can.

<!-- ANCHOR: r9_architecture -->
### Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     MTConnect/     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     MCP      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  CNC Machine â”‚ â”€â”€â”€â”€ OPC-UA â”€â”€â”€â”€â–¶ â”‚  PRISM Bridge    â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶ â”‚  PRISM   â”‚
â”‚  (Haas/DMG/  â”‚     (network)     â”‚  Service         â”‚   (actions)  â”‚  MCP     â”‚
â”‚   Mazak/etc) â”‚                   â”‚  (Node.js)       â”‚              â”‚  Server  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                          â”‚
                                   â”Œâ”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”
                                   â”‚  Time-Series â”‚
                                   â”‚  Database    â”‚
                                   â”‚  (InfluxDB / â”‚
                                   â”‚   TimescaleDB)â”‚
                                   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**New module**: `prism-bridge-service/` â€” standalone Node.js service that:
1. Connects to machines via MTConnect Agent HTTP or OPC-UA client
2. Streams data into time-series database
3. Exposes data to PRISM MCP server via ProtocolBridgeEngine.ts (already exists)
4. Runs real-time anomaly detection on incoming streams

<!-- ANCHOR: r9_real_time_intelligence_actions -->
### Real-Time Intelligence Actions

#### `machine_live_status`
```typescript
interface MachineLiveStatus {
  machine_id: string;
  connected: boolean;
  state: 'running' | 'idle' | 'setup' | 'alarm' | 'offline';
  current: {
    program: string;
    tool: string;
    spindle_rpm: number;
    spindle_load_pct: number;
    feed_rate_mmmin: number;
    position: { x: number; y: number; z: number; a?: number; b?: number; c?: number };
    cycle_time_elapsed_sec: number;
    part_count: number;
  };
  alerts: {
    type: 'chatter_detected' | 'overload_trending' | 'tool_wear_predicted' | 'thermal_drift';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    recommended_action: string;
  }[];
}
```

#### `chatter_detect_live`
Instead of analytical prediction (R7-MS0), this uses ACTUAL vibration data:

```typescript
// Listen to spindle load signal in real-time
// Apply FFT from PRISM_FFT_PREDICTIVE_CHATTER.js
// If dominant frequency matches predicted chatter frequency â†’ alert
// If spindle load variance exceeds threshold â†’ alert

interface LiveChatterResult {
  chatter_detected: boolean;
  dominant_frequency_hz: number;
  severity: number;                      // 0-1, how bad
  current_rpm: number;
  recommended_rpm: number[];             // Stable pockets from SLD
  action: string;                        // "Reduce RPM to 2,800 immediately"
}
```

This is the killer feature. Nobody else can take a real-time spindle load signal,
run FFT, cross-reference against a stability lobe diagram calculated from the
specific tool/holder/machine combination, and recommend a specific stable RPM pocket.
Not MachineMetrics. Not Memex. Not Siemens MindSphere. Nobody.

#### `tool_wear_monitor`
Track spindle load trends over the tool's life to predict remaining life:

```typescript
interface ToolWearMonitor {
  tool_id: string;
  installed_at: Date;
  current_cutting_time_min: number;
  predicted_remaining_life_min: number;
  wear_rate: 'normal' | 'accelerating' | 'stable';
  spindle_load_trend: {
    initial_pct: number;                 // Load when tool was new
    current_pct: number;                 // Load now
    slope: number;                       // Rate of increase
  };
  recommendation: string;               // "Replace in ~8 minutes" or "Tool running well"
}
```

**Physics**: As a tool wears, cutting forces increase â†’ spindle load increases.
The rate of increase correlates with wear rate. A sudden spike indicates edge chipping.
PRISM can overlay Taylor tool life prediction with actual spindle load data to create
a **hybrid predictive model** that's more accurate than either alone.

<!-- ANCHOR: r9_thermal_drift_compensation_live -->
### Thermal Drift Compensation (Live)

R7-MS0 calculates thermal compensation theoretically. With MTConnect:

```typescript
// Read actual spindle temperature sensor (if available)
// Read ambient temperature
// Track axis drift over time from touch probe cycles (if performed)
// Update thermal compensation model with ACTUAL data
// Recommend: "Run touch probe cycle now â€” predicted Z drift is 0.018mm"
```

<!-- ANCHOR: r9_implementation_notes -->
### Implementation Notes

- MTConnect is HTTP-based â€” easy to consume from Node.js
- OPC-UA requires the `node-opcua` library â€” more complex but covers European machines
- Start with MTConnect (Haas, Mazak, Okuma support it natively)
- DMG Mori uses CELOS + OPC-UA; Siemens uses MindSphere/OPC-UA
- Fanuc uses FOCAS protocol (proprietary) â€” wrap with open-source fanuc-focas library
- Time-series DB is essential â€” raw MTConnect data at 1Hz = 86,400 data points/day/machine

---

<!-- ANCHOR: r9_ms1_cam_system_plugins -->
## MS1: CAM SYSTEM PLUGINS
<!-- ANCHOR: r9_role_integration_engineer_model_opus_plugin_arch_sonnet_per_cam_impl_effort_xl_30_calls_sessions_2_3 -->
### Role: Integration Engineer | Model: Opus (plugin arch) â†’ Sonnet (per-CAM impl) | Effort: XL (30 calls) | Sessions: 2-3
<!-- ANCHOR: r9_sessions_2_3_effort_xl_prerequisites_r3_parameter_actions_r8_intent_layer -->
### Sessions: 2-3 | Effort: XL | Prerequisites: R3 (parameter actions), R8 (intent layer)

<!-- ANCHOR: r9_the_opportunity -->
### The Opportunity

95% of CNC programs are created in CAM software. If PRISM lives inside the CAM system,
the programmer never has to leave their workflow to get intelligent recommendations.

<!-- ANCHOR: r9_target_cam_systems_priority_order -->
### Target CAM Systems (priority order)

1. **Fusion 360** (Autodesk) â€” largest user base, cloud-native, excellent API
2. **Mastercam** â€” largest professional install base, .NET plugin API
3. **SolidCAM** â€” integrated in SolidWorks, growing market share
4. **Siemens NX** â€” enterprise, complex but huge market
5. **hyperMILL** â€” popular for 5-axis work

<!-- ANCHOR: r9_fusion_360_plugin_architecture -->
### Fusion 360 Plugin Architecture

Fusion 360 supports add-ins written in Python or C++ that can:
- Read the current CAD model (geometry, materials)
- Read/modify CAM operations (tools, parameters, toolpaths)
- Display custom UI panels
- Make HTTP calls to external services

**PRISM Fusion 360 Add-In**:

```python
# prism_fusion_addin.py â€” conceptual architecture

class PRISMAddin:
    def __init__(self):
        self.panel = self.create_ui_panel()
        self.mcp_client = PRISMMCPClient("http://localhost:3000")

    def on_operation_created(self, operation):
        """When user creates a new CAM operation, offer PRISM recommendations."""
        material = self.get_model_material()
        tool = operation.tool
        feature = self.analyze_feature(operation.geometry)

        # Call PRISM
        recommendation = self.mcp_client.call("job_plan", {
            "material": material,
            "tool": tool.description,
            "operation": operation.type,
            "feature": feature
        })

        # Display in panel
        self.panel.show_recommendation(recommendation)

    def on_calculate_pressed(self):
        """User requests PRISM optimization of current operation."""
        op = self.get_selected_operation()
        params = self.mcp_client.call("optimize_parameters", {
            "material": self.get_model_material(),
            "feature": self.analyze_feature(op.geometry),
            "constraints": {
                "surface_finish_ra_max_um": op.surface_quality,
                "tolerance_mm": op.tolerance
            }
        })

        # Apply optimal parameters to the CAM operation
        if self.user_confirms(params):
            op.cutting_speed = params.optimal.vc_mpm
            op.feed_per_tooth = params.optimal.fz_mm
            op.axial_depth = params.optimal.ap_mm
            op.radial_depth = params.optimal.ae_mm

    def on_simulate(self):
        """After simulation, offer chatter and surface integrity analysis."""
        results = self.get_simulation_results()
        for op in results.operations:
            chatter = self.mcp_client.call("chatter_predict", {
                "machine": self.user_machine,
                "tool_diameter_mm": op.tool.diameter,
                "spindle_rpm": op.rpm,
                "radial_depth_mm": op.ae,
                "axial_depth_mm": op.ap,
                "material": self.get_model_material()
            })
            if not chatter.stable:
                self.panel.show_warning(f"Op {op.name}: Chatter risk! Try {chatter.recommended_rpm[0]} RPM")
```

<!-- ANCHOR: r9_the_dream_workflow_fusion_360 -->
### The Dream Workflow (Fusion 360)

```
1. Programmer imports a STEP file into Fusion 360
2. PRISM add-in detects material from model properties or asks
3. Programmer creates a roughing operation, selects a tool
4. PRISM panel immediately shows:
   âœ… Speed: 180 SFM â†’ 2,865 RPM
   âœ… Feed: 0.004 IPT â†’ 45.8 IPM
   âœ… DOC: 0.100" | WOC: 0.250"
   âœ… Strategy: Adaptive Clearing recommended
   âš ï¸ Chatter risk at 2,865 RPM â€” try 2,400 or 3,200
   â„¹ï¸ Est. cycle time: 12.4 min
5. Programmer clicks "Apply PRISM Parameters" â†’ values populate into Fusion
6. Programmer hits Calculate â†’ Fusion generates toolpath with PRISM parameters
7. Programmer clicks "PRISM Analysis" â†’ gets surface integrity report
8. Post-process â†’ G-code with PRISM-optimized parameters
```

Time saved: 15-30 minutes per operation (manual handbook lookup + trial-and-error).
For a 10-operation part: **2-5 hours saved per program.**

<!-- ANCHOR: r9_mastercam_plugin_net -->
### Mastercam Plugin (.NET)

```csharp
// PRISM.Mastercam.Plugin â€” conceptual
public class PRISMPlugin : NetHook3App
{
    public override MCamReturn Run(int param)
    {
        var operation = GetSelectedOperation();
        var material = GetStockMaterial();

        var client = new PRISMMCPClient();
        var result = client.JobPlan(material, operation);

        ShowRecommendationDialog(result);
        if (UserAccepts())
            ApplyParameters(operation, result);

        return MCamReturn.NoErrors;
    }
}
```

---

<!-- ANCHOR: r9_ms2_dnc_file_transfer_integration -->
## MS2: DNC / FILE TRANSFER INTEGRATION
<!-- ANCHOR: r9_role_integration_engineer_model_sonnet_file_transfer_impl_effort_m_10_calls_sessions_1 -->
### Role: Integration Engineer | Model: Sonnet (file transfer impl) | Effort: M (10 calls) | Sessions: 1
<!-- ANCHOR: r9_sessions_1_effort_m_prerequisites_r8_ms4_setup_sheet -->
### Sessions: 1 | Effort: M | Prerequisites: R8-MS4 (setup sheet)

<!-- ANCHOR: r9_the_problem -->
### The Problem

PRISM generates optimized parameters and a setup sheet. The machinist still has to manually
type the program number into the CNC controller, transfer the program via USB stick or
network share, and manually verify the parameters match what PRISM recommended.

<!-- ANCHOR: r9_solution_prism_aware_dnc_bridge -->
### Solution: PRISM-Aware DNC Bridge

DNC (Direct Numerical Control / Distributed Numerical Control) systems manage program
transfer between the office network and CNC controllers. Common DNC systems:
- Cimco DNC-Max
- Predator DNC
- Shop Floor Automations (SFA)
- Built-in network transfer (Haas Net Share, Mazak Smooth Transfer)

**Integration points**:

#### Option A: File System Bridge
PRISM generates G-code snippets (parameter blocks) that can be inserted into existing programs:

```gcode
(PRISM PARAMETERS â€” Generated 2026-02-15)
(Material: AISI 4140 | Machine: Haas VF-4 | Tool: T01 1/2" 4FL CARBIDE)
(Safety Score: S=0.85 | Quality: Î©=0.78)
S3200 (PRISM: 250 SFM â†’ 3200 RPM for 0.500" dia)
F19.2 (PRISM: 0.003 IPT Ã— 4FL Ã— 1600 RPM)
(DOC=0.100 | WOC=0.125 | STRATEGY=TROCHOIDAL)
(EST TOOL LIFE: 45 MIN | EST CYCLE TIME: 12.4 MIN)
```

The machinist can paste this block into their program header.

#### Option B: Network DNC API
For shops with DNC systems that have APIs (Cimco, Predator):

```typescript
interface DNCTransfer {
  program_number: string;                // "O1234"
  machine: string;                       // Target machine on DNC network
  content: string;                       // G-code program or parameter block
  action: 'send' | 'compare' | 'verify';
}
```

The `compare` action checks if the parameters in the machine's current program match
PRISM's recommendations â€” flagging mismatches before the first cut.

#### Option C: QR Code Bridge
For shops without network DNC, PRISM generates a QR code containing the parameter set.
The machinist scans it with their phone, which displays the setup sheet on their screen.
Simple, zero infrastructure, works everywhere.

---

<!-- ANCHOR: r9_ms3_mobile_tablet_interface -->
## MS3: MOBILE / TABLET INTERFACE
<!-- ANCHOR: r9_role_ux_architect_model_sonnet_responsive_ui_effort_m_12_calls_sessions_1_2 -->
### Role: UX Architect | Model: Sonnet (responsive UI) | Effort: M (12 calls) | Sessions: 1-2
<!-- ANCHOR: r9_sessions_1_2_effort_l_m_prerequisites_r8_experience_layer -->
### Sessions: 1-2 | Effort: L-M | Prerequisites: R8 (experience layer)

<!-- ANCHOR: r9_shop_floor_reality -->
### Shop Floor Reality

Machinists don't sit at desks. They stand at machines. Their hands are dirty. They might
be wearing gloves. The interaction device is a phone in their back pocket or a tablet
mounted on the machine.

<!-- ANCHOR: r9_mobile_optimized_interface_requirements -->
### Mobile-Optimized Interface Requirements

```
DISPLAY:    Large text. High contrast. Readable in bright shop lighting.
INPUT:      Voice-first when possible. Large tap targets. No precision typing.
OUTPUT:     Parameters in LARGE FONT. Color-coded status (green=go, red=stop).
SPEED:      Answer visible within 3 seconds of query submission.
OFFLINE:    Cache frequently used material/tool combos for no-network situations.
NOISE:      Shop floors are LOUD (80-100 dB). Voice input must handle this.
```

<!-- ANCHOR: r9_mobile_specific_features -->
### Mobile-Specific Features

#### Voice Query
"Hey PRISM, what speed for 316 stainless with a three-quarter rougher?"

Voice-to-text â†’ Intent decomposition â†’ Parameters â†’ Read aloud:
"Three thousand RPM at twelve inches per minute. Point-oh-eight-oh DOC."

#### Quick Lookup Mode
Home screen with three inputs: Material, Tool, Operation.
Dropdowns with most common choices + search.
Tap "Calculate" â†’ Parameters fill the screen in 36pt font.

#### Alarm Scanner
Machine throws an alarm â†’ Machinist opens PRISM â†’ Types or speaks the alarm code â†’
Immediate plain-English explanation + fix procedure.

For machines with network connectivity: auto-detect alarm from MTConnect feed â†’
push notification to machinist's phone with diagnosis before they even read the screen.

#### Tool Life Timer
After PRISM recommends "tool life ~25 minutes," the machinist taps "Start Timer."
Phone counts down. At 80% life â†’ vibrate warning. At 100% â†’ audible alert.
After replacement, tap "New Tool" â†’ PRISM records the actual life for learning (R7-MS3).

---

<!-- ANCHOR: r9_ms4_erp_mes_integration -->
## MS4: ERP / MES INTEGRATION
<!-- ANCHOR: r9_role_integration_engineer_model_sonnet_api_opus_data_mapping_validation_effort_m_10_calls_sessions_1_2 -->
### Role: Integration Engineer | Model: Sonnet (API) â†’ Opus (data mapping validation) | Effort: M (10 calls) | Sessions: 1-2
<!-- ANCHOR: r9_sessions_1_2_effort_l_prerequisites_r7_ms5_shop_scheduling -->
### Sessions: 1-2 | Effort: L | Prerequisites: R7-MS5 (shop scheduling)

<!-- ANCHOR: r9_the_opportunity -->
### The Opportunity

Most shops run ERP (Enterprise Resource Planning) and/or MES (Manufacturing Execution
System) software that tracks jobs, inventory, labor, and costs. Common systems:

- **JobBOSS / E2 Shop System** â€” most popular for small-medium job shops
- **Epicor / Epicor Kinetic** â€” mid-market manufacturing ERP
- **ProShop** â€” paperless shop management
- **Global Shop Solutions** â€” mid-market
- **SAP / Oracle** â€” enterprise

<!-- ANCHOR: r9_integration_points -->
### Integration Points

#### Job Import
When a new work order is created in the ERP, PRISM receives:
- Part number and revision
- Material specification
- Quantity
- Due date
- Routing (sequence of operations)
- Previous run data (if repeat job)

PRISM generates: Complete manufacturing plan with parameters, tooling, estimated cycle time.
Returns to ERP: Updated routing with accurate cycle times for scheduling.

#### Tool Inventory Sync
Tool crib / inventory data from ERP feeds ToolRegistry:
- What tools are physically in stock?
- What's the current insert inventory?
- What needs to be ordered?

PRISM's tool_recommend action can filter by "tools we actually have" instead of
recommending the perfect tool that's on a 6-week backorder.

#### Cost Tracking
PRISM's process_cost returns estimated cost.
ERP tracks ACTUAL cost (machine time, labor, tooling consumed).
Delta feedback â†’ PRISM learns to estimate more accurately (R7-MS3 learning loop).

#### Quality Data
MES captures inspection results (dimensions, surface finish measurements).
Feed to PRISM â†’ compare predicted Ra vs. measured Ra â†’ adjust prediction models.

---

<!-- ANCHOR: r9_ms5_measurement_inspection_integration -->
## MS5: MEASUREMENT & INSPECTION INTEGRATION
<!-- ANCHOR: r9_role_integration_engineer_model_sonnet_cmm_probe_integration_effort_m_10_calls_sessions_1 -->
### Role: Integration Engineer | Model: Sonnet (CMM/probe integration) | Effort: M (10 calls) | Sessions: 1
<!-- ANCHOR: r9_sessions_1_effort_m_prerequisites_r7_ms0_surface_integrity -->
### Sessions: 1 | Effort: M | Prerequisites: R7-MS0 (surface integrity)

<!-- ANCHOR: r9_the_loop_that_closes_the_gap_between_prediction_and_reality -->
### The Loop That Closes the Gap Between Prediction and Reality

PRISM predicts Ra = 1.2 Î¼m. The part comes off the machine. Someone measures it.
Currently that measurement lives in a quality report and never feeds back to PRISM.

<!-- ANCHOR: r9_integration_points -->
### Integration Points

#### CMM (Coordinate Measuring Machine) Data Import
CMMs export results in DMIS, QIF, or proprietary formats.
PRISM ingests: actual dimensions, form errors, surface finish measurements.
Compares against: predicted values from job_plan.
Learns: systematic biases (always 0.005mm undersize â†’ machine needs calibration).

#### Surface Roughness Tester Integration
Mitutoyo SJ-series, Mahr MarSurf â€” many support USB data export.
Feed measured Ra/Rz to PRISM â†’ compare against predicted â†’ update surface finish model.

#### Machine Probing
In-machine touch probes (Renishaw, Blum, Heidenhain) measure features during the cycle.
With MTConnect/OPC-UA, these measurements stream to PRISM in real-time.
PRISM can: detect drift mid-batch, recommend offset adjustments, predict when tolerance
will be exceeded.

---

<!-- ANCHOR: r9_ms6_ar_guided_setup_verification_future_vision -->
## MS6: AR-GUIDED SETUP VERIFICATION (FUTURE VISION)
<!-- ANCHOR: r9_role_research_architect_model_opus_ar_architecture_sonnet_prototype_effort_xl_25_calls_sessions_2_3 -->
### Role: Research Architect | Model: Opus (AR architecture) â†’ Sonnet (prototype) | Effort: XL (25 calls) | Sessions: 2-3
<!-- ANCHOR: r9_sessions_2_3_effort_xl_prerequisites_ms3_mobile_ms0_machine_connectivity -->
### Sessions: 2-3 | Effort: XL | Prerequisites: MS3 (mobile), MS0 (machine connectivity)

<!-- ANCHOR: r9_the_problem -->
### The Problem

Setup errors are the #1 cause of crashes, scrap, and injuries in CNC machining.
Wrong tool in wrong pocket. Wrong work offset. Wrong fixture position. Wrong program loaded.

<!-- ANCHOR: r9_the_vision -->
### The Vision

Machinist points their phone camera at the machine setup. PRISM's AR overlay shows:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚     Ÿ“    PRISM Setup Verification        â”‚
â”‚                                     â”‚
â”‚  [Camera view of machine interior]  â”‚
â”‚                                     â”‚
â”‚  âœ… T01 in Pocket 1 â€” Correct       â”‚
â”‚  âœ… T02 in Pocket 3 â€” Correct       â”‚
â”‚  âš ï¸ T03 in Pocket 5 â€” Expected P4  â”‚
â”‚  âœ… Part position â€” Within 2mm      â”‚
â”‚  â“ Work offset â€” Touch off needed  â”‚
â”‚                                     â”‚
â”‚  [Verify]  [Override]  [Report]     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

<!-- ANCHOR: r9_implementation_path -->
### Implementation Path

1. **Phase 1**: QR/barcode-based verification (simpler)
   - Each tool holder has a QR code (tool ID)
   - Each fixture/vise position has a QR code
   - Machinist scans each â†’ PRISM verifies against setup sheet
   - No AR required â€” just barcode scanning

2. **Phase 2**: Image recognition (medium complexity)
   - Train model to recognize common tool types from photos
   - Verify tool type matches setup sheet (endmill vs. drill vs. tap)
   - Detect obvious errors (insert missing, tool broken, wrong holder type)

3. **Phase 3**: Full AR overlay (complex)
   - Spatial mapping of machine interior
   - Overlay expected tool positions, work offsets, fixture locations
   - Real-time guidance: "Move part 5mm to the left"

<!-- ANCHOR: r9_safety_impact -->
### Safety Impact

Setup verification reduces:
- Crashes (wrong tool/offset): estimated 60-80% reduction
- Scrap from wrong parameters: estimated 40-60% reduction
- Setup time (fewer re-checks): estimated 15-25% reduction

For a shop running 3 machines with 2 setups/day each, that's potentially
$50K-100K/year in avoided scrap and downtime.

---

<!-- ANCHOR: r9_phase_gate_r9_complete -->
## PHASE GATE: R9 â†’ COMPLETE

<!-- ANCHOR: r9_definition_of_done -->
### Definition of Done
- [ ] At least 1 machine connected via MTConnect with live data flowing
- [ ] Real-time chatter detection validated against known chatter condition
- [ ] Fusion 360 add-in successfully reads model + applies PRISM parameters
- [ ] Setup sheet transfers to machine via at least 1 DNC method
- [ ] Mobile interface usable with gloves (large tap targets verified)
- [ ] Measurement feedback loop demonstrates learning (predicted vs actual Ra)
- [ ] All integrations operate with S(x) â    ¥ 0.70 (safety never compromised by connectivity)

<!-- ANCHOR: r9_security_requirements -->
### Security Requirements
- Machine connections are READ-ONLY by default (no writing to controller)
- Write access (DNC transfer) requires explicit user confirmation
- All network communication encrypted (TLS)
- No cloud dependency for safety-critical functions (local processing)
- Air-gapped mode: PRISM works fully without internet (using local data)

---

<!-- ANCHOR: r9_estimated_effort -->
## ESTIMATED EFFORT

| Milestone | Sessions | Complexity | Key Deliverable |
|-----------|----------|------------|-----------------|
| MS0: MTConnect/OPC-UA | 2 | XL | prism-bridge-service, live monitoring |
| MS1: CAM Plugins | 2-3 | XL | Fusion 360 add-in, Mastercam plugin |
| MS2: DNC Integration | 1 | M | G-code parameter blocks, QR bridge |
| MS3: Mobile Interface | 1-2 | L-M | Touch-optimized UI, voice query |
| MS4: ERP/MES Integration | 1-2 | L | Job import, cost tracking loop |
| MS5: Measurement Integration | 1 | M | CMM/profilometer data import |
| MS6: AR Setup Verification | 2-3 | XL | QR verification â†’ image â†’ full AR |
| **TOTAL** | **10-14** | | |

---

*R9 is where PRISM leaves the chat window and enters the shop floor.
Every feature here closes a feedback loop: predict â†’ cut â†’ measure â†’ learn â†’ improve.
The chat interface becomes one of many ways to access manufacturing intelligence,
not the only way.*

---

<!-- ANCHOR: r9_r9_companion_assets_v14_5_built_per_ms_verified_at_r9_gate -->
## R9 COMPANION ASSETS (v14.5 -- built per-MS, verified at R9 gate)

<!-- ANCHOR: r9_per_ms_companion_schedule -->
### PER-MS COMPANION SCHEDULE:
```
MS0 PRODUCES:
  SKILL: prism-machine-connectivity (MTConnect/OPC-UA data interpretation, status codes)
  HOOK: machine_connection_health (warning, periodic, checks MTConnect/OPC-UA status)

MS1 PRODUCES:
  SKILL: prism-cam-integration (CAM plugin usage, parameter injection, troubleshooting)
  HOOK: cam_plugin_version_check (warning, startup, verifies CAM plugin compatibility)

MS2 PRODUCES:
  SKILL: prism-dnc-transfer (G-code transfer protocols, verification, error handling)

MS3 PRODUCES:
  SKILL: prism-mobile-guide (tablet interface usage, at-machine workflows)

MS4 PRODUCES:
  SKILL: prism-erp-integration (ERP/MES data mapping, schedule sync, order routing)

MS5 PRODUCES:
  SCRIPT: integration_smoke_test (tests all connected systems respond)
  SCRIPT: measurement_feedback_test (verifies closed-loop measurement data flow)

MS6 GATE VERIFIES:
  Both hooks fire, all 5 skills load, both scripts pass
  End-to-end: query via mobile -> PRISM calculates -> CAM receives params -> DNC transfers
```
