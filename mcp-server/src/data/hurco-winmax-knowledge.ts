/**
 * Hurco WinMax Mill Knowledge Base
 *
 * Extracted from official Hurco WinMax documentation:
 * - WinMax Mill CUTTER COMPENSATION.pdf
 * - WinMax Mill RECOVERY AND RESTART.pdf
 * - 2019 MILL INTRO CLASS.pptx (Training Materials)
 *
 * Knowledge categories:
 * - Cutter compensation rules and best practices
 * - Recovery and restart procedures
 * - Training tips for programming and setup
 *
 * Generated 2026-04-15 from Hurco Resources documentation.
 */

export interface WinMaxKnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  applies_to: string[];
}

// =============================================================================
// CUTTER COMPENSATION RULES
// =============================================================================

export const WINMAX_CUTTER_COMP_RULES: WinMaxKnowledgeEntry[] = [
  {
    id: "wm-cc-001",
    category: "cutter-compensation",
    title: "Cutter Compensation Basics",
    content:
      "Cutter Compensation is set in the Milling Type field in a milling program block. " +
      "It allows you to choose the side of the contour the tool should begin cutting. " +
      "The programmed tool automatically follows the finished contour of the part when cutter compensation is selected. " +
      "Without cutter compensation, the centerline of the programmed tool follows the print line.",
    applies_to: ["hurco", "winmax", "milling", "all-contours"],
  },
  {
    id: "wm-cc-002",
    category: "cutter-compensation",
    title: "Left vs Right Compensation Offset",
    content:
      "When either right or left cutter compensation is selected, the tool is offset from the cutting path " +
      "a distance equal to the tool's radius. The tool begins cutting at the offset and moves in the selected direction. " +
      "The cutter radius equals the amount of cutter compensation offset.",
    applies_to: ["hurco", "winmax", "milling", "contour-milling"],
  },
  {
    id: "wm-cc-003",
    category: "cutter-compensation",
    title: "Climb Milling (Left) - Preferred Method",
    content:
      "Climb milling is the preferred method of cutter compensation, except when the fixturing is not rigid. " +
      "In climb milling, the tool cuts in the same direction as the feeding motion (also known as 'in-cut' or 'down milling'). " +
      "During climb milling, the spindle turns clockwise and the tool is on the left-hand side of the cut.",
    applies_to: ["hurco", "winmax", "milling", "climb-milling", "profiling"],
  },
  {
    id: "wm-cc-004",
    category: "cutter-compensation",
    title: "Climb Milling Advantages",
    content:
      "Advantages of climb milling: (1) The chip starts thick, allowing easy penetration into the part surface, " +
      "causing less tool wear and less power consumption. (2) The tool force cuts in and down on the part, helping " +
      "to hold the part in the fixture - the more rigid the fixture, the better the hold. (3) Chip removal is greater " +
      "with less re-cutting of chips or marring of the part surface. (4) Cutting fluid is more accessible to the cutting surface.",
    applies_to: ["hurco", "winmax", "milling", "climb-milling", "surface-finish"],
  },
  {
    id: "wm-cc-005",
    category: "cutter-compensation",
    title: "Conventional Milling (Right)",
    content:
      "During conventional milling, the cutting teeth move in the opposite direction to the feeding motion " +
      "(also known as 'out-cut' or 'up milling'). When using conventional milling with a clockwise spindle direction, " +
      "the tool is on the right-hand side of the cut.",
    applies_to: ["hurco", "winmax", "milling", "conventional-milling", "profiling"],
  },
  {
    id: "wm-cc-006",
    category: "cutter-compensation",
    title: "Conventional Milling Advantages",
    content:
      "Advantages of conventional milling: (1) The chip thickness starts at zero, causing less impact on the cutting teeth - " +
      "ideal for setups that are not very rigid. (2) The backlash in older machines is greatly diminished. " +
      "Use conventional milling when fixture rigidity is questionable.",
    applies_to: ["hurco", "winmax", "milling", "conventional-milling", "weak-fixture"],
  },
  {
    id: "wm-cc-007",
    category: "cutter-compensation",
    title: "Mill Contour Compensation Types",
    content:
      "For Mill Contours (Lines, Arcs, Blend Arcs, Helices, True-Type Lettering, 3D Blend Arcs): " +
      "ON - Locates the center of the tool on the programmed contour. " +
      "LEFT - Performs climb milling. RIGHT - Performs conventional milling. " +
      "PROFILE LEFT - Removes material from a contour for climb milling (allows Max Offset). " +
      "PROFILE RIGHT - Removes material from a contour for conventional milling (allows Max Offset).",
    applies_to: ["hurco", "winmax", "milling", "contour", "lines-arcs"],
  },
  {
    id: "wm-cc-008",
    category: "cutter-compensation",
    title: "Circle/Frame/Ellipse Compensation - Inside with Blend Moves",
    content:
      "For Circles, Frames, and Ellipses with Enable Blend Moves set to YES: INSIDE - The tool enters the part " +
      "inside the contour and blends into the programmed contour using a 180-degree arc. Cutter compensation is " +
      "automatically employed, and the edge of the tool remains inside the programmed contour.",
    applies_to: ["hurco", "winmax", "milling", "circle", "frame", "ellipse", "pocket"],
  },
  {
    id: "wm-cc-009",
    category: "cutter-compensation",
    title: "Circle/Frame/Ellipse Compensation - Outside with Blend Moves",
    content:
      "For Circles, Frames, and Ellipses with Enable Blend Moves set to YES: OUTSIDE - The tool enters the part " +
      "outside the programmed contour, blends into the programmed contour using a 180-degree arc, and then follows " +
      "the outside contour. Cutter compensation is automatically employed, and the edge of the tool remains outside " +
      "the programmed contour.",
    applies_to: ["hurco", "winmax", "milling", "circle", "frame", "ellipse", "outside-profile"],
  },
  {
    id: "wm-cc-010",
    category: "cutter-compensation",
    title: "Profile Inside and Outside - No Blend Moves",
    content:
      "With Enable Blend Moves set to NO: PROFILE INSIDE - The tool enters tangent to the programmed contour, " +
      "stays inside tangent to the contour, and withdraws tangent. PROFILE OUTSIDE - Same behavior but the tool " +
      "stays outside tangent to the programmed profile. The direction depends on the Milling Direction setting.",
    applies_to: ["hurco", "winmax", "milling", "profile", "tangent-entry"],
  },
  {
    id: "wm-cc-011",
    category: "cutter-compensation",
    title: "Inside Tangent and Outside Tangent",
    content:
      "INSIDE TANGENT - The tool enters the part inside and tangent to the programmed contour without blend moves. " +
      "Max Offset, Step Over (%), and Enable Blend Moves may not be used. " +
      "OUTSIDE TANGENT - Same but tool stays outside tangent. These options provide precise control for tight-tolerance work.",
    applies_to: ["hurco", "winmax", "milling", "tangent", "precision"],
  },
  {
    id: "wm-cc-012",
    category: "cutter-compensation",
    title: "Pocket Boundary and Pocket Type",
    content:
      "POCKET BOUNDARY - The tool cuts the part around the programmed boundary and avoids any programmed islands or pockets. " +
      "POCKET TYPE choices: OUTWARD - The tool begins cutting in the center region of the pocket and cuts outward to the edge " +
      "(used only for Circle and Frame data blocks without islands). INWARD - The tool cuts in from the outside of the defined " +
      "boundary, avoiding the defined islands.",
    applies_to: ["hurco", "winmax", "milling", "pocket", "island"],
  },
  {
    id: "wm-cc-013",
    category: "cutter-compensation",
    title: "Pocket Island Programming",
    content:
      "POCKET ISLAND defines islands within pockets on a part. As many islands as desired may be defined (subject to available memory), " +
      "but all must fit within the defined boundary and must allow the tool to completely define the island. " +
      "A Pocket Island cannot follow an Outward Pocket Boundary. Pocket Island data contains XY data only.",
    applies_to: ["hurco", "winmax", "milling", "pocket", "island"],
  },
  {
    id: "wm-cc-014",
    category: "cutter-compensation",
    title: "Maximum Offset for Profile Operations",
    content:
      "The Max Offset field appears when Profile Left, Profile Right, Profile Inside, or Profile Outside is selected. " +
      "Max Offset allows the cutter to start at a specific distance away from the programmed profile and move toward the " +
      "finished profile using the Step Over parameter as each pass is completed. It is typically calculated as: " +
      "radius of the largest inscribed circle minus the tool radius. Drawing the part on the graphics screen is key to " +
      "determining an optimum Maximum Offset value.",
    applies_to: ["hurco", "winmax", "milling", "profile", "roughing", "finishing"],
  },
  {
    id: "wm-cc-015",
    category: "cutter-compensation",
    title: "Max Offset Example Calculation",
    content:
      "Example: If a 0.500 inch diameter (0.25 inch radius) End Mill is used to machine a circle with a 1 inch radius, " +
      "the value for the Maximum Offset field is 0.75 inch (1.00 - 0.25 = 0.75). If the tool diameter is changed " +
      "(e.g., cutter sharpened to smaller diameter), the Maximum Offset value must be manually recalculated and " +
      "this new value programmed into Segment 0 of the Mill Contour's Start block.",
    applies_to: ["hurco", "winmax", "milling", "profile", "max-offset-calc"],
  },
  {
    id: "wm-cc-016",
    category: "cutter-compensation",
    title: "Lead In/Out Arcs - Automatic Generation",
    content:
      "Unless the Blend Offset is set to 0.0 in Milling Parameters, the system automatically creates Lead In and " +
      "Lead Out arcs for closed contours. This provides smooth tool engagement and disengagement, reducing tool wear " +
      "and improving surface finish at the start/end points of contours.",
    applies_to: ["hurco", "winmax", "milling", "lead-in", "lead-out", "surface-finish"],
  },
  {
    id: "wm-cc-017",
    category: "cutter-compensation",
    title: "Programming Sequence Affects Cut Direction",
    content:
      "The order in which segments are programmed determines the direction the tool moves from the start point. " +
      "However, setting Conventional (right) or Climb (left) in Milling Parameters overrides the direction of the " +
      "programmed path. For Mill Frames, Circles, and Ellipses, cutting direction is determined by values in Program Parameters.",
    applies_to: ["hurco", "winmax", "milling", "direction", "sequence"],
  },
  {
    id: "wm-cc-018",
    category: "cutter-compensation",
    title: "Tool Diameter in Tool Setup",
    content:
      "The Tool diameter is programmed in Tool Setup and cannot be changed in Part Programming. This ensures consistency " +
      "across all program blocks using that tool. When a tool is sharpened and its diameter changes, update the Tool Setup " +
      "and recalculate any Maximum Offset values in affected programs.",
    applies_to: ["hurco", "winmax", "tool-setup", "diameter"],
  },
];

// =============================================================================
// RECOVERY AND RESTART PROCEDURES
// =============================================================================

export const WINMAX_RECOVERY_PROCEDURES: WinMaxKnowledgeEntry[] = [
  {
    id: "wm-rec-001",
    category: "recovery-restart",
    title: "Recovery Restart Overview",
    content:
      "The Recovery Restart feature allows you to restart a part program at almost any point within the program - " +
      "typically the point at which the running program was interrupted. This is essential for recovering from " +
      "tool breakage, power interruptions, or emergency stops without scrapping the part.",
    applies_to: ["hurco", "winmax", "recovery", "restart", "crash-recovery"],
  },
  {
    id: "wm-rec-002",
    category: "recovery-restart",
    title: "Emergency Stop Recovery",
    content:
      "If the Emergency Stop button was used to stop machining, machine power must be restored before restarting " +
      "the program. Ensure all safety checks are completed and the machine is in a safe state before initiating " +
      "the recovery restart procedure.",
    applies_to: ["hurco", "winmax", "emergency-stop", "safety", "recovery"],
  },
  {
    id: "wm-rec-003",
    category: "recovery-restart",
    title: "Recovery Restart Procedure Step 1",
    content:
      "Step 1: Select the console Auto button. The Start Block default is 1, and the End Block default is the last " +
      "block of the program. Make sure you are in Auto mode before attempting to restart.",
    applies_to: ["hurco", "winmax", "recovery", "procedure", "auto-mode"],
  },
  {
    id: "wm-rec-004",
    category: "recovery-restart",
    title: "Recovery Restart Procedure Step 2",
    content:
      "Step 2: Enter the proper Start Block and, optionally, an End Block if other than the end of the program. " +
      "Identify the exact block number where the interruption occurred. You can run a subset of the program " +
      "by specifying both Start and End blocks.",
    applies_to: ["hurco", "winmax", "recovery", "procedure", "block-selection"],
  },
  {
    id: "wm-rec-005",
    category: "recovery-restart",
    title: "Recovery Restart Procedure Step 3",
    content:
      "Step 3: Select the Recovery Restart softkey. This initiates the recovery process and prepares the control " +
      "to resume execution from the specified block.",
    applies_to: ["hurco", "winmax", "recovery", "procedure", "softkey"],
  },
  {
    id: "wm-rec-006",
    category: "recovery-restart",
    title: "Recovery Restart Procedure Step 4",
    content:
      "Step 4: If the Start Block contains multiple choices for restart, prompts are displayed to select the proper " +
      "point of restart. This commonly occurs when restarting within a complex block such as a pocket cycle or " +
      "contour with multiple passes. Select the appropriate restart point carefully.",
    applies_to: ["hurco", "winmax", "recovery", "procedure", "restart-point"],
  },
  {
    id: "wm-rec-007",
    category: "recovery-restart",
    title: "Best Practice - Document Restart Point",
    content:
      "When an interruption occurs, immediately note the current block number and segment (if applicable) before " +
      "stopping the machine or hitting E-Stop. This information is displayed on screen and is critical for accurate " +
      "recovery restart. Consider adding program notes or position blocks at logical restart points in long programs.",
    applies_to: ["hurco", "winmax", "recovery", "best-practice", "documentation"],
  },
];

// =============================================================================
// TRAINING TIPS FROM 2019 MILL INTRO CLASS
// =============================================================================

export const WINMAX_TRAINING_TIPS: WinMaxKnowledgeEntry[] = [
  // Console Navigation
  {
    id: "wm-train-001",
    category: "console-navigation",
    title: "Calculator Keys - Math Functions",
    content:
      "All numerical data in the control can be entered as a math function. You can convert from Metric to Inch " +
      "as the number is entered using the calculator keys. This eliminates the need for external calculators " +
      "and reduces data entry errors.",
    applies_to: ["hurco", "winmax", "console", "data-entry", "conversion"],
  },
  {
    id: "wm-train-002",
    category: "console-navigation",
    title: "Drawing Graphics Key",
    content:
      "The Draw key displays the current program toolpath on the graphics screen. Use this frequently during " +
      "programming to verify toolpaths visually before running the program. Graphics verification prevents " +
      "crashes and identifies programming errors early.",
    applies_to: ["hurco", "winmax", "console", "graphics", "verification"],
  },
  {
    id: "wm-train-003",
    category: "console-navigation",
    title: "Menu Keys Overview",
    content:
      "Menu Keys: INPUT - Part Setup, Tool Setup, Program, Program Parameters. REVIEW - Program navigation, " +
      "insert blocks. AUXILIARY - Special screens and quick-keys. HELP - On-screen help file with context-sensitive " +
      "current content.",
    applies_to: ["hurco", "winmax", "console", "menu", "navigation"],
  },
  {
    id: "wm-train-004",
    category: "console-navigation",
    title: "Spindle and Coolant Controls",
    content:
      "Manual Function Keys: SPINDLE ON/OFF - Starts the spindle manually. TOOL CHANGER - Initiates a tool change. " +
      "COOLANT KEYS: Auto - uses tool setup setting, Primary - Flood Coolant, Secondary - Thru Spindle Coolant. " +
      "Set coolant preferences in Tool Setup for automatic activation.",
    applies_to: ["hurco", "winmax", "console", "spindle", "coolant"],
  },
  {
    id: "wm-train-005",
    category: "console-navigation",
    title: "Machine Modes",
    content:
      "Machine Modes: AUTO - Conversational or NC. INTERRUPT - Semi-Manual Mode. SINGLE BLOCK - Executes one block " +
      "with cycle start. OPTIONAL STOP - Stops at M01. MANUAL - Manual Function Setup, Tool Management. " +
      "Use Single Block mode for first article inspection and program proving.",
    applies_to: ["hurco", "winmax", "console", "modes", "operation"],
  },
  {
    id: "wm-train-006",
    category: "console-navigation",
    title: "Edit Key Navigation",
    content:
      "Edit Keys: Cursor Arrows are PREVIOUS & ADVANCE, not Left & Right. Basic Edit Keys include Insert & Delete, " +
      "Home & End, Page Up & Down. Understanding the difference between Previous/Advance and traditional arrow " +
      "behavior is crucial for efficient program editing.",
    applies_to: ["hurco", "winmax", "console", "editing", "navigation"],
  },
  {
    id: "wm-train-007",
    category: "console-navigation",
    title: "Override Pots",
    content:
      "Override Pots: AXIS FEED RATE - 0% to 150%. RAPID OVERRIDE - 0% to 100% (percentage of Program Parameter Setting). " +
      "SPINDLE OVERRIDE - 0% to 150%. Use overrides during first article runs to fine-tune feeds and speeds " +
      "without program modification.",
    applies_to: ["hurco", "winmax", "console", "override", "feeds-speeds"],
  },
  // Seven Main Screens
  {
    id: "wm-train-008",
    category: "main-screens",
    title: "Input Screen",
    content:
      "The Input Screen contains everything necessary to setup, edit, and execute the active program. Used for program " +
      "and file manipulation. Shows active program and program units. Contains familiar keys for UltiMax users " +
      "transitioning to WinMax.",
    applies_to: ["hurco", "winmax", "screen", "input", "programming"],
  },
  {
    id: "wm-train-009",
    category: "main-screens",
    title: "Program Manager Window",
    content:
      "The Program Manager Window provides visual references: SNAPSHOT - an image is stored with the program for visual " +
      "identification. DESCRIPTION - text can be entered into the description box for notes and part information. " +
      "Use snapshots to quickly identify programs in a large library.",
    applies_to: ["hurco", "winmax", "screen", "program-manager", "organization"],
  },
  {
    id: "wm-train-010",
    category: "main-screens",
    title: "Program Review Screen",
    content:
      "Program Review Screen displays: DATA BLOCKS - current blocks in the program. SUB BLOCKS - lines & arcs in each " +
      "individual block. TOOL DATA - tool used in each block. NOTES - tab for operator notes for setup. " +
      "The Review Screen works like a Table of Contents for your program.",
    applies_to: ["hurco", "winmax", "screen", "review", "blocks"],
  },
  {
    id: "wm-train-011",
    category: "main-screens",
    title: "Tool Review Screen - Setup Sheet",
    content:
      "Tool Review Screen works like a Setup Sheet. Tool numbers and descriptions are displayed. Highlighted tools " +
      "display blocks used in program. Uncheck the box to see all tools in the library. This helps operators quickly " +
      "identify required tools before starting a job.",
    applies_to: ["hurco", "winmax", "screen", "tool-review", "setup-sheet"],
  },
  {
    id: "wm-train-012",
    category: "main-screens",
    title: "Auxiliary Screen Functions",
    content:
      "Auxiliary Screen provides access to special screens and quick-access buttons for setup and programming screens. " +
      "Contains shortcuts to commonly used functions that would otherwise require multiple menu navigations.",
    applies_to: ["hurco", "winmax", "screen", "auxiliary", "shortcuts"],
  },
  {
    id: "wm-train-013",
    category: "main-screens",
    title: "Manual Screen Functions",
    content:
      "Manual Screen provides: TOOL MANAGEMENT - toolchanges and ATC map manipulation. MANUAL FUNCTION SETUP - " +
      "spindle speed, manual rapid feed, manual rapid move. OTHER FUNCTIONS - Park Machine, ATC & Machine Diagnostics, " +
      "Machine Warm-up, Machine Calibration.",
    applies_to: ["hurco", "winmax", "screen", "manual", "tool-management"],
  },
  {
    id: "wm-train-014",
    category: "main-screens",
    title: "Help Screen - Context Sensitive",
    content:
      "Help Screen is CONTENT SENSITIVE - pops up with current task-related information. SEARCHABLE - use the index tab " +
      "to search help data. CLICKABLE LINKS - all text links can be clicked for more content-related information. " +
      "Use Help frequently when learning new features.",
    applies_to: ["hurco", "winmax", "screen", "help", "documentation"],
  },
  // Part Setup
  {
    id: "wm-train-015",
    category: "part-setup",
    title: "Part Setup DRO Display",
    content:
      "Part Setup shows Machine & Part DRO - both machine and part relative information. Spindle speed and tool info " +
      "are displayed. Part Zero XY & Z actual positions are available using Absolute Tool Length. This provides " +
      "comprehensive position awareness during setup.",
    applies_to: ["hurco", "winmax", "setup", "dro", "position"],
  },
  {
    id: "wm-train-016",
    category: "part-setup",
    title: "Safety Work Region",
    content:
      "Safety Work Region is a definable region within the machining area that the tool will not violate in auto mode. " +
      "Set this to prevent tool excursions beyond the workpiece and fixtures. Critical for preventing crashes on " +
      "complex setups.",
    applies_to: ["hurco", "winmax", "setup", "safety", "work-envelope"],
  },
  {
    id: "wm-train-017",
    category: "part-setup",
    title: "XY Skew Angle",
    content:
      "XY Skew (Deg) is used to run a program skewed from zero, or not square on the table. This allows machining " +
      "parts that are not perfectly aligned to the machine axes without requiring perfect part alignment during setup.",
    applies_to: ["hurco", "winmax", "setup", "skew", "alignment"],
  },
  {
    id: "wm-train-018",
    category: "part-setup",
    title: "Stock Geometry - Box or Cylinder",
    content:
      "Enter Stock Geometry as Box or Cylinder. This makes graphics more realistic and accurate. You can manually " +
      "enter size or let the control calculate. Accurate stock geometry improves collision detection and visual " +
      "verification during programming.",
    applies_to: ["hurco", "winmax", "setup", "stock", "geometry"],
  },
  // Tool Setup
  {
    id: "wm-train-019",
    category: "tool-setup",
    title: "Speeds and Feeds Entry",
    content:
      "Enter speeds & feeds however the operator feels comfortable - RPM or SFM - the control automatically calculates " +
      "the other value. Set desired coolant condition. Select MORE to enter advanced tool settings. This flexibility " +
      "accommodates different operator preferences.",
    applies_to: ["hurco", "winmax", "tool-setup", "speeds", "feeds"],
  },
  {
    id: "wm-train-020",
    category: "tool-setup",
    title: "Advanced Tool Data",
    content:
      "Accurately describe tooling for more accurate graphics. Arrows show necessary information as fields are highlighted. " +
      "Each tool gets its own color on the graphics screen (sequential). Other tabs are selectable with Tool & Material " +
      "Library option.",
    applies_to: ["hurco", "winmax", "tool-setup", "advanced", "graphics"],
  },
  // Data Blocks
  {
    id: "wm-train-021",
    category: "programming",
    title: "Data Block Concept",
    content:
      "Every feature on the part is a separate data block. Laid out like chapters in a book - each sub-block is a " +
      "separate page. The Review Screen is like the Table of Contents. Understanding this structure is fundamental " +
      "to WinMax programming.",
    applies_to: ["hurco", "winmax", "programming", "blocks", "structure"],
  },
  {
    id: "wm-train-022",
    category: "programming",
    title: "Position Block Usage",
    content:
      "Position Block is used at the end of a program to position the table to a known location for part changeover. " +
      "Can be used like a Program Stop (M00) to flip parts, clean holes for tapping, etc. " +
      "Also used to control an index when used with a positional indexer (cannot be used for a 4th axis).",
    applies_to: ["hurco", "winmax", "programming", "position", "changeover"],
  },
  // Hole Operations
  {
    id: "wm-train-023",
    category: "hole-operations",
    title: "Hole Operations Overview",
    content:
      "Drill Operations: center drill, drill, counterbore, countersink, etc. Tap Operations: Rigid and Standard Tapping. " +
      "Bore & Ream Operations: Boring & Reaming canned cycles. Back Spotface: cuts the underside of holes. " +
      "Bolt Circle & Locations: determines hole positions. Rotary Locations: positions holes on cylinder circumference.",
    applies_to: ["hurco", "winmax", "programming", "holes", "drilling"],
  },
  {
    id: "wm-train-024",
    category: "hole-operations",
    title: "All In One Block - Holes",
    content:
      "Processes and Locations are Sub-Blocks of the same block. Do NOT separate into two separate blocks. " +
      "Keep all hole operations in a single block for efficiency and clarity. This is a common mistake for new programmers.",
    applies_to: ["hurco", "winmax", "programming", "holes", "best-practice"],
  },
  {
    id: "wm-train-025",
    category: "hole-operations",
    title: "Polar Hole Locations",
    content:
      "Polar programming uses Distance > Direction > Enter format. For example: (1.25 in) (+) (Enter) specifies " +
      "a hole location 1.25 inches in the positive direction. This is useful for holes on radial patterns.",
    applies_to: ["hurco", "winmax", "programming", "holes", "polar"],
  },
  {
    id: "wm-train-026",
    category: "hole-operations",
    title: "Bolt Circle Programming",
    content:
      "Bolt Circle is a separate hole operation just like locations. Define the start angle and the control calculates " +
      "hole positions. The starting angle (e.g., 27 degrees) determines where the first hole is placed on the circle.",
    applies_to: ["hurco", "winmax", "programming", "holes", "bolt-circle"],
  },
  // Milling Operations
  {
    id: "wm-train-027",
    category: "milling-operations",
    title: "Milling Operations Screen 1",
    content:
      "Lines and Arcs: for irregular shapes. Circle: 360-degree circular features. Frame: 4-sided rectangular features. " +
      "Face: removes material on the face of a part. Ellipse: elliptical shaped features. 3D Mold: optional software " +
      "purchase required.",
    applies_to: ["hurco", "winmax", "programming", "milling", "features"],
  },
  {
    id: "wm-train-028",
    category: "milling-operations",
    title: "Milling Operations Screen 2",
    content:
      "Thread: threadmilling for straight and tapered threads. Lettering: stick, true-type font, along contour, serial " +
      "numbering, HD3 lettering. Special: Insert Pocket (optional). Swept Surface (optional). Slot: straight and arc " +
      "shaped slots. Polygon: closed features with 3 or more sides.",
    applies_to: ["hurco", "winmax", "programming", "milling", "special"],
  },
  {
    id: "wm-train-029",
    category: "milling-operations",
    title: "Mill Circle - Milling Types",
    content:
      "Mill Circle milling types: ON, INSIDE, OUTSIDE, INSIDE TAN, OUT TAN, POCKET. Choose the appropriate type based " +
      "on whether you are cutting a hole, boss, or pocket. INSIDE TAN and OUT TAN provide tangent entry/exit for " +
      "better surface finish.",
    applies_to: ["hurco", "winmax", "programming", "circle", "milling-type"],
  },
  {
    id: "wm-train-030",
    category: "milling-operations",
    title: "Tool Too Small - Use Extra Block",
    content:
      "When the specified tool is too small for the programmed feature, insert an extra Mill Circle block BEFORE the " +
      "original block to rough out material. Alternatively, use the MAX OFFSET feature with Step Over percentage " +
      "to clear material in multiple passes.",
    applies_to: ["hurco", "winmax", "programming", "roughing", "tool-size"],
  },
  {
    id: "wm-train-031",
    category: "milling-operations",
    title: "Mill Frame Corner Definition",
    content:
      "Mill Frame is programmed by defining XY Corner, X Length, and Y Length. The control calculates the intersection " +
      "points. You can use negative lengths to define frames in any quadrant. Part Zero determines the reference corner.",
    applies_to: ["hurco", "winmax", "programming", "frame", "geometry"],
  },
  {
    id: "wm-train-032",
    category: "milling-operations",
    title: "Mill Face Directions",
    content:
      "Mill Face cutting directions: Y UNIDIRECTIONAL, Y BIDIRECTIONAL, X UNIDIRECTIONAL, X BIDIRECTIONAL. " +
      "Bidirectional is faster but may leave witness marks at direction changes. Unidirectional provides better " +
      "surface finish but takes longer.",
    applies_to: ["hurco", "winmax", "programming", "face", "direction"],
  },
  // Lines and Arcs
  {
    id: "wm-train-033",
    category: "lines-arcs",
    title: "Lines and Arcs - All In One Block",
    content:
      "The entire feature is ONE block, broken into Sub-blocks called segments. Segments are made up of Lines & Arcs. " +
      "Segment Zero (0) is the only segment with a starting point and contains all necessary information: tool, depth, " +
      "feeds & speeds, milling type, etc.",
    applies_to: ["hurco", "winmax", "programming", "contour", "segments"],
  },
  {
    id: "wm-train-034",
    category: "lines-arcs",
    title: "Segment Zero - Start Information",
    content:
      "Segment Zero (0) is the only segment with a starting point. It contains all necessary information: tool, depth, " +
      "feeds & speeds, milling type. All other segments only contain endpoint information - other fields are grayed out " +
      "and can only be changed on Segment Zero.",
    applies_to: ["hurco", "winmax", "programming", "contour", "segment-zero"],
  },
  {
    id: "wm-train-035",
    category: "lines-arcs",
    title: "Arc Direction Convention",
    content:
      "CCW (Counter-Clockwise) is a Positive Move. CW (Clockwise) is a Negative Move. Use the Hurco Compass like a " +
      "gunsight - place the cross-hairs on the originating point of the move and read the angle to determine " +
      "direction of travel.",
    applies_to: ["hurco", "winmax", "programming", "arc", "direction"],
  },
  {
    id: "wm-train-036",
    category: "lines-arcs",
    title: "Contour Too Small - Use Profile",
    content:
      "When the specified tool is too small for a contour, use Profile Left or Profile Right to correct. This enables " +
      "the Max Offset feature. Max Offset is the distance from the programmed path to the farthest corner, allowing " +
      "the tool to make multiple passes.",
    applies_to: ["hurco", "winmax", "programming", "contour", "profile"],
  },
  {
    id: "wm-train-037",
    category: "lines-arcs",
    title: "Reverse Contour",
    content:
      "To reverse the cutting direction of a contour: Highlight the contour start in the program review screen, then " +
      "select REVERSE CONTOUR. This changes climb milling to conventional or vice versa without reprogramming.",
    applies_to: ["hurco", "winmax", "programming", "contour", "direction"],
  },
  // Patterns
  {
    id: "wm-train-038",
    category: "patterns",
    title: "Loop Rectangular Pattern",
    content:
      "Loop Rectangular creates rows and columns with equal distance between each part. Program the feature once, " +
      "then apply the pattern to replicate across the workpiece. Efficient for grid-based part layouts.",
    applies_to: ["hurco", "winmax", "programming", "pattern", "rectangular"],
  },
  {
    id: "wm-train-039",
    category: "patterns",
    title: "Loop Linear Pattern",
    content:
      "Loop Linear creates equally spaced parts in a line. Angle & Distance can also be used to create angled linear " +
      "patterns. Useful for parts arranged along a straight line at any angle.",
    applies_to: ["hurco", "winmax", "programming", "pattern", "linear"],
  },
  {
    id: "wm-train-040",
    category: "patterns",
    title: "Loop Angular vs Loop Rotate",
    content:
      "Loop Angular rotates part around a point but programmed orientation does NOT change. Loop Rotate also rotates " +
      "around a point but orientation DOES change - like being swung on a string. Choose based on whether features " +
      "should maintain orientation or rotate with pattern.",
    applies_to: ["hurco", "winmax", "programming", "pattern", "rotation"],
  },
  {
    id: "wm-train-041",
    category: "patterns",
    title: "Pattern End Block Requirement",
    content:
      "A Pattern End block must accompany all pattern blocks. The pattern and pattern end must surround the programmed " +
      "blocks like parentheses in a math equation. Patterns can be nested but must have an associated Pattern End " +
      "for EVERY pattern.",
    applies_to: ["hurco", "winmax", "programming", "pattern", "structure"],
  },
  {
    id: "wm-train-042",
    category: "patterns",
    title: "Pattern Locations Adjustment",
    content:
      "Pattern Locations work like individual part setups and can be individually adjusted if necessary. Use this to " +
      "fine-tune specific instances within a pattern without affecting the entire pattern.",
    applies_to: ["hurco", "winmax", "programming", "pattern", "locations"],
  },
  {
    id: "wm-train-043",
    category: "patterns",
    title: "Pattern Scale",
    content:
      "Pattern Scale is used to scale programs up or down. Programming from the center of the part works best when " +
      "scaling. This allows creating different sizes from one master program.",
    applies_to: ["hurco", "winmax", "programming", "pattern", "scale"],
  },
  {
    id: "wm-train-044",
    category: "patterns",
    title: "Pattern Mirror Image",
    content:
      "Pattern Mirror Image mirrors programmed features. When inserted, a new field (YES/NO) to reverse the toolpath " +
      "will appear in all mirrored blocks. Think of the red line as an actual mirror. Use the angle field to position " +
      "the mirror angularly.",
    applies_to: ["hurco", "winmax", "programming", "pattern", "mirror"],
  },
  // Program Parameters
  {
    id: "wm-train-045",
    category: "program-parameters",
    title: "Program Parameters Overview",
    content:
      "Program Parameters are a global set of parameters that control different aspects of a conversational program. " +
      "Changes to default values will only affect the active program - unless saved as user defaults. Review and " +
      "adjust these for each new program.",
    applies_to: ["hurco", "winmax", "programming", "parameters", "global"],
  },
  {
    id: "wm-train-046",
    category: "program-parameters",
    title: "Retract Clearance - Change on EVERY Program",
    content:
      "Retract Clearance should be changed on EVERY program to control the tool retract distance. Rapid Traverse setting " +
      "can slow down the machine for setup or new operators. Rapid Override Pot is a percentage (0-100%) of the " +
      "Rapid Traverse setting.",
    applies_to: ["hurco", "winmax", "programming", "parameters", "retract"],
  },
  {
    id: "wm-train-047",
    category: "program-parameters",
    title: "Interrupt Cycle Z Retract",
    content:
      "Interrupt Cycle Z Retract can be set to NO to keep the tool from traveling to Z home when the interrupt button " +
      "is depressed. Move to Safe Position during toolchange is especially useful on smaller machines to prevent " +
      "collisions.",
    applies_to: ["hurco", "winmax", "programming", "parameters", "interrupt"],
  },
  {
    id: "wm-train-048",
    category: "program-parameters",
    title: "Blend Offset and Overlap",
    content:
      "Blend Offset and Blend Overlap are used frequently when using larger tools. These parameters control how the tool " +
      "engages and disengages from the material, affecting surface finish at start/stop points.",
    applies_to: ["hurco", "winmax", "programming", "parameters", "blend"],
  },
  {
    id: "wm-train-049",
    category: "program-parameters",
    title: "Stock Allowance Mode",
    content:
      "Stock Allowance Mode turns on the ALLOWANCES tab in programming blocks - which controls the amount of finish stock " +
      "left. Use this for roughing operations where you want to leave material for a finishing pass.",
    applies_to: ["hurco", "winmax", "programming", "parameters", "allowance"],
  },
  {
    id: "wm-train-050",
    category: "program-parameters",
    title: "Pocket Plunge Options",
    content:
      "Straight or Helix plunging is available for roughing and finishing operations separately (requires UltiPocket & " +
      "Helical Ramp Entry options). Operator Specify Pocket Start setting of YES creates 2 additional XY fields in all " +
      "Pocket Boundary blocks.",
    applies_to: ["hurco", "winmax", "programming", "parameters", "pocket"],
  },
  {
    id: "wm-train-051",
    category: "program-parameters",
    title: "Bore Orient Retract",
    content:
      "Bore Orient Retract: Make sure the tooltip is lined up with the short spindle key at orient before setting. " +
      "Tap Retract (%) is only available if the UltiMotion option is installed on the control.",
    applies_to: ["hurco", "winmax", "programming", "parameters", "boring"],
  },
  {
    id: "wm-train-052",
    category: "program-parameters",
    title: "Automatic Tool Monitoring",
    content:
      "Automatic Tool Monitoring (in Probing Tab) checks tools after toolchange - BEFORE the tool runs. Length & Diameter " +
      "tolerances can be set for unattended (lights-out) running of the machine. Critical for unmanned operation safety.",
    applies_to: ["hurco", "winmax", "programming", "parameters", "probing", "lights-out"],
  },
  {
    id: "wm-train-053",
    category: "program-parameters",
    title: "SFQ - Surface Finish Quality",
    content:
      "SFQ (Surface Finish Quality) replaces the older Precision, Standard, and Performance settings. Instead of three " +
      "settings, there is now a number range from 1 to 100 to control surface finish quality. Higher values = better " +
      "finish but slower machining.",
    applies_to: ["hurco", "winmax", "programming", "parameters", "surface-finish"],
  },
  {
    id: "wm-train-054",
    category: "program-parameters",
    title: "Smoothing Tolerance",
    content:
      "Smoothing Tolerance smoothes jerky straight line G-code programs by smoothing the transitions between line " +
      "endpoints by inserting arcs. This is especially useful for imported NC code with many short line segments.",
    applies_to: ["hurco", "winmax", "programming", "parameters", "smoothing"],
  },
  // Slots
  {
    id: "wm-train-055",
    category: "slots",
    title: "Slot Start Tab",
    content:
      "Slot Start Tab defines straight or arc shape and describes the centerline of the slot. For straight slots, " +
      "define the start point and direction. For arc slots, define the center and radius.",
    applies_to: ["hurco", "winmax", "programming", "slot", "start"],
  },
  {
    id: "wm-train-056",
    category: "slots",
    title: "Slot Geometry Tab",
    content:
      "Slot Geometry Tab contains endpoint data - either XY or Length Angle. The control calculates what it does not " +
      "have. Enter what you know from the print and let WinMax calculate the rest.",
    applies_to: ["hurco", "winmax", "programming", "slot", "geometry"],
  },
  {
    id: "wm-train-057",
    category: "slots",
    title: "Slot Caps - End Shape Options",
    content:
      "Slot Caps Tab determines the shape of the end-caps. Start & End can be controlled independently. Options: " +
      "LINE (flat end), APPEND ARC (adds arc beyond length), INCLUDE ARC (arc within length). Choose based on print " +
      "specifications.",
    applies_to: ["hurco", "winmax", "programming", "slot", "caps"],
  },
  // Special Tips
  {
    id: "wm-train-058",
    category: "special-tips",
    title: "Chamfer Milling Tip",
    content:
      "For chamfer milling: Add extra amount to the tip diameter and the chamfer depth. This compensates for tool " +
      "geometry and ensures the chamfer is cut to the correct size. Measure and verify on first article.",
    applies_to: ["hurco", "winmax", "programming", "chamfer", "tip"],
  },
  {
    id: "wm-train-059",
    category: "special-tips",
    title: "Using Calc-Assist for Unknown Points",
    content:
      "When XY Start Point is unknown (not on the print): Create a dummy block with a line of known length and angle. " +
      "Record the calculated endpoint data, then delete the unnecessary dummy block. This uses WinMax geometry " +
      "calculation to find intersection points.",
    applies_to: ["hurco", "winmax", "programming", "calc-assist", "geometry"],
  },
  {
    id: "wm-train-060",
    category: "special-tips",
    title: "Dummy Block for Calculations",
    content:
      "A dummy block is a block that will never be executed - no tooling, speed, or depth information required. " +
      "Enter known XY start point, program a line of known length and angle, record calculated data, then delete " +
      "the block. Useful for finding intersection points.",
    applies_to: ["hurco", "winmax", "programming", "calc-assist", "dummy-block"],
  },
  {
    id: "wm-train-061",
    category: "special-tips",
    title: "Prioritizing Tool Changes - Traditional Method",
    content:
      "Traditional method to prioritize tool changes: Copy all associated blocks, paste one complete set for each tool, " +
      "delete unnecessary tools from each set. This groups operations by tool to minimize tool changes.",
    applies_to: ["hurco", "winmax", "programming", "tool-change", "optimization"],
  },
  {
    id: "wm-train-062",
    category: "special-tips",
    title: "Tool Change Optimization Option",
    content:
      "Optional method: Tool Change Optimization - Insert ON before and OFF after blocks. Performs the same optimization " +
      "without Copy & Paste. This is an optional software feature that automatically reorders operations by tool.",
    applies_to: ["hurco", "winmax", "programming", "tool-change", "optimization"],
  },
  {
    id: "wm-train-063",
    category: "special-tips",
    title: "Stock Geometry for Graphics",
    content:
      "When moving part zero (e.g., center of part is zero), move the STOCK, not the zero. Use XYZ Reference Positions " +
      "to locate stock relative to the new zero. This keeps graphics accurate when programming from different datums.",
    applies_to: ["hurco", "winmax", "programming", "stock", "zero"],
  },
  // Threadmilling
  {
    id: "wm-train-064",
    category: "threadmilling",
    title: "Threadmilling Cutter Types",
    content:
      "Threadmilling supports Single Point Cutter and Multi-Tooth Cutter. Single point cutters are more versatile but " +
      "slower. Multi-tooth cutters are faster but limited to specific thread pitches. Choose based on production needs.",
    applies_to: ["hurco", "winmax", "programming", "threadmill", "tool"],
  },
  {
    id: "wm-train-065",
    category: "threadmilling",
    title: "Thread Tab Settings",
    content:
      "Thread Tab contains basic information about the desired thread. Tapered NPT threads can also be programmed using " +
      "Taper Angle. Specify thread pitch, diameter, and thread type (internal/external).",
    applies_to: ["hurco", "winmax", "programming", "threadmill", "settings"],
  },
  {
    id: "wm-train-066",
    category: "threadmilling",
    title: "Thread Location - Top and Bottom",
    content:
      "Thread Location Tab: Enter THREAD top and bottom - NOT Z Start and Z Bottom. The control calculates the actual " +
      "tool positions. Determine the cutting direction (climb or conventional) for the threading process.",
    applies_to: ["hurco", "winmax", "programming", "threadmill", "location"],
  },
  {
    id: "wm-train-067",
    category: "threadmilling",
    title: "Thread Process Strategy",
    content:
      "Thread Process Tab: Determine the process strategy. Radial Peck Depth = the full radial amount to be removed " +
      "divided by the desired number of pecks. Use multiple pecks for deep threads or hard materials.",
    applies_to: ["hurco", "winmax", "programming", "threadmill", "process"],
  },
  // Lettering
  {
    id: "wm-train-068",
    category: "lettering",
    title: "HD3 Lettering Positioning",
    content:
      "HD3 Lettering: X REF Position locates the first letter by START, END, or CENTER of text. Y REF Position locates " +
      "by BOTTOM, TOP, or CENTER of text. This provides flexible text positioning for different applications.",
    applies_to: ["hurco", "winmax", "programming", "lettering", "hd3"],
  },
  {
    id: "wm-train-069",
    category: "lettering",
    title: "HD3 Letter Spacing",
    content:
      "HD3 Letter spacing is controlled by the tool diameter - it is equal to 1.5 times the diameter. Example: " +
      "0.7031 inch diameter x 1.5 = 1.0546 inch spacing between letter centers. Factor this into text layout.",
    applies_to: ["hurco", "winmax", "programming", "lettering", "spacing"],
  },
  {
    id: "wm-train-070",
    category: "lettering",
    title: "True-Type Font Text Box",
    content:
      "True-Type Font: XY Ref Position is an anchor point for text box. XY Length describes height and length of the " +
      "text box. Text will fit into the box (stretched or scrunched). The font size is controlled by the text box " +
      "described, not the selection on the font format box.",
    applies_to: ["hurco", "winmax", "programming", "lettering", "true-type"],
  },
  {
    id: "wm-train-071",
    category: "lettering",
    title: "Changing True-Type Font Style",
    content:
      "To change True-Type font style: Place cursor in TEXT field, press the SELECT NEW FONT softkey. The font size " +
      "is controlled by the text box dimensions, not the font dialog selection. Many Windows fonts are available.",
    applies_to: ["hurco", "winmax", "programming", "lettering", "font"],
  },
  // Polygon
  {
    id: "wm-train-072",
    category: "polygon",
    title: "Polygon Programming",
    content:
      "Polygon programs similar to Mill Circle. Determine Polygon XY Center. Geometry size is controlled by: inscribed " +
      "circle diameter, outer circle diameter, or individual side length. Useful for hex features, squares, and other " +
      "regular polygons.",
    applies_to: ["hurco", "winmax", "programming", "polygon", "geometry"],
  },
  // Cylinder Stock
  {
    id: "wm-train-073",
    category: "cylinder-stock",
    title: "Cylinder Stock Direction",
    content:
      "Cylinder Stock Geometry graphic settings: ++X, +-X, +-Z, ++Z determine the direction the cylinder body runs away " +
      "from the ZERO surface. Set this correctly for accurate graphics when machining cylindrical stock.",
    applies_to: ["hurco", "winmax", "setup", "cylinder", "orientation"],
  },
];

// =============================================================================
// COMBINED EXPORT FOR EASY ACCESS
// =============================================================================

export const WINMAX_ALL_KNOWLEDGE: WinMaxKnowledgeEntry[] = [
  ...WINMAX_CUTTER_COMP_RULES,
  ...WINMAX_RECOVERY_PROCEDURES,
  ...WINMAX_TRAINING_TIPS,
];

/**
 * Search WinMax knowledge by keyword or category
 */
export function searchWinMaxKnowledge(
  query: string,
  category?: string
): WinMaxKnowledgeEntry[] {
  const normalizedQuery = query.toLowerCase();
  return WINMAX_ALL_KNOWLEDGE.filter((entry) => {
    const matchesCategory = !category || entry.category === category;
    const matchesQuery =
      entry.title.toLowerCase().includes(normalizedQuery) ||
      entry.content.toLowerCase().includes(normalizedQuery) ||
      entry.applies_to.some((tag) => tag.toLowerCase().includes(normalizedQuery));
    return matchesCategory && matchesQuery;
  });
}

/**
 * Get all entries for a specific category
 */
export function getWinMaxKnowledgeByCategory(
  category: string
): WinMaxKnowledgeEntry[] {
  return WINMAX_ALL_KNOWLEDGE.filter((entry) => entry.category === category);
}

/**
 * Get all unique categories
 */
export function getWinMaxCategories(): string[] {
  const categories = new Set(WINMAX_ALL_KNOWLEDGE.map((entry) => entry.category));
  return Array.from(categories).sort();
}

// Summary statistics
export const WINMAX_KNOWLEDGE_STATS = {
  totalEntries: WINMAX_ALL_KNOWLEDGE.length,
  cutterCompRules: WINMAX_CUTTER_COMP_RULES.length,
  recoveryProcedures: WINMAX_RECOVERY_PROCEDURES.length,
  trainingTips: WINMAX_TRAINING_TIPS.length,
  categories: getWinMaxCategories(),
  source: "Hurco WinMax Mill Documentation (2019-2021)",
};
