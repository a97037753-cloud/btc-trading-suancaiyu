#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
MODE="${2:-basic}" # basic | full

check_endpoint() {
  local endpoint="$1"
  echo "Checking ${endpoint} ..."
  curl -fsS "$BASE_URL$endpoint" >/dev/null
}

echo "Smoke test mode: $MODE"
check_endpoint "/api/health"

if [[ "$MODE" == "full" ]]; then
  check_endpoint "/api/price"
  check_endpoint "/api/signal/latest"
fi

echo "Smoke test passed for $BASE_URL (mode=$MODE)"
