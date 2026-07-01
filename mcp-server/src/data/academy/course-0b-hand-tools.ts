/**
 * Course 0B: Hand Tools & Measurement
 * Level: Novice (absolute beginner) | 10 Modules | ~8 hours
 *
 * Every tool and instrument in the shop — from wrenches to
 * micrometers. Visual identification + hands-on measurement skills.
 */

import type { Module, Lesson, Question } from
  "../../engines/CurriculumEngine.js";

const CID = "course-0b";

const lessons: Record<number, Lesson[]> = {
  1: [{ id: `${CID}-m1-l1`, moduleId: `${CID}-mod-1`, title: "Common Hand Tools", order: 1, content: [{ type: "text",
    body: `# Common Hand Tools

## Wrenches
- **Box-end** — fully enclosed, won't slip. Use for tight fasteners.
- **Open-end** — open jaw, faster but can slip. Use for accessible bolts.
- **Combination** — box on one end, open on the other. Most common.
- **Allen/hex key** — for socket head cap screws (SHCS). Sizes: 1.5-19mm.
- **Torque wrench** — click or digital. ALWAYS use on collet nuts, ER nuts, vise bolts. Under-torque = tool pullout. Over-torque = damaged threads.

## Screwdrivers
- **Phillips** (#1, #2, #3) — cross pattern. #2 is most common.
- **Flat/slotted** — for set screws, adjustments. Match width exactly.
- **Torx** (T10-T55) — star pattern. Common on modern machine screws.

## Hammers
- **Ball-peen** — metal, for striking punches and drift pins.
- **Dead-blow** — sand-filled, won't bounce. For seating fixtures.
- **Brass/copper** — soft, won't damage finished surfaces. For tapping parts into position.
- **NEVER use a steel hammer on a finished part** — it will leave marks.

## Pliers & Cutters
- **Needle-nose** — for small parts, wire, O-rings.
- **Channel-locks** — adjustable jaw for round stock, fittings.
- **Wire cutters/diagonal** — cutting safety wire, zip ties.

## Other Essentials
- **Deburring tool** — removes sharp edges after machining. Use on every part!
- **Files** — flat, half-round, triangle. For hand-finishing edges.
- **Tap handles** — T-handle and straight. For hand-tapping threads.
- **Edge finder** — for locating work zero on the mill (covered in Course 3).` }] }],

  2: [{ id: `${CID}-m2-l1`, moduleId: `${CID}-mod-2`, title: "Reading a Tape Measure", order: 1, content: [{ type: "text",
    body: `# Reading a Tape Measure

## Imperial Tape (Inches)

Each inch is divided into fractions:
- **Longest marks** = inches (1, 2, 3...)
- **Next longest** = 1/2 inch
- **Next** = 1/4 inch
- **Next** = 1/8 inch
- **Shortest marks** = 1/16 inch (some tapes go to 1/32)

**Reading technique:**
1. Count the whole inches
2. Count the 1/16" marks past the last inch
3. Reduce the fraction: 12/16 = 3/4

**Example**: The mark is at 3 whole inches plus 6 small marks past.
6/16 = 3/8, so the reading is **3-3/8"**

## Metric Tape (mm)

Much simpler — every small mark is 1mm:
- **Numbered marks** = centimeters (10mm)
- **Each small mark** = 1mm
- Read directly: 47mm, 123mm, etc.

## Common Mistakes
- **Not hooking properly** — the hook slides for inside/outside compensation. Don't bend it.
- **Parallax** — look straight down at the mark, not at an angle.
- **Tension** — pull firm but don't stretch the tape (metal tapes stretch under heavy tension).
- **Measuring from the end** — for precision, measure from the 1" mark and subtract 1".` }] }],

  3: [{ id: `${CID}-m3-l1`, moduleId: `${CID}-mod-3`, title: "Calipers — Your Most-Used Instrument", order: 1, content: [{ type: "text",
    body: `# Calipers — Dial & Digital

## Parts of a Caliper
- **Fixed jaw** — doesn't move (reference surface)
- **Movable jaw** — slides along the beam
- **Depth rod** — extends from the end (for depth measurement)
- **Step** — the back of the jaws (for step/shoulder measurement)
- **Beam** — the scale (graduated in mm or inches)
- **Thumb wheel** — for fine adjustment
- **Lock screw** — holds position while you read

## 4 Types of Measurement

1. **Outside** — use the large jaws. Diameter, width, thickness.
2. **Inside** — use the small jaws (top). Bore diameter, slot width.
3. **Depth** — use the depth rod. Pocket depth, step height.
4. **Step** — use the back of the jaws. Shoulder height.

## Reading a Dial Caliper (0.001")
1. Read the main scale (beam): whole inches + 0.100" marks
2. Read the dial: each mark = 0.001"
3. Add them: beam + dial = measurement

**Example**: Beam reads 1.4", dial reads 37 → **1.437"**

## Digital Calipers
Just read the screen! But:
- **Zero it** before every measurement session (close jaws, press ZERO)
- **Battery** — change when display gets dim (CR2032)
- **Don't get coolant on it** — electronics and cutting fluid don't mix

## Caliper Accuracy
- Typical accuracy: **±0.02mm (±0.001")**
- Resolution: 0.01mm or 0.001"
- For tighter tolerance → use a micrometer` }] }],

  4: [{ id: `${CID}-m4-l1`, moduleId: `${CID}-mod-4`, title: "Micrometers — Precision Measurement", order: 1, content: [{ type: "text",
    body: `# Micrometers

## Why Micrometers?
Calipers: ±0.02mm. Micrometers: **±0.002mm** (10× more precise).

Use micrometers when the tolerance is tighter than ±0.01mm.

## Parts
- **Frame** — C-shaped body (sized: 0-25mm, 25-50mm, 50-75mm, etc.)
- **Anvil** — fixed measuring face
- **Spindle** — moves when you turn the thimble
- **Thimble** — the rotating part you turn
- **Barrel/sleeve** — stationary scale behind the thimble
- **Ratchet stop** — click mechanism for consistent measuring force

## Reading an Outside Micrometer (Metric)

1. **Barrel**: read the mm line visible = X.X mm
2. **Half-mm**: if the 0.5mm line is visible, add 0.5
3. **Thimble**: read the line aligned with the barrel centerline = 0.XX mm
4. **Add all three**: barrel + half-mm + thimble

**Example**: Barrel shows 7mm, half-mm line visible, thimble reads 23
Reading = 7 + 0.5 + 0.23 = **7.73mm**

## The Ratchet Stop Rule
**ALWAYS use the ratchet stop** — never tighten by the thimble alone. The ratchet applies consistent force (5-10N). Without it, you'll get different readings every time.

## Care & Handling
- **Never drop a micrometer** — even a short fall ruins calibration
- **Clean the faces** before every measurement (fingerprints = errors)
- **Store in the case** with faces slightly open (prevents corrosion)
- **Check zero** — close on nothing, should read 0.000 (±0.002)
- If zero is off → adjust using the spanner wrench on the barrel` }] }],

  5: [{ id: `${CID}-m5-l1`, moduleId: `${CID}-mod-5`, title: "Height Gauges & Indicators", order: 1, content: [{ type: "text",
    body: `# Height Gauges & Indicators

## Dial Indicator (DTI — Dial Test Indicator)
Measures **relative movement**, not absolute dimensions.

**Uses**: checking runout, aligning vises, indicating parts, checking flatness.

### Types
- **Plunger type** (0.001" or 0.01mm resolution) — straight push
- **Test indicator** (0.0005" or 0.002mm) — lever action, higher precision

### How to Use
1. Mount on magnetic base or indicator holder
2. Bring probe into contact with surface
3. Rotate dial to set zero
4. Move the part/table — watch the needle
5. The needle shows deviation from zero

### Reading Indicators
- Each small division = 0.001" (plunger) or 0.0005" (test)
- One full revolution = 0.100" (plunger) or 0.020" (test)
- Clockwise = surface moving toward probe
- Counter-clockwise = surface moving away

## Height Gauge
Precision measurement of height from a surface plate.

- Resolution: 0.01mm or 0.001"
- Used with a surface plate (granite flat reference)
- Can also scribe layout lines on parts

## Magnetic Base
- Holds indicators on any steel surface
- ON/OFF switch for the magnet
- Articulating arm for positioning
- **Tip**: Position the indicator so the probe is at 90° to the surface` }] }],

  6: [{ id: `${CID}-m6-l1`, moduleId: `${CID}-mod-6`, title: "Gauge Blocks & Pin Gauges", order: 1, content: [{ type: "text",
    body: `# Gauge Blocks & Pin Gauges

## Gauge Blocks (Jo Blocks)
Ultra-precise steel or ceramic blocks with known dimensions.

- **Accuracy**: Grade 0 = ±0.05µm, Grade 1 = ±0.1µm, Grade 2 = ±0.25µm
- **Wringing**: blocks stick together by molecular attraction when slid together
- **Sets**: 81-piece or 112-piece covers any dimension in 0.001mm steps

### How to Wring Gauge Blocks
1. Clean blocks with lint-free cloth and solvent
2. Place blocks at 90° angle, flat surfaces touching
3. Slide one across the other while pressing gently
4. They "wring" — stick together with no visible gap
5. Stack blocks to build any dimension

### Uses
- Setting micrometers to a known standard
- Setting height gauges
- Checking machine accuracy
- Setting sine bars for angle measurement

## Pin Gauges (Go/No-Go)
Precision ground pins for checking hole sizes.

- **Go gauge** = minimum acceptable diameter. Must fit in the hole.
- **No-Go gauge** = maximum acceptable diameter. Must NOT fit.
- If Go fits and No-Go doesn't → **GOOD PART**
- If Go doesn't fit → hole too small (undersize)
- If No-Go fits → hole too big (oversize)

## Thread Gauges
- **Thread pitch gauge**: fan of thin blades with different pitches. Match to unknown thread.
- **Thread ring gauge**: Go and No-Go rings for external threads.
- **Thread plug gauge**: Go and No-Go plugs for internal threads.` }] }],

  7: [{ id: `${CID}-m7-l1`, moduleId: `${CID}-mod-7`, title: "Surface Plates & Layout", order: 1, content: [{ type: "text",
    body: `# Surface Plates & Layout

## The Surface Plate
A granite slab that is **perfectly flat** — the reference for all precision measurement.

- **Material**: Black granite (stable, won't rust, holds temperature)
- **Accuracy**: Grade A = ±0.003mm over 600mm, Grade B = ±0.005mm
- **Care**: NEVER strike, drag tools, or place hot parts on it. Clean with granite cleaner.

## Layout Tools
Before CNC, machinists drew lines on the workpiece to guide manual cutting. Layout is still used for:
- Checking rough castings for sufficient stock
- Marking witness lines for setup alignment
- Scribing hole positions for manual drilling

### Layout Process
1. Clean part and apply **layout dye** (Dykem blue)
2. Let dry (30 seconds)
3. Use **height gauge** to scribe horizontal lines
4. Use **V-blocks** to hold round parts
5. Use **scriber** to scratch dimension lines
6. Use **dividers** to swing arcs/circles
7. Use **center punch** to mark hole centers

## V-Blocks
Hold round parts for layout or inspection. Come in matched pairs. The V-groove centers the round part automatically.

## Angle Plates
L-shaped cast iron blocks. Bolt parts to them for layout or machining at 90° to the table.` }] }],

  8: [{ id: `${CID}-m8-l1`, moduleId: `${CID}-mod-8`, title: "Thread Identification", order: 1, content: [{ type: "text",
    body: `# Thread Identification

## Thread Types

### Unified (Inch)
- **UNC** (Unified National Coarse): 1/4-20 UNC = 1/4" diameter, 20 threads per inch
- **UNF** (Unified National Fine): 1/4-28 UNF = 1/4" diameter, 28 TPI

### Metric
- **M10×1.5** = 10mm diameter, 1.5mm pitch (distance between threads)
- **M10×1.0** = fine thread (smaller pitch)

### Pipe
- **NPT** (National Pipe Taper): tapers 1°47' for seal. Sizes: 1/8, 1/4, 3/8, 1/2...
- **BSPT** (British Standard Pipe Taper): same concept, different angle

## Identifying Unknown Threads

1. **Measure major diameter** with calipers
2. **Check pitch** with thread pitch gauge (fan of blades — find one that fits perfectly)
3. **For inch**: count threads per inch with a ruler
4. **For metric**: measure distance between crests in mm = pitch
5. **Cross-reference** the diameter + pitch with a thread chart

## Tap Drill Chart (Critical Knowledge)

The tap drill is the hole you drill BEFORE tapping:

| Thread | Tap Drill | Hole Size |
|--------|-----------|-----------|
| M3×0.5 | 2.5mm | ⌀2.5 |
| M4×0.7 | 3.3mm | ⌀3.3 |
| M5×0.8 | 4.2mm | ⌀4.2 |
| M6×1.0 | 5.0mm | ⌀5.0 |
| M8×1.25 | 6.8mm | ⌀6.8 |
| M10×1.5 | 8.5mm | ⌀8.5 |
| M12×1.75 | 10.2mm | ⌀10.2 |
| 1/4-20 | #7 (0.201") | ⌀5.1mm |
| 5/16-18 | F (0.257") | ⌀6.5mm |
| 3/8-16 | 5/16 (0.313") | ⌀7.9mm |

**Rule of thumb (metric)**: Tap drill ≈ diameter - pitch` }] }],

  9: [{ id: `${CID}-m9-l1`, moduleId: `${CID}-mod-9`, title: "Material Identification", order: 1, content: [{ type: "text",
    body: `# Material Identification

## Visual Identification
- **Steel** — dark gray, magnetic, heavy. Most common in shops.
- **Stainless steel** — similar to steel but slightly shinier. Some grades non-magnetic (304).
- **Aluminum** — silver-white, light weight, non-magnetic. Scratches easily.
- **Brass** — gold/yellow color, heavy, non-magnetic. Used for fittings.
- **Copper** — reddish-orange, heavy, non-magnetic. Very soft.
- **Titanium** — medium gray, lightweight but strong. Darkens when heated.
- **Cast iron** — dark gray/black, grainy fracture surface, brittle.

## Spark Test
Grind a corner on a bench grinder and observe the sparks:
- **Carbon steel** — bright yellow sparks, many forks
- **Stainless steel** — shorter, redder sparks, fewer forks
- **Cast iron** — red sparks, very few forks
- **Aluminum** — no sparks (melts instead)
- **Titanium** — brilliant white sparks

## Magnet Test
- **Magnetic** = ferritic steel, most carbon/alloy steel, 400-series stainless
- **Non-magnetic** = aluminum, brass, copper, titanium, 300-series stainless

## Weight/Feel Test
Hold same-size pieces:
- Aluminum feels **surprisingly light** (density 2.7)
- Steel feels **normal** (7.85)
- Brass/copper feels **heavy** (8.5)
- Titanium feels like **heavy aluminum** (4.43)

## Material Certificates
In aerospace/medical, every piece of material comes with a **mill certificate** (cert) showing:
- Exact alloy and temper (e.g., 7075-T6)
- Heat/lot number (traceability)
- Mechanical properties (tensile, yield, hardness)
- Chemistry (% of each element)
**Never machine without checking the cert for critical work.**` }] }],

  10: [{ id: `${CID}-m10-l1`, moduleId: `${CID}-mod-10`, title: "Inspection Reports", order: 1, content: [{ type: "text",
    body: `# Inspection Reports

## First Article Inspection (FAI)
The first part from a new setup is measured comprehensively:
- Every dimensioned feature on the drawing
- Record actual measurement vs nominal ± tolerance
- Mark GO (within tolerance) or NO-GO

## AS9102 (Aerospace Standard)
Three forms:
- **Form 1**: Part information (part number, revision, material, quantity)
- **Form 2**: Raw material and process documentation
- **Form 3**: Characteristic accountability (every dimension measured)

## CMM Reports (Coordinate Measuring Machine)
Automated 3D measurement. Reports include:
- Feature name and type (diameter, distance, angle, position)
- Nominal value
- Upper/lower tolerance
- Actual measured value
- Deviation from nominal
- **Pass/Fail** flag

### Reading a CMM Report
| Feature | Nominal | Tol+ | Tol- | Actual | Dev | Status |
|---------|---------|------|------|--------|-----|--------|
| Bore ⌀A | 25.000 | +0.013 | +0.000 | 25.008 | +0.008 | PASS |
| Depth B | 10.000 | +0.050 | -0.050 | 10.023 | +0.023 | PASS |
| Position C | 50.000 | ⊕0.050 | — | 0.031 | — | PASS |

## Statistical Process Control (SPC)
Track measurements over many parts:
- **Cp** = process capability (can the process fit in the tolerance?)
- **Cpk** = centered capability (is it centered?)
- **Cp ≥ 1.33** = capable. **Cpk ≥ 1.33** = capable AND centered.
- If Cpk < 1.0 → process is producing defects. **Stop and adjust.**` }] }],

  11: [{ id: `${CID}-m11-l1`, moduleId: `${CID}-mod-11`, title: "Citation Discipline — Metrology Edition", order: 1, content: [{ type: "text",
    body: `# Citation Discipline — Metrology & Inspection

**Prerequisite:** Modules 1-10 of this course (you should already use the instruments being cited).
**Learning objective:** For every measurement claim you make on an inspection report, identify the *standard* that defines acceptance. An uncited measurement is an opinion; an opinion does not survive an audit.
**Assessment:** Pick one tool from your tool crib. Write the calibration standard it traces to. If you cannot, that tool is operating uncertified.

## Why Metrology Needs Citations More Than Most

A speed/feed wrong by 10% wastes a tool. A *measurement* wrong by 10% scrapes a part, fails an audit, or — in aerospace/medical — gets a customer killed. Metrology claims are the hardest-traceability part of the shop, and the citations are the chain that holds the traceability together.

## The Citation Pattern (Metrology Variant)

\`<measurement claim> [traceable to <standard>, <issuing body>, <year/revision>, <clause>]\`

Examples revisiting earlier modules of THIS course with explicit standards:

- **"Micrometer accuracy ±0.002 mm at 20 °C"** [per ASME B89.1.13-2013, *Micrometers* — issuing body: American Society of Mechanical Engineers; clause: accuracy class table.]
- **"Caliper accuracy ±0.02 mm"** [per JIS B 7507:2016, *Vernier, dial and digital callipers* — Japanese Industrial Standards Committee; section on accuracy classes.]
- **"Calibration lab traceability"** [per ISO/IEC 17025:2017, *General requirements for the competence of testing and calibration laboratories* — International Organization for Standardization; clause 6.4 (equipment) + clause 7.6 (measurement uncertainty).]
- **"Go/No-Go thread gauge dimensions"** [per ANSI B47.1 (Unified Inch Screw Threads, gauging system) — or ISO 1502 for metric — issuing body: ANSI / ISO; consult the latest revision.]
- **"Cp/Cpk ≥ 1.33 capability rule"** [per Juran & Gryna, *Quality Control Handbook*, 5th ed., 1999, McGraw-Hill — Section 22 (Process Capability). PRISM dispatcher reference: \`SPCProcessCapability\` engine.]
- **"Mill certificate traceability for critical work"** [per AS9100D (aerospace) clause 8.5.2 (Identification & Traceability) — or ISO 9001:2015 clause 8.5.2 for general industry — issuing body: SAE International / ISO.]
- **"Reference temperature 20 °C for all dimensional measurement"** [per ISO 1:2016, *Geometrical product specifications (GPS) — Standard reference temperature for the specification of geometrical and dimensional properties* — ISO; clause 4.]

## Doctrine vs Technique vs Reference (Metrology Lens)

| Category | In metrology | Examples |
|----------|--------------|----------|
| **Doctrine** | Universal measurement law. Memorize. | Reference temperature = 20 °C · always measure parallel to the dimension axis · Abbe's principle (offset = error) |
| **Technique** | Procedure with the instrument in hand. | Zero a micrometer with a setting block · Sweep a bore with a 2-point bore gauge · Build a stack from gauge blocks |
| **Reference** | Tables and standards that change by instrument/industry. | Calibration intervals per ISO 17025 · Cp/Cpk thresholds per industry · Tolerance class per ANSI/ISO gauge series |

## The Audit Failure Mode

A specific scenario: an aerospace customer issues an SCAR (Supplier Corrective Action Request) because a measurement on a recent FAI couldn't be traced to a calibrated instrument. The instrument was in fact calibrated, but the *certificate* was 13 months old (interval per the shop's QMS = 12). The measurement claim was therefore *uncalibrated by record*, and every part shipped against that FAI is now suspect. This is a real class of finding — preventable only by citing the calibration certificate (number + date + interval) on every report.

**Floor rule:** *every measurement on every report cites the standard the instrument traces to + the calibration certificate that proves it.* The customer doesn't trust your tape measure; they trust the chain.

## Practice (Assessment)

Walk to your tool crib. Pick up any precision instrument (micrometer, caliper, gauge block, bore gauge, height gauge). Find its calibration sticker. Identify:

1. The **standard** the instrument traces to (e.g., ASME B89.1.13).
2. The **certificate number** + issue date.
3. The **next calibration due date**.
4. The **lab** that performed the calibration (must hold ISO 17025 accreditation for the relevant scope).

If any of these is missing → the instrument is **out of certification** and any measurement made with it is uncited. Tag it and report to the calibration coordinator.` }] }],
};

// Quizzes
export const COURSE_0B_QUIZZES: Record<string, Question[]> = {
  [`${CID}-mod-3-quiz`]: [
    {
      id: "c0b-q1", type: "multiple_choice", difficulty: 1,
      text: "You need to check if a bore is exactly 25.000mm ±0.010mm. Which instrument?",
      options: [
        { id: "a", text: "Tape measure", isCorrect: false },
        { id: "b", text: "Digital caliper", isCorrect: false,
          explanation: "Caliper accuracy is ±0.02mm — not precise enough for ±0.01mm" },
        { id: "c", text: "Micrometer or bore gauge", isCorrect: true },
        { id: "d", text: "Ruler", isCorrect: false },
      ],
      explanation: "For ±0.010mm tolerance, you need ±0.002mm accuracy. Only a micrometer or bore gauge provides this.",
      tags: ["measurement", "instrument_selection"],
    },
  ],
  [`${CID}-mod-6-quiz`]: [
    {
      id: "c0b-q2", type: "multiple_choice", difficulty: 2,
      text: "A Go gauge fits in the hole but the No-Go gauge also fits. What does this mean?",
      options: [
        { id: "a", text: "Good part", isCorrect: false },
        { id: "b", text: "Hole is too big (oversize)", isCorrect: true },
        { id: "c", text: "Hole is too small (undersize)", isCorrect: false },
        { id: "d", text: "The gauges are wrong", isCorrect: false },
      ],
      explanation: "If No-Go fits, the hole exceeds maximum size. The part is oversize — scrap or use-as-is decision required.",
      tags: ["measurement", "go_nogo", "quality"],
    },
  ],
  [`${CID}-mod-8-quiz`]: [
    {
      id: "c0b-q3", type: "calculation", difficulty: 2,
      text: "What tap drill size for an M8×1.25 thread?\nRule: tap drill ≈ diameter - pitch",
      correctAnswer: 6.75, tolerance: 3,
      explanation: "M8 - 1.25 = 6.75mm. Standard tap drill is 6.8mm (nearest available).",
      tags: ["threads", "tap_drill"],
    },
  ],
  [`${CID}-mod-11-quiz`]: [
    {
      id: "c0b-q4", type: "multiple_choice", difficulty: 2,
      text: "Your micrometer reads 25.003 mm on a 25.000 mm gauge block. Its calibration sticker shows 14 months since last cal (your QMS calls for 12-month intervals). Can you use this reading on an FAI for aerospace work?",
      options: [
        { id: "a", text: "Yes — the reading is within typical micrometer accuracy (±0.002 mm)", isCorrect: false,
          explanation: "Accuracy alone is not traceability. An aerospace FAI fails without a current calibration certificate." },
        { id: "b", text: "No — instrument is out of calibration interval; any measurement is uncited per ISO 17025", isCorrect: true },
        { id: "c", text: "Yes if you re-zero against the gauge block first", isCorrect: false,
          explanation: "Operator zeroing does not substitute for accredited calibration. The traceability chain to ASME B89.1.13 is broken once the interval lapses." },
        { id: "d", text: "Yes — gauge blocks are themselves a primary standard", isCorrect: false,
          explanation: "Even with a certified gauge block, the *instrument* must hold a current calibration certificate." },
      ],
      explanation: "Citation: ISO/IEC 17025:2017 clause 6.4 (equipment must be within stated calibration interval) + AS9100D clause 8.5.2 (traceability). The reading is plausible but uncited — fix the calibration first, re-measure, then claim PASS on the FAI.",
      tags: ["citation_discipline", "metrology", "calibration", "traceability"],
    },
  ],
};

// Module Assembly
const mk = (i: number, t: string, m: number): Module => ({
  id: `${CID}-mod-${i}`, courseId: CID, title: t,
  description: `${t} — Hand Tools & Measurement`, order: i,
  lessons: lessons[i] ?? [],
  quiz: {
    id: `${CID}-mod-${i}-quiz`, moduleId: `${CID}-mod-${i}`,
    questions: COURSE_0B_QUIZZES[`${CID}-mod-${i}-quiz`] ?? [],
    passingScore: 70,
  },
  estimatedMinutes: m,
});

export const COURSE_0B_MODULES: Module[] = [
  mk(1, "Common Hand Tools", 40),
  mk(2, "Reading a Tape Measure", 35),
  mk(3, "Calipers — Dial & Digital", 50),
  mk(4, "Micrometers", 50),
  mk(5, "Height Gauges & Indicators", 45),
  mk(6, "Gauge Blocks & Pin Gauges", 40),
  mk(7, "Surface Plates & Layout", 35),
  mk(8, "Thread Identification", 50),
  mk(9, "Material Identification", 40),
  mk(10, "Inspection Reports", 45),
  mk(11, "Citation Discipline — Metrology Edition", 35),
];
