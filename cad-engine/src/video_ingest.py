"""Video Ingestion — Download + transcript extraction via yt-dlp.

Pipeline: URL → yt-dlp download → subtitle extraction → cleaned plaintext
with timestamps. Supports YouTube, Vimeo, and direct video URLs.

Part of CC-MS1: Video Ingestion Pipeline + Vision Analysis.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


class VideoIngestError(Exception):
    """Raised when video download or transcript extraction fails."""


@dataclass
class TranscriptSegment:
    """A single timestamped segment of transcript text."""
    start_seconds: float
    end_seconds: float
    text: str

    def to_dict(self) -> dict:
        return {
            "start": self.start_seconds,
            "end": self.end_seconds,
            "text": self.text,
        }


@dataclass
class VideoMetadata:
    """Metadata extracted from a video."""
    video_id: str
    title: str
    description: str
    duration_seconds: float
    uploader: str
    upload_date: str
    url: str
    thumbnail_url: str = ""
    view_count: int = 0
    tags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "video_id": self.video_id,
            "title": self.title,
            "description": self.description,
            "duration_seconds": self.duration_seconds,
            "uploader": self.uploader,
            "upload_date": self.upload_date,
            "url": self.url,
            "thumbnail_url": self.thumbnail_url,
            "view_count": self.view_count,
            "tags": self.tags,
        }


@dataclass
class IngestResult:
    """Complete result of video ingestion."""
    metadata: VideoMetadata
    transcript: list[TranscriptSegment]
    transcript_text: str
    video_path: Optional[str]
    subtitle_path: Optional[str]

    def to_dict(self) -> dict:
        return {
            "metadata": self.metadata.to_dict(),
            "transcript": [s.to_dict() for s in self.transcript],
            "transcript_text": self.transcript_text,
            "video_path": self.video_path,
            "subtitle_path": self.subtitle_path,
        }


# ---------------------------------------------------------------------------
# yt-dlp helpers
# ---------------------------------------------------------------------------

def _find_ytdlp() -> str:
    """Find yt-dlp executable."""
    # Try Python module first
    try:
        import yt_dlp  # noqa: F401
        return "yt-dlp"
    except ImportError:
        pass
    # Try PATH
    for name in ["yt-dlp", "yt-dlp.exe"]:
        try:
            subprocess.run([name, "--version"], capture_output=True, check=True)
            return name
        except (FileNotFoundError, subprocess.CalledProcessError):
            continue
    raise VideoIngestError("yt-dlp not found. Install with: pip install yt-dlp")


def _find_ffmpeg() -> str:
    """Find ffmpeg executable."""
    candidates = ["ffmpeg"]
    local_app = os.environ.get("LOCALAPPDATA", "")
    if local_app:
        candidates.append(os.path.join(local_app, "Microsoft", "WinGet", "Links", "ffmpeg.exe"))
    candidates.append(r"C:\ffmpeg\bin\ffmpeg.exe")
    for candidate in candidates:
        try:
            subprocess.run(
                [candidate, "-version"],
                capture_output=True, check=True, timeout=10,
            )
            return candidate
        except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
            continue
    raise VideoIngestError("ffmpeg not found. Install with: winget install Gyan.FFmpeg")


# ---------------------------------------------------------------------------
# Subtitle parsing
# ---------------------------------------------------------------------------

def _parse_vtt(content: str) -> list[TranscriptSegment]:
    """Parse WebVTT subtitle file into transcript segments."""
    segments: list[TranscriptSegment] = []
    lines = content.strip().split("\n")
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        # Look for timestamp lines: 00:00:01.000 --> 00:00:04.000
        match = re.match(
            r"(\d{1,2}:)?(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2})\.(\d{3})",
            line,
        )
        if match:
            groups = match.groups()
            start_h = int(groups[0].rstrip(":")) if groups[0] else 0
            start_m = int(groups[1])
            start_s = int(groups[2])
            start_ms = int(groups[3])
            end_h = int(groups[4].rstrip(":")) if groups[4] else 0
            end_m = int(groups[5])
            end_s = int(groups[6])
            end_ms = int(groups[7])

            start = start_h * 3600 + start_m * 60 + start_s + start_ms / 1000
            end = end_h * 3600 + end_m * 60 + end_s + end_ms / 1000

            # Collect text lines until blank line or next timestamp
            text_lines: list[str] = []
            i += 1
            while i < len(lines) and lines[i].strip():
                text_line = lines[i].strip()
                # Remove VTT position tags like <00:00:01.000>
                text_line = re.sub(r"<[\d:.]+>", "", text_line)
                # Remove HTML-style tags
                text_line = re.sub(r"<[^>]+>", "", text_line)
                if text_line:
                    text_lines.append(text_line)
                i += 1

            if text_lines:
                segments.append(TranscriptSegment(
                    start_seconds=start,
                    end_seconds=end,
                    text=" ".join(text_lines),
                ))
        i += 1

    return _deduplicate_segments(segments)


def _parse_srt(content: str) -> list[TranscriptSegment]:
    """Parse SRT subtitle file into transcript segments."""
    segments: list[TranscriptSegment] = []
    blocks = re.split(r"\n\s*\n", content.strip())

    for block in blocks:
        lines = block.strip().split("\n")
        if len(lines) < 2:
            continue

        # Find timestamp line
        for j, line in enumerate(lines):
            match = re.match(
                r"(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})",
                line.strip(),
            )
            if match:
                g = match.groups()
                start = int(g[0]) * 3600 + int(g[1]) * 60 + int(g[2]) + int(g[3]) / 1000
                end = int(g[4]) * 3600 + int(g[5]) * 60 + int(g[6]) + int(g[7]) / 1000
                text = " ".join(l.strip() for l in lines[j + 1:] if l.strip())
                text = re.sub(r"<[^>]+>", "", text)
                if text:
                    segments.append(TranscriptSegment(
                        start_seconds=start,
                        end_seconds=end,
                        text=text,
                    ))
                break

    return _deduplicate_segments(segments)


def _deduplicate_segments(segments: list[TranscriptSegment]) -> list[TranscriptSegment]:
    """Remove duplicate segments (common in auto-generated subs)."""
    if not segments:
        return segments
    deduped: list[TranscriptSegment] = [segments[0]]
    for seg in segments[1:]:
        if seg.text != deduped[-1].text:
            deduped.append(seg)
    return deduped


# ---------------------------------------------------------------------------
# Core pipeline
# ---------------------------------------------------------------------------

def extract_metadata(url: str) -> VideoMetadata:
    """Extract video metadata without downloading the video."""
    ytdlp = _find_ytdlp()
    cmd = [ytdlp, "--dump-json", "--no-download", url]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=60, check=True,
        )
    except subprocess.CalledProcessError as exc:
        raise VideoIngestError(f"yt-dlp metadata extraction failed: {exc.stderr}") from exc
    except subprocess.TimeoutExpired:
        raise VideoIngestError("yt-dlp metadata extraction timed out (60s)")

    info = json.loads(result.stdout)
    return VideoMetadata(
        video_id=info.get("id", ""),
        title=info.get("title", ""),
        description=info.get("description", ""),
        duration_seconds=info.get("duration", 0) or 0,
        uploader=info.get("uploader", ""),
        upload_date=info.get("upload_date", ""),
        url=url,
        thumbnail_url=info.get("thumbnail", ""),
        view_count=info.get("view_count", 0) or 0,
        tags=info.get("tags", []) or [],
    )


def extract_transcript(
    url: str,
    output_dir: str,
    *,
    language: str = "en",
    auto_subs: bool = True,
) -> tuple[list[TranscriptSegment], Optional[str]]:
    """Extract transcript/subtitles from a video URL.

    Tries manual subtitles first, falls back to auto-generated.

    Args:
        url: Video URL.
        output_dir: Directory to save subtitle files.
        language: Subtitle language code.
        auto_subs: Whether to try auto-generated subtitles.

    Returns:
        (segments, subtitle_file_path)
    """
    ytdlp = _find_ytdlp()
    os.makedirs(output_dir, exist_ok=True)

    # Try manual subs first, then auto
    sub_attempts = [
        ["--write-subs", "--sub-langs", language],
    ]
    if auto_subs:
        sub_attempts.append(["--write-auto-subs", "--sub-langs", language])

    sub_path: Optional[str] = None
    for attempt_flags in sub_attempts:
        cmd = [
            ytdlp,
            "--skip-download",
            "--sub-format", "vtt/srt/best",
            *attempt_flags,
            "-o", os.path.join(output_dir, "%(id)s.%(ext)s"),
            url,
        ]
        try:
            subprocess.run(cmd, capture_output=True, text=True, timeout=60, check=True)
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            continue

        # Find the subtitle file
        for ext in [".vtt", ".srt"]:
            for f in Path(output_dir).glob(f"*{ext}"):
                sub_path = str(f)
                break
            if sub_path:
                break
        if sub_path:
            break

    if not sub_path:
        return [], None

    # Parse
    content = Path(sub_path).read_text(encoding="utf-8", errors="replace")
    if sub_path.endswith(".vtt"):
        segments = _parse_vtt(content)
    else:
        segments = _parse_srt(content)

    return segments, sub_path


def download_video(
    url: str,
    output_dir: str,
    *,
    max_height: int = 720,
    format_spec: str = "bestvideo[height<={h}]+bestaudio/best[height<={h}]/best",
) -> Optional[str]:
    """Download video file for frame extraction.

    Downloads at most 720p to save bandwidth/disk.

    Returns:
        Path to downloaded video file, or None on failure.
    """
    ytdlp = _find_ytdlp()
    os.makedirs(output_dir, exist_ok=True)
    fmt = format_spec.replace("{h}", str(max_height))

    cmd = [
        ytdlp,
        "-f", fmt,
        "--merge-output-format", "mp4",
        "-o", os.path.join(output_dir, "%(id)s.%(ext)s"),
        url,
    ]

    try:
        subprocess.run(cmd, capture_output=True, text=True, timeout=600, check=True)
    except subprocess.CalledProcessError as exc:
        import logging
        logging.warning("Video download failed: %s", (exc.stderr or "")[-300:])
        return None
    except subprocess.TimeoutExpired:
        import logging
        logging.warning("Video download timed out after 600s for URL: %s", url)
        return None

    # Find the video file
    for f in Path(output_dir).glob("*.mp4"):
        return str(f)
    for f in Path(output_dir).glob("*.mkv"):
        return str(f)
    for f in Path(output_dir).glob("*.webm"):
        return str(f)

    return None


def ingest(
    url: str,
    output_dir: str,
    *,
    download: bool = True,
    language: str = "en",
) -> IngestResult:
    """Full ingestion pipeline: metadata + transcript + optional video download.

    Args:
        url: Video URL (YouTube, Vimeo, etc.).
        output_dir: Base directory for all output files.
        download: Whether to download the video file (needed for frame extraction).
        language: Subtitle language.

    Returns:
        IngestResult with metadata, transcript, and file paths.
    """
    os.makedirs(output_dir, exist_ok=True)

    # Step 1: Metadata
    metadata = extract_metadata(url)

    # Step 2: Transcript
    sub_dir = os.path.join(output_dir, "subs")
    segments, sub_path = extract_transcript(url, sub_dir, language=language)
    transcript_text = " ".join(seg.text for seg in segments)

    # Step 3: Video download (optional)
    video_path = None
    if download:
        vid_dir = os.path.join(output_dir, "video")
        video_path = download_video(url, vid_dir)

    return IngestResult(
        metadata=metadata,
        transcript=segments,
        transcript_text=transcript_text,
        video_path=video_path,
        subtitle_path=sub_path,
    )


def save_result(result: IngestResult, output_path: str) -> None:
    """Save ingestion result as JSON."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)
