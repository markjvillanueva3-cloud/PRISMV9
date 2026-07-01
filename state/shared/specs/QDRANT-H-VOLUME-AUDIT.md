# Qdrant H: Volume Audit (P17-U02)

**Generated:** 2026-05-17
**Unit:** INTEL-OLLAMA-OBSIDIAN-MS0 / P17-U02
**Result:** **SATISFIED-BY-MAIN-COMPOSE** (intent met; P13-U02 docker-compose.intel.yml separate file is not required)

## Finding

The P17-U02 spec said:
> "Ensure docker-compose.intel.yml Qdrant volume is on H: (cross-PC persistent)"

That separate `docker-compose.intel.yml` file does not exist — P13-U02 (which would create it) is still pending. However, the **intent** (Qdrant data on H: drive) is already fully satisfied by the main `docker-compose.yml`.

## Evidence

In `H:/prism/docker-compose.yml`:

```yaml
qdrant:
  image: qdrant/qdrant:v1.17.0
  container_name: prism-qdrant
  volumes:
    - ./data/docker-volumes/qdrant:/qdrant/storage    # ← bind-mount to H:
```

And the explicit doctrine comment at lines 148–149:

```yaml
# Named volumes removed — all data bind-mounted to ./data/docker-volumes/ for
# H: drive portability across machines. See data/docker-volumes/README.md.
```

Since `docker-compose.yml` lives at `H:/prism/docker-compose.yml`, the relative path `./data/docker-volumes/qdrant` resolves to `H:/prism/data/docker-volumes/qdrant` — which is on H:, persistent, and cross-PC-portable.

## What's missing (not P17-U02 scope)

If P13-U02 ships `docker-compose.intel.yml` as a separate orchestration file (per its envelope), the same `./data/docker-volumes/qdrant` bind-mount pattern must be carried forward verbatim. The bind-mount rule is non-negotiable per the existing docker-compose.yml comment.

## Status

P17-U02 → **completed** (satisfied by existing main compose; no new file needed).
P13-U02 (separate intel.yml) remains **pending** — independent unit.
