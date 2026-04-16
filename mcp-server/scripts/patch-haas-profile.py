"""Patch the haas_ngc profile in ControllerKnowledgeEngine.ts"""

filepath = "H:/prism/mcp-server/src/engines/ControllerKnowledgeEngine.ts"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# ---- MARKER for replacement ----
# We find the haas_ngc cycleDefinitions block by a unique anchor and replace the whole section

ANCHOR_START = "    cycleDefinitions: [\n      {\n        name: \"Drilling\",\n        gCode: \"G81\",\n        description: \"Basic drilling cycle\","
ANCHOR_END = "      smoothingCode: \"G187\",\n      highAccuracyCode: \"G187 P3\",\n    },"

start_idx = content.find(ANCHOR_START)
if start_idx == -1:
    print("ERROR: ANCHOR_START not found")
    exit(1)

end_idx = content.find(ANCHOR_END, start_idx)
if end_idx == -1:
    print("ERROR: ANCHOR_END not found")
    exit(1)

end_idx += len(ANCHOR_END)

old_block = content[start_idx:end_idx]
print(f"Found old block: {len(old_block.split(chr(10)))} lines, start={start_idx}, end={end_idx}")

NEW_BLOCK = """    cycleDefinitions: [
      // Drilling Cycles
      {
        name: "Drilling",
        gCode: "G81",
        description: "Basic drilling cycle — no dwell, rapid retract",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["No dwell at bottom", "Retract at rapid rate"],
      },
      {
        name: "Spot Drilling / Counterbore",
        gCode: "G82",
        description: "Spot drill or counterbore with optional dwell at bottom",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "P", description: "Dwell time in milliseconds", required: false, defaultValue: 0 },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["P dwell improves spot-drill accuracy", "Use for chamfering and counterboring"],
      },
      {
        name: "Peck Drilling",
        gCode: "G83",
        description: "Deep hole peck drilling — full retract to R each peck",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "First peck depth (positive)", required: true },
          { letter: "I", description: "Peck depth reduction per pass", required: false },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "I reduces peck depth each pass — use for stringy materials",
          "Full retract to R plane between each peck",
          "Use for L/D > 3 or gummy materials (stainless, titanium)",
        ],
      },
      {
        name: "High Speed Peck Drilling",
        gCode: "G73",
        description: "Chip-break peck drilling — partial retract only (faster than G83)",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Peck depth increment", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "Partial retract (chip break) — does NOT clear to R plane",
          "Faster than G83; use for L/D 2-4 in aluminum and cast iron",
        ],
      },
      // Tapping Cycles
      {
        name: "Rigid Tapping RH",
        gCode: "G84",
        description: "Rigid tapping cycle — right-hand thread",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "J", description: "Retract spindle speed override (optional)", required: false },
          { letter: "Q", description: "Peck depth (SW 100.23.000.1201+ only)", required: false },
          { letter: "F", description: "Pitch feedrate (RPM x pitch)", required: true },
        ],
        notes: [
          "Setting 130=0: feed in IPR/MPR (recommended — most accurate)",
          "Setting 130=1: feed in IPM/MPM (older Haas default)",
          "J word sets retract RPM — use J=2x spindle speed to speed up retract",
          "G95 mode (IPR) recommended — feedrate equals pitch value directly",
          "Q-peck parameter available from NGC SW 100.23.000.1201+",
        ],
      },
      {
        name: "Peck Rigid Tapping RH",
        gCode: "G84.2",
        description: "Peck rigid tapping — right-hand with chip breaking (SW 100.23.000.1201+)",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Peck increment depth", required: true },
          { letter: "F", description: "Pitch feedrate", required: true },
        ],
        notes: [
          "Requires NGC software version 100.23.000.1201 or newer",
          "Q sets peck increment — partial retract between pecks for chip clearing",
          "Essential for deep tapping in stainless steel and titanium",
        ],
      },
      {
        name: "Reverse Tapping LH",
        gCode: "G74",
        description: "Left-hand (reverse) tapping cycle",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "J", description: "Retract spindle speed override (optional)", required: false },
          { letter: "F", description: "Pitch feedrate", required: true },
        ],
        notes: [
          "Use for left-hand threads (reverse polarity spindle direction)",
          "Spindle must start CCW (M04) before this cycle",
        ],
      },
      // Boring Cycles
      {
        name: "Fine Boring",
        gCode: "G76",
        description: "Fine boring cycle with spindle orient and tool shift on retract",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Tool shift amount on retract", required: true },
          { letter: "P", description: "Dwell at bottom in milliseconds", required: false },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "Spindle orients at bottom before Q-shift retract — prevents drag marks",
          "Best surface finish boring cycle on Haas NGC",
          "Requires Setting 46 (G76/G87 spindle direction) to match tool geometry",
        ],
      },
      {
        name: "Boring Feed Retract",
        gCode: "G85",
        description: "Boring or reaming cycle — feedrate retract for best finish",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["Retract at feedrate — use for finish boring and reaming"],
      },
      {
        name: "Back Boring",
        gCode: "G87",
        description: "Back boring — shift and bore from below the workpiece",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane (start point below part)", required: true },
          { letter: "Q", description: "Tool shift amount for clearance", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "Spindle orients, shifts Q, rapid to R below part, spindle on, bore upward to Z",
          "Use Setting 46 to set orient direction for correct shift clearance",
        ],
      },
      // Circular Milling Cycles (Haas-specific)
      {
        name: "Circular Pocket CW",
        gCode: "G12",
        description: "Circular pocket milling — clockwise, tool at center",
        parameters: [
          { letter: "I", description: "First radius (starting step or innermost radius)", required: true },
          { letter: "J", description: "Final radius (pocket radius for straight wall)", required: false },
          { letter: "K", description: "Depth per pass (Z step)", required: true },
          { letter: "L", description: "Number of Z passes", required: false, defaultValue: 1 },
          { letter: "D", description: "Cutter compensation register", required: false },
          { letter: "Q", description: "Start angle offset", required: false },
          { letter: "P", description: "Finish passes", required: false },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "Tool MUST be positioned at pocket center XY before calling G12",
          "Machines outward from center using helical moves",
          "Use D offset for cutter compensation to hit exact diameter",
          "Haas-specific cycle — not available on other controllers",
        ],
      },
      {
        name: "Circular Pocket CCW",
        gCode: "G13",
        description: "Circular pocket milling — counterclockwise, tool at center",
        parameters: [
          { letter: "I", description: "First radius (starting step or innermost radius)", required: true },
          { letter: "J", description: "Final radius (pocket radius for straight wall)", required: false },
          { letter: "K", description: "Depth per pass (Z step)", required: true },
          { letter: "L", description: "Number of Z passes", required: false, defaultValue: 1 },
          { letter: "D", description: "Cutter compensation register", required: false },
          { letter: "Q", description: "Start angle offset", required: false },
          { letter: "P", description: "Finish passes", required: false },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "Same as G12 but counterclockwise — use for conventional milling direction",
          "Tool must be at pocket center before calling",
          "Haas-specific cycle",
        ],
      },
      {
        name: "General Pocket Milling",
        gCode: "G150",
        description: "General pocket milling — boundary defined by subprogram",
        parameters: [
          { letter: "P", description: "Subprogram number containing pocket boundary", required: true },
          { letter: "D", description: "Tool diameter offset register", required: true },
          { letter: "I", description: "Stepover per pass", required: true },
          { letter: "J", description: "Overlap amount", required: false, defaultValue: 0 },
          { letter: "K", description: "Depth per pass (Z step)", required: true },
          { letter: "L", description: "Number of finishing passes", required: false, defaultValue: 0 },
          { letter: "Q", description: "Start position offset", required: false },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "CRITICAL: G150 does NOT ramp or helical-enter — pre-drill or helical-enter required first",
          "Define pocket boundary in subprogram using G01/G02/G03 moves",
          "Haas-specific mini-CAM cycle — useful when CAM is unavailable",
          "Subprogram must end with M99",
        ],
      },
      // 5-Axis / TCPC
      {
        name: "TCPC Tool Length Comp (5-axis)",
        gCode: "G234",
        description: "Tool Center Point Control — 5-axis TCPC mode activation",
        parameters: [
          { letter: "H", description: "Tool length offset register", required: true },
        ],
        notes: [
          "Replaces G43 for 5-axis simultaneous machining on Haas UMC series",
          "Requires Settings 276-281 (rotary pivot point XYZ offsets for A and B axes)",
          "Setting 256 must be ON to enable TCPC feature",
          "Setting 33 must be set to correct tool offset measurement method",
          "Always test at low feed (F10) first — incorrect pivot distances cause crashes",
          "Cancel with G49 before returning to 3-axis operations",
        ],
      },
      // Probing
      {
        name: "Skip / Probe",
        gCode: "G31",
        description: "Skip function — motion stops when probe signal activates",
        parameters: [
          { letter: "X", description: "X target position", required: false },
          { letter: "Y", description: "Y target position", required: false },
          { letter: "Z", description: "Z target position", required: false },
          { letter: "F", description: "Probe feedrate", required: true },
        ],
        notes: [
          "Use with WIPS macro calls (G65 P9023, P9995) for automated probing",
          "Probe results stored in macro variables #140-#199 (Renishaw) or #10001-#10020 (WIPS)",
          "G103 P1 required before reading variables to prevent look-ahead issues",
        ],
      },
    ],
    mCodeMappings: [
      // Program Control
      { mCode: 0, description: "Program Stop (spindle and coolant off)", category: "special" },
      { mCode: 1, description: "Optional Stop (active when Optional Stop key on)", category: "special" },
      { mCode: 2, description: "Program End (no rewind)", category: "special" },
      { mCode: 30, description: "Program End and Rewind to top", category: "special" },
      // Spindle
      { mCode: 3, description: "Spindle On CW", category: "spindle" },
      { mCode: 4, description: "Spindle On CCW", category: "spindle" },
      { mCode: 5, description: "Spindle Stop", category: "spindle" },
      {
        mCode: 19,
        description: "Spindle Orient (P = angle in degrees, Q = direction)",
        category: "spindle",
        notes: "P0-P360 sets orient angle; Q1=CW, Q2=CCW",
      },
      // Coolant
      { mCode: 7, description: "Mist Coolant On", category: "coolant" },
      { mCode: 8, description: "Flood Coolant On", category: "coolant" },
      { mCode: 9, description: "All Coolant Off", category: "coolant" },
      {
        mCode: 88,
        description: "Through-Spindle Coolant (TSC) On",
        category: "coolant",
        notes: "P0=low, P1=normal, P2=high pressure (VFD equipped)",
      },
      { mCode: 89, description: "Through-Spindle Coolant (TSC) Off", category: "coolant" },
      { mCode: 93, description: "Air Blast On", category: "coolant" },
      // Tool Change
      { mCode: 6, description: "Tool Change (ATC)", category: "tool" },
      // Axis Clamps (4th and 5th axis)
      { mCode: 10, description: "4th Axis Brake On (clamp)", category: "special" },
      { mCode: 11, description: "4th Axis Brake Off (unclamp)", category: "special" },
      { mCode: 12, description: "5th Axis Brake On (clamp)", category: "special" },
      { mCode: 13, description: "5th Axis Brake Off (unclamp)", category: "special" },
      // Tapping
      {
        mCode: 29,
        description: "Rigid Tapping Mode Enable",
        category: "special",
        notes: "Use before G84 on Classic Haas; NGC uses G84 natively rigid",
      },
      // Subprograms
      { mCode: 97, description: "Local Subprogram Call (same file O-number)", category: "special" },
      { mCode: 98, description: "External Subprogram Call", category: "special" },
      {
        mCode: 99,
        description: "Subprogram End / Return (P = line number to jump to)",
        category: "special",
      },
      // Pallet Changer
      { mCode: 36, description: "Pallet Change (with confirmation/interlock)", category: "special" },
      { mCode: 37, description: "Pallet Change (no confirmation)", category: "special" },
      { mCode: 50, description: "Pallet Clamp", category: "special" },
      // Part Catcher (HS series)
      { mCode: 51, description: "Part Catcher On", category: "special" },
      { mCode: 52, description: "Part Catcher Off", category: "special" },
      // Chip Conveyor
      { mCode: 59, description: "Chip Conveyor Forward", category: "special" },
      { mCode: 60, description: "Chip Conveyor Reverse", category: "special" },
      { mCode: 61, description: "Chip Conveyor Stop", category: "special" },
      // Spindle Speed Variation
      {
        mCode: 138,
        description: "Spindle Speed Variation (SSV) On",
        category: "spindle",
        notes: "Reduces chatter by varying spindle speed +/-V% at W Hz",
      },
      { mCode: 139, description: "Spindle Speed Variation (SSV) Off", category: "spindle" },
      // 5-Axis Rotary Path
      {
        mCode: 126,
        description: "Shortest Rotary Path Traverse On",
        category: "special",
        notes: "Selects shorter rotary path for multi-axis positioning",
      },
      { mCode: 127, description: "Shortest Rotary Path Traverse Off", category: "special" },
      // Tool Probe Arm
      { mCode: 104, description: "Extend Tool Setting Probe Arm", category: "special" },
      { mCode: 105, description: "Retract Tool Setting Probe Arm", category: "special" },
      // Branching / Macros
      { mCode: 96, description: "Conditional Branch on Skip Signal (probe trip)", category: "special" },
      {
        mCode: 109,
        description: "Interactive User Input to Macro Variable",
        category: "special",
        notes: "Prompts operator for input stored in user-specified macro variable",
      },
      // M130 Images
      {
        mCode: 130,
        description: "Display Part or Tool Image on Operator Panel",
        category: "special",
        notes: "M130 (filename) — requires image option installed",
      },
    ],
    gCodeDialect: {
      // Basic Motion
      absoluteMode: "G90",
      incrementalMode: "G91",
      rapidMove: "G00",
      linearMove: "G01",
      cwArc: "G02",
      ccwArc: "G03",
      dwell: "G04",
      // Tool Compensation
      toolLengthComp: "G43",
      toolLengthCompTCPC: "G234",
      toolLengthCancel: "G49",
      cutterCompLeft: "G41",
      cutterCompRight: "G42",
      cutterCompCancel: "G40",
      // Work Coordinates
      workOffsetBase: "G54",
      workOffsetG55: "G55",
      workOffsetG56: "G56",
      workOffsetG57: "G57",
      workOffsetG58: "G58",
      workOffsetG59: "G59",
      extendedWorkOffsets: "G154 P1-P99",
      machineCoordinates: "G53",
      localCoordinateSystem: "G52",
      // DWO (Dynamic Work Offsets) - 5-axis tilted workplane
      dynamicWorkOffsetEnable: "G254",
      dynamicWorkOffsetCancel: "G255",
      // Coordinate Rotation and Scaling
      scalingOff: "G50",
      scalingOn: "G51",
      rotation: "G68",
      rotationCancel: "G69",
      // Polar Coordinates
      polarOn: "G16",
      polarOff: "G15",
      // Plane Selection
      xyPlane: "G17",
      xzPlane: "G18",
      yzPlane: "G19",
      // Units
      inchMode: "G20",
      metricMode: "G21",
      // Canned Cycles
      cancelCannedCycle: "G80",
      // Cycle Return Modes
      returnToInitialLevel: "G98",
      returnToRLevel: "G99",
      // Feedrate Modes
      feedPerMinute: "G94",
      feedPerRev: "G95",
      inverseTime: "G93",
      // Exact Stop
      exactStop: "G09",
      exactStopMode: "G61",
      cuttingMode: "G64",
      // Spindle
      spindleCW: "M03",
      spindleCCW: "M04",
      spindleStop: "M05",
      spindleOrient: "M19",
      // Coolant
      coolantOn: "M08",
      coolantOff: "M09",
      throughSpindleCoolantOn: "M88",
      throughSpindleCoolantOff: "M89",
      // Tool
      toolChange: "M06",
      programEnd: "M30",
      programStop: "M00",
      optionalStop: "M01",
      // Smoothing / Accuracy
      smoothingCode: "G187",
      highAccuracyCode: "G187 P3",
      roughingSmoothing: "G187 P1",
      mediumSmoothing: "G187 P2",
      finishSmoothing: "G187 P3",
      customSmoothing: "G187 Px Ey",
      // Rigid Tapping
      rigidTapCode: "M29",
      // Spindle Speed Variation
      ssvOn: "M138",
      ssvOff: "M139",
    },"""

new_content = content[:start_idx] + NEW_BLOCK + content[end_idx:]

with open(filepath, "w", encoding="utf-8") as f:
    f.write(new_content)

# Verify
with open(filepath, "r", encoding="utf-8") as f:
    verify = f.read()

old_lines = len(content.split("\n"))
new_lines_count = len(new_content.split("\n"))
print(f"SUCCESS")
print(f"  Old file lines: {old_lines}")
print(f"  New file lines: {new_lines_count}")
print(f"  Lines added: {new_lines_count - old_lines}")
print(f"  G234 present: {'G234' in verify}")
print(f"  G254 present: {'G254' in verify}")
print(f"  G84.2 present: {'G84.2' in verify}")
print(f"  ssvOn present: {'ssvOn' in verify}")
