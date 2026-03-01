"""Knowledge Extraction Orchestrator — CC-MS2.

Coordinates the full extraction pipeline:
  1. Domain classification (from CC-MS1)
  2. Platform detection (from CC-MS1)
  3. Select domain-specific prompts
  4. Merge transcript + OCR + vision evidence
  5. Call Claude API for structured extraction
  6. Validate extracted knowledge per domain
  7. Build cross-domain links
  8. Store with provenance tracking

Output conforms to knowledge_schema_v2.json.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .domain_classify import classify, Domain
from .platform_detect import detect
from .prompts.cad_prompts import CAD_SYSTEM_PROMPT, build_cad_user_message
from .prompts.cam_prompts import CAM_SYSTEM_PROMPT, build_cam_user_message
from .prompts.shop_prompts import SHOP_SYSTEM_PROMPT, build_shop_user_message
from .validators.cad_validator import validate_cad_extraction
from .validators.cam_validator import validate_cam_extraction
from .validators.shop_validator import validate_shop_extraction


_EXTRACTION_MODEL = "claude-sonnet-4-20250514"


class ExtractionError(Exception):
    """Raised when knowledge extraction fails."""


@dataclass
class ExtractionResult:
    """Result of a knowledge extraction run."""

    video_id: str
    knowledge: dict
    validation_results: dict = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        if self.errors:
            return False
        return all(
            v.get("is_valid", True)
            for v in self.validation_results.values()
        )

    def to_dict(self) -> dict:
        return {
            "video_id": self.video_id,
            "is_valid": self.is_valid,
            "knowledge": self.knowledge,
            "validation_results": self.validation_results,
            "errors": self.errors,
        }


# ---------------------------------------------------------------------------
# Anthropic API integration
# ---------------------------------------------------------------------------


_VALID_DOMAINS = {"cad", "cam", "shop", "multi"}


def _get_client():
    """Get Anthropic client.

    Uses the SDK's built-in ANTHROPIC_API_KEY env var reading
    to avoid passing the key explicitly (prevents traceback leaks).
    """
    try:
        import anthropic
    except ImportError:
        raise ExtractionError(
            "anthropic SDK not installed. Run: pip install anthropic"
        )

    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise ExtractionError(
            "ANTHROPIC_API_KEY not set. Export it or add to .env"
        )

    return anthropic.Anthropic()  # SDK reads ANTHROPIC_API_KEY from env


def _call_extraction(
    system_prompt: str,
    user_message: str,
    model: str = _EXTRACTION_MODEL,
) -> dict:
    """Call Claude API and parse JSON response."""
    client = _get_client()

    response = client.messages.create(
        model=model,
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    if not response.content:
        raise ExtractionError("Empty response from Claude API (no content blocks)")

    text = response.content[0].text.strip()

    # Strip markdown fences if present (handles ```json, ```JSON, ``` etc.)
    if text.startswith("```"):
        # Find matching closing fence
        lines = text.split("\n")
        start = 1  # Skip opening fence line
        end = len(lines)
        for i in range(len(lines) - 1, 0, -1):
            if lines[i].strip() == "```":
                end = i
                break
        text = "\n".join(lines[start:end])

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ExtractionError(
            f"Failed to parse extraction response as JSON: {e}\n"
            f"Response preview: {text[:200]}"
        )


# ---------------------------------------------------------------------------
# Domain extraction
# ---------------------------------------------------------------------------


def _extract_cad(
    transcript: str,
    ocr_text: str | None,
    vision_summary: str | None,
    platform: str | None,
) -> dict:
    """Extract CAD domain knowledge."""
    user_msg = build_cad_user_message(transcript, ocr_text, vision_summary, platform)
    raw = _call_extraction(CAD_SYSTEM_PROMPT, user_msg)
    return {
        "features": raw.get("features", []),
        "design_intent_summary": raw.get("design_intent_summary"),
        "modeling_approach": raw.get("modeling_approach"),
    }


def _extract_cam(
    transcript: str,
    ocr_text: str | None,
    vision_summary: str | None,
    platform: str | None,
) -> dict:
    """Extract CAM domain knowledge."""
    user_msg = build_cam_user_message(transcript, ocr_text, vision_summary, platform)
    raw = _call_extraction(CAM_SYSTEM_PROMPT, user_msg)
    return {
        "strategies": raw.get("strategies", []),
        "machining_summary": raw.get("machining_summary"),
        "tool_list": raw.get("tool_list", []),
    }


def _extract_shop(
    transcript: str,
    ocr_text: str | None,
    vision_summary: str | None,
) -> dict:
    """Extract SHOP domain knowledge."""
    user_msg = build_shop_user_message(transcript, ocr_text, vision_summary)
    raw = _call_extraction(SHOP_SYSTEM_PROMPT, user_msg)
    return {
        "practices": raw.get("practices", []),
        "setup_summary": raw.get("setup_summary"),
        "key_takeaways": raw.get("key_takeaways", []),
    }


# ---------------------------------------------------------------------------
# Cross-domain linking
# ---------------------------------------------------------------------------


def _build_cross_links(domains: dict) -> list[dict]:
    """Discover cross-domain relationships from extracted knowledge.

    Links are inferred from:
    - CAM strategies referencing CAD feature IDs (target_features)
    - SHOP practices referencing materials that CAM strategies cut
    - Shared tool references between CAM and SHOP
    """
    links: list[dict] = []

    cad_features = {
        f["id"]: f for f in domains.get("cad", {}).get("features", [])
        if f.get("id")
    }
    cam_strategies = domains.get("cam", {}).get("strategies", [])
    shop_practices = domains.get("shop", {}).get("practices", [])

    # CAM -> CAD: strategies that target specific features
    for strat in cam_strategies:
        sid = strat.get("id")
        if not sid:
            continue
        for feat_id in strat.get("target_features", []):
            if feat_id in cad_features:
                links.append({
                    "from_id": sid,
                    "from_domain": "cam",
                    "to_id": feat_id,
                    "to_domain": "cad",
                    "relationship": "implements",
                    "description": (
                        f"CAM operation '{strat.get('name', '')}' machines "
                        f"CAD feature '{cad_features[feat_id].get('name', '')}'"
                    ),
                })

    # SHOP -> CAM: practices that reference similar tools/materials
    # Build a map from tool type -> strategy that owns it
    cam_tool_owners: dict[str, str] = {}
    for strat in cam_strategies:
        sid = strat.get("id")
        tool = strat.get("tool")
        if sid and tool and tool.get("type"):
            tool_key = tool["type"].lower()
            if tool_key not in cam_tool_owners:
                cam_tool_owners[tool_key] = sid

    for practice in shop_practices:
        pid = practice.get("id")
        if not pid:
            continue
        desc_lower = practice.get("description", "").lower()
        title_lower = practice.get("title", "").lower()
        combined = desc_lower + " " + title_lower

        # Link if practice mentions a tool used in CAM
        for tool_type, owner_id in cam_tool_owners.items():
            if tool_type in combined:
                links.append({
                    "from_id": pid,
                    "from_domain": "shop",
                    "to_id": owner_id,
                    "to_domain": "cam",
                    "relationship": "validates",
                    "description": (
                        f"Shop practice '{practice.get('title', '')}' relates to "
                        f"tool type '{tool_type}' used in CAM operations"
                    ),
                })
                break  # One link per practice

    return links


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------


def _compute_stats(domains: dict, cross_links: list[dict]) -> dict:
    """Compute extraction statistics."""
    cad_count = len(domains.get("cad", {}).get("features", []))
    cam_count = len(domains.get("cam", {}).get("strategies", []))
    shop_count = len(domains.get("shop", {}).get("practices", []))
    total = cad_count + cam_count + shop_count

    # Average confidence across all items
    confidences: list[float] = []
    for feat in domains.get("cad", {}).get("features", []):
        prov = feat.get("provenance", {})
        if prov and prov.get("confidence") is not None:
            confidences.append(prov["confidence"])
    for strat in domains.get("cam", {}).get("strategies", []):
        prov = strat.get("provenance", {})
        if prov and prov.get("confidence") is not None:
            confidences.append(prov["confidence"])
    for practice in domains.get("shop", {}).get("practices", []):
        prov = practice.get("provenance", {})
        if prov and prov.get("confidence") is not None:
            confidences.append(prov["confidence"])

    sources_used: list[str] = []
    # Detect which sources contributed
    for items_key in [("cad", "features"), ("cam", "strategies"), ("shop", "practices")]:
        for item in domains.get(items_key[0], {}).get(items_key[1], []):
            src = item.get("provenance", {}).get("source_type")
            if src and src not in sources_used:
                sources_used.append(src)

    return {
        "total_items": total,
        "cad_features": cad_count,
        "cam_strategies": cam_count,
        "shop_practices": shop_count,
        "cross_links": len(cross_links),
        "avg_confidence": round(sum(confidences) / len(confidences), 3) if confidences else 0.0,
        "sources_used": sources_used,
    }


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------


def extract_knowledge(
    video_id: str,
    title: str,
    transcript: str,
    ocr_text: str | None = None,
    vision_summary: str | None = None,
    description: str | None = None,
    duration_seconds: float | None = None,
    uploader: str | None = None,
    tags: list[str] | None = None,
    force_domain: str | None = None,
) -> ExtractionResult:
    """Run the full knowledge extraction pipeline for a video.

    Args:
        video_id: Unique video identifier.
        title: Video title.
        transcript: Full transcript text.
        ocr_text: Combined OCR text from keyframes (optional).
        vision_summary: Combined vision analysis summaries (optional).
        description: Video description (optional).
        duration_seconds: Video duration (optional).
        uploader: Video uploader/channel (optional).
        tags: Video tags (optional).
        force_domain: Override domain classification (cad/cam/shop/multi).

    Returns:
        ExtractionResult with the complete knowledge document.
    """
    errors: list[str] = []

    # Step 1: Domain classification
    if force_domain:
        if force_domain not in _VALID_DOMAINS:
            raise ExtractionError(
                f"Invalid force_domain '{force_domain}'. "
                f"Must be one of: {', '.join(sorted(_VALID_DOMAINS))}"
            )
        primary_domain = force_domain
        domain_confidence = 1.0
        secondary_domain = None
    else:
        classification = classify(
            title=title,
            transcript=transcript,
            ocr_text=ocr_text or "",
            vision_text=vision_summary or "",
        )
        primary_domain = classification.primary_domain
        domain_confidence = classification.confidence
        secondary_domain = classification.secondary_domain

    # Step 2: Platform detection
    detection = detect(
        title=title,
        transcript=transcript,
        ocr_text=ocr_text or "",
        vision_text=vision_summary or "",
    )
    platform = detection.primary_platform.name if detection.primary_platform else None
    platform_version = (
        detection.primary_platform.version
        if detection.primary_platform
        else None
    )
    controller = detection.controller.name if detection.controller else None

    # Step 3: Extract per domain
    domains: dict = {}
    domains_to_extract: list[str] = []

    if primary_domain in ("cad", "multi"):
        domains_to_extract.append("cad")
    if primary_domain in ("cam", "multi"):
        domains_to_extract.append("cam")
    if primary_domain in ("shop", "multi"):
        domains_to_extract.append("shop")

    # Also extract secondary domain if present
    if secondary_domain and secondary_domain not in domains_to_extract:
        domains_to_extract.append(secondary_domain)

    # If unknown domain, try all three
    if not domains_to_extract:
        domains_to_extract = ["cad", "cam", "shop"]

    for domain in domains_to_extract:
        try:
            if domain == "cad":
                domains["cad"] = _extract_cad(
                    transcript, ocr_text, vision_summary, platform
                )
            elif domain == "cam":
                domains["cam"] = _extract_cam(
                    transcript, ocr_text, vision_summary, platform
                )
            elif domain == "shop":
                domains["shop"] = _extract_shop(
                    transcript, ocr_text, vision_summary
                )
        except ExtractionError as e:
            errors.append(f"{domain} extraction failed: {e}")

    # Step 4: Validate per domain
    validation_results: dict = {}
    for domain_name, domain_data in domains.items():
        try:
            if domain_name == "cad":
                validation_results["cad"] = validate_cad_extraction(domain_data)
            elif domain_name == "cam":
                validation_results["cam"] = validate_cam_extraction(domain_data)
            elif domain_name == "shop":
                validation_results["shop"] = validate_shop_extraction(domain_data)
        except Exception as e:
            errors.append(f"{domain_name} validation error: {e}")

    # Step 5: Cross-domain linking
    cross_links = _build_cross_links(domains)

    # Step 6: Compute stats
    stats = _compute_stats(domains, cross_links)

    # Step 7: Build final knowledge document
    knowledge: dict = {
        "schema_version": "2.0.0",
        "video_id": video_id,
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "metadata": {
            "title": title,
            "description": description,
            "primary_domain": primary_domain,
            "secondary_domain": secondary_domain,
            "domain_confidence": round(domain_confidence, 3),
            "platform": platform,
            "platform_version": platform_version,
            "controller": controller,
            "material": None,  # Filled by validators if detected
            "duration_seconds": duration_seconds,
            "uploader": uploader,
            "tags": tags or [],
        },
        "domains": domains,
        "cross_domain_links": cross_links,
        "extraction_stats": stats,
    }

    return ExtractionResult(
        video_id=video_id,
        knowledge=knowledge,
        validation_results=validation_results,
        errors=errors,
    )


def save_knowledge(result: ExtractionResult, output_dir: str | Path) -> Path:
    """Save extraction result to a JSON file.

    Args:
        result: The extraction result to save.
        output_dir: Directory to save the knowledge file.

    Returns:
        Path to the saved file.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Sanitize video_id to prevent path traversal
    safe_id = "".join(
        c if c.isalnum() or c in "-_." else "_"
        for c in result.video_id
    )
    if not safe_id:
        safe_id = "unknown"

    filename = f"knowledge_{safe_id}.json"
    output_path = output_dir / filename

    # Verify output stays within output_dir (Python 3.9+)
    resolved = output_path.resolve()
    if not resolved.is_relative_to(output_dir.resolve()):
        raise ExtractionError(
            f"Path traversal detected in video_id: {result.video_id!r}"
        )

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result.knowledge, f, indent=2, ensure_ascii=False)

    return output_path
