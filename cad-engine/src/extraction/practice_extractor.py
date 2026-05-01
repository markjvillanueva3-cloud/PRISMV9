"""Machining Practice Extraction — CC-EXT-MS1-P0-U04.

Extracts structured machining practices from text: setup procedures,
fixturing guidance, cutting strategies, coolant recommendations.
Captures conditional logic, safety warnings, and operation-type links.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class OperationType(str, Enum):
    MILLING = "milling"
    TURNING = "turning"
    DRILLING = "drilling"
    GRINDING = "grinding"
    EDM = "edm"
    BORING = "boring"
    REAMING = "reaming"
    TAPPING = "tapping"
    GENERAL = "general"


class PracticeCategory(str, Enum):
    SETUP = "setup"
    FIXTURING = "fixturing"
    STRATEGY = "strategy"
    COOLANT = "coolant"
    SAFETY = "safety"
    TOOL_SELECTION = "tool_selection"
    QUALITY = "quality"
    GENERAL = "general"


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class PracticeStep:
    """A single step in a machining practice."""
    number: int
    action: str
    parameters: dict = field(default_factory=dict)
    warning: str = ""
    condition: str = ""

    def to_dict(self) -> dict:
        d: dict = {"number": self.number, "action": self.action}
        if self.parameters:
            d["parameters"] = self.parameters
        if self.warning:
            d["warning"] = self.warning
        if self.condition:
            d["condition"] = self.condition
        return d


@dataclass
class ConditionalRule:
    """A conditional machining rule: 'when X, do Y'."""
    condition: str
    recommendation: str
    material: str = ""
    operation: str = ""
    confidence: float = 0.6

    def to_dict(self) -> dict:
        return {
            "condition": self.condition,
            "recommendation": self.recommendation,
            "material": self.material,
            "operation": self.operation,
            "confidence": round(self.confidence, 4),
        }


@dataclass
class SafetyWarning:
    """A safety warning or hard constraint."""
    severity: str  # "critical", "warning", "info"
    message: str
    constraint_type: str = ""  # "max_rpm", "min_coolant", "mandatory_ppe", "never_do"
    value: str = ""

    def to_dict(self) -> dict:
        return {
            "severity": self.severity,
            "message": self.message,
            "constraint_type": self.constraint_type,
            "value": self.value,
        }


@dataclass
class ExtractedPractice:
    """A complete machining practice extracted from text."""
    title: str
    category: PracticeCategory
    operation_type: OperationType
    steps: list[PracticeStep] = field(default_factory=list)
    conditions: list[ConditionalRule] = field(default_factory=list)
    safety_warnings: list[SafetyWarning] = field(default_factory=list)
    applicable_materials: list[str] = field(default_factory=list)
    confidence: float = 0.5
    source_text: str = ""

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "category": self.category.value,
            "operation_type": self.operation_type.value,
            "steps": [s.to_dict() for s in self.steps],
            "conditions": [c.to_dict() for c in self.conditions],
            "safety_warnings": [w.to_dict() for w in self.safety_warnings],
            "applicable_materials": self.applicable_materials,
            "confidence": round(self.confidence, 4),
        }


# ---------------------------------------------------------------------------
# Operation type detection
# ---------------------------------------------------------------------------

_OPERATION_SIGNALS: dict[str, list[str]] = {
    "milling": ["mill", "milling", "end mill", "face mill", "pocket", "contour",
                "adaptive", "trochoidal", "climb", "conventional"],
    "turning": ["turn", "turning", "lathe", "facing", "boring", "parting",
                "grooving", "threading"],
    "drilling": ["drill", "drilling", "pilot hole", "peck", "gun drill",
                 "spot drill", "countersink", "counterbore"],
    "grinding": ["grind", "grinding", "wheel", "surface grind", "cylindrical",
                 "centerless"],
    "edm": ["edm", "wire edm", "sinker", "spark", "electrode"],
    "tapping": ["tap", "tapping", "thread mill"],
    "reaming": ["ream", "reaming", "reamer"],
    "boring": ["bore", "boring", "boring bar"],
}


def detect_operation_type(text: str) -> OperationType:
    """Detect machining operation type from text."""
    t = text.lower()
    scores: dict[str, int] = {}
    for op, keywords in _OPERATION_SIGNALS.items():
        score = sum(1 for kw in keywords if kw in t)
        if score > 0:
            scores[op] = score

    if not scores:
        return OperationType.GENERAL

    best = max(scores, key=scores.get)  # type: ignore[arg-type]
    op_map = {
        "milling": OperationType.MILLING,
        "turning": OperationType.TURNING,
        "drilling": OperationType.DRILLING,
        "grinding": OperationType.GRINDING,
        "edm": OperationType.EDM,
        "tapping": OperationType.TAPPING,
        "reaming": OperationType.REAMING,
        "boring": OperationType.BORING,
    }
    return op_map.get(best, OperationType.GENERAL)


# ---------------------------------------------------------------------------
# Category detection
# ---------------------------------------------------------------------------

_CATEGORY_SIGNALS: dict[str, list[str]] = {
    "setup": ["setup", "set up", "mount", "load", "zero", "offset",
              "work coordinate", "datum"],
    "fixturing": ["fixture", "clamp", "vise", "chuck", "collet",
                  "workholding", "strap clamp", "toe clamp"],
    "strategy": ["strategy", "approach", "method", "technique",
                 "roughing", "finishing", "adaptive", "trochoidal"],
    "coolant": ["coolant", "lubricant", "mql", "flood", "mist",
                "through-spindle", "air blast", "dry machining"],
    "safety": ["safety", "warning", "danger", "caution", "ppe",
               "guard", "interlock", "lockout", "emergency"],
    "tool_selection": ["tool select", "choose", "insert grade",
                       "coating", "geometry", "nose radius"],
    "quality": ["inspect", "measure", "tolerance", "cmm", "gage",
                "surface finish", "roundness"],
}


def detect_practice_category(text: str) -> PracticeCategory:
    """Detect practice category from text."""
    t = text.lower()
    scores: dict[str, int] = {}
    for cat, keywords in _CATEGORY_SIGNALS.items():
        score = sum(1 for kw in keywords if kw in t)
        if score > 0:
            scores[cat] = score

    if not scores:
        return PracticeCategory.GENERAL

    best = max(scores, key=scores.get)  # type: ignore[arg-type]
    cat_map = {
        "setup": PracticeCategory.SETUP,
        "fixturing": PracticeCategory.FIXTURING,
        "strategy": PracticeCategory.STRATEGY,
        "coolant": PracticeCategory.COOLANT,
        "safety": PracticeCategory.SAFETY,
        "tool_selection": PracticeCategory.TOOL_SELECTION,
        "quality": PracticeCategory.QUALITY,
    }
    return cat_map.get(best, PracticeCategory.GENERAL)


# ---------------------------------------------------------------------------
# Practice Extractor
# ---------------------------------------------------------------------------

# Material keywords for context
_MATERIAL_KEYWORDS = [
    "aluminum", "steel", "stainless", "titanium", "inconel", "cast iron",
    "brass", "copper", "plastic", "delrin", "peek",
    "6061", "7075", "4140", "1018", "304", "316", "718",
]

# Unsafe keyword patterns (from shop_safety_validator)
_UNSAFE_PATTERNS = [
    r"remove\s+guard", r"bypass\s+interlock", r"disable\s+safety",
    r"no\s+eye\s+protection", r"skip\s+warm[- ]?up", r"without\s+coolant",
    r"exceed\s+(?:max|maximum)", r"never\s+use\s+guard",
]

_NEVER_DO_PATTERNS = [
    r"never\s+(.+?)(?:\.|$)",
    r"do\s+not\s+(.+?)(?:\.|$)",
    r"don't\s+(.+?)(?:\.|$)",
    r"avoid\s+(.+?)(?:\.|$)",
]

_CONSTRAINT_PATTERNS = [
    (r"max(?:imum)?\s+(?:RPM|speed)\s*[:=]?\s*(\d+)", "max_rpm"),
    (r"min(?:imum)?\s+coolant\s+(?:pressure|flow)\s*[:=]?\s*(\d+)", "min_coolant"),
    (r"(?:mandatory|required)\s+PPE\s*[:=]?\s*(.+?)(?:\.|$)", "mandatory_ppe"),
]


class PracticeExtractor:
    """Extracts structured machining practices from text.

    Identifies practice sections, extracts procedural steps,
    conditional logic, and safety warnings.
    """

    def extract_practices(self, text: str) -> list[ExtractedPractice]:
        """Extract all machining practices from text."""
        practices: list[ExtractedPractice] = []

        # Split into sections
        sections = self._split_into_sections(text)

        for title, section_text in sections:
            practice = self._extract_practice(title, section_text)
            if practice:
                practices.append(practice)

        # Also extract standalone conditional rules
        standalone = self._extract_standalone_conditions(text)
        if standalone:
            practices.append(standalone)

        return practices

    def _split_into_sections(self, text: str) -> list[tuple[str, str]]:
        """Split text into titled sections."""
        sections: list[tuple[str, str]] = []

        # Look for heading patterns (markdown # headers or ALL CAPS lines, not numbered steps)
        heading_pattern = re.compile(
            r"^(?:#{1,3}\s+.+|[A-Z][A-Z\s]{5,}:?\s*)$",
            re.MULTILINE,
        )

        matches = list(heading_pattern.finditer(text))
        if not matches:
            # No headings — treat whole text as one section
            return [("General Practice", text)]

        for i, match in enumerate(matches):
            title = match.group(0).strip().strip("#").strip()
            start = match.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            section_text = text[start:end].strip()
            if section_text:
                sections.append((title, section_text))

        return sections

    def _extract_practice(self, title: str, text: str) -> Optional[ExtractedPractice]:
        """Extract a single practice from a titled section."""
        if not text.strip():
            return None

        operation = detect_operation_type(title + " " + text)
        category = detect_practice_category(title + " " + text)

        steps = self._extract_steps(text)
        conditions = self._extract_conditions(text)
        warnings = self._extract_safety_warnings(text)
        materials = self._extract_materials(text)

        # Calculate confidence
        confidence = 0.5
        if steps:
            confidence += 0.1
        if conditions:
            confidence += 0.1
        if materials:
            confidence += 0.1
        if operation != OperationType.GENERAL:
            confidence += 0.1

        return ExtractedPractice(
            title=title,
            category=category,
            operation_type=operation,
            steps=steps,
            conditions=conditions,
            safety_warnings=warnings,
            applicable_materials=materials,
            confidence=min(confidence, 1.0),
            source_text=text[:500],
        )

    def _extract_steps(self, text: str) -> list[PracticeStep]:
        """Extract numbered/bulleted procedural steps."""
        steps: list[PracticeStep] = []

        # Numbered steps: "1. Do this" or "Step 1: Do this"
        step_pattern = re.compile(
            r"(?:step\s+)?(\d+)[.):\s]+(.+?)(?:\n|$)",
            re.IGNORECASE | re.MULTILINE,
        )

        for match in step_pattern.finditer(text):
            num = int(match.group(1))
            action = match.group(2).strip()

            # Extract inline warning
            warning = ""
            warn_match = re.search(r"(?:warning|caution|note):\s*(.+)", action, re.IGNORECASE)
            if warn_match:
                warning = warn_match.group(1)

            # Extract inline condition
            condition = ""
            cond_match = re.search(r"(?:if|when)\s+(.+?)(?:,|then)", action, re.IGNORECASE)
            if cond_match:
                condition = cond_match.group(1)

            steps.append(PracticeStep(
                number=num,
                action=action,
                warning=warning,
                condition=condition,
            ))

        return steps

    def _extract_conditions(self, text: str) -> list[ConditionalRule]:
        """Extract 'when X, do Y' conditional rules."""
        conditions: list[ConditionalRule] = []

        # "When machining X, use Y"
        when_patterns = [
            r"when\s+(?:machining|cutting|working\s+with)\s+(.+?),\s*(.+?)(?:\.|$)",
            r"if\s+(?:machining|cutting|using)\s+(.+?),\s*(.+?)(?:\.|$)",
            r"for\s+(.+?),\s*(?:use|apply|set)\s+(.+?)(?:\.|$)",
        ]

        for pattern in when_patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                condition = match.group(1).strip()
                recommendation = match.group(2).strip()
                material = self._detect_material_in_text(condition)
                operation = detect_operation_type(condition).value

                conditions.append(ConditionalRule(
                    condition=condition,
                    recommendation=recommendation,
                    material=material,
                    operation=operation,
                    confidence=0.7,
                ))

        return conditions

    def _extract_safety_warnings(self, text: str) -> list[SafetyWarning]:
        """Extract safety warnings and hard constraints."""
        warnings: list[SafetyWarning] = []

        # Check unsafe patterns
        for pattern in _UNSAFE_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                match = re.search(pattern, text, re.IGNORECASE)
                warnings.append(SafetyWarning(
                    severity="critical",
                    message=f"Unsafe practice detected: {match.group(0)}",
                    constraint_type="never_do",
                ))

        # Extract "never do" rules
        for pattern in _NEVER_DO_PATTERNS:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                warnings.append(SafetyWarning(
                    severity="warning",
                    message=match.group(0).strip(),
                    constraint_type="never_do",
                    value=match.group(1).strip(),
                ))

        # Extract constraint values
        for pattern, constraint_type in _CONSTRAINT_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                warnings.append(SafetyWarning(
                    severity="warning",
                    message=match.group(0),
                    constraint_type=constraint_type,
                    value=match.group(1),
                ))

        return warnings

    def _extract_materials(self, text: str) -> list[str]:
        """Extract applicable materials from text."""
        t = text.lower()
        return [mat for mat in _MATERIAL_KEYWORDS if mat in t]

    def _detect_material_in_text(self, text: str) -> str:
        """Detect first material mention in text."""
        t = text.lower()
        for mat in _MATERIAL_KEYWORDS:
            if mat in t:
                return mat
        return ""

    def _extract_standalone_conditions(self, text: str) -> Optional[ExtractedPractice]:
        """Extract conditional rules not inside a section."""
        conditions = self._extract_conditions(text)
        if not conditions:
            return None

        return ExtractedPractice(
            title="Conditional Rules",
            category=PracticeCategory.GENERAL,
            operation_type=detect_operation_type(text),
            conditions=conditions,
            confidence=0.5,
            source_text=text[:200],
        )
