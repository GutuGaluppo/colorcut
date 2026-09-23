#!/usr/bin/env bash
# Ad-hoc quality/latency benchmark of the Photoroom "Remove Background" API
# (https://sdk.photoroom.com/v1/segment) against the same representative
# subset of Images_QA/ used for the local-model benchmark in
# docs/MODEL_NOTES.md.
#
# This is a standalone comparison script, NOT wired into the app. Per
# AGENTS.md, ColorCut's background removal is local-only; using Photoroom
# (a cloud API) as an actual app feature would need explicit product
# approval and an ADR in docs/DECISIONS.md. This script exists purely to
# let a human compare cutout quality, not to integrate the service.
#
# Requires PHOTOROOM_API_KEY in .env (gitignored, never committed).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INPUT_DIR="$ROOT_DIR/Images_QA"
OUTPUT_DIR="$ROOT_DIR/photoroom_results"
ENV_FILE="$ROOT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE (expected a PHOTOROOM_API_KEY=... line)." >&2
  exit 1
fi

PHOTOROOM_API_KEY="$(grep -m1 '^PHOTOROOM_API_KEY=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"'"'"'\r')"

if [ -z "$PHOTOROOM_API_KEY" ]; then
  echo "PHOTOROOM_API_KEY not set in $ENV_FILE." >&2
  exit 1
fi

if [ ! -d "$INPUT_DIR" ]; then
  echo "Missing $INPUT_DIR (rights-safe manual QA set; not committed to git)." >&2
  exit 1
fi

# Same representative cases picked for the local-model benchmark in
# docs/MODEL_NOTES.md, so results are comparable image-for-image.
DEFAULT_FILES=(
  "_synthetic_tiny_96px.jpg"
  "ramin-talebi-1PPcKQdeRxQ-unsplash.jpg"
  "ayo-ogunseinde-UqT55tGBqzI-unsplash.jpg"
  "scott-webb-oRWRlTgBrPo-unsplash.jpg"
  "olena-bohovyk-GOVTETevRm8-unsplash.jpg"
  "olena-bohovyk-r0M9HrfJMBM-unsplash.jpg"
  "kadarius-seegars-0FHNXqyqgg4-unsplash.jpg"
  "ryan-waring-164_6wVEHfI-unsplash.jpg"
  "giorgio-trovato-rCzy18K9hq0-unsplash.jpg"
  "bin-thieu-tDBXrGDJNs4-unsplash.jpg"
  "stesha-sss-57VQe8WvY8M-unsplash.jpg"
  "vinicius-amnx-amano-VFZF_pzTVBA-unsplash.jpg"
  "elvira-blumfelde-ehoKcVrxKdU-unsplash.jpg"
)

if [ "${1:-}" = "--all" ]; then
  FILES=("$INPUT_DIR"/*.jpg "$INPUT_DIR"/*.jpeg "$INPUT_DIR"/*.png)
elif [ "$#" -gt 0 ]; then
  FILES=("$@")
else
  FILES=("${DEFAULT_FILES[@]}")
fi

mkdir -p "$OUTPUT_DIR"

printf '%-45s %-6s %-10s %-10s\n' "file" "http" "ms" "bytes"
printf -- '-%.0s' $(seq 1 75); echo

ok=0
fail=0

for f in "${FILES[@]}"; do
  base="$(basename "$f")"
  src="$INPUT_DIR/$base"
  if [ ! -f "$src" ]; then
    [ -f "$f" ] && src="$f" || { printf '%-45s %-6s %-10s %-10s\n' "$base" "-" "-" "missing"; fail=$((fail+1)); continue; }
  fi

  out="$OUTPUT_DIR/${base%.*}.png"

  response="$(curl -sS -o "$out" -w '%{http_code} %{time_total}' \
    --request POST \
    --url https://sdk.photoroom.com/v1/segment \
    --header "x-api-key: $PHOTOROOM_API_KEY" \
    --form "image_file=@${src}" \
    --form 'format=png' \
    --form 'channels=rgba' \
    --form 'size=full' \
    --form 'crop=false' || echo "000 0")"

  http_code="$(echo "$response" | cut -d' ' -f1)"
  time_total="$(echo "$response" | cut -d' ' -f2)"
  ms="$(awk -v t="$time_total" 'BEGIN { printf "%.0f", t * 1000 }')"

  if [ "$http_code" = "200" ]; then
    bytes="$(wc -c < "$out" | tr -d ' ')"
    ok=$((ok+1))
  else
    bytes="error: $(cat "$out" 2>/dev/null | head -c 200)"
    rm -f "$out"
    fail=$((fail+1))
  fi

  printf '%-45s %-6s %-10s %-10s\n' "$base" "$http_code" "$ms" "$bytes"
done

echo
echo "Done: $ok ok, $fail failed. Outputs in $OUTPUT_DIR (gitignored, not committed)."
echo "Compare visually against docs/MODEL_NOTES.md's isnet-general-use results for the same files."
