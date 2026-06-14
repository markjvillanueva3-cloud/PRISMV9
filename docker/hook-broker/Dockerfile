# U-DOCKER-HOOK-BROKER-P3 — broker container image
#
# Minimal Node 22 image that runs `server.mjs` and holds the 78 module-safe
# `.claude/hooks/*.mjs` warm in memory. The hooks directory is bind-mounted
# read-only via the compose stanza, NOT copied into the image — so an edit
# in the host repo is picked up by `POST /reload` without rebuilding.
#
# Build:
#   docker build -t prism-hooks -f docker/hook-broker/Dockerfile .
# Run (standalone):
#   docker run --rm -p 9876:9876 \
#     -v "$PWD/.claude/hooks:/repo/.claude/hooks:ro" \
#     -v "$PWD/state/shared:/repo/state/shared:ro" \
#     prism-hooks
# Run via compose:
#   docker compose up prism-hooks
#
# Healthcheck hits `GET /healthz` — 200 with `{ready:true, loaded:N}` means
# every module-safe hook was successfully dynamic-imported.
FROM node:22-alpine

# Run as a non-root user for hook-execution isolation. The broker only
# reads hook files + serves HTTP on localhost; it does NOT write to disk.
RUN addgroup -S broker && adduser -S broker -G broker
WORKDIR /repo

# Copy ONLY the broker entry point + its lib peers. Hook source is
# bind-mounted from the host at runtime (see compose volumes).
COPY docker/hook-broker/server.mjs /repo/docker/hook-broker/server.mjs
COPY scripts/lib/hook-broker-classifier.mjs /repo/scripts/lib/hook-broker-classifier.mjs

# The runtime expects the compat report at /repo/state/shared/HOOK-BROKER-COMPAT-REPORT.json;
# both `.claude/hooks` and `state/shared` are mounted via compose. We do NOT
# bake either into the image — they drift independently of the broker code.

USER broker
EXPOSE 9876

ENV NODE_ENV=production \
    PRISM_BROKER_PORT=9876

# Healthcheck — broker reports ready=true once every module-safe hook
# successfully imports. A persistent ready=false means the host bind-mount
# is missing or the compat report is stale.
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:9876/healthz | grep -q '"ready":true' || exit 1

CMD ["node", "docker/hook-broker/server.mjs"]
