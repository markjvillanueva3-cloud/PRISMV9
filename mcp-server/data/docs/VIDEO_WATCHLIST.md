# PRISM Video Watchlist — Machining Knowledge Pipeline

Master list of machining videos to watch via `/video-learn` and process through `/autopilot` + `/forge-triple` for exhaustive mathematical, statistical, and scientific enrichment of PRISM's speed/feed calculator, post-processor generator, CAM programming, and CNC programming engines.

**Status Legend:** `[ ]` = unwatched, `[x]` = watched+processed, `[~]` = partially processed

---

## CATEGORY 1: Speed & Feed Calculation — Physics, Math, Models

### 1A: Foundational Cutting Theory
- [ ] Sandvik Coromant — "Metal Cutting Technology" training series (full playlist, ~20 videos)
- [x] Sandvik Coromant — "How to Calculate Cutting Speed and Feed" (official formula walkthrough) — extracted: milling/turning/drilling formulas confirmed, added hex chip thinning formula
- [ ] Sandvik Coromant — "Chip Formation and Chip Breaking" (shear plane mechanics)
- [x] Sandvik Coromant — "Cutting Forces and Power" (force models, specific cutting force Kc) — extracted: Kc1.1 confirmed (14 materials), added rake angle correction (1-0.01*gamma0), added kc0.4 turning variant
- [x] Sandvik Coromant — "Tool Wear Mechanisms" (flank, crater, notch, BUE — Taylor model) — extracted: 7 wear mechanisms documented, added VB/KT limits (ISO 3685)
- [x] Sandvik Coromant — "Machinability of Materials" (material groups ISO P/M/K/N/S/H) — extracted: 50-entry ISO_SUBGROUP_KC1 table (P1.1-H2.0), CMC classification, machinability ratings, wear tendencies per group
- [x] Kennametal — "Speeds and Feeds for Milling" (Kc-based approach) — extracted: SFM=(RPM×D)/3.82, feed=RPM×chipload×z. Confirmed existing formulas. No new Kc data (uses same Sandvik-style approach)
- [x] Kennametal — "Speeds and Feeds for Turning" (depth of cut, nose radius effects) — extracted: 2×NR DOC rule, 0.5×NR feed rule, Ra=f²/(32r) confirmed existing. No new formulas
- [ ] Kennametal — "Speeds and Feeds for Drilling" (thrust force, torque calculations)
- [ ] Kennametal — "High-Speed Machining — Physics and Application"
- [ ] Seco Tools — "Material Specific Machining" playlist (ISO groups, chip control)
- [ ] Seco Tools — "Edge Preparation and Cutting Geometry" (hone, chamfer, land — force effects)
- [ ] Walter Tools — "Tiger tec Gold — Cutting Speed vs Tool Life" (Taylor curves demonstrated)
- [ ] Iscar — "Machining Calculator — How to Use" (ITA recommended parameters)
- [ ] Iscar — "Chip Thinning in Milling" (radial engagement + effective chip thickness)
- [ ] Mitsubishi Materials — "Technical Guidance" (speeds & feeds by insert grade)
- [ ] OSG — "Tap Speed and Feed Selection" (thread milling vs tapping S/F)
- [ ] OSG — "End Mill Selection and Application" (flute count, helix angle, S/F relationships)
- [ ] Guhring — "Drilling with Coolant-Through" (MQL vs flood, feed adjustments)

### 1B: Advanced Cutting Models (Merchant, Kienzle, Colding)
- [ ] MIT OCW 2.008 — "Manufacturing Processes" (Merchant's circle, shear angle, Piispanen model)
- [ ] MIT OCW 2.810 — "Manufacturing Processes and Systems" (force modeling, FEA of cutting)
- [ ] Prof. Dr. Liangchi Zhang — "Mechanics of Metal Cutting" (orthogonal cutting, Ernst-Merchant)
- [ ] NPTEL — "Manufacturing Processes" by IIT (Kienzle model derivation, specific force tables)
- [ ] NPTEL — "Metal Cutting and Machine Tools" (chip formation, shear zone, built-up edge)
- [ ] NPTEL — "Advanced Machining Processes" (ultrasonic, EDM, laser — force models)
- [ ] TU Dortmund — "Cutting Force Prediction with Kienzle Model" (if available)
- [ ] Georgia Tech — "ME 6222 Manufacturing Processes" lectures (Taylor, Kienzle, empirical)
- [ ] Purdue — "IE 590 Machining Science" (Colding model, tool life optimization)
- [ ] Dr. Tugrul Ozel — "Predictive Machining Models" (FEM, analytical force models)
- [ ] Society of Manufacturing Engineers — "Fundamentals of Machining" (webinar series)

### 1C: Surface Speed & SFM Deep Dives
- [ ] Titans of CNC — "Speeds and Feeds EXPLAINED" (practical SFM/IPM)
- [ ] Titans of CNC — "Chip Load Calculator" (per-tooth feed, chip thinning)
- [ ] NYC CNC — "Speeds and Feeds for Beginners" (Saunders explains fundamentals)
- [ ] NYC CNC — "How Fast Should You Machine? HSAM" (high-speed adaptive)
- [ ] NYC CNC — "Feeds and Speeds Myths BUSTED"
- [ ] Haas Automation — "Tip of the Day: Speeds and Feeds" (practical Haas formulas)
- [ ] Haas Automation — "Cutting Parameters for Different Materials"
- [ ] Harvey Performance / Helical — "Speeds and Feeds 101" (end mill specific)
- [ ] Harvey Performance — "Chip Thinning and Radial Engagement"
- [ ] Harvey Performance — "Depth of Cut vs. Width of Cut" (engagement angles)
- [ ] Harvey Performance — "Machining Advisors Pro" (MAP tool walkthrough)
- [ ] Datron — "High Speed Machining Aluminum" (40,000+ RPM strategies)
- [ ] Datron — "Single Flute End Mill Speed and Feed" (aluminum-specific)

### 1D: Power, Torque & Machine Limits
- [ ] Haas Automation — "Spindle Power and Torque Curves Explained"
- [ ] Haas Automation — "Understanding Machine Specifications" (rapid rates, axis accel)
- [ ] DMG MORI — "spindle power curve analysis" (torque vs RPM sweet spots)
- [ ] Okuma — "OSP suite — power monitoring during cuts"
- [ ] Mazak — "Smooth Technology — Spindle Load Monitoring"
- [ ] Titans of CNC — "Are You Pushing Your Machine Hard Enough?"
- [ ] Practical Machinist (video series) — "Horsepower at the Spindle"

### 1E: Statistical Process Control & Quality
- [ ] ASQ — "SPC Fundamentals" (control charts, Cp, Cpk, Pp, Ppk)
- [ ] Dr. Donald Wheeler — "Understanding Variation" (Shewhart charts, Western Electric rules)
- [ ] NIST — "Engineering Statistics Handbook" companion videos (Gage R&R, ANOVA)
- [ ] Minitab — "Capability Analysis Tutorial" (Cp/Cpk from machining data)
- [ ] Minitab — "Control Charts for Manufacturing" (X-bar R, IMR, P-charts)
- [ ] Six Sigma Green Belt — "Process Capability for Machined Parts"
- [ ] Quality Digest — "GD&T and Process Capability" (tolerance → Cpk relationship)
- [ ] Monte Carlo simulation — "Tolerance Stack Analysis" (statistical tolerance chains)

---

## CATEGORY 2: Post-Processor Generation & G-Code

### 2A: Post-Processor Architecture
- [ ] Autodesk HSM Post Processor Training — full series (~12 videos)
- [ ] Autodesk — "Post Processor Customization" (JavaScript-based post)
- [ ] Autodesk — "Multi-Axis Post Processor" (A/B/C axis mapping)
- [ ] Mastercam — "Post Processor Basics" (MPFan, PST files)
- [ ] Mastercam — "Customizing Your Post Processor" (variable editing)
- [ ] Mastercam — "Multi-Axis Post Development" (4/5 axis output)
- [ ] hyperMILL — "Post Processor Configuration" (OPEN MIND post system)
- [ ] Siemens NX — "Post Builder" tutorial series (MOM architecture)
- [ ] Siemens NX — "Post Builder — Multi-Axis Configuration"
- [ ] SolidCAM — "Post Processor Editing" (GPP files)
- [ ] CIMCO — "CIMCO Edit — Post Processor Testing"
- [ ] ICAM — "Adaptive Post Processing" (virtual machining + post)
- [ ] Spring Technologies — "NCSIMUL Machine — Post Verification"

### 2B: G-Code Programming (Manual & Understanding)
- [ ] Haas Automation — "G-Code Programming" full playlist (~50+ videos)
- [ ] Haas Automation — "Canned Cycles" (G73, G76, G81-G89)
- [ ] Haas Automation — "Macro Programming" (G65, #variables, loops)
- [ ] Haas Automation — "Advanced Macro B Programming"
- [ ] Fanuc — "Manual Guide i" tutorial series
- [ ] Fanuc — "Custom Macro Programming" (variables, arithmetic, branching)
- [ ] Fanuc — "High Speed Machining G-Codes" (G05.1, G08, AI Nano)
- [ ] Siemens — "ShopMill / ShopTurn" programming tutorials
- [ ] Siemens — "Sinumerik 840D Advanced Programming" (CYCLE800, TRAORI)
- [ ] Heidenhain — "TNC 640 Programming" (conversational + ISO)
- [ ] Heidenhain — "5-Axis Programming with TNC" (PLANE function, TCPM)
- [ ] Okuma — "OSP-P300 Programming" (interactive + EIA)
- [ ] Mazak — "MAZATROL Programming" (conversational vs EIA)
- [ ] Mazak — "Smooth Technology Programming Features"
- [ ] Mitsubishi — "M80/M800 Programming" (high-speed, high-accuracy)
- [ ] Brother — "CNC-C00 Programming" (tapping center specifics)
- [ ] CNC Cookbook — "G-Code Tutorial" series (Bob Warfield)
- [ ] Titans of CNC — "G-Code Programming 101"
- [ ] NYC CNC — "Learning CNC G-Code" series

### 2C: Advanced G-Code Techniques
- [ ] "NURBS Interpolation G-Code" (G06.2 — spline-based toolpaths)
- [ ] "High Speed Machining G-Code" (look-ahead, acceleration control)
- [ ] "Polar Interpolation" (G12.1 — turning center milling)
- [ ] "Helical Interpolation" (G02/G03 with Z — thread milling, ramps)
- [ ] "Cutter Compensation Deep Dive" (G41/G42, D offsets, approach vectors)
- [ ] "Coordinate Rotation and Scaling" (G68, G51)
- [ ] "Work Coordinate Systems" (G54-G59, G54.1 Pn extended)
- [ ] "Parametric Programming Patterns" (subroutines, loops, probing macros)
- [ ] "Multi-Axis G-Code" (G43.4, G43.5 — TCP/TCPM control)
- [ ] "Turning Center Live Tooling G-Code" (C-axis, Y-axis programming)

### 2D: G-Code Safety & Verification
- [ ] Vericut — "G-Code Simulation and Verification" (collision detection)
- [ ] Vericut — "Force Optimization Module" (feed rate optimization from simulation)
- [ ] NCSIMUL — "Machine Simulation" (kinematic verification)
- [ ] Predator — "Virtual CNC — G-Code Simulation"
- [ ] Haas — "Program Prove-Out Best Practices"
- [ ] "Safe Start Lines and Program Structure" (machine-specific patterns)

---

## CATEGORY 3: CAM Programming — Strategies & Toolpaths

### 3A: Adaptive/Dynamic Milling (High-Speed Machining)
- [ ] Mastercam — "Dynamic Milling" full tutorial series
- [ ] Mastercam — "Dynamic Motion vs Traditional Roughing"
- [ ] Mastercam — "OptiRough — Barrel Cutter Roughing"
- [ ] Fusion 360 — "Adaptive Clearing" deep dive
- [ ] Fusion 360 — "Adaptive vs Pocket" comparison
- [ ] hyperMILL — "HPC (High Performance Cutting)" roughing
- [ ] hyperMILL — "MAXX Machining Roughing" (barrel cutters)
- [ ] SolidCAM — "iMachining 2D and 3D" (patented adaptive)
- [ ] SolidCAM — "iMachining Technology Wizard"
- [ ] Siemens NX — "Adaptive Milling" (engage/retract strategies)
- [ ] GibbsCAM — "VoluMill" integration (Celeritive)
- [ ] "VoluMill Technology Explained" (by Celeritive Technologies)
- [ ] Sandvik Coromant — "Trocoidal Milling" (circular interpolation roughing)
- [ ] Kennametal — "HARVI Ultra 8X with Dynamic Milling"
- [ ] Emuge-Franken — "Trochoidal Milling Strategies"

### 3B: 3D Surface Machining
- [ ] hyperMILL — "3D Finishing Strategies" (Z-level, optimized residual, equidistant)
- [ ] hyperMILL — "Profile Finishing" (iso-parametric, flowline)
- [ ] hyperMILL — "Rest Material Machining" (automatic reference toolpath)
- [ ] Mastercam — "Morph Between Curves" (surface blend finishing)
- [ ] Mastercam — "Scallop Machining" (constant cusp height)
- [ ] Mastercam — "Flowline Machining" (UV-based surface following)
- [ ] Fusion 360 — "Parallel, Scallop, Pencil" finishing comparison
- [ ] Fusion 360 — "Steep and Shallow" combined finishing
- [ ] SolidCAM — "HSR/HSM" (High Speed Recognition / Machining)
- [ ] SolidCAM — "3D HSM Finishing" strategies
- [ ] Siemens NX — "Streamline Finishing" (UV-follow)
- [ ] Siemens NX — "Area Milling" (floor/wall/blend)
- [ ] PowerMill — "Raster, Radial, Spiral, Pattern" finishing
- [ ] PowerMill — "Rest Machining" (automatic previous tool reference)
- [ ] "Scallop Height vs Step-Over Calculator" (geometry-based)
- [ ] "Cusp Height Control" (ball nose vs bull nose vs barrel)

### 3C: 5-Axis Machining
- [ ] hyperMILL — "5-Axis Strategies" complete series (shape offset, swarf, auto-tilt)
- [ ] hyperMILL — "5-Axis Tangent Plane Machining"
- [ ] hyperMILL — "5-Axis Tube Machining"
- [ ] hyperMILL — "MAXX Machining 5-Axis" (barrel cutter 5-axis)
- [ ] Mastercam — "Multiaxis Toolpaths" (morph, swarf, flowline 5-axis)
- [ ] Mastercam — "Advanced Multiaxis" (port machining, blade machining)
- [ ] Fusion 360 — "Multi-Axis Machining" tutorials
- [ ] SolidCAM — "Sim 5X" (simultaneous 5-axis)
- [ ] SolidCAM — "5-Axis Swarf Cutting"
- [ ] Siemens NX — "Variable Contour 5-Axis"
- [ ] Siemens NX — "Turbomachinery Milling" (blisk, impeller)
- [ ] PowerMill — "5-Axis Strategies" (point distribution, tool axis control)
- [ ] PowerMill — "Blade Machining" and "Port Machining"
- [ ] Open Mind — "5-Axis Collision Avoidance" (automatic tilt)
- [ ] "Lead/Lag/Tilt Angle Optimization" (surface quality vs accessibility)
- [ ] "5-Axis Kinematics" (A/C, B/C, nutating head configurations)
- [ ] "Rotary Axis Limits and Singularity" (gimbal lock avoidance)
- [ ] "Simultaneous vs Indexed 5-Axis" (3+2 positioning comparison)

### 3D: Turning & Mill-Turn
- [ ] Sandvik Coromant — "Turning Operations" full series (facing, OD, ID, grooving, threading)
- [ ] Sandvik Coromant — "PrimeTurning" (all-directional turning)
- [ ] Mastercam — "Lathe Programming" (roughing, finishing, threading)
- [ ] Mastercam — "Mill-Turn" (combined operations)
- [ ] Fusion 360 — "Turning" workspace tutorials
- [ ] SolidCAM — "Turning" and "Mill-Turn" modules
- [ ] Siemens NX — "Turning" programming
- [ ] Mazak — "INTEGREX Mill-Turn Programming" (B-axis, lower turret)
- [ ] DMG MORI — "NTX Mill-Turn" programming examples
- [ ] "Sub-Spindle Programming" (part transfer, simultaneous machining)
- [ ] "Live Tooling Programming" (C-axis milling on lathe)
- [ ] "Thread Whirling" (medical screw manufacturing)
- [ ] "Wiper Insert Technology" (finish turning optimization)

### 3E: Drilling & Hole-Making
- [ ] Sandvik Coromant — "Drilling" complete series (twist, indexable, gun drill)
- [ ] Sandvik Coromant — "CoroDrill 860" (optimized point geometry)
- [ ] Kennametal — "KSEM Plus Modular Drill" (deep hole)
- [ ] OSG — "ADO Drill" series (carbide through-coolant)
- [ ] "Peck Drilling vs Chip-Breaking" (G73 vs G83 selection)
- [ ] "Spot Drilling — When and Why" (point angle matching)
- [ ] "Reaming Best Practices" (H7/H6 tolerance achievement)
- [ ] "Boring Bar Selection and Programming" (fine boring, rough boring)
- [ ] "Thread Milling vs Tapping" (when to use each)
- [ ] "Helical Interpolation Boring" (CNC bore mill technique)
- [ ] "Stack Drilling" (composite + metal stacks in aerospace)

### 3F: CAM-Specific Advanced Features
- [ ] hyperMILL — "Automation Center" (feature recognition, template machining)
- [ ] hyperMILL — "Virtual Machining" (simulation, optimization, NC code)
- [ ] hyperMILL — "TOOL Builder" (custom tool definition)
- [ ] hyperMILL — "Electrode Module" (EDM electrode design + machining)
- [ ] Mastercam — "Toolpath Dynamic and Verify"
- [ ] Mastercam — "Feature Based Machining" (FBM)
- [ ] Fusion 360 — "Manufacture Workspace" full walkthrough
- [ ] Fusion 360 — "Probing" (WCS setup, part inspection)
- [ ] SolidCAM — "iMachining Wizard" step-by-step
- [ ] Siemens NX — "Feature Based Machining" (PMI-driven)
- [ ] PowerMill — "Vortex High-Efficiency Roughing"
- [ ] "CAM Template and Automation" (process standardization)

---

## CATEGORY 4: Toolpath Sequencing & Process Planning

### 4A: Operation Sequencing
- [ ] "Complete Part Programming — Start to Finish" (Titans of CNC Academy)
- [ ] "Operation Sequencing for Complex Parts" (face → drill → rough → semi → finish)
- [ ] "Setup Reduction Strategies" (combining operations, fixture design)
- [ ] "First Operation vs Second Operation" (datum transfer, flip strategies)
- [ ] "Tombstone Machining" (multi-part fixturing, operation consolidation)
- [ ] "Progressive Machining" (near-net-shape → finish workflow)
- [ ] "Rest Material Strategy" (large tool → medium → small tool sequence)
- [ ] Titans of CNC — "How to Plan Your CNC Job"
- [ ] Titans of CNC — "From Print to Part" (full workflow)
- [ ] NYC CNC — "Making Parts — Complete Workflow" series
- [ ] "Process Planning for Prismatic Parts" (CAPP concepts)
- [ ] "Process Planning for Rotational Parts" (turning sequences)

### 4B: Workholding & Fixturing
- [ ] Titans of CNC — "Workholding" series (vises, fixtures, soft jaws)
- [ ] NYC CNC — "Workholding Strategies"
- [ ] Saunders Machine Works — "Custom Fixtures"
- [ ] "5-Axis Workholding" (dovetail, vacuum, zero-point)
- [ ] "Zero-Point Clamping Systems" (Schunk, Erowa, 3R)
- [ ] "Soft Jaw Design" (self-centering, thin-wall clamping)
- [ ] "Fixture Design Principles" (6-3-2-1 locating, clamping forces)
- [ ] "Pallet Systems" (FMS integration, automated loading)

### 4C: Tool Selection & Management
- [ ] Sandvik Coromant — "Tool Selection Guide" series
- [ ] "End Mill Selection" (flute count, helix angle, coating, substrate)
- [ ] "Insert Selection" (grade, geometry, chip breaker — by material)
- [ ] "Tool Life Management" (TLM systems, sister tooling, auto-offset)
- [ ] "Tool Presetting" (Zoller, Haimer — measurement, shrink-fit)
- [ ] "Toolholder Selection" (hydraulic, shrink-fit, ER collet — TIR/rigidity)
- [ ] "Coolant Strategy" (flood, through-tool, MQL, cryogenic, air blast)
- [ ] "Micro-Tooling" (small tool challenges, speeds >50,000 RPM)
- [ ] Harvey Performance — "Miniature Tooling Guide"

---

## CATEGORY 5: Material-Specific Machining

### 5A: Aluminum & Non-Ferrous
- [ ] "Machining Aluminum — Complete Guide" (6061, 7075, 2024)
- [ ] "Machining Cast Aluminum" (A356, A380 — silicon content effects)
- [ ] Datron — "High Speed Aluminum Machining" (40K RPM+)
- [ ] "Machining Copper and Brass" (chip control, tool selection)
- [ ] "Machining Magnesium" (fire risk, speeds, tool geometry)

### 5B: Steel & Cast Iron
- [ ] "Machining Carbon Steel" (1018, 1045, 4140 — hardness effects)
- [ ] "Machining Stainless Steel" (304, 316, 17-4PH — work hardening)
- [ ] "Machining Tool Steel" (D2, H13, S7 — pre/post hardened)
- [ ] "Machining Cast Iron" (gray, ductile, CGI — graphite effects)
- [ ] "Hard Milling" (>45 HRC — high speed, light DOC strategies)
- [ ] "Hard Turning" (>55 HRC — CBN inserts, fine finishing)

### 5C: Aerospace Superalloys
- [ ] "Machining Titanium" (Ti-6Al-4V — speeds, heat, tool wear)
- [ ] "Machining Inconel" (718, 625 — ceramic inserts, low SFM)
- [ ] "Machining Waspaloy and Rene" (nickel superalloys)
- [ ] "Machining CFRP / Composites" (PCD, diamond-coated, delamination)
- [ ] "Stack Machining" (CFRP + Ti stacks — aerospace)
- [ ] Sandvik Coromant — "Aerospace Machining Solutions"
- [ ] Kennametal — "Aerospace Engine Component Machining"

### 5D: Medical & Exotic
- [ ] "Machining CoCr" (cobalt-chrome — hip/knee implants)
- [ ] "Machining PEEK" (polymer, medical devices)
- [ ] "Machining Nitinol" (shape memory alloy — stents)
- [ ] "Swiss Machining" (medical screws, bone pins — small diameter)
- [ ] "Machining Tungsten and Molybdenum" (refractory metals)
- [ ] "Machining Graphite" (EDM electrodes — dust, PCD tools)

---

## CATEGORY 6: CNC Machine Operation & Engineering

### 6A: Machine Setup & Operation
- [ ] Haas Automation — "Setting Up Your Haas" complete series
- [ ] Haas Automation — "Probing" (Renishaw on Haas — WCS, tool length)
- [ ] Haas Automation — "Workholding and Fixturing"
- [ ] Haas Automation — "Next Generation Control" (NGC features)
- [ ] Titans of CNC — "Machine Setup" playlist
- [ ] "Touch-Off Procedures" (tool length, work offset)
- [ ] "Machine Warm-Up Procedures" (thermal growth compensation)
- [ ] "Chip Management" (conveyor, coolant filtration)

### 6B: Machine Accuracy & Compensation
- [ ] "Ballbar Testing" (Renishaw QC20 — circular interpolation accuracy)
- [ ] "Laser Interferometry" (linear/angular positioning accuracy)
- [ ] "Volumetric Compensation" (3D error mapping)
- [ ] "Thermal Compensation" (real-time thermal error modeling)
- [ ] "Backlash Compensation" (parameter settings, measurement)
- [ ] "Geometric Compensation" (squareness, straightness, pitch/yaw/roll)
- [ ] "5-Axis Calibration" (RTCP/RPCP calibration procedures)

### 6C: Machine Dynamics & Chatter
- [ ] "Chatter in Milling — Stability Lobes" (Altintas theory)
- [ ] "Tap Testing for Stability" (BlueSwarf, MetalMax)
- [ ] "Variable Helix/Pitch End Mills" (chatter suppression)
- [ ] "Spindle Speed Selection to Avoid Chatter"
- [ ] "Thin Wall Machining" (dynamic response, support strategies)
- [ ] "Heavy Roughing Without Chatter" (radial engagement optimization)
- [ ] Prof. Yusuf Altintas — "Manufacturing Automation" lectures (UBC)
- [ ] Prof. Tony Schmitz — "Machining Dynamics" (UNC Charlotte / UTK)

### 6D: Machine Maintenance & Troubleshooting
- [ ] "CNC Machine Preventive Maintenance" (daily, weekly, monthly)
- [ ] "Spindle Maintenance" (bearing preload, runout, vibration analysis)
- [ ] "Way Cover and Coolant System Maintenance"
- [ ] "Servo Tuning" (following error, gain adjustment)
- [ ] "Alarm Troubleshooting" (common Fanuc/Siemens/Heidenhain alarms)

---

## CATEGORY 7: Advanced Manufacturing Science

### 7A: Finite Element Analysis (FEA) of Machining
- [ ] "FEM Simulation of Metal Cutting" (AdvantEdge, Deform, Abaqus)
- [ ] "Chip Formation FEA" (Johnson-Cook model, damage criteria)
- [ ] "Residual Stress Prediction" (machining-induced stresses)
- [ ] "Tool Wear Simulation" (Usui model, Archard model)
- [ ] "Thermal Simulation of Cutting" (Jaeger moving heat source)

### 7B: Vibration Analysis & Modal Testing
- [ ] "Modal Analysis for Machine Tools" (FRF, natural frequencies)
- [ ] "Operational Deflection Shapes" (ODS from accelerometer data)
- [ ] "Harmonic Analysis" (forced vibration response)
- [ ] "Damping Ratio Measurement" (half-power bandwidth, log decrement)
- [ ] "Receptance Coupling" (tool-holder-spindle assembly dynamics)

### 7C: Metrology & Inspection
- [ ] "CMM Programming" (PC-DMIS, Calypso, PolyWorks)
- [ ] "In-Process Measurement" (probing cycles, on-machine inspection)
- [ ] "Surface Roughness Measurement" (Ra, Rz, Rq — theory and instruments)
- [ ] "GD&T for Machinists" (datum selection, feature control frames)
- [ ] "Optical Measurement" (structured light, laser scanning)
- [ ] "Statistical Measurement Analysis" (Gage R&R, MSA)

### 7D: Optimization & DOE
- [ ] "Design of Experiments for Machining" (Taguchi method, L9/L18)
- [ ] "Response Surface Methodology" (RSM — optimizing multiple responses)
- [ ] "Multi-Objective Optimization" (Pareto fronts, TOPSIS, desirability)
- [ ] "Genetic Algorithm for Machining Parameters" (NSGA-II)
- [ ] "Grey Relational Analysis for Machining" (GRA optimization)
- [ ] "ANOVA for Machining Parameters" (significance testing)
- [ ] "Regression Models for Tool Life" (empirical vs semi-empirical)

---

## CATEGORY 8: Industry Channels — Comprehensive Playlists

### 8A: Titans of CNC Academy (titan-level coverage)
- [ ] "CNC Machining for Beginners" complete course
- [ ] "Advanced CNC Techniques" series
- [ ] "Aerospace Parts" series (complex multi-setup parts)
- [ ] "Medical Parts" series (Swiss, micro-machining)
- [ ] "5-Axis Machining" series
- [ ] "Turning" series (OD, ID, threading, grooving)
- [ ] "Titan Approved" tools and techniques
- [ ] "Shop Tours" (process flow, production engineering)

### 8B: NYC CNC (Saunders Machine Works)
- [ ] "Widget Wednesday" complete series (real parts, real problems)
- [ ] "Fusion 360 CAM" tutorials (full programming)
- [ ] "Tool Tuesday" series (tool reviews, performance data)
- [ ] "CNC Programming" (manual G-code)
- [ ] "Machine Upgrades" (probing, 4th axis, coolant)
- [ ] "Shop Tips" (practical efficiency)

### 8C: This Old Tony
- [ ] "Making Things" series (engineering fundamentals via projects)
- [ ] "Metalworking Basics" (feeds, speeds, tool geometry explained)
- [ ] "Manual Machining" (lathe and mill fundamentals)

### 8D: Abom79 / Stefan Gotteswinter / Keith Fenner
- [ ] Abom79 — "Big Manual Machining" (heavy turning, boring)
- [ ] Stefan Gotteswinter — "Precision Machining" (watchmaking-level)
- [ ] Keith Fenner — "Turning and Milling" (classic workshop practice)

### 8E: Edge Precision / Saunders Machine Works / Cutting Edge Engineering
- [ ] Edge Precision — "How We Made It" (aerospace parts, 5-axis)
- [ ] Cutting Edge Engineering — "Material Science" (heat treatment, metallurgy)
- [ ] "Engineering Explained" (physics concepts applicable to machining)

### 8F: CAM-Specific Channels
- [ ] "Fusion 360 Manufacture" (Autodesk official)
- [ ] "Mastercam University" (official training)
- [ ] "hyperMILL by OPEN MIND" (official channel)
- [ ] "SolidCAM" (official channel — iMachining demos)
- [ ] "Siemens NX CAM" (official tutorials)
- [ ] "PowerMill by Autodesk" (official channel)
- [ ] "GibbsCAM" (official channel)
- [ ] "Esprit CAM" (official channel)
- [ ] "BobCAD-CAM" (official tutorials)
- [ ] "CAMWorks" (feature-based machining)

---

## CATEGORY 9: Specialized / Niche Topics

### 9A: EDM (Electrical Discharge Machining)
- [ ] "Wire EDM Programming" (Mitsubishi, Fanuc, Sodick)
- [ ] "Sinker EDM" (electrode design, orbital, vector)
- [ ] "EDM Process Parameters" (current, voltage, frequency, gap)
- [ ] "Micro EDM" (small holes, medical, watch parts)

### 9B: Grinding
- [ ] "Surface Grinding" (wheel selection, dressing, speeds)
- [ ] "Cylindrical Grinding" (OD, ID, centerless)
- [ ] "Creep Feed Grinding" (aerospace, deep cuts)
- [ ] "CBN and Diamond Grinding" (superabrasive)
- [ ] "Grinding Burns" (thermal damage, Barkhausen noise testing)

### 9C: Additive + Subtractive (Hybrid)
- [ ] "Hybrid Manufacturing" (DED + milling on same machine)
- [ ] "Post-Processing 3D Printed Metal Parts" (CNC finishing)
- [ ] "Near-Net-Shape to Finish" (cast/print → machine workflow)
- [ ] DMG MORI — "LASERTEC 3D" (DED + 5-axis milling)

### 9D: Automation & Lights-Out
- [ ] "Pallet Pool Systems" (FMS, automated production)
- [ ] "Robotic Machine Tending" (part load/unload)
- [ ] "Lights-Out Machining" (unattended operation strategies)
- [ ] "Tool Life Management for Unattended" (redundant tools, auto-offset)
- [ ] "In-Process Inspection for Automation" (closed-loop quality)

### 9E: Swiss Machining & Micro-Machining
- [ ] "Swiss Screw Machine Programming" (Star, Citizen, Tsugami)
- [ ] "Guide Bushing vs Non-Guide Bushing" (when to use each)
- [ ] "Micro-Machining" (<1mm features, high RPM, runout)
- [ ] "Medical Screw Manufacturing" (bone screws, dental implants)

### 9F: Sheet Metal & Fabrication (adjacent knowledge)
- [ ] "CNC Press Brake Programming" (bend allowance, K-factor)
- [ ] "Laser Cutting" (CO2, fiber — kerf, pierce, speed)
- [ ] "Waterjet Cutting" (abrasive, taper compensation)

---

## CATEGORY 10: Mathematics & Physics Deep Dives

### 10A: Core Math for Machining
- [ ] "Vector Calculus for CNC" (toolpath tangent vectors, surface normals)
- [ ] "Linear Algebra for Multi-Axis" (rotation matrices, Euler angles, quaternions)
- [ ] "Differential Geometry for Surfaces" (curvature, Gaussian curvature, principal directions)
- [ ] "Numerical Methods for Toolpath Generation" (spline interpolation, NURBS)
- [ ] "Fourier Analysis for Vibration" (FFT, frequency domain analysis)
- [ ] "Statistics for Manufacturing" (distributions, hypothesis testing, regression)
- [ ] "Optimization Theory" (linear programming, gradient descent, simulated annealing)

### 10B: Physics Models
- [ ] "Heat Transfer in Metal Cutting" (conduction, convection, radiation)
- [ ] "Fluid Dynamics of Coolant" (jet pressure, MQL atomization)
- [ ] "Contact Mechanics" (Hertz contact, friction models — tool-chip interface)
- [ ] "Fracture Mechanics" (chip separation, brittle vs ductile fracture)
- [ ] "Plasticity Theory" (von Mises, Tresca — workpiece deformation)
- [ ] "Tribology in Machining" (friction, lubrication, wear mechanisms)

### 10C: Controls & Servo Systems
- [ ] "CNC Servo Systems" (PID control, following error)
- [ ] "Interpolation Algorithms" (linear, circular, NURBS — controller level)
- [ ] "Look-Ahead and Acceleration Control" (jerk limiting, S-curve)
- [ ] "Encoder Technology" (absolute, incremental, optical, magnetic)
- [ ] "CNC Architecture" (NCU, PLC, HMI — system design)

---

## PROCESSING PRIORITY ORDER

### Tier 1 — CRITICAL (direct PRISM engine enrichment)
1. Category 1A-1D (Speed/Feed physics) — feeds UltimateSpeedFeedEngine, AutoSpeedFeedEngine, PowerBudgetEngine
2. Category 2A-2B (Post-Processor + G-Code) — feeds PostProcessorEngine, GCodeSafetyAnalyzerEngine
3. Category 3A (Adaptive Milling) — feeds NovelToolpathEngine (TGAR, CFSF, VCER)
4. Category 6C (Chatter/Dynamics) — feeds stability lobe models, HRAF algorithm
5. Category 7D (DOE/Optimization) — feeds ManufacturingStatisticsEngine, AdvancedCuttingMathEngine

### Tier 2 — HIGH (strong domain enrichment)
6. Category 3B-3C (3D/5-Axis) — feeds CrossCamRecommenderEngine, MultiAxisKinematicEngine
7. Category 5A-5C (Material-specific) — feeds strategy DB, material_properties_catalog
8. Category 4A (Op Sequencing) — feeds ProcessPlanningEngine candidates
9. Category 1E (SPC/Quality) — feeds ManufacturingStatisticsEngine
10. Category 10A-10B (Math/Physics models) — feeds AdvancedCuttingMathEngine

### Tier 3 — MEDIUM (knowledge base enrichment)
11. Category 3D-3E (Turning/Drilling) — feeds tribal knowledge, strategy DB
12. Category 4B-4C (Workholding/Tools) — feeds workholding-catalog, tool selection
13. Category 6A-6B (Machine Operation/Accuracy) — feeds machine-profiles, calibration
14. Category 8A-8F (Industry channels) — feeds tips, practical knowledge
15. Category 7A-7C (FEA/Vibration/Metrology) — feeds ToolpathThermalEngine, quality checks

### Tier 4 — LOW (supplementary knowledge)
16. Category 9A-9F (Niche topics) — extends coverage
17. Category 3F (CAM features) — extends hyperMILL/Mastercam tips
18. Category 6D (Maintenance) — operational knowledge
19. Category 10C (Controls) — controller-level understanding
20. Category 2C-2D (Advanced G-Code) — extends GCodeSafetyAnalyzerEngine rules

---

## METRICS

- Total video topics: ~400+
- Categories: 10 major, 40+ subcategories
- Priority tiers: 4 (Critical → Low)
- Target engines to enrich: 15+ (UltimateSpeedFeed, AutoSpeedFeed, PowerBudget, PostProcessor, GCodeSafety, NovelToolpath x6, CrossCam, MultiAxisKinematic, ToolpathThermal, ManufacturingStatistics, AdvancedCuttingMath)
- Target knowledge base expansion: 200+ new tips
- Target strategy DB expansion: 50+ new strategies
- Target formula additions: 30+ new formulas

---

## FORGE INTEGRATION MAP

Each category maps to specific `/forge-triple` + `/autopilot` actions:

| Category | Forge Target | Engine/Action |
|----------|-------------|---------------|
| 1A-1D | `/forge-engines` | UltimateSpeedFeedEngine, FeedOptimizerEngine, PowerBudgetEngine |
| 1E | `/forge-engines` | ManufacturingStatisticsEngine (Cp/Cpk, SPC) |
| 2A | `/forge-engines` | PostProcessorEngine, post template system |
| 2B-2C | `/forge-engines` | GCodeSafetyAnalyzerEngine (new rules), GCodeSnippetEngine |
| 3A | `/forge-engines` | NovelToolpathEngine (TGAR, CFSF, VCER) |
| 3B-3C | `/forge-engines` | CrossCamRecommenderEngine, MultiAxisKinematicEngine |
| 3D-3E | `/forge-engines` | TurningForceEngine (candidate), DrillForceEngine (candidate) |
| 4A | `/forge-engines` | ProcessPlanningEngine (candidate) |
| 5A-5D | `/forge-materials` | material_properties_catalog, strategy DB |
| 6C | `/forge-engines` | stability lobe models, HRAF algorithm |
| 7D | `/forge-engines` | AdvancedCuttingMathEngine (Taguchi, RSM, TOPSIS) |
| 10A-10B | `/forge-engines` | AdvancedCuttingMathEngine (new physics models) |
| All | `/forge-skills` | domain-specific query skills |
| All | `/forge-hooks` | safety rules, autofire triggers |

---

## CATEGORY 11: Tool Vendor How-To & Application Videos (2025-2026)

### 11A: Haas Automation — Setup & Programming Tutorials
- [ ] Haas — "Mark's Greatest Setup Tips" (complete part start-to-finish setup walkthrough)
- [ ] Haas — "Haas Program Optimizer — How To" (capture program changes on the fly)
- [ ] Haas — "Haas Setup and Run Modes" (safety features, mode switching)
- [ ] Haas — "Visual Programming System for Lathes" (VPS — write programs at control)
- [ ] Haas — "Haas Control — GUI Setup, Run, and Edit" (control interface walkthrough)
- [ ] Haas — "Programming Tips & Tricks" series (shortcuts, time-saving keystrokes)
- [ ] Haas — "G187 Smoothing Mode Explained" (P1/P2/P3 modes, when to use each)
- [ ] Haas — "Probing on a Haas Mill" (WCS setup, tool measurement, part inspection)
- [ ] Haas — "5-Axis Setup on UMC-750" (TCPC, DWO G234, rotary axis homing)
- [ ] Haas — "Haas Mill Operator Training" series (fundamentals for new operators)

### 11B: Sandvik Coromant — Metal Cutting E-Learning
- [ ] Sandvik — "Metal Cutting Technology" e-learning series (75 courses, 9 chapters — turning/milling/drilling/boring/threading/parting/toolholding)
- [ ] Sandvik — "CoroMill Plura 2P350 — Composite Machining Application" (CFRP/GFRP strategies)
- [ ] Sandvik — "CoroDrill DE10 — Short Hole Drilling Application" (feed/speed selection, chip control)
- [ ] Sandvik — "CoroTurn Plus — Turning Application Guide" (insert selection, cutting data)
- [ ] Sandvik — "Digital Live Machining" webinar series (live demos from Sandvik Centers)
- [ ] Sandvik — "PrimeTurning — How to Apply" (all-direction turning, CoroTurn Prime inserts)
- [ ] Sandvik — "High-Feed Milling with CoroMill 745" (application setup, feeds/speeds)

### 11C: Kennametal — Application Videos
- [ ] Kennametal — "KOR5 Solid Carbide End Mills — Application Demo" (3+ min cycle time savings)
- [ ] Kennametal — "Indexable Milling Lead Angle & Cutting Forces" (tech tips, force vectors)
- [ ] Kennametal — "New Products Fall 2025" (latest innovations, application data)
- [ ] Kennametal — "Beyond Blast Coolant-Through Technology" (through-tool coolant setup)
- [ ] Kennametal — "HARVI Ultra 8X End Mill — Titanium Roughing" (aerospace application)

### 11D: Harvey Performance / Helical Solutions — Application Guides
- [ ] Harvey Performance — "In The Loupe" video series (100+ machining how-to posts)
- [ ] Harvey Performance — "HEM Guidebook" video companion (50+ pages of milling strategies)
- [ ] Harvey Performance — "Machining Advisor Pro (MAP) — How to Use" (S/F parameter generation)
- [ ] Helical Solutions — "Chipbreaker End Mills — When and How to Use" (chip control in deep pockets)
- [ ] Harvey Tool — "Miniature End Mills — Application Tips" (micro-machining, thin walls, small features)
- [ ] Harvey Tool — "Thread Milling — Complete How-To" (single-point vs multi-form, speeds/feeds)

### 11E: Machine Builder Training Channels
- [ ] Mazak — "Mazatrol SmoothAi Training" (interactive programming, AI features)
- [ ] Mazak — "MPower Training Series" (setup, programming, maintenance courses)
- [ ] Mazak — "INTEGREX Mill-Turn Setup Guide" (multi-tasking, sub-spindle, live tooling)
- [ ] DMG MORI — "CELOS Control Training" (interface, job management, process monitoring)
- [ ] DMG MORI — "DMU 50 5-Axis Setup & Programming" (swivel rotary table, TCPC)
- [ ] Okuma — "OSP Suite — Programming Tutorials" (OSP-P300/P500, conversational programming)
- [ ] Okuma — "Super-NURBS & Machining Navi" (surface quality optimization, anti-chatter)
- [ ] Okuma — "MULTUS Mill-Turn Setup" (B-axis milling, turning mode switching)
- [ ] Brother — "Speedio Setup & High-Speed Tapping" (M300X3, rapid tool changes, tapping cycles)

### 11F: Titans of CNC Academy — Practical Machining
- [ ] Titans of CNC — "Building Blocks" series (10-step program: design→program→cut on 3-axis mill)
- [ ] Titans of CNC — "CNC Mill Fundamentals" series (workholding, tool selection, speeds/feeds)
- [ ] Titans of CNC — "CNC Tooling Masterclass" (insert selection, holder types, tool life)
- [ ] Titans of CNC — "Titan Tutorials — Learn to Set Up CNC" (vise setup, WCS, tool offsets)
- [ ] Titans of CNC — "Tormach Tutorials" series (hobbyist-to-production workflow)
- [ ] Titans of CNC — "5-Axis Machining Challenge Parts" (real 5-axis projects with full walkthrough)

### 11G: Seco Tools — Material-Specific Application Videos
- [ ] Seco Tools — "Material Specific Machining" playlist (ISO P/M/K/N/S/H strategies with chip control)
- [ ] Seco Tools — "Edge Preparation & Cutting Geometry" (hone, chamfer, land effects on forces)
- [ ] Seco Tools — "Jabro Solid² — High-Performance Milling" (solid carbide application data)
- [ ] Seco Tools — "Steadyline Vibration Damping" (anti-vibration boring bars — how to select & apply)

### 11H: Other Vendor How-To Videos
- [ ] OSG — "A-Tap Series — Application Guide" (high-performance tapping, speeds/feeds by material)
- [ ] OSG — "AE-VMS End Mills — Stainless Steel Application" (variable helix, chip thinning demo)
- [ ] Guhring — "Pionex Taps — Application Demo" (March 2026 CTE feature — threading how-to)
- [ ] Guhring — "Coolant-Through Drilling — MQL vs Flood Setup" (coolant system configuration)
- [ ] Mitsubishi Materials — "Technical Guidance — Speeds & Feeds by Insert Grade" (grade selection)
- [ ] Walter Tools — "Tiger-tec Gold — Cutting Speed vs Tool Life Demo" (Taylor curve demonstration)
- [ ] Walter Tools — "Best Practice 2025" (success stories, machining tips, cutting data)
- [ ] ISCAR — "Machining Aluminum Wheels — Productivity Application" (high-speed aluminum)
- [ ] ISCAR — "E-Learning: Lightweight Engineering Materials" (CFRP, aluminum, magnesium)
- [ ] Renishaw — "On-Machine Probing — Complete Setup Guide" (tool setting, workpiece probing, automated inspection)
- [ ] Renishaw — "Ballbar Testing — How to Run & Interpret" (machine accuracy verification)
- [ ] Blum-Novotest — "Tool Breakage Detection — Setup & Programming" (laser tool measurement)

### 11I: CAM Software Practical Tutorials
- [ ] OPEN MIND — "hyperMILL 2025 — New Deburring Strategies" (automatic deburring on machine)
- [ ] OPEN MIND — "hyperMILL 5-Axis Auto Tool Orientation" (pre-analysis algorithm, indexed+simultaneous)
- [ ] OPEN MIND — "hyperMILL Virtual Machine — Collision Avoidance" (machine model in toolpath calc)
- [ ] Mastercam — "Dynamic Motion — Complete How-To" (adaptive clearing, constant chip load)
- [ ] Mastercam — "OptiRough — Application Guide" (2025 toolpath strategies)
- [ ] Fusion 360 — "Adaptive Clearing — Setup & Parameters" (engagement control, chip thinning)
- [ ] Fusion 360 — "5-Axis Swarf Cutting — Complete Workflow" (surface selection, tool axis control)
- [ ] SolidCAM — "iMachining 2D/3D — Getting Started" (patented toolpath, parameter wizard)
- [ ] SolidCAM — "Swiss-Type Programming — Complete Guide" (multi-channel, gang vs turret)
