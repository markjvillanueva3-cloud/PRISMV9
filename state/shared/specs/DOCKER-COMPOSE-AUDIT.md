# Docker Compose + Dockerfile Audit (P13-U01)

**Generated:** 2026-05-17T21:08:08.535Z
**Milestone:** INTEL-OLLAMA-OBSIDIAN-MS0 / P13-U01
**Scope:** H:/prism recursive (skips node_modules/.git/dist/build/extracted/JM DIE/Resources)

## Summary
- Compose files: **38**
- Dockerfiles: **21**

## By classification
- **claude-harness**: 40
- **other**: 11
- **mcp-server**: 6
- **prism-infra**: 1
- **web-frontend**: 1

## Compose files
- `.claude/worktrees/agent-a01e7b81d0946a97b/docker-compose.gpu.yml` (401B, claude-harness)
- `.claude/worktrees/agent-a01e7b81d0946a97b/docker-compose.yml` (4359B, claude-harness)
- `.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/web/docker-compose.yml` (2084B, claude-harness)
- `.claude/worktrees/agent-a0310b5d699214970/docker-compose.gpu.yml` (401B, claude-harness)
- `.claude/worktrees/agent-a0310b5d699214970/docker-compose.yml` (4359B, claude-harness)
- `.claude/worktrees/agent-a0310b5d699214970/mcp-server/web/docker-compose.yml` (2084B, claude-harness)
- `.claude/worktrees/agent-a37d7460d5d653f84/docker-compose.gpu.yml` (401B, claude-harness)
- `.claude/worktrees/agent-a37d7460d5d653f84/docker-compose.yml` (4359B, claude-harness)
- `.claude/worktrees/agent-a37d7460d5d653f84/mcp-server/web/docker-compose.yml` (2084B, claude-harness)
- `.claude/worktrees/agent-a68051c75f771f518/docker-compose.gpu.yml` (401B, claude-harness)
- `.claude/worktrees/agent-a68051c75f771f518/docker-compose.yml` (4359B, claude-harness)
- `.claude/worktrees/agent-a68051c75f771f518/mcp-server/web/docker-compose.yml` (2084B, claude-harness)
- `.claude/worktrees/agent-a8299dd3b088946a6/docker-compose.gpu.yml` (401B, claude-harness)
- `.claude/worktrees/agent-a8299dd3b088946a6/docker-compose.yml` (4359B, claude-harness)
- `.claude/worktrees/agent-a8299dd3b088946a6/mcp-server/web/docker-compose.yml` (2084B, claude-harness)
- `.claude/worktrees/agent-a8585051a4b3592a1/docker-compose.gpu.yml` (401B, claude-harness)
- `.claude/worktrees/agent-a8585051a4b3592a1/docker-compose.yml` (4359B, claude-harness)
- `.claude/worktrees/agent-a8585051a4b3592a1/mcp-server/web/docker-compose.yml` (2084B, claude-harness)
- `.claude/worktrees/agent-a8b4b61a9ebee0955/docker-compose.gpu.yml` (401B, claude-harness)
- `.claude/worktrees/agent-a8b4b61a9ebee0955/docker-compose.yml` (4359B, claude-harness)
- `.claude/worktrees/agent-a8b4b61a9ebee0955/mcp-server/web/docker-compose.yml` (2084B, claude-harness)
- `.claude/worktrees/agent-ad6991466ebd4ee9d/docker-compose.gpu.yml` (401B, claude-harness)
- `.claude/worktrees/agent-ad6991466ebd4ee9d/docker-compose.yml` (4359B, claude-harness)
- `.claude/worktrees/agent-ad6991466ebd4ee9d/mcp-server/web/docker-compose.yml` (2084B, claude-harness)
- `.claude/worktrees/brave-euclid/docker-compose.yml` (773B, claude-harness)
- `.claude/worktrees/brave-euclid/mcp-server/docker-compose.yml` (3001B, claude-harness)
- `.claude/worktrees/rgs6-audit-v2/docker-compose.gpu.yml` (401B, claude-harness)
- `.claude/worktrees/rgs6-audit-v2/docker-compose.yml` (4359B, claude-harness)
- `docker/ocr-tools/docker-compose.yml` (1351B, other)
- `docker-compose.dev.yml` (1292B, other)
- `docker-compose.gpu.yml` (401B, other)
- `docker-compose.ollama-preload.yml` (2928B, other)
- `docker-compose.yml` (4359B, other)
- `mcp-server/docker-compose.dev.yml` (1270B, mcp-server)
- `mcp-server/docker-compose.yml` (2887B, mcp-server)
- `mcp-server/web/docker-compose.yml` (1997B, mcp-server)
- `prism-test-6d0595/docker-compose.gpu.yml` (401B, other)
- `prism-test-6d0595/docker-compose.yml` (4359B, other)

## Dockerfiles
- `.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/web/Dockerfile` (1620B, claude-harness)
- `.claude/worktrees/agent-a0310b5d699214970/mcp-server/web/Dockerfile` (1620B, claude-harness)
- `.claude/worktrees/agent-a37d7460d5d653f84/mcp-server/web/Dockerfile` (1620B, claude-harness)
- `.claude/worktrees/agent-a68051c75f771f518/mcp-server/web/Dockerfile` (1620B, claude-harness)
- `.claude/worktrees/agent-a8299dd3b088946a6/mcp-server/web/Dockerfile` (1620B, claude-harness)
- `.claude/worktrees/agent-a8585051a4b3592a1/mcp-server/web/Dockerfile` (1620B, claude-harness)
- `.claude/worktrees/agent-a8b4b61a9ebee0955/mcp-server/web/Dockerfile` (1620B, claude-harness)
- `.claude/worktrees/agent-ad6991466ebd4ee9d/mcp-server/web/Dockerfile` (1620B, claude-harness)
- `.claude/worktrees/brave-euclid/mcp-server/Dockerfile` (1313B, claude-harness)
- `.claude/worktrees/brave-euclid/web/Dockerfile` (568B, claude-harness)
- `.claude/worktrees/rgs6-audit-v2/Dockerfile` (1442B, claude-harness)
- `.claude/worktrees/rgs6-audit-v2/mcp-server/Dockerfile` (1442B, claude-harness)
- `docker/ocr-tools/Dockerfile` (2367B, other)
- `Dockerfile` (1385B, other)
- `Docustrata/.index/paddleocr-docker/Dockerfile` (1041B, other)
- `mcp-server/Dockerfile` (1385B, mcp-server)
- `mcp-server/web/Dockerfile` (1571B, mcp-server)
- `prism-test-6d0595/Dockerfile` (1442B, other)
- `prism-test-6d0595/mcp-server/Dockerfile` (1442B, mcp-server)
- `scripts/docker/prism-hooks-broker.Dockerfile` (1683B, prism-infra)
- `web/Dockerfile` (568B, web-frontend)

---
Advisory-only — file enumeration without Docker daemon contact.