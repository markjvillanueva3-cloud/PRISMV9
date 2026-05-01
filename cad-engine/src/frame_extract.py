"""Frame Extraction — Scene-change frame sampling via ffmpeg.

Extracts keyframes from video at scene changes or fixed intervals.
Optimized for CNC/CAD tutorial analysis: captures UI transitions,
parameter changes, and toolpath visualizations.

Part of CC-MS1: Video Ingestion Pipeline + Vision Analysis.
"""

from __future__ import annotations

import json
import logging
import os
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class FrameExtractError(Exception):
    """Raised when frame extraction fails."""


@dataclass
class ExtractedFrame:
    """A single extracted frame with metadata."""
    path: str
    timestamp_seconds: float
    frame_number: int
    width: int = 0
    height: int = 0
    scene_score: float = 0.0

    def to_dict(self) -> dict:
        return {
            "path": self.path,
            "timestamp_seconds": self.timestamp_seconds,
            "frame_number": self.frame_number,
            "width": self.width,
            "height": self.height,
            "scene_score": self.scene_score,
        }


@dataclass
class FrameExtractionResult:
    """Result of frame extraction from a video."""
    video_path: str
    total_frames: int
    duration_seconds: float
    frames: list[ExtractedFrame] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "video_path": self.video_path,
            "total_frames": self.total_frames,
            "duration_seconds": self.duration_seconds,
            "frames": [f.to_dict() for f in self.frames],
        }


# ---------------------------------------------------------------------------
# ffmpeg helpers
# ---------------------------------------------------------------------------

import platform as _platform
import shutil as _shutil

# Cache discovered binary paths
_ffmpeg_cache: str | None = None
_ffprobe_cache: str | None = None


def _find_binary(name: str) -> str:
    """Find a binary by name, checking PATH then platform-specific locations."""
    # Check PATH first via shutil.which
    which_result = _shutil.which(name)
    if which_result:
        return which_result

    candidates: list[str] = []
    if _platform.system() == "Windows":
        local_app = os.environ.get("LOCALAPPDATA", "")
        if local_app:
            candidates.append(os.path.join(local_app, "Microsoft", "WinGet", "Links", f"{name}.exe"))
        candidates.append(rf"C:\ffmpeg\bin\{name}.exe")
    else:
        candidates.extend([
            f"/usr/bin/{name}",
            f"/usr/local/bin/{name}",
            f"/opt/homebrew/bin/{name}",
        ])

    for candidate in candidates:
        if os.path.isfile(candidate):
            try:
                subprocess.run(
                    [candidate, "-version"],
                    capture_output=True, check=True, timeout=10,
                )
                return candidate
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
                continue
    raise FrameExtractError(f"{name} not found. Install from https://ffmpeg.org/download.html")


def _find_ffmpeg() -> str:
    """Find ffmpeg executable (cached)."""
    global _ffmpeg_cache
    if _ffmpeg_cache is None:
        _ffmpeg_cache = _find_binary("ffmpeg")
    return _ffmpeg_cache


def _find_ffprobe() -> str:
    """Find ffprobe executable (cached)."""
    global _ffprobe_cache
    if _ffprobe_cache is None:
        _ffprobe_cache = _find_binary("ffprobe")
    return _ffprobe_cache


def get_video_duration(video_path: str) -> float:
    """Get video duration in seconds using ffprobe."""
    ffprobe = _find_ffprobe()
    cmd = [
        ffprobe,
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        video_path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, check=True)
        info = json.loads(result.stdout)
        return float(info.get("format", {}).get("duration", 0))
    except (subprocess.CalledProcessError, json.JSONDecodeError, ValueError) as exc:
        logger.warning("Failed to get video duration for %s: %s", video_path, exc)
        return 0.0


def get_video_resolution(video_path: str) -> tuple[int, int]:
    """Get video width and height using ffprobe."""
    ffprobe = _find_ffprobe()
    cmd = [
        ffprobe,
        "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        "-select_streams", "v:0",
        video_path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, check=True)
        info = json.loads(result.stdout)
        streams = info.get("streams", [])
        if streams:
            return int(streams[0].get("width", 0)), int(streams[0].get("height", 0))
    except (subprocess.CalledProcessError, json.JSONDecodeError, ValueError) as exc:
        logger.warning("Failed to get video resolution for %s: %s", video_path, exc)
    return 0, 0


# ---------------------------------------------------------------------------
# Frame extraction strategies
# ---------------------------------------------------------------------------

def extract_scene_change_frames(
    video_path: str,
    output_dir: str,
    *,
    threshold: float = 0.3,
    min_interval: float = 2.0,
    max_frames: int = 100,
) -> FrameExtractionResult:
    """Extract frames at scene changes using ffmpeg's scene detection.

    Uses the 'select' filter with scene detection to capture frames where
    significant visual changes occur (UI transitions, menu changes, etc.).

    Args:
        video_path: Path to the video file.
        output_dir: Directory for extracted frame images.
        threshold: Scene change threshold (0.0 to 1.0). Lower = more frames.
        min_interval: Minimum seconds between frames to avoid duplicates.
        max_frames: Maximum number of frames to extract.

    Returns:
        FrameExtractionResult with extracted frame metadata.
    """
    ffmpeg = _find_ffmpeg()
    os.makedirs(output_dir, exist_ok=True)

    duration = get_video_duration(video_path)
    width, height = get_video_resolution(video_path)

    # Use scene detection filter
    # The select filter outputs frames where scene change score > threshold
    # showinfo prints timestamp and other metadata to stderr
    select_filter = (
        f"select='gt(scene,{threshold})',"
        f"showinfo"
    )

    cmd = [
        ffmpeg,
        "-i", video_path,
        "-vf", select_filter,
        "-vsync", "vfr",
        "-frame_pts", "1",
        os.path.join(output_dir, "scene_%04d.jpg"),
        "-y",
    ]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=300,
        )
        stderr_text = result.stderr
        if result.returncode != 0:
            import logging
            logging.warning(
                "ffmpeg scene detection failed (rc=%d): %s",
                result.returncode, stderr_text[-500:],
            )
    except subprocess.TimeoutExpired:
        raise FrameExtractError("Frame extraction timed out (300s)")

    # Parse showinfo output to get timestamps and scene scores
    frames: list[ExtractedFrame] = []
    frame_files = sorted(Path(output_dir).glob("scene_*.jpg"))

    # Extract timestamps from ffmpeg showinfo output
    timestamps: list[float] = []
    for match in re.finditer(r"pts_time:([\d.]+)", stderr_text):
        timestamps.append(float(match.group(1)))

    # Extract scene scores from ffmpeg select filter output
    scene_scores: list[float] = []
    for match in re.finditer(r"scene:([\d.]+)", stderr_text):
        scene_scores.append(float(match.group(1)))

    last_ts = -min_interval
    frame_num = 0
    for i, frame_file in enumerate(frame_files):
        ts = timestamps[i] if i < len(timestamps) else i * 2.0

        # Enforce minimum interval
        if ts - last_ts < min_interval:
            frame_file.unlink(missing_ok=True)
            continue

        if frame_num >= max_frames:
            frame_file.unlink(missing_ok=True)
            continue

        frames.append(ExtractedFrame(
            path=str(frame_file),
            timestamp_seconds=ts,
            frame_number=frame_num,
            width=width,
            height=height,
            scene_score=scene_scores[i] if i < len(scene_scores) else 0.0,
        ))
        last_ts = ts
        frame_num += 1

    # Clean up excess frames
    for frame_file in frame_files[len(timestamps):]:
        if not any(f.path == str(frame_file) for f in frames):
            frame_file.unlink(missing_ok=True)

    return FrameExtractionResult(
        video_path=video_path,
        total_frames=len(frames),
        duration_seconds=duration,
        frames=frames,
    )


def extract_interval_frames(
    video_path: str,
    output_dir: str,
    *,
    interval_seconds: float = 10.0,
    max_frames: int = 100,
) -> FrameExtractionResult:
    """Extract frames at fixed time intervals.

    Simpler than scene detection but ensures even coverage of the video.

    Args:
        video_path: Path to the video file.
        output_dir: Directory for extracted frame images.
        interval_seconds: Seconds between each frame.
        max_frames: Maximum number of frames to extract.
    """
    ffmpeg = _find_ffmpeg()
    os.makedirs(output_dir, exist_ok=True)

    duration = get_video_duration(video_path)
    width, height = get_video_resolution(video_path)

    fps = 1.0 / interval_seconds
    cmd = [
        ffmpeg,
        "-i", video_path,
        "-vf", f"fps={fps}",
        "-frames:v", str(max_frames),
        os.path.join(output_dir, "frame_%04d.jpg"),
        "-y",
    ]

    try:
        subprocess.run(cmd, capture_output=True, text=True, timeout=300, check=True)
    except subprocess.CalledProcessError as exc:
        raise FrameExtractError(f"Frame extraction failed: {exc.stderr}") from exc
    except subprocess.TimeoutExpired:
        raise FrameExtractError("Frame extraction timed out (300s)")

    frames: list[ExtractedFrame] = []
    for i, frame_file in enumerate(sorted(Path(output_dir).glob("frame_*.jpg"))):
        if i >= max_frames:
            break
        frames.append(ExtractedFrame(
            path=str(frame_file),
            timestamp_seconds=i * interval_seconds,
            frame_number=i,
            width=width,
            height=height,
        ))

    return FrameExtractionResult(
        video_path=video_path,
        total_frames=len(frames),
        duration_seconds=duration,
        frames=frames,
    )


def extract_keyframes(
    video_path: str,
    output_dir: str,
    *,
    scene_threshold: float = 0.3,
    min_interval: float = 2.0,
    fallback_interval: float = 15.0,
    max_frames: int = 80,
    min_frames: int = 5,
) -> FrameExtractionResult:
    """Smart keyframe extraction — scene detection with interval fallback.

    First attempts scene-change detection. If too few frames are found
    (common in screencasts with subtle changes), falls back to fixed
    interval extraction.

    This is the recommended entry point for the pipeline.
    """
    # Try scene detection first
    scene_dir = os.path.join(output_dir, "scene")
    result = extract_scene_change_frames(
        video_path, scene_dir,
        threshold=scene_threshold,
        min_interval=min_interval,
        max_frames=max_frames,
    )

    if result.total_frames >= min_frames:
        return result

    # Fallback: interval-based extraction
    interval_dir = os.path.join(output_dir, "interval")
    return extract_interval_frames(
        video_path, interval_dir,
        interval_seconds=fallback_interval,
        max_frames=max_frames,
    )


def save_result(result: FrameExtractionResult, output_path: str) -> None:
    """Save frame extraction result as JSON."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)
