#!/usr/bin/env bash
# Downloads the background-removal ONNX model into src-tauri/resources/models/.
# Not committed to git: the file is ~170 MB, over GitHub's 100 MB hard limit for a
# plain commit. See docs/MODEL_NOTES.md for the model evaluation and license.
set -euo pipefail

MODEL_URL="https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx"
MODEL_MD5="fc16ebd8b0c10d971d3513d564d01e29"
DEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/src-tauri/resources/models"
DEST_FILE="$DEST_DIR/isnet-general-use.onnx"

mkdir -p "$DEST_DIR"

if [ -f "$DEST_FILE" ] && [ "$(md5 -q "$DEST_FILE" 2>/dev/null || md5sum "$DEST_FILE" | cut -d' ' -f1)" = "$MODEL_MD5" ]; then
  echo "isnet-general-use.onnx already present and verified."
  exit 0
fi

echo "Downloading isnet-general-use.onnx (Apache-2.0, ~170 MB)..."
curl -L -o "$DEST_FILE" "$MODEL_URL"

ACTUAL_MD5="$(md5 -q "$DEST_FILE" 2>/dev/null || md5sum "$DEST_FILE" | cut -d' ' -f1)"
if [ "$ACTUAL_MD5" != "$MODEL_MD5" ]; then
  echo "MD5 mismatch: expected $MODEL_MD5, got $ACTUAL_MD5" >&2
  rm -f "$DEST_FILE"
  exit 1
fi

echo "Downloaded and verified isnet-general-use.onnx."
