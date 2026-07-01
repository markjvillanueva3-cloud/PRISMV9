#!/usr/bin/env python
"""
embed-nodes-gpu.py -- GPU text embedder for the GNN re-embed (slot:india, A2 / U-RAG-6).

Reads a JSONL of {id, text} records, embeds each `text` with a sentence-transformers
model on the Blackwell GPU, and writes a JSONL of {id, vec:[float, ...]} (L2-normalized
float vectors). The JS side (build-node-embeddings.mjs `quantize`) owns int8 quantization
and the deployed file format, so this stays a pure vectorizer -- swapping ONLY the model,
never the embed-text construction (which stays the single JS authority => apples-to-apples
model comparison against the deployed nomic-embed-text pool).

Design notes:
- BATCHED (default 128) -- per-node process spawn would be death; one process, GPU batches.
- MRL truncate_dim keeps a strong 1024d model at 768d so the candidate is a drop-in for the
  existing 768d eval/trainer (zero dimension-migration churn for the first experiment).
- RESUMABLE -- re-running skips ids already present in --out (durable against a reaper kill).
- Symmetric embedding (no query/passage prefix): the GNN task is engine<->engine k-NN, so
  every node is embedded the SAME way (as a passage), matching the deployed nomic vectors.
- Fail-loud: a model load / encode error exits non-zero with a tag (never silent-empty).

Usage:
  python scripts/embed-nodes-gpu.py --in texts.jsonl --out vecs.jsonl
  python scripts/embed-nodes-gpu.py --in t.jsonl --out v.jsonl --model BAAI/bge-m3 --dim 1024
  python scripts/embed-nodes-gpu.py --in t.jsonl --out v.jsonl --limit 200 --no-resume

ASCII only.
"""
import argparse
import json
import os
import sys
import time


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def read_records(path, id_field, text_field, limit):
    recs = []
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            if not isinstance(obj, dict):
                continue
            if "__meta" in obj:
                continue
            rid = obj.get(id_field)
            txt = obj.get(text_field)
            if not isinstance(rid, str) or not isinstance(txt, str) or not txt.strip():
                continue
            recs.append((rid, txt))
            if limit and len(recs) >= limit:
                break
    return recs


def load_done_ids(path):
    done = set()
    if not os.path.isfile(path):
        return done
    try:
        with open(path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                if isinstance(obj, dict) and isinstance(obj.get("id"), str) and "vec" in obj:
                    done.add(obj["id"])
    except Exception:
        pass
    return done


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--out", dest="out", required=True)
    ap.add_argument("--model", default="mixedbread-ai/mxbai-embed-large-v1")
    ap.add_argument("--dim", type=int, default=768)
    ap.add_argument("--batch", type=int, default=128)
    ap.add_argument("--device", default="cuda")
    ap.add_argument("--id-field", default="id")
    ap.add_argument("--text-field", default="text")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--round", type=int, default=6, help="decimal places for float vec (size bound)")
    ap.add_argument("--no-resume", action="store_true")
    args = ap.parse_args()

    t0 = time.time()
    recs = read_records(args.inp, args.id_field, args.text_field, args.limit)
    log("read %d records from %s" % (len(recs), args.inp))
    if not recs:
        log("FATAL no input records")
        sys.exit(3)

    done = set() if args.no_resume else load_done_ids(args.out)
    if done:
        log("resume: %d already embedded, skipping" % len(done))
    pending = [(rid, txt) for (rid, txt) in recs if rid not in done]
    if not pending:
        log("nothing to do (all ids present)")
        print(json.dumps({"ok": True, "embedded": 0, "skipped": len(done), "model": args.model, "dim": args.dim}))
        return

    import torch  # noqa
    from sentence_transformers import SentenceTransformer
    if args.device == "cuda" and not torch.cuda.is_available():
        log("FATAL cuda requested but not available")
        sys.exit(4)
    log("loading model=%s dim=%d device=%s" % (args.model, args.dim, args.device))
    model = SentenceTransformer(args.model, device=args.device, truncate_dim=args.dim)
    log("model loaded in %.1fs" % (time.time() - t0))

    mode = "a" if (done and not args.no_resume) else "w"
    written = 0
    rounder = args.round
    with open(args.out, mode, encoding="utf-8") as out_fh:
        if mode == "w":
            out_fh.write(json.dumps({
                "__meta": True, "model": args.model, "dim": args.dim,
                "count_planned": len(pending), "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }) + "\n")
        t1 = time.time()
        for start in range(0, len(pending), args.batch):
            chunk = pending[start:start + args.batch]
            texts = [t for (_, t) in chunk]
            vecs = model.encode(texts, batch_size=args.batch, normalize_embeddings=True, show_progress_bar=False)
            for (rid, _), v in zip(chunk, vecs):
                vv = [round(float(x), rounder) for x in v]
                out_fh.write(json.dumps({"id": rid, "vec": vv}) + "\n")
                written += 1
            if (start // args.batch) % 20 == 0:
                rate = written / max(1e-6, time.time() - t1)
                log("  embedded %d/%d (%.0f/s)" % (written, len(pending), rate))
    dt = time.time() - t1
    rate = written / max(1e-6, dt)
    log("DONE embedded=%d in %.1fs (%.0f/s)" % (written, dt, rate))
    print(json.dumps({
        "ok": True, "embedded": written, "skipped": len(done),
        "model": args.model, "dim": args.dim, "encode_secs": round(dt, 1),
        "items_per_sec": round(rate, 1),
    }))


if __name__ == "__main__":
    main()
