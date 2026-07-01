"""Component Writer — Write generated components to disk.

Takes GenerationResult from component_generator.py and writes actual files.
For tribal tips, appends to TribalKnowledgeEngine.ts KNOWLEDGE_BASE.
For other types, creates new files or appends to existing ones.

Part of CC-MS2: Auto-generation for /video-learn pipeline.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from component_generator import GeneratedComponent, GenerationResult


@dataclass
class WriteResult:
    """Result of writing components to disk."""
    video_id: str
    files_written: list[str] = field(default_factory=list)
    files_modified: list[str] = field(default_factory=list)
    tips_appended: int = 0
    errors: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)

    @property
    def total_written(self) -> int:
        return len(self.files_written) + len(self.files_modified) + self.tips_appended

    def to_dict(self) -> dict:
        return {
            "video_id": self.video_id,
            "files_written": self.files_written,
            "files_modified": self.files_modified,
            "tips_appended": self.tips_appended,
            "total_written": self.total_written,
            "errors": self.errors,
            "skipped": self.skipped,
        }


def write_components(
    gen_result: GenerationResult,
    *,
    base_dir: str = "C:/PRISM",
    dry_run: bool = False,
) -> WriteResult:
    """Write all generated components to disk.

    Args:
        gen_result: GenerationResult from generate_components().
        base_dir: Root directory for PRISM project.
        dry_run: If True, validate paths but don't write.

    Returns:
        WriteResult with files written/modified.
    """
    result = WriteResult(video_id=gen_result.video_id)

    # Group tribal tips separately (they append to one file)
    tips = []
    other = []
    for comp in gen_result.components:
        if comp.spec.type.value == "tribal_tip":
            tips.append(comp)
        else:
            other.append(comp)

    # Write tribal tips (batch append to TribalKnowledgeEngine.ts)
    if tips:
        _write_tribal_tips(tips, base_dir, result, dry_run)

    # Write other components (each gets its own file)
    for comp in other:
        _write_component_file(comp, base_dir, result, dry_run)

    return result


def _write_tribal_tips(
    tips: list[GeneratedComponent],
    base_dir: str,
    result: WriteResult,
    dry_run: bool,
) -> None:
    """Append tribal tips to TribalKnowledgeEngine.ts KNOWLEDGE_BASE array."""
    engine_path = os.path.join(base_dir, "mcp-server", "src", "engines", "TribalKnowledgeEngine.ts")

    if not os.path.exists(engine_path):
        result.errors.append(f"TribalKnowledgeEngine.ts not found at {engine_path}")
        return

    try:
        with open(engine_path, encoding="utf-8") as f:
            content = f.read()

        # Find the last tip entry in KNOWLEDGE_BASE (look for the last '},' before '];')
        # Pattern: find the closing of the KNOWLEDGE_BASE array
        kb_end = re.search(r'(}),?\s*\n\s*\];', content)
        if not kb_end:
            result.errors.append("Could not find KNOWLEDGE_BASE array end in TribalKnowledgeEngine.ts")
            return

        # Build the tips block
        tip_lines = []
        for tip in tips:
            tip_lines.append(tip.content)

        tips_block = "\n" + "\n".join(tip_lines)

        # Insert before the '];'
        insert_pos = kb_end.end() - 2  # Before '];'
        # Find the exact position of '];\n'
        bracket_pos = content.rfind('];', kb_end.start())
        if bracket_pos == -1:
            result.errors.append("Could not locate KNOWLEDGE_BASE closing bracket")
            return

        new_content = content[:bracket_pos] + tips_block + "\n" + content[bracket_pos:]

        if not dry_run:
            with open(engine_path, "w", encoding="utf-8") as f:
                f.write(new_content)

        result.tips_appended = len(tips)
        result.files_modified.append(engine_path)

    except Exception as e:
        result.errors.append(f"Failed to write tribal tips: {e}")


def _write_component_file(
    comp: GeneratedComponent,
    base_dir: str,
    result: WriteResult,
    dry_run: bool,
) -> None:
    """Write a single component file to disk."""
    file_path = comp.file_path

    # Resolve relative paths
    if not os.path.isabs(file_path):
        file_path = os.path.join(base_dir, file_path)

    # Normalize path separators
    file_path = file_path.replace("/", os.sep).replace("\\", os.sep)

    # Safety: don't overwrite existing files unless it's an append strategy
    if os.path.exists(file_path) and comp.spec.generation_strategy == "new_file":
        result.skipped.append(f"File exists, won't overwrite: {file_path}")
        return

    try:
        if not dry_run:
            # Ensure directory exists
            os.makedirs(os.path.dirname(file_path), exist_ok=True)

            if comp.spec.generation_strategy == "add_data" and os.path.exists(file_path):
                # For add_data strategy, merge with existing JSON
                _merge_json_file(file_path, comp.content)
                result.files_modified.append(file_path)
            else:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(comp.content)
                result.files_written.append(file_path)
        else:
            result.files_written.append(f"[dry-run] {file_path}")

    except Exception as e:
        result.errors.append(f"Failed to write {file_path}: {e}")


def _merge_json_file(file_path: str, new_content: str) -> None:
    """Merge new JSON content with an existing JSON file."""
    try:
        new_data = json.loads(new_content)
    except json.JSONDecodeError:
        # Not valid JSON, just overwrite
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        return

    try:
        with open(file_path, encoding="utf-8") as f:
            existing = json.load(f)
    except (json.JSONDecodeError, OSError):
        existing = {}

    # Merge: new data takes precedence
    if isinstance(existing, dict) and isinstance(new_data, dict):
        existing.update(new_data)
    else:
        existing = new_data

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(existing, f, indent=2)
