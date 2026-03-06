"""UI OCR — Frame text extraction via Tesseract.

Extracts text from video frames with preprocessing optimized for
software UI screenshots (high contrast, menus, parameter fields).

Part of CC-MS1: Video Ingestion Pipeline + Vision Analysis.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Optional

import logging
import platform
import re
import shutil

from PIL import Image, ImageFilter, ImageOps

try:
    import pytesseract
except ImportError:
    pytesseract = None

logger = logging.getLogger(__name__)


class OCRError(Exception):
    """Raised when OCR processing fails."""


@dataclass
class OCRRegion:
    """A detected text region with bounding box."""
    text: str
    confidence: float
    x: int
    y: int
    width: int
    height: int

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "confidence": self.confidence,
            "bbox": {"x": self.x, "y": self.y, "w": self.width, "h": self.height},
        }


@dataclass
class OCRResult:
    """OCR result for a single frame."""
    frame_path: str
    full_text: str
    regions: list[OCRRegion] = field(default_factory=list)
    preprocessed: bool = False

    def to_dict(self) -> dict:
        return {
            "frame_path": self.frame_path,
            "full_text": self.full_text,
            "regions": [r.to_dict() for r in self.regions],
            "preprocessed": self.preprocessed,
        }


# ---------------------------------------------------------------------------
# Tesseract configuration
# ---------------------------------------------------------------------------

# Platform-specific Tesseract installation paths
_TESSERACT_PATHS_WIN = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
]
_TESSERACT_PATHS_UNIX = [
    "/usr/bin/tesseract",
    "/usr/local/bin/tesseract",
    "/opt/homebrew/bin/tesseract",
]

_TESSERACT_CONFIGURED = False


def _configure_tesseract() -> None:
    """Set Tesseract path if not on PATH. Cross-platform."""
    global _TESSERACT_CONFIGURED
    if pytesseract is None:
        raise OCRError("pytesseract not installed. Run: pip install pytesseract")

    if _TESSERACT_CONFIGURED:
        return

    # Check if already on PATH
    try:
        pytesseract.get_tesseract_version()
        _TESSERACT_CONFIGURED = True
        return
    except pytesseract.TesseractNotFoundError:
        pass

    # Check PATH via shutil.which
    which_result = shutil.which("tesseract")
    if which_result:
        pytesseract.pytesseract.tesseract_cmd = which_result
        _TESSERACT_CONFIGURED = True
        return

    # Try platform-specific paths
    paths = _TESSERACT_PATHS_WIN if platform.system() == "Windows" else _TESSERACT_PATHS_UNIX
    for path in paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            _TESSERACT_CONFIGURED = True
            return

    raise OCRError(
        "Tesseract not found. Install from: "
        "https://github.com/UB-Mannheim/tesseract/wiki (Windows) "
        "or: apt install tesseract-ocr / brew install tesseract (Unix)"
    )


# ---------------------------------------------------------------------------
# Image preprocessing
# ---------------------------------------------------------------------------

def preprocess_for_ocr(
    image: Image.Image,
    *,
    upscale: bool = True,
    sharpen: bool = True,
    binarize: bool = False,
    threshold: int = 128,
) -> Image.Image:
    """Preprocess an image for optimal OCR accuracy.

    Optimized for software UI screenshots with menus, toolbars,
    and parameter fields.

    Args:
        image: PIL Image to preprocess.
        upscale: If True, upscale small images to improve OCR.
        sharpen: If True, apply sharpening filter.
        binarize: If True, convert to black/white.
        threshold: Binarization threshold (0-255).
    """
    img = image.copy()

    # Convert to grayscale
    if img.mode != "L":
        img = ImageOps.grayscale(img)

    # Upscale small images (Tesseract works best at ~300 DPI)
    if upscale and (img.width < 1000 or img.height < 600):
        scale = max(2, 1500 // max(img.width, 1))
        img = img.resize(
            (img.width * scale, img.height * scale),
            Image.Resampling.LANCZOS,
        )

    # Enhance contrast
    img = ImageOps.autocontrast(img, cutoff=1)

    # Sharpen
    if sharpen:
        img = img.filter(ImageFilter.SHARPEN)

    # Binarize (optional — helps with low-contrast UIs)
    if binarize:
        img = img.point(lambda p: 255 if p > threshold else 0)

    return img


# ---------------------------------------------------------------------------
# OCR extraction
# ---------------------------------------------------------------------------

def extract_text(
    frame_path: str,
    *,
    preprocess: bool = True,
    language: str = "eng",
    min_confidence: float = 30.0,
) -> OCRResult:
    """Extract text from a single frame image.

    Args:
        frame_path: Path to the frame image file.
        preprocess: Whether to apply preprocessing.
        language: Tesseract language code.
        min_confidence: Minimum confidence (0-100) for region inclusion.

    Returns:
        OCRResult with full text and individual regions.
    """
    _configure_tesseract()

    if not os.path.exists(frame_path):
        raise OCRError(f"Frame not found: {frame_path}")

    image = Image.open(frame_path)
    if preprocess:
        processed = preprocess_for_ocr(image)
    else:
        processed = image

    # Validate language code (ISO 639-2/3 format, e.g. "eng", "eng+deu")
    if not re.fullmatch(r"[a-z]{3}(\+[a-z]{3})*", language):
        raise OCRError(f"Invalid language code: {language!r}")

    # Get detailed data with bounding boxes
    config = f"--oem 3 --psm 6 -l {language}"
    try:
        data = pytesseract.image_to_data(
            processed, config=config, output_type=pytesseract.Output.DICT,
        )
    except Exception as exc:
        raise OCRError(f"Tesseract OCR failed: {exc}") from exc

    # Build regions from word-level detections
    regions: list[OCRRegion] = []
    n_items = len(data.get("text", []))

    for i in range(n_items):
        text = data["text"][i].strip()
        conf = float(data["conf"][i])
        if text and conf >= min_confidence:
            regions.append(OCRRegion(
                text=text,
                confidence=conf,
                x=data["left"][i],
                y=data["top"][i],
                width=data["width"][i],
                height=data["height"][i],
            ))

    # Also get plain text
    full_text = pytesseract.image_to_string(processed, config=config).strip()

    return OCRResult(
        frame_path=frame_path,
        full_text=full_text,
        regions=regions,
        preprocessed=preprocess,
    )


def extract_text_batch(
    frame_paths: list[str],
    *,
    preprocess: bool = True,
    language: str = "eng",
    min_confidence: float = 30.0,
) -> list[OCRResult]:
    """Extract text from multiple frames.

    Args:
        frame_paths: List of frame image paths.
        preprocess: Whether to apply preprocessing.
        language: Tesseract language code.
        min_confidence: Minimum confidence for region inclusion.
    """
    results: list[OCRResult] = []
    for path in frame_paths:
        try:
            result = extract_text(
                path,
                preprocess=preprocess,
                language=language,
                min_confidence=min_confidence,
            )
            results.append(result)
        except OCRError as err:
            logger.warning("OCR failed for frame %s: %s", path, err)
            results.append(OCRResult(
                frame_path=path,
                full_text="",
                regions=[],
                preprocessed=preprocess,
            ))
    return results


def extract_ui_elements(ocr_result: OCRResult) -> dict:
    """Identify common UI elements from OCR regions.

    Looks for patterns typical in CAD/CAM software:
    - Menu items (File, Edit, View, Tools, etc.)
    - Parameter fields (numeric values with units)
    - Tool names and operation labels
    - Coordinate displays (X, Y, Z values)
    """
    elements: dict = {
        "menus": [],
        "parameters": [],
        "coordinates": [],
        "labels": [],
    }

    menu_keywords = {
        "file", "edit", "view", "tools", "insert", "format",
        "window", "help", "sketch", "modify", "assemble",
        "manufacture", "design", "model", "surface", "mesh",
        "create", "inspect", "select", "feature",
    }

    for region in ocr_result.regions:
        text_lower = region.text.lower()

        # Menu items
        if text_lower in menu_keywords:
            elements["menus"].append(region.text)

        # Parameters (number + optional unit)
        if re.match(r"^-?[\d.]+\s*(mm|in|deg|rpm|m/min|ipm|sfm)?$", text_lower):
            elements["parameters"].append(region.text)

        # Coordinates (X/Y/Z + number)
        if re.match(r"^[xyz]\s*[:=]?\s*-?[\d.]+", text_lower):
            elements["coordinates"].append(region.text)

        # Labels (text > 3 chars, not purely numeric)
        if len(region.text) > 3 and not region.text.replace(".", "").isdigit():
            elements["labels"].append(region.text)

    return elements
