#!/bin/bash
# Assemble the owner's PERSONAL skill: the public SKILL.md + tools/find_deals.py + private snapshots.
# Output (gitignored): dist/sg-card-dining/ and dist/sg-card-dining.zip
# The public plugin (plugins/sg-card-deals) ships SKILL.md only — the directory rejects scripts
# from unverified orgs, and the private data must never be published.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=dist/sg-card-dining
rm -rf "$OUT" dist/sg-card-dining.zip
mkdir -p "$OUT/scripts" "$OUT/data"
cp plugins/sg-card-deals/skills/sg-card-dining/SKILL.md "$OUT/"
cp tools/find_deals.py "$OUT/scripts/"
cp private/skill-data/*.json "$OUT/data/" 2>/dev/null || echo "note: no private snapshots in private/skill-data/"
(cd dist && zip -qr sg-card-dining.zip sg-card-dining -x '*.DS_Store' -x '*__pycache__*')
echo "built $OUT and dist/sg-card-dining.zip:"
unzip -l dist/sg-card-dining.zip | tail -n +4 | sed '$d' | sed '$d'
