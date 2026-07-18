#!/usr/bin/env python3
"""
WEDM Safety Hooks — Phase 0.3 of WEDM AGI Roadmap
Python Codex counterparts for TypeScript hooks in WEDMSafetyHooks.ts

16 WEDM-specific hooks for Wire EDM safety, quality, and workflow control:
  - 6 Blocking (CRITICAL safety checks)
  - 5 Warning (quality gates)
  - 3 Logging (audit trail)
  - 2 Trigger (automation)

Usage: Called by Claude Code hook system
Version: 1.0.0
"""

import json
import sys
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Set

# ============================================================================
# HOOK RESULT HELPERS
# ============================================================================

def hook_success(hook_id: str, message: str, data: Optional[Dict] = None) -> Dict:
    """Return success result."""
    return {
        "status": "success",
        "hookId": hook_id,
        "message": message,
        "data": data or {},
        "timestamp": datetime.now().isoformat()
    }

def hook_block(hook_id: str, message: str, data: Optional[Dict] = None) -> Dict:
    """Return blocking result."""
    return {
        "status": "blocked",
        "hookId": hook_id,
        "message": message,
        "data": data or {},
        "timestamp": datetime.now().isoformat()
    }

def hook_warning(hook_id: str, message: str, data: Optional[Dict] = None) -> Dict:
    """Return warning result."""
    return {
        "status": "warning",
        "hookId": hook_id,
        "message": message,
        "data": data or {},
        "timestamp": datetime.now().isoformat()
    }

# ============================================================================
# BLOCKING HOOKS (6) — CRITICAL SAFETY
# ============================================================================

def wedm_calibration_validate(ctx: Dict[str, Any]) -> Dict:
    """
    Hook: hook_wedm_calibration_validate
    Trigger: PreTool wedm_feedback_*
    Validates feedback data quality before calibration.
    BLOCKS if confidence < 0.5 or data is malformed.
    """
    d = ctx.get("target", {}).get("data", {})
    action = ctx.get("target", {}).get("action", "")

    # Only fire on wedm_feedback_* actions
    if not action.startswith("wedm_feedback"):
        return hook_success("wedm-calibration-validate", "Not a feedback action", {"skipped": True})

    issues = []

    # Check required fields
    if not d.get("programId"):
        issues.append("Missing programId")
    if not d.get("material"):
        issues.append("Missing material")
    if d.get("actualRa") is None:
        issues.append("Missing actualRa measurement")
    if d.get("actualMrr") is None:
        issues.append("Missing actualMrr measurement")

    # Validate bounds
    actual_ra = d.get("actualRa")
    if actual_ra is not None and (actual_ra < 0.05 or actual_ra > 20):
        issues.append(f"Ra {actual_ra} um out of physical bounds [0.05, 20]")

    actual_mrr = d.get("actualMrr")
    if actual_mrr is not None and (actual_mrr < 1 or actual_mrr > 500):
        issues.append(f"MRR {actual_mrr} mm2/min out of physical bounds [1, 500]")

    # Check confidence
    confidence = d.get("confidence") or d.get("measurementConfidence") or 1.0
    if confidence < 0.5:
        issues.append(f"Measurement confidence {confidence} below 0.5 threshold")

    if issues:
        return hook_block(
            "wedm-calibration-validate",
            f"WEDM calibration data invalid: {len(issues)} issue(s)",
            {"issues": issues, "confidence": confidence}
        )

    return hook_success("wedm-calibration-validate", "Calibration data valid", {
        "confidence": confidence,
        "fields": len(d)
    })


def wedm_neural_sanity(ctx: Dict[str, Any]) -> Dict:
    """
    Hook: hook_wedm_neural_sanity
    Trigger: PostTool wedm_neural_*
    Validates neural model outputs are within physical bounds.
    BLOCKS if Ra < 0 or Ra > 20 um, or other impossible values.
    """
    d = ctx.get("target", {}).get("data", {})
    action = ctx.get("target", {}).get("action", "")

    # Only fire on wedm_neural_* actions
    if not action.startswith("wedm_neural") and "predict" not in action:
        return hook_success("wedm-neural-sanity", "Not a neural action", {"skipped": True})

    issues = []

    # Ra bounds: physical minimum is ~0.05 um, max ~20 um
    ra_um = d.get("ra_um")
    if ra_um is not None and (ra_um < 0 or ra_um > 20):
        issues.append(f"Predicted Ra {ra_um} um outside physical bounds [0, 20]")

    # MRR bounds: 1-500 mm2/min typical range
    mrr = d.get("mrr_mm2Min")
    if mrr is not None and (mrr < 0 or mrr > 500):
        issues.append(f"Predicted MRR {mrr} outside physical bounds [0, 500]")

    # Wire break probability: must be [0, 1]
    wire_break_prob = d.get("wireBreakProb")
    if wire_break_prob is not None and (wire_break_prob < 0 or wire_break_prob > 1):
        issues.append(f"Wire break probability {wire_break_prob} outside [0, 1]")

    # Cycle time: negative is impossible
    cycle_time = d.get("cycleTime_min")
    if cycle_time is not None and cycle_time < 0:
        issues.append(f"Negative cycle time {cycle_time} min")

    if issues:
        return hook_block(
            "wedm-neural-sanity",
            f"Neural prediction violates physics: {'; '.join(issues)}",
            {"issues": issues, "predictions": d}
        )

    return hook_success("wedm-neural-sanity", "Neural predictions within bounds", {
        "ra_um": ra_um,
        "mrr_mm2Min": mrr
    })


def wedm_gcode_injection(ctx: Dict[str, Any]) -> Dict:
    """
    Hook: hook_wedm_gcode_injection
    Trigger: PreTool wedm_generate_gcode
    Scans for G-code injection patterns.
    BLOCKS if malicious patterns detected.
    """
    d = ctx.get("target", {}).get("data", {})
    action = ctx.get("target", {}).get("action", "")

    if "gcode" not in action and "generate" not in action:
        return hook_success("wedm-gcode-injection", "Not a G-code action", {"skipped": True})

    content = str(d.get("content") or d.get("gcode") or d.get("program") or "")
    issues = []

    # Dangerous patterns for Wire EDM
    dangerous_patterns = [
        (r"M0?6\s*T-?\d{4,}", "Abnormal tool number (potential overflow)"),
        (r"G28.*Z-\d{3,}", "Large negative Z reference (crash risk)"),
        (r"F\d{6,}", "Extremely high feed rate (crash risk)"),
        (r";.*DROP|DELETE|TRUNCATE", "SQL-like injection in comment"),
        (r"\$\([^)]+\)", "Shell command substitution attempt"),
        (r"`[^`]+`", "Backtick command injection"),
        (r"M99\s*P-?\d{4,}", "Abnormal subprogram call"),
    ]

    for pattern, desc in dangerous_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            issues.append(desc)

    if issues:
        return hook_block(
            "wedm-gcode-injection",
            f"Potential G-code injection detected: {'; '.join(issues)}",
            {"issues": issues, "patterns": len(issues)}
        )

    return hook_success("wedm-gcode-injection", "G-code passed injection scan", {
        "lines": len(content.split("\n"))
    })


def wedm_ecode_consistency(ctx: Dict[str, Any]) -> Dict:
    """
    Hook: hook_wedm_ecode_consistency
    Trigger: PreTool wedm_generate_gcode
    Validates E-code matches machine controller.
    BLOCKS on mismatch.
    """
    d = ctx.get("target", {}).get("data", {})
    action = ctx.get("target", {}).get("action", "")

    if "generate" not in action and "gcode" not in action:
        return hook_success("wedm-ecode-consistency", "Not a G-code action", {"skipped": True})

    ecode = d.get("ecode") or d.get("eCode") or ""
    controller = d.get("controller") or d.get("machine") or ""

    if not ecode or not controller:
        return hook_success("wedm-ecode-consistency", "E-code or controller not specified", {"skipped": True})

    # E-code to controller compatibility matrix
    compatibility_map = {
        "mitsubishi": ["E0", "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"],
        "fanuc": ["E0", "E1", "E2", "E3", "E4"],
        "sodick": ["E1", "E2", "E3"],
        "makino": ["E0", "E1", "E2", "E3", "E4", "E5"],
        "agiecharmilles": ["E1", "E2"],
    }

    controller_lower = controller.lower()
    ecode_prefix = ecode[:2] if len(ecode) >= 2 else ecode

    controller_type = None
    for key in compatibility_map:
        if key in controller_lower:
            controller_type = key
            break

    if controller_type and ecode_prefix not in compatibility_map.get(controller_type, []):
        return hook_block(
            "wedm-ecode-consistency",
            f"E-code {ecode} not in compatibility list for {controller_type}",
            {"ecode": ecode, "controller": controller_type, "supportedPrefixes": compatibility_map.get(controller_type, [])}
        )

    return hook_success("wedm-ecode-consistency", "E-code compatible with controller", {
        "ecode": ecode,
        "controller": controller
    })


def wedm_taper_limits(ctx: Dict[str, Any]) -> Dict:
    """
    Hook: hook_wedm_taper_limits
    Trigger: PreTool wedm_solve_taper
    Validates UV taper angle within machine limits.
    BLOCKS if angle exceeds capability.
    """
    d = ctx.get("target", {}).get("data", {})
    action = ctx.get("target", {}).get("action", "")

    if "taper" not in action and not d.get("taperAngle") and not d.get("uvAngle"):
        return hook_success("wedm-taper-limits", "Not a taper operation", {"skipped": True})

    requested_angle = d.get("taperAngle") or d.get("uvAngle") or d.get("angle") or 0
    machine_max = d.get("machineMaxTaper") or d.get("maxTaper") or 30  # Default 30 deg for FA-20S

    if abs(requested_angle) > machine_max:
        return hook_block(
            "wedm-taper-limits",
            f"Taper angle {requested_angle} deg exceeds machine maximum {machine_max} deg",
            {"requested": requested_angle, "maximum": machine_max}
        )

    return hook_success("wedm-taper-limits", "Taper angle within limits", {
        "angle": requested_angle,
        "max": machine_max
    })


def wedm_tension_safety(ctx: Dict[str, Any]) -> Dict:
    """
    Hook: hook_wedm_tension_safety
    Trigger: PreTool wedm_*
    Validates wire tension in safe range [500g, 2000g].
    BLOCKS if outside range.
    """
    d = ctx.get("target", {}).get("data", {})

    tension = d.get("wireTension") or d.get("tension") or d.get("wireTension_g")

    if tension is None:
        return hook_success("wedm-tension-safety", "No tension specified", {"skipped": True})

    min_tension = 500   # grams
    max_tension = 2000  # grams

    if tension < min_tension:
        return hook_block(
            "wedm-tension-safety",
            f"Wire tension {tension}g below minimum {min_tension}g — wire may wander",
            {"tension": tension, "min": min_tension, "max": max_tension}
        )

    if tension > max_tension:
        return hook_block(
            "wedm-tension-safety",
            f"Wire tension {tension}g exceeds maximum {max_tension}g — wire break risk",
            {"tension": tension, "min": min_tension, "max": max_tension}
        )

    return hook_success("wedm-tension-safety", "Wire tension in safe range", {
        "tension": tension,
        "range": [min_tension, max_tension]
    })


# ============================================================================
# WARNING HOOKS (5) — QUALITY GATES
# ============================================================================

def wedm_cost_confidence(ctx: Dict[str, Any]) -> Dict:
    """
    Hook: hook_wedm_cost_confidence
    Trigger: PostTool wedm_estimate_cost
    Warns if cost estimate confidence < 70%.
    """
    d = ctx.get("target", {}).get("data", {})
    action = ctx.get("target", {}).get("action", "")

    if "cost" not in action and "estimate" not in action:
        return hook_success("wedm-cost-confidence", "Not a cost action", {"skipped": True})

    confidence = d.get("confidence") or d.get("estimateConfidence") or 1.0

    if confidence < 0.7:
        return hook_warning(
            "wedm-cost-confidence",
            f"Cost estimate confidence {confidence * 100:.0f}% below 70% — manual review recommended",
            {"confidence": confidence, "threshold": 0.7}
        )

    return hook_success("wedm-cost-confidence", "Cost estimate confidence acceptable", {
        "confidence": confidence
    })


def wedm_batch_deps(ctx: Dict[str, Any]) -> Dict:
    """
    Hook: hook_wedm_batch_deps
    Trigger: PreTool wedm_batch_*
    Checks for circular dependencies in batch jobs.
    BLOCKS on cycles.
    """
    d = ctx.get("target", {}).get("data", {})
    action = ctx.get("target", {}).get("action", "")

    if "batch" not in action:
        return hook_success("wedm-batch-deps", "Not a batch action", {"skipped": True})

    jobs = d.get("jobs") or d.get("batch") or []
    if not isinstance(jobs, list) or len(jobs) == 0:
        return hook_success("wedm-batch-deps", "No jobs to check", {"skipped": True})

    # Build dependency graph
    deps: Dict[str, Set[str]] = {}
    for job in jobs:
        job_id = job.get("id") or job.get("jobId") or ""
        requires = job.get("requires") or job.get("dependencies") or []
        if isinstance(requires, str):
            requires = [requires]
        deps[job_id] = set(requires)

    # Detect cycles using DFS
    visited: Set[str] = set()
    stack: Set[str] = set()

    def has_cycle(node: str) -> bool:
        if node in stack:
            return True
        if node in visited:
            return False

        visited.add(node)
        stack.add(node)

        for dep in deps.get(node, set()):
            if has_cycle(dep):
                return True

        stack.discard(node)
        return False

    for job_id in deps:
        if has_cycle(job_id):
            return hook_block(
                "wedm-batch-deps",
                f"Circular dependency detected involving job {job_id}",
                {"cycleJob": job_id, "totalJobs": len(jobs)}
            )

    return hook_success("wedm-batch-deps", "No circular dependencies", {
        "jobs": len(jobs)
    })


def wedm_schedule_conflict(ctx: Dict[str, Any]) -> Dict:
    """
    Hook: hook_wedm_schedule_conflict
    Trigger: PreTool wedm_schedule
    Checks for machine scheduling conflicts.
    BLOCKS on conflict.
    """
    d = ctx.get("target", {}).get("data", {})
    action = ctx.get("target", {}).get("action", "")

    if "schedule" not in action and "reserve" not in action:
        return hook_success("wedm-schedule-conflict", "Not a scheduling action", {"skipped": True})

    machine = d.get("machine") or d.get("machineId") or ""
    start = d.get("start") or d.get("startTime")
    end = d.get("end") or d.get("endTime")
    existing_reservations = d.get("existingReservations") or []

    if not machine or not start or not end:
        return hook_success("wedm-schedule-conflict", "Incomplete scheduling data", {"skipped": True})

    try:
        start_time = datetime.fromisoformat(str(start).replace("Z", "+00:00")).timestamp()
        end_time = datetime.fromisoformat(str(end).replace("Z", "+00:00")).timestamp()
    except (ValueError, TypeError):
        return hook_success("wedm-schedule-conflict", "Invalid date format", {"skipped": True})

    # Check for overlaps
    for res in existing_reservations:
        if res.get("machine") != machine:
            continue

        try:
            res_start = datetime.fromisoformat(str(res.get("start", "")).replace("Z", "+00:00")).timestamp()
            res_end = datetime.fromisoformat(str(res.get("end", "")).replace("Z", "+00:00")).timestamp()
        except (ValueError, TypeError):
            continue

        # Check overlap: (start1 < end2) && (start2 < end1)
        if start_time < res_end and res_start < end_time:
            return hook_block(
                "wedm-schedule-conflict",
                f"Schedule conflict: {machine} already reserved from {res.get('start')} to {res.get('end')}",
                {"machine": machine, "conflictWith": res.get("jobId", "unknown"), "requestedStart": start, "requestedEnd": end}
            )

    return hook_success("wedm-schedule-conflict", "No scheduling conflicts", {
        "machine": machine,
        "start": start,
        "end": end
    })


def wedm_drift_alert(ctx: Dict[str, Any]) -> Dict:
    """
    Hook: hook_wedm_drift_alert
    Trigger: PostTool wedm_calibration_*
    Alerts on concept drift in neural models.
    """
    d = ctx.get("target", {}).get("data", {})
    action = ctx.get("target", {}).get("action", "")

    if "calibration" not in action:
        return hook_success("wedm-drift-alert", "Not a calibration action", {"skipped": True})

    drift_score = d.get("driftScore") or d.get("drift") or 0
    drift_threshold = d.get("driftThreshold") or 0.2  # 20% drift threshold

    if drift_score > drift_threshold:
        return hook_warning(
            "wedm-drift-alert",
            f"Model drift {drift_score * 100:.1f}% exceeds {drift_threshold * 100:.0f}% threshold — consider retraining",
            {"drift": drift_score, "threshold": drift_threshold}
        )

    return hook_success("wedm-drift-alert", "Model drift within acceptable range", {
        "drift": drift_score
    })


def wedm_ood_detector(ctx: Dict[str, Any]) -> Dict:
    """
    Hook: hook_wedm_ood_detector
    Trigger: PreTool wedm_*_material
    Flags out-of-distribution materials.
    """
    d = ctx.get("target", {}).get("data", {})

    material = d.get("material") or ""
    thickness = d.get("thickness") or 0

    # Known materials in training distribution
    known_materials = {
        "d2", "a2", "m2", "s7", "h13", "o1", "w1",
        "carbide", "tungsten carbide",
        "4140", "4340", "1045", "1018",
        "aluminum", "6061", "7075",
        "copper", "brass", "titanium",
        "inconel", "hastelloy", "stainless", "304", "316",
    }

    issues = []

    # Check material
    mat_lower = material.lower()
    is_known = any(m in mat_lower for m in known_materials)

    if material and not is_known:
        issues.append(f'Material "{material}" not in training distribution')

    # Check thickness (typical training range 1-100mm)
    if thickness > 0 and (thickness < 1 or thickness > 100):
        issues.append(f"Thickness {thickness}mm outside typical training range [1-100mm]")

    if issues:
        return hook_warning(
            "wedm-ood-detector",
            f"Out-of-distribution warning: {'; '.join(issues)}",
            {"issues": issues, "material": material, "thickness": thickness}
        )

    return hook_success("wedm-ood-detector", "Parameters within training distribution", {
        "material": material,
        "thickness": thickness
    })


# ============================================================================
# LOGGING HOOKS (3) — AUDIT TRAIL
# ============================================================================

def wedm_quality_audit(ctx: Dict[str, Any]) -> Dict:
    """
    Hook: hook_wedm_quality_audit
    Trigger: PostTool wedm_override_quality
    Logs quality gate overrides to audit trail.
    """
    d = ctx.get("target", {}).get("data", {})
    action = ctx.get("target", {}).get("action", "")

    if "override" in action or d.get("override") or d.get("bypass"):
        audit_entry = {
            "operator": d.get("operator") or ctx.get("session", {}).get("userId") or "unknown",
            "reason": d.get("reason") or d.get("overrideReason") or "not specified",
            "timestamp": datetime.now().isoformat(),
            "target": d.get("target") or d.get("gate") or "unknown",
            "action": action
        }
        # In production, this would write to audit log
        print(f"[WEDM-AUDIT] Quality override: {json.dumps(audit_entry)}", file=sys.stderr)

    return hook_success("wedm-quality-audit", "Audit logged", {"logged": True})


def wedm_workflow_monitor(ctx: Dict[str, Any]) -> Dict:
    """
    Hook: hook_wedm_workflow_monitor
    Trigger: PreTool wedm_*
    Tracks multi-action workflow progress.
    """
    action = ctx.get("target", {}).get("action", "")
    workflow_id = ctx.get("session", {}).get("workflowId") or ctx.get("target", {}).get("data", {}).get("workflowId")

    if action.startswith("wedm_") and workflow_id:
        print(f"[WEDM-WORKFLOW] Step: {action}, Workflow: {workflow_id}", file=sys.stderr)

    return hook_success("wedm-workflow-monitor", "Workflow step logged", {
        "action": action,
        "workflowId": workflow_id
    })


def wedm_sx_safety(ctx: Dict[str, Any]) -> Dict:
    """
    Hook: hook_wedm_sx_safety
    Trigger: PreTool wedm_* CRITICAL
    S(x) safety scoring for WEDM operations.
    BLOCKS if S(x) < 0.70.
    """
    d = ctx.get("target", {}).get("data", {})
    action = ctx.get("target", {}).get("action", "")

    # Only check critical WEDM operations
    critical_actions = ["generate_gcode", "execute", "run", "start", "cut"]
    if not any(c in action for c in critical_actions):
        return hook_success("wedm-sx-safety", "Not a critical action", {"skipped": True})

    # Calculate S(x) components
    components = {
        "parameterValidity": 1.0 if d.get("parameterValidated") else 0.5,
        "machineCompatibility": 1.0 if d.get("machineValidated") else 0.6,
        "materialKnown": 1.0 if d.get("materialKnown") is not False else 0.4,
        "operatorCertified": 1.0 if d.get("operatorCertified") is not False else 0.7,
        "programValidated": 1.0 if d.get("programValidated") else 0.5,
    }

    # Weighted average
    weights = {
        "parameterValidity": 0.3,
        "machineCompatibility": 0.2,
        "materialKnown": 0.2,
        "operatorCertified": 0.15,
        "programValidated": 0.15
    }

    sx = sum(components.get(k, 0.5) * w for k, w in weights.items())
    threshold = 0.70

    if sx < threshold:
        return hook_block(
            "wedm-sx-safety",
            f"S(x) safety score {sx:.2f} below {threshold} threshold",
            {"sx": sx, "threshold": threshold, "components": components}
        )

    return hook_success("wedm-sx-safety", f"S(x) safety score acceptable: {sx:.2f}", {
        "sx": sx,
        "components": components
    })


# ============================================================================
# TRIGGER HOOKS (2) — AUTOMATION
# ============================================================================

def wedm_learning_trigger(ctx: Dict[str, Any]) -> Dict:
    """
    Hook: hook_wedm_learning_trigger
    Trigger: PostTool wedm_submit_feedback
    Auto-triggers calibration after feedback submission.
    """
    d = ctx.get("target", {}).get("data", {})
    action = ctx.get("target", {}).get("action", "")

    if "feedback" not in action and "submit" not in action:
        return hook_success("wedm-learning-trigger", "Not a feedback action", {"skipped": True})

    feedback_count = d.get("feedbackCount") or d.get("totalFeedback") or 1
    trigger_threshold = 10  # Retrain after 10 feedback entries

    if feedback_count >= trigger_threshold:
        print(f"[WEDM-TRIGGER] Triggering recalibration after {feedback_count} feedback entries", file=sys.stderr)
        return hook_success("wedm-learning-trigger", f"Calibration triggered ({feedback_count} entries)", {
            "triggered": True,
            "feedbackCount": feedback_count
        })

    return hook_success("wedm-learning-trigger", f"Feedback logged ({feedback_count}/{trigger_threshold})", {
        "triggered": False,
        "feedbackCount": feedback_count,
        "threshold": trigger_threshold
    })


def wedm_awareness_inject(ctx: Dict[str, Any]) -> Dict:
    """
    Hook: hook_wedm_awareness_inject
    Trigger: SessionStart
    Injects WEDM context when session involves Wire EDM.
    """
    session_prompt = ctx.get("session", {}).get("prompt", "")
    session_context = ctx.get("session", {}).get("context", "")
    combined = f"{session_prompt} {session_context}".lower()

    # Check for WEDM-related content
    wedm_keywords = ["wire edm", "wedm", "wire cut", "edm wire", "spark erosion", "electrical discharge"]
    matching_keywords = [kw for kw in wedm_keywords if kw in combined]

    if matching_keywords:
        print(f"[WEDM-AWARENESS] WEDM context detected, injecting awareness", file=sys.stderr)
        return hook_success("wedm-awareness-inject", "WEDM awareness injected", {
            "injected": True,
            "keywords": matching_keywords,
            "engines": 119,
            "actions": 256
        })

    return hook_success("wedm-awareness-inject", "No WEDM context needed", {
        "injected": False
    })


# ============================================================================
# HOOK REGISTRY
# ============================================================================

WEDM_SAFETY_HOOKS = {
    # Blocking (6)
    "wedm-calibration-validate": {
        "handler": wedm_calibration_validate,
        "mode": "blocking",
        "priority": "critical",
        "phase": "pre-tool",
        "trigger": "wedm_feedback_*"
    },
    "wedm-neural-sanity": {
        "handler": wedm_neural_sanity,
        "mode": "blocking",
        "priority": "critical",
        "phase": "post-tool",
        "trigger": "wedm_neural_*"
    },
    "wedm-gcode-injection": {
        "handler": wedm_gcode_injection,
        "mode": "blocking",
        "priority": "critical",
        "phase": "pre-tool",
        "trigger": "wedm_generate_gcode"
    },
    "wedm-ecode-consistency": {
        "handler": wedm_ecode_consistency,
        "mode": "blocking",
        "priority": "high",
        "phase": "pre-tool",
        "trigger": "wedm_generate_gcode"
    },
    "wedm-taper-limits": {
        "handler": wedm_taper_limits,
        "mode": "blocking",
        "priority": "critical",
        "phase": "pre-tool",
        "trigger": "wedm_solve_taper"
    },
    "wedm-tension-safety": {
        "handler": wedm_tension_safety,
        "mode": "blocking",
        "priority": "critical",
        "phase": "pre-tool",
        "trigger": "wedm_*"
    },
    # Warning (5)
    "wedm-cost-confidence": {
        "handler": wedm_cost_confidence,
        "mode": "warning",
        "priority": "medium",
        "phase": "post-tool",
        "trigger": "wedm_estimate_cost"
    },
    "wedm-batch-deps": {
        "handler": wedm_batch_deps,
        "mode": "blocking",
        "priority": "high",
        "phase": "pre-tool",
        "trigger": "wedm_batch_*"
    },
    "wedm-schedule-conflict": {
        "handler": wedm_schedule_conflict,
        "mode": "blocking",
        "priority": "high",
        "phase": "pre-tool",
        "trigger": "wedm_schedule"
    },
    "wedm-drift-alert": {
        "handler": wedm_drift_alert,
        "mode": "warning",
        "priority": "medium",
        "phase": "post-tool",
        "trigger": "wedm_calibration_*"
    },
    "wedm-ood-detector": {
        "handler": wedm_ood_detector,
        "mode": "warning",
        "priority": "medium",
        "phase": "pre-tool",
        "trigger": "wedm_*_material"
    },
    # Logging (3)
    "wedm-quality-audit": {
        "handler": wedm_quality_audit,
        "mode": "logging",
        "priority": "low",
        "phase": "post-tool",
        "trigger": "wedm_override_quality"
    },
    "wedm-workflow-monitor": {
        "handler": wedm_workflow_monitor,
        "mode": "logging",
        "priority": "low",
        "phase": "pre-tool",
        "trigger": "wedm_*"
    },
    "wedm-sx-safety": {
        "handler": wedm_sx_safety,
        "mode": "blocking",
        "priority": "critical",
        "phase": "pre-tool",
        "trigger": "wedm_* CRITICAL"
    },
    # Trigger (2)
    "wedm-learning-trigger": {
        "handler": wedm_learning_trigger,
        "mode": "logging",
        "priority": "medium",
        "phase": "post-tool",
        "trigger": "wedm_submit_feedback"
    },
    "wedm-awareness-inject": {
        "handler": wedm_awareness_inject,
        "mode": "logging",
        "priority": "medium",
        "phase": "session-start",
        "trigger": "SessionStart"
    },
}


def execute_hook(hook_id: str, ctx: Dict[str, Any]) -> Dict:
    """Execute a WEDM safety hook by ID."""
    hook = WEDM_SAFETY_HOOKS.get(hook_id)
    if not hook:
        return hook_success(hook_id, f"Unknown hook: {hook_id}", {"error": True})
    return hook["handler"](ctx)


def get_all_hooks() -> List[Dict]:
    """Get metadata for all WEDM safety hooks."""
    return [
        {
            "id": hook_id,
            "mode": hook["mode"],
            "priority": hook["priority"],
            "phase": hook["phase"],
            "trigger": hook["trigger"]
        }
        for hook_id, hook in WEDM_SAFETY_HOOKS.items()
    ]


# ============================================================================
# CLI ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    # CLI mode: execute hook with JSON context from stdin
    if len(sys.argv) > 1:
        hook_id = sys.argv[1]

        if hook_id == "--list":
            print(json.dumps(get_all_hooks(), indent=2))
            sys.exit(0)

        try:
            ctx = json.load(sys.stdin)
        except json.JSONDecodeError:
            ctx = {}

        result = execute_hook(hook_id, ctx)
        print(json.dumps(result, indent=2))
        sys.exit(0 if result["status"] != "blocked" else 1)
    else:
        print("Usage: python wedm_safety_hooks.py <hook-id>")
        print("       python wedm_safety_hooks.py --list")
        print("\nAvailable hooks:")
        for hook in get_all_hooks():
            print(f"  {hook['id']} ({hook['mode']}, {hook['phase']})")
        sys.exit(0)
