# INTEL-OLLAMA-OBSIDIAN-MS0 / P13-U02 (slot:kilo) — Qdrant config wrapper.
#
# Thin Dockerfile that wraps the upstream qdrant/qdrant:v1.17.0 image with
# PRISM-specific config baked in. The base docker-compose.yml uses the
# upstream `image:` directive directly; docker-compose.intel.yml `build:`s
# against this Dockerfile so the intel-stack invocation gets:
#
#   - Telemetry disabled (offline shop-floor default; the base compose leaves
#     QDRANT__TELEMETRY_DISABLED unset, so the upstream default of
#     "send anonymous usage stats" applies — wrong for an offline manufacturing
#     CNC environment per `feedback_no_public_h_drive`).
#   - On-disk payload persistence locked on (matches base compose env, doubled
#     here so a developer who builds this image standalone — without the base
#     compose env overrides — still gets the persistence default).
#   - Default ports 6333 (REST) + 6334 (gRPC) carried through.
#
# Image size impact: ~zero (we copy a 16-line YAML over the upstream default).
# The image is functionally identical to qdrant/qdrant:v1.17.0 with the
# preferences baked in — drop-in replacement.
#
# Rollback (per P13-U02 envelope): `docker-compose down` + delete the file.

FROM qdrant/qdrant:v1.17.0

# Bake PRISM defaults into the upstream config dir. Qdrant reads YAML configs
# from /qdrant/config/ on startup (see upstream docs); compose-level env vars
# (QDRANT__SERVICE__HTTP_PORT etc.) still override these — env wins by design.
#
# The DESTINATION filename `production.yaml` is LOAD-BEARING: upstream image
# sets RUN_MODE=production by default, and Qdrant's settings loader auto-opens
# /qdrant/config/{RUN_MODE}.yaml. Renaming the destination breaks the bake-in
# silently (file present in image, never loaded — the worst failure mode).
# The source filename `prism-defaults.yaml` is for human readability only;
# the rename is the contract — DO NOT change the destination path.
COPY docker/qdrant/prism-defaults.yaml /qdrant/config/production.yaml

# Healthcheck is defined in docker-compose.intel.yml (Docker best practice:
# orchestration owns probes so the image stays portable). Volumes + ports
# also live in compose — DO NOT EXPOSE/VOLUME here; that would conflict
# with the bind-mount layout in docker-compose.yml + intel.yml.

# Run as the upstream image's default user (qdrant runs as `qdrant:qdrant`
# uid 1000). No CMD/ENTRYPOINT override — upstream's already correct.
