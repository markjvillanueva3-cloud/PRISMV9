# batch-processor.Dockerfile — INTEL-OLLAMA-OBSIDIAN-MS0/P13-U03
#
# Python + pypdf + Ollama-client container that walks H:/prism/inbox/,
# extracts text from each PDF, chunks it semantically, embeds each chunk
# via Ollama nomic-embed-text, and upserts into Qdrant.
#
# Idempotent: a SHA-256 fingerprint of every input is recorded in
# H:/prism/state/batch-processor.fingerprints.jsonl. Already-processed
# inputs are skipped on re-run.
#
# Logs to H:/prism/state/batch-processor.log (mounted from host).

FROM python:3.12-slim

LABEL milestone="INTEL-OLLAMA-OBSIDIAN-MS0/P13-U03"
LABEL purpose="PDF batch ingestion → Qdrant via Ollama nomic-embed-text"

# Install OS deps for pypdf parsing of edge-case PDFs (image-based,
# encrypted, etc.). The slim base lacks ghostscript + tesseract;
# we don't OCR images here — that's a separate vision-extraction pass.
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Pinning the major versions for reproducibility; all are pure-Python or
# wheel-distributable so install is fast.
RUN pip install --no-cache-dir \
    pypdf==4.* \
    httpx==0.27.* \
    qdrant-client==1.* \
    pydantic==2.*

WORKDIR /app
COPY batch-processor/process.py /app/process.py

# Mounts (set via docker-compose):
#   /inbox  → H:/prism/inbox  (PDF inputs, read-only)
#   /state  → H:/prism/state  (fingerprints + log, read-write)
#   /vault  → H:/prism/knowledge/wiki  (markdown chunks, read-write)
ENV INBOX_DIR=/inbox
ENV STATE_DIR=/state
ENV VAULT_DIR=/vault
ENV OLLAMA_HOST=http://host.docker.internal:11434
ENV QDRANT_HOST=http://host.docker.internal:6333
ENV LOG_PATH=/state/batch-processor.log
ENV FINGERPRINT_PATH=/state/batch-processor.fingerprints.jsonl

ENTRYPOINT ["python", "/app/process.py"]
CMD ["--once"]
