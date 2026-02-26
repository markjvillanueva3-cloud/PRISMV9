/**
 * ApprenticeEngine.ts — R10-Rev7 Machinist's Apprentice
 * ======================================================
 *
 * Transforms PRISM from a parameter calculator into a manufacturing mentor:
 *   - Explain mode: "why" behind every parameter recommendation
 *   - Learning paths: 20 structured lessons across 3 tracks
 *   - Skill assessment: identify knowledge gaps, recommend lessons
 *   - Tribal knowledge capture: interview → formalize → validate → store
 *   - Challenge exercises: "what went wrong?" diagnostic practice
 *
 * @version 1.0.0 — R10-Rev7
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type SkillLevel = "beginner" | "intermediate" | "advanced";
export type LessonTrack = "fundamentals" | "intermediate" | "advanced";

export interface Lesson {
  id: number;
  track: LessonTrack;
  title: string;
  duration_min: number;
  concept: string;
  explanation: string;
  key_formula?: string;
  try_it: string;
  diagnostic: string;
}

export interface SkillAssessment {
  assessment_id: string;
  level: SkillLevel;
  scores: Record<string, number>; // topic → 0-100
  gaps: string[];
  recommended_lessons: number[];
  total_score: number;
}

export interface KnowledgeEntry {
  knowledge_id: string;
  source: string;
  experience_years: number;
  material: string;
  topic: string;
  insight: string;
  formalized_rule: string;
  physics_validation: string;
  confidence: "high" | "medium" | "low";
  timestamp: string;
}

export interface ExplainResult {
  parameter: string;
  value: string;
  explanation: string;
  factors: ExplainFactor[];
  depth: "brief" | "standard" | "detailed";
}

export interface ExplainFactor {
  factor: string;
  impact: string;
  physics: string;
}

export interface ChallengeExercise {
  challenge_id: string;
  scenario: string;
  symptoms: string[];
  question: string;
  answer: string;
  lesson_ref: number;
  difficulty: SkillLevel;
}

// ─── Lesson Database ─────────────────────────────────────────────────────────

const LESSONS: Lesson[] = [
  // === FUNDAMENTALS TRACK (1-7) ===
  {
    id: 1, track: "fundamentals", title: "What Determines Cutting Speed?", duration_min: 5,
    concept: "Cutting speed (Vc) is the most critical parameter because it controls temperature at the cutting edge.",
    explanation: "Three things determine the right cutting speed: (1) WORKPIECE MATERIAL — harder materials need lower speeds because they generate more friction heat. Aluminum can run at 600 m/min; Inconel tops out at 60 m/min. (2) TOOL MATERIAL — carbide handles more heat than HSS. Ceramic handles more than carbide. The tool's coating sets the temperature limit. (3) COATING — AlTiN coatings resist heat to 900°C. TiN only to 600°C. The coating is your thermal shield.",
    key_formula: "Vc = π × D × n / 1000 (m/min), where D=diameter(mm), n=RPM",
    try_it: "Calculate the RPM needed to achieve Vc=200 m/min with a 10mm endmill.",
    diagnostic: "A tool is wearing out in 5 minutes instead of 45. The cutting speed is 300 m/min in 304 stainless. What's wrong?",
  },
  {
    id: 2, track: "fundamentals", title: "What is Chip Load and Why Does it Matter?", duration_min: 5,
    concept: "Chip load (fz) is the thickness of material each tooth removes per revolution.",
    explanation: "Chip load is the 'bite size' each tooth takes. Too thin (< minimum chip thickness) and the tool RUBS instead of cuts — generating heat without removing material. This accelerates wear dramatically. Too thick and forces become excessive, risking breakage. Every tool has a sweet spot: typically 0.02-0.15 mm depending on diameter and material. CRITICAL RULE: Never go below the minimum chip thickness for your tool. It's better to feed too fast (tool might chip) than too slow (tool definitely overheats).",
    key_formula: "fz = Vf / (n × z), where Vf=feed(mm/min), n=RPM, z=flute count",
    try_it: "A 4-flute endmill at 3000 RPM with 1200 mm/min feed rate. What's the chip load?",
    diagnostic: "Tool is wearing out fast but the feed rate seems 'conservative' at 200 mm/min with 6000 RPM and 4 flutes. Diagnose.",
  },
  {
    id: 3, track: "fundamentals", title: "How to Read a Tool Catalog", duration_min: 5,
    concept: "A tool catalog tells you everything you need: grade, geometry, recommended parameters, and limitations.",
    explanation: "Key catalog specs: (1) GRADE — a code like GC4330 (Sandvik) or IC328 (Iscar). The grade defines the carbide substrate + coating. General rule: higher numbers = harder but more brittle. (2) GEOMETRY — positive rake for soft materials (aluminum), negative rake for hard (Inconel). More positive = lower forces but weaker edge. (3) RECOMMENDED Vc RANGE — always start at the LOW end for new setups, then increase. (4) MAX DOC and FEED — never exceed these on the first cut. (5) APPLICATION CODE — P (steel), M (stainless), K (cast iron), N (aluminum), S (superalloys), H (hardened).",
    try_it: "Find the right ISO application code for machining 17-4PH stainless steel.",
    diagnostic: "A machinist selected a K-grade insert for machining 316L stainless. Parts have poor surface finish and short tool life. Why?",
  },
  {
    id: 4, track: "fundamentals", title: "What Causes Chatter and How to Fix It", duration_min: 5,
    concept: "Chatter is self-excited vibration that ruins surface finish, damages tools, and can crash machines.",
    explanation: "Chatter happens when the force from one tooth pass creates a wave that the NEXT tooth hits, amplifying the vibration. Three ways to fix it: (1) CHANGE RPM — move to a 'stability pocket' where vibrations cancel out instead of reinforcing. Usually ±10-15% change is enough. (2) REDUCE DOC — less engagement = less force = less vibration energy. Cut DOC in half as first response. (3) USE VARIABLE GEOMETRY — variable helix or variable pitch tools break the reinforcement pattern by having teeth spaced unevenly.",
    key_formula: "Tooth passing frequency = RPM × flutes / 60 (Hz)",
    try_it: "You hear chatter at 4000 RPM with a 4-flute tool. Calculate the tooth passing frequency. If the machine's natural frequency is 667 Hz, suggest an RPM to avoid resonance.",
    diagnostic: "A new CNC machine produces chatter on every job. Even conservative parameters chatter. The old machine in the same spot was fine. What should you check?",
  },
  {
    id: 5, track: "fundamentals", title: "Work Offsets: What They Are and Common Mistakes", duration_min: 5,
    concept: "Work offsets tell the CNC where the part is. Getting them wrong is the #1 cause of crashes.",
    explanation: "A work offset (G54, G55, etc.) defines where the part's zero point is in machine coordinates. X and Y are set by indicating off the part edges or a datum. Z is set by touching the tool on the top surface. COMMON MISTAKES: (1) Touching off Z on the WRONG surface — if you touch off on the parallels instead of the part top, Z0 is wrong by the parallel height. (2) Forgetting to account for tool length — G43 H__ must be called with the correct tool number. (3) Using the wrong offset register — G54 vs G55 mix-up. ALWAYS verify by jogging to X0 Y0 Z0 in single-block mode before cutting.",
    try_it: "You have a part sitting on 1-inch parallels in a vise. Where do you touch off Z? What happens if you touch off on the parallels instead?",
    diagnostic: "First cut goes 25mm too deep. The program calls G54. You checked G54 Z and it looks correct. What else could cause this?",
  },
  {
    id: 6, track: "fundamentals", title: "Coolant: When to Use Flood, Mist, Through-Tool, or Dry", duration_min: 5,
    concept: "Coolant choice affects tool life, surface finish, chip evacuation, and even whether tools crack.",
    explanation: "Four options: (1) FLOOD — traditional, good all-around. Best for drilling and deep pockets where chip evacuation matters. (2) MIST/MQL — Minimum Quantity Lubrication. A fine oil mist. Better for milling (no thermal shock) and better for the environment. (3) THROUGH-TOOL — high-pressure coolant through the tool. Essential for deep hole drilling, Inconel, titanium. 40-70 bar typical. (4) DRY — no coolant. PREFERRED for milling insert tools because flood coolant causes THERMAL CRACKING (rapid heat/cool cycles). Use air blast for chip clearing. RULE: For milling with inserts, dry or MQL is almost always better than flood.",
    try_it: "You're face milling cast iron with indexable inserts. Should you use flood coolant? Why or why not?",
    diagnostic: "Milling inserts develop parallel cracks perpendicular to the cutting edge after 10 minutes. Flood coolant is being used. Diagnose.",
  },
  {
    id: 7, track: "fundamentals", title: "How to Read a Setup Sheet", duration_min: 5,
    concept: "A setup sheet is the complete blueprint for how to set up and run a job.",
    explanation: "A setup sheet contains: (1) FIXTURE — how the part is held, clamp locations, torque specs. (2) DATUM — where zero is, how to set it, what tools to use for indicating. (3) TOOL LIST — every tool needed, with gauge lengths, holder types, stick-out. (4) OPERATIONS — sequence of cuts with speeds, feeds, DOCs. (5) NOTES — special instructions, quality checks, common problems. READ THE ENTIRE SHEET BEFORE TOUCHING THE MACHINE. The 5 minutes you spend reading saves 45 minutes of mistakes.",
    try_it: "List the 5 things you check on a setup sheet BEFORE loading any tools.",
    diagnostic: "A machinist skipped reading the setup notes and started cutting. The part failed quality inspection. The note said 'Leave 0.1mm stock on bore ID for grinding.' What happened?",
  },

  // === INTERMEDIATE TRACK (8-13) ===
  {
    id: 8, track: "intermediate", title: "Toolpath Strategies: Climb vs Conventional, Trochoidal, Adaptive", duration_min: 5,
    concept: "The WAY you move the tool through material matters as much as the speeds and feeds.",
    explanation: "CLIMB MILLING — tool rotation and feed go in the same direction. Preferred on CNC machines (no backlash). Thinner chip at exit = cleaner surface, less heat in the part. CONVENTIONAL — opposite direction. Thicker chip at exit. Only use when machine has backlash or for very hard materials. TROCHOIDAL — circular motion through a slot. Maintains constant engagement angle, preventing force spikes. Allows MUCH higher axial DOC with small radial engagement. MRR can actually increase vs conventional slotting. ADAPTIVE — CAM software varies stepover to maintain constant chip load. Best for roughing — maximizes MRR while protecting the tool.",
    try_it: "You need to cut a 12mm wide slot with a 10mm endmill. Compare: (a) conventional slotting at full width, (b) trochoidal with 1mm radial depth but full-length DOC.",
    diagnostic: "A programmer switched from climb to conventional milling to 'be safe' and tool life dropped 60%. Why?",
  },
  {
    id: 9, track: "intermediate", title: "When to Use Which Type of Tool", duration_min: 5,
    concept: "Tool selection is the most impactful decision — the wrong tool geometry guarantees a bad result.",
    explanation: "SOLID ENDMILL vs INSERT CUTTER: Solid endmills for < 25mm diameter, finishing, and tight tolerances. Insert cutters for roughing, face milling, and larger diameters (cheaper per edge). ENDMILL vs FACE MILL: Endmills for pockets, contours, 3D surfaces. Face mills for large flat surfaces (much more productive). BALL NOSE vs FLAT vs BULL NOSE: Ball nose for 3D surfaces and freeform. Flat bottom for pockets and floors. Bull nose (corner radius) for general purpose — the radius adds edge strength. NUMBER OF FLUTES: 2-3 for aluminum (chip space). 4-6 for steel. 6-8 for finishing (more teeth = finer finish at same feed rate).",
    try_it: "You need to rough a 100mm × 100mm pocket 30mm deep in 7075-T6 aluminum. What tool type, diameter, and flute count would you choose?",
    diagnostic: "A machinist is using a 2-flute endmill in 4140 steel. Chips are packing in the flutes and the tool is deflecting. What should change?",
  },
  {
    id: 10, track: "intermediate", title: "Threading: Taps vs Thread Mills", duration_min: 5,
    concept: "Taps are fast but risky. Thread mills are slower but safer and more flexible.",
    explanation: "TAPS: One-shot threading. Fast (single pass). But: if a tap breaks IN the hole, you may scrap the part. No adjustment possible — the tap size is the thread size. THREAD MILLS: Helical interpolation creates the thread. Advantages: (1) One tool does many thread sizes (just change the helix). (2) If it breaks, it doesn't get stuck (smaller than the hole). (3) You can adjust thread fit by changing the helix diameter. (4) Works in blind holes closer to the bottom. RULE OF THUMB: Use taps for production (speed), thread mills for expensive parts (safety), hardened materials (> 45 HRC), and blind holes with limited clearance.",
    key_formula: "Tap drill size = Major diameter - Pitch (for ~75% thread)",
    try_it: "Calculate the tap drill size for an M10 × 1.5 thread.",
    diagnostic: "A tap broke in a $3,000 aerospace part. The material was 17-4PH at 40 HRC. Should a tap have been used?",
  },
  {
    id: 11, track: "intermediate", title: "Surface Finish and Parameters: The Ra Equation", duration_min: 5,
    concept: "Surface finish is a GEOMETRIC consequence of feed and tool geometry — it's predictable.",
    explanation: "For a tool with nose radius R and feed per tooth fz, the theoretical roughness is: Ra = fz²/(32×R). This means: (1) HALVING the feed improves Ra by 4× (quadratic relationship!). (2) DOUBLING the nose radius improves Ra by 2×. (3) SPEED DOES NOT DIRECTLY AFFECT Ra (but indirectly through BUE, vibration). In practice, actual Ra is always worse than theoretical because of: vibration (adds waviness), BUE (adds random roughness), tool wear (nose radius degrades). To achieve a target Ra: fz_max = √(32 × R × Ra_target).",
    key_formula: "Ra = fz² / (32 × R). To achieve Ra_target: fz_max = √(32 × R × Ra_target)",
    try_it: "With a 0.8mm nose radius, what's the maximum fz to achieve Ra ≤ 0.8 μm?",
    diagnostic: "A finishing pass should give Ra 0.8 μm but measures 3.2 μm. The feed is correct per the formula. What else could cause this?",
  },
  {
    id: 12, track: "intermediate", title: "Tool Deflection: Why It Matters and How to Calculate It", duration_min: 5,
    concept: "The tool bends under cutting forces. This deflection causes dimensional errors and chatter.",
    explanation: "A tool acts like a cantilever beam. Deflection = F × L³ / (3 × E × I), where F=force, L=stick-out, E=Young's modulus (620 GPa for carbide), I=moment of inertia (π×d⁴/64). KEY INSIGHT: Deflection scales with L³ — doubling stick-out increases deflection 8×! And d⁴ — going from 10mm to 8mm diameter increases deflection by (10/8)⁴ = 2.4×. PRACTICAL RULES: (1) Minimize stick-out — every mm saved is 3% less deflection. (2) Use the largest diameter tool that fits. (3) If deflection exceeds 10% of tolerance, reduce DOC or WOC. (4) For deep pockets, use step-down approach with reducing engagement.",
    key_formula: "δ = F × L³ / (3 × E × I), where I = π × d⁴ / 64",
    try_it: "An 8mm carbide endmill with 40mm stick-out takes a 1mm DOC × 4mm WOC cut. If the cutting force is 200N, what's the deflection?",
    diagnostic: "Parts from a long-reach operation are consistently 0.03mm undersize on one wall. What's the likely cause and fix?",
  },
  {
    id: 13, track: "intermediate", title: "Material Behavior: Why Titanium ≠ Steel ≠ Aluminum", duration_min: 5,
    concept: "Each material family machines differently because of fundamentally different physics.",
    explanation: "ALUMINUM: High thermal conductivity (167 W/m·K) — heat goes into the chip, not the tool. You can run FAST (600+ m/min). Main risk: BUE at low speeds. Use DLC or polished tools. STEEL: Moderate conductivity (50 W/m·K). Balanced heat distribution. Most forgiving material to machine. Standard carbide works well. STAINLESS: Low conductivity (16 W/m·K) + work hardening. Heat stays in the tool. If you rub (thin chip), the surface hardens and the next pass is worse. Always maintain minimum chip thickness! TITANIUM: Very low conductivity (7 W/m·K) + chemical reactivity with carbide above 500°C. Must keep speed LOW but maintain thick chip. 'Gentle but aggressive' — low speed, high feed. INCONEL: Worst of everything — low conductivity (11 W/m·K), work hardening, abrasive, melts coatings. Speed ≤ 60 m/min. Through-tool coolant mandatory.",
    try_it: "Rank these materials from easiest to hardest to machine and explain why: 7075 aluminum, 304 stainless, Inconel 718, 4140 steel, Ti-6Al-4V.",
    diagnostic: "A shop that normally machines aluminum took a titanium job. They used the same speeds and feeds (just reduced by 50%). Tool life is 3 minutes. What's wrong with their approach?",
  },

  // === ADVANCED TRACK (14-20) ===
  {
    id: 14, track: "advanced", title: "Stability Lobe Diagrams and Chatter Avoidance", duration_min: 5,
    concept: "Stability lobes predict EXACTLY which RPM/DOC combinations will chatter and which won't.",
    explanation: "A stability lobe diagram (SLD) maps RPM (x-axis) vs maximum stable DOC (y-axis). Between the lobes are 'stability pockets' — RPM ranges where you can take deeper cuts without chatter. The lobes are determined by: (1) The natural frequency of the tool-holder-spindle system. (2) The number of flutes. (3) The material's specific cutting force. To use an SLD: tap-test the tool with an accelerometer to find the natural frequency, then calculate the stable pockets. If the natural frequency is fn Hz, the best RPMs are: n = 60×fn / (N×z), where N=1,2,3... (lobe number) and z=flute count.",
    key_formula: "Stable RPM = 60 × fn / (N × z), where N = lobe number (1,2,3...), z = flutes",
    try_it: "A tool-holder system has fn = 800 Hz. With a 4-flute endmill, what are the first three stable RPM pockets?",
    diagnostic: "At 6000 RPM, a 4-flute tool chatters at 2mm DOC. The SLD shows a stability pocket at 6000 RPM up to 5mm DOC. Why might the SLD prediction be wrong?",
  },
  {
    id: 15, track: "advanced", title: "Multi-Objective Optimization: Cost vs Time vs Quality", duration_min: 5,
    concept: "In real manufacturing, you're always trading off between cost, cycle time, and quality.",
    explanation: "Three objectives conflict: (1) MINIMUM COST — moderate speed, long tool life, fewer tool changes. The cost-optimal speed (Taylor's equation) is usually 60-70% of max speed. (2) MINIMUM TIME — high speed, aggressive parameters, accept shorter tool life. Best for bottleneck operations. (3) MAXIMUM QUALITY — conservative parameters, finishing passes, tight tolerances. The skill is knowing WHICH objective matters for THIS job. A prototype? Minimize time. A 10,000-piece run? Minimize cost. An aerospace critical feature? Maximize quality. PRISM can calculate the Pareto front — the set of solutions where you can't improve one objective without worsening another.",
    try_it: "A job has two phases: roughing (80% of cycle time) and finishing (20%). Where should you focus optimization effort?",
    diagnostic: "A shop optimized for minimum cycle time and won the bid. After 1000 parts, they're losing money. Where did the analysis go wrong?",
  },
  {
    id: 16, track: "advanced", title: "Surface Integrity in Aerospace Applications", duration_min: 5,
    concept: "Surface integrity goes beyond Ra — it includes residual stress, microstructure changes, and fatigue life.",
    explanation: "Aerospace specs (like AMS 2759) care about what's UNDER the surface: (1) WHITE LAYER — in hardened steel or nickel alloys, aggressive machining creates an ultra-hard, brittle surface layer (martensite). This can crack under fatigue. (2) RESIDUAL STRESS — machining leaves compressive or tensile stress in the surface. Compressive = good (resists crack opening). Tensile = bad (promotes cracks). Climb milling and sharp tools create more compressive stress. (3) MICROHARDNESS PROFILE — hardness should be uniform from surface to bulk. Spikes indicate thermal damage. (4) BURR-FREE EDGES — aerospace parts often require deburring to specific edge break specs (e.g., 0.05-0.15mm radius).",
    try_it: "A turbine blade root has a fatigue-critical fillet. What surface integrity concerns should you address in your process plan?",
    diagnostic: "A nickel alloy part passed all dimensional and Ra checks but failed fatigue testing at 60% of expected life. What surface integrity issue could cause this?",
  },
  {
    id: 17, track: "advanced", title: "Thermal Management in High-Speed Machining", duration_min: 5,
    concept: "At high speeds, most heat goes into the chip (good!) but thermal effects dominate everything else.",
    explanation: "In HSM: (1) CHIP TEMPERATURE — at 600+ m/min in aluminum, chips glow red-hot. This is GOOD — heat leaving in the chip means the workpiece stays cool. (2) SPINDLE GROWTH — spindle bearings heat up, causing the spindle to grow in Z. A typical spindle grows 10-30 μm in the first hour. Solution: warm-up cycle + in-process probing. (3) WORKPIECE EXPANSION — large aluminum parts expand ~23 μm/m per °C. A 500mm part machined with 2°C temperature rise grows 0.023mm. Measure in a temperature-controlled CMM room. (4) MACHINE STRUCTURE — ball screws and columns expand. High-end machines have compensation; older machines need manual correction.",
    try_it: "A 400mm aluminum plate is machined in a shop at 25°C but inspected in a CMM room at 20°C. How much does it shrink?",
    diagnostic: "First-off parts measure perfectly. After 2 hours of production, parts are 0.02mm undersize in Z. What's causing the drift?",
  },
  {
    id: 18, track: "advanced", title: "5-Axis: Positioning vs Simultaneous", duration_min: 5,
    concept: "5-axis positioning (3+2) and 5-axis simultaneous are fundamentally different capabilities.",
    explanation: "3+2 POSITIONING — the rotary axes lock in a fixed orientation, then 3 linear axes do the cutting. Like putting the part in a vise at an angle. Benefits: simpler programming, more rigid (axes locked), most machines can do it. Use for: accessing features at angles, reducing setups. SIMULTANEOUS 5-AXIS — all 5 axes move during cutting. Required for: impellers, turbine blades, complex sculptured surfaces, undercuts. Much harder to program — requires specialized CAM (NX, hyperMILL, PowerMill). KEY PITFALL: tool-axis orientation changes during simultaneous cutting, so effective cutting speed varies along the tool. A ball nose at the tip has ZERO surface speed. The effective cutting diameter matters, not the tool diameter.",
    try_it: "A 10mm ball nose endmill cutting at the tip (0° contact angle) at 10000 RPM. What's the actual cutting speed? Now what about at 30° contact?",
    diagnostic: "Simultaneous 5-axis parts have great finish on the walls but terrible finish near the top of domed features. The same tool and feeds are used everywhere. Why?",
  },
  {
    id: 19, track: "advanced", title: "Fixture Design for Complex Parts", duration_min: 5,
    concept: "The fixture determines whether a part can be made at all, and how accurately.",
    explanation: "Fixture design principles: (1) 3-2-1 LOCATION — 3 points on the primary plane, 2 on the secondary, 1 on the tertiary. This fully constrains the part. (2) CLAMP AWAY FROM CUTS — clamping forces distort the part. Put clamps where you're NOT machining. (3) SUPPORT NEAR THE CUT — thin walls vibrate. Add support behind the wall being machined. Vacuum or wax fixtures for thin parts. (4) ACCESSIBILITY — can you actually reach all features? Mock up tool paths before building the fixture. (5) REPEATABILITY — for production, the fixture must locate parts identically every time. Use pins, keys, or datum surfaces — not vise jaw edges. (6) CHIP CLEARING — chips trapped between fixture and part cause scratches and dimensional errors.",
    try_it: "Design a fixture strategy (number of setups, clamping method) for a 6-sided aluminum housing 100×100×50mm with features on all sides.",
    diagnostic: "Parts from Op1 are perfect. Same parts re-fixtured for Op2 have features 0.05mm off-position relative to Op1 features. What's the likely cause?",
  },
  {
    id: 20, track: "advanced", title: "Process FMEA: Identifying and Mitigating Manufacturing Risks", duration_min: 5,
    concept: "Process FMEA systematically identifies what can go wrong and prioritizes risk reduction.",
    explanation: "FMEA = Failure Mode and Effects Analysis. For each process step: (1) What can FAIL? (wrong dimension, poor finish, tool break, crash). (2) How SEVERE is the effect? (1-10 scale: 1=cosmetic, 10=safety hazard). (3) How LIKELY is the failure? (1-10 scale: 1=nearly impossible, 10=almost certain). (4) How DETECTABLE is it? (1-10 scale: 1=always detected, 10=undetectable). RPN = Severity × Occurrence × Detection. High RPN → address first. MANUFACTURING-SPECIFIC FMEA: Wrong tool offset → 10 severity (crash), 3 occurrence, 2 detection = RPN 60. Tool wear → 5 severity (scrap), 5 occurrence, 4 detection = RPN 100. The tool wear has higher RPN because it's harder to detect and more frequent — even though a crash is more dramatic.",
    key_formula: "RPN = Severity × Occurrence × Detection (each 1-10)",
    try_it: "Create a mini-FMEA for a drilling operation: list 3 failure modes, rate S/O/D, and calculate RPN.",
    diagnostic: "A shop's FMEA shows all processes at RPN < 50 but they're still scrapping 5% of parts. What might the FMEA be missing?",
  },
];

// ─── Material Explanation Database ───────────────────────────────────────────

interface MaterialExplanation {
  name: string;
  thermal_conductivity: string;
  key_challenge: string;
  speed_reasoning: string;
  feed_reasoning: string;
  coolant_reasoning: string;
  common_mistakes: string[];
}

const MATERIAL_EXPLANATIONS: Record<string, MaterialExplanation> = {
  aluminum: {
    name: "Aluminum", thermal_conductivity: "high (167 W/m·K)",
    key_challenge: "Built-Up Edge (BUE) at low speeds",
    speed_reasoning: "Aluminum conducts heat very well — most heat goes into the chip, not the tool. This allows very high cutting speeds (200-600 m/min). The main risk at LOW speed is BUE: aluminum cold-welds to the cutting edge, creating an irregular surface.",
    feed_reasoning: "Aluminum is soft and forgiving. Higher feed rates are fine and actually help prevent BUE by maintaining clean chip flow. Keep fz above 0.05mm minimum.",
    coolant_reasoning: "Flood coolant for chip evacuation in deep pockets. MQL or dry for face milling. Through-tool coolant for drilling.",
    common_mistakes: ["Running too slow (causes BUE)", "Using wrong flute count (use 2-3, never 6+)", "Not clearing chips in deep pockets"],
  },
  steel: {
    name: "Steel", thermal_conductivity: "moderate (50 W/m·K)",
    key_challenge: "Balancing speed (heat) vs feed (force)",
    speed_reasoning: "Steel is the baseline material. Moderate thermal conductivity means heat splits roughly 50/50 between chip and tool. Speed range 100-300 m/min for carbide. Going too fast overheats the coating; too slow wastes productivity.",
    feed_reasoning: "Steel is predictable. Follow manufacturer's recommended fz (typically 0.05-0.15mm for endmills). The chip breaks naturally if parameters are right.",
    coolant_reasoning: "Flood or MQL for most operations. Dry for milling with inserts to avoid thermal cracking.",
    common_mistakes: ["Using flood coolant with milling inserts (thermal cracking)", "Not adjusting for alloy hardness variations", "Ignoring chip color (blue = too hot)"],
  },
  stainless: {
    name: "Stainless Steel", thermal_conductivity: "low (16 W/m·K)",
    key_challenge: "Work hardening and heat concentration",
    speed_reasoning: "Low thermal conductivity means heat concentrates in the tool. Keep speed moderate (60-180 m/min). But the BIGGER issue is work hardening: the surface you just cut becomes harder. If the next pass takes too thin a cut, you're cutting through this hardened layer.",
    feed_reasoning: "CRITICAL: Never go below minimum chip thickness! If fz is too low, the tool rubs on the work-hardened layer, generating more heat and hardening it further. This creates a death spiral. Keep fz ≥ 0.04mm.",
    coolant_reasoning: "High-pressure coolant preferred. Through-tool when available. Never cut stainless dry — it galls and smears.",
    common_mistakes: ["Feed too low (rubbing on work-hardened layer)", "Not maintaining minimum chip thickness", "Light finishing passes that just rub"],
  },
  titanium: {
    name: "Titanium", thermal_conductivity: "very low (7 W/m·K)",
    key_challenge: "Heat stays in the tool; chemical reactivity above 500°C",
    speed_reasoning: "Very low conductivity means almost all heat goes into the tool. Above 500°C, titanium chemically reacts with carbide (dissolves it). Speed MUST stay low (30-80 m/min). But you CAN take aggressive DOC because the low thermal conductivity means the workpiece stays cold.",
    feed_reasoning: "Thick chips are your friend — they carry heat away. Keep fz high (0.05-0.10mm) to maintain chip thickness above the work-hardening layer. 'Gentle but aggressive' approach: low speed, high feed.",
    coolant_reasoning: "Through-tool high-pressure coolant is nearly mandatory. 40-70 bar minimum. Flood is acceptable but through-tool is significantly better.",
    common_mistakes: ["Speed too high (melts the coating)", "Feed too low (rubbing, work hardening)", "Insufficient coolant pressure"],
  },
  inconel: {
    name: "Inconel (Nickel Superalloy)", thermal_conductivity: "very low (11 W/m·K)",
    key_challenge: "Everything is difficult — low conductivity, work hardening, abrasive, adhesive",
    speed_reasoning: "Inconel is the hardest common material to machine. Speed must be very low (20-60 m/min for carbide). Above 60 m/min, crater wear from chemical diffusion destroys the tool in minutes. Ceramic inserts can go faster (200-400 m/min) but only for specific operations.",
    feed_reasoning: "Same as titanium — must maintain thick chip to get under the work-hardened layer. fz ≥ 0.04mm is critical. Below this, the death spiral of rubbing → hardening → more rubbing begins.",
    coolant_reasoning: "Through-tool high-pressure coolant is mandatory. 70+ bar recommended. Coolant is fighting both thermal and adhesion issues simultaneously.",
    common_mistakes: ["Speed way too high (should be ≤ 60 m/min)", "Using wrong tool grade (need heat-resistant coating)", "Not varying DOC (notch wear at constant depth)"],
  },
  cast_iron: {
    name: "Cast Iron", thermal_conductivity: "moderate (46 W/m·K)",
    key_challenge: "Abrasive graphite flakes wear the flank face",
    speed_reasoning: "Cast iron machines well but is abrasive due to graphite inclusions. Speed range 80-250 m/min. The graphite acts like tiny grinding particles. Use wear-resistant grades (Al₂O₃ coated or ceramic).",
    feed_reasoning: "Cast iron produces short, broken chips naturally (graphite acts as chip breaker). Feed can be moderate — chip evacuation is rarely an issue.",
    coolant_reasoning: "Dry is preferred! Cast iron dust + coolant creates abrasive sludge that accelerates wear. Use air blast for chip/dust clearing.",
    common_mistakes: ["Using flood coolant (creates abrasive sludge)", "Not using wear-resistant grade", "Ignoring dust health hazard (respiratory protection needed)"],
  },
};

// ─── Challenge Exercises ─────────────────────────────────────────────────────

const CHALLENGES: ChallengeExercise[] = [
  {
    challenge_id: "CH-001", difficulty: "beginner", lesson_ref: 1,
    scenario: "A machinist is running a 10mm carbide endmill in 304 stainless at 8000 RPM.",
    symptoms: ["Tool turns blue after 2 minutes", "Edge crumbles within 5 minutes"],
    question: "What's the cutting speed and what's wrong?",
    answer: "Vc = π × 10 × 8000 / 1000 = 251 m/min. This is FAR too fast for stainless (max ~180 m/min). The tool is overheating. Reduce RPM to ~4500 for Vc ≈ 140 m/min.",
  },
  {
    challenge_id: "CH-002", difficulty: "beginner", lesson_ref: 2,
    scenario: "A 4-flute endmill at 6000 RPM with feed rate 200 mm/min in steel.",
    symptoms: ["Tool wearing out fast", "Chips are powder-like", "Surface has rubbing marks"],
    question: "Calculate the chip load. What's the problem?",
    answer: "fz = 200 / (6000 × 4) = 0.0083 mm. This is WAY below minimum chip thickness (~0.02mm). The tool is rubbing, not cutting. Increase feed to at least 480 mm/min (fz = 0.02mm), preferably 1200 mm/min (fz = 0.05mm).",
  },
  {
    challenge_id: "CH-003", difficulty: "intermediate", lesson_ref: 11,
    scenario: "Finishing a shaft with a turning insert having nose radius R = 0.8mm at fz = 0.15 mm/rev.",
    symptoms: ["Ra measures 1.2 μm", "Spec requires Ra ≤ 0.8 μm"],
    question: "Is the measured Ra consistent with theory? What would you change?",
    answer: "Ra_theoretical = 0.15² / (32 × 0.8) = 0.022 / 25.6 = 0.00088 mm = 0.88 μm. The measured 1.2 μm is worse than theoretical, suggesting vibration or tool wear. But the theoretical is already above spec for a target of 0.8 μm (needs fz_max = √(32 × 0.8 × 0.0008) = 0.143 mm). Reduce fz to 0.12 mm/rev to get Ra_th = 0.56 μm, leaving margin for real-world effects.",
  },
  {
    challenge_id: "CH-004", difficulty: "advanced", lesson_ref: 14,
    scenario: "A tool-holder system has natural frequency fn = 1200 Hz. You're using a 3-flute endmill.",
    symptoms: ["Chatter at 8000 RPM with 2mm DOC"],
    question: "Calculate the first stability pocket RPM. Would changing to this RPM help?",
    answer: "First lobe (N=1): RPM = 60 × 1200 / (1 × 3) = 24000 RPM. That's too fast for most machines. Second lobe (N=2): 12000 RPM. Third lobe (N=3): 8000 RPM — that's where you ARE, so you're at a lobe BOUNDARY (unstable). Try N=2.5: 60 × 1200 / (2.5 × 3) = 9600 RPM. This puts you between lobes where the stable DOC is higher.",
  },
  {
    challenge_id: "CH-005", difficulty: "intermediate", lesson_ref: 12,
    scenario: "An 8mm endmill with 50mm stick-out is cutting a deep pocket wall. Parts consistently measure 0.04mm undersize.",
    symptoms: ["Undersize on one wall direction only", "Opposite wall is correct", "Roughing passes are fine, problem only on finish pass"],
    question: "Calculate the deflection if the cutting force is 150N. Does it explain the error?",
    answer: "I = π × 8⁴ / 64 = 201 mm⁴. E = 620 GPa for carbide. δ = 150 × 50³ / (3 × 620000 × 201) = 150 × 125000 / (373,860,000) = 0.050 mm. Yes! 0.05mm deflection more than explains the 0.04mm error. Fix: reduce stick-out, use larger diameter tool, or add a spring pass.",
  },
];

// ─── State ───────────────────────────────────────────────────────────────────

let assessmentCounter = 0;
const assessmentHistory: SkillAssessment[] = [];
let knowledgeCounter = 0;
const knowledgeBase: KnowledgeEntry[] = [];

// ─── Functions ───────────────────────────────────────────────────────────────

function explainParameter(params: Record<string, any>): ExplainResult {
  const parameter = params.parameter ?? "cutting_speed";
  const material = (params.material ?? "steel").toLowerCase();
  const value = params.value ?? "";
  const depth = params.depth ?? "standard";

  const matInfo = MATERIAL_EXPLANATIONS[material] ?? MATERIAL_EXPLANATIONS.steel;

  const factors: ExplainFactor[] = [];

  if (parameter === "cutting_speed" || parameter === "vc" || parameter === "rpm") {
    factors.push(
      { factor: "Thermal conductivity", impact: matInfo.thermal_conductivity, physics: matInfo.speed_reasoning },
      { factor: "Key challenge", impact: matInfo.key_challenge, physics: `For ${matInfo.name}, the main concern at the cutting edge is: ${matInfo.key_challenge}` },
    );
    if (depth === "detailed") {
      factors.push({ factor: "Common mistakes", impact: "Knowledge from experienced machinists", physics: matInfo.common_mistakes.join(". ") });
    }
  } else if (parameter === "feed" || parameter === "fz" || parameter === "feed_rate") {
    factors.push(
      { factor: "Chip formation", impact: "Must exceed minimum chip thickness", physics: matInfo.feed_reasoning },
    );
  } else if (parameter === "coolant") {
    factors.push(
      { factor: "Coolant strategy", impact: "Depends on material and operation", physics: matInfo.coolant_reasoning },
    );
  }

  return {
    parameter,
    value: String(value),
    explanation: `For ${matInfo.name}: ${factors.length > 0 ? factors[0].physics : "Follow manufacturer recommendations."}`,
    factors,
    depth,
  };
}

function assessSkills(params: Record<string, any>): SkillAssessment {
  assessmentCounter++;
  const id = `ASM-${String(assessmentCounter).padStart(4, "0")}`;

  const answers = params.answers ?? {};
  const scores: Record<string, number> = {};
  const gaps: string[] = [];
  const recommended: number[] = [];

  // Score each topic area
  const topics = [
    { topic: "cutting_speed", lesson: 1, question: "cutting_speed" },
    { topic: "chip_load", lesson: 2, question: "chip_load" },
    { topic: "tool_selection", lesson: 3, question: "tool_selection" },
    { topic: "chatter", lesson: 4, question: "chatter" },
    { topic: "work_offsets", lesson: 5, question: "work_offsets" },
    { topic: "coolant", lesson: 6, question: "coolant" },
    { topic: "setup_sheet", lesson: 7, question: "setup_sheet" },
    { topic: "toolpath_strategy", lesson: 8, question: "toolpath" },
    { topic: "surface_finish", lesson: 11, question: "surface_finish" },
    { topic: "deflection", lesson: 12, question: "deflection" },
    { topic: "material_behavior", lesson: 13, question: "material" },
  ];

  for (const t of topics) {
    const score = typeof answers[t.question] === "number" ? Math.min(100, Math.max(0, answers[t.question])) : 50; // default 50 if no answer
    scores[t.topic] = score;
    if (score < 60) {
      gaps.push(t.topic);
      recommended.push(t.lesson);
    }
  }

  const total = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;
  const level: SkillLevel = total >= 80 ? "advanced" : total >= 50 ? "intermediate" : "beginner";

  const assessment: SkillAssessment = {
    assessment_id: id,
    level,
    scores,
    gaps,
    recommended_lessons: recommended,
    total_score: Math.round(total),
  };

  assessmentHistory.push(assessment);
  return assessment;
}

function captureKnowledge(params: Record<string, any>): KnowledgeEntry {
  knowledgeCounter++;
  const id = `TK-${String(knowledgeCounter).padStart(4, "0")}`;

  const source = params.source ?? "Anonymous machinist";
  const experience_years = params.experience_years ?? 0;
  const material = params.material ?? "general";
  const topic = params.topic ?? "machining";
  const insight = params.insight ?? "";
  const formalized_rule = params.formalized_rule ?? insight;

  // Simple physics validation
  let physics_validation = "Pending manual review";
  let confidence: "high" | "medium" | "low" = "medium";

  if (material.toLowerCase().includes("aluminum") && insight.toLowerCase().includes("speed") && insight.toLowerCase().includes("low")) {
    physics_validation = "CONFIRMED: Low speed in aluminum causes BUE (Built-Up Edge). Aluminum's high thermal conductivity means it needs high speed to prevent cold-welding.";
    confidence = "high";
  } else if (insight.toLowerCase().includes("coolant") && insight.toLowerCase().includes("milling") && insight.toLowerCase().includes("dry")) {
    physics_validation = "CONFIRMED: Dry milling with insert tools avoids thermal cracking from cyclic heating/cooling.";
    confidence = "high";
  } else if (insight.toLowerCase().includes("stainless") && insight.toLowerCase().includes("feed") && insight.toLowerCase().includes("low")) {
    physics_validation = "CONFIRMED: Low feed in stainless causes rubbing on work-hardened layer, accelerating wear exponentially.";
    confidence = "high";
  } else if (experience_years >= 20) {
    physics_validation = "Source has 20+ years experience. Insight accepted with high confidence pending physics cross-check.";
    confidence = "high";
  } else if (experience_years >= 10) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  const entry: KnowledgeEntry = {
    knowledge_id: id,
    source,
    experience_years,
    material,
    topic,
    insight,
    formalized_rule,
    physics_validation,
    confidence,
    timestamp: new Date().toISOString(),
  };

  knowledgeBase.push(entry);
  return entry;
}

function getChallenge(params: Record<string, any>): ChallengeExercise | { challenges: ChallengeExercise[]; total: number } {
  if (params.challenge_id) {
    const c = CHALLENGES.find(ch => ch.challenge_id === params.challenge_id);
    if (!c) return { challenges: [], total: 0 };
    return c;
  }
  const difficulty = params.difficulty as SkillLevel | undefined;
  const lesson = params.lesson_ref as number | undefined;
  let filtered = CHALLENGES;
  if (difficulty) filtered = filtered.filter(c => c.difficulty === difficulty);
  if (lesson) filtered = filtered.filter(c => c.lesson_ref === lesson);
  return { challenges: filtered, total: filtered.length };
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

/**
 * Actions:
 *   apprentice_explain     — Explain "why" behind a parameter
 *   apprentice_lesson      — Get a specific lesson or list lessons by track
 *   apprentice_lessons     — List all lessons
 *   apprentice_assess      — Assess skill level, identify gaps
 *   apprentice_capture     — Capture tribal knowledge
 *   apprentice_knowledge   — List captured knowledge entries
 *   apprentice_challenge   — Get diagnostic challenge exercises
 *   apprentice_materials   — Get material-specific guidance
 *   apprentice_history     — Get assessment history
 *   apprentice_get         — Get specific assessment by ID
 */
export function apprenticeEngine(action: string, params: Record<string, any>): any {
  switch (action) {
    case "apprentice_explain":
      return explainParameter(params);

    case "apprentice_lesson": {
      const id = params.lesson_id ?? params.id;
      if (id !== undefined) {
        const lesson = LESSONS.find(l => l.id === Number(id));
        if (!lesson) return { error: `Lesson ${id} not found` };
        return lesson;
      }
      const track = params.track as LessonTrack | undefined;
      if (track) {
        const filtered = LESSONS.filter(l => l.track === track);
        return { lessons: filtered, total: filtered.length, track };
      }
      return { lessons: LESSONS, total: LESSONS.length };
    }

    case "apprentice_lessons":
      return {
        tracks: {
          fundamentals: { lessons: LESSONS.filter(l => l.track === "fundamentals").map(l => ({ id: l.id, title: l.title })), count: 7 },
          intermediate: { lessons: LESSONS.filter(l => l.track === "intermediate").map(l => ({ id: l.id, title: l.title })), count: 6 },
          advanced: { lessons: LESSONS.filter(l => l.track === "advanced").map(l => ({ id: l.id, title: l.title })), count: 7 },
        },
        total: LESSONS.length,
      };

    case "apprentice_assess":
      return assessSkills(params);

    case "apprentice_capture":
      return captureKnowledge(params);

    case "apprentice_knowledge":
      return {
        entries: knowledgeBase,
        total: knowledgeBase.length,
        by_confidence: {
          high: knowledgeBase.filter(k => k.confidence === "high").length,
          medium: knowledgeBase.filter(k => k.confidence === "medium").length,
          low: knowledgeBase.filter(k => k.confidence === "low").length,
        },
      };

    case "apprentice_challenge":
      return getChallenge(params);

    case "apprentice_materials": {
      const material = (params.material ?? "").toLowerCase();
      if (material && MATERIAL_EXPLANATIONS[material]) {
        return MATERIAL_EXPLANATIONS[material];
      }
      return {
        materials: Object.keys(MATERIAL_EXPLANATIONS).map(k => ({
          id: k,
          name: MATERIAL_EXPLANATIONS[k].name,
          key_challenge: MATERIAL_EXPLANATIONS[k].key_challenge,
        })),
        total: Object.keys(MATERIAL_EXPLANATIONS).length,
      };
    }

    case "apprentice_history":
      return {
        assessments: assessmentHistory,
        total: assessmentHistory.length,
        knowledge_entries: knowledgeBase.length,
      };

    case "apprentice_get": {
      const id = params.assessment_id ?? params.id ?? "";
      const assessment = assessmentHistory.find(a => a.assessment_id === id);
      if (!assessment) return { error: "Assessment not found", id };
      return assessment;
    }

    default:
      return { error: `ApprenticeEngine: unknown action "${action}"` };
  }
}

// ── Source File Catalog ────────────────────────────────────────────────────
// AUTO-GENERATED from MASTER_EXTRACTION_INDEX_V2.json — 6 LOW-priority extracted JS modules
// that feed into this engine. Used for traceability, safety auditing, and wiring verification.

export const APPRENTICE_SOURCE_FILE_CATALOG: Record<string, {
  filename: string;
  source_dir: string;
  category: string;
  lines: number;
  safety_class: "LOW";
  description: string;
}> = {
  // ── extracted/learning/ (6 files) ──
  "PRISM_LEARNING_ENGINE": { filename: "PRISM_LEARNING_ENGINE.js", source_dir: "learning", category: "learning", lines: 72, safety_class: "LOW", description: "Core learning engine framework" },
  "PRISM_LEARNING_ENGINE_FEEDBACK": { filename: "PRISM_LEARNING_ENGINE_FEEDBACK.js", source_dir: "learning", category: "learning", lines: 399, safety_class: "LOW", description: "Learning engine feedback loop" },
  "PRISM_LEARNING_FEEDBACK_CONNECTOR": { filename: "PRISM_LEARNING_FEEDBACK_CONNECTOR.js", source_dir: "learning", category: "learning", lines: 251, safety_class: "LOW", description: "Learning feedback connector bridge" },
  "PRISM_LEARNING_INTEGRATION_BRIDGE": { filename: "PRISM_LEARNING_INTEGRATION_BRIDGE.js", source_dir: "learning", category: "learning", lines: 255, safety_class: "LOW", description: "Learning system integration bridge" },
  "PRISM_LEARNING_PERSISTENCE_ENGINE": { filename: "PRISM_LEARNING_PERSISTENCE_ENGINE.js", source_dir: "learning", category: "learning", lines: 135, safety_class: "LOW", description: "Learning state persistence engine" },
  "PRISM_LEARNING_RATE_SCHEDULER_ENGINE": { filename: "PRISM_LEARNING_RATE_SCHEDULER_ENGINE.js", source_dir: "learning", category: "learning", lines: 169, safety_class: "LOW", description: "Learning rate scheduling engine" },
};

/** Returns the apprentice source file catalog for introspection and audit. */
export function getApprenticeSourceFileCatalog(): typeof APPRENTICE_SOURCE_FILE_CATALOG {
  return APPRENTICE_SOURCE_FILE_CATALOG;
}
