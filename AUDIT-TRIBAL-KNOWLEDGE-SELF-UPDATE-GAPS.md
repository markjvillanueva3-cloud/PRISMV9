# Tribal Knowledge Propagation — Self-Update Mechanism Audit
**Agent 17 Code Review** | 2026-03-31

---

## The Self-Update Question

> **"As new tribal knowledge is captured during execution, do future sessions automatically see it? Or is the tip count frozen at 3,700?"**

**Answer:** The tip count IS effectively frozen at 4,129 (3,752 CAM + 377 hardcoded). Captured knowledge is not fed back.

---

## Current Learning Flow

```
Execution Session
    ↓
  tribal_capture(tip) called
    ↓
  Stored in tribalKnowledgeEngine.tips[] (in-memory)
    ↓
  Server Restarts
    ↓
  tribalKnowledgeEngine.tips[] LOST
    ↓
  Next session sees ONLY 4,129 original tips
```

**Verdict:** Zero persistence. Zero self-update. Captured knowledge is 100% ephemeral.

---

## Self-Update Gaps Identified

### GAP 1: No Persistence Layer for Runtime Captures

**Issue:** `TribalKnowledgeEngine.capture()` pushes to in-memory array only.

```typescript
// Current code (TribalKnowledgeEngine.ts line ~XXX)
capture(tip: TipInput): void {
  const newTip = { id: generateId(), ...tip, created_at: Date.now() };
  this.tips.push(newTip); // IN-MEMORY ONLY
  // ^ No write to disk/DB
}
```

**Gap:** When server restarts, `this.tips` is re-initialized from static sources only.

**Fix Required:**
```typescript
capture(tip: TipInput): void {
  const newTip = { id: generateId(), ...tip, created_at: Date.now() };
  this.tips.push(newTip);
  this.persistToLearningsJournal(newTip); // NEW — write to disk
}

private persistToLearningsJournal(tip: KnowledgeTip): Promise<void> {
  // Append to H:/prism/mcp-server/data/learnings-journal-YYYY-MM-DD.jsonl
  // Format: { id, source, scope, evidence_level, created_at, ...tip }
}
```

**Effort:** 1-2 days (file I/O, atomic writes, journal rotation)

---

### GAP 2: Learnings Journal Not Integrated into Initialization

**Issue:** On server restart, TribalKnowledgeEngine loads only static sources.

```typescript
// Current init (TribalKnowledgeEngine.ts)
constructor() {
  this.tips = [
    ...CAM_TIPS, // 3,752 items
    ...KNOWLEDGE_BASE, // 377 items
    // NO learnings journal load
  ];
}
```

**Gap:** Captured tips from previous session are never reloaded.

**Fix Required:**
```typescript
async constructor(config: EngineConfig) {
  const staticTips = [...CAM_TIPS, ...KNOWLEDGE_BASE];
  const journalTips = await this.loadLearningsJournal();
  
  this.tips = [
    ...staticTips,
    ...journalTips, // RESTORED FROM DISK
  ];
  
  // Track source for lineage
  this.tipMetadata = {
    static_count: staticTips.length,
    learned_count: journalTips.length,
    last_journal_sync: Date.now(),
  };
}

private async loadLearningsJournal(): Promise<KnowledgeTip[]> {
  // Read H:/prism/mcp-server/data/learnings-journal-*.jsonl
  // Filter by date/scope
  // Return array of tips
}
```

**Effort:** 2 days (file parsing, deduplication, scope filtering)

---

### GAP 3: No Confidence/Evidence Tracking on Captured Tips

**Issue:** All captured tips treated as equal. No way to distinguish "1-time observation" vs. "proven across 10 jobs".

**Current TipInput:**
```typescript
interface TipInput {
  title: string;
  statement: string;
  knowledge_type: string; // 'tip' | 'workaround' | 'anti-pattern' | ...
}
```

**Gap:** No fields for evidence level, confidence score, scope, or applicability.

**Fix Required:**
```typescript
interface KnowledgeTip {
  id: string;
  title: string;
  statement: string;
  knowledge_type: 'tip' | 'anti-pattern' | 'rule' | 'workaround' | 'failure_mode' | ...;
  source: 'operator_capture' | 'apprentice' | 'document_learning' | 'video_learning' | 'video_learning' | ...;
  scope: 'global' | 'process_family' | 'machine_family' | 'controller' | 'material_family' | 'shop_local';
  applicability_tags: {
    material?: string[]; // ['4340', '7075', ...]
    machine?: string[]; // ['Haas VF4', 'Mazak Integrex', ...]
    controller?: string[]; // ['Fanuc 0i', 'Siemens 840D', ...]
    operation?: string[]; // ['turning', 'milling', 'threading', ...]
    feature?: string[]; // ['hole', 'pocket', 'surface', ...]
  };
  evidence_level: 'tribal' | 'repeated_local' | 'repeated_cross_shop' | 'formula_backed' | 'simulation_backed' | 'production_validated';
  confidence: number; // 0.0-1.0; starts at 0.3 (tribal), increases to 0.9+ (validated)
  usage_count: number; // Incremented when tip is consulted
  success_count: number; // Incremented when recommendation based on this tip succeeds
  last_validated_at?: Date;
  conflicts_with?: string[]; // Other tip IDs
  supersedes?: string[]; // Tips made obsolete by this one
  created_at: Date;
  created_by: string; // operator ID or system source
}
```

**Fix Required:** Update TribalKnowledgeEngine schema + capture interface.

**Effort:** 3 days (schema, validation, query methods for confidence filtering)

---

### GAP 4: No Promotion Mechanism (Tribal → Verified)

**Issue:** A tip captured once stays in memory. There's no path for it to be "promoted" to a rule that consumers rely on.

**Current Flow:**
```
captured_tip → in-memory array → lost on restart → never influences decisions
```

**Required Flow:**
```
captured_tip (evidence: tribal, confidence: 0.3)
    ↓ (used 10 times, 8 successes)
  (evidence: repeated_local, confidence: 0.8)
    ↓ (validated across 3 shops)
  (evidence: repeated_cross_shop, confidence: 0.9)
    ↓ (integrated into roadmap SMART CONFIG)
  InvokesTierConsumers (SpeedFeed, Print-to-Program, etc.)
```

**Gap:** No `KnowledgePromotionEngine` or promotion queue.

**Fix Required:**
```typescript
// New engine: KnowledgePromotionEngine.ts
class KnowledgePromotionEngine {
  async evaluateForPromotion(tipId: string): Promise<{
    should_promote: boolean;
    current_evidence: 'tribal' | 'repeated_local' | ...;
    next_evidence: string;
    criteria_met: {
      usage_count: { required: number; actual: number };
      success_rate: { required: number; actual: number };
      cross_shop_validation: boolean;
    };
    promotion_date: Date | null;
  }> {
    const tip = tribalKnowledgeEngine.getTip(tipId);
    
    if (tip.evidence_level === 'tribal' && tip.success_count >= 8 && tip.usage_count >= 10) {
      return {
        should_promote: true,
        current_evidence: 'tribal',
        next_evidence: 'repeated_local',
        criteria_met: { ... },
        promotion_date: new Date(),
      };
    }
    
    return { should_promote: false, ... };
  }

  async promoteToRoadmap(tipId: string): Promise<void> {
    const tip = tribalKnowledgeEngine.getTip(tipId);
    
    // Find next roadmap session(s) where this tip applies
    // Update roadmap SMART CONFIG: knowledge_sources.push(tip)
    // Trigger re-validation of all consumers that use this tip
  }
}
```

**Effort:** 5 days (scoring logic, roadmap re-binding, dispatcher notification)

---

### GAP 5: Roadmaps Don't Query Learnings Journal

**Issue:** Machine roadmaps are static YAML/Markdown. They don't pull from the learnings journal during session planning.

**Example:** MILL-MS5 (adaptive) roadmap created 2026-03-23. Between then and now (2026-03-31), operator captured 12 tips about adaptive trochoidal feed rates. The roadmap doesn't know about them.

**Gap:** No mechanism for roadmaps to say "what tribal knowledge has been captured about this milestone since the last execution?"

**Fix Required:**

```typescript
// In roadmap expansion (v24 or /rgs-sync):
interface RoadmapSessionContext {
  milestone_id: string; // 'MILL-MS5'
  operation_type: string; // 'adaptive_trochoidal'
  material_scope: string[]; // ['4340', '7075']
  known_tribal_tips_at_session_time: number; // 4129 (baseline)
  new_tribal_tips_since_last_session: KnowledgeTip[]; // Query journal
  promoted_tips_available: KnowledgeTip[]; // Recently promoted
}

async function expandRoadmapSessionWithTribalKnowledge(
  roadmapSessionId: string,
  tribalEngine: TribalKnowledgeEngine
): Promise<EnrichedRoadmapSession> {
  const session = loadRoadmapSession(roadmapSessionId);
  
  // Query journal for tips matching this session's scope
  const newTips = tribalEngine.searchJournal({
    created_since: session.last_executed_at || new Date(0),
    applicable_to: session.operation_type,
    evidence_level_min: 'repeated_local',
  });
  
  // Add to KNOWLEDGE SOURCES
  const enriched = {
    ...session,
    knowledge_sources: [
      ...session.knowledge_sources,
      ...newTips.map(t => `tribal_tip_${t.id}`),
    ],
    notes: `${newTips.length} new tribal tips since last session`,
  };
  
  return enriched;
}
```

**Effort:** 3-4 days (journal query, roadmap enrichment, test coverage)

---

### GAP 6: No Feedback Loop from Actual Outcomes to Tip Confidence

**Issue:** When a job completes, actual cycle time is captured. But it never updates tip confidence.

**Example:**
1. Tip: "For 4340 turning, use CSS mode at 95 SFM for ductile chips"
2. Job executed using this tip
3. Actual cycle: 12 min vs. estimated 13 min (tip seems good!)
4. Tip confidence should increase: 0.5 → 0.6

**Current:** No feedback mechanism exists.

**Gap:** No `KnowledgeFeedbackIngestEngine` (TK-3 roadmap, not yet built).

**Fix Required:**

```typescript
// New engine: KnowledgeFeedbackIngestEngine.ts
class KnowledgeFeedbackIngestEngine {
  async ingestJobOutcome(jobId: string, outcome: JobOutcome): Promise<void> {
    // Retrieve job's program history
    const program = await getGeneratedProgram(jobId);
    
    // Identify which tribal tips were consulted
    const consulted_tips = program.metadata.tribal_tips_consulted || [];
    
    // Measure outcome vs. plan
    const delta = {
      cycle_time_actual: outcome.actual_cycle_min,
      cycle_time_planned: program.estimated_cycle_min,
      tool_life_actual: outcome.tool_life_minutes,
      tool_life_planned: program.estimated_tool_life_min,
      surface_finish_actual: outcome.measured_ra_um,
      surface_finish_planned: program.estimated_ra_um,
      success: outcome.quality_pass && outcome.no_crashes,
    };
    
    // Update tip confidence for each consulted tip
    for (const tipId of consulted_tips) {
      const tip = tribalKnowledgeEngine.getTip(tipId);
      
      // Bayesian confidence update
      if (delta.success) {
        tip.success_count += 1;
      }
      tip.usage_count += 1;
      tip.last_validated_at = new Date();
      
      // Calculate new confidence
      const success_rate = tip.success_count / tip.usage_count;
      tip.confidence = 0.3 + (success_rate * 0.7); // 0.3 base + 0.7 earned
      
      // Maybe promote?
      await knowledgePromotionEngine.evaluateForPromotion(tipId);
    }
  }
}
```

**Effort:** 6 days (outcome data collection, Bayesian math, validation)

---

### GAP 7: Consumer Engines Don't Report Which Tips They Used

**Issue:** When SpeedFeedOrchestratorEngine recommends a speed, it doesn't record which tribal tips influenced that decision. So we can't measure their effectiveness.

**Current:** Engine returns `{ speed: 200, feed: 0.005 }`. No metadata about reasoning.

**Gap:** No `decision_trace` or `tribal_tips_consulted` in output.

**Fix Required:**

```typescript
// All consumer engines should return:
interface RecommendationWithProvenance {
  value: any; // speed, feed, toolpath, etc.
  source: 'formula' | 'lookup' | 'adaptive' | 'tribal';
  tribal_tips_consulted: string[]; // Tip IDs
  tribal_tips_applied: string[]; // Tip IDs that directly influenced this
  confidence: number;
  rationale: string[];
}

// Example from SpeedFeedOrchestratorEngine:
async recommendSpeed(context): Promise<RecommendationWithProvenance> {
  // Default formula-based speed
  const baseSpeed = this.kienzle.compute(...);
  
  // Query tribal tips
  const tips = tribalKnowledgeEngine.search({
    operation_type: context.operation,
    material: context.material_iso,
    machine: context.machine_id,
  });
  
  let adjustedSpeed = baseSpeed;
  const appliedTips = [];
  
  for (const tip of tips) {
    if (tip.title.includes('CSS') && context.machine_has_css) {
      adjustedSpeed *= tip.css_mode_adjustment || 1.0;
      appliedTips.push(tip.id);
    }
  }
  
  return {
    value: adjustedSpeed,
    source: 'tribal',
    tribal_tips_consulted: tips.map(t => t.id),
    tribal_tips_applied: appliedTips,
    confidence: tips.length > 0 ? 0.8 : 0.5,
    rationale: [
      `Base Kienzle: ${baseSpeed}`,
      `Applied ${appliedTips.length} tips: ${appliedTips.map(id => tribalKnowledgeEngine.getTip(id).title).join(', ')}`,
      `Final speed: ${adjustedSpeed}`,
    ],
  };
}
```

**Effort:** 8-10 days (update all consumers, schema changes, testing)

---

### GAP 8: No Knowledge Versioning or Deprecation

**Issue:** A tip captured in 2026-01 might be obsolete by 2026-03 (material supplier changed, new tool geometry available, etc.). But there's no way to deprecate it.

**Gap:** Tips are permanent; no supersession or sunset mechanism.

**Fix Required:**

```typescript
interface KnowledgeTip {
  // ... existing fields ...
  
  // NEW: Lifecycle fields
  status: 'active' | 'deprecated' | 'superseded' | 'under_review';
  deprecated_at?: Date;
  deprecated_reason?: string; // "New supplier tool geometry incompatible"
  superseded_by?: string[]; // Tip IDs that replace this
  review_schedule?: {
    next_validation_date: Date;
    validation_frequency: 'monthly' | 'quarterly' | 'annually';
  };
}

// Deprecation hook
tribalKnowledgeEngine.deprecate(tipId, {
  reason: 'New Sandvik insert geometry contradicts original tip',
  superseded_by: ['tip_id_new_geometry_variant'],
  effective_date: new Date(),
});

// On query, filter out deprecated tips unless explicitly requested
tribalKnowledgeEngine.search({
  operation_type: 'turning',
  material_iso: 'M',
  include_deprecated: false, // DEFAULT — excludes deprecated
});
```

**Effort:** 2-3 days (schema, filtering, lifecycle hooks)

---

## Summary: Self-Update Gaps

| Gap # | Issue | Current State | Required State | Effort |
|-------|-------|----------------|-----------------|--------|
| 1 | Persistence | In-memory only | Learnings journal on disk | 1-2 days |
| 2 | Journal reload | Not loaded | Load on init | 2 days |
| 3 | Evidence tracking | None | Full metadata + confidence | 3 days |
| 4 | Promotion queue | No mechanism | KnowledgePromotionEngine | 5 days |
| 5 | Roadmap enrichment | Static only | Query journal on session plan | 3-4 days |
| 6 | Feedback loop | No data flow | JobOutcome → tip confidence | 6 days |
| 7 | Consumer tracing | No provenance | Decision trace with tip IDs | 8-10 days |
| 8 | Deprecation | Permanent tips | Status + lifecycle | 2-3 days |
| **TOTAL** | **Self-Update System** | **Non-functional** | **Fully operational** | **~30-35 days** |

---

## Architecture Required for Self-Update

```
┌─────────────────────────────────────────────────────┐
│           SELF-UPDATING TRIBAL KNOWLEDGE             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. CAPTURE LAYER (Operators, Apprentice)          │
│     tribal_capture(tip) → LearningsJournal.jsonl    │
│                                                     │
│  2. PERSISTENCE LAYER                              │
│     H:/prism/mcp-server/data/learnings-journal-*.jsonl │
│                                                     │
│  3. RELOAD LAYER (on init)                         │
│     TribalKnowledgeEngine.init() loads journal      │
│                                                     │
│  4. CONFIDENCE LAYER                               │
│     tip.confidence += outcome.success_rate         │
│                                                     │
│  5. PROMOTION LAYER                                │
│     repeated_local → repeated_cross_shop → rules   │
│                                                     │
│  6. ROADMAP ENRICHMENT LAYER                       │
│     Roadmap.SMART_CONFIG += promoted_tips          │
│                                                     │
│  7. CONSUMER WIRING LAYER                          │
│     SpeedFeed, Print-to-Prog, etc. consult tips    │
│                                                     │
│  8. TRACING LAYER                                  │
│     RecommendationWithProvenance records which tip │
│                                                     │
│  9. FEEDBACK LOOP LAYER                            │
│     JobOutcome → tip.success_count++               │
│                                                     │
│  10. DEPRECATION LAYER                             │
│      Old tips sunset automatically                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Sequencing

### Phase 1: Persistence + Reload (Gaps 1-2)
**Days 1-4** — Make tribal knowledge survive restarts.

### Phase 2: Tracking + Promotion (Gaps 3-5)
**Days 5-13** — Enable tips to earn confidence and flow back to roadmaps.

### Phase 3: Feedback + Tracing (Gaps 6-7)
**Days 14-24** — Measure tip effectiveness and trace decisions.

### Phase 4: Lifecycle (Gap 8)
**Days 25-27** — Enable deprecation and continuous validation.

**Total:** ~30-35 days to fully implement self-update.

---

## Success Criteria

Once all gaps are closed:

1. ✓ Operator captures tip → persists to disk → appears in next session
2. ✓ Tip used 10 times with 8 successes → promoted to "repeated_local"
3. ✓ Promoted tip auto-injected into next roadmap session
4. ✓ Consumer engine records which tips it consulted
5. ✓ Job outcome data increments tip confidence
6. ✓ Old tips can be deprecated when contradicted by new data
7. ✓ Roadmaps show `knowledge_version` so we know when they were last updated
8. ✓ System is self-improving: each job makes PRISM slightly smarter

---

## Recommendation

**Start self-update implementation immediately after TK-1 (persistence layer).**

TK-1 timeline: 2026-04-07 through 2026-04-15 (8 days)
Self-update implementation: 2026-04-16 through 2026-05-20 (30 days)
Full tribal knowledge propagation: 2026-05-21 (SVI +50%, Psi → 90%)

Contact: Backend (Claude) for all 8 gaps.
