"""Add Haas NGC tips ctrl-189 through ctrl-198 to controller-knowledge-tips.ts"""

filepath = "H:/prism/mcp-server/src/data/controller-knowledge-tips.ts"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

ANCHOR = """  // ============================================================================
  // BROTHER CNC-C00 / SPEEDIO TIPS (ctrl-199+)"""

if ANCHOR not in content:
    print("ERROR: ANCHOR not found")
    exit(1)

NEW_TIPS = """  // ============================================================================
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
  // BROTHER CNC-C00 / SPEEDIO TIPS (ctrl-199+)"""

new_content = content.replace(ANCHOR, NEW_TIPS, 1)

if new_content == content:
    print("ERROR: replacement did not change content")
    exit(1)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(new_content)

# Verify
with open(filepath, "r", encoding="utf-8") as f:
    verify = f.read()

old_lines = len(content.split("\n"))
new_lines = len(new_content.split("\n"))
print(f"SUCCESS")
print(f"  Old file: {old_lines} lines")
print(f"  New file: {new_lines} lines")
print(f"  Lines added: {new_lines - old_lines}")
print(f"  ctrl-189 present: {chr(34) + 'ctrl-189' + chr(34) in verify}")
print(f"  ctrl-198 present: {chr(34) + 'ctrl-198' + chr(34) in verify}")
print(f"  G187 tip present: {'G187 P-level' in verify}")
print(f"  Setting 130 tip present: {'Setting 130' in verify}")
print(f"  M19 tip present: {'M19 spindle orient' in verify}")
print(f"  G234 tip present: {'G234 TCPC' in verify}")
print(f"  DWO tip present: {'G254/G255 Dynamic' in verify}")
print(f"  VQC tip present: {'Visual Quick Code' in verify}")
print(f"  G84.2 tip present: {'G84.2' in verify}")
print(f"  G154 tip present: {'G154 P1-P99' in verify}")
print(f"  M138 tip present: {'M138/M139' in verify}")
print(f"  G150 tip present: {'G150 general pocket' in verify}")
