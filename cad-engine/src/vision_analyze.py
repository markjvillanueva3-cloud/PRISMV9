"""Vision Analysis — Frame analysis via Claude API.

Sends keyframes to Claude's vision API with domain-specific prompts
for CAD, CAM, and SHOP floor analysis. Extracts structured information
that goes beyond what transcript alone provides.

Part of CC-MS1: Video Ingestion Pipeline + Vision Analysis.
"""

from __future__ import annotations

import base64
import json
import logging
import os
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


_DEFAULT_MODEL = "claude-sonnet-4-20250514"


class VisionAnalysisError(Exception):
    """Raised when vision analysis fails."""


class AnalysisMode(Enum):
    """Domain-specific analysis modes."""
    CAD = "cad"
    CAM = "cam"
    SHOP = "shop"
    GENERAL = "general"


@dataclass
class FrameAnalysis:
    """Analysis result for a single frame."""
    frame_path: str
    timestamp_seconds: float
    mode: str
    description: str
    elements: dict = field(default_factory=dict)
    raw_response: str = ""

    def to_dict(self) -> dict:
        return {
            "frame_path": self.frame_path,
            "timestamp_seconds": self.timestamp_seconds,
            "mode": self.mode,
            "description": self.description,
            "elements": self.elements,
        }


@dataclass
class VisionAnalysisResult:
    """Complete vision analysis result for a video."""
    video_id: str
    mode: str
    frame_analyses: list[FrameAnalysis] = field(default_factory=list)
    summary: str = ""
    unique_insights: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "video_id": self.video_id,
            "mode": self.mode,
            "frame_analyses": [fa.to_dict() for fa in self.frame_analyses],
            "summary": self.summary,
            "unique_insights": self.unique_insights,
        }


# ---------------------------------------------------------------------------
# Prompts per analysis mode
# ---------------------------------------------------------------------------

_PROMPTS = {
    AnalysisMode.CAD: """Analyze this CAD software screenshot. Identify and describe:

1. **Software**: Which CAD application is shown? (SolidWorks, Fusion 360, FreeCAD, Inventor, etc.)
2. **UI State**: What menus, toolbars, or panels are visible?
3. **Feature Tree**: What features are listed in the model tree/browser?
4. **Active Operation**: What operation is being performed? (sketch, extrude, fillet, assembly, etc.)
5. **Parameters**: Any visible dimensions, constraints, or numeric values?
6. **Geometry**: Describe the 3D model or 2D sketch visible.
7. **Material/Appearance**: Any material assignments visible?

Return a JSON object with keys: software, ui_state, feature_tree, operation, parameters, geometry, material.
If a field is not visible, use null.""",

    AnalysisMode.CAM: """Analyze this CAM software screenshot. Identify and describe:

1. **Software**: Which CAM application is shown? (Fusion 360 CAM, Mastercam, HSMWorks, etc.)
2. **Operation Type**: What machining operation? (facing, pocketing, contouring, drilling, etc.)
3. **Toolpath**: Describe visible toolpath lines (roughing, finishing, linking moves).
4. **Cutting Parameters**: Any visible speeds, feeds, DOC, stepover values?
5. **Tool**: What tool is being used? (end mill, drill, ball nose — diameter if visible)
6. **Workholding**: Any visible fixture, vise, or clamp setup?
7. **Stock/Part**: Describe the workpiece geometry and material if identifiable.
8. **Post-Processor**: Any controller or post-processor settings visible?

Return a JSON object with keys: software, operation, toolpath, parameters, tool, workholding, stock, post_processor.
If a field is not visible, use null.""",

    AnalysisMode.SHOP: """Analyze this machine shop / CNC screenshot or photo. Identify and describe:

1. **Machine**: What machine is shown? (VMC, HMC, lathe, mill-turn, EDM, etc.)
2. **Controller**: What CNC controller? (Fanuc, Haas, Siemens, Heidenhain, etc.)
3. **Setup**: Describe the workholding and part setup.
4. **Tools**: Any visible cutting tools, tool holders, or tool magazines?
5. **Operation**: What machining operation is happening?
6. **Coolant**: What coolant delivery is visible? (flood, through-tool, mist, dry)
7. **Safety**: Any safety concerns visible? (chip evacuation, clearances, etc.)
8. **Display**: Any screen readouts showing coordinates, speeds, or alarms?

Return a JSON object with keys: machine, controller, setup, tools, operation, coolant, safety, display.
If a field is not visible, use null.""",

    AnalysisMode.GENERAL: """Analyze this image from a CNC manufacturing tutorial. Describe:

1. What is shown in the image?
2. What software, machine, or equipment is visible?
3. What technical information can be extracted?
4. Any text, numbers, or parameters visible?
5. What manufacturing domain does this relate to? (CAD design, CAM programming, shop floor operations)

Return a JSON object with keys: description, software_or_equipment, technical_info, visible_text, domain.""",
}


# ---------------------------------------------------------------------------
# Claude API integration
# ---------------------------------------------------------------------------

def _get_anthropic_client():
    """Get Anthropic client, checking for API key."""
    try:
        import anthropic
    except ImportError:
        raise VisionAnalysisError("anthropic SDK not installed. Run: pip install anthropic")

    # Auto-load from PRISM .env if not in environment
    from .knowledge_extract import _load_env_file
    _load_env_file()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise VisionAnalysisError(
            "ANTHROPIC_API_KEY not set. Export it or add to .env"
        )

    return anthropic.Anthropic(api_key=api_key)


def _encode_image(image_path: str) -> tuple[str, str]:
    """Read and base64-encode an image file.

    Returns:
        (base64_data, media_type)
    """
    path = Path(image_path)
    if not path.exists():
        raise VisionAnalysisError(f"Image not found: {image_path}")

    ext = path.suffix.lower()
    media_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    media_type = media_types.get(ext, "image/jpeg")

    data = path.read_bytes()
    return base64.standard_b64encode(data).decode("utf-8"), media_type


def analyze_frame(
    image_path: str,
    mode: AnalysisMode = AnalysisMode.GENERAL,
    *,
    timestamp_seconds: float = 0.0,
    model: str = _DEFAULT_MODEL,
    max_tokens: int = 1024,
) -> FrameAnalysis:
    """Analyze a single frame using Claude's vision API.

    Args:
        image_path: Path to the frame image.
        mode: Analysis mode (CAD, CAM, SHOP, GENERAL).
        timestamp_seconds: Timestamp of the frame in the video.
        model: Claude model to use.
        max_tokens: Maximum response tokens.
    """
    client = _get_anthropic_client()
    image_data, media_type = _encode_image(image_path)
    prompt = _PROMPTS[mode]

    try:
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt,
                        },
                    ],
                }
            ],
        )
    except Exception as exc:
        raise VisionAnalysisError(f"Claude API call failed: {exc}") from exc

    raw_text = response.content[0].text

    # Try to parse JSON from response
    elements = _extract_json(raw_text)

    return FrameAnalysis(
        frame_path=image_path,
        timestamp_seconds=timestamp_seconds,
        mode=mode.value,
        description=raw_text[:500] if not elements else _summarize_elements(elements),
        elements=elements,
        raw_response=raw_text,
    )


def _extract_json(text: str) -> dict:
    """Extract JSON object from Claude's response text."""
    import re

    # Try to find JSON block in markdown code fence
    json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try parsing the entire response as JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try finding a JSON-like block
    brace_match = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", text)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    logger.warning("Failed to extract JSON from Claude response (len=%d)", len(text))
    return {}


def _summarize_elements(elements: dict) -> str:
    """Create a short text summary from extracted elements."""
    parts = []
    for key, value in elements.items():
        if value is not None and value != "null":
            if isinstance(value, str):
                parts.append(f"{key}: {value}")
            elif isinstance(value, list):
                parts.append(f"{key}: {', '.join(str(v) for v in value[:3])}")
    return "; ".join(parts[:5])


# ---------------------------------------------------------------------------
# Batch analysis
# ---------------------------------------------------------------------------

def analyze_frames(
    frames: list[dict],
    mode: AnalysisMode = AnalysisMode.GENERAL,
    *,
    model: str = _DEFAULT_MODEL,
    max_frames: int = 20,
    skip_interval: int = 1,
) -> list[FrameAnalysis]:
    """Analyze multiple frames.

    Args:
        frames: List of dicts with 'path' and 'timestamp_seconds'.
        mode: Analysis mode.
        model: Claude model to use.
        max_frames: Maximum frames to analyze (API cost control).
        skip_interval: Analyze every Nth frame (1 = all, 2 = every other).
    """
    results: list[FrameAnalysis] = []
    selected = frames[::skip_interval][:max_frames]

    if len(frames) > max_frames:
        logger.info(
            "Frame batch truncated: %d → %d (max_frames=%d, skip=%d)",
            len(frames), len(selected), max_frames, skip_interval,
        )

    for idx, frame_info in enumerate(selected):
        try:
            result = analyze_frame(
                frame_info["path"],
                mode=mode,
                timestamp_seconds=frame_info.get("timestamp_seconds", 0),
                model=model,
            )
            results.append(result)
        except VisionAnalysisError as err:
            logger.warning(
                "Vision analysis failed for frame %d/%d (%s): %s",
                idx + 1, len(selected), frame_info.get("path", "?"), err,
            )
            continue

    return results


def analyze_video_frames(
    frames: list[dict],
    *,
    video_id: str = "",
    mode: AnalysisMode = AnalysisMode.GENERAL,
    model: str = _DEFAULT_MODEL,
    max_frames: int = 20,
) -> VisionAnalysisResult:
    """Full vision analysis pipeline for a video's frames.

    Analyzes frames and generates a summary with unique insights
    (information not available from transcript alone).
    """
    analyses = analyze_frames(
        frames, mode=mode, model=model, max_frames=max_frames,
    )

    # Identify unique insights
    unique_insights: list[str] = []
    for analysis in analyses:
        if analysis.elements:
            for key, value in analysis.elements.items():
                if value is not None and value != "null" and isinstance(value, str):
                    insight = f"[{analysis.timestamp_seconds:.0f}s] {key}: {value}"
                    if insight not in unique_insights:
                        unique_insights.append(insight)

    # Generate summary
    summary_parts = []
    if analyses:
        modes_found = set(a.mode for a in analyses)
        summary_parts.append(f"Analyzed {len(analyses)} frames in {', '.join(modes_found)} mode")

        software_found = set()
        for a in analyses:
            sw = a.elements.get("software") or a.elements.get("software_or_equipment")
            if sw is not None and sw != "null":
                software_found.add(sw)
        if software_found:
            summary_parts.append(f"Software: {', '.join(software_found)}")

    return VisionAnalysisResult(
        video_id=video_id,
        mode=mode.value,
        frame_analyses=analyses,
        summary=". ".join(summary_parts),
        unique_insights=unique_insights[:50],
    )


def save_result(result: VisionAnalysisResult, output_path: str) -> None:
    """Save vision analysis result as JSON."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)
