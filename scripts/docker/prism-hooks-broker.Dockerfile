# PRISM hook broker container — OBSIDIAN-INTELLIGENCE-MS3 / U-DOCKER-HOOK-BROKER (A1)
# Built by scripts/install-prism-hooks-container.ps1 with --file= pointing here.
# Repo root MUST be the build context (the COPY paths below are repo-relative).
#
# Usage:
#   docker build -f scripts/docker/prism-hooks-broker.Dockerfile -t prism-hooks-broker:local .
#   docker run -d --name prism-hooks --restart unless-stopped \
#     -p 127.0.0.1:9876:9876 \
#     -v H:/prism/.claude/hooks:/app/.claude/hooks:ro \
#     -v H:/prism:/app/repo:ro \
#     -e PRISM_HOOKS_DIR=/app/.claude/hooks \
#     prism-hooks-broker:local
#
# Listens on 9876 inside the container; bound to 127.0.0.1 on host (localhost-only).

FROM node:22-alpine

# Non-root for least privilege; hooks are read-only mounted anyway.
RUN addgroup -S prism && adduser -S prism -G prism

WORKDIR /app

# Server source baked in so the container is self-contained even if the host repo is gone.
COPY scripts/docker/prism-hooks-broker-server.mjs /app/server.mjs

# Hooks dir is bind-mounted at runtime (so edits hot-reload without rebuild).
# Empty placeholder so the dir exists if no mount is provided.
RUN mkdir -p /app/.claude/hooks && chown -R prism:prism /app

USER prism

# Healthcheck — used by docker-compose's `condition: service_healthy`.
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- --tries=1 --timeout=2 http://127.0.0.1:9876/healthz >/dev/null || exit 1

EXPOSE 9876

ENV NODE_ENV=production \
    PRISM_HOOKS_BROKER_PORT=9876 \
    PRISM_HOOKS_BROKER_HOST=0.0.0.0 \
    PRISM_HOOKS_DIR=/app/.claude/hooks

CMD ["node", "--unhandled-rejections=warn", "/app/server.mjs"]
