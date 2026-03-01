"""Document Knowledge Extraction Orchestrator — CC-EXT-MS0.

Coordinates extraction from text documents (PDFs, markdown, notes, articles):
  1. Ingest document text
  2. Classify document type
  3. Detect manufacturing domain
  4. Chunk large documents
  5. Extract per-domain knowledge using document-specific prompts
  6. Deduplicate across chunks
  7. Validate, cross-link, and store

Reuses validators and cross-linking from knowledge_extract.py.
Output conforms to knowledge_schema_v2.json.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .document_ingest import ingest_document, DocumentIngestResult
from .document_classify import classify_document, DocumentType
from .domain_classify import classify, Domain
from .knowledge_extract import (
    ExtractionError,
    ExtractionResult,
    _call_extraction,
    _build_cross_links,
    _compute_stats,
    _VALID_DOMAINS,
)
from .prompts.document_prompts import get_document_prompt, build_document_user_message
from .validators.cad_validator import validate_cad_extraction
from .validators.cam_validator import validate_cam_extraction
from .validators.shop_validator import validate_shop_extraction


# Chunk settings
_MAX_PAGES_PER_CHUNK = 15
_OVERLAP_PAGES = 1


@dataclass
class DocumentChunk:
    """A chunk of a document for extraction."""
    text: str
    start_page: int
    end_page: int
    chunk_index: int


def _chunk_document(result: DocumentIngestResult) -> list[DocumentChunk]:
    """Split a document into overlapping chunks for extraction.

    Small documents (<=_MAX_PAGES_PER_CHUNK pages) return a single chunk.
    Large documents are split by page boundaries with overlap.
    """
    if len(result.pages) <= _MAX_PAGES_PER_CHUNK:
        return [DocumentChunk(
            text=result.text,
            start_page=1,
            end_page=len(result.pages) or 1,
            chunk_index=0,
        )]

    chunks: list[DocumentChunk] = []
    pages = result.pages
    i = 0
    chunk_idx = 0

    while i < len(pages):
        end = min(i + _MAX_PAGES_PER_CHUNK, len(pages))
        chunk_pages = pages[i:end]
        chunk_text = "\n\n".join(p.text for p in chunk_pages)

        chunks.append(DocumentChunk(
            text=chunk_text,
            start_page=chunk_pages[0].page_number,
            end_page=chunk_pages[-1].page_number,
            chunk_index=chunk_idx,
        ))

        # Advance with overlap
        i = end - _OVERLAP_PAGES if end < len(pages) else end
        chunk_idx += 1

    return chunks


def _extract_domain_from_chunk(
    domain: str,
    chunk: DocumentChunk,
    doc_type: str | None,
    title: str | None,
    author: str | None,
) -> dict:
    """Extract knowledge from a single chunk for a single domain."""
    system_prompt = get_document_prompt(domain, doc_type)
    user_message = build_document_user_message(
        text=chunk.text,
        title=title,
        author=author,
        doc_type=doc_type,
        page_number=chunk.start_page,
        total_pages=chunk.end_page,
    )

    raw = _call_extraction(system_prompt, user_message)

    if domain == "cad":
        return {
            "features": raw.get("features", []),
            "design_intent_summary": raw.get("design_intent_summary"),
            "modeling_approach": raw.get("modeling_approach"),
        }
    elif domain == "cam":
        return {
            "strategies": raw.get("strategies", []),
            "machining_summary": raw.get("machining_summary"),
            "tool_list": raw.get("tool_list", []),
        }
    else:  # shop
        return {
            "practices": raw.get("practices", []),
            "setup_summary": raw.get("setup_summary"),
            "key_takeaways": raw.get("key_takeaways", []),
        }


def _merge_domain_results(domain: str, results: list[dict]) -> dict:
    """Merge extraction results from multiple chunks, deduplicating by ID.

    Items with the same ID across chunks are kept from the first occurrence.
    """
    if not results:
        return {}

    if domain == "cad":
        items_key = "features"
    elif domain == "cam":
        items_key = "strategies"
    else:
        items_key = "practices"

    seen_ids: set[str] = set()
    merged_items: list[dict] = []

    for result in results:
        for item in result.get(items_key, []):
            item_id = item.get("id", "")
            if item_id and item_id in seen_ids:
                continue
            if item_id:
                seen_ids.add(item_id)
            merged_items.append(item)

    # Take summary from last chunk (most comprehensive)
    merged = {items_key: merged_items}

    if domain == "cad":
        merged["design_intent_summary"] = next(
            (r.get("design_intent_summary") for r in reversed(results) if r.get("design_intent_summary")),
            None,
        )
        merged["modeling_approach"] = next(
            (r.get("modeling_approach") for r in reversed(results) if r.get("modeling_approach")),
            None,
        )
    elif domain == "cam":
        merged["machining_summary"] = next(
            (r.get("machining_summary") for r in reversed(results) if r.get("machining_summary")),
            None,
        )
        # Merge tool lists, dedup by number
        seen_tools: set[int] = set()
        merged_tools: list[dict] = []
        for r in results:
            for tool in r.get("tool_list", []):
                tn = tool.get("number", 0)
                if tn not in seen_tools:
                    seen_tools.add(tn)
                    merged_tools.append(tool)
        merged["tool_list"] = merged_tools
    else:
        merged["setup_summary"] = next(
            (r.get("setup_summary") for r in reversed(results) if r.get("setup_summary")),
            None,
        )
        # Merge key takeaways, dedup by text
        seen_takeaways: set[str] = set()
        merged_takeaways: list[str] = []
        for r in results:
            for t in r.get("key_takeaways", []):
                if t not in seen_takeaways:
                    seen_takeaways.add(t)
                    merged_takeaways.append(t)
        merged["key_takeaways"] = merged_takeaways

    return merged


def extract_from_document(
    file_path: str | Path,
    title: str | None = None,
    force_domain: str | None = None,
    format_override: str | None = None,
    document_id: str | None = None,
) -> ExtractionResult:
    """Run the full knowledge extraction pipeline for a document.

    Args:
        file_path: Path to the document file.
        title: Document title override (auto-detected if not provided).
        force_domain: Override domain classification (cad/cam/shop/multi).
        format_override: Force document format (pdf/markdown/text/html).
        document_id: Custom document ID (defaults to filename stem).

    Returns:
        ExtractionResult with the complete knowledge document.
    """
    errors: list[str] = []
    path = Path(file_path)

    # Generate document ID
    doc_id = document_id or path.stem

    # Step 1: Ingest document
    ingest_result = ingest_document(path, format_override=format_override)
    if not ingest_result.is_valid:
        return ExtractionResult(
            video_id=doc_id,
            knowledge={},
            errors=ingest_result.errors,
        )

    # Use ingested metadata
    doc_title = title or ingest_result.metadata.title or path.stem
    doc_author = ingest_result.metadata.author

    # Step 2: Classify document type
    classification = classify_document(
        text=ingest_result.text,
        title=doc_title,
        has_doi=ingest_result.metadata.doi is not None,
        page_count=ingest_result.metadata.page_count,
    )
    doc_type = classification.doc_type.value

    # Step 3: Domain classification
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
        domain_result = classify(
            title=doc_title,
            transcript=ingest_result.text[:5000],
            ocr_text="",
            vision_text="",
        )
        primary_domain = domain_result.primary_domain
        domain_confidence = domain_result.confidence
        secondary_domain = domain_result.secondary_domain

    # Step 4: Determine domains to extract
    domains_to_extract: list[str] = []
    if primary_domain in ("cad", "multi"):
        domains_to_extract.append("cad")
    if primary_domain in ("cam", "multi"):
        domains_to_extract.append("cam")
    if primary_domain in ("shop", "multi"):
        domains_to_extract.append("shop")
    if secondary_domain and secondary_domain not in domains_to_extract:
        domains_to_extract.append(secondary_domain)
    if not domains_to_extract:
        domains_to_extract = ["cad", "cam", "shop"]

    # Step 5: Chunk document
    chunks = _chunk_document(ingest_result)

    # Step 6: Extract per domain, per chunk
    domains: dict = {}
    for domain in domains_to_extract:
        chunk_results: list[dict] = []
        for chunk in chunks:
            try:
                result = _extract_domain_from_chunk(
                    domain, chunk, doc_type, doc_title, doc_author
                )
                chunk_results.append(result)
            except ExtractionError as e:
                errors.append(f"{domain} extraction failed (chunk {chunk.chunk_index}): {e}")

        if chunk_results:
            domains[domain] = _merge_domain_results(domain, chunk_results)

    # Step 7: Validate
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

    # Step 8: Cross-domain linking
    cross_links = _build_cross_links(domains)

    # Step 9: Stats
    stats = _compute_stats(domains, cross_links)

    # Step 10: Build knowledge document
    knowledge: dict = {
        "schema_version": "2.0.0",
        "video_id": doc_id,
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "metadata": {
            "title": doc_title,
            "description": None,
            "primary_domain": primary_domain,
            "secondary_domain": secondary_domain,
            "domain_confidence": round(domain_confidence, 3),
            "platform": None,
            "platform_version": None,
            "controller": None,
            "material": None,
            "duration_seconds": None,
            "uploader": doc_author,
            "tags": [],
            "source_type": "document",
            "document_metadata": {
                "author": doc_author,
                "publication_title": doc_title,
                "publication_date": ingest_result.metadata.publication_date,
                "doi": ingest_result.metadata.doi,
                "page_count": ingest_result.metadata.page_count,
                "format": ingest_result.metadata.format,
                "url": ingest_result.metadata.url,
                "doc_type": doc_type,
            },
        },
        "domains": domains,
        "cross_domain_links": cross_links,
        "extraction_stats": stats,
    }

    return ExtractionResult(
        video_id=doc_id,
        knowledge=knowledge,
        validation_results=validation_results,
        errors=errors,
    )
