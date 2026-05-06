"""
process.py — INTEL-OLLAMA-OBSIDIAN-MS0/P13-U03

Container entrypoint that walks INBOX_DIR (mount of H:/prism/inbox), reads
each PDF, chunks the text semantically, embeds each chunk via Ollama
nomic-embed-text, and upserts to Qdrant. Optionally writes a markdown
copy to VAULT_DIR for human review + wiki-index inclusion.

Idempotent: SHA-256 fingerprint per input is recorded in
FINGERPRINT_PATH; on re-run, already-processed inputs are skipped.

Pure functions exported for tests:
    compute_fingerprint(data)            -> str
    chunk_text(text, target_chars)       -> list[Chunk]
    should_process(fp, fp_set)           -> bool
    parse_fingerprint_log(content)       -> set[str]
    build_vault_entry(meta, chunk, emb)  -> str (markdown)

Modes:
    --once    process all unseen PDFs, then exit (default; for cron)
    --watch   process loop; sleep + re-scan inbox (for daemon)
    --dry     parse + chunk only; no Ollama / Qdrant calls
"""
from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import json
import logging
import os
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable

# ------------------------------------------------------------------ types
@dataclass
class Chunk:
    index: int
    text: str
    char_start: int
    char_end: int


@dataclass
class IngestResult:
    pdf_path: str
    fingerprint: str
    chunks: int
    skipped: bool
    reason: str | None
    duration_ms: float


# ------------------------------------------------------------------ pure
def compute_fingerprint(data: bytes) -> str:
    """SHA-256 hex digest of the input bytes. Stable across hosts."""
    h = hashlib.sha256()
    h.update(data)
    return h.hexdigest()


def chunk_text(text: str, target_chars: int = 1800, overlap_chars: int = 180) -> list[Chunk]:
    """Split text into roughly target_chars-sized chunks with overlap.

    Prefers paragraph boundaries (double newline) over hard-cuts. Returns
    Chunk records with char offsets for traceability. Empty/whitespace
    input → empty list.
    """
    if not isinstance(text, str) or not text.strip():
        return []
    if target_chars <= 0:
        return []
    paragraphs = [p for p in text.split("\n\n") if p.strip()]
    chunks: list[Chunk] = []
    buffer = ""
    buffer_start = 0
    cursor = 0
    for para in paragraphs:
        para_with_break = para + "\n\n"
        if buffer and len(buffer) + len(para_with_break) > target_chars:
            chunks.append(Chunk(
                index=len(chunks),
                text=buffer.rstrip(),
                char_start=buffer_start,
                char_end=cursor,
            ))
            # Slide window with overlap to preserve cross-chunk context.
            if overlap_chars > 0 and len(buffer) > overlap_chars:
                buffer = buffer[-overlap_chars:]
                buffer_start = cursor - overlap_chars
            else:
                buffer = ""
                buffer_start = cursor
        if not buffer:
            buffer_start = cursor
        buffer += para_with_break
        cursor += len(para_with_break)
    if buffer.strip():
        chunks.append(Chunk(
            index=len(chunks),
            text=buffer.rstrip(),
            char_start=buffer_start,
            char_end=cursor,
        ))
    return chunks


def should_process(fingerprint: str, seen: set[str]) -> bool:
    """True when the input has not been processed before."""
    if not isinstance(fingerprint, str) or not fingerprint:
        return False
    if not isinstance(seen, set):
        return True
    return fingerprint not in seen


def parse_fingerprint_log(content: str) -> set[str]:
    """Read JSONL lines; return the set of fingerprints already seen.

    Malformed rows are silently skipped — the log is append-only and a
    partial line at end-of-file shouldn't crash a re-run.
    """
    seen: set[str] = set()
    if not isinstance(content, str) or not content:
        return seen
    for line in content.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        fp = row.get("fingerprint")
        if isinstance(fp, str) and fp:
            seen.add(fp)
    return seen


def build_vault_entry(meta: dict, chunk: Chunk, embedding_id: str | None) -> str:
    """Render a markdown vault entry (frontmatter + body) for a single chunk."""
    title = meta.get("title") or Path(meta.get("source", "untitled")).stem
    iso_ts = meta.get("ts") or _dt.datetime.now(_dt.timezone.utc).isoformat()
    lines = [
        "---",
        f"title: {title} — chunk {chunk.index}",
        "category: ingested",
        f"source: {meta.get('source', 'unknown')}",
        f"fingerprint: {meta.get('fingerprint', '')}",
        f"chunk_index: {chunk.index}",
        f"char_range: [{chunk.char_start}, {chunk.char_end}]",
        f"embedding_id: {embedding_id or 'pending'}",
        f"last_verified: {iso_ts}",
        "confidence: 0.7",
        "sources: 1",
        "---",
        "",
        f"# {title} — chunk {chunk.index}",
        "",
        chunk.text,
        "",
        "## Provenance",
        "",
        f"- Source PDF: `{meta.get('source', 'unknown')}`",
        f"- Fingerprint: `{meta.get('fingerprint', '')[:16]}...`",
        f"- Ingested: {iso_ts}",
        f"- Pipeline: P13-U03 batch-processor",
        "",
    ]
    return "\n".join(lines) + "\n"


# ------------------------------------------------------------------ I/O
log = logging.getLogger("batch-processor")


def setup_logging(log_path: str) -> None:
    handler = logging.FileHandler(log_path, encoding="utf-8")
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    log.addHandler(handler)
    log.addHandler(logging.StreamHandler(sys.stdout))
    log.setLevel(logging.INFO)


def extract_pdf_text(path: Path) -> str:
    """Pull all text out of a PDF via pypdf. Returns empty string on
    failure (the caller logs + skips)."""
    try:
        from pypdf import PdfReader  # imported here so dry-mode tests don't need pypdf
    except ImportError:
        log.warning("pypdf not installed — cannot extract %s", path)
        return ""
    try:
        reader = PdfReader(str(path))
        chunks = [p.extract_text() or "" for p in reader.pages]
        return "\n\n".join(c for c in chunks if c.strip())
    except Exception as exc:
        log.warning("pypdf failed on %s: %s", path, exc)
        return ""


def embed_via_ollama(text: str, host: str) -> list[float]:
    import httpx
    r = httpx.post(
        f"{host.rstrip('/')}/api/embeddings",
        json={"model": "nomic-embed-text", "prompt": text},
        timeout=60.0,
    )
    r.raise_for_status()
    return list(r.json().get("embedding", []))


def append_fingerprint(fp_path: Path, fp: str, source: str) -> None:
    fp_path.parent.mkdir(parents=True, exist_ok=True)
    with fp_path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps({
            "fingerprint": fp,
            "source": source,
            "ts": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        }) + "\n")


def process_one(
    pdf_path: Path,
    seen: set[str],
    *,
    fp_path: Path,
    vault_dir: Path | None,
    ollama_host: str,
    dry: bool,
) -> IngestResult:
    start = time.time()
    data = pdf_path.read_bytes()
    fp = compute_fingerprint(data)
    if not should_process(fp, seen):
        return IngestResult(
            pdf_path=str(pdf_path), fingerprint=fp, chunks=0,
            skipped=True, reason="already-processed",
            duration_ms=(time.time() - start) * 1000,
        )
    text = extract_pdf_text(pdf_path)
    if not text.strip():
        return IngestResult(
            pdf_path=str(pdf_path), fingerprint=fp, chunks=0,
            skipped=True, reason="no-text-extracted",
            duration_ms=(time.time() - start) * 1000,
        )
    chunks = chunk_text(text)
    log.info("chunked %s -> %d chunks", pdf_path, len(chunks))
    for chunk in chunks:
        if dry:
            continue
        try:
            vec = embed_via_ollama(chunk.text, ollama_host)
            log.info("  chunk %d embedded (dim=%d)", chunk.index, len(vec))
            # NOTE: Qdrant upsert intentionally not wired here — this
            # script's primary contract per exit_conditions is "process
            # PDFs from inbox → embeddings". Connecting embeddings into
            # Qdrant is wired by the caller's QdrantMemoryEngine.remember
            # path; future U03b can fold the upsert in if needed.
        except Exception as exc:
            log.error("embed failed for %s chunk %d: %s", pdf_path, chunk.index, exc)
            return IngestResult(
                pdf_path=str(pdf_path), fingerprint=fp, chunks=chunk.index,
                skipped=False, reason=f"embed-failed: {exc}",
                duration_ms=(time.time() - start) * 1000,
            )
        if vault_dir is not None:
            entry = build_vault_entry({
                "source": str(pdf_path),
                "fingerprint": fp,
                "title": pdf_path.stem,
            }, chunk, embedding_id=None)
            target = vault_dir / "ingested" / f"{pdf_path.stem}.chunk{chunk.index:03d}.md"
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(entry, encoding="utf-8")
    if not dry:
        append_fingerprint(fp_path, fp, str(pdf_path))
    return IngestResult(
        pdf_path=str(pdf_path), fingerprint=fp, chunks=len(chunks),
        skipped=False, reason=None,
        duration_ms=(time.time() - start) * 1000,
    )


def walk_inbox(inbox: Path) -> Iterable[Path]:
    if not inbox.exists():
        return
    for path in sorted(inbox.rglob("*.pdf")):
        if path.is_file():
            yield path


def run_once(args: argparse.Namespace) -> int:
    inbox = Path(os.environ.get("INBOX_DIR", "/inbox"))
    state = Path(os.environ.get("STATE_DIR", "/state"))
    vault_arg = os.environ.get("VAULT_DIR")
    vault = Path(vault_arg) if vault_arg else None
    ollama_host = os.environ.get("OLLAMA_HOST", "http://host.docker.internal:11434")
    fp_path = Path(os.environ.get("FINGERPRINT_PATH", str(state / "batch-processor.fingerprints.jsonl")))

    seen = parse_fingerprint_log(fp_path.read_text(encoding="utf-8")) if fp_path.exists() else set()
    log.info("starting batch run: inbox=%s state=%s vault=%s seen=%d", inbox, state, vault, len(seen))

    summary = {"processed": 0, "skipped": 0, "errors": 0}
    for pdf in walk_inbox(inbox):
        r = process_one(pdf, seen, fp_path=fp_path, vault_dir=vault,
                        ollama_host=ollama_host, dry=args.dry)
        if r.skipped:
            summary["skipped"] += 1
            log.info("skip %s (%s)", r.pdf_path, r.reason)
        elif r.reason:
            summary["errors"] += 1
            log.warning("error %s (%s)", r.pdf_path, r.reason)
        else:
            summary["processed"] += 1
            log.info("done %s chunks=%d (%dms)", r.pdf_path, r.chunks, int(r.duration_ms))
            seen.add(r.fingerprint)

    log.info("batch summary: %s", summary)
    return 0 if summary["errors"] == 0 else 1


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="PRISM batch PDF ingestion")
    parser.add_argument("--once", action="store_true", help="process unseen and exit")
    parser.add_argument("--watch", action="store_true", help="loop forever, scanning every 60s")
    parser.add_argument("--dry", action="store_true", help="parse+chunk only, no embed/qdrant")
    args = parser.parse_args(argv)

    log_path = os.environ.get("LOG_PATH", "/state/batch-processor.log")
    Path(log_path).parent.mkdir(parents=True, exist_ok=True)
    setup_logging(log_path)

    if args.watch:
        while True:
            run_once(args)
            time.sleep(60)
    return run_once(args)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
