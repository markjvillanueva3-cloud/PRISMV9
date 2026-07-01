"""Knowledge Schema Definitions — CC-EXT-MS1-P0-U06.

Defines the unified KnowledgeEntry schema for all extracted manufacturing
knowledge, with source provenance tracking and JSON schema validation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class KnowledgeType(str, Enum):
    """Type of extracted knowledge."""
    PARAMETER = "parameter"        # cutting speed, feed, DOC, etc.
    PRACTICE = "practice"          # machining procedures, setup steps
    TOOL = "tool"                  # tool specifications, insert data
    MATERIAL = "material"          # material properties, grades
    TOLERANCE = "tolerance"        # dimensional tolerances, fits
    CUTTING_DATA = "cutting_data"  # speed/feed recommendation tables


class ValidationStatus(str, Enum):
    """Physics validation status."""
    PENDING = "pending"
    VALID = "valid"          # within 20% of model
    SUSPECT = "suspect"      # 20-50% deviation
    INVALID = "invalid"      # >50% or physically impossible
    SKIPPED = "skipped"      # no applicable model


class ExtractionMethod(str, Enum):
    """Method used to extract the knowledge."""
    TEXT_PARSE = "text_parse"
    TABLE_PARSE = "table_parse"
    CHART_PARSE = "chart_parse"
    ISO_PARSE = "iso_parse"
    CATALOG_PARSE = "catalog_parse"
    PRACTICE_PARSE = "practice_parse"
    TOLERANCE_PARSE = "tolerance_parse"


# ---------------------------------------------------------------------------
# Source Provenance
# ---------------------------------------------------------------------------

@dataclass
class SourceProvenance:
    """Tracks the origin of an extracted knowledge entry."""
    pdf_path: str = ""
    page_number: int = 0
    region_type: str = ""        # "text", "table", "figure", "header"
    extraction_method: str = ""  # from ExtractionMethod
    source_text: str = ""        # raw text that was parsed
    confidence: float = 0.5

    def to_dict(self) -> dict:
        d: dict = {}
        if self.pdf_path:
            d["pdf_path"] = self.pdf_path
        if self.page_number:
            d["page_number"] = self.page_number
        if self.region_type:
            d["region_type"] = self.region_type
        if self.extraction_method:
            d["extraction_method"] = self.extraction_method
        if self.source_text:
            d["source_text"] = self.source_text[:200]
        d["confidence"] = round(self.confidence, 4)
        return d


# ---------------------------------------------------------------------------
# Knowledge Entry
# ---------------------------------------------------------------------------

@dataclass
class KnowledgeEntry:
    """Unified knowledge entry from any extraction source."""
    entry_id: str = ""
    knowledge_type: KnowledgeType = KnowledgeType.PARAMETER
    category: str = ""           # sub-category: "cutting_speed", "setup", etc.
    title: str = ""

    # Core value — flexible dict for different knowledge types
    value: dict = field(default_factory=dict)

    # Context
    material: str = ""
    material_grade: str = ""
    operation: str = ""
    tool_type: str = ""

    # Units and ranges
    unit: str = ""
    si_value: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None

    # Conditions and constraints
    conditions: list[str] = field(default_factory=list)
    constraints: list[dict] = field(default_factory=list)

    # Provenance
    source: SourceProvenance = field(default_factory=SourceProvenance)

    # Validation
    validation_status: ValidationStatus = ValidationStatus.PENDING
    validation_details: dict = field(default_factory=dict)

    # Confidence (combined from extraction + validation)
    confidence: float = 0.5

    # Dedup tracking
    merged_from: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        d: dict = {
            "knowledge_type": self.knowledge_type.value,
            "confidence": round(self.confidence, 4),
            "validation_status": self.validation_status.value,
        }
        if self.entry_id:
            d["entry_id"] = self.entry_id
        if self.category:
            d["category"] = self.category
        if self.title:
            d["title"] = self.title
        if self.value:
            d["value"] = self.value
        if self.material:
            d["material"] = self.material
        if self.material_grade:
            d["material_grade"] = self.material_grade
        if self.operation:
            d["operation"] = self.operation
        if self.tool_type:
            d["tool_type"] = self.tool_type
        if self.unit:
            d["unit"] = self.unit
        if self.si_value is not None:
            d["si_value"] = self.si_value
        if self.min_value is not None:
            d["min_value"] = self.min_value
        if self.max_value is not None:
            d["max_value"] = self.max_value
        if self.conditions:
            d["conditions"] = self.conditions
        if self.constraints:
            d["constraints"] = self.constraints
        if self.source.pdf_path or self.source.extraction_method:
            d["source"] = self.source.to_dict()
        if self.validation_details:
            d["validation_details"] = self.validation_details
        if self.merged_from:
            d["merged_from"] = self.merged_from
        return d


# ---------------------------------------------------------------------------
# JSON Schema for validation
# ---------------------------------------------------------------------------

KNOWLEDGE_ENTRY_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["knowledge_type", "confidence", "validation_status"],
    "properties": {
        "entry_id": {"type": "string"},
        "knowledge_type": {
            "type": "string",
            "enum": [kt.value for kt in KnowledgeType],
        },
        "category": {"type": "string"},
        "title": {"type": "string"},
        "value": {"type": "object"},
        "material": {"type": "string"},
        "material_grade": {"type": "string"},
        "operation": {"type": "string"},
        "tool_type": {"type": "string"},
        "unit": {"type": "string"},
        "si_value": {"type": ["number", "null"]},
        "min_value": {"type": ["number", "null"]},
        "max_value": {"type": ["number", "null"]},
        "conditions": {"type": "array", "items": {"type": "string"}},
        "constraints": {"type": "array", "items": {"type": "object"}},
        "source": {
            "type": "object",
            "properties": {
                "pdf_path": {"type": "string"},
                "page_number": {"type": "integer"},
                "region_type": {"type": "string"},
                "extraction_method": {"type": "string"},
                "source_text": {"type": "string"},
                "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            },
        },
        "validation_status": {
            "type": "string",
            "enum": [vs.value for vs in ValidationStatus],
        },
        "validation_details": {"type": "object"},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "merged_from": {"type": "array", "items": {"type": "string"}},
    },
    "additionalProperties": False,
}


def validate_entry_dict(entry_dict: dict) -> list[str]:
    """Validate an entry dict against the knowledge schema.

    Returns a list of error messages (empty = valid).
    Uses lightweight validation without external dependencies.
    """
    errors: list[str] = []
    schema = KNOWLEDGE_ENTRY_SCHEMA

    # Check required fields
    for req in schema["required"]:
        if req not in entry_dict:
            errors.append(f"Missing required field: {req}")

    # Check knowledge_type enum
    kt = entry_dict.get("knowledge_type")
    if kt is not None:
        valid_types = schema["properties"]["knowledge_type"]["enum"]
        if kt not in valid_types:
            errors.append(f"Invalid knowledge_type: {kt}. Must be one of {valid_types}")

    # Check validation_status enum
    vs = entry_dict.get("validation_status")
    if vs is not None:
        valid_statuses = schema["properties"]["validation_status"]["enum"]
        if vs not in valid_statuses:
            errors.append(f"Invalid validation_status: {vs}. Must be one of {valid_statuses}")

    # Check confidence range
    conf = entry_dict.get("confidence")
    if conf is not None:
        if not isinstance(conf, (int, float)) or conf < 0 or conf > 1:
            errors.append(f"confidence must be a number between 0 and 1, got {conf}")

    # Check numeric fields
    for num_field in ("si_value", "min_value", "max_value"):
        val = entry_dict.get(num_field)
        if val is not None and not isinstance(val, (int, float)):
            errors.append(f"{num_field} must be a number or null, got {type(val).__name__}")

    # Check array fields
    for arr_field in ("conditions", "constraints", "merged_from"):
        val = entry_dict.get(arr_field)
        if val is not None and not isinstance(val, list):
            errors.append(f"{arr_field} must be an array, got {type(val).__name__}")

    # Check for unknown fields
    allowed = set(schema["properties"].keys())
    for key in entry_dict:
        if key not in allowed:
            errors.append(f"Unknown field: {key}")

    return errors
