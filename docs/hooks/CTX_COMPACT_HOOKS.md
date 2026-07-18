# PRISM Compaction Recovery Hooks v1.0
# Part of Tier 0 (SURVIVAL) - Session 0.1: Compaction Recovery System
#
# Hook IDs: CTX-COMPACT-001, CTX-COMPACT-002, CTX-COMPACT-003
# Category: context
# Enforcement: MANDATORY

---

## CTX-COMPACT-001: Compaction Detection Hook

**ID:** CTX-COMPACT-001
**Name:** Automatic Compaction Detection
**Category:** context
**Trigger:** Session start, resume, or context pressure detected
**Enforcement:** MANDATORY

### Purpose
Automatically detect context compaction at critical moments to prevent work loss.

### Trigger Conditions
1. New session started (first message in conversation)
2. Context pressure > 75%
3. Unusual time gap between messages (>2 hours)
4. Missing context references detected
5. State file inconsistency detected

### Actions
```python
def ctx_compact_001_hook():
    from core.compaction_detector import CompactionDetector
    detector = CompactionDetector()
    result = detector.detect()
    
    if result.is_compacted:
        log_event("CTX-COMPACT-001", {
            "type": result.compaction_type.value,
            "confidence": result.confidence
        })
        trigger_hook("CTX-COMPACT-002", result.to_dict())
        return {"hook": "CTX-COMPACT-001", "action": "triggered"}
    
    return {"hook": "CTX-COMPACT-001", "action": "passed"}
```

---

## CTX-COMPACT-002: State Reconstruction Hook

**ID:** CTX-COMPACT-002
**Name:** Automatic State Reconstruction
**Category:** context
**Trigger:** CTX-COMPACT-001 detection, or manual trigger
**Enforcement:** MANDATORY when compaction detected

### Purpose
Automatically reconstruct state from available sources after compaction.

### Actions
```python
def ctx_compact_002_hook(compaction_result=None):
    from core.state_reconstructor import StateReconstructor
    from core.recovery_scorer import RecoveryScorer
    
    reconstructor = StateReconstructor()
    result = reconstructor.reconstruct(force=True)
    
    scorer = RecoveryScorer()
    score = scorer.score(result.reconstructed_state)
    
    if score.overall >= 60:
        reconstructor.save(result.reconstructed_state, backup=True)
        trigger_hook("CTX-COMPACT-003", {"state": result.reconstructed_state, "score": score.to_dict()})
        return {"hook": "CTX-COMPACT-002", "action": "reconstructed", "score": score.overall}
    
    return {"hook": "CTX-COMPACT-002", "action": "manual_required", "score": score.overall}
```

---

## CTX-COMPACT-003: Resume Validation Hook

**ID:** CTX-COMPACT-003
**Name:** Resume Validation and Execution
**Category:** context
**Trigger:** CTX-COMPACT-002 completion, or session resume
**Enforcement:** MANDATORY before continuing work

### Purpose
Validate recovered state and prepare for work continuation.

### Actions
```python
def ctx_compact_003_hook(reconstruction_result=None):
    from core.resume_detector import ResumeDetector
    
    detector = ResumeDetector()
    resume = detector.detect()
    
    return {
        "hook": "CTX-COMPACT-003",
        "action": "validated",
        "scenario": resume.scenario.value,
        "quick_resume": resume.quick_resume,
        "safe_to_continue": resume.confidence >= 0.6
    }
```

---

## Hook Chain

```
Session Start ──► CTX-COMPACT-001 ──► CTX-COMPACT-002 ──► CTX-COMPACT-003 ──► Resume
                   (Detect)            (Reconstruct)       (Validate)
```

---

**Version:** 1.0 | **Session:** 0.1 | **Tier:** 0 (SURVIVAL)
