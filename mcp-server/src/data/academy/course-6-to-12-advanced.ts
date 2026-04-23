/**
 * Courses 6-12: Advanced through Master + Professional
 *
 * Course 6: CAM System Mastery (18 mini-modules, 3700+ tribal tips)
 * Course 7: Material Science for Machinists (8 modules)
 * Course 8: 5-Axis Machining (8 modules)
 * Course 9: Process Optimization (8 modules)
 * Course 10: Troubleshooting (10 modules)
 * Course 11: Shop Economics (6 modules)
 * Course 12: Career Development (4 modules)
 *
 * These courses leverage PRISM's tribal knowledge, playbook rules,
 * and physics engines for dynamic content generation.
 */

import type { Module } from
  "../../engines/CurriculumEngine.js";

// ═══════════════════════════════════════════════════════════
// Course 6: CAM System Mastery (18 mini-modules)
// ═══════════════════════════════════════════════════════════

const CAM_SYSTEMS = [
  { id: "mastercam", name: "Mastercam", tips: 261, specialty: "Dynamic Motion, OptiRough, Mill-Turn" },
  { id: "edgecam", name: "Edgecam", tips: 221, specialty: "Turning, mill-turn integration" },
  { id: "hypermill", name: "hyperMILL", tips: 200, specialty: "MAXX Machining, barrel cutters, 5-axis" },
  { id: "fusion360", name: "Fusion 360", tips: 200, specialty: "Adaptive clearing, cloud CAM, API scripting" },
  { id: "solidcam", name: "SolidCAM", tips: 200, specialty: "iMachining, SolidWorks integration" },
  { id: "nx", name: "Siemens NX", tips: 200, specialty: "Adaptive milling, aerospace, large assemblies" },
  { id: "powermill", name: "PowerMill", tips: 200, specialty: "5-axis finishing, large molds/dies" },
  { id: "esprit", name: "ESPRIT", tips: 208, specialty: "Multi-channel, Swiss-type, knowledge-based" },
  { id: "camworks", name: "CAMWorks", tips: 201, specialty: "Feature-based, automatic feature recognition" },
  { id: "topsolid", name: "TopSolid", tips: 201, specialty: "Integrated CAD/CAM, mold design" },
  { id: "worknc", name: "WorkNC", tips: 201, specialty: "Automatic 3-5 axis, mold machining" },
  { id: "gibbscam", name: "GibbsCAM", tips: 200, specialty: "Multi-task, mill-turn, intuitive UI" },
  { id: "bobcad", name: "BobCAD-CAM", tips: 220, specialty: "Affordable, wire EDM, nesting" },
  { id: "catia", name: "CATIA", tips: 213, specialty: "Aerospace, composites, large assemblies" },
  { id: "cimatron", name: "Cimatron", tips: 200, specialty: "Mold/die design, electrode, 5-axis" },
  { id: "tebis", name: "Tebis", tips: 200, specialty: "Die/mold, NC templates, automation" },
  { id: "sprutcam", name: "SprutCAM", tips: 200, specialty: "Robot machining, multi-axis, affordable" },
  { id: "surfcam", name: "SurfCAM", tips: 220, specialty: "2-5 axis milling, turning, legacy" },
];

export const COURSE_6_MODULES: Module[] = CAM_SYSTEMS.map((cam, idx) => ({
  id: `course-6-mod-${idx + 1}`,
  courseId: "course-6",
  title: cam.name,
  description: `${cam.name} — ${cam.specialty}. ${cam.tips} tribal tips available.`,
  order: idx + 1,
  lessons: [{
    id: `course-6-mod-${idx + 1}-les-1`,
    moduleId: `course-6-mod-${idx + 1}`,
    title: `${cam.name} — Essential Knowledge`,
    order: 1,
    content: [{
      type: "text" as const,
      body: `# ${cam.name}\n\n` +
        `## Specialty: ${cam.specialty}\n\n` +
        `## Tribal Knowledge: ${cam.tips} expert tips available\n\n` +
        `Use the PRISM tribal knowledge system to explore tips:\n` +
        `\`prism_knowledge tribal_search --cam_system=${cam.id}\`\n\n` +
        `## Key Strengths\n` +
        `${cam.specialty}\n\n` +
        `## What Makes ${cam.name} Unique\n` +
        `This module uses PRISM's ${cam.tips} tribal tips for ${cam.name} ` +
        `to teach the system's unique features, common pitfalls, and ` +
        `best practices from experienced programmers.\n\n` +
        `## Cross-System Comparison\n` +
        `See how ${cam.name}'s terminology and workflows compare to ` +
        `other CAM systems you may already know.`,
    }],
    prismEngines: ["TribalKnowledgeEngine"],
  }],
  quiz: {
    id: `course-6-mod-${idx + 1}-quiz`,
    moduleId: `course-6-mod-${idx + 1}`,
    questions: [],
    passingScore: 70,
  },
  estimatedMinutes: 35,
}));

// ═══════════════════════════════════════════════════════════
// Course 7: Material Science for Machinists (8 modules)
// ═══════════════════════════════════════════════════════════

const MAT_MODULES = [
  { title: "Steel Families", desc: "1018→1045→4140→4340→8620→D2→H13→M2. Carbon content, heat treatment, machinability rating." },
  { title: "Aluminum Alloys", desc: "6061 vs 7075 vs 2024. T-tempers, BUE prevention, chip welding, DLC coatings." },
  { title: "Stainless Steel", desc: "Austenitic (304/316) vs ferritic (430) vs PH (17-4). Work hardening, never dwell, positive rake." },
  { title: "Titanium", desc: "Ti-6Al-4V. Low thermal conductivity, reactive, low speed + high feed + max coolant." },
  { title: "Superalloys", desc: "Inconel 718/625, Waspaloy, Hastelloy. The hardest materials to machine. Ceramic/CBN tooling." },
  { title: "Plastics & Composites", desc: "Delrin, PEEK, Nylon, CFRP. Melt risk, delamination, diamond tooling, dust extraction." },
  { title: "Cast Iron & Copper", desc: "Gray/ductile iron (abrasive dust), brass/copper/bronze (burr-free, non-magnetic)." },
  { title: "Exotic & Hardened", desc: "Magnesium (fire risk!), beryllium (toxic!), tungsten, Monel, hardened steel >50 HRC." },
];

export const COURSE_7_MODULES: Module[] = MAT_MODULES.map((m, idx) => ({
  id: `course-7-mod-${idx + 1}`,
  courseId: "course-7",
  title: m.title,
  description: m.desc,
  order: idx + 1,
  lessons: [{
    id: `course-7-mod-${idx + 1}-les-1`,
    moduleId: `course-7-mod-${idx + 1}`,
    title: m.title,
    order: 1,
    content: [{
      type: "text" as const,
      body: `# ${m.title}\n\n${m.desc}\n\n` +
        `This module uses PRISM's 2,957-material database with real ` +
        `Kienzle (kc1.1, mc) and Taylor (C, n) coefficients for ` +
        `interactive calculations.\n\n` +
        `Use the material comparison calculator to see how cutting ` +
        `parameters change between materials in this family.`,
    }],
    keyFormulas: ["kienzle", "taylor"],
    prismEngines: ["MaterialDatabaseEngine"],
  }],
  quiz: {
    id: `course-7-mod-${idx + 1}-quiz`,
    moduleId: `course-7-mod-${idx + 1}`,
    questions: [],
    passingScore: 75,
  },
  estimatedMinutes: 45,
}));

// ═══════════════════════════════════════════════════════════
// Course 8: 5-Axis Machining (8 modules)
// ═══════════════════════════════════════════════════════════

const FIVEAXIS_MODULES = [
  { title: "3+2 vs Simultaneous 5-Axis", desc: "When to use indexed positioning vs continuous motion. Cost justification, setup time comparison." },
  { title: "Lead, Lag & Tilt Angles", desc: "Tool orientation control. Lead angle for climb direction, tilt for wall following, lag for trailing." },
  { title: "TCPC & RTCP", desc: "Tool Center Point Control. How the machine compensates for tool length during rotation. Controller-specific implementations." },
  { title: "Singularity Zones", desc: "Where the A/B/C axes align and motion becomes undefined. Jacobian determinant, SLERP retraction strategies." },
  { title: "Collision Avoidance", desc: "Tool, holder, spindle collision checking. Swept volume analysis, tilt-away strategies, safe zones." },
  { title: "Port Machining", desc: "Helical interpolation into angled ports. Undercut detection, cutter orientation, multi-axis entry." },
  { title: "Impeller & Blisk", desc: "Turbomachinery blade machining. Flank milling, point milling, blade-to-blade, splitter blades." },
  { title: "5-Axis Post-Processors", desc: "A/B vs B/C axis configuration. Inverse kinematics, G43.4/G43.5, controller dialect differences." },
];

export const COURSE_8_MODULES: Module[] = FIVEAXIS_MODULES.map((m, idx) => ({
  id: `course-8-mod-${idx + 1}`,
  courseId: "course-8",
  title: m.title,
  description: m.desc,
  order: idx + 1,
  lessons: [{
    id: `course-8-mod-${idx + 1}-les-1`,
    moduleId: `course-8-mod-${idx + 1}`,
    title: m.title,
    order: 1,
    content: [{ type: "text" as const, body: `# ${m.title}\n\n${m.desc}` }],
    prismEngines: ["FiveAxisToolpathIntegrationEngine"],
  }],
  quiz: { id: `course-8-mod-${idx + 1}-quiz`, moduleId: `course-8-mod-${idx + 1}`, questions: [], passingScore: 80 },
  estimatedMinutes: 55,
}));

// ═══════════════════════════════════════════════════════════
// Course 9: Process Optimization (8 modules)
// ═══════════════════════════════════════════════════════════

const OPTIM_MODULES = [
  { title: "Monte Carlo Force Analysis", desc: "500-trial stochastic force prediction. Confidence intervals, probability of overload, safety margins." },
  { title: "Taguchi DOE", desc: "Design of Experiments for cutting parameters. L9/L18 arrays, S/N ratio, optimal parameter selection." },
  { title: "SPC & Process Capability", desc: "Control charts (X-bar, R), Cp/Cpk calculation, Western Electric rules, out-of-control detection." },
  { title: "Tool Wear Prediction", desc: "Taylor + Bayesian updating from measured data. Wear rate monitoring, optimal tool change timing." },
  { title: "Thermal Error Compensation", desc: "Machine thermal growth modeling. CTE × ΔT × L. Sensor placement, warm-up routines, live compensation." },
  { title: "Vibration Analysis", desc: "FFT spectrum analysis, stability lobes, dominant frequency identification, chatter vs forced vibration." },
  { title: "Energy Optimization", desc: "Power vs MRR trade-off. Specific energy consumption, idle power reduction, eco-mode scheduling." },
  { title: "Cost Optimization", desc: "Tool cost + machine time + scrap cost minimization. Optimal Vc for minimum cost per part." },
];

export const COURSE_9_MODULES: Module[] = OPTIM_MODULES.map((m, idx) => ({
  id: `course-9-mod-${idx + 1}`,
  courseId: "course-9",
  title: m.title,
  description: m.desc,
  order: idx + 1,
  lessons: [{
    id: `course-9-mod-${idx + 1}-les-1`,
    moduleId: `course-9-mod-${idx + 1}`,
    title: m.title,
    order: 1,
    content: [{ type: "text" as const, body: `# ${m.title}\n\n${m.desc}` }],
    prismEngines: ["StochasticCuttingForceEngine", "ProcessCapabilityPredictionEngine"],
  }],
  quiz: { id: `course-9-mod-${idx + 1}-quiz`, moduleId: `course-9-mod-${idx + 1}`, questions: [], passingScore: 80 },
  estimatedMinutes: 55,
}));

// ═══════════════════════════════════════════════════════════
// Course 10: Troubleshooting (10 modules)
// ═══════════════════════════════════════════════════════════

const TROUBLE_MODULES = [
  { title: "Chatter Diagnosis", desc: "Audio analysis, FFT frequency identification, stability lobe lookup. Forced vs regenerative chatter. Fix: RPM change, DOC reduction, tool change." },
  { title: "Poor Surface Finish", desc: "Ra too high? Check: feed rate, tool wear, runout, vibration, chip re-cutting. Systematic elimination approach." },
  { title: "Tool Breakage", desc: "Sudden fracture vs gradual wear. Root causes: overload, chip recutting, built-up edge, thermal cracking, incorrect parameters." },
  { title: "Dimensional Errors", desc: "Parts out of tolerance. Sources: thermal growth, tool deflection, backlash, work offset error, tool wear compensation." },
  { title: "Chip Evacuation Problems", desc: "Chip packing, bird-nesting, re-cutting. Fix: coolant pressure, air blast, chip breaker geometry, flute count." },
  { title: "Coolant Failures", desc: "Foaming, bacterial growth, skin irritation, rust. Concentration testing, pH monitoring, sump maintenance schedule." },
  { title: "Fixture Failures", desc: "Part movement, clamp marks, distortion. Root cause: insufficient clamping force, wrong fixture type, thermal expansion." },
  { title: "Program Crashes", desc: "Collision diagnostics. G28 without G91, missing G43, wrong offset, rapid through material. Prevention checklist." },
  { title: "Alarm Decoding", desc: "Reading and resolving CNC alarms. Servo errors, overtravel, spindle faults, communication errors. 10K+ alarm database." },
  { title: "Post-Processor Issues", desc: "Code doesn't match CAM. Dialect differences, arc format, tool change macros, controller-specific G-codes." },
];

export const COURSE_10_MODULES: Module[] = TROUBLE_MODULES.map((m, idx) => ({
  id: `course-10-mod-${idx + 1}`,
  courseId: "course-10",
  title: m.title,
  description: m.desc,
  order: idx + 1,
  lessons: [{
    id: `course-10-mod-${idx + 1}-les-1`,
    moduleId: `course-10-mod-${idx + 1}`,
    title: m.title,
    order: 1,
    content: [{ type: "text" as const, body: `# ${m.title}\n\n${m.desc}` }],
    prismEngines: ["TroubleshootingAssistantEngine"],
  }],
  quiz: { id: `course-10-mod-${idx + 1}-quiz`, moduleId: `course-10-mod-${idx + 1}`, questions: [], passingScore: 80 },
  estimatedMinutes: 45,
}));

// ═══════════════════════════════════════════════════════════
// Course 11: Shop Economics (6 modules)
// ═══════════════════════════════════════════════════════════

const ECON_MODULES = [
  { title: "Cost Per Part Breakdown", desc: "Material + tooling + machine time + labor + overhead + scrap. Understanding where money goes." },
  { title: "Quoting Basics", desc: "Markup vs margin. Estimating setup time, cycle time, secondary operations. Competitive pricing strategies." },
  { title: "Make vs Buy Decisions", desc: "When to machine in-house vs outsource. Capacity, capability, cost comparison, lead time analysis." },
  { title: "ROI on Tooling Upgrades", desc: "Payback period for better tools, holders, fixtures. Connected to PRISM's ROIAdvisorEngine." },
  { title: "Scrap Cost & First Article", desc: "True cost of a scrapped part (material + time + opportunity). First article inspection economics." },
  { title: "Price Breaks & Batch Economics", desc: "Setup amortization, learning curve, volume discounts. Optimal batch size calculation." },
];

export const COURSE_11_MODULES: Module[] = ECON_MODULES.map((m, idx) => ({
  id: `course-11-mod-${idx + 1}`,
  courseId: "course-11",
  title: m.title,
  description: m.desc,
  order: idx + 1,
  lessons: [{
    id: `course-11-mod-${idx + 1}-les-1`,
    moduleId: `course-11-mod-${idx + 1}`,
    title: m.title,
    order: 1,
    content: [{ type: "text" as const, body: `# ${m.title}\n\n${m.desc}` }],
    prismEngines: ["QuoteEstimatorEngine", "ROIAdvisorEngine"],
  }],
  quiz: { id: `course-11-mod-${idx + 1}-quiz`, moduleId: `course-11-mod-${idx + 1}`, questions: [], passingScore: 70 },
  estimatedMinutes: 40,
}));

// ═══════════════════════════════════════════════════════════
// Course 12: Career Development (4 modules)
// ═══════════════════════════════════════════════════════════

const CAREER_MODULES = [
  { title: "Career Paths — Operator to Engineer", desc: "Setup operator → CNC operator → CNC programmer → lead programmer → manufacturing engineer → shop manager. Skills needed at each level, typical timelines, salary ranges." },
  { title: "Building a Programming Portfolio", desc: "Document your best work: complex parts, challenging setups, innovative solutions. Before/after photos, cycle time improvements, cost savings. GitHub for G-code and CAM files." },
  { title: "Interview Preparation", desc: "What shops look for: problem-solving, blueprint reading, material knowledge, machine experience. Common interview questions and how to answer them. Practical test preparation." },
  { title: "Continuous Learning Resources", desc: "Titans of CNC (YouTube), Practical Machinist (forum), NTMA training, local community college programs, manufacturer training (Haas, DMG MORI), trade shows (IMTS, EMO), online courses." },
];

export const COURSE_12_MODULES: Module[] = CAREER_MODULES.map((m, idx) => ({
  id: `course-12-mod-${idx + 1}`,
  courseId: "course-12",
  title: m.title,
  description: m.desc,
  order: idx + 1,
  lessons: [{
    id: `course-12-mod-${idx + 1}-les-1`,
    moduleId: `course-12-mod-${idx + 1}`,
    title: m.title,
    order: 1,
    content: [{ type: "text" as const, body: `# ${m.title}\n\n${m.desc}` }],
  }],
  quiz: { id: `course-12-mod-${idx + 1}-quiz`, moduleId: `course-12-mod-${idx + 1}`, questions: [], passingScore: 70 },
  estimatedMinutes: 35,
}));
