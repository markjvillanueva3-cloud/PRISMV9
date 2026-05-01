"""Domain Classifier — CAD/CAM/SHOP classification with confidence scores.

Combines video title, transcript text, OCR results, and frame analysis
to classify tutorials into manufacturing domains.

Part of CC-MS1: Video Ingestion Pipeline + Vision Analysis.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Domain(Enum):
    """Manufacturing tutorial domains."""
    CAD = "cad"
    CAM = "cam"
    SHOP = "shop"
    MULTI = "multi"
    UNKNOWN = "unknown"


@dataclass
class DomainScore:
    """Confidence score for a single domain."""
    domain: str
    score: float
    evidence: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "domain": self.domain,
            "score": round(self.score, 3),
            "evidence": self.evidence[:10],
        }


@dataclass
class ClassificationResult:
    """Domain classification result."""
    primary_domain: str
    confidence: float
    scores: list[DomainScore]
    is_multi_domain: bool
    secondary_domain: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "primary_domain": self.primary_domain,
            "confidence": round(self.confidence, 3),
            "scores": [s.to_dict() for s in self.scores],
            "is_multi_domain": self.is_multi_domain,
            "secondary_domain": self.secondary_domain,
        }


# ---------------------------------------------------------------------------
# Keyword dictionaries — weighted by specificity
# ---------------------------------------------------------------------------

# High-weight terms are highly specific to one domain
# Low-weight terms may appear across domains

_CAD_KEYWORDS: dict[str, float] = {
    # Software names (very specific)
    "solidworks": 3.0, "solid works": 3.0, "inventor": 2.5,
    "freecad": 3.0, "onshape": 3.0, "catia": 3.0,
    "creo": 3.0, "siemens nx": 3.0, "rhino": 2.0,
    "fusion 360": 1.5,  # lower — also used for CAM
    # Operations
    "extrude": 2.0, "revolve": 2.0, "loft": 2.0, "sweep": 1.5,
    "fillet": 1.5, "chamfer": 1.5, "shell": 1.0,
    "sketch": 1.5, "constraint": 1.5, "dimension": 1.0,
    "assembly": 1.5, "mate": 1.5, "joint": 1.0,
    "boolean": 1.5, "union": 0.5, "subtract": 0.5,
    # Concepts
    "parametric": 1.5, "feature tree": 2.0, "model tree": 2.0,
    "design intent": 2.0, "3d model": 1.5, "solid body": 1.5,
    "surface model": 1.5, "wireframe": 1.0, "b-rep": 2.0,
    "step file": 1.0, "iges": 1.0, "stl": 0.5,
    "drawing": 1.0, "blueprint": 1.0, "gd&t": 1.5,
    "tolerance": 0.5, "fit": 0.3,
}

_CAM_KEYWORDS: dict[str, float] = {
    # Software names
    "mastercam": 3.0, "hsmworks": 3.0, "esprit": 3.0,
    "powermill": 3.0, "bobcam": 3.0, "gibbscam": 3.0,
    "hypermill": 3.0, "edgecam": 3.0, "camworks": 3.0,
    "fusion 360 cam": 3.0, "fusion cam": 3.0,
    # Operations
    "toolpath": 3.0, "roughing": 2.0, "finishing": 1.5,
    "pocketing": 2.5, "facing": 2.0, "contouring": 2.0,
    "adaptive": 1.5, "trochoidal": 2.5, "rest machining": 2.5,
    "drilling": 1.0, "boring": 1.5, "tapping": 1.5,
    "profiling": 1.5, "slotting": 1.5,
    # Parameters
    "feeds and speeds": 2.5, "feed rate": 2.0, "spindle speed": 2.0,
    "depth of cut": 2.0, "stepover": 2.5, "stepdown": 2.5,
    "chip load": 2.5, "ipm": 1.5, "sfm": 2.0, "rpm": 1.0,
    "cutting speed": 1.5, "radial engagement": 2.0,
    # Tools
    "end mill": 2.0, "ball nose": 2.0, "bull nose": 2.0,
    "face mill": 2.0, "indexable": 1.5, "insert": 1.0,
    # Post
    "post processor": 2.5, "g-code": 2.0, "gcode": 2.0,
    "nc code": 2.0, "program": 0.5,
}

_SHOP_KEYWORDS: dict[str, float] = {
    # Machines
    "cnc machine": 2.0, "machining center": 2.5,
    "vertical mill": 2.5, "horizontal mill": 2.5,
    "cnc lathe": 2.5, "turning center": 2.5,
    "mill-turn": 2.5, "swiss": 2.0,
    "edm": 2.0, "wire edm": 2.5,
    "surface grinder": 2.5, "cylindrical grinder": 2.5,
    # Controllers
    "fanuc": 2.5, "haas": 2.5, "siemens sinumerik": 3.0,
    "heidenhain": 2.5, "mazak": 2.5, "okuma": 2.5,
    "meldas": 2.5, "mitsubishi": 1.5,
    # Setup
    "workholding": 2.5, "vise": 2.0, "fixture": 2.0,
    "chuck": 2.0, "collet": 2.0, "clamp": 1.5,
    "tool setter": 2.5, "probe": 1.5, "touch off": 2.5,
    "work offset": 2.5, "tool offset": 2.5,
    "g54": 2.0, "g55": 2.0,
    # Operations
    "chip": 1.0, "coolant": 1.5, "flood": 1.0,
    "deburr": 2.0, "inspection": 1.0,
    "dial indicator": 2.5, "edge finder": 2.5,
    # Shop concepts
    "shop floor": 3.0, "machine shop": 3.0,
    "setup sheet": 2.5, "run sheet": 2.5,
    "cycle time": 1.5, "parts per hour": 2.0,
}


# ---------------------------------------------------------------------------
# Scoring engine
# ---------------------------------------------------------------------------

def _score_text(text: str, keywords: dict[str, float]) -> tuple[float, list[str]]:
    """Score text against keyword dictionary.

    Returns:
        (total_score, list of matched evidence strings)
    """
    text_lower = text.lower()
    total = 0.0
    evidence: list[str] = []

    for keyword, weight in keywords.items():
        # Count occurrences (case-insensitive)
        count = len(re.findall(re.escape(keyword), text_lower))
        if count > 0:
            # Diminishing returns for repeated mentions
            score = weight * min(count, 3)
            total += score
            evidence.append(f"'{keyword}' x{count} ({score:.1f})")

    return total, evidence


def classify(
    *,
    title: str = "",
    transcript: str = "",
    ocr_text: str = "",
    frame_analysis: str = "",
    multi_threshold: float = 0.6,
) -> ClassificationResult:
    """Classify a video into manufacturing domains.

    Combines all available text sources with appropriate weighting.
    Title gets 3x weight, transcript gets 1x, OCR/frame analysis get 0.5x.

    Args:
        title: Video title.
        transcript: Full transcript text.
        ocr_text: Combined OCR text from frames.
        frame_analysis: Text from vision analysis results.
        multi_threshold: If second-highest domain score is above this
            fraction of the highest, classify as MULTI.

    Returns:
        ClassificationResult with primary domain and confidence scores.
    """
    # Build weighted text corpus
    # Title is most reliable signal, transcript is bulk, OCR/vision are supplementary
    weighted_text = f"{title} {title} {title} {transcript} "
    if ocr_text:
        weighted_text += ocr_text + " "
    if frame_analysis:
        weighted_text += frame_analysis

    # Score against each domain
    cad_score, cad_evidence = _score_text(weighted_text, _CAD_KEYWORDS)
    cam_score, cam_evidence = _score_text(weighted_text, _CAM_KEYWORDS)
    shop_score, shop_evidence = _score_text(weighted_text, _SHOP_KEYWORDS)

    # Normalize to 0-1 range
    total = cad_score + cam_score + shop_score
    if total == 0:
        return ClassificationResult(
            primary_domain=Domain.UNKNOWN.value,
            confidence=0.0,
            scores=[
                DomainScore(Domain.CAD.value, 0.0, []),
                DomainScore(Domain.CAM.value, 0.0, []),
                DomainScore(Domain.SHOP.value, 0.0, []),
            ],
            is_multi_domain=False,
        )

    cad_norm = cad_score / total
    cam_norm = cam_score / total
    shop_norm = shop_score / total

    scores = [
        DomainScore(Domain.CAD.value, cad_norm, cad_evidence),
        DomainScore(Domain.CAM.value, cam_norm, cam_evidence),
        DomainScore(Domain.SHOP.value, shop_norm, shop_evidence),
    ]
    scores.sort(key=lambda s: s.score, reverse=True)

    primary = scores[0]
    secondary = scores[1] if len(scores) > 1 else None

    # Check for multi-domain
    is_multi = False
    secondary_domain = None
    if secondary and secondary.score >= multi_threshold * primary.score:
        is_multi = True
        secondary_domain = secondary.domain

    return ClassificationResult(
        primary_domain=primary.domain if not is_multi else Domain.MULTI.value,
        confidence=primary.score,
        scores=scores,
        is_multi_domain=is_multi,
        secondary_domain=secondary_domain,
    )
