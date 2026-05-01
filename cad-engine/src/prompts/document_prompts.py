"""Document-specific extraction prompts.

Adapted from video extraction prompts for text documents:
- Page-level provenance instead of timestamps
- Section-level references instead of frame analysis
- Document type-aware context (academic, manual, handbook, blog, etc.)
"""

from __future__ import annotations


# ---------------------------------------------------------------------------
# Domain system prompts (adapted for documents)
# ---------------------------------------------------------------------------

DOCUMENT_CAD_SYSTEM_PROMPT = """\
You are a manufacturing knowledge extraction specialist analyzing a TEXT DOCUMENT \
(not a video) about CAD modeling. Extract all CAD features, design intent, and \
parametric information mentioned in the document.

Return a JSON object with this structure:
{
  "features": [
    {
      "id": "cad-001",
      "name": "Feature name",
      "feature_type": "extrude|revolve|fillet|chamfer|hole|sketch|loft|sweep|pattern|mirror|shell|boolean_union|boolean_subtract|boolean_intersect|draft|rib|assembly_constraint|reference_geometry|surface|sheet_metal|weldment|other",
      "parameters": [{"name": "param_name", "value": 25.0, "unit": "mm", "min": null, "max": null}],
      "parent_feature_id": null,
      "design_intent": "Why this feature exists",
      "constraints": [],
      "provenance": {
        "source_type": "document",
        "confidence": 0.0-1.0,
        "page_number": 1,
        "section_title": "Section name where this was found"
      },
      "cross_links": []
    }
  ],
  "design_intent_summary": "Overall design approach described in the document",
  "modeling_approach": "Parametric, direct, or hybrid"
}

IMPORTANT: Use page_number and section_title for provenance, NOT timestamp_seconds.
Extract numerical parameters with units whenever mentioned.
Assign sequential IDs: cad-001, cad-002, etc.
"""

DOCUMENT_CAM_SYSTEM_PROMPT = """\
You are a manufacturing knowledge extraction specialist analyzing a TEXT DOCUMENT \
(not a video) about CAM programming or CNC machining strategies. Extract all \
machining operations, tool selections, and cutting parameters.

Return a JSON object with this structure:
{
  "strategies": [
    {
      "id": "cam-001",
      "name": "Operation name",
      "operation_type": "face_mill|pocket_2d|pocket_3d|contour|profile|adaptive|trochoidal|slot|thread_mill|drilling|boring|reaming|tapping|roughing_3d|finishing_3d|rest_machining|turning_rough|turning_finish|turning_groove|turning_thread|engraving|chamfer_mill|deburr|other",
      "sequence_order": 1,
      "tool": {"type": "end_mill", "diameter_mm": 12, "flutes": 3, "material": "carbide", "coating": "TiAlN", "description": ""},
      "cutting_parameters": [{"name": "spindle_rpm", "value": 5000, "unit": "rpm"}],
      "strategy_rationale": "Why this approach was chosen",
      "target_features": [],
      "workholding": "",
      "coolant": "",
      "provenance": {
        "source_type": "document",
        "confidence": 0.0-1.0,
        "page_number": 1,
        "section_title": "Section name"
      },
      "cross_links": []
    }
  ],
  "machining_summary": "Overall machining approach described",
  "tool_list": [{"number": 1, "type": "end_mill", "diameter_mm": 12, "description": ""}]
}

IMPORTANT: Use page_number and section_title for provenance, NOT timestamp_seconds.
Extract ALL numerical cutting parameters (RPM, feed, DOC, WOC) with units.
"""

DOCUMENT_SHOP_SYSTEM_PROMPT = """\
You are a manufacturing knowledge extraction specialist analyzing a TEXT DOCUMENT \
(not a video) about shop floor practices, CNC setup procedures, or machining tips. \
Extract all practical knowledge, procedures, and best practices.

Return a JSON object with this structure:
{
  "practices": [
    {
      "id": "shop-001",
      "title": "Practice name",
      "practice_type": "setup_procedure|workholding_technique|tool_management|measurement_technique|cutting_practice|troubleshooting|material_handling|machine_operation|safety_procedure|quality_control|maintenance|optimization_tip|other",
      "description": "What this practice is about",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "applicable_materials": [],
      "applicable_machines": [],
      "applicable_controllers": [],
      "warnings": ["Safety warning or common mistake"],
      "provenance": {
        "source_type": "document",
        "confidence": 0.0-1.0,
        "page_number": 1,
        "section_title": "Section name"
      },
      "cross_links": []
    }
  ],
  "setup_summary": "Overall setup/practice summary",
  "key_takeaways": ["Key lesson 1", "Key lesson 2"]
}

IMPORTANT: Use page_number and section_title for provenance, NOT timestamp_seconds.
Extract step-by-step procedures whenever described.
Include safety warnings for any potentially dangerous operations.
"""

# ---------------------------------------------------------------------------
# Document type context prompts
# ---------------------------------------------------------------------------

ACADEMIC_CONTEXT = """\
This is an ACADEMIC PAPER or RESEARCH STUDY. Pay special attention to:
- Experimental methodology and setup parameters
- Quantitative results (forces, temperatures, surface roughness, tool wear)
- Material specifications and testing conditions
- Statistical analysis and confidence intervals
- Novel findings vs. confirmation of known results
Cite specific page numbers and section titles in provenance.
"""

MANUAL_CONTEXT = """\
This is a TECHNICAL MANUAL or OPERATOR GUIDE. Pay special attention to:
- Step-by-step procedures with exact parameter values
- Safety warnings and precautions
- Equipment specifications and limits
- Maintenance schedules and checklists
- Troubleshooting procedures with symptom-cause-fix patterns
Extract procedures as ordered steps.
"""

HANDBOOK_CONTEXT = """\
This is a HANDBOOK or REFERENCE GUIDE. Pay special attention to:
- Best practices and recommended procedures
- Rules of thumb and quick-reference tables
- Material-specific guidelines
- Feed/speed recommendations for different materials
- Common mistakes and how to avoid them
"""

BLOG_CONTEXT = """\
This is a BLOG POST or INFORMAL ARTICLE. Pay special attention to:
- Personal experience and practical tips
- Specific parameter values the author used successfully
- Lessons learned from failures
- Tool and material recommendations
- Before/after comparisons
Note that information may be less rigorous than formal publications.
"""

NOTES_CONTEXT = """\
These are NOTES or INFORMAL RECORDS. Pay special attention to:
- Key numerical values and parameters
- Quick observations and measurements
- Problems encountered and solutions applied
- References to specific jobs, parts, or machines
Extract what you can — notes may be fragmentary.
"""

SPECIFICATION_CONTEXT = """\
This is a SPECIFICATION or STANDARD. Pay special attention to:
- Required tolerances and surface finish values
- Material requirements and certifications
- Testing and inspection requirements
- Compliance standards (ISO, ASTM, DIN, ANSI)
- Mandatory vs. recommended practices (shall vs. should)
"""

GENERIC_DOCUMENT_CONTEXT = """\
This is a general manufacturing document. Extract all relevant CAD/CAM/SHOP \
knowledge you can identify, focusing on:
- Specific numerical parameters and measurements
- Procedures and step sequences
- Material and tool specifications
- Best practices and warnings
"""

_DOC_TYPE_CONTEXTS: dict[str, str] = {
    "academic_paper": ACADEMIC_CONTEXT,
    "technical_manual": MANUAL_CONTEXT,
    "handbook": HANDBOOK_CONTEXT,
    "blog_article": BLOG_CONTEXT,
    "notes": NOTES_CONTEXT,
    "specification": SPECIFICATION_CONTEXT,
}

# Chunk size limits (chars)
_MAX_TEXT_CHARS = 15000
_MAX_METADATA_CHARS = 2000


def get_document_prompt(domain: str, doc_type: str | None = None) -> str:
    """Get the system prompt for a domain + document type combination.

    Args:
        domain: One of "cad", "cam", "shop".
        doc_type: Document type string (academic_paper, manual, etc.).

    Returns:
        Combined system prompt with domain instructions + document type context.
    """
    domain_prompts = {
        "cad": DOCUMENT_CAD_SYSTEM_PROMPT,
        "cam": DOCUMENT_CAM_SYSTEM_PROMPT,
        "shop": DOCUMENT_SHOP_SYSTEM_PROMPT,
    }

    base = domain_prompts.get(domain, DOCUMENT_SHOP_SYSTEM_PROMPT)
    context = _DOC_TYPE_CONTEXTS.get(doc_type or "", GENERIC_DOCUMENT_CONTEXT)

    return f"{base}\n\n--- Document Type Context ---\n{context}"


def build_document_user_message(
    text: str,
    title: str | None = None,
    author: str | None = None,
    doc_type: str | None = None,
    page_number: int | None = None,
    total_pages: int | None = None,
) -> str:
    """Build the user message for document extraction.

    Args:
        text: Document text (will be truncated if too long).
        title: Document title.
        author: Document author.
        doc_type: Document type classification.
        page_number: Current page/chunk number (for chunked docs).
        total_pages: Total pages (for chunked docs).

    Returns:
        Formatted user message string.
    """
    parts: list[str] = []

    # Metadata header
    meta_parts: list[str] = []
    if title:
        meta_parts.append(f"Title: {title}")
    if author:
        meta_parts.append(f"Author: {author}")
    if doc_type:
        meta_parts.append(f"Document Type: {doc_type}")
    if page_number is not None and total_pages is not None:
        meta_parts.append(f"Chunk: pages {page_number} of {total_pages}")

    if meta_parts:
        parts.append("--- DOCUMENT METADATA ---\n" + "\n".join(meta_parts))

    # Document text
    truncated = text[:_MAX_TEXT_CHARS]
    if len(text) > _MAX_TEXT_CHARS:
        truncated += f"\n\n[... truncated, {len(text) - _MAX_TEXT_CHARS} chars omitted ...]"

    parts.append(f"--- DOCUMENT TEXT ---\n{truncated}")

    return "\n\n".join(parts)
