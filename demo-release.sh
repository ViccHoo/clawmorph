#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo '=== ClawMorph demo: list ==='
npm run list

echo
echo '=== ClawMorph demo: preview ==='
npm run preview -- --path ./test-fixtures/demo-agent --role researcher

echo
echo '=== ClawMorph demo: apply + rollback on temp copy ==='
TMPDIR=$(mktemp -d)
cp -R test-fixtures/demo-agent/. "$TMPDIR"/
npm run apply -- --path "$TMPDIR" --role researcher
npm run rollback -- --path "$TMPDIR"
echo "Temp demo path: $TMPDIR"
