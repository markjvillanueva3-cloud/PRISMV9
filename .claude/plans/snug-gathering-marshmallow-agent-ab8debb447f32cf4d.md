# PRISM v9 Educational Design Review
## Manufacturing Education Director Assessment — 7-Point Critique

### Reviewer Credentials Context
This review is written from the perspective of a Manufacturing Education Director at a technical college running NIMS-accredited CNC Machining, Tool & Die, and Manufacturing Technology programs. The evaluation measures PRISM v9 against industry training standards, NIMS credential pathways, and 20+ years of observing how students actually learn machining processes.

---

## 1. Experience Levels: 3-Tier vs. 4-Tier (NIMS Alignment)

### Current Design (3-Tier)
- **Beginner**: Hide CAM, toolpath strategy, tool holder, insert, fixture. Show 5 essential fields only.
- **Journeyman**: Standard 10-field view with tooltips.
- **Master**: All panels visible, no guardrails, compact layout.

### Verdict: The 3-tier split is WRONG for education. Use 4 tiers.

The current Beginner/Journeyman/Master model has a serious gap. A student who just finished their first semester of milling can select materials and operations, but the jump from "5 fields only" to "10 fields with tooltips" skips the entire critical learning phase where students internalize WHY speeds and feeds change -- the relationship between tool diameter, SFM, and RPM; why depth of cut matters for chip load; why coolant type changes with material.

**Recommended 4-Tier Model (NIMS-Aligned):**

| Tier | NIMS Equivalent | Visibility | Educational Purpose |
|------|----------------|------------|-------------------|
| **Novice** | CNC Operator Level I (Setup & Operation) | Material, operation, tool diameter, spindle speed, feed rate -- 5 fields. All other parameters auto-filled with safe conservative defaults. Results show ONLY spindle RPM and table feed. | Learn the cause-effect loop: "I changed the diameter, the RPM changed." No distractions. |
| **Apprentice** | CNC Operator Level II (Setup, Programming & Operation) | Add: depth of cut, width of cut, coolant, tool material, number of teeth -- 10 fields. Results add chip load, MRR, surface finish estimate. Show tooltips on every field. | Learn the physics: chip thinning, engagement angle, why carbide vs HSS matters. This is the semester 2-3 student. |
| **Journeyman** | CNC Specialist (Programming, Setup, Machining) | Add: CAM software, toolpath strategy, cutting priority, tool holder, insert geometry. Results add power consumption, deflection check, tool life estimate. | Integrate process planning: "I chose trochoidal milling, so my WOC dropped but my DOC went up." This is the graduating student or first-year employee. |
| **Master** | CNC Technician / Process Engineer | All panels, no guardrails, compact layout. Add: fixture strategy, multi-operation sequencing, comparison view, cost per part. | Full engineering mode. This is the 5-year veteran or instructor. |

**Why this matters:** NIMS has 4 credential levels (I, II, III, and Specialist/Technician). Your tool should map to these. A student credentialing at Level I should see a Level I interface. A student credentialing at Level III should see parameters they need to understand for the performance exam. The jump from Beginner to Journeyman in the current design skips an entire NIMS credential level worth of knowledge.

**Implementation note:** The Role selector (Step 1 of onboarding) already has "Student." When "Student" is selected, the experience level selector should explicitly reference NIMS levels and show which credential each tier maps to. For non-students (Machinist/Programmer/Shop Owner), the 3-tier naming is fine -- they do not need NIMS framing.

---

## 2. Onboarding Wizard Assessment

### Current Design (4 Steps)
1. Welcome --> Role select (Machinist / Programmer / Shop Owner / Student)
2. Experience level (Beginner / Journeyman / Master)
3. Quick shop setup (add 1-3 machines, select common materials)
4. "Your dashboard is ready" --> route to role-appropriate page

### Verdict: Correct skeleton, but missing critical educational context.

**What is right:**
- Role selection is essential. A Student and a Shop Owner have fundamentally different needs.
- Shop setup (machines + materials) is the right first configuration.
- Routing to a role-appropriate landing page is correct.

**What is missing:**

**A. For the "Student" role, the wizard should ask:**
- What program/course are you in? (Free text or dropdown: "CNC Milling," "CNC Turning," "Manufacturing Technology," "Tool & Die," "Other")
- What semester/year? (1st, 2nd, 3rd, 4th, or "Working Professional")
- What NIMS credentials are you pursuing? (Checklist: Milling I, Milling II, Turning I, Turning II, EDM, Grinding, etc.)
- What machines does your school have? (This replaces the generic "shop setup" step and pre-filters the 13 modes to only show what the student will actually use.)

This matters because: a first-semester CNC Milling student should NEVER see Wire EDM, Plasma, or Broaching tabs. Those are noise. The app should start them on Mill only, with turning and drilling unlocked as they progress.

**B. For all roles, Step 3 should also ask:**
- Unit system preference (Imperial / Metric / Both). This is conspicuously absent. A US community college teaches in Imperial. A European technical school teaches in Metric. The SFC currently shows no unit toggle -- this is a serious gap for any educational deployment.
- Primary material families (Aluminum, Steel, Stainless, Titanium, etc.) to pre-filter the material selector. A first-semester student working mild steel and 6061 aluminum should not be scrolling past Inconel 718 and Waspaloy.

**C. Step 4 should route Students differently:**
- Students should land on a "My Learning Path" dashboard, not the Command Center. The Command Center is for shop managers. A student needs: current assignment, next skill to practice, reference charts, and a link to the PRISM Calculator pre-configured for their current course.

---

## 3. Operation Taxonomy for Teaching

### Current Taxonomy (13 modes shown simultaneously)
Mill, Lathe, Drilling, Boring, Grinding, Honing, Threading, Broaching, Plasma, Wire EDM, Sinker EDM, Laser, Waterjet

### Verdict: The taxonomy is industrially accurate but pedagogically overwhelming.

**The problem:** No manufacturing curriculum teaches all 13 simultaneously. The universal sequence at accredited programs is:

**Semester 1:** Manual Milling + Manual Turning (safety, setup, basic operations)
**Semester 2:** CNC Milling (G-code, conversational, CAM basics)
**Semester 3:** CNC Turning (live tooling, mill-turn if available)
**Semester 4:** Advanced Processes (grinding, EDM, specialty) + NIMS prep

The 3-group taxonomy (Chip Removal / Finishing / Non-Traditional) is correct for industrial organization. But for education, a student should see a PROGRESSIVE UNLOCK:

**Recommended: Mode Visibility by Student Level**

| Student Tier | Visible Modes | Hidden (Locked) |
|-------------|--------------|-----------------|
| Novice (Sem 1) | Mill, Lathe | All others locked with "Complete Milling Fundamentals to unlock" |
| Apprentice (Sem 2-3) | Mill, Lathe, Drilling, Threading | Boring, Grinding, Honing, Broaching, Non-Traditional locked |
| Journeyman (Sem 3-4) | All Chip Removal + Grinding + Threading | EDM, Laser, Waterjet, Plasma locked |
| Master | All 13 modes | Nothing locked |

For non-Student roles (Machinist, Programmer, Shop Owner), all 13 modes should always be visible. The progressive unlock is Student-only.

**Important:** The locked modes should not disappear. They should be visible but grayed out with a lock icon and a one-line explanation of what the process is. This creates curiosity and sets expectations. A first-semester student should be able to tap "Wire EDM" and see a 30-second explanation card with a photo, then see "Unlock at Journeyman level" -- not have it invisible.

---

## 4. Student Mode / Curriculum Feature

### Current Design: No curriculum features exist.

### Verdict: A "Student Mode" is not just desirable -- it is the difference between a professional tool and an educational tool.

**What Student Mode should include:**

**A. Curriculum Tracks (Pre-Built)**
- NIMS Milling Level I Track (8 competencies)
- NIMS Milling Level II Track (10 competencies)
- NIMS Turning Level I Track (8 competencies)
- NIMS Turning Level II Track (10 competencies)
- NIMS Grinding Track
- NIMS EDM Track
- Generic "Intro to CNC" Track (for community colleges without NIMS)

Each track is a sequence of guided exercises using the PRISM Calculator:
- Exercise 1: "Calculate the RPM for a 1/2" HSS end mill in 6061 aluminum at 300 SFM. Use the Novice interface."
- Exercise 2: "Now switch to carbide. What happened to the RPM? Why?"
- Exercise 3: "Add depth of cut = 0.250". What is the chip load? Is this safe for a 2-flute end mill?"

**B. "Challenge Mode" Exercises**
- The app presents a part drawing and material spec.
- The student must select the correct operation, tool, material, and parameters.
- The app grades the answer against the engine's calculation, showing percent deviation.
- Tracks: time to answer, accuracy trend, most-missed concepts.

**C. Instructor Dashboard (Future)**
- Instructor creates a class, assigns exercises, reviews student calculations.
- This is Phase 2 -- but the data model should be designed for it from Sprint 0.

**Minimum Viable Student Mode for Sprint 3:**
- Add a `studentMode: boolean` flag to the OnboardingContext.
- When `studentMode === true`:
  - Show the 4-tier experience level selector with NIMS labels.
  - Lock modes per tier (as described in section 3).
  - Add a "Why?" button next to every calculated result that shows the formula and explains in plain English.
  - Add a "Check My Work" mode where the student enters their hand-calculated RPM/feed and the app tells them if they are correct.

---

## 5. Sub-Operation Terminology Audit

### Methodology
I compared every `subOperation.label` and `operation.label` in `machineModes.ts` and `operations.ts` against: Machinery's Handbook (31st Edition), NIMS Performance Exam terminology, Sandvik Coromant Technical Guide, and standard textbook nomenclature (Kalpakjian & Schmid, "Manufacturing Engineering and Technology").

### Findings by Mode

**MILLING -- Mostly Correct, Two Issues**
- "Face Milling" -- Correct. NIMS and Sandvik standard.
- "Slot Milling" -- Correct. Standard term.
- "Pocket Milling" -- Correct. Universal CAM term.
- "Profile / Contour" -- Acceptable. Sandvik uses "Shoulder Milling" for the straight-wall case and "Contour Milling" for curved. "Profile Milling" is the Mastercam term. Consider showing both: "Profile / Contour (Shoulder Milling)."
- "Semi-Finishing" -- ISSUE. This is a pass type, not an operation type. Semi-finishing is a milling pass with reduced step-over applied to any operation (pocket, profile, etc.). It should not be a peer of "Face Milling." In the taxonomy, it belongs as a parameter modifier (like "Roughing" vs "Finishing" pass), not a standalone operation. For educational purposes, this confuses students into thinking semi-finishing is a separate machine setup, which it is not.
- "Finishing" -- Same issue as Semi-Finishing. These are PASS TYPES, not operations. The operation is still pocket milling or profile milling; the pass type is roughing/semi-finishing/finishing. Recommendation: Remove these as sub-operations and add a "Pass Type" selector (Roughing / Semi-Finishing / Finishing) as a parameter field that modifies DOC, WOC, and feed multipliers.

**TURNING -- Correct**
- "Rough Turning" -- Correct.
- "Finish Turning" -- Correct.
- "Boring" -- Correct (in lathe context).
- "Parting / Grooving" -- Correct. NIMS uses both terms.
- "Facing" -- Correct. Industry standard.
- MISSING: "Threading (Single-Point)" should be a lathe sub-operation because on NIMS Turning Level II, single-point threading is a turning operation, not a separate machine mode. Currently it only appears under the standalone Threading mode. Students will look for it under Lathe and not find it.
- MISSING: "Knurling" -- While not technically a cutting operation, NIMS Turning exams include it, and every turning textbook covers it. It belongs under Lathe.

**DRILLING -- Correct, Well-Organized**
- All 6 sub-operations use standard terminology.
- "Peck Drill" -- Correct. This is the industry term (peck drilling cycle, G73/G83).
- "Gun Drill" -- Correct. Industry term for deep-hole drilling.
- The `through_tool` coolant default for Gun Drill is correct and shows attention to detail.
- MISSING: "Counterboring" and "Countersinking" -- These are hole-making operations covered in NIMS Milling exams. They logically belong under Drilling. A student asked to produce a counterbored hole will look under Drilling and not find it.
- MISSING: "Spot Drill" -- Many shops use spot drills distinct from center drills (different geometry, different purpose). For educational clarity, both should appear. At Novice level, combining them is acceptable.

**BORING (Standalone Mode) -- Correct**
- "Line Boring" -- Correct.
- "Jig Boring" -- Correct.
- "Back Boring" -- Correct.
- "Fine Boring" -- Correct. Also called "Precision Boring" (Sandvik term). Consider labeling "Fine / Precision Boring" for students who encounter both terms.

**GRINDING -- Correct**
- All 5 terms are standard.
- "Creep Feed" -- Correct. Proper industry term (Creep Feed Grinding / CFG).

**HONING -- Correct**
- "Bore Honing" -- Correct.
- "Plateau Honing" -- Correct. Automotive industry term.
- "Cross-Hatch" -- ISSUE. Cross-hatch is the RESULT of honing, not a honing operation. The operation is plateau honing with a specific stone sequence that produces a cross-hatch pattern. This would confuse students into thinking cross-hatch is a separate setup. Recommendation: Rename to "Finish Honing (Cross-Hatch)" or remove and add a note under Bore Honing that the cross-hatch angle is a parameter.

**THREADING -- Correct**
- "Thread Milling" -- Correct.
- "Single-Point Threading" -- Correct.
- "Thread Tapping" -- Redundant with Drilling > Tapping. A student will not know whether to look under Drilling for tapping or Threading for thread tapping. These are the same operation. Recommendation: Keep Tapping under Drilling only, and rename the Threading entry to "Rigid Tapping (CNC)" or remove it to avoid confusion.
- "Thread Rolling" -- Correct. Often overlooked -- good inclusion.

**BROACHING -- Correct**
- All three are standard industry terms.
- "Pot Broaching" -- Good inclusion. Many tools omit this.

**NON-TRADITIONAL (EDM, Laser, Waterjet, Plasma) -- Mostly Correct**
- Wire EDM "First Cut / Skim Cut / Taper Cut" -- Correct. Standard Mitsubishi/Makino/Sodick terminology.
- Sinker EDM "Rough Burn / Finish Burn" -- Correct. Industry standard.
- Sinker EDM "Orbiting" -- Correct. Standard sinker EDM strategy (planetary/vector orbiting).
- Sinker EDM "Micro EDM" -- Acceptable but arguably not a sub-operation; it is a machine capability/scale. A "Micro EDM" on a standard sinker is just a fine burn with small electrodes.
- Laser sub-operations are labeled by LASER TYPE (Fiber, CO2, Disk), not by OPERATION TYPE (cutting, engraving, marking, welding). This is inconsistent with every other mode where sub-operations describe what you DO, not what machine you USE. Recommendation: Change to "Laser Cutting," "Laser Engraving," "Laser Marking," and have the laser type (Fiber/CO2/Disk) be a machine parameter selector.
- Waterjet "Dynamic Waterjet" -- Correct. This is the Flow International term for taper-compensating waterjet. However, many students will not know this brand-specific term. Consider: "Dynamic (Taper-Compensated)" as the label.
- Plasma "HiDef Plasma" -- This is a Hypertherm brand term ("HyDefinition"). Consider "High-Definition Plasma" or "Fine Feature Plasma" for vendor neutrality in educational settings.

---

## 6. NIMS Credential Preparation Assessment

### Verdict: The tool has STRONG potential for NIMS prep but needs deliberate alignment.

**What already supports NIMS:**
- The operation taxonomy covers 80%+ of NIMS performance exam operations.
- The calculation engine (SFM --> RPM, chip load, feed rate, power, deflection) covers the core math tested on NIMS theory exams.
- Material-to-tool-material pairing (HSS vs Carbide vs CBN) is present and correctly parameterized.
- The safety scoring system (visible in `SfcCalculateResult.safety`) could map to NIMS safety questions.

**What is missing for NIMS:**

**A. Unit Handling (CRITICAL)**
NIMS exams are in IMPERIAL units (inches, IPM, SFM, IPR). The current data files use METRIC defaults throughout (tool_diameter: 12 mm, depth: 2 mm, etc.). A US-based student practicing for NIMS needs:
- All defaults in inches (0.500", 0.100" DOC, etc.)
- SFM display, not m/min
- Feed in IPM (in/min) and IPR (in/rev), not mm/min and mm/rev
- A unit toggle must be available on the calculator page, not buried in settings.

**B. NIMS-Specific Formulas Displayed**
NIMS theory exams test whether students can calculate RPM from SFM:
- RPM = (SFM x 12) / (pi x D) [imperial]
- RPM = (Vc x 1000) / (pi x D) [metric]

The "Why?" button I recommended in Section 4 should show these formulas step-by-step with the student's actual numbers plugged in. Example: "RPM = (400 SFM x 12) / (3.14159 x 0.500 in) = 3056 RPM"

**C. NIMS Competency Mapping**
Each sub-operation should carry metadata indicating which NIMS credential it maps to:
- Face Milling --> NIMS Milling Level I, Competency 3
- Rough Turning --> NIMS Turning Level I, Competency 2
- Thread Milling --> NIMS Milling Level II, Competency 8

This lets the Student Mode say: "You are working on NIMS Milling I. Here are the operations you need to master:" and present them in exam order.

**D. Practice Exam Mode**
Provide 10-question timed quizzes that mirror NIMS theory exam format:
- "What is the RPM for a 3/4" end mill at 350 SFM?" [Multiple choice]
- "You are taking a 0.150" DOC with a 4-flute end mill at 0.004 IPT. What is the table feed?" [Calculate]
- Score, track, identify weak areas.

---

## 7. Safety Warnings for a Teaching Tool

### Verdict: The current safety system (`safety.score` and `safety.status` in results) is a start, but a teaching tool needs EXPLICIT, CONTEXTUAL safety education, not just a score.

**Required Safety Warnings (Categorized by Severity):**

### CRITICAL (Red Banner, Cannot Proceed Without Acknowledgment)
1. **Spindle speed exceeds machine max** -- "WARNING: Calculated RPM ({value}) exceeds your machine's maximum spindle speed ({max}). Running at max RPM will result in incorrect surface speed and may cause premature tool failure or part damage. Reduce tool diameter or cutting speed."
2. **Chip load below minimum** -- "WARNING: Chip load ({value} IPT) is below the minimum for this tool ({min} IPT). This causes rubbing instead of cutting, generating excessive heat, work hardening the material, and accelerating tool wear. Increase feed rate or reduce RPM."
3. **Chip load above maximum** -- "WARNING: Chip load ({value} IPT) exceeds the tool manufacturer's maximum ({max} IPT). This will break the tool. Reduce feed rate or increase RPM."
4. **Tool deflection exceeds tolerance** -- "WARNING: Predicted tool deflection ({value}) exceeds {threshold}. The tool will chatter, produce poor finish, and may break. Reduce stickout, increase diameter, or reduce DOC."
5. **Power exceeds machine capacity** -- "WARNING: Required cutting power ({value} kW) exceeds your machine's available spindle power ({max} kW). The spindle will stall. Reduce DOC, WOC, or feed rate."

### HIGH (Orange Warning, Show Explanation)
6. **No coolant selected for deep drilling** -- "Drilling deeper than 3x diameter without coolant risks chip packing, re-cutting, and drill breakage. Enable flood coolant or through-tool coolant."
7. **HSS tool at carbide speeds** -- "You selected HSS tool material but the cutting speed is in the carbide range. HSS cannot sustain {value} SFM in {material}. The tool will overheat and lose hardness. Reduce SFM to {recommended} or switch to carbide."
8. **Through-cut without fixturing warning** -- "Your depth of cut exceeds the stock height. Ensure your fixture allows through-cutting and that the spoilboard or soft jaws can accept the cut-through."
9. **No eye protection reminder** -- First time a Student-mode user runs a calculation: "SAFETY REMINDER: Always wear ANSI Z87.1 rated safety glasses when operating any machine tool. Never operate a machine without proper eye protection."

### MEDIUM (Yellow Info, Tooltip-Level)
10. **SFM outside recommended range** -- "Your cutting speed ({value} SFM) is {X}% {above/below} the recommended range for {material} with {tool_material}. Consider adjusting to {recommended_range} SFM."
11. **Engagement angle > 90 degrees** -- "Tool engagement exceeds 90 degrees. This creates shock loading on entry. Consider climb milling or reducing radial depth."
12. **Tapping without pre-drill sizing** -- "Tapping requires a correctly-sized pre-drilled hole. For M{size} x {pitch}, the tap drill size is {drill_size}."
13. **Interrupted cut warning** -- "Cross-holes or keyways in the bore path create interrupted cuts. Use tougher insert grades (e.g., CVD coated) and reduce feed by 20-30%."

### EDUCATIONAL (Blue Info, "Learn More")
14. **Why chip load matters** -- Expandable panel explaining chip thinning, heat in the chip vs. the workpiece, and the relationship between feed per tooth and insert geometry.
15. **Why climb vs. conventional** -- Explanation triggered when selecting toolpath strategy.
16. **Surface finish prediction** -- "At this feed and nose radius, the theoretical Ra is {value} microinches. To achieve {target} Ra, adjust feed to {recommended}."

### MACHINE-SPECIFIC (Dynamic, Based on Machine Selection)
17. **Rapid rate collision warning** -- "Your approach distance ({value}) at rapid traverse ({rapid_rate} IPM) gives {time}ms to react. On a VMC without a door interlock, maintain at least {min_distance} clearance."
18. **Spindle taper mismatch** -- "You selected a CAT-40 tool holder but your machine uses BT-30. This will not fit."

### Student Mode-Specific Safety
19. **First-run safety quiz** -- Before a Student can use the calculator, present a 5-question safety quiz (machine guards, eye protection, chip handling, emergency stop location, loose clothing). Must score 100% to proceed. This mirrors the shop safety test every program requires before granting machine access.
20. **"Ask Your Instructor" flag** -- For any CRITICAL warning in Student/Novice mode, add a secondary message: "Show these results to your instructor before running this program on the machine."

---

## Summary Assessment

| Area | Score | Notes |
|------|-------|-------|
| Experience Level Design | 6/10 | 3-tier is inadequate for education; 4-tier with NIMS mapping needed |
| Onboarding Wizard | 7/10 | Good skeleton; missing Student-specific flows, unit system, course info |
| Operation Taxonomy | 8/10 | Industrially accurate; needs pedagogical progressive unlock for students |
| Student Mode | 2/10 | Does not exist yet; should be a Sprint 3 priority |
| Terminology Accuracy | 8/10 | Mostly correct; Semi-Finishing/Finishing misclassified, laser sub-ops inconsistent, a few missing operations |
| NIMS Preparation | 5/10 | Calculation engine supports it; lacks imperial defaults, formula display, credential mapping, practice exams |
| Safety Warnings | 4/10 | Safety score exists but no contextual warnings, no student safety gate, no formula-based limit checking displayed to user |

### Top 5 Priority Actions

1. **Add 4-tier experience levels** with NIMS credential mapping when role = Student.
2. **Add unit system toggle** (Imperial/Metric) to onboarding AND calculator header. This is non-negotiable for any US educational deployment.
3. **Reclassify Semi-Finishing and Finishing** from sub-operations to a "Pass Type" parameter.
4. **Build contextual safety warnings** (at least the 5 CRITICAL ones) into the results display.
5. **Add progressive mode unlock** for Student role so they see Mill first, not all 13 tabs.

### Files Reviewed
- `C:\Users\Admin.DIGITALSTORM-PC\.claude\plans\snug-gathering-marshmallow.md` (lines 269-307: Onboarding & Experience design)
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\data\machineModes.ts` (13 modes, 3 groups, 50+ sub-operations)
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\data\operations.ts` (13 categories, 50+ operations with defaults)
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\types\sfc.ts` (calculation request/result types)
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\pages\SfcCalculatorPage.tsx` (page component structure)
