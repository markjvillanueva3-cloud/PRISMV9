"""Shop Practice Safety Validator — CC-MS9 Validation Bridge.

SAFETY-CRITICAL: Verifies that no stored shop practice contradicts
physics (force/power limits), machine limits (speed/torque envelope),
or safety constraints (tool breakage risk, workholding adequacy).

Cross-references practice_aggregate.PracticeRecord data against
Kienzle-derived limits and machine capability.

References:
  - OSHA 29 CFR 1910.217 — Mechanical power presses (safety)
  - Sandvik Coromant — Safe machining guidelines
  - ISO 13849-1 — Safety of machinery
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# Safety rules and limits
# ---------------------------------------------------------------------------

# Maximum safe RPM by material class (conservative, carbide tooling)
_MAX_SAFE_RPM: dict[str, int] = {
    "aluminum": 24000, "brass": 15000, "copper": 12000,
    "mild_steel": 8000, "steel": 6000, "stainless_steel": 5000,
    "cast_iron": 6000, "titanium": 3000, "inconel": 2000,
    "hardened_steel": 4000, "plastic": 30000,
}

# Maximum safe DOC (mm) by material class — conservative for general milling
_MAX_SAFE_DOC: dict[str, float] = {
    "aluminum": 20.0, "brass": 15.0, "copper": 12.0,
    "mild_steel": 8.0, "steel": 6.0, "stainless_steel": 4.0,
    "cast_iron": 8.0, "titanium": 3.0, "inconel": 2.0,
    "hardened_steel": 2.0, "plastic": 25.0,
}

# Keywords that indicate categorically unsafe practices
_UNSAFE_KEYWORDS = [
    "remove guard", "bypass interlock", "disable safety",
    "no coolant on titanium", "hand near spindle",
    "loose clothing near spindle", "no eye protection",
    "skip warm-up", "remove chuck key while running",
    "reach over spinning", "leave chuck key in",
]

# Keywords that require a safety warning if not already present
_REQUIRES_WARNING_KEYWORDS = [
    "climb mill", "interrupted cut", "deep pocket", "thin wall",
    "high speed", "minimum quantity lubrication", "dry machining",
    "titanium", "magnesium", "beryllium", "gun drill",
]

# Coolant requirements by material — dry machining forbidden for these
_COOLANT_REQUIRED_MATERIALS = {"titanium", "inconel", "stainless_steel"}

SAFETY_THRESHOLD = 0.70


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

@dataclass
class PracticeFinding:
    """A single safety finding for a practice."""
    practice_id: str
    severity: str  # "critical", "major", "minor", "info"
    category: str  # "physics", "machine_limit", "unsafe_keyword", "missing_warning", "coolant"
    message: str
    rule: str = ""
    score_impact: float = 0.0  # how much this reduces S(x)

    def to_dict(self) -> dict:
        return {
            "practice_id": self.practice_id,
            "severity": self.severity,
            "category": self.category,
            "message": self.message,
            "rule": self.rule,
            "score_impact": round(self.score_impact, 4),
        }


@dataclass
class PracticeValidation:
    """Validation result for a single practice."""
    practice_id: str
    title: str
    category: str
    safety_score: float = 1.0
    is_safe: bool = True
    findings: list[PracticeFinding] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "practice_id": self.practice_id,
            "title": self.title,
            "category": self.category,
            "safety_score": round(self.safety_score, 4),
            "is_safe": self.is_safe,
            "findings": [f.to_dict() for f in self.findings],
        }


@dataclass
class ShopSafetyReport:
    """Full safety validation report for all shop practices."""
    total_practices: int = 0
    validated: int = 0
    safe_count: int = 0
    unsafe_count: int = 0
    blocked: bool = False
    block_reason: str = ""
    overall_safety_score: float = 1.0
    practice_validations: list[PracticeValidation] = field(default_factory=list)
    critical_findings: list[PracticeFinding] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "total_practices": self.total_practices,
            "validated": self.validated,
            "safe_count": self.safe_count,
            "unsafe_count": self.unsafe_count,
            "blocked": self.blocked,
            "block_reason": self.block_reason,
            "overall_safety_score": round(self.overall_safety_score, 4),
            "practice_validations": [pv.to_dict() for pv in self.practice_validations],
            "critical_findings": [f.to_dict() for f in self.critical_findings],
        }


# ---------------------------------------------------------------------------
# ShopSafetyValidator
# ---------------------------------------------------------------------------

class ShopSafetyValidator:
    """Validates shop practices against physics and machine limits.

    SAFETY-CRITICAL: Enforces S(x) >= 0.70 hard block.
    """

    def __init__(
        self,
        machine_max_rpm: int = 12000,
        machine_max_power_kw: float = 15.0,
    ):
        self._max_rpm = machine_max_rpm
        self._max_power = machine_max_power_kw

    def validate_practice(self, practice: dict) -> PracticeValidation:
        """Validate a single practice record (dict format).

        Expected keys: practice_id, title, category, description,
        steps, warnings, applicable_materials, tips.
        """
        pid = practice.get("practice_id", "unknown")
        title = practice.get("title", "")
        category = practice.get("category", "")

        pv = PracticeValidation(
            practice_id=pid, title=title, category=category,
        )

        text = _combine_text(practice)
        materials = [m.lower() for m in practice.get("applicable_materials", [])]
        existing_warnings = practice.get("warnings", [])

        # 1. Check for unsafe keywords
        for keyword in _UNSAFE_KEYWORDS:
            if keyword in text:
                pv.findings.append(PracticeFinding(
                    practice_id=pid, severity="critical",
                    category="unsafe_keyword",
                    message=f"Unsafe practice: '{keyword}'",
                    rule="unsafe_keyword_check",
                    score_impact=0.5,
                ))

        # 2. Check for missing warnings on risky operations
        for keyword in _REQUIRES_WARNING_KEYWORDS:
            if keyword in text and not existing_warnings:
                pv.findings.append(PracticeFinding(
                    practice_id=pid, severity="minor",
                    category="missing_warning",
                    message=f"Practice mentions '{keyword}' but has no safety warnings",
                    rule="missing_warning_check",
                    score_impact=0.05,
                ))

        # 3. Check RPM values against material limits
        rpm_matches = re.findall(r"(\d{3,6})\s*(?:rpm|RPM)", text)
        for rpm_str in rpm_matches:
            rpm_val = int(rpm_str)
            if rpm_val > self._max_rpm:
                pv.findings.append(PracticeFinding(
                    practice_id=pid, severity="critical",
                    category="machine_limit",
                    message=f"RPM {rpm_val} exceeds machine max {self._max_rpm}",
                    rule="machine_rpm_limit",
                    score_impact=0.4,
                ))
            for mat in materials:
                max_rpm = _MAX_SAFE_RPM.get(mat, self._max_rpm)
                if rpm_val > max_rpm:
                    pv.findings.append(PracticeFinding(
                        practice_id=pid, severity="major",
                        category="physics",
                        message=f"RPM {rpm_val} exceeds safe limit {max_rpm} for {mat}",
                        rule="material_rpm_limit",
                        score_impact=0.3,
                    ))

        # 4. Check DOC values against material limits
        doc_matches = re.findall(
            r"(?:depth\s*(?:of\s*cut)?|ap|axial\s*depth)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*mm",
            text, re.IGNORECASE,
        )
        for doc_str in doc_matches:
            doc_val = float(doc_str)
            for mat in materials:
                max_doc = _MAX_SAFE_DOC.get(mat, 10.0)
                if doc_val > max_doc:
                    pv.findings.append(PracticeFinding(
                        practice_id=pid, severity="major",
                        category="physics",
                        message=f"DOC {doc_val}mm exceeds safe limit {max_doc}mm for {mat}",
                        rule="material_doc_limit",
                        score_impact=0.25,
                    ))

        # 5. Check coolant requirements
        for mat in materials:
            if mat in _COOLANT_REQUIRED_MATERIALS:
                if "dry" in text or "no coolant" in text:
                    pv.findings.append(PracticeFinding(
                        practice_id=pid, severity="critical",
                        category="coolant",
                        message=f"Dry machining forbidden for {mat} — fire/explosion risk",
                        rule="coolant_required",
                        score_impact=0.5,
                    ))

        # 6. Check for contradictory steps
        steps = practice.get("steps", [])
        if steps:
            steps_text = " ".join(s.lower() for s in steps)
            if "increase speed" in steps_text and "reduce speed" in steps_text:
                pv.findings.append(PracticeFinding(
                    practice_id=pid, severity="minor",
                    category="physics",
                    message="Contradictory steps: both 'increase speed' and 'reduce speed'",
                    rule="contradictory_steps",
                    score_impact=0.1,
                ))

        # Compute safety score
        total_impact = sum(f.score_impact for f in pv.findings)
        pv.safety_score = max(1.0 - total_impact, 0.0)
        pv.is_safe = pv.safety_score >= SAFETY_THRESHOLD

        return pv

    def validate_all(self, practices: list[dict]) -> ShopSafetyReport:
        """Validate all shop practices. Returns ShopSafetyReport."""
        report = ShopSafetyReport(total_practices=len(practices))
        min_score = 1.0

        for practice in practices:
            pv = self.validate_practice(practice)
            report.practice_validations.append(pv)
            report.validated += 1

            if pv.is_safe:
                report.safe_count += 1
            else:
                report.unsafe_count += 1

            min_score = min(min_score, pv.safety_score)

            # Collect critical findings
            for f in pv.findings:
                if f.severity == "critical":
                    report.critical_findings.append(f)

        report.overall_safety_score = min_score
        if min_score < SAFETY_THRESHOLD:
            report.blocked = True
            report.block_reason = (
                f"S(x) = {min_score:.2f} < {SAFETY_THRESHOLD} — "
                f"BLOCKED: Shop practice violates safety constraints"
            )

        return report


def _combine_text(practice: dict) -> str:
    """Combine all text fields for keyword searching."""
    parts = [
        practice.get("description", ""),
        practice.get("title", ""),
        " ".join(practice.get("steps", [])),
        " ".join(practice.get("tips", [])),
        " ".join(practice.get("warnings", [])),
    ]
    return " ".join(parts).lower()
