#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
SIZE="${2:-20}"

if ! [[ "$SIZE" =~ ^[0-9]+$ ]]; then
  echo "size must be an integer"
  exit 1
fi

echo "Seeding demo data at ${BASE_URL} (size=${SIZE})..."

curl -sS -X POST "${BASE_URL}/seed?size=${SIZE}&reset=true" \
  -H "Content-Type: application/json"

echo

echo "Dashboard: ${BASE_URL}/dashboard"
echo "Docs: ${BASE_URL}/docs"
