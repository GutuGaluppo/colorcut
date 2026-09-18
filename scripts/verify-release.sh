#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_PATH="${1:-$PROJECT_ROOT/src-tauri/target/release/bundle/macos/ColorCut.app}"
DMG_PATH="${2:-}"
EXPECTED_IDENTIFIER="com.gutugaluppo.colorcut"
EXPECTED_MODEL_MD5="fc16ebd8b0c10d971d3513d564d01e29"

fail() {
  echo "Release verification failed: $1" >&2
  exit 1
}

require_file() {
  [ -f "$1" ] || fail "missing $1"
}

PLIST_PATH="$APP_PATH/Contents/Info.plist"
BINARY_PATH="$APP_PATH/Contents/MacOS/colorcut"
ICON_PATH="$APP_PATH/Contents/Resources/icon.icns"
MODEL_PATH="$APP_PATH/Contents/Resources/resources/models/isnet-general-use.onnx"

require_file "$PLIST_PATH"
require_file "$BINARY_PATH"
require_file "$ICON_PATH"
require_file "$MODEL_PATH"

IDENTIFIER="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$PLIST_PATH")"
[ "$IDENTIFIER" = "$EXPECTED_IDENTIFIER" ] || fail "unexpected bundle identifier $IDENTIFIER"

ICON_NAME="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIconFile' "$PLIST_PATH")"
[ "$ICON_NAME" = "icon.icns" ] || fail "unexpected CFBundleIconFile $ICON_NAME"

MODEL_MD5="$(md5 -q "$MODEL_PATH")"
[ "$MODEL_MD5" = "$EXPECTED_MODEL_MD5" ] || fail "model checksum mismatch"

file "$BINARY_PATH" | grep -q "arm64" || fail "release binary is not arm64"

VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$PLIST_PATH")"
MINIMUM_SYSTEM_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :LSMinimumSystemVersion' "$PLIST_PATH")"

echo "Verified ColorCut.app metadata and bundled resources."
echo "Version: $VERSION"
echo "Minimum macOS declared by plist: $MINIMUM_SYSTEM_VERSION"
echo "Model MD5: $MODEL_MD5"

if [ -z "$DMG_PATH" ]; then
  DMG_DIR="$PROJECT_ROOT/src-tauri/target/release/bundle/dmg"
  if [ -d "$DMG_DIR" ]; then
    DMG_PATH="$(find "$DMG_DIR" -maxdepth 1 -name 'ColorCut_*.dmg' -print | sort | tail -n 1)"
  fi
fi

if [ -n "$DMG_PATH" ] && [ -f "$DMG_PATH" ]; then
  hdiutil verify "$DMG_PATH" >/dev/null
  echo "DMG SHA-256: $(shasum -a 256 "$DMG_PATH" | cut -d' ' -f1)"
else
  echo "Warning: no DMG found; skipped disk-image verification." >&2
fi

if codesign --verify --deep --strict --verbose=2 "$APP_PATH" >/dev/null 2>&1; then
  echo "Code signature: valid"
elif [ "${REQUIRE_SIGNED:-0}" = "1" ]; then
  fail "bundle is not validly signed"
else
  echo "Warning: bundle is unsigned; suitable only for local development." >&2
fi
