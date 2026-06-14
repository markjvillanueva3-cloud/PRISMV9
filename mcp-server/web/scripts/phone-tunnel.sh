#!/usr/bin/env bash
# Launches the PRISM web dev server + a cloudflared HTTPS tunnel so a phone can install + test the academy PWA.
# POSIX companion to phone-tunnel.ps1.
#
# Requires cloudflared (https://github.com/cloudflare/cloudflared/releases).
# Usage: ./phone-tunnel.sh [port]   (default port: 3100)

set -euo pipefail

PORT="${1:-3100}"
WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "✗ cloudflared not on PATH."
  echo "  Install from https://github.com/cloudflare/cloudflared/releases."
  exit 1
fi

trap 'kill 0' EXIT

echo "→ Launching vite dev server (LAN host + port $PORT)…"
(cd "$WEB_DIR" && PRISM_PHONE_DEV=1 npm run dev) &

sleep 3

echo "→ Launching cloudflared HTTPS tunnel → http://127.0.0.1:$PORT …"
cloudflared tunnel --url "http://127.0.0.1:$PORT" &

cat <<HERE

Two background processes started.

Steps for the phone:
  1. Wait for cloudflared to print a *.trycloudflare.com HTTPS URL.
  2. Open that URL on the phone.
  3. Go to <URL>/dev-seed-apprentice.html and tap 'Seed apprentice'.
  4. From the browser menu, tap 'Add to Home Screen' to install the PWA.
  5. Open PRISM Academy from the home screen.

Press Ctrl+C here to stop the dev server + tunnel.
HERE

wait
