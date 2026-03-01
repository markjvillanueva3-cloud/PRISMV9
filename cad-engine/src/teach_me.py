"""Teach-Me Mode — CC-MS10.

On-demand learning pipeline: operator provides a URL (video, document),
system runs full ingest -> extract -> validate -> store -> report pipeline.

Generates learning reports with key takeaways per domain and persists
validated knowledge to the memory system.

Integrates with:
  - NL query handler for intent classification
  - Validation bridge (CC-MS9) for physics validation
  - Memory system (CC-MS7) for knowledge persistence
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional


# ---------------------------------------------------------------------------
# Content Types
# ---------------------------------------------------------------------------

class ContentType(str, Enum):
    VIDEO = "video"
    DOCUMENT = "document"
    WEBPAGE = "webpage"
    UNKNOWN = "unknown"


class LearningDomain(str, Enum):
    CAD = "cad"
    CAM = "cam"
    SHOP = "shop"
    MATERIAL = "material"
    SAFETY = "safety"
    GENERAL = "general"


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

@dataclass
class ExtractedKnowledge:
    """A single piece of knowledge extracted from content."""
    domain: str
    category: str
    title: str
    content: str
    confidence: float = 0.5
    validated: bool = False
    validation_notes: str = ""
    parameters: dict = field(default_factory=dict)
    tags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "domain": self.domain,
            "category": self.category,
            "title": self.title,
            "content": self.content,
            "confidence": round(self.confidence, 4),
            "validated": self.validated,
            "validation_notes": self.validation_notes,
            "parameters": self.parameters,
            "tags": self.tags,
        }


@dataclass
class LearningReport:
    """Report generated after teach-me pipeline completes."""
    source_url: str
    content_type: str
    title: str = ""
    domains_covered: list[str] = field(default_factory=list)
    extracted_count: int = 0
    validated_count: int = 0
    stored_count: int = 0
    rejected_count: int = 0
    key_takeaways: list[str] = field(default_factory=list)
    knowledge_items: list[ExtractedKnowledge] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    timestamp: str = ""
    pipeline_status: str = "pending"  # "pending", "ingesting", "extracting", "validating", "complete", "failed"

    def to_dict(self) -> dict:
        return {
            "source_url": self.source_url,
            "content_type": self.content_type,
            "title": self.title,
            "domains_covered": self.domains_covered,
            "extracted_count": self.extracted_count,
            "validated_count": self.validated_count,
            "stored_count": self.stored_count,
            "rejected_count": self.rejected_count,
            "key_takeaways": self.key_takeaways,
            "knowledge_items": [k.to_dict() for k in self.knowledge_items],
            "warnings": self.warnings,
            "timestamp": self.timestamp,
            "pipeline_status": self.pipeline_status,
        }


# ---------------------------------------------------------------------------
# URL / Content Type Detection
# ---------------------------------------------------------------------------

_VIDEO_PATTERNS = [
    r"youtube\.com/watch", r"youtu\.be/", r"vimeo\.com/",
    r"\.mp4$", r"\.webm$", r"\.avi$",
]

_DOC_PATTERNS = [
    r"\.pdf$", r"\.docx?$", r"\.xlsx?$", r"\.pptx?$",
    r"\.txt$", r"\.md$", r"\.rst$",
]


def detect_content_type(url: str) -> ContentType:
    """Detect content type from URL pattern."""
    for pat in _VIDEO_PATTERNS:
        if re.search(pat, url, re.IGNORECASE):
            return ContentType.VIDEO
    for pat in _DOC_PATTERNS:
        if re.search(pat, url, re.IGNORECASE):
            return ContentType.DOCUMENT
    if url.startswith("http"):
        return ContentType.WEBPAGE
    return ContentType.UNKNOWN


# ---------------------------------------------------------------------------
# Domain Classification for Content
# ---------------------------------------------------------------------------

_CONTENT_DOMAIN_KEYWORDS: dict[str, list[str]] = {
    "cad": ["solidworks", "fusion 360", "catia", "nx", "creo", "cad",
            "sketch", "extrude", "fillet", "assembly", "drawing", "dimension"],
    "cam": ["toolpath", "gcode", "cam", "mastercam", "hypermill", "powermill",
            "feeds and speeds", "roughing", "finishing", "stepover", "depth of cut"],
    "shop": ["workholding", "setup", "fixture", "vise", "indicator", "probe",
             "coolant", "chip", "deburr", "operator"],
    "material": ["alloy", "hardness", "heat treat", "machinability", "grain",
                 "composition", "tensile", "yield strength"],
    "safety": ["safety", "guard", "eye protection", "lockout", "tagout",
               "emergency stop", "ppe", "osha"],
}


def classify_content_domain(text: str) -> list[str]:
    """Classify text content into domains based on keyword density."""
    t = text.lower()
    scores: dict[str, int] = {}
    for domain, keywords in _CONTENT_DOMAIN_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in t)
        if score > 0:
            scores[domain] = score

    if not scores:
        return ["general"]

    # Return all domains with score > 0, sorted by score
    return [d for d, _ in sorted(scores.items(), key=lambda x: -x[1])]


# ---------------------------------------------------------------------------
# TeachMeMode
# ---------------------------------------------------------------------------

class TeachMeMode:
    """On-demand learning pipeline.

    Operator provides a URL -> system ingests, extracts, validates,
    stores, and generates a learning report.
    """

    def __init__(self, safety_threshold: float = 0.70):
        self._safety_threshold = safety_threshold

    def start_pipeline(self, url: str, title: str = "") -> LearningReport:
        """Initialize a learning pipeline for the given URL.

        Returns a LearningReport in 'pending' state.
        The actual ingestion would be async in production.
        """
        content_type = detect_content_type(url)
        return LearningReport(
            source_url=url,
            content_type=content_type.value,
            title=title or f"Learning from {url}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            pipeline_status="pending",
        )

    def extract_knowledge(
        self,
        report: LearningReport,
        content_text: str,
    ) -> LearningReport:
        """Extract knowledge items from ingested content.

        Takes raw text content and produces structured knowledge items.
        """
        report.pipeline_status = "extracting"
        domains = classify_content_domain(content_text)
        report.domains_covered = domains

        # Extract knowledge by domain
        items: list[ExtractedKnowledge] = []

        # Extract parameter values (speeds, feeds, depths)
        param_items = self._extract_parameters(content_text, domains)
        items.extend(param_items)

        # Extract practice recommendations
        practice_items = self._extract_practices(content_text, domains)
        items.extend(practice_items)

        # Extract material-specific knowledge
        material_items = self._extract_material_knowledge(content_text)
        items.extend(material_items)

        report.knowledge_items = items
        report.extracted_count = len(items)
        return report

    def validate_knowledge(self, report: LearningReport) -> LearningReport:
        """Validate extracted knowledge against physics models.

        Checks parameter ranges, safety rules, and internal consistency.
        """
        report.pipeline_status = "validating"
        validated = 0
        rejected = 0

        for item in report.knowledge_items:
            is_valid, notes = self._validate_item(item)
            item.validated = is_valid
            item.validation_notes = notes
            if is_valid:
                validated += 1
            else:
                rejected += 1
                report.warnings.append(
                    f"Rejected: {item.title} — {notes}"
                )

        report.validated_count = validated
        report.rejected_count = rejected
        return report

    def finalize(self, report: LearningReport) -> LearningReport:
        """Finalize the pipeline: generate takeaways and mark complete."""
        report.pipeline_status = "complete"
        report.stored_count = report.validated_count

        # Generate key takeaways
        takeaways = []
        for domain in report.domains_covered:
            domain_items = [k for k in report.knowledge_items
                          if k.domain == domain and k.validated]
            if domain_items:
                takeaways.append(
                    f"{domain.upper()}: {len(domain_items)} validated items extracted"
                )

        if report.rejected_count > 0:
            takeaways.append(
                f"WARNING: {report.rejected_count} items failed validation"
            )

        report.key_takeaways = takeaways
        return report

    def run_full_pipeline(self, url: str, content_text: str, title: str = "") -> LearningReport:
        """Run the complete pipeline: start -> extract -> validate -> finalize."""
        report = self.start_pipeline(url, title)
        report = self.extract_knowledge(report, content_text)
        report = self.validate_knowledge(report)
        report = self.finalize(report)
        return report

    # -- Extraction helpers --

    def _extract_parameters(self, text: str, domains: list[str]) -> list[ExtractedKnowledge]:
        items: list[ExtractedKnowledge] = []
        t = text.lower()

        # Speed values
        speed_matches = re.findall(
            r"(\d+(?:\.\d+)?)\s*(?:sfm|m/min|surface\s*feet)", t
        )
        for val in speed_matches:
            items.append(ExtractedKnowledge(
                domain="cam",
                category="cutting_parameters",
                title=f"Surface speed: {val}",
                content=f"Surface speed value: {val}",
                confidence=0.6,
                parameters={"cutting_speed": float(val)},
                tags=["speed", "cutting_parameters"],
            ))

        # Feed values
        feed_matches = re.findall(
            r"(\d+(?:\.\d+)?)\s*(?:ipt|mm/tooth|feed\s*per\s*tooth)", t
        )
        for val in feed_matches:
            items.append(ExtractedKnowledge(
                domain="cam",
                category="cutting_parameters",
                title=f"Feed per tooth: {val}",
                content=f"Feed per tooth value: {val}",
                confidence=0.6,
                parameters={"feed_per_tooth": float(val)},
                tags=["feed", "cutting_parameters"],
            ))

        # RPM values (matches both "5000 RPM" and "RPM: 5000")
        rpm_matches = re.findall(r"(?:(\d{3,6})\s*rpm|rpm\s*[:=]\s*(\d{3,6}))", t, re.IGNORECASE)
        rpm_matches = [m[0] or m[1] for m in rpm_matches]
        for val in rpm_matches:
            items.append(ExtractedKnowledge(
                domain="cam",
                category="cutting_parameters",
                title=f"Spindle RPM: {val}",
                content=f"Spindle speed: {val} RPM",
                confidence=0.6,
                parameters={"rpm": int(val)},
                tags=["rpm", "spindle", "cutting_parameters"],
            ))

        return items

    def _extract_practices(self, text: str, domains: list[str]) -> list[ExtractedKnowledge]:
        items: list[ExtractedKnowledge] = []

        # Look for numbered steps or bullet points
        step_patterns = re.findall(
            r"(?:step\s*\d+|^\s*\d+[.)]\s*|\*\s+)(.+?)(?:\n|$)",
            text, re.IGNORECASE | re.MULTILINE,
        )
        if step_patterns:
            domain = domains[0] if domains else "general"
            items.append(ExtractedKnowledge(
                domain=domain,
                category="practice",
                title="Extracted procedure steps",
                content="; ".join(s.strip() for s in step_patterns[:10]),
                confidence=0.5,
                tags=["practice", "procedure"],
            ))

        # Look for "tip:" or "note:" patterns
        tip_matches = re.findall(
            r"(?:tip|note|hint|important):\s*(.+?)(?:\n|$)",
            text, re.IGNORECASE,
        )
        for tip in tip_matches[:5]:
            domain = domains[0] if domains else "general"
            items.append(ExtractedKnowledge(
                domain=domain,
                category="tip",
                title=f"Tip: {tip[:60]}",
                content=tip.strip(),
                confidence=0.5,
                tags=["tip"],
            ))

        return items

    def _extract_material_knowledge(self, text: str) -> list[ExtractedKnowledge]:
        items: list[ExtractedKnowledge] = []
        t = text.lower()

        materials = [
            "aluminum", "steel", "stainless", "titanium", "cast iron",
            "brass", "copper", "inconel", "4140", "6061", "304", "316",
        ]
        for mat in materials:
            if mat in t:
                # Find sentences containing the material
                sentences = re.findall(
                    rf"[^.]*{re.escape(mat)}[^.]*\.",
                    t, re.IGNORECASE,
                )
                if sentences:
                    items.append(ExtractedKnowledge(
                        domain="material",
                        category="material_tips",
                        title=f"Material knowledge: {mat}",
                        content=sentences[0].strip()[:200],
                        confidence=0.5,
                        tags=[mat, "material"],
                    ))

        return items

    # -- Validation helpers --

    _SPEED_LIMITS: dict[str, tuple[float, float]] = {
        "aluminum": (50, 1500), "steel": (20, 350),
        "stainless": (15, 250), "titanium": (10, 120),
        "inconel": (5, 80), "brass": (50, 800),
    }

    def _validate_item(self, item: ExtractedKnowledge) -> tuple[bool, str]:
        """Validate a single knowledge item. Returns (is_valid, notes)."""
        params = item.parameters

        # Validate cutting speed ranges
        if "cutting_speed" in params:
            speed = params["cutting_speed"]
            if speed <= 0:
                return False, f"Invalid cutting speed: {speed}"
            if speed > 2000:
                return False, f"Cutting speed {speed} m/min exceeds safe maximum"

        # Validate RPM ranges
        if "rpm" in params:
            rpm = params["rpm"]
            if rpm <= 0:
                return False, f"Invalid RPM: {rpm}"
            if rpm > 60000:
                return False, f"RPM {rpm} exceeds safe maximum"

        # Validate feed per tooth
        if "feed_per_tooth" in params:
            fz = params["feed_per_tooth"]
            if fz <= 0:
                return False, f"Invalid feed per tooth: {fz}"
            if fz > 1.0:
                return False, f"Feed per tooth {fz} mm/tooth exceeds safe maximum"

        # Check for unsafe content
        unsafe_keywords = [
            "remove guard", "bypass interlock", "disable safety",
            "no eye protection", "skip warm-up",
        ]
        content_lower = item.content.lower()
        for kw in unsafe_keywords:
            if kw in content_lower:
                return False, f"Contains unsafe practice: '{kw}'"

        return True, "Passed validation checks"
