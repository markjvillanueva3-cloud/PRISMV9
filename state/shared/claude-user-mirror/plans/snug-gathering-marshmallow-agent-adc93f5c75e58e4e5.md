# PRISM v9 Learning Module -- CNC Instructor's Classroom Evaluation

This document is a detailed code review from the perspective of a CNC Programming
Instructor at a community college, evaluating whether PRISM v9's learning subsystem
could support a 16-week CNC course.

---

## Files Reviewed

| # | File | Lines | Purpose |
|---|------|-------|---------|
| 1 | `web/src/pages/LearningDashboard.tsx` | 245 | Top-level dashboard: radar chart, domain bars, achievements, recommendations, quick actions |
| 2 | `web/src/components/learning/Assessment.tsx` | 222 | 4-step skill assessment wizard (domain select, experience, questions, results) |
| 3 | `web/src/components/learning/LearningPath.tsx` | 183 | Personalized module timeline with milestones |
| 4 | `web/src/components/learning/ProgressTracker.tsx` | 197 | Detailed progress: rings, sparklines, per-module status, achievements |
| 5 | `web/src/components/learning/DigitalTwin.tsx` | 236 | Live machine monitoring: gauges, XYZ position, spindle/feed, alerts, history chart |
| 6 | `web/src/components/learning/KnowledgeSearch.tsx` | 232 | Knowledge base and tribal knowledge search with filters and detail modal |
| -- | `web/src/types/learning.ts` | 355 | Full type definitions for all learning API contracts |
| -- | `web/src/hooks/useLearning.ts` | 117 | React hooks wrapping each learning API endpoint |

---

## OVERALL VERDICT

**Could I use this in a classroom today?  Partially -- with significant caveats.**

The foundation is genuinely promising. The four learning domains (CAD, CAM, Shop
Practice, Machine Operation) are a reasonable taxonomy. The progress tracking,
assessment flow, and digital twin monitoring are architecturally sound. But what
exists today is scaffolding, not courseware. A 16-week CNC program demands depth
this system does not yet deliver.

Grade: **C+ as courseware, B+ as infrastructure.**  The plumbing is solid; the
curriculum is thin.

---

## 1. LEARNING PATH vs. INDUSTRY CERTIFICATION (NIMS, Haas)

### What exists

- `LearningPath.tsx` generates a module timeline from a backend `/learning/plan`
  endpoint.  It shows modules, milestones with week numbers, estimated total hours,
  prerequisites, and difficulty levels.
- The four domains -- `cad`, `cam`, `shop_practice`, `machine_operation` -- roughly
  map to the categories you would find in a NIMS credential structure.
- The `PlanRequest` type accepts `target_level`, `available_hours_per_week`, and
  `focus_domains`, which is a good start for individualized learning plans.

### What is missing -- CRITICAL

**No explicit NIMS credential mapping.**  NIMS Level I Milling, Level I Turning,
Level II CNC Milling, etc. each have specific duty/task breakdowns (Duty Areas like
"Job Planning," "CNC Turning Setup and Operation," "Quality Control").  The four
broad domains here do not map to these duty areas at all.  A student working toward
NIMS CNC Milling Operator Level I needs to demonstrate:

- Blueprint reading with GD&T
- Process planning from a print
- CNC setup (work holding, tool setting, offsets)
- CNC operation (first article, in-process inspection)
- Quality measurement (CMM basics, surface finish, go/no-go gauges)

None of these appear as explicit module topics or competency checkpoints.

**No Haas certification alignment.**  The Haas Technical Education Center (HTEC)
curriculum follows a specific sequence: Machine Safety, Control Basics, MDI, Setup,
Tool Offsets, Work Offsets, First Part, Conversational Programming, G-code
Programming, Advanced.  There is no evidence this sequence is encoded anywhere.

**No credential tracking or evidence portfolio.**  NIMS requires documented
performance evidence (setup sheets, inspection reports, process plans).  There is
no mechanism for students to upload artifacts, generate setup sheets, or produce
evidence documents from within the system.

### Recommendation

The `LearningModule` type needs fields like `certification_alignment` (array of
NIMS duty/task codes), `evidence_required` (what artifacts the student must produce),
and `competency_standard` (link to specific NIMS or Haas standard).  Without this,
the learning path is a generic to-do list, not a certification preparation tool.

---

## 2. ASSESSMENT QUALITY

### What exists

`Assessment.tsx` implements a 4-step wizard:
1. Domain selection (pick which of 4 areas to test)
2. Experience level (0 to 10+ years, 6 options)
3. Knowledge questions (multiple choice, 2 per domain)
4. Results with per-domain scores, strengths/weaknesses, recommended focus

The questions themselves (hardcoded in `SAMPLE_QUESTIONS`) cover:
- CAD: GD&T definition, STEP file format identification
- CAM: toolpath lead-in definition, adaptive strategy identification
- Shop Practice: dial indicator usage, chatter causes
- Machine Operation: G43 function, work offset purpose

### Strengths

- The questions are technically accurate. G43 IS tool length compensation on Fanuc.
  The chatter question correctly identifies "unstable cutting conditions" rather than
  blaming the material.
- The 4-step flow is clean UX. Students would not be confused by the interface.
- Results show per-domain strengths and weaknesses, which is useful for advising.

### Critical weaknesses

**Only 8 questions total (2 per domain).**  This is nowhere near sufficient for a
meaningful placement or progress assessment.  A real placement test needs 15-25
questions per domain to reliably distinguish a beginner from an intermediate student.
Two questions per domain gives you at best three possible scores per domain (0%, 50%,
100%).  That is not granular enough for grading or placement.

**All questions are factual recall (Bloom's Level 1: Remember).**  There is nothing
at the application level ("Given this print, what work offset approach would you
use?"), analysis level ("This program has a crash risk -- identify it"), or creation
level ("Write the G-code for this profile").  NIMS assessments require demonstrated
application, not just vocabulary.

**No calculation questions.**  CNC programming is fundamentally mathematical.  Where
are the RPM calculations (RPM = SFM x 3.82 / diameter)?  Feed rate calculations
(Feed = RPM x FPT x flutes)?  Depth of cut decisions?  Trig for bolt hole patterns?
These are the bread and butter of a CNC class, and they are completely absent.

**No image-based questions.**  Real CNC assessment requires reading blueprints,
interpreting GD&T callouts on a drawing, identifying tool geometry from diagrams,
reading coordinate systems from machine schematics.  The assessment is entirely text-
based.

**No timed assessment mode.**  NIMS written tests are timed.  There is no timer, no
test-taking mode, no prevention of going back and changing answers (some certifying
bodies disallow this).

**Questions are hardcoded in the frontend.**  The `SAMPLE_QUESTIONS` constant at lines
23-40 of Assessment.tsx contains the entire question bank.  Students can view-source
to get the answers.  Even without cheating concerns, this means the question bank
cannot grow without a frontend deployment.

### Recommendation

The assessment needs a backend-driven question bank with at least 5 question types:
1. Multiple choice (factual recall)
2. Calculation (student enters a number, system checks tolerance)
3. Ordering/sequencing (put these setup steps in order)
4. Image identification (label this drawing, identify this tool)
5. Code analysis (what does this G-code program do / find the error)

Minimum 20 questions per domain for a placement test, drawn randomly from a pool.

---

## 3. DIGITAL TWIN -- VISUALIZATION UTILITY

### What exists

`DigitalTwin.tsx` provides:
- Machine state display (idle/running/alarm/maintenance)
- Gauge widgets for spindle RPM, feed rate, X/Y/Z position
- Current position in machine coordinates (3-decimal precision)
- Active tool number and program name
- Alert system with severity levels (info/warning/critical) showing parameter,
  value, and threshold
- History chart plotting spindle RPM and load percentage over time
- 5-second auto-refresh capability

### Strengths

- **Alerts with thresholds are genuinely useful for teaching.**  Showing students
  "spindle load hit 87% but threshold is 80%" teaches them what overload looks like
  before they experience it on a real machine.
- **Position display in machine coordinates** reinforces the coordinate system
  concept that students struggle with.
- **History chart** showing RPM vs. load is exactly the kind of data students need
  to learn to interpret for process optimization.

### Weaknesses

**No 3D visualization.**  The "Digital Twin" label implies a 3D model of the machine
showing motion, tool engagement, and material removal simulation.  What exists is a
dashboard of numbers and 2D gauges.  For a student who has never seen a CNC machine,
this does not help them visualize what is happening.  A proper digital twin would
show the tool moving in relation to the workpiece, simulating what they will see
through the machine window.

**No G-code trace / backplot.**  The single most valuable visualization for a CNC
student is seeing G-code become toolpath geometry.  There is no backplot, no toolpath
rendering, no way to step through a program line by line and see what each block does.

**No work/machine coordinate toggle.**  Students notoriously confuse machine
coordinates and work coordinates.  The display only shows position but does not let
students toggle between G53 (machine) and G54-G59 (work) views to build that
understanding.

**No crash detection or "what-if" simulation.**  The `TwinRequest` type has an
`action: "simulate"` option but there is no UI for it.  A simulation mode where
students can dry-run their programs and see "CRASH: tool would hit clamp at X=50.0
Y=-10.0" would be transformative for learning and machine safety.

### Recommendation

Priority additions:
1. WebGL/Three.js 3D viewport showing basic machine geometry and tool motion
2. G-code backplot (2D is fine for a first pass -- plot XY moves as lines/arcs)
3. Coordinate system visualization (show work zero, machine zero, tool offsets)
4. Enable the simulation action with crash/gouge detection feedback

---

## 4. SAFE CALCULATION PRACTICE

### What exists

There is NO dedicated calculation practice component in the six files reviewed.

The `types/learning.ts` file shows `ToolSelectRequest` and `ToolSelectResult` types
that include `recommended_params` with RPM, feed_per_tooth, depth_of_cut, and
width_of_cut.  But these are the machine giving the student an answer, not the
student doing the calculation themselves.

### What a 16-week course needs

Students must be able to:
- Calculate RPM from surface speed and diameter
- Calculate table feed from RPM, feed-per-tooth, and number of flutes
- Calculate material removal rate (MRR)
- Convert between inch and metric
- Calculate tapping speeds (RPM and feed for rigid tapping)
- Determine number of passes from total depth and depth-per-pass
- Calculate interpolated bore paths
- Solve right triangles for chamfers, angles, and bolt patterns

**This is the single biggest gap for classroom use.**  Every CNC class I have taught
spends the first 3-4 weeks heavily on these calculations.  Students need to practice
them repeatedly with immediate feedback.  The system has a SFC (Speeds/Feeds
Calculator) page elsewhere, but there is no "practice mode" where students solve
problems and get graded.

### Recommendation

Add a `CalculationPractice` component with:
- Problem generator (random but realistic parameters: "You are milling 6061-T6 with
  a 0.500" 3-flute endmill.  Manufacturer recommends 800 SFM and 0.003 FPT.
  Calculate RPM and table feed.")
- Student input fields for their answers
- Tolerance-based grading (accept RPM within +/- 5% of correct answer)
- Step-by-step solution reveal after submission
- Running score/history per student

---

## 5. THEORY-TO-PRACTICE BRIDGE

### What exists

- The four learning domains (CAD, CAM, Shop Practice, Machine Operation) attempt to
  span the theory-practice spectrum.
- Tribal Knowledge search (KnowledgeSearch.tsx) with its `source_operator`, `verified`,
  and `upvotes` fields explicitly captures shop-floor experience.
- Material selection and tool selection wizards (hooks exist, UI presumably elsewhere)
  bridge material science theory with practical tool choice.

### What is missing

**No lab worksheet generation.**  In a real class, I assign a blueprint, students do
process planning (operation sequence, tool list, speeds/feeds), then write the program,
then run it.  There is no mechanism to generate or assign a project that connects the
learning modules to a hands-on lab activity.

**No program editor or simulator.**  Students need to write G-code somewhere and see
the result.  The Digital Twin is read-only monitoring.  There is no code editor with
syntax highlighting for G-code, no DNC-style upload simulation, no way to "run" a
student program against the digital twin.

**No fixture/setup planning tool.**  Choosing how to hold the part is arguably the
hardest skill for beginners.  The `FixtureSelector` component exists in the SFC area
(`web/src/components/sfc/FixtureSelector.tsx` per git status) but it is not
integrated into the learning path.

**No connection between assessment results and lab assignments.**  If a student
scores low on "Machine Operation" in the assessment, there is no automatic assignment
of remedial lab exercises specific to their weakness.

---

## 6. INTERACTIVE EXERCISES vs. PASSIVE READING

### Current state: mostly passive

Reviewing all six components, the interactive elements are:
1. Assessment quiz (8 multiple-choice questions)
2. Knowledge search (type and read)
3. Domain selection in assessment and learning path
4. Digital twin refresh button and auto-refresh toggle

**There are no interactive exercises.**  No drag-and-drop, no "arrange these setup
steps in order," no "identify the error in this G-code block," no "match the G-code
to the toolpath," no "click on the workpiece where you would set your work zero."

The Knowledge Search is essentially a read-only reference library.  Valuable, but
not an exercise.  The Learning Path is a to-do list to check off, not a series of
interactive lessons.

### What interactive learning looks like in CNC education

- **G-code tracing exercises**: Given a program, predict the final part geometry
- **Error finding**: "This program has 3 errors. Find them." with an in-browser
  G-code editor
- **Drag-and-drop sequencing**: Put these machining operations in the correct order
  (rough, semi-finish, finish, chamfer, deburr)
- **Virtual machine panel**: Click the correct buttons in the correct order to home
  the machine, set tool length, set work offset, start program
- **Blueprint interpretation**: Given a drawing, fill in the coordinate table for
  all features

---

## 7. STUDENT PROGRESS TRACKING FOR GRADING

### What exists

`ProgressTracker.tsx` and the underlying `ProgressResult` type provide:
- Overall completion percentage
- Per-module status (not_started / in_progress / completed)
- Per-module completion percentage and optional score
- Per-module time spent (minutes)
- Domain-level completion percentage
- Streak days and total hours
- Achievement system with timestamps

### Strengths for grading

- **Per-module scores are recorded** (`score?: number` on `ModuleProgress`).  An
  instructor could extract these.
- **Time tracking** is built in.  I can see how long a student spent on each module.
- **Domain progress rollup** gives me a quick view of where each student stands
  across the four areas.
- **Completion timestamps** (`completed_at`) let me verify deadlines.

### Weaknesses for grading

**No instructor dashboard.**  Everything is student-facing.  There is no view where
I can see all 24 students in my section side by side, sort by lowest score, or
export grades to CSV for my LMS (Canvas, Blackboard).

**No grade export / LTI integration.**  Community colleges universally use an LMS.
Without LTI (Learning Tools Interoperability) or at minimum a CSV export of
student_id + module + score + timestamp, I am manually transcribing grades.  That
is a dealbreaker for any course with more than 10 students.

**No rubric-based grading.**  The score is a single number.  There is no rubric
breakdown ("Setup procedure: 8/10, Program accuracy: 7/10, Surface finish achieved:
9/10").  NIMS performance evaluations use detailed rubrics.

**No assignment/due-date system.**  The learning path has milestones with week numbers
but no hard due dates, no late penalty logic, no submission workflow.

**`operator_id` is optional on all requests.**  In a classroom setting, student
identity must be mandatory and tied to an enrollment roster.  The current system
would let anonymous users take assessments.

---

## 8. WHAT IS MISSING FOR A 16-WEEK CNC COURSE

Mapping to a typical 16-week CNC Milling course:

| Week | Topic | PRISM Coverage |
|------|-------|----------------|
| 1 | Shop safety, machine overview | None (no safety module) |
| 2 | Coordinate systems, machine axes | Partial (Twin shows position) |
| 3-4 | Speeds & feeds calculations | Missing from learning module (SFC exists separately) |
| 5 | Blueprint reading, GD&T basics | 1 assessment question only |
| 6 | Workholding, fixture selection | FixtureSelector exists but not in learning path |
| 7 | Tool selection, tool geometry | Tool select wizard exists, not in learning path |
| 8 | Work offsets, tool offsets | 1 assessment question only |
| 9-10 | G-code programming (linear, circular) | No G-code editor or exercises |
| 11 | Canned cycles (drilling, tapping) | No coverage |
| 12 | Subprograms, loops | No coverage |
| 13 | CAM programming basics | Domain exists, no exercises |
| 14 | First article inspection, quality | No coverage |
| 15 | Process optimization | Twin history chart is a start |
| 16 | Final project, NIMS prep | No exam mode, no credential tracking |

**Coverage: roughly 3 of 16 weeks have meaningful tooling.  13 weeks are unsupported.**

---

## 9. CODE QUALITY NOTES

Since I am also a code reviewer, not just an instructor:

### Strengths
- Clean TypeScript throughout, no `any` types visible
- Consistent component structure across all 6 files
- Proper abort controller handling in the hooks layer (lines 41-54 of useLearning.ts)
- SVG visualizations (radar chart, gauges, sparklines) are hand-rolled and lightweight
  -- no heavy charting library dependency
- Accessible modal in KnowledgeSearch (role="dialog", aria-modal, keyboard escape)

### Issues
- **Assessment answers visible in source**: `SAMPLE_QUESTIONS` at Assessment.tsx:23-40
  is a client-side constant.  Any student who opens DevTools can see every correct
  answer.  The correct answers are always the first option in each array.  This is
  trivially exploitable.
- **Radar chart only works for exactly 4 domains**: The `RadarChartSVG` component
  uses `angleStep = (2 * Math.PI) / domains.length` which works, but visually a
  4-pointed radar chart is just a rotated square.  It would look better as a bar
  chart at this cardinality.  A radar chart shines with 6+ dimensions.
- **No pagination on knowledge search results**: Limited to 20 results by default
  with no "load more" or pagination.  For a knowledge base that should grow to
  hundreds of entries, this will become a problem.
- **Digital Twin history chart has no axis labels**: The SVG chart at DigitalTwin.tsx
  lines 59-81 shows RPM and Load% but has no Y-axis scale, no X-axis timestamps.
  Students would not know what the actual values are.

---

## 10. SUMMARY OF RECOMMENDATIONS

### Must-have for classroom adoption (blocking)

1. **Backend-driven question bank** with 20+ questions per domain, randomized, with
   calculation and image-based question types
2. **Speeds and feeds calculation practice module** with problem generation, student
   input, tolerance-based grading, and step-by-step solutions
3. **Instructor dashboard** showing all enrolled students, their scores, time spent,
   and completion status, with CSV/LTI grade export
4. **G-code editor with backplot** -- even a 2D XY plot of toolpath moves would be
   enormously valuable
5. **Mandatory student identity** tied to enrollment, not optional operator_id

### Should-have for effective teaching (important)

6. NIMS duty/task alignment metadata on each learning module
7. Rubric-based scoring with multiple criteria per assessment
8. Assignment/due-date system with late penalties
9. Interactive exercises (sequencing, error finding, virtual panel)
10. 3D digital twin visualization with basic material removal simulation

### Nice-to-have for differentiation (value-add)

11. Crash detection simulation ("your tool will hit the vise at line 47")
12. Artifact upload for NIMS evidence portfolios
13. Peer review system for student G-code programs
14. Integration with Haas NGC simulator or similar
15. Tribal knowledge contribution by students (moderated)

---

## BOTTOM LINE

As a CNC instructor, I see genuine promise in PRISM's learning architecture.  The
type system is well thought out -- the `ToolRecommendation` type with its
`recommended_params` object containing RPM, feed_per_tooth, depth_of_cut, and
width_of_cut tells me the developers understand machining.  The tribal knowledge
concept with operator attribution and verification is something I have not seen in
any competing educational tool.

But I cannot adopt this for a 16-week course today.  The assessment is too shallow
(8 questions, all recall), there are no interactive exercises, no G-code editing
environment, no calculation practice, and no instructor-facing tools for managing
a class of 24 students.  The digital twin is a monitoring dashboard, not the
immersive simulation the name implies.

The system is roughly 30% of what I would need.  The 30% that exists is well-built.
The 70% that is missing is where students would actually spend their lab hours.
