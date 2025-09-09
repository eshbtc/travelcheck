#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID=${PROJECT_ID:-travelcheck-app}
REGION=${REGION:-us-central1}
HOST=${HOST:-http://localhost:5001}

echo "Calling runDailyEmailSync on emulator at ${HOST}/${PROJECT_ID}/${REGION}/runDailyEmailSync"

curl -sS -X POST \
  -H 'Content-Type: application/json' \
  -d '{"data":{}}' \
  "${HOST}/${PROJECT_ID}/${REGION}/runDailyEmailSync" | jq .

