# PRISM KNOWLEDGE SYSTEM - USAGE GUIDE
## How to Use the New 2-File System
## Date: January 13, 2026

---

## 📚 **THE NEW SYSTEM**

We've replaced 3 separate markdown files with 2 optimized files:

```
OLD SYSTEM (3 files):
├── PRISM_UNIFIED_DEVELOPMENT_PROTOCOL_v12_0_MASTER.md
├── PRISM_ULTIMATE_KNOWLEDGE_DATABASE_107_COURSES.md
└── PRISM_COMPREHENSIVE_AUDIT_AND_ROADMAP.md

NEW SYSTEM (2 files):
├── PRISM_MASTER_REFERENCE_v12.md        (41 KB - protocols & roadmap)
└── PRISM_KNOWLEDGE_BASE_v12.js          (55 KB - executable data)
```

**Benefits:**
- ✅ Combined size is smaller (97KB vs ~630KB)
- ✅ One reference file to read
- ✅ One executable file to use
- ✅ Easier to search and maintain
- ✅ MIT algorithms as working code

---

## 📖 **FILE 1: PRISM_MASTER_REFERENCE_v12.md**

### **What It Contains:**

```
PART 1: Development Protocols
  ├── Implementation mandate
  ├── The four mandatory protocols
  ├── Session workflow
  └── Integration checklist

PART 2: Current Build Status
  ├── Build v8.61.004 summary
  ├── Layer 1 status (100/100!)
  ├── What's been accomplished
  └── What remains

PART 3: Roadmap & Priorities
  ├── Immediate next steps
  ├── Short-term (Weeks 1-4)
  ├── Medium-term (Weeks 5-12)
  └── Long-term (Weeks 13+)

PART 4: System Architecture
  ├── 23 Master controllers
  ├── Database structure
  └── Engine architecture

PART 5: Quality Standards
  ├── Critical features (100% required)
  ├── Code standards
  └── Testing requirements

PART 6: Quick Reference
  ├── File locations
  ├── Common patterns
  └── Troubleshooting
```

### **When to Use It:**

- ✅ Start of every session (read the roadmap)
- ✅ When implementing new features (check protocols)
- ✅ When unsure about architecture (check Part 4)
- ✅ When testing (check critical requirements)
- ✅ For troubleshooting

### **How to Use It:**

```markdown
1. At session start:
   - Jump to "NEXT SESSION START HERE" at the bottom
   - See current priorities
   - Check what's been completed

2. During development:
   - Reference Part 1 for protocols
   - Use Part 4 for architecture decisions
   - Follow Part 5 for quality standards

3. Before finishing:
   - Use SESSION_HANDOFF_TEMPLATE
   - Update roadmap section
   - Mark completed items
```

---

## 💻 **FILE 2: PRISM_KNOWLEDGE_BASE_v12.js**

### **What It Contains:**

```javascript
PART 1: MIT Course Algorithms (Working Code)
  ├── MIT 18.086 - Voronoi, Delaunay, FFT, Numerical methods
  ├── MIT 6.251J - Interior Point, Simplex, Dual Simplex
  ├── MIT 2.004 - Extended Kalman Filter, LQR, Matrix utilities
  ├── MIT 3.22 - Johnson-Cook, Taylor tool life
  └── MIT 15.773 - CNN, convolution, pooling

PART 2: Material Expansion Data (+192 materials)
  ├── Specialized steels (+50)
  ├── Stainless expansion (+40)
  ├── Cast iron expansion (+30)
  ├── Non-ferrous expansion (+42)
  ├── Superalloys expansion (+20)
  └── Hardened steels (+10)

PART 3: Strategy Expansion Data (+16 strategies)
  ├── 3D surfaces (+5)
  ├── Multi-axis (+4)
  ├── Turning (+3)
  ├── Mill-turn (+2)
  └── Advanced HSM (+2)

PART 4: System Constants & Formulas
  ├── Physical constants
  ├── Manufacturing constants
  ├── Precision constants (MIT 2.75)
  └── Cutting force, MRR, Power, etc.

PART 5: Current Status Tracking
  ├── Build version
  ├── Layer 1 metrics
  ├── Algorithm status
  └── Priority queue
```

### **When to Use It:**

- ✅ When implementing algorithms (use MIT code)
- ✅ When adding materials (use expansion data)
- ✅ When adding strategies (use expansion data)
- ✅ When calculating (use formulas)
- ✅ When checking status (use status object)

### **How to Use It:**

#### **Example 1: Implement Voronoi Diagram**

```javascript
// In your PRISM build:

// 1. Get the algorithm
const voronoiAlgorithm = PRISM_KB.mit['18.086'].voronoi.compute;

// 2. Integrate with controller
PRISM_MASTER.masterControllers.camToolpath.voronoiDiagram = function(points) {
    return voronoiAlgorithm.call(PRISM_KB.mit['18.086'].voronoi, points);
};

// 3. Use in toolpath generation
const diagram = PRISM_MASTER.masterControllers.camToolpath.voronoiDiagram(points);
```

#### **Example 2: Add 192 Materials**

```javascript
// In your PRISM build, in the material generation section:

// 1. Get expansion data
const newSteels = PRISM_KB.materialExpansion.specializedSteels;
const newStainless = PRISM_KB.materialExpansion.stainlessExpansion;
// ... etc

// 2. Generate materials
newSteels.forEach(([id, name, ts, ys, hd, mc]) => {
    const mat = F.generateMaterial(id, name, 'steel_tool', ts, ys, hd, mc);
    DB.GROUP_P_STEEL.grades[id] = mat;
    DB.byId[id] = mat;
});

// 3. Repeat for all categories
// Total added: 192 materials
// New total: 810 materials ✅
```

#### **Example 3: Add 16 Strategies**

```javascript
// Get strategy data
const new3DSurfaces = PRISM_KB.strategyExpansion['3D_surfaces'];
const newMultiAxis = PRISM_KB.strategyExpansion.multi_axis;

// Add to feature-strategy map
Object.entries(new3DSurfaces).forEach(([feature, data]) => {
    PRISM_FEATURE_STRATEGY_MAP[feature] = data.strategies;
});
```

#### **Example 4: Use Formulas**

```javascript
// Calculate cutting force
const Kc = PRISM_KB.formulas.specificCuttingEnergy(2230, 0.1, 0.23);
const force = PRISM_KB.formulas.cuttingForce(Kc, 0.1, 5);

// Calculate tool life
const life = PRISM_KB.formulas.taylorToolLife(
    350,  // V = cutting speed (m/min)
    0.2,  // f = feed (mm/rev)
    1.0,  // d = depth (mm)
    { C: 200, n: 0.25, a: 0.5, b: 0.15 }
);

// Calculate thermal expansion
const expansion = PRISM_KB.formulas.thermalExpansion(
    100,   // length (mm)
    20,    // temp change (°C)
    11.7e-6  // alpha (1/°C)
);
```

#### **Example 5: Check Status**

```javascript
// Get current status
const status = PRISM_KB.getStatus();

console.log(`Current build: ${status.currentBuild}`);
console.log(`Materials: ${status.layer1.components.materials.current} / ${status.layer1.components.materials.target}`);

// Get priorities
status.priorities.forEach(p => {
    console.log(`${p.rank}. ${p.task} - ${p.timeline}`);
});
```

---

## 🔄 **WORKFLOW: HOW TO USE BOTH FILES TOGETHER**

### **Session Start:**

```
1. Read PRISM_MASTER_REFERENCE_v12.md
   └── Section "NEXT SESSION START HERE"
   
2. Check priorities:
   Priority 1: Add 192 materials
   Priority 2: Add 16 strategies
   Priority 3: Implement Voronoi
   
3. Get data from PRISM_KNOWLEDGE_BASE_v12.js
   └── PRISM_KB.materialExpansion
   └── PRISM_KB.strategyExpansion
```

### **During Development:**

```
1. Follow protocols from PRISM_MASTER_REFERENCE_v12.md
   └── PROTOCOL 1: Mandatory Implementation
   └── PROTOCOL 2: Use MIT Knowledge
   
2. Use algorithms/data from PRISM_KNOWLEDGE_BASE_v12.js
   └── PRISM_KB.mit['18.086'].voronoi
   └── PRISM_KB.materialExpansion.specializedSteels
   
3. Check architecture from PRISM_MASTER_REFERENCE_v12.md
   └── Part 4: System Architecture
```

### **Session End:**

```
1. Fill out SESSION_HANDOFF_TEMPLATE from reference file
2. Update roadmap in reference file (mark completed items)
3. Update status in PRISM_KB.status
4. Save both files with changes
```

---

## 🎯 **QUICK REFERENCE GUIDE**

### **Common Tasks:**

| Task | Reference File | Knowledge Base |
|------|---------------|----------------|
| Check what to do next | Part 3: Roadmap | status.priorities |
| Implement algorithm | Part 1: Protocols | mit[course].algorithm |
| Add materials | Part 6: Common patterns | materialExpansion |
| Add strategies | Part 6: Common patterns | strategyExpansion |
| Calculate values | Part 5: Standards | formulas |
| Check architecture | Part 4: Architecture | N/A |
| Test requirements | Part 5: Quality | constants.manufacturing |
| Troubleshoot | Part 6: Quick Reference | N/A |

### **Quick Searches:**

**In PRISM_MASTER_REFERENCE_v12.md:**
- Search "NEXT SESSION" - Start here
- Search "CRITICAL" - Safety-critical features
- Search "ROADMAP" - What to do when
- Search "SESSION_HANDOFF" - End-of-session template

**In PRISM_KNOWLEDGE_BASE_v12.js:**
- Search "MIT 18.086" - Computational algorithms
- Search "MIT 6.251J" - Optimization algorithms
- Search "materialExpansion" - New materials data
- Search "strategyExpansion" - New strategies
- Search "formulas" - Calculation functions

---

## 📊 **BENEFITS OF THIS SYSTEM**

### **vs. Old 3-File System:**

```
✅ SMALLER SIZE
   Old: ~630 KB across 3 files
   New: ~97 KB across 2 files
   Savings: 85% reduction!

✅ EASIER TO USE
   Old: Search across 3 files
   New: One reference + one code file

✅ EXECUTABLE CODE
   Old: Text descriptions of algorithms
   New: Working MIT implementations

✅ DIRECT INTEGRATION
   Old: Read, then implement from scratch
   New: Import and use directly

✅ BETTER ORGANIZED
   Old: Some overlap/duplication
   New: Clean separation (protocols vs data)

✅ EASIER TO UPDATE
   Old: Update in 3 places
   New: Update roadmap in one place, data in another
```

---

## 🚀 **NEXT STEPS**

**For Your Next Session:**

1. **Load both files:**
   - Read: PRISM_MASTER_REFERENCE_v12.md (protocols & roadmap)
   - Import: PRISM_KNOWLEDGE_BASE_v12.js (algorithms & data)

2. **Start with Priority 1:**
   - Task: Add 192 materials to reach 810
   - Data source: `PRISM_KB.materialExpansion`
   - Build file: PRISM_v8_61_004_FULL.html
   - Save as: PRISM_v8_61_005_FULL.html

3. **Follow the workflow:**
   - Reference file: Tells you HOW and WHAT
   - Knowledge base: Gives you the DATA and CODE
   - Build file: Where you IMPLEMENT

4. **Update after completion:**
   - Mark materials expansion as complete in reference
   - Update status.layer1.components.materials in knowledge base
   - Move to Priority 2 (strategies)

---

## 💡 **PRO TIPS**

1. **Keep both files open** - Reference on left, code on right
2. **Search is your friend** - Both files are highly searchable
3. **Copy-paste from KB** - The code is ready to use
4. **Update status as you go** - Keep tracking accurate
5. **Use the handoff template** - Helps next session start smoothly

---

**END OF USAGE GUIDE**

Ready to transform PRISM development with the new 2-file system!
