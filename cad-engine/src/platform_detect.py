"""Platform Detector — Software name + version identification.

Identifies CAD/CAM/CNC software and versions from video frames,
transcript mentions, and OCR text. Uses pattern matching against
a comprehensive database of manufacturing software.

Part of CC-MS1: Video Ingestion Pipeline + Vision Analysis.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class PlatformMatch:
    """A detected software platform."""
    name: str
    version: Optional[str]
    confidence: float
    source: str  # "title", "transcript", "ocr", "vision"
    evidence: str = ""

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "version": self.version,
            "confidence": round(self.confidence, 3),
            "source": self.source,
            "evidence": self.evidence,
        }


@dataclass
class PlatformDetectionResult:
    """Platform detection result."""
    primary_platform: Optional[PlatformMatch]
    all_platforms: list[PlatformMatch]
    controller: Optional[PlatformMatch] = None

    def to_dict(self) -> dict:
        return {
            "primary_platform": self.primary_platform.to_dict() if self.primary_platform else None,
            "all_platforms": [p.to_dict() for p in self.all_platforms],
            "controller": self.controller.to_dict() if self.controller else None,
        }


# ---------------------------------------------------------------------------
# Software database — patterns for detection
# ---------------------------------------------------------------------------

# Each entry: (canonical_name, [regex_patterns], category)
# Patterns include optional version capture groups

_SOFTWARE_DB: list[tuple[str, list[str], str]] = [
    # CAD Software
    ("Fusion 360", [
        r"fusion\s*360(?:\s+v?(\d+\.\d+[\d.]*))?",
        r"autodesk\s+fusion(?:\s+v?(\d+\.\d+[\d.]*))?",
    ], "cad_cam"),

    ("SolidWorks", [
        r"solidworks(?:\s+(\d{4}(?:\s*sp\d+[\d.]*)?))?",
        r"solid\s+works(?:\s+(\d{4}))?",
    ], "cad"),

    ("Inventor", [
        r"(?:autodesk\s+)?inventor(?:\s+(\d{4}(?:\.\d+)?))?",
    ], "cad"),

    ("FreeCAD", [
        r"freecad(?:\s+v?(\d+\.\d+[\d.]*))?",
    ], "cad"),

    ("Onshape", [
        r"onshape",
    ], "cad"),

    ("CATIA", [
        r"catia(?:\s+v?(\d+(?:r\d+)?))?",
    ], "cad"),

    ("Creo", [
        r"(?:ptc\s+)?creo(?:\s+(?:parametric\s+)?v?(\d+\.\d+[\d.]*))?",
        r"pro/?engineer",
    ], "cad"),

    ("Siemens NX", [
        r"(?:siemens\s+)?(?:nx|unigraphics)(?:\s+(\d+[\d.]*))?",
    ], "cad"),

    ("Rhino", [
        r"rhino(?:ceros)?(?:\s+(\d+))?",
        r"rhino\s*3d(?:\s+(\d+))?",
    ], "cad"),

    ("AutoCAD", [
        r"autocad(?:\s+(\d{4}))?",
    ], "cad"),

    # CAM Software
    ("Mastercam", [
        r"mastercam(?:\s+(\d{4}|\d+\.\d+))?",
    ], "cam"),

    ("HSMWorks", [
        r"hsmworks(?:\s+(\d+\.\d+[\d.]*))?",
    ], "cam"),

    ("PowerMill", [
        r"powermill(?:\s+(\d{4}|\d+\.\d+))?",
    ], "cam"),

    ("ESPRIT", [
        r"esprit(?:\s+(\d{4}|\d+\.\d+))?",
    ], "cam"),

    ("BobCAM", [
        r"bobcam(?:\s+v?(\d+))?",
        r"bobcad[\s-]*cam(?:\s+v?(\d+))?",
    ], "cam"),

    ("GibbsCAM", [
        r"gibbscam(?:\s+(\d+\.\d+[\d.]*))?",
    ], "cam"),

    ("hyperMILL", [
        r"hypermill(?:\s+(\d{4}|\d+\.\d+))?",
    ], "cam"),

    ("Edgecam", [
        r"edgecam(?:\s+(\d{4}|\d+\.\d+))?",
    ], "cam"),

    ("CAMWorks", [
        r"camworks(?:\s+(\d{4}))?",
    ], "cam"),

    # CNC Controllers
    ("Fanuc", [
        r"fanuc(?:\s+(\d+[a-z]*i?(?:-\w+)?))?",
    ], "controller"),

    ("Haas", [
        r"haas(?:\s+(?:ngc|classic))?(?:\s+(v\d+[\d.]*))?",
    ], "controller"),

    ("Siemens Sinumerik", [
        r"sinumerik(?:\s+(\d{3}\w*))?",
        r"siemens\s+(\d{3}\w*)",
    ], "controller"),

    ("Heidenhain", [
        r"heidenhain(?:\s+(tnc\s*\d+|itnc\s*\d+))?",
    ], "controller"),

    ("Mazak", [
        r"mazak(?:\s+(?:mazatrol\s+)?(\w+))?",
        r"mazatrol(?:\s+(\w+))?",
    ], "controller"),

    ("Okuma", [
        r"okuma(?:\s+(osp[-\s]?\w+))?",
    ], "controller"),

    # Simulation / Analysis
    ("Vericut", [
        r"vericut(?:\s+v?(\d+\.\d+[\d.]*))?",
    ], "simulation"),

    ("Ansys", [
        r"ansys(?:\s+(\d{4}|\d+\.\d+))?",
    ], "simulation"),

    # Slicers / 3D Printing
    ("Cura", [
        r"(?:ultimaker\s+)?cura(?:\s+v?(\d+\.\d+[\d.]*))?",
    ], "slicer"),

    ("PrusaSlicer", [
        r"prusa\s*slicer(?:\s+v?(\d+\.\d+[\d.]*))?",
    ], "slicer"),
]


# ---------------------------------------------------------------------------
# Detection engine
# ---------------------------------------------------------------------------

def _detect_in_text(
    text: str,
    source: str,
    confidence_base: float = 0.5,
) -> list[PlatformMatch]:
    """Detect software platforms in a text string.

    Args:
        text: Text to search.
        source: Source label (title, transcript, ocr, vision).
        confidence_base: Base confidence for matches from this source.
    """
    text_lower = text.lower()
    matches: list[PlatformMatch] = []

    for name, patterns, category in _SOFTWARE_DB:
        for pattern in patterns:
            for match in re.finditer(pattern, text_lower):
                version = None
                # Check all capture groups for version
                for group in match.groups():
                    if group:
                        version = group.strip()
                        break

                # Confidence boost for version detection
                conf = confidence_base
                if version:
                    conf += 0.2

                # Extract context around match
                start = max(0, match.start() - 20)
                end = min(len(text), match.end() + 20)
                evidence = text[start:end].strip()

                matches.append(PlatformMatch(
                    name=name,
                    version=version,
                    confidence=min(conf, 1.0),
                    source=source,
                    evidence=evidence,
                ))
                break  # One match per pattern set is enough

    return matches


def detect(
    *,
    title: str = "",
    transcript: str = "",
    ocr_text: str = "",
    vision_text: str = "",
) -> PlatformDetectionResult:
    """Detect software platforms from all available text sources.

    Title matches get highest confidence, followed by transcript,
    then OCR, then vision analysis.

    Args:
        title: Video title.
        transcript: Full transcript text.
        ocr_text: Combined OCR text from frames.
        vision_text: Text from vision analysis.
    """
    all_matches: list[PlatformMatch] = []

    if title:
        all_matches.extend(_detect_in_text(title, "title", 0.9))
    if transcript:
        all_matches.extend(_detect_in_text(transcript, "transcript", 0.7))
    if ocr_text:
        all_matches.extend(_detect_in_text(ocr_text, "ocr", 0.6))
    if vision_text:
        all_matches.extend(_detect_in_text(vision_text, "vision", 0.8))

    if not all_matches:
        return PlatformDetectionResult(
            primary_platform=None,
            all_platforms=[],
        )

    # Deduplicate and merge: keep highest confidence per platform name
    best_by_name: dict[str, PlatformMatch] = {}
    for match in all_matches:
        key = match.name
        if key not in best_by_name or match.confidence > best_by_name[key].confidence:
            best_by_name[key] = match
        elif match.version and not best_by_name[key].version:
            # Prefer the match with version info
            best_by_name[key].version = match.version

    unique_matches = sorted(
        best_by_name.values(),
        key=lambda m: m.confidence,
        reverse=True,
    )

    # Separate controllers from software
    controllers = [m for m in unique_matches if _is_controller(m.name)]
    software = [m for m in unique_matches if not _is_controller(m.name)]

    primary = software[0] if software else (controllers[0] if controllers else unique_matches[0])
    controller = controllers[0] if controllers else None

    return PlatformDetectionResult(
        primary_platform=primary,
        all_platforms=unique_matches,
        controller=controller,
    )


def _is_controller(name: str) -> bool:
    """Check if a platform name is a CNC controller."""
    for sw_name, _, category in _SOFTWARE_DB:
        if sw_name == name:
            return category == "controller"
    return False
