/**
 * KnowledgeCaptureEngine — R24-MS3
 *
 * Manufacturing knowledge capture, tribal knowledge preservation,
 * best practice documentation, and lessons-learned repository.
 *
 * Actions:
 *   kc_capture       — Capture and index manufacturing knowledge
 *   kc_search        — Semantic search across knowledge base
 *   kc_best_practice — Best practice library with applicability scoring
 *   kc_lesson        — Lessons learned repository with impact tracking
 */

// ── Knowledge Entry Types ──────────────────────────────────────────────────

interface KnowledgeEntry {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  content: string;
  keywords: string[];
  contributor_id: string;
  contributor_name: string;
  created: string;
  updated: string;
  verified: boolean;
  views: number;
  usefulness_rating: number; // 1-5
  applicable_materials: string[];
  applicable_machines: string[];
  applicable_operations: string[];
}

interface BestPractice {
  id: string;
  title: string;
  domain: string;
  description: string;
  procedure_steps: string[];
  expected_outcome: string;
  metrics_impact: { metric: string; improvement_pct: number }[];
  difficulty: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  adoption_rate_pct: number;
  contributor_id: string;
  contributor_name: string;
  validated: boolean;
  applicable_to: string[];
}

interface LessonLearned {
  id: string;
  title: string;
  category: string;
  incident_date: string;
  description: string;
  root_cause: string;
  corrective_action: string;
  preventive_action: string;
  impact: { type: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; cost_usd: number };
  status: "OPEN" | "IMPLEMENTED" | "VERIFIED";
  contributor_id: string;
  contributor_name: string;
  affected_operations: string[];
}

// ── Knowledge Base ─────────────────────────────────────────────────────────

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: "KB-001", title: "Titanium Ti-6Al-4V Turning Best Setup", category: "Machining", subcategory: "CNC Turning",
    content: "When turning Ti-6Al-4V, use high-pressure coolant (70+ bar) directed at the cutting zone. Start with Vc=50-60 m/min, f=0.15-0.2 mm/rev. Use sharp inserts with positive rake and change every 15 minutes max. Reduce DOC to 1-2mm for finishing passes. Always monitor chip color — blue chips indicate excessive heat.",
    keywords: ["titanium", "turning", "coolant", "tool life", "Ti-6Al-4V"],
    contributor_id: "OP-001", contributor_name: "James Martinez",
    created: "2024-03-15", updated: "2024-11-20", verified: true, views: 342, usefulness_rating: 4.8,
    applicable_materials: ["Ti-6Al-4V", "Ti-6Al-2Sn-4Zr-2Mo"], applicable_machines: ["CNC Lathe"], applicable_operations: ["turning", "facing"],
  },
  {
    id: "KB-002", title: "5-Axis Impeller Roughing Strategy", category: "Machining", subcategory: "5-Axis Milling",
    content: "For impeller roughing on 5-axis, use plunge roughing with a bull-nose end mill (R2-R3mm corner radius). Start from hub to blade tip. Maintain constant chip load by adjusting feed in tight channels. Leave 0.5mm stock for semi-finish. Use swarf cutting for blade surfaces in semi-finish pass.",
    keywords: ["impeller", "5-axis", "roughing", "plunge", "swarf"],
    contributor_id: "OP-002", contributor_name: "Sarah Chen",
    created: "2024-05-10", updated: "2025-01-08", verified: true, views: 218, usefulness_rating: 4.6,
    applicable_materials: ["Inconel 718", "Ti-6Al-4V", "Aluminum 7075"], applicable_machines: ["CNC Mill 5-Axis"], applicable_operations: ["milling", "roughing"],
  },
  {
    id: "KB-003", title: "CMM Probe Qualification Best Practices", category: "Quality", subcategory: "CMM",
    content: "Always qualify probes at the start of each shift. Use the same qualification sphere for consistency. Qualify at the speed you intend to measure. For scanning probes, qualify at 3 different speeds. Record qualification residuals — if >0.002mm, investigate stylus seating. Replace styli showing wear patterns.",
    keywords: ["CMM", "probe", "qualification", "accuracy", "scanning"],
    contributor_id: "OP-003", contributor_name: "Robert Thompson",
    created: "2024-01-20", updated: "2024-09-15", verified: true, views: 456, usefulness_rating: 4.9,
    applicable_materials: [], applicable_machines: ["CMM"], applicable_operations: ["inspection", "measurement"],
  },
  {
    id: "KB-004", title: "Spindle Warm-up Protocol", category: "Maintenance", subcategory: "Machine Care",
    content: "Run spindle warm-up routine before any precision work: 5 min at 1000 RPM, 5 min at 5000 RPM, 5 min at 10000 RPM (if capable), then 5 min at target speed. Monitor spindle temperature with IR gun — should stabilize within 2°C of normal. Skip warm-up only if machine has been running within last 2 hours.",
    keywords: ["spindle", "warm-up", "thermal", "accuracy", "precision"],
    contributor_id: "OP-007", contributor_name: "Thomas Wilson",
    created: "2023-11-05", updated: "2024-08-20", verified: true, views: 567, usefulness_rating: 4.7,
    applicable_materials: [], applicable_machines: ["CNC Lathe", "CNC Mill 3-Axis", "CNC Mill 5-Axis"], applicable_operations: ["setup", "maintenance"],
  },
  {
    id: "KB-005", title: "Stainless Steel 316L Face Milling Strategy", category: "Machining", subcategory: "CNC Milling",
    content: "Face milling 316L: use 45° lead angle face mill, Vc=120-150 m/min, fz=0.15-0.20 mm/tooth. Always climb mill. Ensure cutter engagement >60% of diameter for smooth entry. Use flood coolant, not mist. If work hardening occurs, increase feed rather than speed. Never let tool dwell in cut.",
    keywords: ["stainless", "316L", "face milling", "work hardening", "climb milling"],
    contributor_id: "OP-001", contributor_name: "James Martinez",
    created: "2024-06-01", updated: "2025-02-10", verified: true, views: 289, usefulness_rating: 4.5,
    applicable_materials: ["SS 316L", "SS 304", "SS 316"], applicable_machines: ["CNC Mill 3-Axis", "CNC Mill 5-Axis"], applicable_operations: ["milling", "face milling"],
  },
  {
    id: "KB-006", title: "Wire EDM Skim Cut Optimization", category: "Machining", subcategory: "EDM",
    content: "For Ra<0.4µm finish on wire EDM: Use at least 3 skim cuts after rough. Reduce wire tension 20% on final skim. Use deionized water conductivity 2-5 µS. Offset compensation decreases by ~0.01mm per skim pass. Final skim should use <1A current. Flushing pressure should be reduced to minimum on last pass.",
    keywords: ["wire EDM", "skim cut", "surface finish", "deionized", "offset"],
    contributor_id: "OP-002", contributor_name: "Sarah Chen",
    created: "2024-08-15", updated: "2025-01-22", verified: true, views: 134, usefulness_rating: 4.3,
    applicable_materials: ["Tool Steel D2", "Carbide", "Inconel 718"], applicable_machines: ["Wire EDM"], applicable_operations: ["EDM", "finishing"],
  },
  {
    id: "KB-007", title: "Fixture Clamping Force Calculation Rule of Thumb", category: "Setup", subcategory: "Work Holding",
    content: "Clamping force should be 2-3x the maximum cutting force expected. For rough calculations: clamp_force_N = 3 × cutting_force_N × safety_factor(1.5). Distribute clamping evenly. Check for part deflection with dial indicator under clamp load before cutting. For thin walls (<3mm), use vacuum or wax fixturing instead.",
    keywords: ["clamping", "fixture", "force", "deflection", "thin wall"],
    contributor_id: "OP-005", contributor_name: "David Kim",
    created: "2024-04-20", updated: "2024-12-05", verified: true, views: 231, usefulness_rating: 4.4,
    applicable_materials: ["Aluminum 6061", "Aluminum 7075", "Ti-6Al-4V"], applicable_machines: ["CNC Mill 3-Axis", "CNC Mill 5-Axis", "CNC Lathe"], applicable_operations: ["setup", "fixturing"],
  },
  {
    id: "KB-008", title: "SPC Chart Interpretation Quick Guide", category: "Quality", subcategory: "SPC",
    content: "Western Electric rules for control charts: Rule 1 — any point beyond 3σ. Rule 2 — 2 of 3 consecutive points beyond 2σ same side. Rule 3 — 4 of 5 consecutive points beyond 1σ same side. Rule 4 — 8 consecutive points on same side of center. If process Cpk drops below 1.33, investigate immediately. Check for tool wear trends first.",
    keywords: ["SPC", "control chart", "Cpk", "Western Electric", "process control"],
    contributor_id: "OP-003", contributor_name: "Robert Thompson",
    created: "2024-02-10", updated: "2024-10-30", verified: true, views: 398, usefulness_rating: 4.7,
    applicable_materials: [], applicable_machines: [], applicable_operations: ["inspection", "process control"],
  },
  {
    id: "KB-009", title: "Inconel 718 Drilling with Carbide", category: "Machining", subcategory: "Drilling",
    content: "Drilling Inconel 718: Use carbide drills with TiAlN coating. Vc=15-20 m/min, f=0.05-0.08 mm/rev for holes <12mm. Peck drilling mandatory — peck depth 1-2x diameter. Internal coolant through-tool at 40+ bar. Max hole depth without gun drill: 5×D. Monitor thrust force — sudden increase means tool failure imminent.",
    keywords: ["Inconel", "drilling", "carbide", "peck", "through-coolant"],
    contributor_id: "OP-009", contributor_name: "Michael Brown",
    created: "2024-09-01", updated: "2025-03-10", verified: true, views: 176, usefulness_rating: 4.6,
    applicable_materials: ["Inconel 718", "Inconel 625", "Waspaloy"], applicable_machines: ["CNC Mill 3-Axis", "CNC Lathe"], applicable_operations: ["drilling"],
  },
  {
    id: "KB-010", title: "Thermal Compensation for Large Parts", category: "Quality", subcategory: "Metrology",
    content: "For parts >500mm, thermal effects are significant. Measure ambient temp and part temp before inspection. Apply CTE correction: ΔL = L × α × ΔT. For aluminum (α=23.1µm/m/°C), 1°C change on 500mm part = 11.5µm error. Let parts soak in CMM room for at least 4 hours per 100mm thickness. Use thermocouples on critical features.",
    keywords: ["thermal", "compensation", "CTE", "large parts", "inspection"],
    contributor_id: "OP-003", contributor_name: "Robert Thompson",
    created: "2024-07-10", updated: "2025-02-28", verified: true, views: 203, usefulness_rating: 4.8,
    applicable_materials: ["Aluminum 6061", "Aluminum 7075", "Steel 4140"], applicable_machines: ["CMM"], applicable_operations: ["inspection", "measurement"],
  },
  {
    id: "KB-011", title: "Grinding Wheel Selection for Hardened Steel", category: "Machining", subcategory: "Grinding",
    content: "For HRC 58-62 hardened tool steels: use CBN wheels for production, Al2O3 for occasional work. CBN wheel speed 30-45 m/s. Depth per pass: roughing 0.02-0.05mm, finishing 0.002-0.005mm. Dress wheel every 20 parts or when surface finish degrades. Coolant: 5% synthetic at 30+ L/min. Check for burn marks — indicates too aggressive DOC or dull wheel.",
    keywords: ["grinding", "hardened steel", "CBN", "wheel dressing", "surface finish"],
    contributor_id: "OP-009", contributor_name: "Michael Brown",
    created: "2024-10-15", updated: "2025-03-05", verified: true, views: 145, usefulness_rating: 4.5,
    applicable_materials: ["Tool Steel D2", "Tool Steel H13", "Steel 4340"], applicable_machines: ["Surface Grinder"], applicable_operations: ["grinding"],
  },
  {
    id: "KB-012", title: "Lockout/Tagout Quick Reference", category: "Safety", subcategory: "Procedures",
    content: "LOTO procedure: 1) Notify affected operators. 2) Shut down machine via normal stop. 3) Isolate all energy sources (electrical, hydraulic, pneumatic). 4) Apply personal lock and tag. 5) Verify zero energy state — try to start machine. 6) Perform maintenance. 7) Remove tools and guards. 8) Remove locks in reverse order. NEVER remove someone else's lock.",
    keywords: ["lockout", "tagout", "LOTO", "safety", "energy isolation"],
    contributor_id: "OP-007", contributor_name: "Thomas Wilson",
    created: "2023-09-01", updated: "2024-06-15", verified: true, views: 612, usefulness_rating: 4.9,
    applicable_materials: [], applicable_machines: ["CNC Lathe", "CNC Mill 3-Axis", "CNC Mill 5-Axis", "Surface Grinder", "Wire EDM"], applicable_operations: ["maintenance", "safety"],
  },
];

// ── Best Practices Library ─────────────────────────────────────────────────

const BEST_PRACTICES: BestPractice[] = [
  {
    id: "BP-001", title: "First Article Inspection Protocol", domain: "Quality",
    description: "Comprehensive first article inspection workflow for new part setups",
    procedure_steps: ["Complete full dimensional inspection of first part", "Compare all dimensions to print tolerances", "Document any deviations with photos", "Get supervisor sign-off before production run", "Retain first article as reference sample"],
    expected_outcome: "Zero scrap on production run startup",
    metrics_impact: [{ metric: "First-pass yield", improvement_pct: 15 }, { metric: "Scrap rate", improvement_pct: -40 }],
    difficulty: "BASIC", adoption_rate_pct: 92, contributor_id: "OP-003", contributor_name: "Robert Thompson",
    validated: true, applicable_to: ["CNC Turning", "CNC Milling", "Grinding"],
  },
  {
    id: "BP-002", title: "Tool Life Tracking System", domain: "Machining",
    description: "Systematic tool wear monitoring and replacement scheduling",
    procedure_steps: ["Record tool install time and part count", "Set tool life limits based on material/operation", "Check wear at 75% of expected life", "Replace proactively at limit, not at failure", "Log actual vs expected life for database refinement"],
    expected_outcome: "Reduced unplanned downtime and consistent quality",
    metrics_impact: [{ metric: "Unplanned downtime", improvement_pct: -35 }, { metric: "Surface finish consistency", improvement_pct: 20 }],
    difficulty: "INTERMEDIATE", adoption_rate_pct: 78, contributor_id: "OP-001", contributor_name: "James Martinez",
    validated: true, applicable_to: ["CNC Turning", "CNC Milling", "Drilling"],
  },
  {
    id: "BP-003", title: "Setup Sheet Standardization", domain: "Setup",
    description: "Standardized setup documentation for repeatable machine setups",
    procedure_steps: ["Create setup sheet template with photos", "Include tool list with offsets and preset values", "Document fixture location and clamping torques", "Record program number and revision", "Include safety notes specific to the setup"],
    expected_outcome: "50% reduction in setup time for repeat jobs",
    metrics_impact: [{ metric: "Setup time", improvement_pct: -50 }, { metric: "Setup errors", improvement_pct: -70 }],
    difficulty: "BASIC", adoption_rate_pct: 85, contributor_id: "OP-005", contributor_name: "David Kim",
    validated: true, applicable_to: ["CNC Turning", "CNC Milling", "5-Axis Milling", "Grinding"],
  },
  {
    id: "BP-004", title: "Chip Management Strategy", domain: "Machining",
    description: "Effective chip evacuation and management for difficult materials",
    procedure_steps: ["Select appropriate chip breaker geometry for material", "Program peck cycles for deep holes", "Use high-pressure coolant for chip breaking", "Monitor chip form — long stringy chips indicate wrong parameters", "Clear chips from work zone between operations"],
    expected_outcome: "Improved surface finish and reduced tool breakage",
    metrics_impact: [{ metric: "Tool breakage", improvement_pct: -45 }, { metric: "Surface finish", improvement_pct: 15 }],
    difficulty: "INTERMEDIATE", adoption_rate_pct: 71, contributor_id: "OP-002", contributor_name: "Sarah Chen",
    validated: true, applicable_to: ["CNC Turning", "Drilling", "CNC Milling"],
  },
  {
    id: "BP-005", title: "Daily Machine Health Check", domain: "Maintenance",
    description: "Quick daily inspection routine for CNC machine condition monitoring",
    procedure_steps: ["Check coolant level and concentration", "Inspect way covers and wipers", "Listen for unusual spindle/axis sounds", "Verify lubrication system pressure", "Check air pressure (should be 5-6 bar)", "Run test cut on reference piece weekly"],
    expected_outcome: "Early detection of machine issues before failure",
    metrics_impact: [{ metric: "Unexpected breakdowns", improvement_pct: -55 }, { metric: "Machine availability", improvement_pct: 8 }],
    difficulty: "BASIC", adoption_rate_pct: 88, contributor_id: "OP-007", contributor_name: "Thomas Wilson",
    validated: true, applicable_to: ["CNC Lathe", "CNC Mill", "Surface Grinder"],
  },
  {
    id: "BP-006", title: "In-Process Measurement Strategy", domain: "Quality",
    description: "Strategic in-process measurement points for critical features",
    procedure_steps: ["Identify critical dimensions from drawing", "Set measurement points at 25%, 50%, 75% of batch", "Use gauging at machine vs CMM for quick checks", "Apply SPC trending for critical features", "Trigger re-measurement if process drift detected"],
    expected_outcome: "Catch deviations before out-of-spec parts accumulate",
    metrics_impact: [{ metric: "Scrap rate", improvement_pct: -30 }, { metric: "Customer returns", improvement_pct: -50 }],
    difficulty: "INTERMEDIATE", adoption_rate_pct: 65, contributor_id: "OP-010", contributor_name: "Anna Kowalski",
    validated: true, applicable_to: ["CNC Turning", "CNC Milling", "Grinding"],
  },
  {
    id: "BP-007", title: "5S Workstation Organization", domain: "Safety",
    description: "Sort, Set-in-order, Shine, Standardize, Sustain for CNC workstations",
    procedure_steps: ["Sort: Remove unused tools and clutter", "Set-in-order: Designated spots for all tools", "Shine: Clean machine and area end of shift", "Standardize: Create visual standards with photos", "Sustain: Weekly 5S audit with scoring"],
    expected_outcome: "Safer workplace, faster setup, better morale",
    metrics_impact: [{ metric: "Safety incidents", improvement_pct: -40 }, { metric: "Tool search time", improvement_pct: -60 }],
    difficulty: "BASIC", adoption_rate_pct: 73, contributor_id: "OP-007", contributor_name: "Thomas Wilson",
    validated: true, applicable_to: ["All departments"],
  },
  {
    id: "BP-008", title: "Adaptive Feed Rate for Difficult Features", domain: "Programming",
    description: "Dynamic feed rate adjustment for varying engagement conditions",
    procedure_steps: ["Identify areas of high engagement (corners, slots)", "Use CAM adaptive/dynamic toolpath strategies", "Reduce feed 30-50% for full-slot engagement", "Increase feed in light cuts for efficiency", "Monitor spindle load in real-time if available"],
    expected_outcome: "Consistent tool load, better surface finish, longer tool life",
    metrics_impact: [{ metric: "Cycle time", improvement_pct: -15 }, { metric: "Tool life", improvement_pct: 30 }],
    difficulty: "ADVANCED", adoption_rate_pct: 52, contributor_id: "OP-002", contributor_name: "Sarah Chen",
    validated: true, applicable_to: ["CNC Milling", "5-Axis Milling"],
  },
];

// ── Lessons Learned Repository ─────────────────────────────────────────────

const LESSONS_LEARNED: LessonLearned[] = [
  {
    id: "LL-001", title: "Titanium Fire Near-Miss from Dry Cutting", category: "Safety",
    incident_date: "2024-02-15",
    description: "Coolant line disconnected during titanium roughing operation, resulting in sparks and smoke from dry titanium chips",
    root_cause: "Coolant hose clamp failure + no coolant flow monitoring alarm",
    corrective_action: "Replaced all coolant hose clamps, added coolant flow sensor with machine interlock",
    preventive_action: "Monthly coolant system inspection added to PM schedule, operator training updated",
    impact: { type: "safety", severity: "CRITICAL", cost_usd: 8500 },
    status: "VERIFIED", contributor_id: "OP-001", contributor_name: "James Martinez",
    affected_operations: ["turning", "milling"],
  },
  {
    id: "LL-002", title: "Batch Scrap from Wrong Tool Offset", category: "Quality",
    incident_date: "2024-04-20",
    description: "12 parts scrapped because tool length offset was entered with wrong sign (+/- error) after tool change",
    root_cause: "Manual offset entry error, no verification step after tool change",
    corrective_action: "Implemented tool setter with automatic offset upload",
    preventive_action: "Added mandatory first-article measurement after any tool change, double-check procedure for manual offsets",
    impact: { type: "quality", severity: "HIGH", cost_usd: 4200 },
    status: "IMPLEMENTED", contributor_id: "OP-004", contributor_name: "Maria Rodriguez",
    affected_operations: ["turning", "milling"],
  },
  {
    id: "LL-003", title: "CMM Calibration Drift Caused False Accepts", category: "Quality",
    incident_date: "2024-06-10",
    description: "CMM ball diameter had drifted 0.005mm, causing 2 weeks of measurements to be systematically biased. 3 lots shipped with borderline features",
    root_cause: "Calibration sphere contamination (coolant residue), extended calibration interval",
    corrective_action: "Re-inspected all affected lots, customer notification sent, calibration sphere replaced",
    preventive_action: "Daily calibration verification with artifact check, monthly sphere cleaning protocol",
    impact: { type: "quality", severity: "HIGH", cost_usd: 15000 },
    status: "VERIFIED", contributor_id: "OP-003", contributor_name: "Robert Thompson",
    affected_operations: ["inspection", "measurement"],
  },
  {
    id: "LL-004", title: "Spindle Bearing Failure from Missed Maintenance", category: "Maintenance",
    incident_date: "2024-08-05",
    description: "Spindle bearing catastrophic failure during production. Machine down for 3 weeks waiting for parts. Lost $45K in production capacity",
    root_cause: "Lubrication schedule missed due to PM backlog, early warning vibration signs not monitored",
    corrective_action: "Emergency spindle rebuild, vibration monitoring system installed",
    preventive_action: "Critical PM tasks flagged as non-deferrable, vibration trending added to daily checks",
    impact: { type: "maintenance", severity: "CRITICAL", cost_usd: 52000 },
    status: "VERIFIED", contributor_id: "OP-007", contributor_name: "Thomas Wilson",
    affected_operations: ["all machining"],
  },
  {
    id: "LL-005", title: "Work Hardening Issue with 17-4PH Stainless", category: "Machining",
    incident_date: "2024-09-18",
    description: "Finish pass on 17-4PH part resulted in extreme work hardening, tool breakage, and damaged part surface",
    root_cause: "Light finishing pass (0.1mm DOC) with worn tool caused rubbing instead of cutting",
    corrective_action: "Increased minimum DOC to 0.3mm for 17-4PH, fresh tool mandatory for finish passes",
    preventive_action: "Material-specific minimum DOC table added to shop standards, operator training on work hardening indicators",
    impact: { type: "quality", severity: "MEDIUM", cost_usd: 1800 },
    status: "IMPLEMENTED", contributor_id: "OP-005", contributor_name: "David Kim",
    affected_operations: ["turning", "milling"],
  },
  {
    id: "LL-006", title: "Fixture Collision from Wrong Work Coordinate", category: "Safety",
    incident_date: "2024-11-02",
    description: "Machine crashed into fixture during rapid move because work coordinate system was set to wrong fixture position (G54 instead of G55)",
    root_cause: "Operator selected wrong WCS after changing from previous job, no work coordinate verification in program",
    corrective_action: "Added WCS verification probe cycle at start of every program, fixture damage repaired",
    preventive_action: "Mandatory WCS probe check added to all programs, color-coded fixture/WCS identification system",
    impact: { type: "safety", severity: "HIGH", cost_usd: 6500 },
    status: "VERIFIED", contributor_id: "OP-006", contributor_name: "Lisa Patel",
    affected_operations: ["milling", "setup"],
  },
  {
    id: "LL-007", title: "Thread Quality Issues from Worn Chuck Jaws", category: "Quality",
    incident_date: "2025-01-15",
    description: "Thread pitch diameter going out of tolerance intermittently. Took 3 days to diagnose — worn soft jaws causing part runout",
    root_cause: "Soft jaws exceeded 500 cycle rebore interval, causing 0.03mm TIR",
    corrective_action: "Re-bored soft jaws, parts re-inspected and sorted",
    preventive_action: "Jaw rebore tracking added to setup sheets, max 400 cycles between rebores, TIR check added to daily startup",
    impact: { type: "quality", severity: "MEDIUM", cost_usd: 2400 },
    status: "IMPLEMENTED", contributor_id: "OP-009", contributor_name: "Michael Brown",
    affected_operations: ["turning", "threading"],
  },
  {
    id: "LL-008", title: "EDM Wire Break Rate Spike", category: "Machining",
    incident_date: "2025-02-20",
    description: "Wire break rate increased from 1/week to 5/day on wire EDM. Parts showing burn marks at break locations",
    root_cause: "Deionized water resin depleted, conductivity climbed from 3µS to 18µS without alarm",
    corrective_action: "Replaced DI resin, adjusted conductivity alarm threshold from 15µS to 8µS",
    preventive_action: "Weekly conductivity logging added, dual-stage DI resin system for backup, operator training on water quality monitoring",
    impact: { type: "quality", severity: "MEDIUM", cost_usd: 3200 },
    status: "VERIFIED", contributor_id: "OP-002", contributor_name: "Sarah Chen",
    affected_operations: ["EDM"],
  },
];

// ── Search Helpers ─────────────────────────────────────────────────────────

function matchScore(entry: { keywords: string[]; title: string; content: string }, query: string): number {
  const q = query.toLowerCase();
  const terms = q.split(/\s+/).filter(t => t.length > 2);
  let score = 0;
  for (const term of terms) {
    if (entry.title.toLowerCase().includes(term)) score += 3;
    if (entry.keywords.some(k => k.toLowerCase().includes(term))) score += 2;
    if (entry.content.toLowerCase().includes(term)) score += 1;
  }
  return score;
}

// ── Action: kc_capture ─────────────────────────────────────────────────────

function kcCapture(params: Record<string, unknown>): unknown {
  const category = String(params.category || "").toLowerCase();
  const machine = String(params.machine || params.machine_type || "").toLowerCase();
  const material = String(params.material || "").toLowerCase();
  const operation = String(params.operation || "").toLowerCase();
  const contributor = String(params.contributor || "").toLowerCase();

  let entries = [...KNOWLEDGE_BASE];
  if (category) entries = entries.filter(e => e.category.toLowerCase().includes(category));
  if (machine) entries = entries.filter(e => e.applicable_machines.some(m => m.toLowerCase().includes(machine)));
  if (material) entries = entries.filter(e => e.applicable_materials.some(m => m.toLowerCase().includes(material)));
  if (operation) entries = entries.filter(e => e.applicable_operations.some(o => o.toLowerCase().includes(operation)));
  if (contributor) entries = entries.filter(e => e.contributor_name.toLowerCase().includes(contributor));

  return {
    action: "kc_capture",
    filters: { category: category || "all", machine: machine || "all", material: material || "all", operation: operation || "all" },
    total_entries: entries.length,
    entries: entries.map(e => ({
      id: e.id,
      title: e.title,
      category: e.category,
      subcategory: e.subcategory,
      content: e.content,
      keywords: e.keywords,
      contributor: e.contributor_name,
      verified: e.verified,
      views: e.views,
      rating: e.usefulness_rating,
      updated: e.updated,
    })),
    knowledge_base_stats: {
      total_entries: KNOWLEDGE_BASE.length,
      verified_pct: Math.round(KNOWLEDGE_BASE.filter(e => e.verified).length / KNOWLEDGE_BASE.length * 100),
      avg_rating: Math.round(KNOWLEDGE_BASE.reduce((s, e) => s + e.usefulness_rating, 0) / KNOWLEDGE_BASE.length * 10) / 10,
      top_contributors: [...new Set(KNOWLEDGE_BASE.map(e => e.contributor_name))].map(name => ({
        name,
        entries: KNOWLEDGE_BASE.filter(e => e.contributor_name === name).length,
      })).sort((a, b) => b.entries - a.entries),
    },
  };
}

// ── Action: kc_search ──────────────────────────────────────────────────────

function kcSearch(params: Record<string, unknown>): unknown {
  const query = String(params.query || params.q || "");
  if (!query) return { action: "kc_search", error: "Provide a search query." };

  const maxResults = Number(params.max_results || 5);

  // Search knowledge base
  const kbResults = KNOWLEDGE_BASE.map(e => ({
    ...e,
    score: matchScore({ keywords: e.keywords, title: e.title, content: e.content }, query),
    source: "knowledge_base" as const,
  })).filter(e => e.score > 0).sort((a, b) => b.score - a.score);

  // Search best practices
  const bpResults = BEST_PRACTICES.map(bp => ({
    ...bp,
    score: matchScore({ keywords: bp.applicable_to, title: bp.title, content: bp.description }, query),
    source: "best_practice" as const,
  })).filter(e => e.score > 0).sort((a, b) => b.score - a.score);

  // Search lessons learned
  const llResults = LESSONS_LEARNED.map(ll => ({
    ...ll,
    score: matchScore({ keywords: ll.affected_operations, title: ll.title, content: ll.description + " " + ll.root_cause }, query),
    source: "lesson_learned" as const,
  })).filter(e => e.score > 0).sort((a, b) => b.score - a.score);

  return {
    action: "kc_search",
    query,
    summary: {
      knowledge_base_hits: kbResults.length,
      best_practice_hits: bpResults.length,
      lesson_learned_hits: llResults.length,
      total_hits: kbResults.length + bpResults.length + llResults.length,
    },
    knowledge_base: kbResults.slice(0, maxResults).map(e => ({
      id: e.id, title: e.title, relevance_score: e.score, snippet: e.content.slice(0, 200) + "...",
      category: e.category, rating: e.usefulness_rating, verified: e.verified,
    })),
    best_practices: bpResults.slice(0, maxResults).map(e => ({
      id: e.id, title: e.title, relevance_score: e.score, domain: e.domain,
      adoption_rate_pct: e.adoption_rate_pct, difficulty: e.difficulty,
    })),
    lessons_learned: llResults.slice(0, maxResults).map(e => ({
      id: e.id, title: e.title, relevance_score: e.score, category: e.category,
      severity: e.impact.severity, status: e.status,
    })),
  };
}

// ── Action: kc_best_practice ───────────────────────────────────────────────

function kcBestPractice(params: Record<string, unknown>): unknown {
  const bpId = String(params.bp_id || params.id || "").toUpperCase();
  const domain = String(params.domain || "").toLowerCase();
  const difficulty = String(params.difficulty || "").toUpperCase();
  const operation = String(params.operation || "").toLowerCase();

  if (bpId) {
    const bp = BEST_PRACTICES.find(b => b.id === bpId);
    if (!bp) return { action: "kc_best_practice", error: `Best practice ${bpId} not found.` };
    return { action: "kc_best_practice", best_practice: bp };
  }

  let practices = [...BEST_PRACTICES];
  if (domain) practices = practices.filter(p => p.domain.toLowerCase().includes(domain));
  if (difficulty) practices = practices.filter(p => p.difficulty === difficulty);
  if (operation) practices = practices.filter(p => p.applicable_to.some(a => a.toLowerCase().includes(operation)));

  return {
    action: "kc_best_practice",
    filters: { domain: domain || "all", difficulty: difficulty || "all", operation: operation || "all" },
    total: practices.length,
    practices: practices.map(p => ({
      id: p.id,
      title: p.title,
      domain: p.domain,
      description: p.description,
      procedure_steps: p.procedure_steps,
      expected_outcome: p.expected_outcome,
      metrics_impact: p.metrics_impact,
      difficulty: p.difficulty,
      adoption_rate_pct: p.adoption_rate_pct,
      validated: p.validated,
    })),
    summary: {
      avg_adoption_rate: Math.round(practices.reduce((s, p) => s + p.adoption_rate_pct, 0) / practices.length),
      by_difficulty: {
        basic: practices.filter(p => p.difficulty === "BASIC").length,
        intermediate: practices.filter(p => p.difficulty === "INTERMEDIATE").length,
        advanced: practices.filter(p => p.difficulty === "ADVANCED").length,
      },
    },
  };
}

// ── Action: kc_lesson ──────────────────────────────────────────────────────

function kcLesson(params: Record<string, unknown>): unknown {
  const llId = String(params.lesson_id || params.id || "").toUpperCase();
  const category = String(params.category || "").toLowerCase();
  const severity = String(params.severity || "").toUpperCase();
  const statusFilter = String(params.status || "").toUpperCase();

  if (llId) {
    const ll = LESSONS_LEARNED.find(l => l.id === llId);
    if (!ll) return { action: "kc_lesson", error: `Lesson ${llId} not found.` };
    return { action: "kc_lesson", lesson: ll };
  }

  let lessons = [...LESSONS_LEARNED];
  if (category) lessons = lessons.filter(l => l.category.toLowerCase().includes(category));
  if (severity) lessons = lessons.filter(l => l.impact.severity === severity);
  if (statusFilter) lessons = lessons.filter(l => l.status === statusFilter);

  const totalCost = lessons.reduce((s, l) => s + l.impact.cost_usd, 0);

  return {
    action: "kc_lesson",
    filters: { category: category || "all", severity: severity || "all", status: statusFilter || "all" },
    total: lessons.length,
    lessons: lessons.map(l => ({
      id: l.id,
      title: l.title,
      category: l.category,
      incident_date: l.incident_date,
      description: l.description,
      root_cause: l.root_cause,
      corrective_action: l.corrective_action,
      preventive_action: l.preventive_action,
      severity: l.impact.severity,
      cost_usd: l.impact.cost_usd,
      status: l.status,
    })),
    summary: {
      total_lessons: lessons.length,
      total_cost_impact_usd: totalCost,
      by_severity: {
        critical: lessons.filter(l => l.impact.severity === "CRITICAL").length,
        high: lessons.filter(l => l.impact.severity === "HIGH").length,
        medium: lessons.filter(l => l.impact.severity === "MEDIUM").length,
        low: lessons.filter(l => l.impact.severity === "LOW").length,
      },
      by_status: {
        open: lessons.filter(l => l.status === "OPEN").length,
        implemented: lessons.filter(l => l.status === "IMPLEMENTED").length,
        verified: lessons.filter(l => l.status === "VERIFIED").length,
      },
      implementation_rate_pct: Math.round(lessons.filter(l => l.status !== "OPEN").length / lessons.length * 100),
    },
  };
}

// ── Public Entry Point ─────────────────────────────────────────────────────

export function executeKnowledgeCaptureAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "kc_capture":
      return kcCapture(params);
    case "kc_search":
      return kcSearch(params);
    case "kc_best_practice":
      return kcBestPractice(params);
    case "kc_lesson":
      return kcLesson(params);
    default:
      throw new Error(`Unknown KnowledgeCaptureEngine action: ${action}`);
  }
}
