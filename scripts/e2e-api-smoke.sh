#!/usr/bin/env bash
# E2E HTTP leve contra API compilada (Nest DI completo).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export JWT_SECRET="${JWT_SECRET:-ci-test-secret}"
export DATABASE_URL="${DATABASE_URL:-postgresql://cct:cct_dev_password@localhost:5432/cct_intelligence?schema=public}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export PORT="${E2E_PORT:-4010}"

pnpm --filter @cct/api build
node apps/api/dist/main.js &
PID=$!
cleanup() { kill "$PID" 2>/dev/null || true; wait "$PID" 2>/dev/null || true; }
trap cleanup EXIT

for i in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null; then
    break
  fi
  sleep 0.25
done

EMAIL="e2e-$(date +%s)@test.cct"
PASS='Temp@123456'
BOOT=$(curl -sS -X POST "http://127.0.0.1:${PORT}/api/v1/auth/bootstrap" \
  -H 'Content-Type: application/json' \
  -d "{\"tenantName\":\"E2E Tenant\",\"name\":\"E2E Owner\",\"email\":\"${EMAIL}\",\"password\":\"${PASS}\"}")
TOKEN=$(printf '%s' "$BOOT" | python3 -c 'import sys,json; print(json.load(sys.stdin)["accessToken"])')
SLUG=$(printf '%s' "$BOOT" | python3 -c 'import sys,json; print(json.load(sys.stdin)["user"]["tenantSlug"])')
LOGIN=$(curl -sS -X POST "http://127.0.0.1:${PORT}/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\",\"tenantSlug\":\"${SLUG}\"}")
python3 -c "import json,sys; d=json.loads(sys.argv[1]); assert d.get('accessToken'); assert d['user']['tenantSlug']==sys.argv[2]; print('e2e login ok', d['user']['tenantSlug'])" "$LOGIN" "$SLUG"
COMPANIES=$(curl -sS -D /tmp/e2e-headers.txt -H "Authorization: Bearer ${TOKEN}" "http://127.0.0.1:${PORT}/api/v1/companies")
python3 -c "import json,sys; rows=json.loads(sys.argv[1]); assert isinstance(rows, list); print('e2e ok companies', len(rows))" "$COMPANIES"
grep -qi 'x-request-id:' /tmp/e2e-headers.txt
METRICS=$(curl -sS "http://127.0.0.1:${PORT}/health/metrics")
python3 -c "import json,sys; d=json.loads(sys.argv[1]); assert 'requests' in d; print('e2e metrics ok', d.get('requests'))" "$METRICS"
