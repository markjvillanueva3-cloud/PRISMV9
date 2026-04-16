# Docker Volume Data (portable across PCs via H: drive)

All Docker container data is bind-mounted here so the H: drive remains
self-contained. Plug the drive into any Windows PC and the services pick up
where they left off — no re-pulling models, no rebuilding indexes.

## What's stored here

| Subdir         | Service            | What it holds                                        |
| -------------- | ------------------ | ---------------------------------------------------- |
| `qdrant/`      | prism-qdrant       | Vector collections, HNSW indexes, points             |
| `ollama/`      | prism-ollama       | Pulled LLM/embedding models (nomic-embed-text, etc.) |
| `postgres/`    | prism-postgres     | PostgreSQL tables, WAL, indexes                      |
| `prism-state/` | prism-mcp-server   | PRISM runtime state written by the server            |
| `prometheus/`  | prism-prometheus   | Metrics TSDB                                         |
| `grafana/`     | prism-grafana      | Dashboards, datasource config, users                 |

## Per-PC setup (one-time)

These pieces are OS-level and live on C: / system volumes — unavoidable:

1. **Docker Desktop** — install via `winget install -e --id Docker.DockerDesktop`
2. **WSL2 kernel** — `wsl --install --no-distribution` then reboot
3. **Node.js** — install via `winget install -e --id OpenJS.NodeJS.LTS`

Everything else (project code, `node_modules`, npm cache, Docker data) is on H:.

### Optional: move Docker's image store to H: too

By default Docker keeps images in a VHDX under
`C:\Users\<user>\AppData\Local\Docker\wsl\data\`. To move to H:

1. Docker Desktop → Settings → Resources → Advanced
2. "Disk image location" → `H:\prism\data\docker-volumes\_docker-root`
3. Apply & Restart

Images are re-usable across PCs but this step is optional — they re-pull
quickly over broadband.

## Run

```bash
cd H:/prism
docker compose up -d qdrant ollama
docker exec prism-ollama ollama pull nomic-embed-text
```

First run on a new PC takes ~5 min (model pull). Subsequent PCs that mount
the same H: drive skip the pull entirely — model already cached in
`./ollama/models/`.
