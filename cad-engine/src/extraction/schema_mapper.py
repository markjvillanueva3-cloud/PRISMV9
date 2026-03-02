"""Schema Mapper — CC-EXT-MS1-P0-U06.

Transforms raw extractor outputs (parameters, practices, catalog data)
into unified KnowledgeEntry objects with source provenance and dedup.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Optional

from .knowledge_schema import (
    ExtractionMethod,
    KnowledgeEntry,
    KnowledgeType,
    SourceProvenance,
    ValidationStatus,
    validate_entry_dict,
)
from .param_parser import ExtractedParameter, ToleranceSpec
from .practice_extractor import ExtractedPractice
from .catalog_extractor import (
    CatalogExtractionResult,
    CuttingDataEntry,
    ToolSpecification,
)


# ---------------------------------------------------------------------------
# Deduplication helpers
# ---------------------------------------------------------------------------

def _entry_fingerprint(entry: KnowledgeEntry) -> str:
    """Generate a dedup fingerprint for a knowledge entry."""
    parts = [
        entry.knowledge_type.value,
        entry.category,
        entry.material,
        entry.material_grade,
        entry.operation,
        entry.tool_type,
        entry.unit,
    ]
    if entry.si_value is not None:
        parts.append(f"si:{entry.si_value:.4f}")
    if entry.min_value is not None:
        parts.append(f"min:{entry.min_value:.4f}")
    if entry.max_value is not None:
        parts.append(f"max:{entry.max_value:.4f}")
    if entry.title:
        parts.append(entry.title[:50])
    raw = "|".join(parts)
    return hashlib.md5(raw.encode()).hexdigest()[:12]


def _merge_entries(existing: KnowledgeEntry, new: KnowledgeEntry) -> KnowledgeEntry:
    """Merge a duplicate entry into an existing one, keeping higher confidence."""
    if new.confidence > existing.confidence:
        existing.confidence = new.confidence
        existing.source = new.source
    existing.merged_from.append(new.entry_id or _entry_fingerprint(new))
    if new.conditions:
        for c in new.conditions:
            if c not in existing.conditions:
                existing.conditions.append(c)
    return existing


# ---------------------------------------------------------------------------
# ID generation
# ---------------------------------------------------------------------------

_id_counter = 0


def _next_id(prefix: str = "KE") -> str:
    global _id_counter
    _id_counter += 1
    return f"{prefix}-{_id_counter:06d}"


def reset_id_counter() -> None:
    """Reset the ID counter (for testing)."""
    global _id_counter
    _id_counter = 0


# ---------------------------------------------------------------------------
# Mapper functions: Raw extractor output -> KnowledgeEntry
# ---------------------------------------------------------------------------

def map_parameter(
    param: ExtractedParameter,
    pdf_path: str = "",
    page_number: int = 0,
) -> KnowledgeEntry:
    """Map an ExtractedParameter to a KnowledgeEntry."""
    entry = KnowledgeEntry(
        entry_id=_next_id("KE-P"),
        knowledge_type=KnowledgeType.PARAMETER,
        category=param.param_type,
        title=f"{param.param_type} parameter",
        unit=param.value.si_unit if param.value else "",
        confidence=param.confidence,
        source=SourceProvenance(
            pdf_path=pdf_path,
            page_number=page_number,
            region_type="text",
            extraction_method=ExtractionMethod.TEXT_PARSE.value,
            source_text=param.source_text[:200] if param.source_text else "",
            confidence=param.confidence,
        ),
    )

    if param.value:
        entry.si_value = param.value.si_value if param.value.si_value else param.value.typical
        entry.min_value = param.value.min_value
        entry.max_value = param.value.max_value
        entry.value = {
            "typical": param.value.typical,
            "source_unit": param.value.source_unit if hasattr(param.value, "source_unit") else "",
        }

    if param.material_context:
        entry.material = param.material_context.name
        entry.material_grade = param.material_context.grade if param.material_context.grade else ""

    if param.tool_context:
        entry.tool_type = param.tool_context.tool_type

    return entry


def map_tolerance(
    tol: ToleranceSpec,
    pdf_path: str = "",
    page_number: int = 0,
) -> KnowledgeEntry:
    """Map a ToleranceSpec to a KnowledgeEntry."""
    value: dict = {}
    if tol.nominal is not None:
        value["nominal"] = tol.nominal
    if tol.plus is not None:
        value["plus"] = tol.plus
    if tol.minus is not None:
        value["minus"] = tol.minus
    if tol.fit_class:
        value["fit_class"] = tol.fit_class
    if tol.surface_finish:
        value["surface_finish"] = tol.surface_finish

    return KnowledgeEntry(
        entry_id=_next_id("KE-T"),
        knowledge_type=KnowledgeType.TOLERANCE,
        category="tolerance",
        title=f"Tolerance: {tol.raw_text[:50]}" if tol.raw_text else "Tolerance spec",
        value=value,
        si_value=tol.nominal,
        confidence=0.7,
        source=SourceProvenance(
            pdf_path=pdf_path,
            page_number=page_number,
            region_type="text",
            extraction_method=ExtractionMethod.TOLERANCE_PARSE.value,
            source_text=tol.raw_text[:200] if tol.raw_text else "",
            confidence=0.7,
        ),
    )


def map_practice(
    practice: ExtractedPractice,
    pdf_path: str = "",
    page_number: int = 0,
) -> KnowledgeEntry:
    """Map an ExtractedPractice to a KnowledgeEntry."""
    value: dict = {
        "category": practice.category.value,
        "steps": [s.to_dict() for s in practice.steps],
    }
    if practice.conditions:
        value["conditions"] = [c.to_dict() for c in practice.conditions]
    if practice.safety_warnings:
        value["safety_warnings"] = [w.to_dict() for w in practice.safety_warnings]

    constraints = []
    for w in practice.safety_warnings:
        if w.constraint_type:
            constraints.append({
                "type": w.constraint_type,
                "severity": w.severity,
                "value": w.value,
            })

    return KnowledgeEntry(
        entry_id=_next_id("KE-PR"),
        knowledge_type=KnowledgeType.PRACTICE,
        category=practice.category.value,
        title=practice.title,
        value=value,
        operation=practice.operation_type.value,
        conditions=[c.condition for c in practice.conditions],
        constraints=constraints,
        confidence=practice.confidence,
        source=SourceProvenance(
            pdf_path=pdf_path,
            page_number=page_number,
            region_type="text",
            extraction_method=ExtractionMethod.PRACTICE_PARSE.value,
            source_text=practice.source_text[:200] if practice.source_text else "",
            confidence=practice.confidence,
        ),
    )


def map_tool_spec(
    tool: ToolSpecification,
    manufacturer: str = "",
    pdf_path: str = "",
    page_number: int = 0,
) -> KnowledgeEntry:
    """Map a ToolSpecification to a KnowledgeEntry."""
    value: dict = {
        "part_number": tool.part_number,
        "iso_designation": tool.iso_designation,
        "grade": tool.grade,
        "coating": tool.coating,
        "geometry": tool.geometry,
        "application_range": tool.application_range,
    }

    return KnowledgeEntry(
        entry_id=_next_id("KE-TL"),
        knowledge_type=KnowledgeType.TOOL,
        category=tool.tool_type,
        title=tool.iso_designation or tool.part_number or "Tool",
        value=value,
        tool_type=tool.tool_type,
        confidence=tool.confidence,
        source=SourceProvenance(
            pdf_path=pdf_path,
            page_number=page_number,
            region_type="text",
            extraction_method=ExtractionMethod.CATALOG_PARSE.value,
            confidence=tool.confidence,
        ),
    )


def map_cutting_data(
    cd: CuttingDataEntry,
    manufacturer: str = "",
    pdf_path: str = "",
    page_number: int = 0,
) -> KnowledgeEntry:
    """Map a CuttingDataEntry to a KnowledgeEntry."""
    value: dict = cd.to_dict()

    entry = KnowledgeEntry(
        entry_id=_next_id("KE-CD"),
        knowledge_type=KnowledgeType.CUTTING_DATA,
        category="cutting_recommendation",
        title=f"Cutting data: {cd.workpiece_material}",
        value=value,
        material=cd.workpiece_material,
        operation=cd.operation,
        tool_type=cd.tool_grade,
        confidence=0.7,
        source=SourceProvenance(
            pdf_path=pdf_path,
            page_number=page_number,
            region_type="table",
            extraction_method=ExtractionMethod.CATALOG_PARSE.value,
            confidence=0.7,
        ),
    )

    if cd.speed_min is not None:
        entry.min_value = cd.speed_min
        entry.max_value = cd.speed_max
        entry.unit = cd.speed_unit

    return entry


def map_catalog_result(
    result: CatalogExtractionResult,
    pdf_path: str = "",
    page_number: int = 0,
) -> list[KnowledgeEntry]:
    """Map an entire CatalogExtractionResult to KnowledgeEntry list."""
    entries: list[KnowledgeEntry] = []
    for tool in result.tools:
        entries.append(map_tool_spec(tool, result.manufacturer, pdf_path, page_number))
    for cd in result.cutting_data:
        entries.append(map_cutting_data(cd, result.manufacturer, pdf_path, page_number))
    return entries


# ---------------------------------------------------------------------------
# SchemaMapper — orchestrates mapping + dedup + validation
# ---------------------------------------------------------------------------

@dataclass
class MappingResult:
    """Result of a schema mapping operation."""
    entries: list[KnowledgeEntry] = field(default_factory=list)
    duplicates_merged: int = 0
    validation_errors: list[str] = field(default_factory=list)
    rejected_count: int = 0

    def to_dict(self) -> dict:
        return {
            "entries_count": len(self.entries),
            "duplicates_merged": self.duplicates_merged,
            "validation_errors_count": len(self.validation_errors),
            "rejected_count": self.rejected_count,
        }


class SchemaMapper:
    """Maps raw extractor outputs to unified KnowledgeEntry objects.

    Handles:
    - Transformation from each extractor's output format
    - Deduplication across overlapping extractions
    - Schema validation of output entries
    - Provenance tracking back to source PDF/page/region
    """

    def __init__(self, pdf_path: str = "", validate: bool = True):
        self._pdf_path = pdf_path
        self._validate = validate

    def map_all(
        self,
        parameters: Optional[list[ExtractedParameter]] = None,
        tolerances: Optional[list[ToleranceSpec]] = None,
        practices: Optional[list[ExtractedPractice]] = None,
        catalog_result: Optional[CatalogExtractionResult] = None,
        page_number: int = 0,
    ) -> MappingResult:
        """Map all extractor outputs to KnowledgeEntry objects."""
        raw_entries: list[KnowledgeEntry] = []

        if parameters:
            for p in parameters:
                raw_entries.append(map_parameter(p, self._pdf_path, page_number))

        if tolerances:
            for t in tolerances:
                raw_entries.append(map_tolerance(t, self._pdf_path, page_number))

        if practices:
            for pr in practices:
                raw_entries.append(map_practice(pr, self._pdf_path, page_number))

        if catalog_result:
            raw_entries.extend(map_catalog_result(catalog_result, self._pdf_path, page_number))

        # Dedup
        deduped, merge_count = self._deduplicate(raw_entries)

        # Validate
        valid_entries: list[KnowledgeEntry] = []
        validation_errors: list[str] = []
        rejected = 0

        if self._validate:
            for entry in deduped:
                errors = validate_entry_dict(entry.to_dict())
                if errors:
                    validation_errors.extend(
                        f"[{entry.entry_id}] {e}" for e in errors
                    )
                    rejected += 1
                else:
                    valid_entries.append(entry)
        else:
            valid_entries = deduped

        return MappingResult(
            entries=valid_entries,
            duplicates_merged=merge_count,
            validation_errors=validation_errors,
            rejected_count=rejected,
        )

    def _deduplicate(
        self, entries: list[KnowledgeEntry]
    ) -> tuple[list[KnowledgeEntry], int]:
        """Deduplicate entries by fingerprint, merging duplicates."""
        seen: dict[str, KnowledgeEntry] = {}
        merge_count = 0

        for entry in entries:
            fp = _entry_fingerprint(entry)
            if fp in seen:
                _merge_entries(seen[fp], entry)
                merge_count += 1
            else:
                seen[fp] = entry

        return list(seen.values()), merge_count
