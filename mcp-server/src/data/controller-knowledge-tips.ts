/**
 * Controller Knowledge Tips — CNC Controller Programming Intelligence
 *
 * 50 expert-level tips covering 22 controller families across 48 machine brands.
 * Covers: Fanuc, Siemens, Heidenhain, Haas, Mazak, Okuma, Hurco, Makino,
 *         Brother, Citizen, Mitsubishi, Fidia, Sodick, DATRON, Fadal, Traub,
 *         Kitamura, Index, EMAG, Heller, and cross-controller best practices.
 *
 * Generated 2026-03-07 from /controller-enrich pipeline.
 */

export const CONTROLLER_KNOWLEDGE_TIPS = [
  {
    id: "ctrl-001",
    title: "Fanuc AI Contour Control for 5-axis surface finish",
    body: "On Fanuc 31i-B5, enable AI Contour Control II (G05.1 Q1) for 5-axis simultaneous machining. This enables the look-ahead buffer (up to 200 blocks) and smooths axis transitions. Combined with Nano Smoothing (G05.1 Q2), it can reduce cycle time 10-15% while improving surface finish by filtering micro-segments from CAM output. Always pair with AICC tolerance parameter #8019.",
    category: "programming",
    tags: ["fanuc","31i-b5","ai-contour","5-axis","surface-finish","g05.1"],
    confidence: 90,
    source: "controller:fanuc_31i_manual",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-002",
    title: "Fanuc Nano Smoothing vs AI Contour Control",
    body: "Fanuc offers two smoothing modes: AI Contour Control (G05.1 Q1) optimizes acceleration/deceleration for contouring. Nano Smoothing (G05.1 Q2) converts short line segments into smooth NURBS curves internally. Use AICC for general 3+2 axis work, Nano Smoothing for complex freeform 5-axis. On 31i-B5 both can be active simultaneously. On 0i-MF, only basic AICC is available.",
    category: "programming",
    tags: ["fanuc","nano-smoothing","aicc","nurbs","hsm"],
    confidence: 88,
    source: "controller:fanuc_smoothing_guide",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-003",
    title: "Fanuc extended work offsets G54.1 P1-P300",
    body: "Beyond the standard G54-G59 (6 offsets), Fanuc controllers support G54.1 P1 through P300 for 300 additional work offsets. Essential for pallet systems and tombstone setups. On 0i-MF the default is 48 additional offsets (P1-P48); on 31i-B5 up to 300. Set parameter #1220 to enable the full range. Call with: G54.1 P25; (selects additional offset 25).",
    category: "programming",
    tags: ["fanuc","work-offsets","g54.1","pallet","tombstone"],
    confidence: 95,
    source: "controller:fanuc_operator_manual",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-004",
    title: "Fanuc Macro B custom probing cycles",
    body: "Fanuc Macro B (#variables and G65 subprogram calls) enables custom probing cycles far more flexible than canned cycles. Key variables: #5021-#5023 (current machine position XYZ), #100-#199 (common variables), #500-#999 (persistent across power cycles). Use G31 (skip function) with a probe signal to detect contact, then store positions. Pattern: G31 F100 Z-50. (feed until skip signal), then #101=#5023 (store Z touch position).",
    category: "programming",
    tags: ["fanuc","macro-b","probing","g31","custom-cycle","variables"],
    confidence: 92,
    source: "controller:fanuc_macro_manual",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-005",
    title: "Fanuc high-speed peck drilling G73 vs G83",
    body: "G73 (high-speed peck) retracts only a small amount (parameter #5114, typically 1mm) between pecks — much faster than G83 which retracts to R-plane. Use G73 for depths up to 5xD in steel, G83 only for deeper holes or gummy materials (stainless, titanium) where full retract is needed for chip clearing. On Fanuc 0i-TF (turning), G74 is the equivalent peck drilling cycle.",
    category: "programming",
    tags: ["fanuc","drilling","g73","g83","peck","cycle-time"],
    confidence: 93,
    source: "controller:fanuc_programming_manual",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-006",
    title: "Fanuc tool life management M-codes",
    body: "Enable Fanuc tool life management with parameter #6800 bit 0 = 1. Register tool groups with G10 L3 P1 (group 1 setup), then list tools: T0101 H01 (first tool), T0202 H02 (sister tool). When tool 1 reaches life limit (set via G10 L3 Q_ count), the control automatically substitutes the sister tool. Monitor with system variable #6001 (current tool life counter). Critical for lights-out operations.",
    category: "programming",
    tags: ["fanuc","tool-life","sister-tools","lights-out","automation"],
    confidence: 88,
    source: "controller:fanuc_tool_mgmt",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-007",
    title: "Fanuc 0i-MF vs 31i-B5: key capability differences",
    body: "31i-B5 advantages over 0i-MF: 5-axis simultaneous (0i limited to 4-axis), Nano Smoothing, 200-block look-ahead (vs 40), 300 additional work offsets (vs 48), faster processing speed (7000 blocks/sec vs 1000), NURBS interpolation, tool center point control (G43.4/G43.5). 0i-MF is sufficient for 3-axis VMCs and basic 4-axis. Choose 31i-B5 for 5-axis, high-speed, and complex contouring.",
    category: "programming",
    tags: ["fanuc","0i-mf","31i-b5","comparison","5-axis","capability"],
    confidence: 90,
    source: "controller:fanuc_selection_guide",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-008",
    title: "Fanuc tool center point control for 5-axis",
    body: "G43.4 (Type 1 TCP) and G43.5 (Type 2 TCP) enable tool center point control on Fanuc 31i-B5. G43.4 maintains the tool tip position while the rotary axes tilt — the control automatically compensates XYZ. G43.5 adds tool vector control for smoother 5-axis motion. Always specify tool geometry: G43.4 Hxx (H = tool length offset). Requires correct machine kinematics in parameters #14700-#14715.",
    category: "programming",
    tags: ["fanuc","tcp","g43.4","g43.5","5-axis","tool-center-point"],
    confidence: 90,
    source: "controller:fanuc_5axis_manual",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-009",
    title: "Fanuc through-spindle coolant M-codes vary by OEM",
    body: "Through-spindle coolant (TSC) M-codes are NOT standardized on Fanuc-based machines. Haas: M88 on / M89 off. DMG MORI: M51 on / M59 off. DN Solutions: M68 on / M69 off. Brother: M85 on / M86 off. Always check the OEM manual, not generic Fanuc docs. Standard coolant (M8 flood, M7 mist, M9 off) is universal across all Fanuc machines.",
    category: "programming",
    tags: ["fanuc","coolant","tsc","through-spindle","m-codes","oem"],
    confidence: 95,
    source: "controller:multi_oem_reference",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-010",
    title: "Fanuc rigid tapping G84 with synchronization",
    body: "Fanuc rigid tapping (G84 with M29 or G84.2/G84.3) synchronizes spindle and Z-axis for tap-without-tension-compression holders. Key: set parameter #5200 bit 2 = 1 for rigid tap mode. Retract override is parameter #5211. For blind holes, use G84 with G80 cancel, and ensure bottom dwell (P parameter in ms). Max rigid tap speed depends on servo loop — typically 3000-5000 RPM on 0i-MF, 6000+ on 31i.",
    category: "programming",
    tags: ["fanuc","rigid-tapping","g84","m29","synchronization"],
    confidence: 92,
    source: "controller:fanuc_tapping_guide",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-011",
    title: "Siemens CYCLE832 high-speed machining settings",
    body: "CYCLE832 is Siemens' high-speed machining configuration cycle. Call as: CYCLE832(tolerance, mode). Tolerance in mm (e.g., 0.01). Mode: 1=roughing (fast, less accurate), 2=semi-finish, 3=finishing (smooth, precise). Internally it sets: COMPCAD (compressor), G642 (smooth jerk limitation), FIFOCTRL (FIFO buffer control). Always call CYCLE832() with no args to reset after HSM section.",
    category: "programming",
    tags: ["siemens","sinumerik","cycle832","hsm","high-speed"],
    confidence: 92,
    source: "controller:siemens_programming_guide",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-012",
    title: "Siemens TRAORI for 5-axis transformation",
    body: "TRAORI activates 5-axis coordinate transformation on SINUMERIK 840D sl. Syntax: TRAORI(n) where n=transformation number (1-4 for multiple kinematic chains). Must be followed by tool orientation commands: A3=, B3=, C3= (direction cosines) or LEAD/TILT angles. Cancel with TRAFOOF. Unlike Fanuc G43.4, TRAORI handles both table-table and head-head kinematics through the same command — the kinematic model is in machine data.",
    category: "programming",
    tags: ["siemens","sinumerik","traori","5-axis","transformation"],
    confidence: 90,
    source: "controller:siemens_5axis_manual",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-013",
    title: "Siemens COMPCAD vs COMPCURV compressor modes",
    body: "SINUMERIK has two toolpath compressors: COMPCAD converts G1 segments into polynomial splines (best for CAM-generated paths), COMPCURV preserves the original path better for hand-programmed contours. For HSM with CAM output, always use COMPCAD — it can reduce block count 90% while maintaining tolerance. Set tolerance with G642 or CYCLE832. COMPOF disables compression.",
    category: "programming",
    tags: ["siemens","compcad","compcurv","compressor","hsm","toolpath"],
    confidence: 88,
    source: "controller:siemens_compressor_docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-014",
    title: "Siemens ShopMill conversational vs G-code programming",
    body: "SINUMERIK 840D sl supports dual programming modes: ShopMill (graphical/conversational) and G-code (DIN/ISO). ShopMill programs can be converted to G-code but NOT vice versa. For production, use G-code from CAM. For prototypes and simple parts, ShopMill is faster — it auto-generates safe approach/retract moves and handles tool changes. Mixed-mode programs (ShopMill cycles within G-code) work but are not recommended.",
    category: "programming",
    tags: ["siemens","shopmill","conversational","programming-mode"],
    confidence: 85,
    source: "controller:siemens_shopmill_guide",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-015",
    title: "Siemens SINUMERIK ONE digital twin advantage",
    body: "SINUMERIK ONE runs on a virtual NCK (numerical control kernel) identical to the physical controller. Programs can be simulated 1:1 on a PC with exact cycle times and axis motions. Create virtual machines in Create MyVirtualMachine (CMVM). Key benefit: verify collision-free operation and exact cycle times BEFORE running on the machine. Supports hardware-in-the-loop testing. Replaces 840D sl in new DMG MORI machines.",
    category: "programming",
    tags: ["siemens","sinumerik-one","digital-twin","simulation","virtual"],
    confidence: 87,
    source: "controller:siemens_one_overview",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-016",
    title: "Siemens measuring cycles CYCLE977/978 for probing",
    body: "SINUMERIK probing cycles: CYCLE977 (measure workpiece, set WCS), CYCLE978 (measure tool). Usage: CYCLE977(edge measurement) sets G54 automatically. CYCLE976 measures bore/boss. Pro tip: always run CYCLE996 (calibration cycle) after installing a new probe. Probe results are stored in $AA_MW[n] system variables. These cycles are WAY more user-friendly than manual G31 skip-signal probing on Fanuc.",
    category: "programming",
    tags: ["siemens","probing","cycle977","cycle978","measurement"],
    confidence: 88,
    source: "controller:siemens_measuring_cycles",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-017",
    title: "Siemens synchronized actions for real-time monitoring",
    body: "SINUMERIK synchronized actions run in parallel with the NC program in real-time. Syntax: ID=1 EVERY $AA_IM[Z] < -50 DO $AC_OVR=0 (stop feed if Z goes below -50). Use for: adaptive feed control based on spindle load, collision monitoring, automatic tool breakage detection. IDS (static sync actions) persist across program boundaries. Powerful for lights-out safety monitoring.",
    category: "programming",
    tags: ["siemens","synchronized-actions","real-time","monitoring","safety"],
    confidence: 85,
    source: "controller:siemens_sync_actions",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-018",
    title: "Heidenhain TNC 640 conversational programming (Klartext)",
    body: "The TNC 640 uses Heidenhain's unique Klartext (plain text) programming language — NOT standard G-code. Commands are descriptive: L X+100 Y+50 F500 (linear move), CC X+0 Y+0 (circle center), C X+50 Y+0 DR+ (clockwise arc). While it supports ISO G-code mode (G0, G1, etc.), Klartext is more powerful for manual programming. CAM post-processors for Hermle and Kern typically output Klartext, not ISO.",
    category: "programming",
    tags: ["heidenhain","tnc640","klartext","conversational","programming"],
    confidence: 92,
    source: "controller:heidenhain_klartext_guide",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-019",
    title: "Heidenhain TCPM (tool center point management) for 5-axis",
    body: "Heidenhain's TCPM function (equivalent to Fanuc TCP/Siemens TRAORI) maintains the tool tip position during 5-axis tilting. Activate with: FUNCTION TCPM F TCP AXIS SPATIAL PATHCTRL AXIS. Key parameters: F TCP (tool center point mode), AXIS SPATIAL (spatial angle interpolation), PATHCTRL AXIS (path control). Unlike Fanuc, TCPM stays active until explicitly cancelled with FUNCTION RESET TCPM.",
    category: "programming",
    tags: ["heidenhain","tcpm","5-axis","tool-center-point","tnc640"],
    confidence: 90,
    source: "controller:heidenhain_5axis_programming",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-020",
    title: "Heidenhain Dynamic Efficiency for adaptive feed",
    body: "TNC 640 Dynamic Efficiency package includes: ACC (Active Chatter Control) — suppresses resonance via spindle speed variation. AFC (Adaptive Feed Control) — adjusts feed rate based on real-time spindle load, maintaining constant power consumption. OCM (Optimized Contour Milling) — trochoidal milling with automatic engagement angle control. These are licensed options — verify they're active on your Hermle/Kern.",
    category: "programming",
    tags: ["heidenhain","dynamic-efficiency","acc","afc","ocm","chatter"],
    confidence: 88,
    source: "controller:heidenhain_dynamic_efficiency",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-021",
    title: "Heidenhain cycle 32 for surface finish tolerance",
    body: "Cycle 32 sets the contour tolerance for HSM on TNC 640. Syntax: CYCL DEF 32.0 TOLERANCE, CYCL DEF 32.1 T0.01 (tolerance in mm). Lower values = more accurate but slower. Typical: 0.005mm for finishing, 0.05mm for roughing. This controls the internal spline filter — essential for good surface finish with short-segment CAM output. Similar concept to Siemens CYCLE832 and Fanuc G05.1.",
    category: "programming",
    tags: ["heidenhain","cycle-32","tolerance","surface-finish","hsm"],
    confidence: 90,
    source: "controller:heidenhain_cycle32_guide",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-022",
    title: "Haas NGC Setting 191 for smoothing tolerance",
    body: "Setting 191 (Smoothing Tolerance) on Haas NGC controls the contouring smoothness. Default is 0.05mm — too coarse for finish passes. Set to 0.005-0.01mm for finishing. This is Haas's equivalent of Fanuc's AICC or Siemens CYCLE832. Higher values = faster cycle time but visible faceting. Lower values = smoother finish but potential servo lag at high feed rates. Critical for 3D surfacing.",
    category: "programming",
    tags: ["haas","ngc","setting-191","smoothing","surface-finish"],
    confidence: 92,
    source: "controller:haas_ngc_settings",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-023",
    title: "Haas macro variables and probing",
    body: "Haas NGC supports Fanuc-compatible Macro B with key additions: #5021-#5023 (machine position), #5041-#5043 (work position), #3027 (spindle load %), #1601-#1800 (tool offsets). Haas WIPS (Wireless Intuitive Probing System): use G65 P9995 calls for automated probing. Unlike Fanuc, Haas stores probe results in #10001-#10020. Setting 59 enables/disables macros.",
    category: "programming",
    tags: ["haas","ngc","macro","probing","wips","variables"],
    confidence: 90,
    source: "controller:haas_macro_manual",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-024",
    title: "Haas NGC unique M-codes reference",
    body: "Haas-specific M-codes not found on other Fanuc-based controls: M36/M37 (pallet change), M50 (pallet clamp), M51/M52 (part catcher), M88/M89 (TSC on/off), M93 (air blast), M96/M97 (local subroutine branch on skip signal — unique to Haas, not in Fanuc spec). M109 (interactive user input). M99 P-line (skip to line number — Haas-specific behavior).",
    category: "programming",
    tags: ["haas","ngc","m-codes","tsc","pallet","unique"],
    confidence: 93,
    source: "controller:haas_programming_guide",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-025",
    title: "Haas UMC 5-axis TCPC setup",
    body: "Haas Tool Center Point Control (TCPC, equivalent to Fanuc G43.4) is activated with G234 on UMC series. Requires: Setting 33 (Tool Offset Measure) = router geometry. Setting 256 (TCPC enabled) = ON. Pivot point set in Settings 276-281 (XYZ offsets for A and B rotary axes). Without correct pivot lengths, TCPC will crash. Test with G234 at low feed (F10) first, watching for unexpected XYZ moves.",
    category: "programming",
    tags: ["haas","umc","tcpc","g234","5-axis","pivot-point"],
    confidence: 90,
    source: "controller:haas_5axis_setup",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-026",
    title: "Mazak MAZATROL Smooth conversational vs EIA/ISO",
    body: "MAZATROL SmoothAi/X/G support dual programming: MAZATROL conversational and EIA/ISO G-code. MAZATROL programs are proprietary binary — cannot be edited outside the control. For CAM work, always use EIA/ISO mode. Key difference from Fanuc: Mazak's G-code dialect uses G43.4 for RTCP but stores kinematic data differently. Post-processors must use Mazak-specific format, not generic Fanuc.",
    category: "programming",
    tags: ["mazak","mazatrol","smooth","conversational","eia-iso"],
    confidence: 88,
    source: "controller:mazak_programming_guide",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-027",
    title: "Mazak SmoothAi AI-powered machining features",
    body: "SmoothAi (latest MAZATROL) adds: Ai Thermal Shield (compensates thermal displacement using AI), Smooth Machining Configuration (auto-optimizes accel/decel based on geometry), Voice Advisor (voice-activated settings). Smooth Machining Config has 4 modes: General, High Quality, High Speed, High Accuracy. Switching modes changes servo tuning without manual parameter edits.",
    category: "programming",
    tags: ["mazak","smoothai","ai-thermal","servo-tuning","automation"],
    confidence: 85,
    source: "controller:mazak_smoothai_overview",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-028",
    title: "Mazak turning center C-axis and milling M-codes",
    body: "Mazak INTEGREX and QT series with milling: M200 (C-axis clamp), M201 (C-axis unclamp), M33 (live tool spindle CW), M34 (live tool CCW), M35 (live tool stop). G12.1/G13.1 for polar coordinate interpolation (mill features on a turning center). Y-axis milling uses standard G17/G18/G19 plane selection. Always unclamp C-axis (M201) before indexing, clamp (M200) before cutting.",
    category: "programming",
    tags: ["mazak","turning","c-axis","milling","integrex","live-tool"],
    confidence: 90,
    source: "controller:mazak_mill_turn",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-029",
    title: "Okuma OSP unique G-code dialect",
    body: "Okuma OSP is NOT Fanuc-compatible — it uses a proprietary G-code dialect. Key differences: G15 H1 (machining coordinate system, vs Fanuc G54), CALL OO_ (subroutine call, vs Fanuc M98), GOTO N_ (branch, vs Fanuc conditional GO TO), no decimal point programming (G1 X10000 = 10.000mm). OSP also uses IF/THEN/ELSE and WHILE/DO loops natively — more readable than Fanuc Macro B. CAM post-processors MUST use Okuma-specific posts.",
    category: "programming",
    tags: ["okuma","osp","g-code","dialect","non-fanuc","programming"],
    confidence: 93,
    source: "controller:okuma_osp_manual",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-030",
    title: "Okuma Thermo-Friendly Concept for thermal stability",
    body: "Okuma's Thermo-Friendly Concept (TFC) uses sensors throughout the machine structure to compensate for thermal deformation in real-time. Unlike external thermal compensation, TFC is built into the OSP controller and requires no user intervention. It compensates spindle growth, bed expansion, and ambient temperature changes. This is why Okuma machines maintain ±5μm accuracy without warm-up cycles.",
    category: "programming",
    tags: ["okuma","thermal","tfc","accuracy","compensation"],
    confidence: 90,
    source: "controller:okuma_tfc_whitepaper",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-031",
    title: "Okuma OSP Super-NURBS for smooth 5-axis",
    body: "OSP-P300/P500 includes Super-NURBS machining control for smooth 5-axis cutting. Activated with G05.1 (similar syntax to Fanuc). Automatically converts short G1 segments into smooth NURBS curves. Combined with Machining Navi (an interactive cutting condition optimizer that analyzes chatter frequency and recommends optimal RPM), it's one of the most user-friendly 5-axis tuning systems.",
    category: "programming",
    tags: ["okuma","osp","super-nurbs","5-axis","machining-navi","chatter"],
    confidence: 87,
    source: "controller:okuma_5axis_guide",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-032",
    title: "Hurco WinMax UltiMotion for smooth contouring",
    body: "Hurco's UltiMotion is a patented motion control system that plans the entire toolpath before execution (not just look-ahead). It calculates optimal acceleration profiles for every axis simultaneously, achieving 2-3x faster cycle times than standard look-ahead on complex 3D surfaces. UltiMotion is always active — no G-code to enable it. It works in both conversational and NC modes.",
    category: "programming",
    tags: ["hurco","winmax","ultimotion","contouring","cycle-time"],
    confidence: 88,
    source: "controller:hurco_ultimotion_docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-033",
    title: "Hurco WinMax conversational is production-ready",
    body: "Unlike most conversational systems (designed for prototypes), Hurco WinMax conversational is genuinely production-capable. It supports: canned pocket/contour/drill patterns, transform (rotate/mirror/scale), part import from DXF/STEP/IGES directly on the control, merged conversational + NC in same program. Key advantage: modify programs directly on the machine without CAM. Ideal for job shops with high mix/low volume.",
    category: "programming",
    tags: ["hurco","winmax","conversational","job-shop","dxf-import"],
    confidence: 85,
    source: "controller:hurco_winmax_features",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-034",
    title: "Makino Pro6 SGI.5 surface finish optimization",
    body: "Makino's Professional 6 (Pro6) controller includes SGI.5 (Super Geometric Intelligence version 5) — a motion control algorithm that analyzes upcoming toolpath geometry and optimizes servo response for each segment. It automatically distinguishes between corners (where it decelerates precisely) and curves (where it maintains smooth feed). No user parameters needed — it's always active. This is why Makino achieves superior surface finish at high feed rates.",
    category: "programming",
    tags: ["makino","pro6","sgi","surface-finish","motion-control"],
    confidence: 88,
    source: "controller:makino_pro6_overview",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-035",
    title: "Makino Hyper-i touchscreen control features",
    body: "Makino Hyper-i is the HMI (human-machine interface) layer on top of Pro6. Features: 15\" touchscreen with pinch-zoom, drag-drop workpiece setup, visual process monitoring dashboard, thermal displacement graph, spindle vibration spectrum display. Machine operation videos are embedded in the help system. Hyper-i can also run Machine Advisor (cloud analytics) directly from the control.",
    category: "programming",
    tags: ["makino","hyper-i","hmi","touchscreen","monitoring"],
    confidence: 83,
    source: "controller:makino_hyperi_overview",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-036",
    title: "Brother CNC-C00 high-speed tapping advantage",
    body: "Brother's CNC-C00 controller is optimized for the company's high-speed drill-tap machines. It achieves 0.9-second chip-to-chip tool changes and 1.5-second tap cycles by synchronizing servo axis moves during tool change. The controller pre-plans the next tool's approach while the current tool is still retracting. For high-volume production with many holes (phone cases, automotive covers), Brother machines outperform VMCs by 2-3x on cycle time.",
    category: "programming",
    tags: ["brother","cnc-c00","high-speed","tapping","drill-tap"],
    confidence: 85,
    source: "controller:brother_speedio_guide",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-037",
    title: "Citizen Cincom Swiss lathe guide bushing programming",
    body: "Citizen swiss lathes with Cincom/Mitsubishi M70V control: guide bushing mode is controlled by machine parameter, not G-code. Z-axis moves the headstock (bar feeder), not the tool. B-axis gang slide and rotary tools have separate coordinate systems. Key: always program in terms of the part, the control handles guide bushing compensation. Program structure: main spindle block + sub spindle block, synchronized via M-code handshaking.",
    category: "programming",
    tags: ["citizen","cincom","swiss-lathe","guide-bushing","programming"],
    confidence: 87,
    source: "controller:citizen_cincom_manual",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-038",
    title: "Swiss lathe synchronization between spindles",
    body: "On multi-spindle swiss lathes (Citizen, Star, Tsugami): spindle sync uses M-code handshaking. Main spindle sends M200 (wait), sub-spindle responds with M200 (acknowledge). This ensures both streams are at the correct position before cutoff or part transfer. Critical: never skip sync codes or you'll crash the sub-spindle into the main. Star uses $1/$2 stream markers, Tsugami uses T-stream/M-stream.",
    category: "programming",
    tags: ["swiss-lathe","synchronization","multi-spindle","star","tsugami","citizen"],
    confidence: 88,
    source: "controller:swiss_lathe_best_practices",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-039",
    title: "Mitsubishi M800/M80 high-speed SSS control",
    body: "Mitsubishi M800/M80 series includes SSS (Super Smooth Surface) control with 540-block look-ahead and automatic spline interpolation. Enable with G05 P10000 (high-speed mode ON) / G05 P0 (OFF). The M850W (MHI machines) adds OMR-FF (Optimum Machine Response - Feed Forward) for even smoother 5-axis motion. Mitsubishi's programming is Fanuc-compatible for basic G-codes but uses proprietary cycles for probing and 5-axis.",
    category: "programming",
    tags: ["mitsubishi","m800","m80","sss","high-speed","look-ahead"],
    confidence: 85,
    source: "controller:mitsubishi_m800_guide",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-040",
    title: "Fidia C40 5-axis contouring specialization",
    body: "Fidia C40/C40 Vision is purpose-built for 5-axis high-speed machining of dies and molds. Its Look Ahead algorithm processes 10,000+ blocks for ultra-smooth transitions. Unique: the C40 natively supports NURBS interpolation from CAM (G6.2) without converting to line segments. Tool center point control uses G143 (Fidia-specific, not standard Fanuc). The controller also has built-in oscilloscope for servo tuning.",
    category: "programming",
    tags: ["fidia","c40","5-axis","nurbs","g6.2","die-mold"],
    confidence: 85,
    source: "controller:fidia_c40_documentation",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-041",
    title: "DATRON next controller for micro-milling",
    body: "DATRON next is a Linux-based touchscreen controller optimized for high-speed micro-milling (60,000+ RPM spindles). Unique features: automatic workpiece measurement via integrated camera, vacuum table control through the G-code program, and built-in engraving fonts. Programs use standard G-code but with DATRON-specific M-codes for vacuum (M80/M81), spindle air blast, and ethanol mist coolant (M7 activates ethanol, not water-based).",
    category: "programming",
    tags: ["datron","micro-milling","high-speed","vacuum-table","ethanol"],
    confidence: 83,
    source: "controller:datron_next_manual",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-042",
    title: "Kitamura Arumatik-Mi proprietary control features",
    body: "Kitamura's Arumatik-Mi (based on Fanuc 31i) adds: thermal displacement compensation using 8 embedded sensors (better than Fanuc standard), vibration monitoring dashboard, automatic spindle warm-up cycle, and predictive maintenance alerts. G-code is 100% Fanuc-compatible. The -Mi 5X variant adds 5-axis TCP control optimized for Kitamura's rotary table geometry. Programs written for Fanuc 31i-B5 run without modification.",
    category: "programming",
    tags: ["kitamura","arumatik","fanuc-based","thermal-compensation"],
    confidence: 83,
    source: "controller:kitamura_arumatik_overview",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-043",
    title: "Index C200 multi-spindle programming with virtual axes",
    body: "Index multi-spindle automatics use the C200 controller (Siemens SINUMERIK based) with virtual axis programming. Each spindle position has its own coordinate system. Parts are programmed as single-spindle operations, then the controller handles the multi-spindle synchronization through 'virtual machine' technology. Tool allocation across turrets is automatic. Cycle time = slowest station only. Programming is in Siemens G-code with Index-specific cycles for spindle indexing.",
    category: "programming",
    tags: ["index","c200","multi-spindle","virtual-axes","automatic"],
    confidence: 82,
    source: "controller:index_c200_guide",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-044",
    title: "EMAG VL/VT machines with Siemens 840D integration",
    body: "EMAG vertical pick-up lathes use Siemens SINUMERIK 840D sl with EMAG's proprietary HMI overlay. The pick-up spindle automatically loads/unloads workpieces from the conveyor — no robot needed. G-code is standard Siemens dialect. Key EMAG-specific features: integrated measuring probe cycles for in-process gauging, power skiving cycles for gear production (EMAG-specific, uses Siemens synchronized actions under the hood).",
    category: "programming",
    tags: ["emag","siemens-based","pick-up-lathe","power-skiving","gauging"],
    confidence: 80,
    source: "controller:emag_vl_manual",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-045",
    title: "Heller 5-axis HF controller features",
    body: "Heller machining centers use Siemens SINUMERIK 840D sl with Heller's proprietary SETUP (Siemens-Enabled Tool Utilization Package). Includes: automatic spindle orientation for tool change, integrated tool breakage detection via spindle load monitoring, and Heller's kinematic optimization for their 5-axis HF (Horizontal Fork) head design. Programs are standard Siemens G-code — any 840D sl post works.",
    category: "programming",
    tags: ["heller","siemens-based","5-axis","hf-head","tool-breakage"],
    confidence: 80,
    source: "controller:heller_setup_docs",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-046",
    title: "Sodick LN Professional for wire EDM",
    body: "Sodick's LN Professional EDM controller is optimized for wire/sinker EDM. Key differences from milling controllers: no spindle RPM or feed rate in the traditional sense. Programs specify wire feed tension, flushing pressure, discharge current/voltage, and gap voltage. Sodick uses LN Professional's AWT (Automatic Wire Threading) codes: M50 (thread wire), M51 (cut wire). Taper cutting uses UV-axis programming with standard G41/G42 for wire radius comp.",
    category: "programming",
    tags: ["sodick","edm","wire-edm","ln-professional","awt","taper-cutting"],
    confidence: 85,
    source: "controller:sodick_ln_manual",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-047",
    title: "Fadal CNC legacy controller compatibility notes",
    body: "Fadal CNC controllers use a modified Fanuc-compatible G-code dialect with key differences: M60 (pallet change, not M60 on Fanuc), G28 homes differently (intermediate point handling), and Fadal uses O-word numbering for programs starting at O0001. The controller supports Macro B but with limited variable range (#100-#149 only). Modern CAM posts should use 'Fadal VMC' post, not generic Fanuc. Fadal is now owned by JTEKT/Toyoda.",
    category: "programming",
    tags: ["fadal","legacy","fanuc-compatible","g-code","macro-b"],
    confidence: 82,
    source: "controller:fadal_programming_reference",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-048",
    title: "Traub TX8i-s V8 swiss lathe programming",
    body: "Traub (now INDEX-Traub) swiss lathes use the TX8i-s V8 controller (SINUMERIK-based). Programming combines Siemens G-code with Traub-specific cycles for swiss lathe operations: CYCLE_PART_OFF (cutoff with synchronization), CYCLE_BACKWORK (sub-spindle back-working), and guidebushing compensation. The V8 interface includes a graphical setup screen with 3D simulation of bar stock and turret positions.",
    category: "programming",
    tags: ["traub","index-traub","swiss-lathe","v8","siemens-based"],
    confidence: 80,
    source: "controller:traub_tx8i_manual",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-049",
    title: "Cross-controller post processor selection guide",
    body: "Critical post-processor matching: Fanuc-based machines (DN Solutions, Feeler, YCM, Hartford, Brother) — use brand-specific Fanuc post, NOT generic. Siemens-based machines (DMG MORI CELOS, Chiron, GROB, Heller, Index, EMAG, Spinner) — use Siemens 840D post with OEM-specific header. Okuma — MUST use Okuma-specific post (not Fanuc/Siemens). Mazak — use MAZATROL or EIA post, not generic Fanuc. Heidenhain — use Klartext or ISO post depending on CAM output format.",
    category: "programming",
    tags: ["post-processor","cam","cross-controller","selection-guide"],
    confidence: 95,
    source: "controller:cross_reference_guide",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-050",
    title: "Universal probing compatibility across controllers",
    body: "Renishaw probing cycles work across all major controllers but with different macro call numbers: Fanuc G65 P9810-P9814, Siemens CYCLE977/978/976, Heidenhain Touch Probe Cycles 0-4/400-405/40x, Haas G65 P9995/P9023, Okuma uses proprietary O-numbers. The probe hardware (OMP60, RMP600, OTS) is universal — only the software interface differs. Blum probes use their own macro sets. Always use the correct macro package for your controller.",
    category: "programming",
    tags: ["probing","renishaw","cross-controller","macro","measurement"],
    confidence: 92,
    source: "controller:renishaw_compatibility",
    created_at: "2026-03-07",
    usage_count: 0
  },
  // ═══════════════════════════════════════════════════════════════
  // AGENT-RESEARCHED CONTROLLER TIPS (ctrl-051+)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "ctrl-051",
    title: "Fanuc look-ahead buffer sizes by controller model",
    body: "Look-ahead buffer size is critical for HSM — more blocks previewed means smoother acceleration/deceleration. Fanuc 0i-MF/0i-MF Plus: up to 40-200 blocks look-ahead (depending on options). Fanuc 31i-B5/Plus: up to 1000 blocks standard, latest firmware supports 10,000+ block look-ahead with AI smoothing. Block processing time: 0i-MF ~8ms per block; 31i-B5 ~0.4ms per block (20x faster). For HSM toolpaths with tiny line segments (common in 3D surfacing), the 31i-B5 is dramatically superior — the 0i-MF may starve at high feedrates with dense code, causing jerky motion and dwell marks.",
    category: "programming",
    tags: ["controller","fanuc","look-ahead","hsm","block-processing","performance"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-052",
    title: "Fanuc Macro B variable ranges and persistence",
    body: "Fanuc Macro B variable ranges: Local variables #1-#33 (per-call scope, cleared on power-off, used for G65/G66 argument passing). Common variables #100-#199 (global, cleared on power-off — use for temporary cross-macro data). Common variables #500-#999 (global, RETAINED on power-off — use for persistent data like tool counts, calibration offsets, fixture data). System variables #1000+ (read/write machine state). Argument mapping for G65 calls: A=#1, B=#2, C=#3, D=#7, E=#8, F=#9, H=#11, I=#4, J=#5, K=#6, M=#13, Q=#17, R=#18, S=#19, T=#20, U=#21, V=#22, W=#23, X=#24, Y=#25, Z=#26. Note the non-sequential mapping — a common source of bugs.",
    category: "programming",
    tags: ["controller","fanuc","macro-b","programming","variables"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-053",
    title: "Fanuc probing with G31 skip signal",
    body: "G31 (skip function) moves axes at programmed feedrate until a skip signal (probe contact) is received, then stops motion and records the contact position in system variables #5061-#5068 (machine coordinates at skip). Usage: G31 Z-50. F100 (probe toward Z-50 at 100mm/min). After contact, read #5061 (X), #5062 (Y), #5063 (Z) for the exact trip point. Always use a protected move approach — never rapid (G00) with a probe loaded; use G31 to detect unexpected collisions. Renishaw and Blum probing packages build their cycles on G31. Multi-skip variants: G31.1/G31.2/G31.3 use different skip signal inputs (useful for multi-probe setups). Feed override is typically disabled during G31 for consistent results.",
    category: "programming",
    tags: ["controller","fanuc","probing","G31","skip-signal","measurement"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-054",
    title: "Fanuc G37 automatic tool length measurement",
    body: "G37 performs automatic tool offset measurement. When the probe skip signal is received during a G37 move, the Z position is captured and used to set the specified tool length offset (H register). Syntax: G37 Zxx.xxx Hnn (measure tool, set offset Hnn). The resulting offset equals the distance between the work coordinate zero and the probe contact point. This is typically used with a fixed tool setter (table-mounted or spindle-mounted). Combine with Macro B for automated tool breakage detection: measure tool, compare to expected length stored in #500+, trigger alarm (#3000=101[TOOL BROKEN]) if deviation exceeds threshold. More reliable than G31-based manual measurement for production environments.",
    category: "programming",
    tags: ["controller","fanuc","probing","G37","tool-measurement","tool-setting"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-055",
    title: "Fanuc work coordinate systems: G54-G59 and G54.1 extended offsets",
    body: "Standard work offsets: G54-G59 (6 offsets, always available). Extended offsets: G54.1 P1 through G54.1 P48 (48 additional offsets, optional on some models). Total: up to 54 work coordinate systems. Setting offsets programmatically: G10 L2 P1 X__ Y__ Z__ (set G54, P2=G55...P6=G59). G10 L20 P1 X__ Y__ Z__ (set G54.1 P1 through P48). In G90 mode, G10 replaces values; in G91 mode, G10 adds to existing values. G54.1 is NOT the same as G54 — G54.1 is the header for extended offsets, G54.1 P1 is the first extended offset. Use extended offsets for tombstone fixtures, pallet systems, and multi-part setups. G53 (machine coordinate) overrides all work offsets for that block only — use for safe tool change positions.",
    category: "programming",
    tags: ["controller","fanuc","work-offsets","G54","G54.1","fixtures","coordinates"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-056",
    title: "Fanuc G10 programmatic offset setting for automation",
    body: "G10 enables setting tool and work offsets from within the NC program — essential for automated probing and fixture setup. Work offsets: G10 L2 P(n) X__ Y__ Z__ (L2=standard offsets, P1=G54 through P6=G59). G10 L20 P(n) X__ Y__ Z__ (L20=extended offsets, P1-P48 for G54.1). Tool offsets: G10 L10 P(n) R__ (L10=tool length geometry), G10 L11 P(n) R__ (L11=tool length wear), G10 L12 P(n) R__ (L12=tool radius geometry), G10 L13 P(n) R__ (L13=tool radius wear). In G90 mode values are absolute (replace); in G91 mode values are incremental (add). Combine with G31 probing: probe a surface, read #5063, then G10 L2 to set the work offset automatically. This is the foundation of automated setup on Fanuc controls.",
    category: "programming",
    tags: ["controller","fanuc","G10","offsets","automation","probing"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-057",
    title: "Fanuc coolant M-codes including through-spindle",
    body: "Standard coolant: M7 (mist coolant on), M8 (flood coolant on), M9 (all coolant off). Combined spindle+coolant: M13 (spindle CW + coolant on), M14 (spindle CCW + coolant on) — saves a line vs separate M3/M8. Through-spindle coolant (TSC): M-codes are builder-specific, commonly M50, M51, or in the M80-M89 range. Always check your machine manual. High-pressure coolant systems may have separate M-codes for pressure selection. Some builders use M-codes in the M600 series for coolant pressure levels. For TSC: ensure spindle is at speed before activating TSC to avoid coolant spray without rotation. When programming TSC with HSM, place the TSC activation M-code before the cutting move, not in the same block as rapid positioning.",
    category: "programming",
    tags: ["controller","fanuc","coolant","through-spindle","M-codes"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-058",
    title: "Fanuc Dual Check Safety (DCS) system",
    body: "Fanuc Dual Check Safety (DCS) provides SIL 2 / PLd safety monitoring built into the CNC — no external safety hardware needed. Features: Safe Torque Off (STO) — removes torque from motors without cutting main power, faster restart than E-stop. Safe Limited Speed (SLS) — monitors axis/spindle speed, triggers alarm if exceeded. Safe Speed Monitor (SSM) — confirms safe speed before allowing guard door opening. Safe Position Monitor — monitors axis positions against defined safe zones. Architecture: dual-channel redundant monitoring of I/O signals, servo motors, and spindle motors. Emergency stop is monitored redundantly across both channels. Available on all current Fanuc controllers (0i-MF Plus, 31i-B5 Plus, 0i-TF Plus). Eliminates need for external safety PLCs in many applications, reducing wiring and cost.",
    category: "programming",
    tags: ["controller","fanuc","safety","DCS","STO","SLS"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-059",
    title: "Fanuc system variables for alarms and program control",
    body: "Key Fanuc system variables for macro programming: #3000 = generates a custom alarm and halts program (e.g., #3000=101[TOOL BROKEN] — alarm number 101 with message, up to 26 chars). #3006 = displays message and pauses program (operator acknowledgment required, e.g., #3006=1[CHECK CLAMP]). #5001-#5006 = current end-point position (work coordinates). #5021-#5026 = current machine position. #5041-#5046 = current actual position. #5061-#5068 = skip signal (G31) position. #1000-#1035 = input signal status. #1100-#1115 = output signal status. #2001-#2200 = tool length offset values. #2401-#2600 = cutter radius compensation values. #3001 = millisecond timer. #3002 = hour meter. #4001-#4120 = modal G-code group states (read which G-codes are active).",
    category: "programming",
    tags: ["controller","fanuc","macro-b","system-variables","alarms","programming"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-060",
    title: "Fanuc 0i-TF turning-specific canned cycles",
    body: "Fanuc 0i-TF/0i-TF Plus turning canned cycles differ significantly from milling G-codes. Stock removal: G71 (longitudinal rough turning — auto-calculates passes from depth-of-cut), G72 (facing rough cycle), G73 (pattern repeating for castings/forgings). Finishing: G70 (finish cycle — follows G71/G72/G73 profile at finish allowance). Threading: G32/G33 (single-pass thread cutting), G76 (multi-pass auto threading cycle — preferred for production), G92 (simple threading cycle). Grooving/Parting: G75 (grooving cycle with peck). Drilling: G74 (face drilling/peck cycle). Key difference from milling: G90 on turning = single-pass turning cycle (NOT absolute mode — G90/G91 absolute/incremental concept uses different codes on lathes). G76 threading: control auto-determines internal vs external by comparing start X to programmed X.",
    category: "programming",
    tags: ["controller","fanuc","turning","canned-cycles","threading","lathe"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-061",
    title: "Fanuc milling-specific canned cycles (0i-MF / 31i-B5)",
    body: "Fanuc milling canned cycles (G73-G89 range): G73 (high-speed peck drilling — chip-breaking with partial retract), G74 (LH tapping), G76 (fine boring — orient spindle, shift, retract), G80 (cancel canned cycle), G81 (spot drill/simple drill), G82 (counterbore — dwell at bottom), G83 (deep-hole peck drilling — full retract each peck), G84 (RH tapping), G85 (boring — feed retract), G86 (boring — spindle stop, rapid retract), G87 (back boring), G88 (boring — dwell, manual retract), G89 (boring — dwell, feed retract). All cycles use R-plane (rapid-to point) and Z-depth. G98/G99 control retract level: G98 returns to initial Z level (safe for obstacles), G99 returns to R-plane (faster for repeated holes). Always use G98 when there are clamps or fixtures between holes.",
    category: "programming",
    tags: ["controller","fanuc","milling","canned-cycles","drilling","tapping","boring"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-062",
    title: "Fanuc M19 spindle orientation and rigid tapping",
    body: "M19 commands the spindle to orient to a specific angular position using a position encoder. Required for: tool changes (orient spindle for ATC arm), fine boring cycle G76 (orient before shift-retract), live tooling on lathes. M19 is modal in the same group as M3/M4/M5 — issuing M19 stops the spindle and orients it. Rigid tapping: G84 with M29 (or G84.2/G84.3 on newer controls) synchronizes spindle rotation with Z-axis feed for tap-without-floating-holder. On 0i-MF Plus and 31i-B5: rigid tapping is standard. Parameters control the synchronization gain — poorly tuned rigid tapping causes tap breakage or oversized holes. For deep holes (>2xD), use G84 with peck (G83-style) if supported, or break the cycle into segments.",
    category: "programming",
    tags: ["controller","fanuc","spindle-orientation","M19","rigid-tapping","M29"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-063",
    title: "Fanuc G08 Advanced Preview Control for high-speed machining",
    body: "G08 P1 activates Advanced Preview Control (APC) on Fanuc controls. G08 P0 cancels. APC pre-reads upcoming blocks and optimizes feedrate based on the upcoming geometry, automatically decelerating for corners and accelerating on straights. Difference from AICC (G05.1): G08 is the simpler/older version, G05.1 is the AI-enhanced version with more parameters. On 0i-MF: G08 may be the only HSM option available (AICC is an option). On 31i-B5: both G08 and G05.1 are available, prefer G05.1 Q1 Rx for finer control. G05, G05.1, and G08 all serve similar purposes but evolved across controller generations. Some machine tool builders remap these — always verify. For CAM post-processors: output G05.1 Q1 R5 at program start and G05.1 Q0 at program end for a safe default HSM configuration.",
    category: "programming",
    tags: ["controller","fanuc","G08","hsm","advanced-preview","high-speed-machining"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-064",
    title: "Fanuc turning vs milling controller G-code conflicts",
    body: "Several G-codes have DIFFERENT meanings on Fanuc turning (0i-TF) vs milling (0i-MF) controllers — a critical source of programming errors. G73: Milling = high-speed peck drilling; Turning = pattern repeating cycle. G74: Milling = LH tapping; Turning = face peck drilling/grooving. G75: Not standard on milling; Turning = OD/ID grooving cycle. G76: Milling = fine boring; Turning = multi-pass threading cycle. G90: Milling = absolute positioning mode; Turning = single-pass turning cycle (absolute/incremental is handled differently). G92: Milling = work coordinate preset; Turning = threading cycle. G94: Milling = feed per minute mode; Turning = facing cycle. When switching between mill and lathe programming, always verify G-code meaning against the specific control type. Mill-turn machines with both turret and milling spindle use path-specific G-code interpretation.",
    category: "programming",
    tags: ["controller","fanuc","turning-vs-milling","G-code-conflicts","safety","programming"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-065",
    title: "Fanuc Macro B tool breakage detection pattern",
    body: "Practical Macro B pattern for automated tool breakage detection using G31 probing and system variables. Pattern: (1) After machining, call tool setter with G31 Z-xx F100. (2) Read skip position: #101=#5063 (Z at contact). (3) Compare to expected length stored in non-volatile variable: IF[ABS[#101-#501] GT 0.5] GOTO 900. (4) Normal path: continue program. (5) N900: #3000=101[TOOL 1 BROKEN - REPLACE]. This halts the machine with a clear alarm. Store reference lengths in #500-#999 (persist across power cycles). For multi-tool programs, use #500+tool_number as the storage variable. Add #3001 (millisecond timer) reads before/after probing to log cycle times. This pattern is the foundation of lights-out machining on Fanuc controls and works identically on 0i-MF, 31i-B5, and 0i-TF controllers.",
    category: "programming",
    tags: ["controller","fanuc","macro-b","tool-breakage","probing","lights-out","automation"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-066",
    title: "CYCLE800 Swivel Plane for 3+2 Axis Positioning",
    body: "CYCLE800 is Siemens' proprietary cycle for 3+2 axis (indexed 5-axis) machining. It transforms the working plane by rotating the coordinate system to match the tilted work surface. Key parameters: retraction mode (0=none, 1=Z retract, 2=Z then XY, 3=max tool direction, 4=incremental tool direction), swivel data record name (machine-specific kinematic configuration), and rotation mode (new or additive). The axis sequence parameter controls posting order: 57(ABC), 39(CAB), 27(CBA), 45(ACB), 30(BCA), 54(BAC). Critical rule: store angles in coordinate rotation and leave numerical B/C work offset at 0. CYCLE800 handles FRAME calculations, tool tip tracking (TCPM/RTCP), and safe retraction automatically. Available on 840D sl, 828D, and SINUMERIK ONE. CAM post processors must output the correct swivel data record name matching the machine's kinematic table configured during commissioning.",
    category: "programming",
    tags: ["controller","siemens","5-axis","CYCLE800","swivel","3+2","indexed"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-067",
    title: "TRAORI 5-Axis Simultaneous Transformation",
    body: "TRAORI (TRAnsformation ORIentation) activates the 5-axis kinematic transformation for simultaneous 5-axis machining on SINUMERIK controllers. Unlike CYCLE800 (3+2 static), TRAORI enables continuous tool orientation changes during cutting. Syntax: TRAORI(n) where n selects the transformation number (configured in machine data). Related commands: TRAFOOF deactivates transformation; ORIAXES enables linear axis interpolation of orientation; ORIVECT enables great-circle (vector) interpolation for smoother orientation transitions. Orientation can be defined via: ORIEULER (Euler angles), ORIRPY (Roll-Pitch-Yaw), ORIVECT (direction vectors using A3/B3/C3), ORIPLANE (orientation in a plane), or ORIVIRT1/ORIVIRT2 (virtual orientation axes). LEAD and TILT parameters define tool inclination relative to the surface normal. TRAORI requires the 5-axis transformation option license and proper kinematic chain configuration in machine data ($MC_TRAFO_TYPE_n). 828D supports TRAORI with up to 4 interpolating axes; 840D sl and SINUMERIK ONE support full 5-axis simultaneous.",
    category: "programming",
    tags: ["controller","siemens","5-axis","TRAORI","simultaneous","transformation","orientation"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-068",
    title: "TOROT, TOFRAME, and TCARR Tool Orientation Commands",
    body: "SINUMERIK provides specialized commands for tool orientation management in 5-axis machining: TOROT activates tool orientation tracking, rotating the coordinate frame to align with the current tool direction. When TOROT is active, XY moves occur in the plane perpendicular to the tool, enabling 2D operations (drilling, tapping) at arbitrary tool angles. TOFRAME generates a complete coordinate frame (FRAME) based on the current tool orientation, useful for subsequent 2D machining cycles at the tilted position. TCARR (Tool CARRier) manages orientable toolholder data, storing the angular offsets of angled toolholders. The system variable $TC_CARR1[n] through $TC_CARR23[n] define the toolholder kinematics. TOFFR/TOFFL/TOFFLR provide tool orientation offsets: TOFFL for lead angle offset, TOFFR for tilt angle offset. These commands work in conjunction with TRAORI and are essential for post-processor development. DMG MORI machines commonly use TOROT after CYCLE800 for 3+2 operations, while GROB machines often require specific TCARR configurations for their horizontal spindle + swivel table kinematics.",
    category: "programming",
    tags: ["controller","siemens","5-axis","TOROT","TOFRAME","TCARR","tool-orientation","post-processor"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-069",
    title: "CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes",
    body: "SINUMERIK uses proprietary tool compensation modes for multi-axis machining that differ from standard ISO G41/G42: CUT2D applies 2D tool radius compensation when tool axis is perpendicular to the working plane (standard Z-axis orientation at B0C0). CUT2DF extends 2D compensation to work in tilted/swiveled planes (when a FRAME rotation is active), maintaining compensation in the rotated coordinate system. CUT3DC (3D Circumference) provides continuous 3D cutter radius compensation for simultaneous 5-axis peripheral milling, accounting for changing tool orientation throughout the path. CUT3DF (3D Face) handles 3D compensation for face milling operations. CUT3DFS (3D Face Side) and CUT3DFF (3D Face Front) provide additional face milling variants. ISD (Insertion depth) parameter defines how deep the tool engages, critical for CUT3DC calculations. These modes are essential for CAM post-processor configuration: most 5-axis simultaneous programs from hyperMILL, NX, or Mastercam should output CUT3DC for side cutting or CUT3DF for face cutting operations. 828D supports CUT2D/CUT2DF/CUT3DC/CUT3DF; full 3D compensation with ISD requires 840D sl or SINUMERIK ONE.",
    category: "programming",
    tags: ["controller","siemens","tool-compensation","CUT2D","CUT3DC","CUT3DF","5-axis","post-processor"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-070",
    title: "ShopMill/ShopTurn Conversational Programming",
    body: "ShopMill (milling) and ShopTurn (turning) are Siemens' built-in conversational programming interfaces within SINUMERIK Operate, enabling shop-floor part programming without G-code knowledge. Programs are created by selecting operations from graphical menus and filling in parameter forms with animated tool tips and dynamic graphics. Key features: (1) Full cycle library including drilling, pocketing, contouring, thread milling, and pattern operations; (2) Inline simulation with 3D workpiece visualization before running; (3) Mix-and-match capability to combine conversational blocks with G-code blocks in the same program; (4) Contour calculator for direct geometry definition with automatic intersection calculation; (5) Technology database for automatic feed/speed recommendations; (6) Position patterns (linear, grid, circular) with ability to hide selected positions. ShopMill/ShopTurn programs are stored as standard .MPF files and are fully editable in G-code mode. Available on all SINUMERIK platforms (828D, 840D sl, ONE). Particularly valuable for one-off parts, prototype work, and simple production jobs where CAM programming overhead is not justified. Training tip: SinuTrain PC software provides identical ShopMill/ShopTurn interface for offline training.",
    category: "programming",
    tags: ["controller","siemens","ShopMill","ShopTurn","conversational","programming","shop-floor"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-071",
    title: "SINUMERIK Tool Management System",
    body: "SINUMERIK 840D sl and ONE feature a comprehensive tool management system stored in the NCK TO (Tool Offset) area. Key commands: T<number> prepares tool (moves magazine to position); M6 executes tool change; D<number> selects cutting edge offset (D1 default, supports multiple edges per tool). Tool data system variables: $TC_DP1-$TC_DP25 (geometry: type, length, radius, wear); $TC_TP1-$TC_TP11 (tool properties: name, type, status, monitoring). Magazine commands: POSM (position magazine), POSMT (position multitool to specific location), MVTOOL (move tool between locations). Multitool support for gang-type and turret machines via $TC_MTP and $TC_MTPP data. Tool monitoring features: tool life ($TC_TP8 remaining time), piece count ($TC_TP9), wear limits with automatic sister tool switchover. SETMS(n) selects master spindle for multi-spindle machines. The 828D has simplified tool management without full magazine management functions. Critical for post-processors: DMG MORI machines typically use T=<number> (flat tool numbering) or T<magazine>.<location> syntax depending on configuration. Always verify the tool call convention with the specific machine's PLC program.",
    category: "programming",
    tags: ["controller","siemens","tool-management","magazine","multi-spindle","tool-life","sister-tool"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-072",
    title: "Safety Integrated: SOS, SLS, SS1, SSM Functions",
    body: "SINUMERIK Safety Integrated provides certified (SIL 2 / PL d) safety functions through the SINAMICS drive system, communicated via PROFIsafe protocol. Key functions: SOS (Safe Operating Stop) - drive remains energized and in closed-loop control but monitors for zero velocity, preventing unintentional movement during loading/unloading without losing position reference. SS1 (Safe Stop 1) - controlled deceleration followed by STO (Safe Torque Off), time-monitored and acceleration-controlled. SLS (Safely-Limited Speed) - monitors that axis speed does not exceed configurable limits, essential for setup mode and door-open machining at reduced speed. SSM (Safe Speed Monitor) - provides a safety-rated binary signal when drive operates below a threshold, used for interlocking (e.g., door release only when spindle stopped). SLP (Safely-Limited Position) - monitors axis position within a configurable window. SDI (Safe Direction) - restricts axis to one direction of motion. All functions are configured in SINAMICS drive parameters and activated via safety PLC (F-PLC). SINUMERIK ONE uses integrated SIMATIC S7-1500F safety PLC. 840D sl uses external SIMATIC safety PLC. 828D has integrated safety with simpler configuration. These functions are mandatory for CE-marked machines and are tested during annual machine safety validation.",
    category: "programming",
    tags: ["controller","siemens","safety","SOS","SLS","SS1","SSM","Safety-Integrated","PROFIsafe"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-073",
    title: "840D sl vs SINUMERIK ONE vs 828D Feature Comparison",
    body: "Key differences between the three SINUMERIK platforms: **828D** (mid-range): max 8 axes/spindles, 4 interpolating axes, single channel, integrated drive bus (PPU/drive in one unit), supports TRAORI for 5-axis but limited to basic transformations, no full tool management with magazine handling, no compile cycles, limited synchronized actions. Ideal for standard 3-axis mills, 5-axis 3+2 machines, and lathes. **840D sl** (high-end): up to 31 axes, 10+ interpolating axes, multi-channel (up to 10), modular NCU + SINAMICS S120 drives, full 5-axis with all transformation types, complete tool management with magazine handling, compile cycle support for OEM customization, 7-axis generic transformations, handling transformations (robots), clearance control, tangential control, gantry axis support, AST automatic spline interpolation. Used on complex multi-axis machines, mill-turns, and transfer lines. **SINUMERIK ONE** (next-gen): all 840D sl capabilities plus integrated SIMATIC S7-1500F PLC (10x faster), native digital twin support, TIA Portal integration, faster NCK processing, future-proof platform. 840D sl is being phased out in favor of SINUMERIK ONE for new machine designs. The NC programming language is identical across all three; differences are in axis/channel limits and available transformation/function options.",
    category: "programming",
    tags: ["controller","siemens","comparison","828D","840D","SINUMERIK-ONE","selection-guide"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-074",
    title: "Compile Cycles and OEM Custom Cycle Development",
    body: "SINUMERIK 840D sl and ONE support three levels of cycle customization: (1) **Standard cycles** - Siemens-provided (CYCLE81-CYCLE99, CYCLE800, CYCLE832, etc.), stored in system cycle directory, not modifiable. (2) **User/Manufacturer cycles** - custom NC subprograms (.SPF files) that extend functionality. Manufacturer cycles go in /oem_cycles/, user cycles in /user_cycles/. Search order: user -> manufacturer -> standard. After adding a custom cycle, NCK reboot required. Custom screen forms can be created for parameter input in SINUMERIK Operate. (3) **Compile cycles** (840D sl/ONE only) - C/C++ code compiled into NCK firmware, running at interpolation cycle level for maximum performance. Used for: custom transformations, special interpolation modes, proprietary measurement routines, and machine-specific safety functions. Compile cycles require Siemens development toolkit and deep NCK knowledge. OEM examples: special hobbing cycles, grinding-specific dressing cycles, EDM generator control. CUST_832.SPF is a special OEM-customizable file called automatically when CYCLE832 executes, allowing machine builders to inject machine-specific HSM settings. The 828D does not support compile cycles, limiting OEM customization to SPF-level user cycles only.",
    category: "programming",
    tags: ["controller","siemens","compile-cycles","OEM","custom-cycles","CUST_832","programming"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-075",
    title: "SINUMERIK Unique G-Codes Beyond ISO Standard",
    body: "SINUMERIK controllers use numerous proprietary codes not found in ISO 6983: **Path behavior**: G64 (continuous path with look-ahead), G641 (continuous path with programmable rounding via ADIS=<mm>), G642 (automatic corner rounding), G643 (path rounding with max axis acceleration), G644 (jerk-limited rounding). **Feedforward/dynamics**: FFWON/FFWOF (feedforward control on/off), SOFT/BRISK/DRIVE (jerk limitation modes). **Splines**: ASPLINE/BSPLINE/CSPLINE (Akima/B-spline/Cubic spline interpolation), BAUTO/BNAT/BTAN (spline boundary conditions). **Frames**: TRANS/ATRANS (translation), ROT/AROT (rotation), SCALE/ASCALE (scaling), MIRROR/AMIRROR (mirroring) - A-prefix means additive to current frame. **Coordinate transforms**: TRANSMIT (face-end machining on lathe), TRACYL (cylinder surface transformation), TRAANG (inclined axis machining). **Approach/retract**: G147/G148/G247/G248 (approach/retract strategies with various path types). **String variables**: R-parameters (R0-R99 user variables), $-variables (system variables for machine state). **Program control**: STOPRE (preprocessing stop), MCALL (modal subroutine call), MSG (operator messages). Understanding these non-ISO codes is critical for post-processor development and manual program editing on Siemens-controlled machines.",
    category: "programming",
    tags: ["controller","siemens","G-code","non-ISO","proprietary","post-processor","programming"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-076",
    title: "Multi-Channel Programming and Channel Synchronization",
    body: "SINUMERIK 840D sl and ONE support multi-channel operation where independent NC channels control separate axis groups simultaneously. Essential for mill-turn machines (e.g., DMG MORI CTX/NTX series) and multi-spindle lathes (Index, EMAG). Synchronization commands: INIT(channel, program, mode) loads a program into another channel; START(channel) begins execution; WAITM(marker, channel1, channel2...) creates synchronization points where channels wait for each other before proceeding. WAITE(channel) waits for channel end. Channel-specific M-codes: M0-M99 are channel-local. Data exchange between channels uses: WAIT markers for timing, $AC_MARKER[n] for integer flags, GUD (Global User Data) variables for shared data. Typical use case: Channel 1 controls main spindle + X/Z/C axes for turning, Channel 2 controls sub-spindle + milling spindle + B/Y axes. The PLC coordinates tool changers and workpiece handoff between spindles. 828D is single-channel only, a major limitation for complex mill-turn applications. Post-processors for multi-channel machines must output proper channel switching ($P_CHANNO) and synchronization markers aligned with the machine's PLC handshake protocol.",
    category: "programming",
    tags: ["controller","siemens","multi-channel","synchronization","WAITM","mill-turn","multi-spindle"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-077",
    title: "SINUMERIK Operate HMI and Program Management",
    body: "SINUMERIK Operate is the unified HMI across all current SINUMERIK platforms, combining the former HMI-Advanced (G-code editing), ShopMill, and ShopTurn under one interface. Key features for CNC programmers: (1) **Program editor** with syntax highlighting, block search, and NC variable display; (2) **Simulation** with 2D path preview and optional 3D workpiece removal simulation; (3) **Program management** with directory structure: /MPF.DIR (main programs), /SPF.DIR (subprograms), /WKS.DIR (workpiece folders grouping related programs); (4) **Job lists** for automated multi-program execution with tool tracking; (5) **Easy Message** system for operator instructions embedded in programs via MSG() command; (6) **DXF Reader** (optional) for importing 2D contours directly from CAD files into ShopMill/ShopTurn; (7) **Program-Guided Operation (programGUIDE)** for step-by-step cycle-based programming with graphical support. File transfer: USB, network share (SMB), or DNC via RS232. Network path configured in /user/sinumerik/hmi/cfg/. Programs use .MPF extension for main programs and .SPF for subprograms. Maximum program size depends on NCK memory (typically 2-16MB of part program memory).",
    category: "programming",
    tags: ["controller","siemens","SINUMERIK-Operate","HMI","program-management","DXF","simulation"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-078",
    title: "SINUMERIK Post-Processor Configuration Essentials",
    body: "When configuring CAM post-processors for SINUMERIK controllers, these machine-specific settings are critical: (1) **Tool call format**: T<n> M6 (standard), T=<name> (symbolic), or OEM-specific (DMG MORI often uses T=<n> with flat numbering); (2) **CYCLE800 swivel data record**: must match the kinematic table name exactly as configured in machine data (e.g., 'TC_CARR1' or machine-specific name); (3) **CYCLE832 tolerance**: include at program start before cutting, deactivate with CYCLE832() empty call at end; (4) **5-axis output mode**: TRAORI activation, then orientation via A/B/C direct angles or A3/B3/C3 direction vectors depending on CAM system preference; (5) **Work offset format**: G54-G599 (SINUMERIK supports up to 99 standard + 500 extended), or CYCLE800-embedded offset; (6) **Coolant M-codes**: typically M7/M8/M9 but verify machine-specific PLC mapping; (7) **Safe retraction**: SUPA G0 Z=... for machine-coordinate retraction; (8) **Program structure**: header (CYCLE832, tool list), operations (tool call, approach, cutting, retract), footer (M30). Always validate with SINUMERIK simulation or Create MyVirtualMachine before first run. Common post-processor errors: wrong CYCLE800 data record name, missing TRAORI activation before 5-axis moves, incorrect G641 ADIS value for machine capability.",
    category: "programming",
    tags: ["controller","siemens","post-processor","CAM","configuration","CYCLE800","CYCLE832","tool-call"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-079",
    title: "TRANSMIT, TRACYL, and Special Coordinate Transformations",
    body: "SINUMERIK provides proprietary coordinate transformations beyond standard 5-axis: **TRANSMIT** enables face-end machining on turning centers by converting XY Cartesian programming into radial + C-axis rotary motion. Allows milling contours on the face of a turned part using standard G-code XY moves. The CNC automatically computes C-axis rotation and X-axis radial movement. Pole avoidance ($MA_TRANSMIT_POLE_LIMIT) prevents singularity at center. **TRACYL** (Transformation Cylinder) maps XY planar programming onto a cylinder surface, enabling milling of grooves, pockets, and contours on cylindrical surfaces using C-axis rotation + Z-axis linear motion. Groove depth is controlled by the radial axis. **TRAANG** (Transformation Angle) compensates for inclined linear axes (e.g., B-axis on Swiss-type lathes, or Y-axis realized through compound slide angles). These transformations allow programming in a simple Cartesian coordinate system while the CNC handles the complex non-linear axis coordination. All three are available on 840D sl, SINUMERIK ONE, and 828D (with limitations on 828D). Common machine applications: TRANSMIT on DMG MORI CTX/NTX for cross-drilling and milling; TRACYL on Index multi-spindle lathes for cam groove cutting.",
    category: "programming",
    tags: ["controller","siemens","TRANSMIT","TRACYL","TRAANG","transformation","turning","mill-turn"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-080",
    title: "SINUMERIK System Variables and Adaptive Machining",
    body: "SINUMERIK exposes extensive system variables ($-variables) enabling adaptive machining strategies via synchronized actions or user cycles. Key variable families: **Drive/axis**: $AA_IM[axis] (actual position), $AA_LOAD[axis] (axis load %), $VA_CURR[axis] (drive current). **Spindle**: $AC_POWER (current spindle power as % of rated), $AN_SACT[spindle] (actual spindle speed), $AC_TORQUE (spindle torque). **Feed**: $AC_OVR (feed override %), $AC_VACTW (actual path velocity), $AC_DTEW (distance to end of block). **Program**: $P_TOOLNO (active tool number), $P_F (programmed feed), $P_S (programmed speed), $AC_TIME (machining time). Adaptive feed control example: ID=1 WHENEVER $AC_POWER>80 DO $AC_OVR=50 (halve feed when spindle power exceeds 80%). Tool breakage detection: ID=2 WHEN $AC_POWER<5 DO SETAL(61000) (alarm if power drops during cutting). Thermal compensation via axis offsets: $AA_OFF[X]=<value> applied from PLC-computed temperature data. These variables, combined with synchronized actions, enable sophisticated in-process monitoring without external hardware. The variable set is identical across 840D sl, 828D, and SINUMERIK ONE, though some drive-level variables require specific SINAMICS firmware versions.",
    category: "programming",
    tags: ["controller","siemens","system-variables","adaptive-machining","monitoring","synchronized-actions","spindle-load"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-081",
    title: "TNC 640 TCPM vs M128 for 5-axis tool orientation",
    body: "The TNC 640 offers TCPM (Tool Center Point Management) as the improved replacement for M128. TCPM prevents contour gouging during 5-axis simultaneous machining by maintaining the tool tip position when rotary axes move. Key difference: M128 is the legacy function from iTNC 530; TCPM adds configurable approach behavior (FUNCTION TCPM with options for AXIS POS, AXIS SPAT). Always use TCPM on TNC 640 — M128 still works but TCPM gives finer control over interpolation between start and end orientations. Deactivate with M129.",
    category: "programming",
    tags: ["controller","heidenhain","5-axis","TCPM","M128","tool-orientation"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-082",
    title: "TNC 640 Cycle 32 TOLERANCE for HSM optimization",
    body: "Cycle 32 TOLERANCE is critical for balancing accuracy vs speed on the TNC 640. Set T (tolerance) value based on operation: roughing 0.05-0.1mm for maximum feed, finishing 0.002-0.01mm for surface quality. The cycle adjusts internal contour filtering and jerk limiting. Also accepts HSC MODE parameter: 0=off, 1=contour finish (prioritizes accuracy), 2=surface finish (prioritizes smoothness). Always call Cycle 32 before the toolpath section it applies to, and reset it (CYCL DEF 32.0 TOLERANCE with T=0) when switching operations.",
    category: "programming",
    tags: ["controller","heidenhain","HSM","tolerance","cycle-32","surface-finish"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-083",
    title: "TNC 640 Dynamic Collision Monitoring (DCM)",
    body: "DCM monitors the full work envelope in ALL operating modes (auto, manual, handwheel) and stops motion before collision. Unlike CAM-based collision checking, DCM uses the actual machine kinematic model with real-time tool/holder geometry. Critical setup: tool and holder dimensions must be accurately defined in the tool table (columns DL, DR, R2 plus holder definition). DCM will NOT protect against workpiece collisions unless a workpiece blank is defined via Cycle 20/Q-parameters. Performance impact: DCM can reduce rapid traverse speeds by 5-15% due to look-ahead calculations.",
    category: "programming",
    tags: ["controller","heidenhain","collision-avoidance","DCM","safety"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-084",
    title: "TNC 640 KinematicsOpt for rotary axis calibration",
    body: "KinematicsOpt (Cycle 451-453) automatically measures and compensates rotary/swivel axis center-of-rotation errors. Run KinematicsOpt after machine warm-up or after a crash/heavy cut that may have shifted kinematics. Cycle 451 measures all rotary axes, Cycle 452 measures a specific axis, Cycle 453 presets. Results are written directly to the machine's kinematic description. Typical use: run at shift start on 5-axis machines to ensure <5 micron TCP accuracy. Requires a calibrated touch probe (typically TS 460 or TS 760).",
    category: "programming",
    tags: ["controller","heidenhain","5-axis","calibration","KinematicsOpt","probing"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-085",
    title: "iTNC 530 limitations vs TNC 640 — migration awareness",
    body: "The iTNC 530 is end-of-life (no new development). Key limitations vs TNC 640: (1) Combined feed/rapid override on single knob — can accidentally override rapids when adjusting feed; (2) No integrated turning support; (3) 3D simulation is basic compared to TNC 640's full 3D workpiece simulation; (4) Some Cycle 32 options missing (no HSC MODE parameter on older firmware); (5) No Cycle 444 for 3D point probing; (6) Touch probe table supports only one probe vs TNC 640's multi-probe tables. Programs transfer forward to TNC 640 with minor changes (TCPM syntax, some cycle parameters). Always test migrated programs in simulation first.",
    category: "programming",
    tags: ["controller","heidenhain","iTNC530","migration","legacy","limitations"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-086",
    title: "Heidenhain Klartext vs ISO programming — when to use which",
    body: "TNC 640 supports both Klartext (conversational) and DIN/ISO G-code. Klartext is preferred for shop-floor programming: plain-text syntax (L X+50 Y+30 R0 F500 M3), built-in cycle calls, and FK free-contour programming for incomplete drawings. ISO mode is needed when importing CAM-posted code. CRITICAL: Do not mix Klartext and ISO blocks in the same program — use separate programs and call ISO programs as subprograms from Klartext via CALL PGM. Klartext programs use .H extension, ISO programs use .I extension. Post processors must output to the correct format.",
    category: "programming",
    tags: ["controller","heidenhain","Klartext","ISO","programming-language"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-087",
    title: "TNC 640 3D-ToolComp for tool radius compensation in 5-axis",
    body: "3D-ToolComp compensates for actual vs nominal tool radius during 3D surface finishing. Unlike standard 2D tool radius compensation (RL/RR), 3D-ToolComp uses surface normal vectors from the CAM system (output as NX/NY/NZ in ISO or as 3D-ROT in Klartext). This enables automatic re-machining with a slightly different tool diameter without re-posting from CAM. Setup: define actual tool radius in tool table (DR column = deviation from nominal). The TNC applies the delta automatically along the surface normal. Essential for tight-tolerance mold finishing.",
    category: "programming",
    tags: ["controller","heidenhain","5-axis","tool-compensation","3D-ToolComp","mold"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-088",
    title: "Haas G187 accuracy/speed control for HSM",
    body: "G187 controls the trade-off between accuracy and speed on Haas NGC machines. P1=rough (fastest, least accurate), P2=medium, P3=finish (slowest, most accurate). E value sets custom tolerance in inches (e.g., E0.0005). For HSM: use G187 P1 E0.005 for roughing (max MRR), G187 P3 E0.0002 for finishing (best surface). G187 dramatically affects 3D surface quality — forgetting to switch from P1 to P3 before finishing is a common cause of poor surface finish on Haas machines. G187 is modal and persists until changed or reset.",
    category: "programming",
    tags: ["controller","haas","HSM","G187","surface-finish","accuracy"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-089",
    title: "Haas G150 general pocket milling — mini-CAM in G-code",
    body: "G150 is Haas's built-in pocket milling cycle — essentially a mini-CAM system in G-code. Define pocket boundary as a sub-program with line/arc moves, then G150 generates roughing toolpaths with stepover. CRITICAL: G150 requires a pre-drilled hole at full pocket depth for cutter entry — it will NOT ramp or helical-enter. Drill or helical-interpolate the entry hole before calling G150. Parameters: P (subprogram number), D (tool diameter offset), I (stepover), J (overlap), K (number of finishing passes). Useful for simple pockets when CAM is unavailable.",
    category: "programming",
    tags: ["controller","haas","G150","pocket-milling","conversational"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-090",
    title: "Haas macro look-ahead gotcha — G103 P1 for variable reads",
    body: "Haas NGC look-ahead can cause macro variables to be read/evaluated before the intended motion block executes. This is critical when reading probe results or checking I/O states. The control processes macro lines ahead of actual motion. Fix: use G103 P1 to limit look-ahead to 1 block when reading macro variables that depend on completed motion (e.g., after G65 probe calls). Reset with G103 (no P) after the critical section. Also use G04 P0 (dwell zero) as a look-ahead stop before reading probe results stored in macro variables (#1-#33 or system variables).",
    category: "programming",
    tags: ["controller","haas","macro","look-ahead","G103","probing","gotcha"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-091",
    title: "Haas probing setup requirements and WIPS integration",
    body: "Haas probing requires multiple options enabled via unlock codes: spindle orientation, macros (Setting 9), coordinate rotation and scaling. The Renishaw 9000-series programs must be loaded. NGC introduced WIPS (Wireless Intuitive Probe System) which simplifies probe setup through guided dialogs. Key settings: Setting 59 (probe diameter), Setting 65 (probe overtravel). Probe results stored in macro variables #140-#199 (Renishaw) or system variables. Always verify probe stylus calibration ring diameter matches Setting 119. Tool setter requires separate calibration macro (O09995).",
    category: "programming",
    tags: ["controller","haas","probing","WIPS","Renishaw","setup"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-092",
    title: "MAZATROL conversational vs EIA/ISO — interoperability",
    body: "MAZATROL supports both conversational and EIA/ISO (G-code) programming. Key interoperability: a G-code program can call a MAZATROL conversational program as a subroutine, enabling mixed-mode workflows. Use conversational for simple prismatic features, probing, and tool measurement; use EIA/ISO for CAM-posted complex toolpaths. GOTCHA: M11 on Mazak means 'Spindle Tool Unclamp' — on most Fanuc machines it means 'Table Unclamp (4th axis)'. This is a critical safety difference when transferring programs. G53.5 (MAZATROL coordinate system) avoids work offset conflicts in conversational programs.",
    category: "programming",
    tags: ["controller","mazak","MAZATROL","conversational","EIA-ISO","M11-gotcha"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-093",
    title: "MAZATROL Intelligent Pocket Milling (IPM) for high-efficiency roughing",
    body: "IPM maintains constant tool engagement angle and chip load throughout pocket roughing, similar to CAM-based adaptive/trochoidal strategies. Benefits: up to 35% faster cycle time, full utilization of machine power, extended tool life on difficult materials. IPM is available in conversational mode — no CAM system needed. The tool follows a continuous spiral-like path avoiding sudden engagement changes. Best for: Inconel, titanium, hardened steel pockets where constant chip load prevents chatter and tool breakage. Pair with Mazak's AI chatter detection (SmoothAi) for automatic feed/speed adjustment.",
    category: "programming",
    tags: ["controller","mazak","IPM","high-efficiency","roughing","adaptive"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-094",
    title: "MAZATROL M-code and G-code documentation is buried — search tips",
    body: "Mazak typically buries their G/M-code reference tables deep in the middle of programming manuals, NOT in the table of contents or index. You must search through the manual to find them. Key Mazak-specific M-codes: M20-M29 for robot integration, M11 for spindle tool unclamp (NOT table unclamp like Fanuc). MAZATROL G-codes are Fanuc-compatible for standard codes (G00-G04, G17-G19, G28, G40-G43, G54-G59, G80-G89) but machine-specific M-codes are heavily customized. Always request the specific machine's M-code list from the dealer at purchase time.",
    category: "programming",
    tags: ["controller","mazak","M-codes","documentation","reference"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-095",
    title: "Okuma OSP Thermo-Friendly Concept — skip warm-up cycles",
    body: "Okuma's Thermo-Friendly Concept combines machine design (symmetric thermal growth paths) with TAS (Thermal Active Stabilizer) software: TAS-S for spindle and TAS-C for structure. The system compensates for thermal deformation in real-time, eliminating the need for traditional machine warm-up cycles. Dimensional stability is maintained even during 8+ hour unattended runs with varying ambient temperatures. This means: (1) No need for warm-up programs at shift start; (2) First part accuracy equals tenth-part accuracy; (3) Weekend restart doesn't require settling time. Verify TAS is enabled in OSP parameters — some shops accidentally disable it.",
    category: "programming",
    tags: ["controller","okuma","thermal","TAS","warm-up","accuracy"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-096",
    title: "Okuma Collision Avoidance System (CAS) — real-time 3D protection",
    body: "Okuma CAS creates a real-time 3D virtual machine running milliseconds ahead of actual motion. It detects pending collisions and stops the machine before impact. CAS works in ALL modes: auto, MDI, manual jog, and handwheel. Setup requirements: accurate 3D models of tooling, holders, fixtures, and workpiece blank must be defined in the control. GOTCHA: CAS only protects against what it knows — if fixture or workpiece models are incomplete, collisions with undefined geometry will NOT be caught. Update the workpiece model as material is removed (or use a conservative bounding box). CAS adds minimal processing overhead (<2% cycle time increase).",
    category: "programming",
    tags: ["controller","okuma","CAS","collision-avoidance","safety","3D-model"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-097",
    title: "Okuma Super-NURBS for high-speed curved surface machining",
    body: "Super-NURBS on Okuma OSP controls processes curved surfaces using native NURBS interpolation rather than short-line-segment approximation. Benefits: smoother surface finish, faster cycle times (fewer blocks to process), reduced axis reversal marks. CAM must output NURBS format (G06.2 on Okuma) rather than G01 line segments. Not all CAM systems support NURBS output for Okuma — verify post processor capability. Best for: mold/die finishing, aerospace contours, medical implant surfaces. Super-NURBS pairs well with Machining Navi for chatter-free finishing at optimal speeds.",
    category: "programming",
    tags: ["controller","okuma","Super-NURBS","surface-finish","HSM","mold"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-098",
    title: "Okuma Machining Navi for automatic chatter suppression",
    body: "Machining Navi uses built-in sensors and the OSP control to detect chatter vibration in real-time and recommend or automatically select optimal spindle speeds to avoid resonance. Two modes: M-Navi L-g (lathe, auto-adjust) and M-Navi M-g (mill, guidance display showing stability lobes). On milling machines, it displays a stability lobe diagram and highlights current speed vs optimal speed. The operator can accept the recommendation with one button press. Critical for: deep pocket milling, slender tool extensions, thin-wall machining. Does NOT replace proper toolholding/setup but adds a safety net against harmonic chatter.",
    category: "programming",
    tags: ["controller","okuma","machining-navi","chatter","vibration","spindle-speed"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-099",
    title: "Hurco UltiMotion — 10,000-block look-ahead for HSM",
    body: "UltiMotion is Hurco's proprietary motion control system providing 10,000-block look-ahead (vs typical 200-500 blocks on other controls). Benefits: up to 30% cycle time reduction on complex 3D surfaces, smoother motion profiles, and better surface finish. UltiMotion automatically calculates optimal acceleration/deceleration for each axis at each point. CRITICAL: UltiMotion performance depends on program block density — short-segment toolpaths (0.01mm chord) benefit most. For roughing, the speed improvement is minimal since feed rates are already achievable. Best results on 3D finishing with tight-tolerance CAM output.",
    category: "programming",
    tags: ["controller","hurco","UltiMotion","HSM","look-ahead","surface-finish"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-100",
    title: "Hurco WinMax NC/Conversational Merge — best of both worlds",
    body: "WinMax's NC/Conversational Merge lets you apply conversational features (pattern operations, scaling, probing, unlimited work offsets) to G-code programs. This is unique among controllers — you can wrap a CAM-posted G-code program with conversational setup blocks for probing, part rotation, and mirroring without editing the G-code. LIMITATION: NC programs cannot be converted to conversational format, and NC programs cannot be auto-converted between different NC formats. The conversational editor displays G-code syntax errors in real-time (red=error, green=comment). AdaptiPath adds high-efficiency pocketing (constant engagement) directly in conversational mode.",
    category: "programming",
    tags: ["controller","hurco","WinMax","conversational","NC-merge","AdaptiPath"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-101",
    title: "Hurco Transform Plane for 3+2 and 5-axis positioning",
    body: "Hurco's Transform Plane feature enables 3+2 axis machining through conversational programming — no CAM-posted RTCP code needed. Set Transform Plane=Yes in a rotary data block to machine features on angled faces. The control handles all coordinate transformation internally. For full 5-axis simultaneous, WinMax supports standard G-code with RTCP (G234 on Hurco). GOTCHA: Transform Plane works differently from Heidenhain's tilted working plane (PLANE SPATIAL) or Fanuc's G68.2 — post processor must be Hurco-specific. Fanuc-posted 5-axis code will NOT run correctly on Hurco without post modification.",
    category: "programming",
    tags: ["controller","hurco","transform-plane","5-axis","3+2","RTCP"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-102",
    title: "Makino SGI.5 — high-speed micro-block processing for mold finishing",
    body: "Makino's SGI.5 (Super Geometric Intelligence v5) is purpose-built for processing NC programs with micro-blocks (traverse <1mm per block), common in mold/die finishing. SGI.5 provides 20-60% faster cycle times than standard interpolation while maintaining accuracy and surface finish. It combines machine rigidity, advanced servo tuning, and proprietary smoothing algorithms. CRITICAL: SGI.5 benefits require the CAM system to output appropriate block density — too-coarse tolerance negates the advantage. Recommended CAM tolerance: 0.002-0.005mm for mold finishing. The Pro6 control's GI mode adds 2D corner control for sharp internal corners.",
    category: "programming",
    tags: ["controller","makino","SGI","HSM","mold","micro-block","surface-finish"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-103",
    title: "Makino Pro6 is Fanuc-based — standard G-codes with Makino enhancements",
    body: "The Professional 6 control is built on Fanuc hardware with Windows CE GUI overlay. Standard Fanuc G-codes (G00-G04, G17-G19, G28, G40-G43, G54-G59, G80-G89) all work. Makino-specific enhancements: ATLM (Automatic Tool Length Measurement) via guided on-screen prompts, tilted working plane setup with graphical guidance, and SGI.5 integration for HSM. M-codes above M79 are typically machine-specific — always verify with machine documentation. Pro6 stores up to 3GB of programs (expandable to 20GB), supports MDI recall of last 20 inputs, and allows simultaneous program editing during machining.",
    category: "programming",
    tags: ["controller","makino","Fanuc","Pro6","ATLM","G-codes"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-104",
    title: "Brother Speedio CNC-C00 high-accuracy modes M280-M282",
    body: "Brother Speedio C00 uses M-codes M280-M282 to control corner handling behavior. Default (no M28x active): the machine biases toward geometry adjustment (cutting corners) rather than slowing down at direction changes. M280 restores default mode, M281 enables moderate accuracy, M282 enables high accuracy (slower but tighter corners). CRITICAL for finishing: always enable M281 or M282 for finish passes — default mode will round sharp corners. These M-codes are configurable at the console for fine-tuning. For roughing, default mode (M280) maximizes speed by allowing geometric deviation at corners.",
    category: "programming",
    tags: ["controller","brother","speedio","M280","accuracy","corner-handling"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-105",
    title: "Haas G12/G13 circular pocket milling — CW/CCW without CAM",
    body: "G12 (clockwise) and G13 (counterclockwise) are Haas-specific G-codes for circular pocket milling directly in the control without CAM. Parameters: I (first radius/stepover), J (second radius for taper), K (depth per pass), L (number of passes), D (cutter comp register), Q (start position offset). These are perfect for O-ring grooves, circular bosses, and simple round pockets. GOTCHA: the tool must be positioned at the pocket center before calling G12/G13 — the cycle machines outward from center. Combine with G12/G13 for roughing then a final spring pass at full depth for finishing.",
    category: "programming",
    tags: ["controller","haas","G12","G13","circular-pocket","conversational"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-106",
    title: "Citizen LFV low-frequency vibration cutting G-code control",
    body: "Citizen's LFV (Low Frequency Vibration) technology is a game-changer for swiss lathe chip control. It vibrates servo axes in sync with spindle rotation, creating intermittent 'air-cutting' gaps that break chips into small pieces. Programming is simple: insert two G-code lines (LFV ON/OFF) into existing NC programs. Three LFV modes available: Mode 1 for OD/ID turning and grooving, Mode 2 for micro-drilling at high surface speeds, Mode 3 for vibration-free thread cutting. LFV reduces tool wear, heat generation, and power consumption. It transforms machining of stringy materials (stainless, copper, plastics) that normally wrap around the guide bushing. Adjust vibration frequency and amplitude via simple variable changes in one program line.",
    category: "programming",
    tags: ["controller","citizen","swiss-lathe","LFV","chip-breaking","vibration-cutting"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-107",
    title: "Citizen detachable guide bushing and programming impact",
    body: "Many Citizen Cincom machines (L12, L20) feature a detachable guide bushing. With guide bushing installed, the machine operates as a traditional swiss-type for long/small-diameter parts. When removed, it becomes a fixed-headstock lathe for short workpieces with less material waste. This configuration change affects programming: with guide bushing, Z-axis reference is at the bushing face; without it, reference shifts to the chuck face. Always verify your Z-origin when switching modes. The detachable bushing also changes bar remnant length — non-guide-bushing mode typically saves 30-50mm of bar stock per remnant. Update your bar feeder parameters and part-off positions accordingly.",
    category: "programming",
    tags: ["controller","citizen","swiss-lathe","guide-bushing","detachable","Z-origin"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-108",
    title: "Fidia C40 Vision ViMill real-time collision avoidance for 5-axis",
    body: "Fidia's ViMill software is a real-time collision avoidance system that checks blocks ahead in look-ahead mode, detecting possible collisions and stopping the machine before impact. Unlike post-process verification (like Vericut), ViMill operates during actual machining in real-time. Fidia pioneered look-ahead over 40 years ago and the C40 Vision now processes 1,000+ lines ahead. ViMill checks tool, holder, spindle head, and machine structure against workpiece and fixtures. This is invaluable for 5-axis die/mold work where complex tool orientations risk head collisions. Always ensure your tool assembly (tool + holder + spindle geometry) is fully defined in the tool table — ViMill uses this data for its collision envelope calculations.",
    category: "programming",
    tags: ["controller","fidia","5-axis","collision-avoidance","ViMill","look-ahead"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-109",
    title: "Fidia Velocity Five and RTCP for 5-axis trajectory control",
    body: "Fidia's Velocity Five is a multi-axis trajectory control technology with dynamic-selectable roughing/finishing parameters (DYNA). It reduces finish milling time on 3D profiles by 15-20% and roughing by 30-40% compared to standard mode. The RTCP (Rotary Tool Center Point) function manages tool-length compensation in 3D space for bi-rotary heads, roto-tilting tables, and combined configurations. With RTCP active, program the toolpath without considering head pivot geometry — the control inserts compensations from the NC tool table at runtime. The C40 supports up to 10,000 tools with 16-character alphanumeric IDs. ISOGRAPH CAD/CAM is integrated for 2.5D programming directly on the control. Use DYNA parameter sets to switch between aggressive roughing dynamics and smooth finishing dynamics within the same program.",
    category: "programming",
    tags: ["controller","fidia","5-axis","velocity-five","RTCP","DYNA"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-110",
    title: "Sodick EDM linear motor and programming considerations",
    body: "All modern Sodick EDMs use linear motors on all axes (no ballscrews), providing zero backlash and superior positioning accuracy critical for EDM precision. When programming Sodick wire EDM, the LN Professional offers automatic programming with shape pattern libraries covering common die/mold geometries. For sinker EDM, electrode orbiting patterns and Z-depth control are managed by the technology database. Key tip: when setting up scheduled operations (unattended multi-electrode jobs), use the LN Professional's built-in scheduling function rather than external systems — it coordinates electrode changes with the technology database for optimal sequencing. The CF card storage is standard for program backup. API access to LN Professional engines enables integration with external CAD/CAM and automation systems.",
    category: "programming",
    tags: ["controller","sodick","EDM","linear-motor","wire-EDM","sinker-EDM"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-111",
    title: "DATRON next SimPL programming language vs G-code",
    body: "DATRON machines use SimPL (Simple Programming Language) instead of standard G-code. SimPL is a modern conversational language with plain-language commands, syntax checking, auto-completion, and debugging — features absent from traditional G-code controls. DATRON worked with major CAM vendors (Fusion 360, Mastercam, SolidCAM, HSMWorks, CAMWorks) to create post-processors that output directly to SimPL format. Do NOT use generic Fanuc/ISO posts — they will not work. The next control adds interpolation points within CAM tolerance bands, calculated to 5 decimal places (metric) for superior surface finish on micro-milled parts. Z Surface Mapping with the measuring probe automatically compensates for workpiece surface variations — essential for engraving and thin-sheet machining. Auto Tool Management monitors wear and swaps sister tools without program changes.",
    category: "programming",
    tags: ["controller","datron","SimPL","micro-milling","high-speed","post-processor"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-112",
    title: "DATRON next vacuum table and accessory integration",
    body: "DATRON's SimPL language directly integrates commands for DATRON-specific accessories: vacuum tables, dust collection, ionizing spray bars, and camera-based workpiece setup. The camera + multi-touch display + XYZ sensor combination allows zero-point setting via swiping gestures — no edge-finder or indicator needed. This is uniquely suited to thin aluminum, plastic, and composite sheet machining where traditional clamping would distort the part. When programming in CAM, ensure your post-processor includes DATRON vacuum zone control commands (activating/deactivating specific vacuum zones as the tool moves). The 4-step setup wizard guides through workholding, tool loading, zero-point, and program verification. For beginners, the conversational interface translates operation selections directly into SimPL code.",
    category: "programming",
    tags: ["controller","datron","vacuum-table","camera-setup","thin-sheet"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-113",
    title: "Fadal CNC Format 1 vs Format 2 critical differences",
    body: "Fadal VMCs support two programming formats: Format 1 (Fadal native) and Format 2 (Fanuc compatible). Critical differences: Format 1 auto-resets control state, uses E1-E48 work offsets, and only needs D or H (assumes both from same offset). Format 2 requires explicit resets in program, accepts G54-G59 or E-type offsets, and REQUIRES both D and H words — omitting either will crash. Format 1 was designed for finger-cam style automation and does things automatically that may be undesirable. Format 2 is recommended for shops running mixed Fadal/Fanuc machines. Both formats support Fadal-specific canned cycles: bolt hole circle (L93NN), mill boring (L95NN), rectangular/circular pocket cycles, and engraving with serialization. The G68 axis rotation works well in both formats. Rigid tapping uses G84.2 (prepare) + G84.1 (execute) which differs from standard Fanuc G84 rigid tap.",
    category: "programming",
    tags: ["controller","fadal","Format-1","Format-2","E-offsets","legacy"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-114",
    title: "Star swiss lathe Fanuc variant with NC Assist and B-axis",
    body: "Star swiss lathes use Fanuc controllers (typically 31i-B or 18i-TB on older models) with Star-specific customizations. NC Assist is Star's template-driven CNC program editor that generates code from clickable machining templates with minimal input — faster than manual G-code for standard swiss operations. The Fanuc iHMI interface on newer models (15\" touchscreen) includes conversational programming, free-figure contour programming, and fixed-phrase insert for building programs block-by-block. Some Star models feature double B-axis programmable units for simultaneous 5-axis control — unusual for swiss lathes. Star Motion Control System coordinates all axes for seamless operations. M-codes above M79 are Star-specific and vary by model — always verify against the machine's M-code table. Use CAM software (GibbsCAM, PartMaker) with Star-specific post processors for complex multi-axis programs.",
    category: "programming",
    tags: ["controller","star","swiss-lathe","fanuc-variant","NC-Assist","B-axis"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-115",
    title: "Index C200 dual-controller option and INDEXoperate interface",
    body: "The Index C200 production turning machine offers a choice between Siemens 840D sl (18.5\" multi-touch) or Fanuc 31i-B (15\" touchscreen). The Siemens variant features INDEXoperate, a custom user interface designed specifically for Index multi-spindle lathes. The C200 supports 2-3 turrets with 42 tool stations (VDI25), and can be configured with 2 Y-axes on the main spindle or 1 each on main/counter spindles. All setup data is stored with the part program for fast job changes. INDEX Virtual Machine (optional) provides an identical digital twin with genuine Siemens 840D control, all machine parameters, and full 3D collision checking — enabling production-parallel setup of the next job. When programming, use the built-in block-time measuring and part-production-time evaluation to optimize cycle times. Always create programs using INDEX's virtual machine first to avoid crashes on the physical machine.",
    category: "programming",
    tags: ["controller","index","multi-spindle","INDEXoperate","virtual-machine","dual-controller"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-116",
    title: "Tsugami opposed gang tool swiss lathe with Fanuc 32i-B",
    body: "Tsugami swiss lathes use Fanuc controllers (32i-B on SS-series opposed gang, 0i-TF Plus on P-series split slide). The opposed gang tool configuration (SS20, SS26, SS32) allows simultaneous machining on main and sub spindles with deep cutting capability. Key programming consideration: on opposed-slide machines, each slide must be gauged to a given datum before entering tool offsets — use geometry offsets with drawing dimensions, not incremental offsets. The Modular Tool Zone allows easy swapping between rotary tools, indexed holders, and turning holders — document your tool zone configuration in the program header comments for setup reference. Tsugami's software enables rapid programming with minimal training, but for complex parts, use CAM with Tsugami-specific post processors. The B0-series (B0126, B0205, B0206, B0325, B0326) uses either Fanuc 0i-TD or 32i-B depending on axis count.",
    category: "programming",
    tags: ["controller","tsugami","swiss-lathe","fanuc-variant","opposed-gang","modular-tooling"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-117",
    title: "Nakamura-Tome NT Manual Guide i for multitasking programming",
    body: "Nakamura-Tome machines use Fanuc controllers with the NT Manual Guide i — an upgrade from standard Fanuc Manual Guide i tailored for Nakamura multitasking machines. Programs display by spindle, waiting process, or part-transfer process, simplifying multi-axis/multi-turret programming. Detailed 3D guide drawings with coordinate axes and directional marks ensure precise milling operations. G112 enables Polar Coordinate Function, making the C-axis act as a virtual Y-axis for milling flats, hexes, and keyways without physical Y-axis hardware. The 3D Smart Pro AI (latest addition) enhances programming intelligence. When programming live tooling on Fanuc 16-TT or 31i-B controllers, always verify the C-axis zero position and indexing resolution. NT Manual Guide i manages turning, milling, grooving, drilling, and tapping with process rearrangement capability — useful for optimizing cycle times after initial programming.",
    category: "programming",
    tags: ["controller","nakamura-tome","fanuc-variant","NT-Manual-Guide","multitasking","G112"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-118",
    title: "YCM machining centers with Fanuc — OEM integration notes",
    body: "YCM (Yeong Chin Machinery) machines use standard Fanuc controls (commonly 0i-MF, 31i-B) with minimal OEM-specific customization — making them among the most Fanuc-compatible Taiwanese builders. If you know Fanuc, you know YCM. YCM's value is in the machine hardware (rigid castings, high-speed spindles) rather than control customization. Key notes: older YCM VMCs (VMC-72 era) used Fanuc 0M controls with limited parameter access — if retrofitting or upgrading, verify parameter backup compatibility. YCM 5-axis machines use standard Fanuc RTCP (G43.4/G43.5) without proprietary layers. YCM provides custom engineering solutions for automation integration. For post-processor development, use standard Fanuc posts with machine-specific M-code adjustments (coolant, ATC, pallet changer codes). Check YCM-specific M-codes in the machine manual — they follow Fanuc conventions but ATC and coolant codes may differ from other Fanuc-equipped machines.",
    category: "programming",
    tags: ["controller","ycm","fanuc-variant","VMC","5-axis","taiwanese"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-119",
    title: "EMAG inverted vertical lathe programming with Siemens 840D",
    body: "EMAG vertical lathes (VL/VT series) use an inverted spindle design where the spindle picks up the workpiece from below, acting as both loader and machining spindle. This fundamentally changes programming: every program must include an auto-loading sequence using the workholding chuck — the spindle descends to a spring-loaded pick-up station, grabs the blank (gimbaled plate compensates for misalignment), then retracts to the machining position. Tool turrets and ways are positioned above, outside the chip/coolant zone. EMAG uses Siemens 840D sl on turning/grinding models and Fanuc on some VT models. When upgrading from older Schubert CC15 controls to Siemens, EMAG transfers all programs and parameters without data loss. For the VT 2/VT 4 shaft machines, 4-axis programming enables precision shaft machining. Z-axis direction is inverted compared to horizontal lathes — verify your coordinate system orientation.",
    category: "programming",
    tags: ["controller","emag","siemens-variant","inverted-spindle","vertical-lathe","pick-up"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-120",
    title: "EMAG modular machine line and Siemens cycle integration",
    body: "EMAG's modular VL pick-up turning machines integrate automation directly into the machine — no external gantry loader needed. When programming Siemens 840D on EMAG machines, use the pre-configured turning technology packages: stock removal cycles handle contour roughing with just parameter entry, groove/thread undercut cycles are built-in, and measuring cycles support in-process gauging. For multi-operation cells (common in EMAG production lines), coordinate workpiece handoff between machines via the pick-up station programming. EMAG's retrofit service can upgrade older machines to current Siemens 840D sl with the Siemens OP015A panel while preserving all existing programs. Key Siemens cycles for EMAG turning: CYCLE95 (stock removal), CYCLE97 (thread cutting), CYCLE93 (groove), CYCLE94 (undercut). Always use EMAG's machine-specific cycle parameter sets rather than generic Siemens defaults.",
    category: "programming",
    tags: ["controller","emag","siemens-variant","modular","turning-cycles","automation"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  {
    id: "ctrl-121",
    title: "Index/Traub virtual machine for collision-free multi-spindle setup",
    body: "Both Index and Traub offer Virtual Machine software that creates a digital twin of the physical machine with genuine Siemens 840D or TX8i control, identical parameters, and full 3D kinematics. For multi-spindle and multi-turret machines (Index C200, MS16C, MS22C; Traub TNL, TNK series), ALWAYS develop and prove out programs on the virtual machine first. The virtual machine detects collisions between turrets, spindles, tailstock, and workpiece that cannot be caught by standard CAM simulation. Index Virtual Machine runs production-parallel — set up the next job while the current one runs. Traub WinFlexIPS Plus provides the same capability externally. Both systems store complete setup data (tools, offsets, work coordinates) with the program for instant job recall. The investment in virtual machine software typically pays for itself in the first avoided crash.",
    category: "programming",
    tags: ["controller","index","traub","virtual-machine","digital-twin","collision-detection","multi-spindle"],
    confidence: 80,
    source: "controller:web_research",
    created_at: "2026-03-07",
    usage_count: 0
  },
  // ============================================================================
  // HURCO WINMAX DEEP KNOWLEDGE — Extracted from WinMax Mill Intro Workbook
  // ============================================================================
  {
    id: "ctrl-122",
    title: "Hurco WinMax BNC vs ISNC mode — critical differences",
    body: "WinMax supports two NC modes: BNC (Basic NC) uses Hurco-native syntax with relative Z values in canned cycles; ISNC (Industry Standard NC) is Fanuc-compatible with absolute Z values. Critical difference: tapping uses G88 in BNC mode but G84+M29 for rigid tapping in ISNC. Peck tapping (G84.2/G84.3) is ISNC-only. Boring cycle G86 behavior differs: BNC stops spindle and rapid retracts, ISNC feeds out with optional dwell. Set mode via Parameter 10 (0=BNC, 1=ISNC). Most CAM posts output ISNC for cross-controller compatibility.",
    category: "programming",
    tags: ["hurco","winmax","bnc","isnc","mode","fanuc-compatible","tapping","canned-cycles"],
    confidence: 95,
    source: "controller:winmax_intro_workbook",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-123",
    title: "Hurco WinMax G84.2/G84.3 dual Z-word peck tapping",
    body: "WinMax ISNC mode supports peck rigid tapping with G84.2 (right-hand) and G84.3 (left-hand). Unique syntax requires TWO Z-words: first Z is total depth, second Z is peck increment. Example: G84.2 X0 Y0 Z-1.0 Z0.25 R0.1 F41.667 (1 inch depth, 0.25 inch pecks for 1/4-20 at 1000 RPM). This dual Z-word syntax is unique to WinMax and causes post processor issues if not handled correctly. The peck breaks chips but doesn't fully retract, maintaining thread engagement.",
    category: "programming",
    tags: ["hurco","winmax","g84.2","g84.3","peck-tapping","rigid-tapping","dual-z","isnc"],
    confidence: 95,
    source: "controller:winmax_intro_workbook",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-124",
    title: "Hurco WinMax M126/M127 — shortest rotary angle path",
    body: "M126 enables shortest rotary angle path for 4th/5th axis moves. Without M126, the control moves to the exact programmed angle (e.g., A0 to A350 moves 350 degrees). With M126 active, it calculates the shortest path (10 degrees in the example). Critical for 5-axis repositioning moves where taking the long way can cause tool interference. M127 cancels M126. Always program M126 before rapid rotary repositions in 5-axis work. Pair with G28 A0 B0 for return to home position.",
    category: "programming",
    tags: ["hurco","winmax","m126","m127","rotary","5-axis","shortest-path","positioning"],
    confidence: 92,
    source: "controller:winmax_intro_workbook",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-125",
    title: "Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)",
    body: "M128 activates Tool Center Point Management (TCPM) — essential for true 5-axis simultaneous machining. With TCPM active, the control compensates XYZ position as rotary axes move to keep the tool tip at the programmed location. Without TCPM (M129), rotary moves cause the tool tip to arc through space. Always activate M128 before 5-axis contouring and M129 before 3+2 positioning. TCPM requires accurate machine kinematics and tool length measurement.",
    category: "programming",
    tags: ["hurco","winmax","m128","m129","tcpm","tcp","5-axis","tool-center-point"],
    confidence: 95,
    source: "controller:winmax_intro_workbook",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-126",
    title: "Hurco WinMax M140 — safe 5-axis retract along tool vector",
    body: "M140 retracts the Z-axis along the tool vector (not machine Z) to a safe position. Critical for 5-axis work where the tool may be tilted — a standard G28 Z0 would move in machine coordinates and could cause collision. Use M140 before any rotary repositioning in 5-axis programs. The retract distance is set in machine parameters. Sequence for 5-axis reposition: M140 (safe retract), M126 (shortest path), G0 A_ B_ (rotary move), then G43.4 H_ (reestablish TCP).",
    category: "programming",
    tags: ["hurco","winmax","m140","5-axis","retract","tool-vector","safety","collision-avoidance"],
    confidence: 93,
    source: "controller:winmax_intro_workbook",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-127",
    title: "Hurco WinMax M200 — tilt axis preference for 5-axis",
    body: "M200 sets the tilt axis preference when the tool orientation can be achieved multiple ways. On trunnion-style machines (A/C or B/C), some tool vectors can be reached by tilting either axis. M200 tells the control which axis to prefer when both solutions exist. This affects surface finish consistency in continuous 5-axis — inconsistent axis preference causes visible witness marks. Set via M200 Axx Bxx with preferred axis values.",
    category: "programming",
    tags: ["hurco","winmax","m200","tilt-axis","5-axis","surface-finish","trunnion"],
    confidence: 88,
    source: "controller:winmax_intro_workbook",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-128",
    title: "Hurco WinMax M42 — auto two-touch probing",
    body: "M42 enables automatic two-touch probing with G31 skip function. When activated, after the initial probe touch, the control automatically backs off and re-approaches at reduced feedrate for higher accuracy. This eliminates the need to program two separate G31 moves for each probe point. M41 deactivates two-touch mode. Use M42 for precision part probing (±0.0001\" accuracy typical), M41 for faster tool measurement where ultimate accuracy isn't required.",
    category: "programming",
    tags: ["hurco","winmax","m42","m41","probing","two-touch","g31","inspection"],
    confidence: 90,
    source: "controller:winmax_intro_workbook",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-129",
    title: "Hurco WinMax axis clamp M-codes for rotary axes",
    body: "WinMax uses M12/M13 for C-axis clamp/unclamp, M32/M33 for A-axis, M34/M35 for B-axis. Always clamp rotary axes after positioning for 3+2 work to prevent creep from cutting forces. Sequence: G0 A45 (position), M32 (clamp A), then cut. Unclamp before next rotary move. Some machines have hydraulic clamps that require dwell (G4 P500) after clamp command. Check machine spec — pneumatic clamps typically instant, hydraulic need 0.5-1s settle time.",
    category: "programming",
    tags: ["hurco","winmax","m12","m32","m34","axis-clamp","rotary","3+2"],
    confidence: 90,
    source: "controller:winmax_intro_workbook",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-130",
    title: "Hurco WinMax G64 UltiMotion vs G05.3 smoothing",
    body: "G64 activates UltiMotion (Hurco's patented full-path motion planning) while G05.3 is the older NURBS smoothing mode. UltiMotion is superior for most work — it analyzes the entire program and calculates optimal acceleration profiles. G05.3 NURBS smoothing is useful when the CAM system outputs short line segments that need smoothing into curves. UltiMotion handles both long segments and short segments well. For HSM finishing, UltiMotion alone typically gives best results without G05.3.",
    category: "programming",
    tags: ["hurco","winmax","g64","g05.3","ultimotion","nurbs","smoothing","hsm"],
    confidence: 92,
    source: "controller:winmax_intro_workbook",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-131",
    title: "Hurco WinMax auxiliary output M-codes for custom automation",
    body: "WinMax provides M52-M55 for turning on auxiliary outputs 1-4, and M62-M65 for turning them off. These connect to the machine's I/O panel for customer automation: part clamps, chip blowers, door interlocks, coolant nozzle positioning, part catcher, etc. Check with the machine builder for wiring. Outputs are maintained until explicitly turned off — they don't auto-reset at M30. Program M62-M65 to clear outputs before program end if needed. Use in subprograms for repeatable automation sequences.",
    category: "programming",
    tags: ["hurco","winmax","m52","m62","auxiliary-outputs","automation","io","custom"],
    confidence: 88,
    source: "controller:winmax_intro_workbook",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-132",
    title: "Hurco WinMax pallet changer M56/M57/M58",
    body: "M56 initiates a pallet change without waiting for confirmation — use for automated cells. M57 rotates to pallet 1, M58 rotates to pallet 2 (for 2-pallet systems). For systems with more pallets, use M57 with P-word: M57 P3 (rotate to pallet 3). Always program Z retract and spindle stop before pallet change. The control tracks which pallet is at the machine and can call pallet-specific subprograms automatically. Critical for lights-out: verify probe part present after pallet change.",
    category: "programming",
    tags: ["hurco","winmax","m56","m57","m58","pallet-changer","automation","lights-out"],
    confidence: 88,
    source: "controller:winmax_intro_workbook",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-133",
    title: "Hurco WinMax G154 extended work offsets (P1-P99)",
    body: "Beyond G54-G59, WinMax supports G154 P1 through P99 for 99 additional work offsets. Essential for tombstone fixtures, pallet systems, and multi-part setups. Call with: G154 P15 (select additional offset 15). The G154 Pxx format is WinMax-specific — differs from Fanuc G54.1 Pxx. When converting posts between controllers, watch this syntax carefully. Work offsets store XYZ + ABC rotary offsets for full 5-axis part positioning.",
    category: "programming",
    tags: ["hurco","winmax","g154","work-offsets","extended","pallet","tombstone"],
    confidence: 90,
    source: "controller:winmax_intro_workbook",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-134",
    title: "Hurco WinMax scaling and rotation G50/G51/G68/G69",
    body: "G51 activates scaling with X, Y, Z scale factors: G51 X2.0 Y2.0 Z1.0 (double XY, keep Z). G50 cancels scaling. G68 activates coordinate rotation: G68 X0 Y0 R45 (rotate 45° about X0Y0). G69 cancels rotation. Can be combined for parametric programming — scale a program down to fit different blank sizes, or rotate to machine multiple identical features at angles. Cancel both (G50 G69) before tool changes. Rotation affects all coordinate modes including cutter comp.",
    category: "programming",
    tags: ["hurco","winmax","g50","g51","g68","g69","scaling","rotation","parametric"],
    confidence: 88,
    source: "controller:winmax_intro_workbook",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-135",
    title: "Hurco WinMax G16 polar coordinate mode for bolt patterns",
    body: "G16 enables polar coordinate mode — X becomes radius, Y becomes angle. Perfect for bolt circles without calculating XY positions: G16 (polar on), G81 X1.5 Y0 Z-0.5 R0.1 F10 (hole at radius 1.5, 0°), Y45 (hole at 45°), Y90 (hole at 90°), etc. G15 returns to Cartesian. Polar mode works with canned cycles and linear moves. The angle origin (Y0) is along positive X-axis. Use incremental mode (G91) for evenly-spaced holes: G91 Y30 L12 (12 holes at 30° spacing).",
    category: "programming",
    tags: ["hurco","winmax","g16","g15","polar","bolt-circle","hole-pattern"],
    confidence: 90,
    source: "controller:winmax_intro_workbook",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-136",
    title: "Hurco WinMax chip conveyor control M59/M60/M61",
    body: "M59 runs chip conveyor forward (toward chip bin), M60 runs in reverse (for clearing jams), M61 stops the conveyor. On automatic cycles, program M59 before cutting starts and M61 at program end or during tool changes where chip clearing isn't needed. Some shops run conveyor continuously (never M61), others cycle it to reduce wear. Reverse (M60) for 2-3 seconds occasionally helps clear buildup. Watch conveyor during first article — adjust timing to prevent chip overflow.",
    category: "programming",
    tags: ["hurco","winmax","m59","m60","m61","chip-conveyor","chips","automation"],
    confidence: 85,
    source: "controller:winmax_intro_workbook",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-137",
    title: "Hurco WinMax climb vs conventional milling selection",
    body: "WinMax uses 'Left' for climb milling (G41) and 'Right' for conventional milling (G42). Climb milling preferred for rigid setups: chip starts thick for easy penetration, cutting forces push part into fixture, better chip evacuation, better coolant access. Conventional milling for flexible setups: chip starts at zero thickness reducing tooth impact, compensates for machine backlash. In ISNC mode: G41 Dxx for left comp (climb), G42 Dxx for right comp (conventional), G40 to cancel.",
    category: "programming",
    tags: ["hurco","winmax","climb-milling","conventional","g41","g42","cutter-comp"],
    confidence: 92,
    source: "controller:winmax_cutter_comp_guide",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-138",
    title: "Hurco WinMax Profile milling with Max Offset",
    body: "Profile Left/Right milling types add Max Offset capability for roughing-to-finish approach. Calculate Max Offset as: (largest inscribed circle radius) - (tool radius). Example: 1-inch pocket with 0.5-inch endmill → Max Offset = 1.0 - 0.25 = 0.75 inch. Tool starts at Max Offset distance from final profile and steps toward it using Step Over percentage. When tool is resharpened to smaller diameter, recalculate Max Offset. Critical for efficient material removal with clean finish.",
    category: "programming",
    tags: ["hurco","winmax","profile-milling","max-offset","roughing","finishing","step-over"],
    confidence: 90,
    source: "controller:winmax_cutter_comp_guide",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-139",
    title: "Hurco WinMax pocket milling strategies",
    body: "WinMax Pocket Boundary cuts around programmed boundary avoiding islands. Two Pocket Types: Outward (spiral from center out) — only for circles/frames without islands, fastest for simple pockets. Inward (spiral from outside in) — required when islands exist, avoids island collision. Enable Blend Moves adds 180° arc lead-in/out for smooth entry/exit. For complex pockets with multiple islands, program Pocket Island blocks after Pocket Boundary. Order of segments determines tool path direction.",
    category: "programming",
    tags: ["hurco","winmax","pocket-milling","island","spiral","outward","inward","blend-moves"],
    confidence: 88,
    source: "controller:winmax_cutter_comp_guide",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-140",
    title: "Hurco WinMax recovery restart after E-stop",
    body: "After Emergency Stop, use Recovery Restart to continue from interruption point. Steps: (1) Restore machine power, (2) Select Auto mode, (3) Enter Start Block number (where to restart), (4) Optional End Block, (5) Select Recovery Restart softkey. If Start Block contains multiple restart choices, prompts appear to select exact restart point. The control re-initializes modal states (G-codes, tool, work offset) automatically. Always verify tool and part condition before restart — chips may need clearing.",
    category: "troubleshooting",
    tags: ["hurco","winmax","recovery","restart","e-stop","emergency","resume"],
    confidence: 88,
    source: "controller:winmax_recovery_guide",
    created_at: "2026-04-15",
    usage_count: 0
  },
  // ============================================================================
  // HURCO 5-AXIS ADVANCED — From Michael Cope 5-Axis Post Notes (2014)
  // ============================================================================
  {
    id: "ctrl-141",
    title: "Hurco 5-axis program header essentials — M31, M126, M140",
    body: "Critical 5-axis header sequence: M31 (reset rotary encoder to current position — prevents unwinding on return to zero), M126 (shortest angular traverse), traditional safety line WITHOUT G17 (plane designation causes 5-axis issues), M140 (set retract along tool vector), G53 Z0 (home Z in machine coords), G0 A0 C0 (home rotaries). Never use G17/G18/G19 in 5-axis safety line — causes Transform Plane problems. For Z retract, prefer G53 Z0 over G91 G28 Z0 to avoid absolute/incremental mode issues.",
    category: "programming",
    tags: ["hurco","winmax","5-axis","header","m31","m126","m140","safety-line"],
    confidence: 95,
    source: "controller:hurco_5axis_cope_2014",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-142",
    title: "Hurco G68.2 Transform Plane for 3+2 positioning",
    body: "G68.2 creates a tilted work plane for 3+2 machining. Format: G68.2 X0 Y0 Z0 A-45 C225. XYZ defines origin offset (relative to current WCS), ABC defines plane rotation using ISO conventions (front/right = positive, back/left = negative, CCW around Z = positive). G68.2 enables TCPM automatically but does NOT move axes — output separate G0 A_ C_ for physical rotation. G69 cancels. Transform planes can stack (each relative to previous) — cancel with one G69 per active G68.2, in reverse order.",
    category: "programming",
    tags: ["hurco","winmax","g68.2","transform-plane","3+2","5-axis","iso-rotation"],
    confidence: 95,
    source: "controller:hurco_5axis_cope_2014",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-143",
    title: "Hurco G8.2 ASR — Automatic Safe Repositioning for 5-axis",
    body: "G8.2 (ASR) commands automatic safe repositioning in 5-axis work. Format: G8.2 X_ Y_ Z_ I_ J_ K_ (target position with tool vector). The control internally calculates the safest path to the target, creeping along machine travel limits without operator-specified intermediate points. Use ASR for every 5-axis reposition to prevent crashes. Output IJK tool vectors (not ABC angles) on G8.2 line — if using ABC with tilting axis offset, one direction will misposition. ASR is a command buffer, not a motion — follow with G01 for actual cut.",
    category: "programming",
    tags: ["hurco","winmax","g8.2","asr","repositioning","5-axis","collision-avoidance"],
    confidence: 93,
    source: "controller:hurco_5axis_cope_2014",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-144",
    title: "Hurco M128 TCPM + G43.4 toolpath linearization",
    body: "M128 enables TCPM — all XYZ data references the un-rotated workpiece coordinate system. Tool vector determines actual tool orientation. Example: with part rotated A-90, commanding Z-1.0 moves along backside (machine Y) while tool stays perpendicular to rotated face. G43.4 adds toolpath linearization — prevents gouging by controlling the tool-tip continuously during rotation, not just start/end points. Without linearization, rotation is 'blind' and tool-tip arcs through space. Always use both for simultaneous 5-axis.",
    category: "programming",
    tags: ["hurco","winmax","m128","g43.4","tcpm","linearization","5-axis-simultaneous"],
    confidence: 95,
    source: "controller:hurco_5axis_cope_2014",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-145",
    title: "Hurco 5-axis IJK tool vector requirements — 6 decimal places",
    body: "IJK tool vectors define tool orientation in 5-axis simultaneous machining. Critical: output to 6 decimal places minimum — 4 decimals causes erratic motion and poor surface finish. IJK vectors are unitless (direction cosines) — they should NOT change between inch and metric modes. Test by posting same operation in both units and verify IJK values match. IJK is not modal — must output on every line. Alternative: use ABC rotary angles instead of IJK, but IJK preferred for smooth continuous motion.",
    category: "programming",
    tags: ["hurco","winmax","ijk","tool-vector","5-axis","precision","surface-finish"],
    confidence: 92,
    source: "controller:hurco_5axis_cope_2014",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-146",
    title: "Hurco rotary axis parameter verification for 5-axis",
    body: "Before running 5-axis programs, verify rotary axis parameters: Auxiliary Menu → Utility → User Preferences → More → Rotary Axes Parameters. Recommended settings: ISO Standard = YES (use standard rotation conventions), Tilt Axis Preference = NEGATIVE. ISO convention: front/right rotations positive, back/left negative, CCW around Z positive. Non-ISO machines reverse some directions. Mismatched settings between CAM post and machine cause parts machined on wrong faces or inverted features.",
    category: "programming",
    tags: ["hurco","winmax","rotary-parameters","iso-standard","5-axis","setup","configuration"],
    confidence: 90,
    source: "controller:hurco_5axis_cope_2014",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-147",
    title: "Hurco 5-axis simultaneous sequence best practices",
    body: "Recommended 5-axis simultaneous sequence: (1) Position XY to initial point BEFORE M128 to avoid overtravel errors, (2) Position Z to clearance height, (3) M128 to enable TCPM, (4) G8.2 with target position and IJK (ASR for safe reposition), (5) G43.4 for linearization, (6) M13 M33 to unclamp C and A axes, (7) G01 cutting moves with IJK vectors on every line, (8) At end: M129 (cancel TCPM), G0 M140 (retract along tool vector), G53 Z0, M31 (encoder reset), G53 A0 C0, M30.",
    category: "programming",
    tags: ["hurco","winmax","5-axis-sequence","simultaneous","best-practice","procedure"],
    confidence: 93,
    source: "controller:hurco_5axis_cope_2014",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-148",
    title: "Hurco BNC vs ISNC mode detection on machine",
    body: "To check current NC mode on Hurco WinMax/UltiMax: (1) Press Auxiliary Menu button, (2) Select Utility icon (penknife), (3) User Preferences, (4) Entry Settings. Mode dropdown shows BNC or ISNC. Can be changed here. Post processor must match machine mode: BNC uses Hurco-native syntax (G88 tapping, relative Z in cycles), ISNC is Fanuc-compatible (G84+M29 tapping, absolute Z). Most CAM systems output ISNC for cross-machine compatibility. Always verify mode before running new posts.",
    category: "programming",
    tags: ["hurco","winmax","bnc","isnc","detection","mode-check","setup"],
    confidence: 92,
    source: "controller:hurco_bnc_isnc_guide",
    created_at: "2026-04-15",
    usage_count: 0
  },
  // FANUC POST-PROCESSOR INTELLIGENCE TIPS (ctrl-149+)
  // Sourced from Fanuc.cps (Autodesk Fusion 360 post, rev 44207, 2025-12-17) and Fanuc manuals
  {
    id: "ctrl-149",
    title: "Fanuc AICC smoothing levels — G05.1 Q1 R[1-10] from .cps",
    body: "The Fusion 360 Fanuc post exposes 10 smoothing levels for AI Contour Control. G05.1 Q1 with no R value uses the default level. G05.1 Q1 R1 = roughing (coarsest, fastest), R4 = semi-rough, R7 = semi-finish, R10 = finishing (finest tolerance, slowest). In 'Automatic' mode the post selects the level based on operation stock: above 0.5 mm → level 1, below 0.05 mm → level 10, between 0.05–0.1 mm → level 7. Cancel with G05.1 Q0. AICC must be cancelled before changing the active smoothing level — always output G05.1 Q0 first, then re-enable with new R value.",
    category: "programming",
    tags: ["fanuc","aicc","smoothing","g05.1","hsm","finishing","roughing","post-processor"],
    confidence: 95,
    source: "controller:fanuc_cps_rev44207",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-150",
    title: "Fanuc G05.1 Q3 Nano Smoothing — NURBS conversion internally",
    body: "G05.1 Q3 activates Nano Smoothing on 31i-B5/30i-B. Unlike AICC (Q1) which adjusts acceleration profiles, Q3 mathematically converts short G01 line segments into smooth NURBS curves internally before motion execution. This eliminates micro-segment artifacts from dense CAM output without requiring the CAM system to output NURBS. The Fusion post uses: writeBlock(gFormat.format(5.1), 'Q3') when nano smoothing is enabled. Cancel with G05.1 Q0. On 0i-MF, G05.1 Q3 is not available — use G05.1 Q1 with the highest R level instead. On 31i-B5, both Q1 and Q3 can be active simultaneously for maximum surface quality.",
    category: "programming",
    tags: ["fanuc","nano-smoothing","g05.1","nurbs","31i-b5","surface-finish","5-axis"],
    confidence: 93,
    source: "controller:fanuc_cps_rev44207",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-151",
    title: "Fanuc G68.2 tilted work plane — syntax and G53.1 confirmation",
    body: "G68.2 sets a tilted coordinate frame for 3+2 indexing. Syntax from Fusion post: G68.2 X[origin X] Y[origin Y] Z[origin Z] I[Euler alpha] J[Euler beta] K[Euler gamma]. The I/J/K values are Euler ZXZ-R angles (degrees). After G68.2, output G53.1 to command the rotary axes to align with the tilted frame — this is the 'turn machine' command. Cancel the frame with G69 before any WCS block (G54–G59). The post sets cancelTiltFirst:true so G69 always precedes WCS changes. Common mistake: omitting G53.1 after G68.2 leaves rotaries unpositioned. Also note: probing cannot run while G68.2 is active — the post validates this with an error.",
    category: "programming",
    tags: ["fanuc","g68.2","tilted-workplane","3+2","5-axis","g53.1","g69","euler"],
    confidence: 96,
    source: "controller:fanuc_cps_rev44207",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-152",
    title: "Fanuc G43.4 vs G43.5 TCP — table vs head kinematics",
    body: "Fanuc uses two TCP codes for 5-axis simultaneous machining. G43.4 applies to table-type (rotary table) or table/table kinematics — the tool vector is expressed in the machine coordinate system. G43.5 applies to head-type or head/table kinematics — the tool vector is expressed relative to the tilted work coordinate frame. The Fusion post automatically selects: G43.4 when machineConfiguration.isMultiAxisConfiguration() is true (table rotaries), G43.5 for non-multi-axis head configurations. Cancel TCP with G49. Important: Fanuc parameter #5006 bit 6 must = 1 if G49 causes axis motion on your machine — the post outputs a macro check: IF[PRM[5006,6]NE1]THEN#3000=91 to catch this at run time.",
    category: "programming",
    tags: ["fanuc","g43.4","g43.5","tcp","5-axis","rtcp","tool-center-point","parameter"],
    confidence: 94,
    source: "controller:fanuc_cps_rev44207",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-153",
    title: "Fanuc G76 fine boring — shift direction and dwell",
    body: "G76 (fine boring) avoids a witness mark by orienting the spindle (M19), shifting the tool by Q amount, retracting, then shifting back. Syntax: G98 G76 X_ Y_ Z_ R_ P_ Q_ F_. P is dwell in milliseconds (always include even if small — try P200 minimum). Q is the shift distance; direction is controlled by parameter #5101 bit 4 (default: +X direction). The Fusion post outputs Q using xyzFormat (3 decimal places in metric). For precision bores specify Q = 0.050–0.100 mm typical. A dwell P at the bottom before the orient step is strongly recommended to let the bore finish cutting before shift — P500 for finishing passes. G76 is modal group 9 (canned cycles) — cancel with G80.",
    category: "programming",
    tags: ["fanuc","g76","fine-boring","witness-mark","spindle-orient","m19","boring","finishing"],
    confidence: 91,
    source: "controller:fanuc_cps_rev44207",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-154",
    title: "Fanuc thread cutting — G32, G92, G76 comparison",
    body: "Fanuc offers three thread-cutting methods on lathes: (1) G32: single-point linear thread cutting, one pass at a time — programmer must handle each pass depth manually. Syntax: G32 Z_ F[pitch]. (2) G92: thread cutting cycle — automatically handles multiple passes using Q peck and I/K for taper, but only one lead angle. Syntax: G92 X_ Z_ F[pitch] or G92 X_ Z_ I_ F_ for tapered. (3) G76: compound thread cycle — uses two blocks: first sets thread parameters (P, Q chamfer, R finish allowance), second sets XZP dimensions and L lead. Most efficient — calculates all passes automatically. For milling centers, thread milling uses G02/G03 helical interpolation with a thread mill, not these lathe-specific codes.",
    category: "programming",
    tags: ["fanuc","thread-cutting","g32","g92","g76","lathe","turning","pitch"],
    confidence: 90,
    source: "controller:fanuc_programming_manual",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-155",
    title: "Fanuc Macro B skip function G31 — probing and in-process gauging",
    body: "G31 (skip function) feeds at the programmed F rate until a skip signal arrives (probe contact), then executes a skip. The control stores the position at skip in system variables: #5061=X, #5062=Y, #5063=Z at skip point. Syntax: G31 F100 Z-50. (feed toward -Z at F100 until contact). After G31, the tool is at the contact position — store it: #101=#5063 (save Z touch). For probing sequences, use G31 with #5061–#5063, then compute deviations with Macro B arithmetic. Multiple skip levels: G31 P1–P4 on some controls. The Fusion post calls macro subprogram O9810 (protected retract), O9832 (probe on), O9833 (probe off) — these are Renishaw-style macros. Custom shops can write their own O9810 equivalent using G31.",
    category: "programming",
    tags: ["fanuc","g31","skip-function","probing","macro-b","in-process","gauging","#5061"],
    confidence: 92,
    source: "controller:fanuc_cps_rev44207",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-156",
    title: "Fanuc Macro B variable classes — local, common, system",
    body: "Fanuc Macro B has three variable classes: (1) Local #1–#33: exist only within the current macro subprogram, cleared on return. (2) Common #100–#199: retained across macro calls, cleared on power off. (3) Common #500–#999: persistent — retained across power cycles (stored in SRAM). (4) System #1000+: read-only control status (e.g., #5001–#5008 = tool offset values; #5021–#5028 = current machine position; #5041–#5048 = current workpiece position; #4001–#4120 = current G/M modal values). Key tip: Use #500+ for calibration data that must survive power cycles (tool wear values, probe calibration offsets). Arithmetic: #100=#101+#102 (add), #100=SQRT[#101] (square root), #100=SIN[#101] (degrees). IF/GOTO for branching: IF[#1 GT 0] GOTO 10.",
    category: "programming",
    tags: ["fanuc","macro-b","variables","#500","#100","system-variables","programming"],
    confidence: 94,
    source: "controller:fanuc_macro_manual",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-157",
    title: "Fanuc G54.4 workpiece error compensation — 30i/31i only",
    body: "G54.4 provides workpiece setting error compensation on Fanuc 30i/31i (not available on 0i). It compensates for workpiece tilt/offset measured by a probe during setup. Syntax: G54.4 P1 through P8 selects one of 8 error compensation data sets. G54.4 P0 cancels. The Fusion post exposes this via the useG54x4 property — when enabled, probing results are stored in G54.4 data sets rather than G68 rotation. The probe angle variables are: X-offset=#135, Y-offset=#136, angle R=#144, baseParam=26000. Key limitation: cannot use G68 coordinate rotation while G54.4 is active (and vice versa). G54.4 compensation is applied additionally on top of the active WCS (G54–G59) — it does not replace it.",
    category: "programming",
    tags: ["fanuc","g54.4","workpiece-compensation","30i","31i","probing","error-comp"],
    confidence: 89,
    source: "controller:fanuc_cps_rev44207",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-158",
    title: "Fanuc through-tool coolant M88/M89 and combined flood+through",
    body: "Fanuc through-tool (spindle center) coolant uses M88 (on) and M89 (off). For combined flood + through-tool coolant, the Fusion post outputs both M08 and M88 in sequence. The post settings define: COOLANT_FLOOD → M08 (off implicit via M09), COOLANT_THROUGH_TOOL → M88 on / M89 off, COOLANT_FLOOD_THROUGH_TOOL → M08+M88 on / M09+M89 off. The singleLineCoolant setting (false by default) outputs each M-code on its own block. For thread tapping, coolant should be M88 (through-tool) for the best tap life — this requires a through-coolant spindle option on the machine. Note: M09 cancels ALL coolant including through-tool; use M89 to cancel only through-tool while keeping flood M08 active. Always confirm machine has through-coolant spindle before programming M88.",
    category: "programming",
    tags: ["fanuc","m88","m89","through-tool-coolant","m08","coolant","tapping","spindle"],
    confidence: 88,
    source: "controller:fanuc_cps_rev44207",
    created_at: "2026-04-15",
    usage_count: 0
  },

  // ============================================================================
  // MAZAK / MAZATROL CONTROLLER INTELLIGENCE TIPS (ctrl-169 through ctrl-178)
  // Sourced from: mazak integrex i-200.cps (Autodesk Fusion, rev 44199, 2025-10-14),
  // mazak qtu 200-m.cps (rev 44199, 2025-10-17), and Mazak Mazatrol programming manuals.
  {
    id: "ctrl-169",
    title: "Mazatrol EIA vs Mazatrol conversational — when to use each and how they differ",
    body: "Mazak Mazatrol controllers support two programming modes: Mazatrol conversational (the native language) and EIA/ISO mode (Fanuc-compatible G-code). In Mazatrol conversational, each unit describes the feature to be machined (e.g., HOLE, FACE, POCKET) and the control calculates tool paths internally — parameters are entered in plain language with pick-based menus. EIA mode uses standard G-code compatible with CAM post processors; the Fusion 360 Mazak posts output EIA (file extension .eia). Key differences: (1) Tool numbers — Mazatrol uses its own tool table with entries like T01.1 (station.tool); EIA mode uses standard T__ with M06. (2) Threading — Mazatrol generates threading automatically from feature parameters; EIA requires G92/G76 (QTU) or G292/G276 (Integrex). (3) The Fusion QTU post has property isoModeOrMazatrol — setting to Mazatrol outputs a Mazatrol subprogram call for tool and offset setup while the rest of the program is EIA. For complex mill-turn operations, EIA from Fusion gives more predictable toolpaths; Mazatrol conversational is preferred for simple turned parts programmed at the machine.",
    category: "programming",
    tags: ["mazak","mazatrol","eia","conversational","iso","mill-turn","g-code","programming-mode"],
    confidence: 93,
    source: "controller:mazak_qtu200m_cps_rev44199",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-170",
    title: "Mazak Integrex G12.1 polar interpolation — complete activation and cancel sequence",
    body: "G12.1 polar interpolation enables milling of flat features (hex flats, keyways, slots) on the OD of turned parts using the C-axis and live tooling. Required activation sequence: (1) Stop turning spindle: M205 (Integrex main) or M5 (QTU); (2) Engage C-axis: M200 (main spindle); (3) Select milling plane: G17; (4) Set RPM: G97 S[rpm]; (5) Enable geometry comp: G61.1 (useG61=true in Fusion post); (6) Activate polar: G12.1; (7) Start live tool: M3 S[rpm]. During polar mode, XY moves are converted to X-radius and C-rotation. Cancel sequence: M5 (stop live tool), G13.1 (cancel polar), G40 or G61 (cancel geometry comp), M202 (disengage C-axis), then restart turning spindle M203. CRITICAL: always cancel G12.1 with G13.1 before any turning pass. Omitting G13.1 causes the control to interpret the next X turning move as Cartesian rather than diameter mode, resulting in a crash. For Integrex sub-spindle polar: G12.1 P2 activates polar on sub spindle.",
    category: "programming",
    tags: ["mazak","integrex","qtu","g12.1","polar-interpolation","mill-turn","live-tooling","c-axis","m200","sequence"],
    confidence: 96,
    source: "controller:mazak_integrex_i200_cps_rev44199",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-171",
    title: "Mazak Integrex B-axis 3+2 milling — M107/M108 lock sequence and TCP setup",
    body: "The Mazak Integrex i-series has a B-axis (tilting milling spindle) enabling milling at angles. B-axis range is typically -30 to +210 degrees on the i-200. For 3+2 milling: (1) Position B-axis: G0 B[angle] — Fusion post outputs this before G68/G68.2 activation; (2) Lock B-axis: M107 — prevents B movement during milling; (3) Apply work plane transform: G68 (rotation vector, Fusion property tiltedPlaneMethod=G68) or G68.2 (Euler angles, preferred on Smooth controller); (4) Activate TCP: G43 H#3020 (useFixedOffset=true in Fusion post) for consistent tool length regardless of B angle; (5) Mill the feature; (6) Cancel tilted plane: G69; (7) Unlock B-axis: M108. The useFixedOffset=true property outputs G43 H#3020 instead of a fixed H offset number — this references the current tool offset register automatically and avoids hard-coded offset numbers that change between setups. B-axis maximum rapid speed is typically 10 RPM — never rapid B-axis while the milling spindle is running.",
    category: "programming",
    tags: ["mazak","integrex","b-axis","3+2","tilted-plane","g68","g68.2","m107","m108","tcp","g43","rtcp"],
    confidence: 94,
    source: "controller:mazak_integrex_i200_cps_rev44199",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-172",
    title: "Mazak Integrex vs QTU spindle M-code numbering — 200 and 300 series explained",
    body: "Mazak mill-turn machines use a three-tier M-code spindle scheme. On both Integrex and QTU: live milling spindle = M3 (CW) / M4 (CCW) / M5 (stop); main turning spindle = M203 / M204 / M205; sub turning spindle = M303 / M304 / M305. C-axis engagement: main spindle = M200 (engage) / M202 (disengage); sub = M300 / M302. Spindle clamp for indexing: main = M210 (clamp) / M212 (unclamp); sub = M310 / M312. Chuck control: main = M207 (clamp) / M206 (unclamp); sub = M307 / M306. C-axis brake (separate from clamp): main = M14 (lock) / M15 (unlock); sub = M114 / M115. In Fusion 360 posts, SPINDLE_MAIN maps to M203-M205, SPINDLE_SUB maps to M303-M305, SPINDLE_LIVE maps to M3-M5. Spindle orient: main = M19; sub = M39. When posting multi-spindle operations, verify Fusion spindle assignments match the actual machine — incorrect mapping causes the wrong spindle to start and can destroy workholding or the part.",
    category: "programming",
    tags: ["mazak","integrex","qtu","m200","m203","m303","spindle","mill-turn","sub-spindle","live-tool","m-codes"],
    confidence: 96,
    source: "controller:mazak_integrex_i200_cps_rev44199",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-173",
    title: "Mazak spindle synchronization M511/M513 and stock transfer sequence",
    body: "Bar stock transfer between main and sub spindle on Mazak mill-turn uses spindle synchronization to prevent part damage. Phase synchronization (M511) locks both spindles at the same angular position — both chucks open/close at the same rotational angle, preventing part twist during handoff. Speed synchronization (M511 on Matrix/Smooth, M380 on 640MT) matches RPM so the sub spindle can grip without relative motion. Transfer sequence: (1) M511 to synchronize spindles; (2) Advance sub spindle to grip position using W[position] sub-spindle Z move; (3) M31 interlock bypass ON — allows sub chuck to close while main chuck is still clamped; (4) M307 close sub chuck; (5) M206 open main chuck; (6) M32 interlock bypass OFF; (7) M513 cancel synchronization. For torque-controlled transfer (transferUseTorque=yes in Fusion post): M508 engages torque skip — the sub spindle pulls with limited torque to seat the part before handoff; M509 cancels torque skip. On 640MT controllers use M380/M381 instead of M511/M513.",
    category: "programming",
    tags: ["mazak","integrex","qtu","m511","m513","spindle-sync","stock-transfer","sub-spindle","m31","m380","torque"],
    confidence: 94,
    source: "controller:mazak_qtu200m_cps_rev44199",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-174",
    title: "Mazak Integrex threading — G292/G276 vs QTU G92/G76",
    body: "Mazak Integrex i-series uses different threading G-codes from the QTU/Quick Turn line. Integrex EIA threading: G292 = single-pass threading (equivalent to lathe G92); G276 = multi-pass threading (equivalent to lathe G76). QTU/Quick Turn threading: G92 = single-pass; G76 = multi-pass. This is critical when adapting programs between machine types — a QTU thread program will not run on an Integrex without substituting G92 to G292 and G76 to G276. In Fusion 360, the useSimpleThread property controls output: true = G292 (Integrex) or G92 (QTU); false = G276 (Integrex) or G76 (QTU). G276/G76 two-block format: first block sets tool nose radius and finish allowance, second block defines thread geometry and pitch. Always cancel G96 (CSS) with G97 before threading to prevent RPM variation mid-thread. Threading requires G95 (feed per revolution) mode active.",
    category: "programming",
    tags: ["mazak","integrex","qtu","g292","g276","g92","g76","threading","mill-turn","lathe"],
    confidence: 96,
    source: "controller:mazak_integrex_i200_cps_rev44199",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-175",
    title: "Mazatrol system variables — #501 sub-spindle position and P901/P902 home parameters",
    body: "Mazatrol EIA programs use system variables in the #500 range. Key variables: #501 = sub-spindle (W-axis) current position — the Fusion Integrex post uses this for relative sub-spindle Z moves written as W[#501+offset] (e.g., W[#501+100.0] moves sub-spindle 100mm toward main). Machine home positions are stored in parameters: P901 = main Z home (zHomeParameter in post); P902 = sub Z home (zSubHomeParameter). Use G53 Z[#P901] to send main spindle to parameter-referenced home rather than hardcoded Z0. For parametric feed (useParametricFeed=true): Integrex post uses firstFeedParameter=105 so Q105 is the feed variable; QTU uses firstFeedParameter=100 so Q100. Mazatrol macro variables V1-V499 are program-local (cleared when program ends); V500-V999 persist through power cycles and are used for counters and accumulated tool life data. For EIA programs, Fanuc-style # variables are used rather than Mazatrol V variables.",
    category: "programming",
    tags: ["mazak","mazatrol","integrex","variables","#501","system-variables","sub-spindle","parametric","p901","macro"],
    confidence: 90,
    source: "controller:mazak_integrex_i200_cps_rev44199",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-176",
    title: "Mazak Matrix vs Smooth vs 640MT controller — key programming differences",
    body: "Mazak machines span three controller generations with important programming differences. 640MT (older QTU): basic G-code; speed sync = M380/M381 (not M511/M513); no RTCP; limited 5-axis capability. Matrix / Matrix 2 (mid-generation): rigid tapping requires M29 preamble before G84 — format: M29 S[rpm], then G84 block; speed sync = M511/M513; G68 tilted plane; RTCP via G43.4. Smooth (SmoothG, SmoothX, SmoothAI — latest): G84 rigid tapping is native, no M29 needed; G68.2 Euler-angle tilted plane is preferred; SmoothAI adaptive feedrate; full RTCP; Smooth Machining Control for surface quality. In Fusion 360, the Integrex post controllerType property selects Matrix or Smooth; the QTU post adds 640MT as a third option — choosing 640MT outputs M380/M381 instead of M511/M513. CRITICAL: never run a Smooth-targeted program (G84 without M29) on a Matrix machine — it will fail with a tapping error. Always confirm controller generation before first run.",
    category: "programming",
    tags: ["mazak","matrix","smooth","640mt","controller","rigid-tapping","m29","m511","g68.2","differences","compatibility"],
    confidence: 95,
    source: "controller:mazak_qtu200m_cps_rev44199",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-177",
    title: "Mazak G61.1 geometry compensation for polar interpolation milling accuracy",
    body: "G61.1 is Mazak's geometry compensation mode — applied in the rotary polar coordinate system during G12.1 polar interpolation. When G61.1 is active (useG61=true in Fusion post), the control compensates for the offset between the C-axis centerline and the tool tip during linear interpolation in polar mode. Without G61.1, small errors accumulate as C-axis rotates — particularly visible at the ends of flat faces where the toolpath transitions from cutting to air. Sequence: enable G61.1 before G12.1 activation; cancel with G40 after G13.1. G61.1 works with the active tool radius offset (D offset). Important distinction: G61.1 on Mazak is entirely different from G61 exact-stop mode on Fanuc — they share similar code numbers but completely different functions. On older Matrix controllers, geometry compensation may not be a purchased option — verify the machine option list before relying on G61.1. The Fusion post property useG61 (default true) controls whether G61.1 is output.",
    category: "programming",
    tags: ["mazak","integrex","qtu","g61.1","geometry-compensation","polar-interpolation","g12.1","cutter-comp","accuracy"],
    confidence: 91,
    source: "controller:mazak_integrex_i200_cps_rev44199",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-178",
    title: "Mazak part catcher M-codes — M48/M49 on QTU vs M248/M249 on Integrex",
    body: "Mazak mill-turn machines use different M-codes for part catchers depending on model. QTU / Quick Turn series: M48 = part catcher extend (position to catch part); M49 = part catcher retract. Integrex i-series: M248 = part catcher extend; M249 = part catcher retract. QTU part ejector: M185 = cycle the part ejector (ejects part into catcher after cutoff). The Fusion post property usePartCatcher=true outputs these codes automatically at program end after cutoff operations. On QTU with secondary spindle (MSY model), autoEject=true triggers M185 after sub-spindle part-off. Tailstock M-codes also differ: Integrex = M841 (advance) / M843 (retract); QTU = M741 / M743. When adapting a program between QTU and Integrex, all part handling codes must be substituted — they are not cross-compatible. For programs run on both machines, use a controller-type conditional macro or maintain separate post outputs for each machine.",
    category: "programming",
    tags: ["mazak","integrex","qtu","part-catcher","m48","m49","m248","m249","m185","part-ejector","tailstock","m841"],
    confidence: 93,
    source: "controller:mazak_qtu200m_cps_rev44199",
    created_at: "2026-04-14",
    usage_count: 0
  },

  // ============================================================================
  // OKUMA OSP CONTROLLER INTELLIGENCE TIPS (ctrl-179 through ctrl-188)
  // Sourced from: okuma.cps (Autodesk Fusion 2025 rev 44207), HSMWorks okuma.cps (rev 44689),
  // OkumaMacroConverter okuma_parser.py, and Okuma OSP-P300 programming manuals.
  {
    id: "ctrl-179",
    title: "Okuma OSP macro V-variables vs Fanuc #-variables — syntax translation guide",
    body: "Okuma OSP macro programming uses V-variables instead of Fanuc #-variables. Key syntax differences: variable reference is V1–V999 (not #1–#999); assignment uses '=' (V10=25.0); grouping uses square brackets (V5=[V1+V2]*V3, NOT parentheses); trig functions take degrees directly (SIN[45.0], COS[90.0], TAN[30.0] — not radians). Persistent variables that survive power cycle: V500–V999. System variables use named tables: VSLDT (current axis position), VTLDT (tool offset data), VPRDT (program data) — not Fanuc #5000-series. Conditional branching: IF[V1 GT 10] GOTO N100 (Fanuc: IF[#1 GT 10] GOTO 100). The PRISM OkumaMacroConverter tool (resources/MACRO TO HARD CODE CONVERTER) automates #→V translation. After conversion, verify SIN/COS arguments are in degrees (not radians) and all '()' grouping brackets have been changed to '[]'.",
    category: "programming",
    tags: ["okuma","osp","macro","v-variables","fanuc-comparison","syntax","parametric","conversion"],
    confidence: 94,
    source: "controller:okuma_osp_programming_manual_p300",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-180",
    title: "Okuma OSP work offset format: G15 H## is native — G54 is compatibility mode only",
    body: "Okuma OSP uses G15 H## for work offsets, not G54–G59. Format: G15 H1 through G15 H200 (H0 = machine coordinate system, equivalent to Fanuc G53). The Autodesk Fusion/HSM post uses: wcsDefinitions = {format:'G15 H##', range:[1,200]}. On OSP-P200 only H1–H99 are available. G54 is accepted only in Fanuc-compatibility mode (machine parameter required) but G15 H## is the correct native form — posts configured for Fanuc G54 output will trigger 'UNDEFINED G CODE' alarms on a standard OSP. In Mastercam: set Work Coordinate to 'Other' and prefix 'G15 H'. In HyperMILL: select the OSP post package (not generic ISO/Fanuc). In JM Die's Okuma lathe (.MIN programs), the header always uses G15 H1 — verify this if editing legacy programs.",
    category: "programming",
    tags: ["okuma","osp","work-offsets","g15","h-code","fanuc-comparison","wcs","post-processor","alarm","min-file"],
    confidence: 96,
    source: "controller:okuma_osp_p300_operator_manual",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-181",
    title: "Okuma G284 — OSP-native rigid tapping cycle, no M29 synchronization required",
    body: "Okuma OSP supports both G84 (Fanuc-compatible) and the OSP-native G284 for rigid tapping. G284 is recommended on all P300/P500. Critical difference from Fanuc: OSP does NOT require M29 (rigid mode select) before G84 or G284 — synchronization is internal to the cycle. G284 syntax: G284 X_ Y_ Z_ R_ F_ (all absolute, identical parameters to G84). Feedrate = pitch × RPM. Example: M6×1.0 at 800 RPM → F800.0. G284 enables in posts: Autodesk Fusion property 'Use G284' = true; Mastercam: rigid_tap_code$ = 284 in .PST file. For left-hand threads: use G274 (OSP native) instead of G74. If posting programs that run on both Okuma OSP and Fanuc machines, use G84 (works on both) and do not output M29 — OSP ignores M29 gracefully but outputs a warning on some versions.",
    category: "programming",
    tags: ["okuma","osp","tapping","g284","g84","g274","rigid-tapping","no-m29","post-processor"],
    confidence: 95,
    source: "controller:okuma_osp_p300_programming_manual",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-182",
    title: "Okuma Super-NURBS G08 D/I/L parameters — real-time spline fitting of G01 segments",
    body: "OSP Super-NURBS activates within the G08 High-Cut command via D, I, and L parameters. Standard G08: G08 P0 E0.005 (High Quality, 5 µm tolerance). Super-NURBS G08: G08 P0 E0.005 D0.002 I2 L19.0. Parameter guide: E = path tolerance (outermost bound; use 4× finishing tolerance for roughing), D = NURBS fitting tolerance (D must be ≤ E; use 0.001–0.003 for finishing), I2 = B-spline interpolation mode, L = maximum merged segment length in mm (15–25 mm typical). Effect: OSP merges adjacent G01 segments up to L-length into smooth B-spline curves internally, reducing block cycle time and improving surface finish above 3000 mm/min. Finishing recipe for Ra < 0.8 µm: G08 P0 E0.003 D0.001 I2 L15.0. Cancel: G08 P-1 before section end. Autodesk Fusion post: 'Enable superNURBS smoothing' property adds D/I/L automatically. Requires OSP-P300 firmware R01w+.",
    category: "programming",
    tags: ["okuma","osp","super-nurbs","g08","hsm","surface-finish","smoothing","b-spline","high-cut","p300"],
    confidence: 93,
    source: "controller:okuma_osp_high_cut_p300_manual",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-183",
    title: "Okuma CAS M510/M511 — Collision Avoidance System disable/enable for 5-axis machining",
    body: "Okuma CAS (Collision Avoidance System) monitors the machine envelope in real-time and halts motion if a collision is predicted. CRITICAL: for 5-axis simultaneous machining, CAS must be disabled (M510) before multi-axis moves and re-enabled (M511) after. Without disabling, legitimate cutting passes where tool and part are intentionally close trigger alarm 'MACHINE INTERFERENCE DETECTED', halting the program mid-cut. Required sequence in post: (1) Retract Z clear of part, (2) M510 — disable CAS, (3) Enable TCP (G43.5), (4) Execute 5-axis cutting moves, (5) Cancel TCP, retract, (6) M511 — re-enable CAS. CAS default state is ON (M511) at power-on. Autodesk Fusion post property 'Enable Collision Avoidance System' = true adds M510/M511 automatically around multi-axis sections. NEVER end the program with CAS disabled — the footer must always contain M511.",
    category: "programming",
    tags: ["okuma","osp","cas","collision-avoidance","m510","m511","5-axis","safety","alarm","critical","tcp"],
    confidence: 97,
    source: "controller:okuma_osp_5axis_programming_guide",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-184",
    title: "Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop",
    body: "NAVI-Mill is OSP's conversational programming environment — operators define operations (face mill, pocket, drill, contour) graphically without writing G-code. Key rules: (1) NAVI programs are stored as parametric operation records, not G-code — cannot be transferred to non-Okuma machines without first exporting as .MIN G-code. (2) NAVI supports up to 4-axis; 5-axis simultaneous machining requires ISO G-code programming mode. (3) To inspect the generated G-code: EDIT → G-CODE VIEW. (4) NAVI programs can call G-code subprograms via CALL O#### for custom macros. (5) NAVI-Lathe (turning) covers OD/ID turning, threading, grooving, and drilling — the standard programming mode on JM Die's Okuma CNC lathes for die-blank turning. When troubleshooting NAVI surface finish or tool life issues, always examine the G-CODE VIEW to see actual feedrates and depths — NAVI may apply conservative defaults differing from what was programmed.",
    category: "programming",
    tags: ["okuma","osp","navi-mill","navi-lathe","conversational","iso","g-code","5-axis-limit","jm-die","lathe"],
    confidence: 91,
    source: "controller:okuma_navi_mill_operator_guide",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-185",
    title: "Okuma CALL OO88 — macro-based fixture offset for 3+2 tilted work plane machining",
    body: "CALL OO88 is Okuma's macro-based tilted work plane system for 3+2 machining on OSP-P200 and P300. Syntax: CALL OO88 P1=H51 (activates tilted coordinate using fixture offset H51). Cancel: CALL OO88 P1=H0. CRITICAL: O0088 is a factory-reserved system macro — never program a user subprogram to O0088 or it overwrites the tilted plane function, causing immediate post-activation errors. Standard sequence: (1) Position rotary axes to desired angle, (2) M10/M26 to clamp 4th/5th axis, (3) CALL OO88 P1=H[n], (4) Machine features in tilted frame using G15 H[offset] for zero-point, (5) CALL OO88 P1=H0 to cancel, (6) M11/M27 to unclamp axes. Autodesk Fusion post: 'Tilted work plane method' = 'OO88', 'Fixture offset WCS' = 51. Requires 5-axis option license. On P300 firmware R01w+, prefer G605 (ctrl-186) for higher accuracy.",
    category: "programming",
    tags: ["okuma","osp","call-oo88","fixture-offset","3+2","tilted-workplane","multi-axis","macro","p300","p200"],
    confidence: 94,
    source: "controller:okuma_osp_multiaxis_programming",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-186",
    title: "Okuma G605 Dynamic Fixture Offset — native 3+2 tilted work plane for OSP-P300/P500",
    body: "G605 is Okuma's G-code-based tilted work plane command on OSP-P300 (R01w+) and P500. It replaces CALL OO88 with direct G-code syntax and integrates with the OSP kinematic model for better accuracy. Full sequence: (1) G604 [P[1-8]] — set rotary axis offset reference, (2) G605 H[n] — activate tilted WCS via fixture offset H[n], (3) Machine in tilted frame, (4) G11 — cancel tilt/rotation. The G11 cancel corresponds to gRotationModal in the post (formats as G604 or G11 depending on firmware). Autodesk Fusion post: 'Tilted work plane method' = 'G605', 'Rotary offset WCS' = 1–8 (0 = disable Roffset). G605 advantage vs CALL OO88: directly uses the control's kinematic transformation — eliminates the small angular errors introduced by the OO88 macro approximation. Required firmware: OSP-P300 R01w or later. On older P200 or pre-R01w P300: use CALL OO88 only.",
    category: "programming",
    tags: ["okuma","osp","g605","g604","g11","dynamic-fixture-offset","3+2","tilted-workplane","p300","p500","firmware"],
    confidence: 92,
    source: "controller:okuma_osp_p300_r01w_release_notes",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-187",
    title: "Okuma G445/G446 Tool Posture Offset Control (TPOC) — 5-axis TCP accuracy compensation",
    body: "TPOC (Tool Posture Offset Control) compensates for tool center point positional errors during 5-axis simultaneous machining. Enable: G445 (in block before TCP-active moves). Cancel: G446. TPOC applies real-time correction based on actual tool geometry and calibration data from Okuma's 5-Axis Auto Tuning System — it corrects for spindle tilt, tool runout, and TCP offset drift with angle. When TPOC is critical: tools longer than 100 mm on A/C table machines, tolerances tighter than ±0.01 mm on inclined surfaces, or after any spindle bearing replacement. Without TPOC, a 0.1 mm TCP offset error at 30° tilt produces ~0.05 mm Z-error on the inclined face. Autodesk Fusion post: 'Enable Tool Posture Offset Control' = true adds G445/G446 automatically. Prerequisites: 5-axis option license and a completed 5-axis calibration (re-run calibration after any spindle or rotary axis maintenance).",
    category: "programming",
    tags: ["okuma","osp","tpoc","g445","g446","5-axis","tcp","tool-posture","accuracy","calibration","compensation"],
    confidence: 90,
    source: "controller:okuma_osp_5axis_tuning_guide",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-188",
    title: "Okuma Thermo-Friendly Concept (TFC) — eliminate warm-up time without sacrificing accuracy",
    body: "Okuma's Thermo-Friendly Concept (TFC) eliminates machine warm-up routines by combining three technologies: (1) Thermally Symmetric Structure — symmetric casting geometry and symmetric spindle/column layout minimizes differential thermal expansion; (2) Thermal Active Stabilizer — dedicated spindle oil cooler maintains spindle temperature within 0.1°C of ambient; (3) Thermal Displacement Control — 6+ embedded temperature sensors feed a real-time compensation model that continuously adjusts the programmed tool-tip position. Practical impact for JM Die: Okuma lathe and mill programs run from cold start achieve the same dimensional accuracy as after a 30-minute warm-up, saving 30–60 minutes of unproductive spindle time per shift per machine. TFC compensation values are visible: OSP DIAGNOSTIC → Thermal Compensation Display. Troubleshooting TFC accuracy drift: (a) coolant temperature variation > ±3°C — stabilize coolant chiller; (b) spindle bearing replacement without TFC re-calibration — run calibration procedure; (c) machine relocation — ambient temperature model must be re-calibrated.",
    category: "setup",
    tags: ["okuma","osp","thermo-friendly","tfc","thermal-compensation","warm-up","accuracy","jm-die","production","cold-start"],
    confidence: 92,
    source: "controller:okuma_thermo_friendly_concept_whitepaper",
    created_at: "2026-04-15",
    usage_count: 0
  },

  // ============================================================================
  // HAAS NGC ADVANCED CONTROLLER INTELLIGENCE TIPS (ctrl-189 through ctrl-198)
  // Sourced from haas next generation.cps (Autodesk Fusion 360, rev 44207, 2025-12-17)
  //   + Haas NGC Programming Manual + Haas Settings Reference
  // ============================================================================
  {
    id: "ctrl-189",
    title: "Haas G187 P-level and E-tolerance — complete smoothing guide",
    body: "G187 controls the accuracy/speed trade-off on every Haas NGC machine. Three P levels: P1 (roughing) = fastest motion, largest path deviation; P2 (medium) = balanced default; P3 (finishing) = slowest, tightest path, best surface quality. The optional E word sets a custom tolerance in current units (inches or mm). Examples: G187 P1 E0.005 (rough, 0.005in tolerance), G187 P2 (medium, default tolerance), G187 P3 E0.0002 (finish, 0.0002in tolerance). E range is 0.0001 to 0.9999 (inch) or 0.001 to 25.4 (mm). G187 is modal — once set it persists until changed. Forgetting to switch from P1 to P3 before a finish pass is the most common cause of poor Haas surface finish. Critical: do NOT change G187 level while tool length compensation is active — cancel G49 first if Setting 191 requires it. Setting 191 (Smoothing Tolerance) sets the P3 default tolerance for the machine; G187 E overrides it per-operation.",
    category: "programming",
    tags: ["haas","ngc","g187","smoothing","surface-finish","accuracy","roughing","finishing","setting-191"],
    confidence: 96,
    source: "controller:haas_ngc_programming_manual",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-190",
    title: "Haas NGC Setting 130 — tapping feed mode and G95 IPR best practice",
    body: "Setting 130 (Tapping Feed Mode) is a critical Haas NGC setting that determines how the F-word in G84/G74 tapping cycles is interpreted. Setting 130=0 (default on newer NGC): feed is in inches-per-revolution (IPR) or mm-per-revolution (MPR) — feedrate = pitch value directly (e.g., F0.0787 for 1/4-20, which is 1/20 = 0.05 inch pitch). Setting 130=1 (older Haas default): feed is in IPM/MPM — feedrate = RPM x pitch (e.g., S1500 F1500x0.05 = F75). The IPR mode (Setting 130=0 with G95) is far more reliable because the control synchronizes feed to spindle rotation rather than a calculated rate, tolerating minor RPM variation. Post processors should check Setting 130 and output accordingly. Fusion post property useG95forTapping=true outputs G95 before the tapping cycle and G94 after. When using a 3rd party post that does not handle Setting 130, verify manually: wrong mode causes stripped threads or broken taps. Always confirm Setting 130 after a machine update or parameter restore.",
    category: "programming",
    tags: ["haas","ngc","setting-130","tapping","g84","g95","ipr","feedrate","rigid-tapping","thread"],
    confidence: 97,
    source: "controller:haas_ngc_settings_guide",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-191",
    title: "Haas NGC M19 spindle orient — P-angle and Q-direction for precise back-boring",
    body: "M19 commands a controlled spindle orient on Haas NGC machines, essential for fine boring (G76) and back boring (G87). Syntax: M19 P<angle> Q<direction> — P sets the orient angle (0-360 degrees, resolution 0.001 degree), Q1 = orient CW (positive direction), Q2 = orient CCW. Example: M19 P90.0 Q1 orients spindle 90 degrees clockwise. If P is omitted the control uses the value stored in Setting 46 (Parameter for fine boring tool shift direction). Q direction must match the tool geometry — a boring bar shifted in the wrong direction will gouge the bore wall on retract. Fine boring workflow: (1) M19 P<angle> Q<1or2> to orient spindle, (2) G76 Q<shift> to shift tool away from bore wall, (3) G00 retract clears without drag. For G87 back boring: M19 orients spindle before the tool enters the bore from below to clear the bore on entry. When Setting 46 is correctly configured, G76 and G87 call M19 automatically — manual M19 calls are only needed for custom macro cycles.",
    category: "programming",
    tags: ["haas","ngc","m19","spindle-orient","g76","g87","fine-boring","back-boring","setting-46"],
    confidence: 94,
    source: "controller:haas_ngc_programming_manual",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-192",
    title: "Haas UMC G234 TCPC — pivot distance setup and crash prevention",
    body: "G234 (Tool Center Point Control) enables 5-axis simultaneous machining on Haas UMC series by compensating XYZ motion for rotary axis pivot distances. Unlike G43 (tool length only), G234 H<n> accounts for both tool length AND the pivot distance from rotary center to spindle nose. Setup sequence: (1) Measure or obtain machine builder pivot distances — typically from machine build certificate; (2) Enter pivot distances in Settings 276 (A pivot X), 277 (A pivot Y), 278 (A pivot Z), 279 (B pivot X), 280 (B pivot Y), 281 (B pivot Z); (3) Set Setting 256 = ON (enable TCPC); (4) Set Setting 33 = axis offset (tool length measured with TCPC in mind). Common mistakes: (a) leaving Settings 276-281 at zero — produces large XYZ errors during rotation; (b) measuring pivot distances with the table in non-zero position — always measure at A=0, B=0; (c) not canceling G234 before returning to 3-axis work — G49 is required. Validation: probe a known sphere center at multiple A/B angles — TCPC accuracy is verified when the sphere center XYZ coordinates match within 0.002 inch across all tested orientations.",
    category: "programming",
    tags: ["haas","umc","g234","tcpc","5-axis","pivot-distance","settings-276-281","tcp","setup","crash-prevention"],
    confidence: 95,
    source: "controller:haas_umc_5axis_setup_guide",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-193",
    title: "Haas DWO G254/G255 Dynamic Work Offsets — 5-axis 3+2 indexing workflow",
    body: "Dynamic Work Offsets (DWO) allow a 5-axis Haas to use a single work offset (e.g., G54) regardless of where the part is positioned on the rotary table, eliminating the need to re-probe after table rotation. G254 enables DWO, G255 cancels it. Workflow: (1) Set G54 with part touching spindle in the A=0, B=0 position; (2) Before each indexed operation: position rotary axes to desired angle, then output G254; (3) The control transforms G54 into the tilted coordinate system automatically; (4) After operation: G255 to cancel DWO before next rotary move; (5) G53 Z retract before any rotary positioning. Post processor property useTiltedWorkplane=true in the Haas Fusion post outputs G254/G255 automatically. Critical: never rotate the table while G254 is active — this causes workplane drift and incorrect cuts. DWO requires the machine rotary kinematics to be correctly calibrated in the machine builder parameters (same parameters as TCPC Settings 276-281).",
    category: "programming",
    tags: ["haas","ngc","dwo","g254","g255","dynamic-work-offset","5-axis","indexing","3plus2","workplane"],
    confidence: 94,
    source: "controller:haas_ngc_5axis_programming",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-194",
    title: "Haas Visual Quick Code (VQC) — conversational programming from the machine front panel",
    body: "Visual Quick Code (VQC) is Haas NGC's built-in conversational programming system, accessible from the Edit screen. VQC guides operators through feature programming using graphical forms — no G-code knowledge required. Supported VQC operations: drill patterns (bolt circle, grid, single hole), milling (rectangular pocket, circular pocket, frame, face), threading, boring, and probing. Workflow: (1) Enter EDIT mode on controller; (2) Select VQC from the softkey menu; (3) Choose feature type from graphical menu; (4) Fill in dimensional form (diameter, depth, locations, feedrates); (5) VQC generates G-code and appends to the current program. Key distinction from G150 pocket milling: VQC generates visible G-code that can be inspected and edited. VQC programs run on any Haas NGC controller — they produce standard G-code output (G81, G83, G84, G12, G13, G150 etc). Best use: prototype programming, fixturing, and setup operations when CAM is not available. Limitations: VQC does not support complex contours or 3D surfacing — use CAM for those.",
    category: "programming",
    tags: ["haas","ngc","vqc","visual-quick-code","conversational","programming","no-cam","front-panel","feature-based"],
    confidence: 90,
    source: "controller:haas_ngc_operator_manual",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-195",
    title: "Haas G84.2 peck rigid tapping — software version requirement and deep tap strategy",
    body: "G84.2 (peck rigid tapping with chip breaking) was introduced in Haas NGC software version 100.23.000.1201. Before this version, peck tapping required manual macro programming with G84 + M97 recursive calls. G84.2 syntax: G84.2 X<x> Y<y> Z<depth> R<retract> Q<peck_increment> F<pitch>. Q is the peck depth in current units — the cycle drills Q deep, retracts partially to break chips, then continues. This is distinct from G83 full-retract peck drilling. Use case at JM Die: deep tapped holes in D2 and M2 tool steel (L/D > 3) prone to tap breakage from chip packing. Recommended Q = 0.5x tap diameter for most materials; use Q = 0.3x for tough materials. Always verify SW version before using G84.2: check Settings > Software Versions; SW version must be 100.23.000.1201 or higher. Post-processor note: the Fusion haas next generation.cps property usePeckTapping=true enables G84.2 output when the SW version requirement is met.",
    category: "programming",
    tags: ["haas","ngc","g84.2","peck-tapping","deep-tapping","chip-breaking","sw-100.23","tool-steel","d2","m2"],
    confidence: 93,
    source: "controller:haas_ngc_release_notes_100.23",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-196",
    title: "Haas G154 P1-P99 extended work offsets — pallet and tombstone programming",
    body: "Beyond the 6 standard work offsets G54-G59, Haas NGC provides 99 additional work offsets via G154 P1 through G154 P99. These are stored in the same offset table as G54 (G154 P1 = G54 through G154 P6 = G59). G154 P7 through G154 P99 are exclusively accessed via G154. Practical applications: (1) Multi-pallet HMC tombstone with one offset per face (up to 99 faces); (2) Fixture plates with multiple part nests each requiring independent zeroing; (3) Lights-out family-of-parts programs with different part origins per station. Example: G154 P10 (select offset 10). To set via MDI: G154 P10 to activate, then use the standard coordinate system setup procedure. To set offset in program: G10 L2 P10 X<x> Y<y> Z<z> (G10 L2 sets work offset table, P10 = G154 P10 offset number). All 99 offsets support rotation and scaling sub-modifiers when enabled. Limitation: unlike Fanuc G54.1 which goes up to P300, Haas is capped at P99.",
    category: "programming",
    tags: ["haas","ngc","g154","extended-work-offsets","pallet","tombstone","multi-part","automation","lights-out"],
    confidence: 95,
    source: "controller:haas_ngc_programming_manual",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-197",
    title: "Haas M138/M139 Spindle Speed Variation — chatter suppression without hardware",
    body: "Spindle Speed Variation (SSV) on Haas NGC machines is activated with M138 and cancelled with M139. SSV continuously varies the spindle speed by a programmable percentage at a programmable frequency, preventing resonant chatter harmonics from building up. Settings: Setting 165 (SSV Variation) = speed variation in percent (typical 1-5%); Setting 166 (SSV Period) = variation cycle period in tenths of seconds. Programming syntax: M138 (SSV on) — the control then varies spindle speed by ±Setting_165% at the rate set by Setting_166. Effective for: thin-wall milling, long-reach boring, slender end mills, and any operation prone to regenerative chatter. Limitations: SSV is NOT a substitute for proper chatter analysis — use it after confirming the stability lobe diagram places the spindle speed near a stable region. SSV works best when the chatter frequency is well above the variation frequency. For JM Die: particularly useful when finish milling D2 tool steel die pockets with long-reach tooling where spindle speed adjustments would otherwise require manual intervention.",
    category: "programming",
    tags: ["haas","ngc","m138","m139","ssv","spindle-speed-variation","chatter","thin-wall","vibration","setting-165","setting-166"],
    confidence: 91,
    source: "controller:haas_ngc_settings_guide",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-198",
    title: "Haas G150 general pocket milling — mandatory pre-drill and subprogram boundary format",
    body: "G150 is Haas NGC's built-in general-purpose pocket milling cycle that replaces a CAM-generated roughing toolpath with a compact G-code call. The pocket boundary is defined in a separate O-number subprogram using standard G01/G02/G03 moves. Critical rules for G150: (1) ALWAYS pre-drill or helical-enter to full pocket depth before calling G150 — the cycle has no entry strategy and will plunge straight through material if no entry hole exists; (2) Position the tool at the entry hole center at pocket depth before G150; (3) Subprogram must start at a point ON the pocket boundary (not inside it) and end with M99; (4) Include D (cutter compensation register) — G150 uses tool radius from the D register, not from T offset. G150 parameter summary: P=subprogram number, D=cutter comp register, I=stepover, J=overlap, K=Z step per pass, L=finish passes, Q=start offset, F=feedrate. Practical use at JM Die: G150 is used for simple rectangular and circular die pocket roughing when running modified programs directly at the control without reposting from HyperMILL. Combine with G41/G42 cutter comp for accurate pocket sizing on finish passes.",
    category: "programming",
    tags: ["haas","ngc","g150","pocket-milling","pre-drill","subprogram","boundary","conversational","cutter-comp","jm-die"],
    confidence: 94,
    source: "controller:haas_ngc_programming_manual",
    created_at: "2026-04-15",
    usage_count: 0
  },

  // ============================================================================
  // BROTHER CNC-C00 / SPEEDIO TIPS (ctrl-199+)
  // Sourced from brother.cps + brother speedio.cps (Autodesk Fusion, rev 44207, 2025-12-17)
  // ============================================================================
  {
    id: "ctrl-199",
    title: "Brother G77/G78 pitch-based tapping — 30+ taps per minute",
    body: "Brother CNC-C00 (Speedio) uses G77 for right-hand rigid tapping and G78 for left-hand rigid tapping. Unlike Fanuc G84 which requires F = pitch × RPM, Brother G77/G78 accept F = pitch directly (e.g., F1.25 for M8×1.25). This eliminates feedrate math errors and enables faster CAM programming. Critical feature: the L word programs the withdraw spindle speed — set L to twice the cutting speed (capped at 6000 RPM) to retract the tap at double speed, reducing cycle time by 30-40% per hole. Example: S3000 G77 Z-15.0 R2.0 F1.25 L6000. The Fusion post property doubleTapWithdrawSpeed auto-outputs L = min(S×2, 6000). On compact Speedio drilling centers this enables 30+ taps per minute — critical for high-volume fastener hole patterns.",
    category: "programming",
    tags: ["brother","cnc-c00","speedio","g77","g78","tapping","high-speed","pitch","withdraw-speed"],
    confidence: 95,
    source: "controller:brother_cps_rev44207",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-200",
    title: "Brother Speedio compact machine advantages for drilling-intensive parts",
    body: "Brother Speedio (S/W/R/U series) are table-type high-speed drilling and tapping centers optimized for small-to-medium prismatic parts with many holes. Key advantages over conventional VMCs: (1) 0.9-second chip-to-chip tool change (vs 3-6s on standard VMCs) — critical when a part has 50+ tool changes, (2) Tool preload: ATC begins staging next tool during current cut with zero added time, (3) High rapid traverse 50-60 m/min reduces air-cutting time, (4) Compact footprint (1.5-2.0 m² floor space) allows cell-based automation, (5) Spindle speeds up to 16,000 RPM standard (some models 25,000 RPM) for small-diameter tooling. Best applications: automotive brackets, connector housings, die sets with drilling/tapping patterns, aluminum extrusion machining. Rule of thumb: if a part requires >20 unique tools and >100 tapped holes, a Brother Speedio will often outperform a full-size VMC on cycle time.",
    category: "process",
    tags: ["brother","speedio","compact-machine","drilling","tapping","cycle-time","atc","tool-change"],
    confidence: 92,
    source: "controller:brother_speedio_capabilities",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-201",
    title: "Brother High Accuracy Mode A/B/M298 — 6 smoothing levels for contour vs drilling",
    body: "Brother CNC-C00 provides High Accuracy Mode in three variants: Mode A (standard — default for most Speedio), Mode B (enhanced — some models), and M298 (code-based — older/specific models). Within each mode, 6 smoothing levels apply: Level 0 (standard), Level 1 (roughing — fastest, relaxed tolerance), Level 2 (medium rough), Level 3 (medium rough high), Level 4 (finishing), Level 5 (finishing high — tightest, slowest). The Fusion post Speedio uses automatic level selection based on stock tolerance: stock >0.5 mm → roughing (level 2), stock <0.05 mm → finishing (level 5). For drilling/tapping operations do NOT activate high accuracy mode — it adds unnecessary deceleration. Only enable for contouring passes. To set in G-code (Mode A): output the appropriate level code at the start of each contour operation and cancel with level OFF before returning to drilling.",
    category: "programming",
    tags: ["brother","cnc-c00","speedio","high-accuracy","smoothing","m298","mode-a","mode-b","contour","finishing"],
    confidence: 90,
    source: "controller:brother_cps_rev44207",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-202",
    title: "Brother Machining Load Monitor M341/M342/M343 — automatic tool breakage detection",
    body: "Brother Speedio (CNC-C00) supports a Machining Load Monitor that checks spindle and axis servo loads in real time: M341 — full monitor ON (detects both max overload and min underload / tool breakage), M342 — max overload only (stops on excessive load — tool collision or wrong feedrate), M343 — min underload only (stops when load drops below threshold — indicates broken tap or drill). M340 cancels monitoring. Programming pattern: output M341 before critical tapping cycles to catch both tap breakage and collisions. Use M342 alone for rough milling where slight underload is normal. Use M343 alone for tapping arrays where you only need to catch broken taps. The load thresholds are set in the Brother parameter menu (Machining Load Monitor settings). This feature is distinct from the post property useMachiningLoadMonitor in the Speedio Fusion post — set to '341', '342', or '343' to auto-output the appropriate M-code for each operation type.",
    category: "programming",
    tags: ["brother","speedio","cnc-c00","m341","m342","m343","load-monitor","tool-breakage","safety","tapping"],
    confidence: 91,
    source: "controller:brother_speedio_cps_rev44207",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-203",
    title: "Brother through-tool coolant M494/M495 and extended WCS G54.1 P1-P300",
    body: "Brother Speedio uses two through-tool coolant code sets: M88/M89 for basic through-spindle coolant, and M494/M495 for the higher-pressure Speedio spindle-coolant option (available on machines with the optional through-spindle coolant package — verify machine spec). For flood+through-tool combined: output M08 and M494 in sequence; cancel with M09 and M495. Always use through-tool coolant when tapping deeper than 2× diameter — dramatically reduces tap wear and breakage. For WCS: Brother CNC-C00 supports G54-G59 (6 standard offsets) plus G54.1 P1 through G54.1 P300 (300 extended offsets). Extended offsets are essential for pallet fixtures and tombstone setups. The Fusion Speedio post defines both ranges in its wcsDefinitions. When programming multi-part tombstones, assign G54.1 P1-Pn for each fixture face — allows one program to machine all faces without operator intervention between setups.",
    category: "programming",
    tags: ["brother","speedio","cnc-c00","m494","m495","through-tool-coolant","g54.1","work-offsets","pallet","tombstone"],
    confidence: 90,
    source: "controller:brother_speedio_cps_rev44207",
    created_at: "2026-04-15",
    usage_count: 0
  },

  // MITSUBISHI CONTROLLER INTELLIGENCE TIPS (ctrl-204+)
  // Sources: mitsubishi.cps (HSMWorks 2026, rev 44812), mitsubishi turning.cps (Fusion 360, rev 44193),
  //          Mitsubishi M800/M80/M70 operator and programming manuals, JM Die shop floor experience
  {
    id: "ctrl-204",
    title: "Mitsubishi SSS Control II: activation, tolerance, and look-ahead tuning",
    body: "SSS Control II (Super Smooth Surface) is Mitsubishi's high-speed contouring mode available on M800 and M80 series. Activate with G05 P10000 (high-speed ON) and deactivate with G05 P0. On the older M70, use G05 P1/P0 instead. SSS II does three things simultaneously: (1) increases the look-ahead buffer to 540 blocks (M800) or 400 blocks (M80) to pre-read curves ahead of the tool, (2) converts short line segments from CAM output into internal spline curves for smoother axis motion, and (3) adjusts acceleration/deceleration profiles to match the tolerance corridor. The tolerance corridor is set via machine parameter — typical die/mold work uses 0.002-0.005mm. Tighter tolerances reduce feed rate but improve surface finish. For JM Die EDM electrode graphite machining, a tolerance of 0.003mm with G05 P10000 active gives Ra 0.8 surface without manual polishing. Always cancel with G05 P0 before rigid tapping cycles and before G28 home moves, as SSS II can interfere with synchronized-axis motion.",
    category: "programming",
    tags: ["mitsubishi","m800","m80","sss-control-ii","super-smooth-surface","g05","high-speed","look-ahead","surface-finish","die-mold"],
    confidence: 92,
    source: "controller:mitsubishi_m800_sss_manual",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-205",
    title: "Mitsubishi M70 vs M80 vs M800: key hardware and software capability differences",
    body: "Mitsubishi Electric offers three tiers of CNC control: M70 (entry/mid), M80 (mid-range), M800 (flagship). Key differences by category: LOOK-AHEAD: M70=200 blocks, M80=400 blocks, M800=540 blocks. MAX BLOCK RATE: M70~1000 blk/sec, M80~1700 blk/sec, M800~2400 blk/sec. SSS CONTROL II: M70 not available (uses basic G05), M80 standard, M800 standard plus spline interpolation. OMR-DD: M70 not available, M80 optional, M800 standard. AXES: M70 up to 4+1, M80 up to 6+2, M800 up to 8. 5-AXIS TCP/RTCP: M70 limited (no full RTCP), M80 with option, M800 full RTCP standard. NURBS INTERPOLATION: M70 no, M80 with option, M800 standard. PROGRAM NUMBERS: all use O-word programs; M80/M800 support 8-digit program numbers (O00000001) while M70 uses 4-digit (O0001-O9999). WORK OFFSETS: all support G54.1 P1-P300 extended offsets. For JM Die's Mitsubishi sinker EDMs and wire EDM, the M70V variant is used — it shares the M70 hardware but includes EDM-specific macro cycles for power settings, wire threading, and surface finish conditions.",
    category: "programming",
    tags: ["mitsubishi","m70","m80","m800","comparison","features","look-ahead","sss","omr-dd","rtcp","capability"],
    confidence: 91,
    source: "controller:mitsubishi_product_lineup_guide",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-206",
    title: "Mitsubishi turning G-code list types 2-7: feed mode and spindle speed limit differences",
    body: "Mitsubishi turning controllers support multiple G-code dialect 'list types' (2 through 7) that change the meaning of key feed and spindle codes. This is selected in CAM post processors as a property. CRITICAL DIFFERENCE: Lists 2, 4, 6 use G98=feed per minute and G99=feed per revolution (Fanuc-style). Lists 3, 5, 7 use G94=feed per minute and G95=feed per revolution (Siemens/ISO-style). The spindle speed limiter code also changes: List 2/4/6 uses G50 Sxxx (max RPM), while List 3/5/7 uses G92 Sxxx. If you output a List 2 program to a List 3 machine: G98 becomes meaningless and the feed mode defaults wrong, causing either a crash (if metric and IPM conflict) or oversized parts (feed too slow). In Autodesk Fusion 360, the Mitsubishi turning post has a 'Type' property defaulting to '3'. JM Die's Mitsubishi lathes use Type 3 — verify before running programs from other shops or when switching posts. Always check the opening block: List 3 should show 'G90 G95 G18' in the header, List 2 shows 'G98 G18'.",
    category: "programming",
    tags: ["mitsubishi","turning","lathe","g-code-list","g94","g95","g98","g99","feed-mode","post-processor","compatibility"],
    confidence: 93,
    source: "controller:mitsubishi_turning_cps_rev44193",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-207",
    title: "Mitsubishi OMR-DD (Optimum Machine Response Direct Drive): setup and surface finish impact",
    body: "OMR-DD (Optimum Machine Response - Direct Drive) is Mitsubishi's servo feedforward control system that reduces servo following error during direction changes. On M800 it works in conjunction with SSS Control II. OMR-DD continuously measures servo following error and applies a predictive correction signal to reduce position lag. Practical impact: at 2000mm/min corner approach speed, a conventional servo may have 5-8 microns of following error causing a slight convex bulge at corners; with OMR-DD this reduces to 1-2 microns. For die and mold machining where corner radii define part fit, this matters. Setup: OMR-DD is enabled/disabled at machine parameter level (not via G-code). The M850W adds OMR-FF (Feed Forward) which extends OMR-DD to 5-axis simultaneous motion — the W-suffix models (M800W, M850W) indicate the additional 5-axis servo optimization hardware is installed. To verify OMR-DD is active: jog to display axis servo status screen; the feedforward percentage should show >80% on X, Y, Z axes. If it shows 0%, OMR-DD parameter is not set. Contact Mitsubishi service — this is not a field-adjustable parameter on most machine builder configs.",
    category: "programming",
    tags: ["mitsubishi","m800","m850w","omr-dd","omr-ff","servo","feedforward","following-error","5-axis","surface-finish","die-mold"],
    confidence: 88,
    source: "controller:mitsubishi_m800_servo_guide",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-208",
    title: "Mitsubishi rigid tapping ,R1 syntax and program number reservation ranges",
    body: "Mitsubishi rigid tapping uses a unique syntax: append ',R1' directly to the G84 or G74 block (e.g., 'G84 Z-20.000 R5.000 F1.500,R1'). The ,R1 flag activates rigid tapping mode which synchronizes the spindle encoder directly to the Z-axis servo — no pre-command M29 is needed (unlike Fanuc). ,R0 enables floating-tap mode (using a tension/compression tap holder). For pitch-based feedrate in rigid mode, program F as the thread pitch in mm/rev (e.g., M6x1.0 thread = F1.0); the control computes the actual feed from spindle RPM automatically. Floating tap mode programs F as pitch x RPM. PROGRAM NUMBER RANGES: M80/M800 use 8-digit program numbers. Reserved ranges to avoid: O00008000-O00009999 are reserved by Mitsubishi for machine builder use (tool builder macros). O00001000-O00007999 are user-programmable. On 4-digit systems (M70): O8000-O9999 are reserved. Using reserved numbers will not prevent the program from running but may conflict with existing machine builder cycles and cause unexpected behavior. For JM Die's Mitsubishi wire EDM, program numbers O00001000+ are used for customer programs, with O00000001-O00000999 reserved for on-machine wire threading and condition macros.",
    category: "programming",
    tags: ["mitsubishi","m800","m80","m70","rigid-tapping","g84","r1","program-numbers","wire-edm","jm-die"],
    confidence: 90,
    source: "controller:mitsubishi_m800_programming_manual",
    created_at: "2026-04-15",
    usage_count: 0
  },

  // ============================================================================
  // SIEMENS SINUMERIK 840D / ONE TIPS (ctrl-159 through ctrl-168)
  // Sourced from siemens-840d.cps + siemens sinumerik one.cps
  // (Autodesk Fusion 360 post rev 44207, 2025-12-17) and Siemens 840D programming manual
  // ============================================================================
  {
    id: "ctrl-159",
    title: "Siemens 840D TRAORI — enabling 5-axis simultaneous TCP and tool vector output",
    body: "On Siemens 840D/840D sl, TRAORI activates the real-time tool-center-point (RTCP) transformation for simultaneous 5-axis machining. Once active, G1 moves automatically compensate rotary axis motion to hold the programmed tool-tip position. Tool orientation is written as A3= B3= C3= (IJK unit vector) on every G1 block — the post outputs these on every line of a 5-axis section. Critical: always call FGROUP(X,Y,Z,A,B) before TRAORI to define which axes are in the interpolation feed group; omitting FGROUP can cause unintended axis grouping. Cancel TCP with TRAFOOF before repositioning in machine coordinates, before tool change, and before running CYCLE800. The post logic: setTCP(true) outputs TRAORI; setTCP(false) outputs TRAFOOF. On SINUMERIK ONE, TRAORI also supports tool-tip following in the ACC (Advanced Surface Control) mode for sub-micron path accuracy on complex 5-axis surfaces.",
    category: "programming",
    tags: ["siemens","840d","sinumerik","traori","trafoof","5-axis","tcp","rtcp","a3","b3","c3","fgroup"],
    confidence: 95,
    source: "controller:siemens_840d_cps_rev44207",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-160",
    title: "Siemens 840D TRAFOOF — safely cancelling 5-axis TCP transformation",
    body: "TRAFOOF is the mandatory cancel command for TRAORI. Fail to call it and subsequent machine movements still apply the TCP transformation, causing position errors or alarms when trying to move in machine coordinates (G53/SUPA). Required cancellation points: (1) before any CYCLE800 tilted-workplane call, (2) before tool change M6, (3) before retract in machine coordinates, (4) at program end. The Fusion 840D post calls TRAFOOF inside onMoveToSafeRetractPosition() after writing the Z retract. A common 840D alarm after adding 5-axis features is '21610 Transformation not possible' — this almost always means TRAORI is still active when the program executes a machine-coordinate move. Debugging tip: check that TRAFOOF appears after the last simultaneous 5-axis section and before the next G53/SUPA line.",
    category: "programming",
    tags: ["siemens","840d","trafoof","traori","cancel","5-axis","alarm-21610","tcp","retract"],
    confidence: 94,
    source: "controller:siemens_840d_cps_rev44207",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-161",
    title: "Siemens 840D CYCLE800 swivel data record — setup and common pitfalls",
    body: "CYCLE800 (tilted working plane) requires a Swivel Data Record (SDR) pre-configured in the machine. The SDR is stored in machine data SD 42940 through SD 42970 and defines the kinematic geometry of the rotary axes. In the post, cycle800SwivelDataRecord property sets the TC parameter (e.g., TC=\"SWIVEL1\"). The TC string MUST exactly match the SDR name on the machine including case. If TC does not match, the control throws alarm '61102 Swivel data block not available'. MODE parameter (default 27=CBA/ZYX Euler) controls the rotation sequence. For a standard A/C table: MODE=27, A=tilt angle, C=rotation angle. Retract mode FR: 0=no retract, 1=retract Z only (standard), 2=retract Z then XY (safest for tombstones). Cancel CYCLE800 with CYCLE800() at program end to ensure the machine returns to flat G54 for the next job.",
    category: "programming",
    tags: ["siemens","840d","cycle800","swivel-data-record","tilted-workplane","3+2","kinematics","sd42940","alarm-61102"],
    confidence: 93,
    source: "controller:siemens_840d_cps_rev44207",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-162",
    title: "Siemens 840D CYCLE832 smoothing levels and 6-digit technology code",
    body: "CYCLE832 is the Siemens High Speed Cutting (HSC) function. Syntax: CYCLE832(tolerance, TECHNO) where TECHNO is a 6-digit code — '11200' prefix plus a level digit: 112001=roughing, 112002=semi-roughing, 112003=finishing. Higher numbers mean more aggressive smoothing. Tolerance sets the maximum allowable contour deviation in mm — typical values: roughing 0.05-0.2 mm, finishing 0.005-0.02 mm. The Fusion post auto-selects level based on operation stock: >= 0.2 mm stock goes to roughing (3), <= 0.05 mm to finishing (1), middle range to semi (2). Cancel with CYCLE832() before tool change. Do NOT change smoothing levels mid-cut without cancelling first. For best 840D surface finish: CYCLE832(0.005, 112001) combined with small block tolerance and 500-block look-ahead. Older 840D controls (pre-2011) may only accept the 3-argument form: CYCLE832(tol, level, 1).",
    category: "programming",
    tags: ["siemens","840d","cycle832","hsc","smoothing","tolerance","look-ahead","finishing","techno-code","surface-finish"],
    confidence: 96,
    source: "controller:siemens_840d_cps_rev44207",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-163",
    title: "Siemens 840D COMPCAD — collision and component protection in simultaneous 5-axis",
    body: "COMPCAD (COMPonent CAD protection) is the Siemens 840D collision avoidance system for simultaneous 5-axis machining. Activated via machine data and optional PLC logic, COMPCAD monitors the tool envelope, spindle nose, and fixture geometry in real-time during TRAORI-active movements. Setup requirements: (1) COMPCAD license must be enabled on the NCK, (2) 3D STL models of machine components must be loaded in machine data, (3) Tool geometry (length, diameter, shank) must be set in the tool table. If a collision is predicted, the control decelerates and stops axes before impact. Programming note: COMPCAD protection radius can be queried with system variable $AN_COMPRESS_BUFFER. Operators sometimes disable COMPCAD for speed — never do this on unfamiliar 5-axis programs. Re-enable via MD $MC_COLLISION_MASK after any service reset.",
    category: "safety",
    tags: ["siemens","840d","compcad","collision-avoidance","5-axis","safety","traori","kinematic-model","stl"],
    confidence: 88,
    source: "controller:siemens_840d_sinumerik_manual",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-164",
    title: "Siemens 840D FFWON / FFWOF — feed-forward control for contour accuracy",
    body: "FFWON activates feed-forward control on position servo loops; FFWOF deactivates it. Feed-forward eliminates the position lag (following error) at high feedrates, dramatically improving contour accuracy on corners and curves. On the 840D, velocity feed-forward (FFWON FTYPE=1) pre-compensates for axis inertia. Acceleration feed-forward (FFWON FTYPE=2) also compensates during acc/dec phases. When to use: FFWON before high-speed HSC sections; FFWOF for slow-feed precision boring or probing where overshoot is a concern. Note: CYCLE832 activates feed-forward internally — calling FFWON explicitly may conflict; follow machine builder guidance. Key machine data: MD 32400 VELO_FFW_WEIGHT (velocity FF weighting, 0.0-1.0), MD 32420 ACC_FFW_WEIGHT. These are set during commissioning — do not change without ballbar testing before and after.",
    category: "programming",
    tags: ["siemens","840d","ffwon","ffwof","feed-forward","contour-accuracy","hsc","following-error","md32400"],
    confidence: 87,
    source: "controller:siemens_840d_sinumerik_manual",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-165",
    title: "Siemens 840D PROC / ENDPROC — structured subroutine programming with typed parameters",
    body: "840D subroutines use PROC and ENDPROC keywords to define named procedures with typed parameter passing. Syntax: PROC MySubr(REAL _X, INT _N, STRING[32] _NAME) at the top of the .spf file. Parameters are passed by value; use VAR keyword for pass-by-reference. Return to caller with RET (continue program execution) or M17 (end of subroutine file). Example: PROC DRILL_PATTERN(REAL _X0, REAL _Y0, INT _COUNT) begins a parameterized drill pattern subroutine. Inside the procedure use parameter names directly with no # syntax. Global variables use the $ prefix (machine data) or _A_ prefix (cross-program persistent variables). Benefits over Fanuc Macro B: (1) readable named parameters, (2) local variable scope, (3) STRING and ARRAY types, (4) CASE/DEFAULT branching. ShopMill programs compile to PROC-based .spf files internally. Recursive PROC calls are supported up to the nesting depth limit (typically 16).",
    category: "programming",
    tags: ["siemens","840d","proc","endproc","subroutine","spf","parameters","structured-programming","m17","ret"],
    confidence: 91,
    source: "controller:siemens_840d_sinumerik_manual",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-166",
    title: "Siemens 840D extended work offsets G505-G599 and TRANS/ATRANS frame programming",
    body: "Beyond standard G54-G57 (4 absolute frames), Siemens 840D supports G505-G599 for 95 additional zero offsets — essential for pallet systems and tombstones. Post file wcsDefinitions maps: Standard G54-G57, Extended G505-G599. Call extended offsets directly: G505; selects offset 505. For programmable zero shifts: TRANS X50 Y25 shifts the WCS by X50 Y25; TRANS alone cancels. ATRANS adds to the current frame rather than replacing it. ROT A=90 rotates the coordinate system 90 degrees around X; AROT for additive rotation. SCALE X=2 doubles part size in X. Frames are additive in the chain: G54 -> CYCLE800 tilted plane -> TRANS -> ATRANS -> AROT -> geometry. Always cancel programmable frames at program end: TRANS; ROT; SCALE; to reset to the base WCS.",
    category: "programming",
    tags: ["siemens","840d","g505","g599","extended-wcs","trans","atrans","rot","arot","scale","frames","pallet","tombstone"],
    confidence: 92,
    source: "controller:siemens_840d_cps_rev44207",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-167",
    title: "Siemens 840D SUPA — super retract that overrides all active coordinate frames",
    body: "SUPA is the Siemens 840D super-positioning G-code: it overrides ALL active frames including G53 (machine coordinates), work offsets, CYCLE800 tilted planes, TRANS/ROT shifts, and tool length compensation D. This makes SUPA the safest retract for programs that use complex frame stacking. The Fusion 840D post offers SUPA as one of four retract method options (property safePositionMethod). When SUPA is selected the post outputs SUPA G0 Z<home> using _ZHOME, _XHOME, _YHOME variables defined by the machine builder. SUPA is especially important after CYCLE800 — if CYCLE800 is not cancelled and you retract with G53 alone, the G53 move is interpreted in the last active (tilted) plane. SUPA bypasses all frames unconditionally. Downside: SUPA moves are always in machine coordinates, so the programmer must ensure the machine Z home is above all fixtures before using _ZHOME.",
    category: "programming",
    tags: ["siemens","840d","supa","retract","frame-override","cycle800","zhome","safe-retract","coordinate-frames"],
    confidence: 93,
    source: "controller:siemens_840d_cps_rev44207",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-168",
    title: "Siemens ShopMill and ShopTurn — graphical programming layer on top of 840D G-code",
    body: "ShopMill and ShopTurn are Siemens graphical conversational programming interfaces on the SINUMERIK Operate HMI. ShopMill targets milling machining centers; ShopTurn targets turning centers. Key characteristics: (1) Programs created graphically with form-based inputs — no G-code knowledge required for basic operations, (2) ShopMill internally generates PROC-based .mpf and .spf NC files which can be edited as G-code if needed, (3) The graphical representation updates in real-time as parameters change, (4) ShopMill available cycles: drilling CYCLE81-CYCLE89, milling pockets and contours, thread milling, engraving, probing, (5) ShopTurn adds: turning, grooving, threading CYCLE99, parting. Integration: CAM-generated G-code programs run on ShopMill machines without modification. Best practice: use ShopMill for setup-intensive first-article work; use CAM post output for production runs where toolpath optimization matters. ShopMill is standard on all 840D sl and SINUMERIK ONE controllers.",
    category: "programming",
    tags: ["siemens","840d","shopmill","shopturn","sinumerik-operate","conversational","graphical-programming","hmi","proc","cycles"],
    confidence: 89,
    source: "controller:siemens_sinumerik_operate_manual",
    created_at: "2026-04-15",
    usage_count: 0
  },

  // ============================================================================
  // HURCO WINMAX 5-AXIS DEEP KNOWLEDGE (ctrl-209 through ctrl-220)
  // Sourced from "Building a Hurco 5-Axis Post Processor" by Michael Cope, 2012
  // and "Tool Vector Drill Cycle and New G08.2 ASR Command" technical note
  // ============================================================================
  {
    id: "ctrl-209",
    title: "Hurco WinMax M31 — rotary axis encoder reset prevents unwinding",
    body: "M31 resets the rotary axis encoder to the current machine position. CRITICAL for 5-axis: without M31 at program start, rotary axes can 'unwind' when commanded to return to zero degrees. Example: if the A-axis physically sits at 0 degrees but the encoder accumulated 3600 degrees during prior work, commanding A0 without M31 first causes the axis to spin 10 full rotations. Always output M31 in the program header immediately after the program number before any positioning. Best practice: include M31 after every tool change and before program end (M30). The Hurco post template should output: %\\n:0001\\nM31 (Rotary Axes Encoder Reset)",
    category: "programming",
    tags: ["hurco","winmax","m31","encoder-reset","rotary-axis","5-axis","unwinding","program-header"],
    confidence: 95,
    source: "controller:cope_hurco_5axis_post_notes_2012",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-210",
    title: "Hurco WinMax 5-axis safety line — NO G17/G18/G19 plane designation",
    body: "DO NOT call G17, G18, or G19 plane designations in the safety line when programming 5-axis on WinMax. Using plane codes causes problems with Transform Planes (G68.2) and 5-axis simultaneous motion. The correct WinMax 5-axis safety line is: G0 G20 G40 G80 G54 G90 (no plane code). G40 cancels cutter comp, G80 cancels canned cycles, G54 sets WCS, G90 sets absolute mode. If your CAM post outputs G17 in the safety line for 5-axis work, modify the post to suppress it. The control defaults to G17 but Transform Planes override this internally.",
    category: "programming",
    tags: ["hurco","winmax","5-axis","safety-line","g17","g18","g19","g68.2","transform-plane"],
    confidence: 95,
    source: "controller:cope_hurco_5axis_post_notes_2012",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-211",
    title: "Hurco WinMax M140 — retract along current tool vector to machine limits",
    body: "M140 commands the tool to retract along the current tool vector to the machine limit position. This is the safest retract for 5-axis when the tool is tilted — using G53 Z0 alone would move vertically which could crash into the part. M140 calculates the tool vector from the active rotary position and retracts in that direction. For a specified distance instead of machine limits, add L parameter: M140 L3.0 retracts 3 inches along the tool vector. Always use G0 M140 (not G1 M140) for rapid retract. Sequence for 5-axis tool change: M129 (cancel TCPM), G0 M140, G53 Z0, G53 A0 C0, M30.",
    category: "programming",
    tags: ["hurco","winmax","m140","retract","tool-vector","5-axis","safe-retract","machine-limits"],
    confidence: 95,
    source: "controller:cope_hurco_5axis_post_notes_2012",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-212",
    title: "Hurco WinMax G53 Z0 vs G91 G28 Z0 — machine coordinate retract",
    body: "For Z-axis retract to home position, G53 Z0 (machine coordinate system) is recommended over G91 G28 Z0. If using G91 G28 Z0, the post MUST output G90 immediately after to return the control to absolute mode — failure to do this leaves the control in incremental mode causing subsequent positioning errors. G53 Z0 is cleaner: it goes directly to machine Z home without changing modes. For full 5-axis retract sequence after simultaneous machining: M129 (cancel TCPM), G0 M140 (retract along tool vector), G53 Z0 (machine Z home), G53 A0 C0 (rotary home).",
    category: "programming",
    tags: ["hurco","winmax","g53","g28","g91","g90","retract","machine-coordinates","5-axis"],
    confidence: 94,
    source: "controller:cope_hurco_5axis_post_notes_2012",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-213",
    title: "Hurco WinMax G68.2 — transform plane enables TCPM and does NOT command movement",
    body: "G68.2 is the Transform Plane command for 3+2 machining. Key behaviors: (1) G68.2 automatically enables Tool Center Point Management (TCPM) — no separate M128 needed. (2) G68.2 does NOT command any machine movement — rotary axis commands must be output on a separate line or use G08.2 ASR. (3) XYZ values in G68.2 reposition the WCS origin relative to original part zero. (4) G69 cancels the Transform Plane. Syntax: G68.2 X0 Y0 Z0 A-45 C225 sets a plane tilted -45 around A and 225 around C, with origin at part zero. The rotary angles use ISO standard conventions: front/right positive, back/left negative, CCW around Z positive.",
    category: "programming",
    tags: ["hurco","winmax","g68.2","transform-plane","tcpm","3+2","g69","tilted-workplane","5-axis"],
    confidence: 95,
    source: "controller:cope_hurco_5axis_post_notes_2012",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-214",
    title: "Hurco WinMax G68.2 stacking — multiple transform planes require separate G69 cancels",
    body: "Transform planes (G68.2) can be stacked on WinMax — each additional G68.2 is relative to the previous workplane. However, each stacked plane requires a separate G69 to cancel. Cancellation is LIFO (last-in-first-out): the last G68.2 called is cancelled first. Example: G68.2 A-90, G68.2 B30 creates a compound tilt. G69 cancels the B30 plane, another G69 cancels the A-90 plane. If you call only one G69 after two stacked planes, the first plane remains active causing positioning errors. Best practice: count G68.2 calls and ensure equal G69 cancels.",
    category: "programming",
    tags: ["hurco","winmax","g68.2","g69","stacking","transform-plane","lifo","multiple-planes","5-axis"],
    confidence: 93,
    source: "controller:cope_hurco_5axis_post_notes_2012",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-215",
    title: "Hurco WinMax IJK tool vectors — 6 decimal places required, unitless, non-modal",
    body: "IJK tool vector tokens for 5-axis simultaneous motion have critical requirements: (1) Output to 6 DECIMAL PLACES — 4 decimal places is insufficient and causes erratic movement or poor surface finishes. (2) IJK tokens are UNITLESS — they should remain unchanged when switching between inch and metric. Test by posting a process in both units; the IJK values must match exactly. (3) IJK tokens are NON-MODAL — they must be output on EVERY G1 line during simultaneous 5-axis motion. Example: G01 X-0.7471 Z3.0627 I-0.4877059 J-0.4906040 K0.7221154 F200.",
    category: "programming",
    tags: ["hurco","winmax","ijk","tool-vector","5-axis","decimal-places","unitless","non-modal","simultaneous"],
    confidence: 95,
    source: "controller:cope_hurco_5axis_post_notes_2012",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-216",
    title: "Hurco WinMax G8.2 ASR — automatic safe repositioning with single-line syntax",
    body: "G8.2 (also written G08.2) is Automatic Safe Repositioning. The new single-line syntax: G08.2 X_Y_Z_ [I_J_K_ or A_B_C_] [L_] [D_]. X_Y_Z_ is target position. I_J_K_ is target tool vector (cannot use with A_B_C_). A_B_C_ is target rotary angles. L_ is optional retract distance (defaults to machine limits). D_ is linearization override: D0=off, D1=on, default uses current G43.4 mode. ASR automatically retracts, reorients, repositions, then plunges to the target — finding the optimized path without overtravel. Prefer IJK vectors over ABC angles on G8.2 to avoid offset issues when the tilting axis has an applied offset.",
    category: "programming",
    tags: ["hurco","winmax","g8.2","g08.2","asr","automatic-safe-repositioning","5-axis","reposition","tool-vector"],
    confidence: 95,
    source: "controller:cope_hurco_tvcc_asr_technical_note",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-217",
    title: "Hurco WinMax G43.4 — toolpath linearization eliminates gouging on 5-axis moves",
    body: "G43.4 activates Toolpath Linearization, which is essential for quality 5-axis simultaneous machining. Without linearization: only the start and end points of a move are controlled — whatever happens in between is a 'blind rotation' that can gouge the workpiece or create looped line segments. With linearization: the tool-tip 'attaches itself to the workpiece' and the Z-axis moves with the rotary rotation to create a true linear movement between start and end points. Always activate G43.4 after M128 (TCPM) and before 5-axis cutting moves. The combination M128 + G43.4 gives full 5-axis TCP with linearized interpolation.",
    category: "programming",
    tags: ["hurco","winmax","g43.4","toolpath-linearization","5-axis","gouging","tcpm","simultaneous"],
    confidence: 95,
    source: "controller:cope_hurco_5axis_post_notes_2012",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-218",
    title: "Hurco WinMax TVCC — tool vector canned cycles without transform plane",
    body: "Tool Vector Canned Cycles (TVCC) execute canned cycles along the current tool vector at a 3D point without requiring a full Transform Plane (G68.2). Use G08.2 to re-orient the tool, then the canned cycle with TVCC syntax. Format: G__ X_Y_Z_ I_ R_ where I_ is incremental hole depth along (inverse of) tool vector (positive to drill into part), R_ is incremental retract distance along tool vector. TVCC requirements: (1) MUST be in G90 absolute mode, (2) does NOT use G98/G99 retract modes, (3) is NON-MODAL — XYZ position and I depth must be specified for each hole. Example: G84 X0Y0Z0 I10. Q5 R5 F100 S1000 (rigid tap 10mm depth, 5mm peck, 5mm retract above hole).",
    category: "programming",
    tags: ["hurco","winmax","tvcc","tool-vector-canned-cycle","g08.2","drilling","tapping","5-axis","3+2"],
    confidence: 94,
    source: "controller:cope_hurco_tvcc_asr_technical_note",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-219",
    title: "Hurco WinMax TVCC restrictions — G76, G87, G88 with I_J_ parameter not supported",
    body: "Tool Vector Canned Cycles (TVCC) support most drilling and tapping cycles but have restrictions: (1) G76 Bore Orient when programmed with I_J_ parameter — NOT supported (I_J_ specifies orient direction relative to coordinate system, conflicts with TVCC tool vector), (2) G87 Back Boring when programmed with I_J_ parameter — NOT supported, (3) G88 Boring with Manual Feed Out — NOT supported (operator intervention incompatible with tool vector mode). All other cycles work: G81 drill, G82 spot drill, G83 peck drill, G73 high-speed peck, G84 tap, G85 ream. For operations requiring G76/G87/G88 at an angle, use G68.2 Transform Plane instead of TVCC.",
    category: "programming",
    tags: ["hurco","winmax","tvcc","restrictions","g76","g87","g88","boring","5-axis","limitations"],
    confidence: 93,
    source: "controller:cope_hurco_tvcc_asr_technical_note",
    created_at: "2026-04-15",
    usage_count: 0
  },
  {
    id: "ctrl-220",
    title: "Hurco WinMax rotary axis settings — ISO Standard YES, Tilt Axis Preference NEGATIVE",
    body: "Recommended rotary axis parameter settings for 5-axis WinMax machines: ISO Standard = YES, Tilt Axis Preference = NEGATIVE. To access: AUXILIARY button > UTILITY SCREEN > USER PREFERENCES > MORE > ROTARY AXES PARAMETERS. ISO Standard YES means rotation angles in G68.2 follow ISO conventions: front/right rotations positive, back/left negative, CCW around Z positive. Tilt Axis Preference NEGATIVE means when multiple rotary solutions exist, the control prefers the negative angle. Non-ISO rotation settings will cause G68.2 angles to behave opposite from CAM post output. Always verify these settings match your post processor assumptions when setting up a new 5-axis machine.",
    category: "programming",
    tags: ["hurco","winmax","rotary-parameters","iso-standard","tilt-axis","5-axis","machine-settings","g68.2"],
    confidence: 92,
    source: "controller:cope_hurco_5axis_post_notes_2012",
    created_at: "2026-04-15",
    usage_count: 0
  },

  // ============================================================================
  // JM DIE REAL-WORLD PROGRAM PATTERNS (ctrl-225 through ctrl-245)
  // Extracted from actual JM Die CNC programs on H:/PRISM/JM DIE/
  // Covers: Okuma lathe/Multus, Haas mill, Mitsubishi Wire EDM
  // ============================================================================
  {
    id: "ctrl-225",
    title: "JM Die Okuma lathe program structure — NAT subroutines with bar feeder loop",
    body: "JM Die's Okuma lathe programs (LB15II, LB15II-M, Captain L370) follow a consistent structure: (1) Header: $<name>.MIN% with M1 optional stop, (2) Bar feeder loop: NBAR, CLEAR, DEF WORK, PS LC statements, DRAW, /CALL OBAR for bar feed macro, (3) Named tool subroutines: NAT01, NAT03, NAT05, NAT07, etc. with descriptive comments like (OD RGH. TURN .032R) or (CENTER DRILL), (4) Tool call: T010101, T030303 (6-digit Okuma format TTHHDD), (5) Safe position between tools: G0 X20 Z20, (6) Program end: last NAT subroutine returns to tool T121212 or similar, followed by M2. The /CALL OBAR line calls the shop's bar feeder macro for automated part loading. CRITICAL: never modify the NBAR/OBAR structure without understanding the bar feeder integration.",
    category: "programming",
    tags: ["jm-die","okuma","osp","lathe","nat-subroutine","bar-feeder","program-structure","lb15ii","captain-l370"],
    confidence: 98,
    source: "shop:jm_die_cnc_lathe_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-226",
    title: "JM Die Okuma G85/G87 canned roughing and finishing — pattern turning cycles",
    body: "JM Die Okuma programs use G85 and G87 for pattern roughing/finishing. G85 canned rough turn: G85 NTURN D.1 U.01 W.005 F.009 where NTURN is a named profile, D = depth of cut, U = X stock, W = Z stock, F = feed. The profile is defined with G81: NTURN G81 followed by the profile geometry. G87 finish: G87 NTURN replays the NTURN profile at finish dimensions. Example pattern: G0 X1.439 Z.03, G1 Z0 F.003, G1 X1.579 A135 (45-degree chamfer), G1 Z-3.99 F.005, G1 X1.8 F.02, G80 (end profile). A-word specifies angle (A135 = 135-degree lead angle = 45-degree chamfer). Stock removal: typical U.01 W.005 leaves 0.010 radial, 0.005 axial for finish pass.",
    category: "programming",
    tags: ["jm-die","okuma","osp","g85","g87","canned-roughing","pattern-turning","profile","stock-removal"],
    confidence: 97,
    source: "shop:jm_die_cnc_lathe_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-227",
    title: "JM Die Okuma G74 peck drilling on lathe — deep hole drilling cycle",
    body: "JM Die uses Okuma G74 for peck drilling on lathes: G74 X0 Z-1.72 D.5 L.5 F.002. Parameters: X = center position (always 0 for axial holes), Z = final depth (negative into part), D = peck depth increment, L = retract amount per peck, F = feed rate. The D parameter is critical for chip breaking in deep holes. Typical values: D.5 (0.5 inch peck) for softer materials, D.15 (0.15 inch peck) for hardened steels like M2/D2 tool steel. G74 with large D values is faster than G83-style full retract pecking. Always precede with center drill (NAT03) using G97 S300 constant RPM to protect the center drill.",
    category: "programming",
    tags: ["jm-die","okuma","osp","g74","peck-drilling","deep-hole","lathe","chip-breaking","center-drill"],
    confidence: 96,
    source: "shop:jm_die_cnc_lathe_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-228",
    title: "JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning",
    body: "JM Die lathe programs use G96 (CSS) and G97 (constant RPM) strategically: G96 S200-250 M3 for OD roughing (CSS prevents overloading at small diameters), G97 S300-600 M3 for drilling and boring (constant RPM for predictable chip load), G50 S600-800 as max RPM clamp (prevents spindle runaway at small diameters with CSS). Pattern: start with G50 S600 (set max), G97 S600 M3 (constant RPM for facing), then switch to G96 S200 for turning passes. For boring bars (NAT07, NAT09): always use G97 to prevent chatter from speed variations. Tool steel work (M2, D2, S7): reduce to G96 S150-180 for hardened materials above 45 HRC.",
    category: "programming",
    tags: ["jm-die","okuma","osp","g96","g97","css","constant-surface-speed","rpm-clamp","g50","tool-steel"],
    confidence: 97,
    source: "shop:jm_die_cnc_lathe_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-229",
    title: "JM Die Haas mill program header — standard safety line and tool documentation",
    body: "JM Die Haas VF-2/VF-3 programs follow this header structure: (1) % start, (2) O-number with part name: O32471 (1563247_YCP_000 OP1), (3) Last run date: (LAST RUN ON 1-31-19), (4) Date/time stamp: (DATE - 28-01-19 TIME - 22:20), (5) Tool list with descriptions: (T3 | 1-1/4 INSERT ENDMILL), (T1 | 7/8 INSERTED ENDMILL), etc., (6) Safety line: G20 G00 G17 G40 G49 G80 G90. The tool list comments are CRITICAL for setup — they define tool assignments that must match the physical setup sheet. Always verify tool comments match actual tooling before running. The date comments track program history for tribal knowledge.",
    category: "programming",
    tags: ["jm-die","haas","ngc","program-header","safety-line","tool-list","vf-2","vf-3","setup-documentation"],
    confidence: 98,
    source: "shop:jm_die_cnc_mill_haas_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-230",
    title: "JM Die Haas G99 canned cycles — retract to R-plane for multiple hole operations",
    body: "JM Die Haas mill programs use G99 (retract to R-plane) mode for efficient multi-hole drilling: G99 G81 Z-.05 R.1 F3.5 (spot drill), G99 G83 Z-.4375 R.1 Q.1 F1.8 (peck drill with Q peck depth). G99 keeps the tool at R-plane between holes instead of retracting to initial Z (G98), saving cycle time. Typical R-plane: 0.1 inch above workpiece. The Q parameter in G83 sets peck depth — JM Die typically uses Q.05 to Q.15 depending on hole depth and material. After all holes: G80 to cancel canned cycle, then G91 G28 Z0. M9 to retract and turn off coolant.",
    category: "programming",
    tags: ["jm-die","haas","ngc","g99","canned-cycles","g81","g83","peck-drill","r-plane","hole-operations"],
    confidence: 97,
    source: "shop:jm_die_cnc_mill_haas_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-231",
    title: "JM Die Haas tool change sequence — M06 with G43 height offset",
    body: "JM Die Haas tool changes follow this pattern: (1) M05 to stop spindle, (2) G91 G28 Z0. M9 to retract Z and coolant off, (3) M01 optional stop for inspection, (4) T# M06 to change tool (e.g., T3 M06), (5) G00 G90 G54 X_Y_ S_ M03 to position XY and start spindle, (6) G43 H## Z_ to apply tool length offset and approach Z, (7) M08 to turn coolant on. The H-number should match tool number (H03 for T3) unless tool library is configured differently. CRITICAL: never omit G43 — running without tool length comp crashes the tool into the workpiece. The M01 between tools allows operator to verify setup.",
    category: "programming",
    tags: ["jm-die","haas","ngc","tool-change","m06","g43","height-offset","m01","sequence"],
    confidence: 98,
    source: "shop:jm_die_cnc_mill_haas_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-232",
    title: "JM Die Haas G42/G40 cutter compensation — 2D profiling with automatic radius adjustment",
    body: "JM Die Haas programs use G42/G41 for profiled cuts: G42 D01 X0. F20. (cutter comp right with D01 diameter offset), then profile moves, then G40 X2.2967 (cancel comp with lead-out move). CRITICAL: G42/G40 must be cancelled with a linear move (G00 or G01), not on an arc (G02/G03). D-number references tool diameter offset table — D01 for T01, etc. The approach move (G42 D01 X0.) must start from outside the profile by at least the cutter radius. JM Die typically uses 0.5-inch lead-in/lead-out distances. For stepped walls: G42/G40 applies to each Z-level separately with new entry/exit moves.",
    category: "programming",
    tags: ["jm-die","haas","ngc","g42","g41","g40","cutter-compensation","profiling","d-offset","lead-in"],
    confidence: 96,
    source: "shop:jm_die_cnc_mill_haas_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-233",
    title: "JM Die Okuma Multus B250II initialization — dual spindle mill-turn setup",
    body: "JM Die's Okuma Multus B250IIW programs have a distinct initialization block: CLEAR (clear variables), DRAW (graphics mode for simulation), V1=25.0 (part count target), G90 (absolute), G180 (polar coordinates off), M960 (custom shop macro), G126 (main spindle select). Tool turret definitions: TD=050050 M323 specifies turret position and spindle mode. The dual spindle control uses G136 (main spindle coordinate system), G140/G141 (sub spindle systems). Work offsets use G15 H01 combined with G20 HP=1 (workpiece plane 1) or HP=4 for sub spindle side. Part counter logic: IF [VWKCC[1] GE VWKCS[24]] N0118 branches when count reaches target.",
    category: "programming",
    tags: ["jm-die","okuma","multus","b250ii","mill-turn","dual-spindle","initialization","g126","g136","g140"],
    confidence: 97,
    source: "shop:jm_die_cnc_okuma_multus_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-234",
    title: "JM Die Okuma Multus subspindle operations — grab, pull, cutoff sequence",
    body: "JM Die Multus subspindle bar pull sequence: (1) M247 (sub chuck interlock release on), M185 (main chuck interlock release on), (2) M249 (unclamp sub chuck), G4 F1. (dwell), (3) G97 S400 M4 M151 (sub spindle on, sync rotation), (4) M51 (clean out chips), M289/M288 (auxiliary functions), (5) G0 W0. then G1 W-0.86 F25. (approach and grab part with W-axis), (6) M248 (clamp sub chuck), G4 F0.5, (7) M84 (unclamp main chuck), (8) G1 W0.49 F25. (bar pull distance), (9) M83 (clamp main chuck). After part is transferred: cutoff with TD=120054, then M150 (sync rotation off), G0 W100. (sub retract). The W-axis values are critical and part-specific.",
    category: "programming",
    tags: ["jm-die","okuma","multus","subspindle","bar-pull","m247","m248","m249","synchronized-rotation","cutoff"],
    confidence: 96,
    source: "shop:jm_die_cnc_okuma_multus_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-235",
    title: "JM Die Okuma Multus part counter — automated batch production control",
    body: "JM Die Multus programs use Okuma's common variable system for part counting: V1=25.0 sets target quantity at program start, VWKCC[1]=[VWKCC[1]+1] increments counter after each part, IF [VWKCC[1] GE VWKCS[24]] N0118 branches to end when count reached. Alternative syntax: V2=[V2+1], IF [V2 GE V1] N0118, GOTO NSTRT loops back to start. The NSTRT label at program beginning enables the loop. N0118 section contains: V2=0 (reset counter), M02 (program end). For overnight runs: set V1 to batch quantity, ensure bar stock is sufficient, verify chip conveyor and coolant levels. VWKCC array persists across power cycles — manually reset if needed via MDI.",
    category: "programming",
    tags: ["jm-die","okuma","multus","part-counter","common-variables","vwkcc","batch-production","automation","loop"],
    confidence: 95,
    source: "shop:jm_die_cnc_okuma_multus_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-236",
    title: "Mitsubishi Wire EDM program structure — multi-pass with offset variables",
    body: "JM Die Mitsubishi wire EDM programs follow this structure: (1) % start, L001 (program number), date comment, (2) Offset variables: H175 = 0.0000 (master offset for fine tuning), H1 = .0085 + H175, H2 = .0064 + H175, H3 = .0058 + H175, H4 = .0053 + H175 (decreasing offsets for 4 passes), (3) Setup: G90, M91 (adaptive control off), G92 X0 Y0 (set origin), (4) Thread wire: M20, (5) Tank fill: M78 M78, M80 (water on), M82 (wire on), M84 (power on), (6) Power settings per pass: E1221 H1 F.12 (PASS=1). The H-variable system allows fine-tuning all passes by adjusting only H175. Typical 4-pass strategy: rough cut, then 3 skim passes with decreasing offsets.",
    category: "programming",
    tags: ["jm-die","mitsubishi","wire-edm","multi-pass","offset-variables","h-variables","skim-pass","program-structure"],
    confidence: 97,
    source: "shop:jm_die_wire_edm_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-237",
    title: "Mitsubishi Wire EDM M-codes — tank, wire, power, and adaptive control",
    body: "JM Die Mitsubishi wire EDM M-code reference: M20 (thread wire through start hole), M21 (cut wire), M78 M78 (fill tank — doubled for confirmation), M58 (drain tank), M80 (dielectric water on), M81 (water off), M82 (wire feed on), M83 (wire feed off), M84 (power on), M85 (power off), M90 (adaptive control on), M91 (adaptive control off). Standard sequence at cut start: M20, M78 M78, M80, M82, M84, M90. At glue stop (M01): cut pauses for slug removal, then M78 M78, M80, M82, M84 to restart. Program end: M85 M83 M81 (all off), M21 (cut wire), M58 (drain tank), M02.",
    category: "programming",
    tags: ["jm-die","mitsubishi","wire-edm","m-codes","tank-control","wire-threading","adaptive-control","m78","m20"],
    confidence: 98,
    source: "shop:jm_die_wire_edm_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-238",
    title: "Mitsubishi Wire EDM E-codes — power settings and pass management",
    body: "JM Die Mitsubishi E-codes control EDM power: E1221 H1 F.12 (PASS=1) — E1221 is power condition code from technology database, H1 is offset variable, F.12 is wire feed rate. Each pass uses different E-code: E1221 (rough/1st pass), E1222 (2nd skim), E1223 (3rd skim), E1224 (4th/final skim). Higher E-code numbers generally have finer settings. The F-value decreases with passes: F.12 → F.24 → F.21 → F.2. Wire offset (G41/G42) applies H-variable: G42 G1 X-.20265 Y.117 uses current H offset. Direction alternates: odd passes use G42 (right), even passes use G41 (left) for consistent corner quality.",
    category: "programming",
    tags: ["jm-die","mitsubishi","wire-edm","e-codes","power-settings","skim-pass","g41","g42","wire-offset"],
    confidence: 96,
    source: "shop:jm_die_wire_edm_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-239",
    title: "Mitsubishi Wire EDM glue stop — slug retention for complex profiles",
    body: "JM Die wire EDM programs use M01 (glue stop) to pause cutting before completing a profile, allowing the operator to glue slugs in place before they fall. Pattern: cut 90% of profile, M01 (Glue Stop), operator applies adhesive/magnets, M78 M78 M80 M82 M84 to restart, complete profile, G40 to exit. Essential for: internal cutouts where falling slug damages finish, thin or delicate slugs that could tilt and short the wire, parts requiring slug inspection before removal. The 4-5 line restart sequence after M01 (tank fill, water, wire, power) is required because machine stops all functions during glue stop.",
    category: "programming",
    tags: ["jm-die","mitsubishi","wire-edm","m01","glue-stop","slug-retention","internal-cutout","operator-pause"],
    confidence: 95,
    source: "shop:jm_die_wire_edm_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-240",
    title: "JM Die tool numbering convention — operation-based assignment",
    body: "JM Die uses consistent tool numbering across machines: NAT01/T01 = OD finish turning (usually .015R insert), NAT03/T03 = center drill, NAT05/T05 = primary drill, NAT06/T06 = secondary drill, NAT07/T07 = boring bar (rough), NAT09/T09 = boring bar (finish), NAT11/T11 = cutoff tool, NAT12/T12 = OD rough turning (.032R insert). On mills: T1-T3 = larger inserted endmills, T4-T8 = solid endmills sized down, T9-T10 = spotdrills/drills, T11-T12 = chamfer mills. This convention allows operators to anticipate tool requirements across jobs. ALWAYS preserve numbering in program edits — changing tool numbers requires updating setup sheets shop-wide.",
    category: "programming",
    tags: ["jm-die","tool-numbering","convention","setup-sheet","nat-subroutine","operation-based","shop-standard"],
    confidence: 95,
    source: "shop:jm_die_shop_practices",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-241",
    title: "JM Die Haas G154 extended work offsets — multi-operation fixture setups",
    body: "JM Die Haas programs use G154 P# for extended work offsets beyond G54-G59. Example: G00 G90 G154 P8 X-3.319 Y-1.5296 uses offset P8 from the extended table. G154 P1 through P99 are available (depending on Haas software level). JM Die assigns P-offsets by operation or fixture position: P1-P6 mirror G54-G59, P7+ for tombstone faces or pallet positions. When setting up: probe each fixture position and store in G154 P#, then program calls the appropriate offset. Reduces setup time for repeat jobs by maintaining consistent offset assignments across fixture configurations.",
    category: "programming",
    tags: ["jm-die","haas","ngc","g154","extended-offsets","tombstone","fixture","multi-operation","pallet"],
    confidence: 94,
    source: "shop:jm_die_cnc_mill_haas_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-242",
    title: "JM Die Okuma 6-digit tool format — turret position and geometry offsets",
    body: "Okuma lathe tools use 6-digit format TTHHDD: T = turret position (01-12), HH = tool length offset (geometry), DD = tool nose radius offset (wear). Examples from JM Die: T010101 (turret 1, offset 01, wear 01), T030303 (turret 3, center drill), T121212 (turret 12, rough turn). The geometry offset (HH) sets tool nose position relative to program zero. The wear offset (DD) allows fine adjustment without modifying geometry. For boring bars: HH sets tool tip in X and Z, DD compensates for insert wear. CRITICAL: always match HH and DD numbers unless deliberately separating geometry from wear tracking.",
    category: "programming",
    tags: ["jm-die","okuma","osp","tool-format","6-digit","geometry-offset","wear-offset","turret","lathe"],
    confidence: 96,
    source: "shop:jm_die_cnc_lathe_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-243",
    title: "JM Die chamfer programming — A-word angles on Okuma lathe",
    body: "JM Die Okuma programs use the A-word for chamfer angles: G1 X1.579 A135 creates a 45-degree chamfer (135-degree lead angle). The A-angle is measured from positive X-axis: A135 = 45 deg chamfer toward Z-, A90 = vertical face, A180 = straight Z- move, A45 = 45 deg chamfer toward X+. Alternative syntax: G1 X1.503 Z-.077 with both endpoints specified (no A-word). JM Die prefers A-word for standard chamfers because it's self-documenting and automatically calculates the endpoint. For compound angles or transitions: define both X and Z explicitly. A-word only works with G01 linear interpolation, not G02/G03 arcs.",
    category: "programming",
    tags: ["jm-die","okuma","osp","chamfer","a-word","angle-programming","lead-angle","lathe","geometry"],
    confidence: 95,
    source: "shop:jm_die_cnc_lathe_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-244",
    title: "JM Die Haas arc programming — G2/G3 with I/J center offsets",
    body: "JM Die Haas mill arcs use I/J incremental center offsets: G3 X.388 Y.0537 I-.0537 J0. F15. (CCW arc, center offset from start point). I = incremental X distance from start to center, J = incremental Y distance from start to center. For full circles: start and end at same point with correct I/J. Example chamfer radius: G3 X.4417 Y0. I0. J.0537 blends a fillet. JM Die programs typically use R-word for simple radii (G3 X1.9642 Y-0.9843 R0.1925) and I/J for partial arcs where R-word ambiguity could select wrong arc. CRITICAL: I/J mode is set by G91.1 (incremental) vs G90.1 (absolute) — JM Die uses incremental (default).",
    category: "programming",
    tags: ["jm-die","haas","ngc","arc","g2","g3","ij-offset","incremental","radius","circle"],
    confidence: 96,
    source: "shop:jm_die_cnc_mill_haas_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
  {
    id: "ctrl-245",
    title: "JM Die Okuma L-word radius — arc programming shorthand",
    body: "Okuma lathe arcs use L-word for radius: G3 X.583 Z-.02 L.02 (CCW arc with 0.020 radius). The L-word is Okuma's equivalent to the R-word on other controllers. Positive L = smaller arc (<180 deg), negative L = larger arc (>180 deg). JM Die uses L-word extensively for blend radii on die profiles: transitions between straight sections, fillet radii on internal features, radius blends at the base of punches. For profiles requiring exact center point control: use I/K syntax instead (G3 X_ Z_ I_ K_). L-word is cleaner for simple known-radius features; I/K is required for full circles or specific arc geometry.",
    category: "programming",
    tags: ["jm-die","okuma","osp","l-word","radius","arc","g2","g3","lathe","profile"],
    confidence: 95,
    source: "shop:jm_die_cnc_lathe_programs",
    created_at: "2026-04-14",
    usage_count: 0
  },
];
