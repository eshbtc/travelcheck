#!/usr/bin/env bash
set -u

BASE_URL=${BASE_URL:-"http://localhost:3000"}
BEARER=${BEARER:-""}
TIMEOUT=${TIMEOUT:-15}

PASS=0
FAIL=0

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
ok()   { printf "✅ %s\n" "$1"; PASS=$((PASS+1)); }
err()  { printf "❌ %s\n" "$1"; FAIL=$((FAIL+1)); }
info() { printf "ℹ️  %s\n" "$1"; }

auth_headers=()
if [ -n "$BEARER" ]; then
  auth_headers=("-H" "Authorization: Bearer $BEARER")
fi

request() {
  local method="$1"; shift
  local path="$1"; shift
  local body="${1:-}"
  local url="$BASE_URL$path"
  local extra=("-sS" "--max-time" "$TIMEOUT" "-X" "$method" "-H" "Content-Type: application/json")
  if [ -n "$body" ]; then
    extra+=("--data" "$body")
  fi
  curl "${extra[@]}" "${auth_headers[@]}" "$url"
}

bold "Clean-room smoke test against: $BASE_URL"
# Try to mint a bearer token if not provided and credentials exist (run from frontend working dir)
if [ -z "$BEARER" ] && [ -n "${SMOKE_EMAIL:-}" ] && [ -n "${SMOKE_PASSWORD:-}" ] && [ -f "./scripts/get-bearer.js" ]; then
  info "Attempting to fetch BEARER via Supabase sign-in (SMOKE_EMAIL provided)"
  if token=$(node ./scripts/get-bearer.js 2>/dev/null); then
    BEARER="$token"
    auth_headers=("-H" "Authorization: Bearer $BEARER")
    ok "Acquired bearer token"
  else
    info "Could not acquire bearer token automatically"
  fi
fi
if [ -n "$BEARER" ]; then info "Using bearer token for auth-required checks"; else info "BEARER not set; auth-required tests will be skipped"; fi

# 1) Health check (public)
if out=$(request GET "/api/health" 2>/dev/null); then
  if echo "$out" | grep -q '"status":\s*"healthy"'; then ok "Health check"; else err "Health check returned unexpected payload"; fi
else err "Health check request failed"; fi

# 2) AI analyze patterns (public, requires GOOGLE_AI_API_KEY)
body_ai='{ "travelData": [{"country":"US","entry_date":"2024-01-01"}] }'
if out=$(request POST "/api/ai/analyze-patterns" "$body_ai" 2>/dev/null); then
  if echo "$out" | grep -q '"success":\s*true'; then ok "AI analyze-patterns"; else info "AI analyze-patterns not ready (check GOOGLE_AI_API_KEY)"; fi
else info "AI analyze-patterns endpoint not reachable"; fi

if [ -n "$BEARER" ]; then
  # 3) User profile
  if out=$(request GET "/api/user/profile" 2>/dev/null); then
    if echo "$out" | grep -q '"success":\s*true'; then ok "User profile"; else err "User profile returned unexpected payload"; fi
  else err "User profile request failed"; fi

  # 4) Integration status
  if out=$(request GET "/api/integration/status" 2>/dev/null); then
    if echo "$out" | grep -q '"success":\s*true'; then ok "Integration status"; else err "Integration status unexpected"; fi
  else err "Integration status request failed"; fi

  # 5) Booking status (rich)
  if out=$(request GET "/api/booking/status" 2>/dev/null); then
    if echo "$out" | grep -q '"success":\s*true'; then ok "Booking status"; else err "Booking status unexpected"; fi
  else err "Booking status request failed"; fi

  # 6) Passport scans list
  if out=$(request GET "/api/passport/scans" 2>/dev/null); then
    if echo "$out" | grep -q '"success":\s*true'; then ok "Passport scans list"; else err "Passport scans list unexpected"; fi
  else err "Passport scans request failed"; fi

  # 7) Reports generate
  today=$(date +%F)
  body_report=$(cat <<JSON
{ "reportType": "travel_summary", "title": "Smoke Report", "startDate": "2020-01-01", "endDate": "$today" }
JSON
)
  if out=$(request POST "/api/reports/generate" "$body_report" 2>/dev/null); then
    if echo "$out" | grep -q '"success":\s*true'; then ok "Generate report"; else err "Generate report unexpected"; fi
  else err "Generate report request failed"; fi

  # 8) Duplicate detection (non-destructive)
  if out=$(request POST "/api/scans/detect-duplicates" '{"similarityThreshold":0.85}' 2>/dev/null); then
    if echo "$out" | grep -q '"success":\s*true'; then ok "Duplicate detection"; else info "Duplicate detection returned no data (ok for empty DB)"; fi
  else info "Duplicate detection endpoint not reachable"; fi
fi

bold "Summary: $PASS passed, $FAIL failed"
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
