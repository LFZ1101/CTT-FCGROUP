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
grep -qi 'traceparent:' /tmp/e2e-headers.txt
METRICS=$(curl -sS "http://127.0.0.1:${PORT}/health/metrics")
python3 -c "import json,sys; d=json.loads(sys.argv[1]); assert 'requests' in d; print('e2e metrics ok', d.get('requests'))" "$METRICS"
HEALTH=$(curl -sS "http://127.0.0.1:${PORT}/health")
python3 -c "import json,sys; d=json.loads(sys.argv[1]); assert 'otel' in d; print('e2e health otel', d.get('otel'))" "$HEALTH"

# Isolamento cross-tenant: B não vê empresa de A
EMAIL_B="e2e-b-$(date +%s)@test.cct"
BOOT_B=$(curl -sS -X POST "http://127.0.0.1:${PORT}/api/v1/auth/bootstrap" \
  -H 'Content-Type: application/json' \
  -d "{\"tenantName\":\"E2E Tenant B\",\"name\":\"E2E Owner B\",\"email\":\"${EMAIL_B}\",\"password\":\"${PASS}\"}")
TOKEN_B=$(printf '%s' "$BOOT_B" | python3 -c 'import sys,json; print(json.load(sys.stdin)["accessToken"])')
CNPJ_A="$(printf '444%s' "$(date +%s)" | cut -c1-14)"
COMPANY_A=$(curl -sS -X POST "http://127.0.0.1:${PORT}/api/v1/companies" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"legalName\":\"Empresa E2E A\",\"cnpj\":\"${CNPJ_A}\",\"city\":\"Curitiba\",\"state\":\"PR\"}")
COMPANY_A_ID=$(printf '%s' "$COMPANY_A" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
LIST_B=$(curl -sS -H "Authorization: Bearer ${TOKEN_B}" "http://127.0.0.1:${PORT}/api/v1/companies")
python3 -c "import json,sys; rows=json.loads(sys.argv[1]); assert all(r.get('id')!=sys.argv[2] for r in rows); print('e2e isolation ok', len(rows))" "$LIST_B" "$COMPANY_A_ID"
