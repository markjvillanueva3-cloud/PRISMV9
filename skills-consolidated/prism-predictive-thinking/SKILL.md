---
name: prism-predictive-thinking
description: |
  Forces anticipatory thinking, forecasting, and proactive problem-solving.
  Think N steps ahead. Predict consequences before they happen. Anticipate
  failures, edge cases, user needs, integration issues, and resource demands.
  Applied to development, machining, business, and all PRISM work.
---

# PRISM Predictive Thinking
## Think Ahead. Predict. Prevent. Prepare.

---

## THE PRINCIPLE

> **"Don't wait for problems - predict them. Don't react to failures - prevent them. Don't discover edge cases in production - anticipate them in design. Think N steps ahead in everything: code, machining, business, user experience. The best solution handles situations that haven't happened yet."**

Reactive thinking fixes problems.
Predictive thinking prevents them.

---

## THE PREDICTIVE FRAMEWORK

For every decision, task, or output:

```
1. FORECAST: What happens next? And after that? (N+1, N+2, N+3...)
2. BRANCH: What are ALL possible outcomes, not just the expected one?
3. FAILURE: What could go wrong? When? Why? How badly?
4. EDGE: What unusual but possible situations exist?
5. RIPPLE: What does this affect downstream?
6. RESOURCE: What will be needed that isn't obvious now?
7. PREPARE: What can I do NOW to handle FUTURE situations?
```

---

## THINKING HORIZONS

### Immediate (N+1)
What happens right after this action?

### Short-term (N+2 to N+5)
What cascades from that? What dependencies trigger?

### Medium-term (N+6 to N+20)
How does this integrate with other work? What patterns emerge?

### Long-term (N+20+)
How does this affect the final product? Users? Business?

---

## DOMAIN-SPECIFIC PREDICTION

### 1. CODE & DEVELOPMENT

**Predict Before Writing:**
```
□ What will break when this code runs?
□ What edge cases will users hit that I haven't tested?
□ What will the next developer misunderstand?
□ What will need to change when requirements evolve?
□ What dependencies will cause problems in 6 months?
□ What performance issues will emerge at scale?
□ What security vulnerabilities am I introducing?
```

**Prediction Template:**
```javascript
// BEFORE implementing a function, answer:

const predictionAnalysis = {
  
  // What inputs will actually arrive (not just what's documented)
  inputPredictions: {
    expected: ['valid material ID', 'positive feed rate'],
    likely: ['null', 'undefined', 'empty string', 'negative values'],
    unlikely_but_possible: ['SQL injection', 'extremely large numbers', 'NaN'],
    will_definitely_happen: ['wrong units', 'outdated IDs', 'typos']
  },
  
  // What will callers do with the output
  outputUsage: {
    immediate: 'Display in UI',
    downstream: 'Feed into force calculation',
    stored: 'Cached for session',
    exported: 'Sent to machine controller'
  },
  
  // What breaks if this fails
  failureImpact: {
    silent_wrong_answer: 'CRITICAL - user trusts bad data',
    crashes: 'MEDIUM - visible but disruptive',
    slow: 'LOW - annoying but functional'
  },
  
  // What changes will come
  futureChanges: {
    likely: ['Add more materials', 'Change calculation method'],
    possible: ['Multi-language support', 'Different unit systems'],
    remote: ['Complete algorithm replacement']
  },
  
  // How to design for predicted future
  designDecisions: {
    extensibility: 'Use strategy pattern for algorithm',
    validation: 'Validate ALL inputs, not just documented ones',
    errors: 'Return structured errors with recovery suggestions',
    logging: 'Log enough to debug issues I cannot predict'
  }
};
```

---

### 2. MACHINING & CUTTING

**Predict Before Generating Parameters:**
```
□ What material variations will the shop actually receive?
□ What tool wear state will exist when this runs?
□ What machine condition (thermal, mechanical) will affect this?
□ What fixtures/setups might be different than assumed?
□ What happens if the operator ignores a warning?
□ What environmental factors (coolant, temperature) will vary?
□ What mistakes have happened with similar jobs before?
```

**Prediction Template:**
```javascript
const machiningPrediction = {
  
  // Material will vary from spec
  materialVariation: {
    hardness: { expected: 32, range: [28, 38], unit: 'HRC' },
    composition: 'Heat-to-heat variation ±5%',
    condition: ['Annealed', 'Normalized', 'Unknown'],
    prediction: 'Design for worst-case hardness'
  },
  
  // Tool will not be new
  toolState: {
    wearLevels: ['New', '25%', '50%', '75%', 'Should replace'],
    mostLikely: '50% worn (mid-batch)',
    prediction: 'Parameters must work across wear range'
  },
  
  // Machine will have thermal growth
  machineState: {
    coldStart: 'First part of day - spindle cold',
    warmedUp: 'After 30 min - thermal equilibrium',
    hotDay: 'Ambient +10°C - additional growth',
    prediction: 'Include thermal compensation recommendation'
  },
  
  // Operator will do unexpected things
  humanFactors: {
    skipWarnings: 'Very likely - production pressure',
    overrideFeedrate: 'Common - perceived as too slow',
    wrongTool: 'Possible - similar tools in magazine',
    prediction: 'Make critical limits hard stops, not warnings'
  },
  
  // What to build into the output
  designForPredicted: {
    parameterRanges: 'Provide min/max, not just nominal',
    adaptiveRecommendation: 'Include feedback adjustment guide',
    failsafes: 'Hard limits on dangerous parameters',
    warnings: 'What to watch for as conditions change'
  }
};
```

---

### 3. TOOLPATH & CAM

**Predict Before Generating Paths:**
```
□ Where will the machine NOT follow the commanded path exactly?
□ Where will chip evacuation become a problem?
□ Where will tool deflection affect the cut?
□ Where will vibration/chatter develop?
□ What happens if stock is oversized?
□ What happens if stock is undersized or missing?
□ Where will thermal growth affect accuracy?
```

**Prediction Template:**
```javascript
const toolpathPrediction = {
  
  // Machine dynamics won't be perfect
  motionPrediction: {
    cornerSlowdown: 'Machine will not hit programmed feed in corners',
    acceleration: 'Actual accel 60-80% of spec on older machines',
    followingError: 'Servo lag increases with speed',
    prediction: 'Adjust feedrate expectations, add tolerance'
  },
  
  // Cutting forces will vary
  forcePrediction: {
    engagement: 'Full-width cuts 3x force of planned stepover',
    material: 'Hard spots in castings cause force spikes',
    tool: 'Worn tools increase forces 20-50%',
    prediction: 'Design paths for force peaks, not averages'
  },
  
  // Chips will cause problems
  chipPrediction: {
    packing: 'Deep pockets trap chips',
    recutting: 'Horizontal surfaces collect chips',
    evacuation: 'Upward helical paths help, downward traps',
    prediction: 'Include chip management in path strategy'
  },
  
  // Stock won't match model
  stockPrediction: {
    oversized: 'Castings often 2-5mm over nominal',
    undersized: 'Pre-machined features may be off',
    warped: 'Long parts bow, thin walls flex',
    prediction: 'First pass should be stock-adaptive'
  }
};
```

---

### 4. POST PROCESSOR & G-CODE

**Predict Before Generating Code:**
```
□ What controller firmware versions exist in the field?
□ What optional features may or may not be enabled?
□ What parameters might be set differently than expected?
□ What other programs running might affect this?
□ What network/communication issues could occur?
□ What will the operator do when they see this code?
```

**Prediction Template:**
```javascript
const postPrediction = {
  
  // Controller variations
  controllerVariation: {
    firmwareVersions: ['16.3', '18.1', '21.0', 'Unknown'],
    optionalFeatures: ['High-speed mode may be OFF', 'Canned cycles may differ'],
    parameterSettings: ['Block buffer size varies', 'Lookahead varies'],
    prediction: 'Test on oldest supported version, avoid optional features'
  },
  
  // What operator will do
  operatorBehavior: {
    editCode: 'May modify tool calls or speeds',
    runPartial: 'May start from middle of program',
    overrideFeed: 'Will adjust feed override 80-120%',
    dryRun: 'May run without coolant first',
    prediction: 'Code must be safe when edited or run partially'
  },
  
  // What environment varies
  environmentVariation: {
    drip_feed: 'Some machines drip-feed, not full download',
    network: 'Network may be slow or interrupted',
    memory: 'Older machines have limited program memory',
    prediction: 'Optimize block count, handle comms issues'
  },
  
  // First-run scenarios
  firstRunPrediction: {
    setupError: 'Work offset might be wrong',
    toolError: 'Wrong tool might be loaded',
    fixtureError: 'Part might not be clamped',
    prediction: 'Include verify blocks at critical points'
  }
};
```

---

### 5. USER EXPERIENCE & BUSINESS

**Predict Before Shipping Features:**
```
□ How will users misunderstand this feature?
□ How will users misuse this feature?
□ What will users expect that we don't provide?
□ What support requests will this generate?
□ What will competitors do when they see this?
□ What will users ask for next after using this?
□ How will this affect our cost structure?
```

**Prediction Template:**
```javascript
const businessPrediction = {
  
  // User behavior
  userPrediction: {
    willMisunderstand: ['Units', 'Coordinate systems', 'Tool definitions'],
    willMisuse: ['Override safety limits', 'Skip validation', 'Copy old programs'],
    willExpect: ['It just works', 'Like other software they use', 'Perfect first time'],
    willComplain: ['Too slow', 'Too complex', 'Doesn\'t match my workflow'],
    prediction: 'Design for misuse, not just proper use'
  },
  
  // Support load
  supportPrediction: {
    tier1Questions: ['How do I...', 'Where is...', 'Why did it...'],
    tier2Issues: ['Incorrect output', 'Crash/error', 'Performance'],
    tier3Bugs: ['Edge cases', 'Integration failures', 'Data corruption'],
    prediction: 'Build self-service answers into UI, log everything for debug'
  },
  
  // Market response
  marketPrediction: {
    competitorResponse: 'Will copy in 6-12 months',
    customerDemand: 'Will want more after seeing this',
    pricingSensitivity: 'Will compare to free alternatives',
    prediction: 'Build defensible moat, plan v2 before v1 ships'
  }
};
```

---

### 6. SESSION & CONTEXT MANAGEMENT

**Predict During Development Sessions:**
```
□ When will context window fill up?
□ What information will I need that isn't loaded?
□ What will the next session need to continue this?
□ What will I forget if this session ends abruptly?
□ What checkpoint will be most valuable to have?
□ What could cause this session to fail unexpectedly?
```

**Prediction Template:**
```javascript
const sessionPrediction = {
  
  // Context management
  contextPrediction: {
    currentUsage: 'Estimate tokens used so far',
    remainingCapacity: 'Estimate tokens available',
    criticalPointEstimate: 'When will I hit yellow/red?',
    prediction: 'Checkpoint at 60% capacity, not 90%'
  },
  
  // Session continuity
  continuityPrediction: {
    willNeed: ['File paths', 'Progress counts', 'Decision rationale'],
    mightForget: ['Why I made a choice', 'What I tried that failed'],
    nextSessionNeeds: ['Clear starting point', 'Context summary', 'Remaining tasks'],
    prediction: 'Document decisions AS I make them, not at end'
  },
  
  // Failure scenarios
  failurePrediction: {
    browserCrash: 'Could lose unsaved work',
    timeout: 'Long operations might fail',
    networkIssue: 'Could lose connection mid-task',
    prediction: 'Save incrementally, not just at end'
  }
};
```

---

## PREDICTION TECHNIQUES

### 1. Pre-Mortem Analysis

Before starting, imagine it failed. Why?

```
TASK: Implement material database extraction

PRE-MORTEM: It's 3 weeks later and extraction failed. What went wrong?

- "We missed 200 materials that were in an unusual format"
- "The physics parameters were in different units than expected"
- "Some materials had circular references we didn't handle"
- "The file got too large for the system to handle"
- "We didn't validate against the original and drift occurred"

NOW: Design to prevent each predicted failure.
```

### 2. Branch Prediction

For every decision, map ALL outcomes:

```
DECISION: Use JSON vs Database for material storage

BRANCH ANALYSIS:
                    ┌─→ Easy to edit manually
        ┌─ JSON ────┼─→ No query capability
        │           └─→ Performance issues at scale
CHOICE ─┤
        │           ┌─→ Query flexibility
        └─ Database ┼─→ Setup complexity
                    └─→ Migration needed later

PREDICTION: Start JSON, but design abstraction layer for future DB migration.
```

### 3. Ripple Mapping

Trace effects downstream:

```
CHANGE: Modify cutting force calculation

RIPPLE MAP:
Force Calc ──→ Power Calc ──→ Machine Selection ──→ Cost Estimate
    │              │                  │                   │
    └──→ Tool Life └──→ Tool Cost ────┴──→ Quote Accuracy─┘
           │
           └──→ Surface Finish Prediction

AFFECTED CONSUMERS: 7 direct, 12 indirect
PREDICTION: Change requires validation across all consumers.
```

### 4. N-Step Lookahead

Think multiple moves ahead:

```
CURRENT TASK: Extract materials database

N+1: Materials extracted to JSON
N+2: Need to validate against physics constraints
N+3: Need to wire to speed/feed calculator
N+4: Calculator needs tool database too
N+5: Tool + Material combination creates matrix
N+6: Matrix too large - need optimization
N+7: Optimization needs caching strategy
N+8: Caching affects memory usage
N+9: Memory affects which devices can run this

PREDICTION: Design extraction WITH caching/optimization in mind from start.
```

---

## PREDICTION CHECKLISTS

### Before ANY Task

```
□ What are the 3 most likely ways this fails?
□ What's the worst case scenario?
□ What will I wish I had done differently?
□ What will the next person to touch this need to know?
□ What changes in 6 months that affects this?
```

### Before Writing Code

```
□ What inputs will actually arrive vs. documented?
□ What will callers do with wrong output?
□ What exceptions will occur that I haven't caught?
□ What will make this code obsolete?
□ What will make this code a bottleneck?
```

### Before Generating Machining Output

```
□ What machine/material/tool variations exist?
□ What will the operator do that I didn't expect?
□ What environmental factors will change?
□ What failures will occur that aren't in the model?
□ What will make someone get hurt?
```

### Before Shipping Feature

```
□ What will users misunderstand?
□ What will users try that we didn't design for?
□ What support tickets will this generate?
□ What will competitors copy first?
□ What will users demand next?
```

### Before Ending Session

```
□ What will I wish I had saved?
□ What will the next session need?
□ What context will be lost?
□ What decisions need explanation?
□ What's the minimum to resume cleanly?
```

---

## INTEGRATION WITH OTHER SKILLS

| Skill | Prediction Integration |
|-------|----------------------|
| life-safety-mindset | Predict failure modes that cause injury |
| maximum-completeness | Predict what "complete" will mean as requirements evolve |
| innovation-engine | Predict which innovations will succeed vs. fail |
| skill-orchestrator | Predict which skills will be needed for task |
| quality-gates | Predict what tests will catch real issues |
| session-handoff | Predict what next session will need |

---

## THE PREDICTION COMMITMENT

> I will not start a task without predicting how it could fail.
> I will not write code without predicting how it will be misused.
> I will not generate machining parameters without predicting variations.
> I will not ship features without predicting user behavior.
> I will not end sessions without predicting continuation needs.
>
> Prediction is not pessimism - it's preparation.
> The best time to solve a problem is before it exists.

---

## REMEMBER

- Predicted problems are preventable problems
- Edge cases in your mind are production cases in reality
- Users will do everything you didn't expect
- Machines will vary from every assumption
- Context will be lost if not preserved
- The future arrives whether you prepared or not

**Think ahead. Predict. Prevent. Prepare.**

---

**Version 1.0 | Created 2026-01-24 | PRISM Predictive Thinking**
