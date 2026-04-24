"""Document extraction wrapper for the prism_doc_learn dispatcher.

Reads PDFs with pypdf, chunks text into ~15-page slices, sends each chunk to
Claude for structured tribal-tip + formula + parameter-table extraction, then
merges and dedupes by normalized title.

Output schema matches what `documentLearningDispatcher.handleDocExtract`
expects from `result.to_dict()`:

    {
      "document_id": str,
      "knowledge": {
        "tips":               [{title, body, category, tags, confidence,
                                material_groups?, operation_types?, page_ref?}],
        "formulas":           [{name, expression, variables, page_ref?}],
        "parameter_tables":   [{context, rows, page_ref?}],
        "extraction_stats":   {...}
      },
      "is_valid":           bool,
      "validation_results": {...},
      "errors":             [str]
    }

The dispatcher then writes `knowledge` to disk and feeds `knowledge.tips`
into `TribalKnowledgeEngine.ingest()`.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import urllib.request
import urllib.error

import pypdf

try:
    import anthropic  # optional — only needed for backend=anthropic
except ImportError:
    anthropic = None  # type: ignore


# ---------------------------------------------------------------------------
# Env loading (no python-dotenv dependency)
# ---------------------------------------------------------------------------

def _load_env_file(path: str = "H:/prism/mcp-server/.env") -> None:
    p = Path(path)
    if not p.exists():
        return
    for raw in p.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.strip().strip('"').strip("'")
        os.environ.setdefault(k.strip(), v)


_load_env_file()


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

# Backend: "ollama" (default — free local) or "anthropic" (paid API)
_BACKEND = os.environ.get("PRISM_DOCEXTRACT_BACKEND", "ollama").lower()

# Anthropic config
_ANTHROPIC_MODEL = os.environ.get("PRISM_DOCEXTRACT_MODEL", "claude-sonnet-4-20250514")

# Ollama config
_OLLAMA_HOST = os.environ.get("PRISM_OLLAMA_HOST", "http://localhost:11434")
_OLLAMA_MODEL = os.environ.get("PRISM_DOCEXTRACT_OLLAMA_MODEL", "qwen2.5-coder:14b")
_OLLAMA_TIMEOUT = int(os.environ.get("PRISM_OLLAMA_TIMEOUT", "180"))

# Chunking
_MAX_PAGES_PER_CHUNK = int(os.environ.get("PRISM_DOCEXTRACT_PAGES_PER_CHUNK", "15"))
_MAX_CHARS_PER_CHUNK = int(os.environ.get("PRISM_DOCEXTRACT_CHARS_PER_CHUNK", "20000"))
_MAX_OUTPUT_TOKENS = int(os.environ.get("PRISM_DOCEXTRACT_MAX_OUTPUT", "4096"))


# ---------------------------------------------------------------------------
# Result type — must expose .to_dict() per dispatcher contract
# ---------------------------------------------------------------------------

@dataclass
class ExtractionResult:
    document_id: str
    knowledge: dict
    is_valid: bool = True
    validation_results: dict = field(default_factory=dict)
    errors: list = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "document_id": self.document_id,
            "knowledge": self.knowledge,
            "is_valid": self.is_valid,
            "validation_results": self.validation_results,
            "errors": self.errors,
        }


# ---------------------------------------------------------------------------
# PDF reading + chunking
# ---------------------------------------------------------------------------

def _read_pdf_pages(file_path: str) -> list:
    reader = pypdf.PdfReader(file_path)
    pages = []
    for i, page in enumerate(reader.pages):
        try:
            pages.append(page.extract_text() or "")
        except Exception as e:
            pages.append(f"[PAGE {i + 1} EXTRACT ERROR: {e}]")
    return pages


def _chunk_pages(pages: list) -> list:
    """Group pages into chunks bounded by both page count and char count.

    Returns list of tuples ``(start_page_1idx, end_page_1idx, joined_text)``.
    """
    chunks = []
    cur_start = 1
    cur_text: list = []
    cur_chars = 0
    page_count_in_chunk = 0

    for i, text in enumerate(pages, start=1):
        too_many_pages = page_count_in_chunk >= _MAX_PAGES_PER_CHUNK
        too_many_chars = cur_chars + len(text) > _MAX_CHARS_PER_CHUNK
        if (too_many_pages or too_many_chars) and cur_text:
            chunks.append((cur_start, i - 1, "\n\n".join(cur_text)))
            cur_start = i
            cur_text = []
            cur_chars = 0
            page_count_in_chunk = 0
        cur_text.append(f"[PAGE {i}]\n{text}")
        cur_chars += len(text)
        page_count_in_chunk += 1

    if cur_text:
        chunks.append((cur_start, len(pages), "\n\n".join(cur_text)))
    return chunks


# ---------------------------------------------------------------------------
# Claude extraction prompt
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """You extract manufacturing knowledge from CAM/CAD/shop documents into structured JSON.

Be EXTRACTIVE and GENEROUS — capture everything actionable. A real CAM manual chunk should yield 5-15 tips. If you return empty arrays for content-rich chunks, you have failed.

Output STRICT JSON ONLY (no markdown fences, no prose). Schema:
{
  "tips": [
    {
      "title": "short imperative summary of the rule, parameter, or procedure",
      "body": "concrete detail with values, units, ranges, conditions",
      "category": "speeds_feeds | toolpath | workholding | safety | tool_selection | strategy | post_processor | machine_setup | troubleshooting | dfm | feature | gcode | other",
      "tags": ["tag1", "tag2"],
      "confidence": 50-95,
      "material_groups": ["P", "M", "K", "N", "S", "H"],
      "operation_types": ["roughing", "finishing", "drilling", "pocketing", "contouring", "chamfering", "5axis", "etc"],
      "page_ref": "p.X"
    }
  ],
  "formulas": [
    {"name": "Force model name", "expression": "Fc = kc * h * b", "variables": {"Fc": "cutting force [N]"}, "page_ref": "p.X"}
  ],
  "parameter_tables": [
    {"context": "what the table describes", "rows": [{"col": "value"}], "page_ref": "p.X"}
  ]
}

What to EXTRACT (be liberal):
- Operation parameters (depth of cut, stepover, feed, speed)
- Toolpath strategy descriptions ("Pocket Milling: machines perpendicular pocket walls...")
- Default values and recommended ranges
- Feature definitions (what does "Contour Milling" do? when to use it?)
- Approach/retract strategies, plunge methods, link types
- Workholding setup steps, fixture rules
- G-code patterns, post-processor behaviors
- Safety limits, alarms, error conditions
- Material-specific guidance
- Tool selection guidance
- DFM rules

What to OMIT:
- Pure UI/click instructions ("press OK", "right-click menu")
- Pure boilerplate (copyright, table of contents headers, page numbers)
- Marketing fluff

Confidence:
- 85-95: explicit value or rule with citation
- 70-84: explicit description without formal citation
- 50-69: procedural / inferred from context

Use null for material_groups/operation_types only if truly inapplicable.
Empty arrays only if the chunk is genuinely free of manufacturing content.

Return JSON only. No commentary.
"""


def _strip_fences(raw: str) -> str:
    s = raw.strip()
    if s.startswith("```"):
        # remove opening fence (with optional language tag) and trailing fence
        first_nl = s.find("\n")
        if first_nl != -1:
            s = s[first_nl + 1 :]
        if s.endswith("```"):
            s = s[: -3]
        s = s.strip()
    return s


def _build_user_msg(chunk_text: str, doc_title: str, page_range: tuple) -> str:
    return (
        f"Document: {doc_title}\n"
        f"Pages {page_range[0]}-{page_range[1]} of source PDF.\n\n"
        f"CONTENT:\n---\n{chunk_text}\n---\n\nExtract per the schema. Return JSON only."
    )


def _call_anthropic(client, chunk_text: str, doc_title: str, page_range: tuple) -> dict:
    user_msg = _build_user_msg(chunk_text, doc_title, page_range)
    resp = client.messages.create(
        model=_ANTHROPIC_MODEL,
        max_tokens=_MAX_OUTPUT_TOKENS,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )
    raw = resp.content[0].text if resp.content else ""
    cleaned = _strip_fences(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        return {"_parse_error": str(e), "_raw": cleaned[:500]}


def _call_ollama(chunk_text: str, doc_title: str, page_range: tuple) -> dict:
    user_msg = _build_user_msg(chunk_text, doc_title, page_range)
    body = json.dumps({
        "model": _OLLAMA_MODEL,
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_predict": _MAX_OUTPUT_TOKENS,
            "num_ctx": 16384,
        },
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{_OLLAMA_HOST}/api/chat",
        data=body,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=_OLLAMA_TIMEOUT) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        return {"_parse_error": f"ollama HTTP error: {e}", "_raw": ""}
    raw = (payload.get("message") or {}).get("content", "") or ""
    cleaned = _strip_fences(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        return {"_parse_error": str(e), "_raw": cleaned[:500]}


def _call_backend(backend: str, anthropic_client, chunk_text: str, doc_title: str, page_range: tuple) -> dict:
    if backend == "ollama":
        return _call_ollama(chunk_text, doc_title, page_range)
    if backend == "anthropic":
        if anthropic_client is None:
            return {"_parse_error": "anthropic backend selected but anthropic SDK not installed or no API key", "_raw": ""}
        return _call_anthropic(anthropic_client, chunk_text, doc_title, page_range)
    return {"_parse_error": f"unknown backend: {backend}", "_raw": ""}


# ---------------------------------------------------------------------------
# Main entrypoint expected by documentLearningDispatcher
# ---------------------------------------------------------------------------

def extract_from_document(
    file_path: str,
    title: Optional[str] = None,
    force_domain: Optional[str] = None,
    document_id: str = "unknown",
) -> ExtractionResult:
    """Run full PDF extraction. Returns an ExtractionResult."""
    backend = _BACKEND
    anthropic_client = None
    if backend == "anthropic":
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            return ExtractionResult(
                document_id=document_id,
                knowledge={"tips": [], "formulas": [], "parameter_tables": []},
                is_valid=False,
                errors=["ANTHROPIC_API_KEY not set in environment (backend=anthropic)"],
            )
        if anthropic is None:
            return ExtractionResult(
                document_id=document_id,
                knowledge={"tips": [], "formulas": [], "parameter_tables": []},
                is_valid=False,
                errors=["anthropic SDK not installed (backend=anthropic)"],
            )
        anthropic_client = anthropic.Anthropic(api_key=api_key)

    doc_title = title or Path(file_path).stem

    # 1. Read PDF
    try:
        pages = _read_pdf_pages(file_path)
    except Exception as e:
        return ExtractionResult(
            document_id=document_id,
            knowledge={"tips": [], "formulas": [], "parameter_tables": []},
            is_valid=False,
            errors=[f"PDF read failed: {e}"],
        )

    if not pages:
        return ExtractionResult(
            document_id=document_id,
            knowledge={"tips": [], "formulas": [], "parameter_tables": []},
            is_valid=False,
            errors=["PDF has 0 pages"],
        )

    # 2. Chunk
    chunks = _chunk_pages(pages)

    # 3. Extract per chunk
    all_tips = []
    all_formulas = []
    all_tables = []
    chunk_errors = []

    for chunk_idx, (start, end, text) in enumerate(chunks, start=1):
        if not text.strip():
            continue
        try:
            result = _call_backend(backend, anthropic_client, text, doc_title, (start, end))
        except Exception as e:
            chunk_errors.append(f"chunk {chunk_idx} (p.{start}-{end}): {e}")
            continue
        if "_parse_error" in result:
            chunk_errors.append(f"chunk {chunk_idx} (p.{start}-{end}): JSON parse failed")
            continue
        for tip in result.get("tips", []):
            if not isinstance(tip, dict):
                continue
            tip.setdefault("page_ref", f"p.{start}-{end}")
            tip["_chunk"] = chunk_idx
            all_tips.append(tip)
        for formula in result.get("formulas", []):
            if not isinstance(formula, dict):
                continue
            formula.setdefault("page_ref", f"p.{start}-{end}")
            all_formulas.append(formula)
        for table in result.get("parameter_tables", []):
            if not isinstance(table, dict):
                continue
            table.setdefault("page_ref", f"p.{start}-{end}")
            all_tables.append(table)

    # 4. Dedupe tips by normalized title
    seen_titles = set()
    unique_tips = []
    for tip in all_tips:
        title_norm = (tip.get("title") or "").strip().lower()
        if title_norm and title_norm not in seen_titles:
            seen_titles.add(title_norm)
            unique_tips.append(tip)

    knowledge = {
        "tips": unique_tips,
        "formulas": all_formulas,
        "parameter_tables": all_tables,
        "extraction_stats": {
            "source_pdf": file_path,
            "title": doc_title,
            "force_domain": force_domain,
            "backend": backend,
            "model": _OLLAMA_MODEL if backend == "ollama" else _ANTHROPIC_MODEL,
            "page_count": len(pages),
            "chunk_count": len(chunks),
            "tips_total": len(all_tips),
            "tips_unique": len(unique_tips),
            "formulas_total": len(all_formulas),
            "tables_total": len(all_tables),
            "chunk_errors": len(chunk_errors),
        },
    }

    return ExtractionResult(
        document_id=document_id,
        knowledge=knowledge,
        is_valid=len(unique_tips) > 0 or len(all_formulas) > 0,
        validation_results={
            "chunks_processed": len(chunks),
            "chunks_failed": len(chunk_errors),
            "domain_forced": force_domain,
        },
        errors=chunk_errors,
    )


# ---------------------------------------------------------------------------
# CLI smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("usage: python -m src.document_extract <pdf_path> [doc_id]", file=sys.stderr)
        sys.exit(2)
    fp = sys.argv[1]
    did = sys.argv[2] if len(sys.argv) > 2 else "smoke-test"
    res = extract_from_document(file_path=fp, title=Path(fp).stem, document_id=did)
    print(json.dumps(res.to_dict(), indent=2))
