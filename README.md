# ColorCut

[![Release](https://img.shields.io/github/v/release/GutuGaluppo/colorcut?include_prereleases&sort=semver&label=release)](https://github.com/GutuGaluppo/colorcut/releases)
[![Website](https://img.shields.io/badge/website-gutugaluppo.github.io%2Fcolorcut-2F8CFF)](https://gutugaluppo.github.io/colorcut/)

A focused, local-first macOS utility for background removal and palette extraction.

- **Website:** https://gutugaluppo.github.io/colorcut/
- **Download:** [ColorCut 1.0.0](https://github.com/GutuGaluppo/colorcut/releases/tag/v1.0.0) (`ColorCut_1.0.0_aarch64.dmg`, Apple Silicon, macOS 11+)

Image processing runs locally by default. ColorCut has no account, telemetry, or runtime network requirement. The only exception is the optional, paid **Remove with Photoroom** cutout (ADR-014): it sends the image only when you click it.

## Install

Requires an Apple Silicon Mac running macOS 11.0 or newer. Download `ColorCut_1.0.0_aarch64.dmg` from the [1.0.0 release](https://github.com/GutuGaluppo/colorcut/releases/tag/v1.0.0) (or the latest one on the [Releases page](https://github.com/GutuGaluppo/colorcut/releases)) and drag ColorCut into Applications.

Releases are currently **unsigned and not notarized** (no Apple Developer ID is used), so macOS blocks the first launch. To open it, go to **System Settings → Privacy & Security** and click **Open Anyway** next to the ColorCut message (on macOS 11–14, Control-click the app and choose **Open** also works). Each release's notes list the DMG's SHA-256 checksum and the exact steps; verify the download with `shasum -a 256 <file>.dmg` first.

An app you build yourself with the steps below is not marked as downloaded, so macOS does not show this warning for it. Building is subject to the terms in [LICENSE](LICENSE).

## Development

Requirements: macOS 11.0 or newer, Node.js, pnpm, Rust, and the Tauri 2 platform prerequisites.

```bash
pnpm install
pnpm fetch-models   # downloads the background-removal ONNX model (~170 MB, not committed)
pnpm tauri dev
```

Browser-only UI development:

```bash
pnpm dev
```

## Validate

```bash
pnpm typecheck
pnpm test
pnpm build
cd src-tauri
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
```

The CoreML-backed test needs normal access to macOS temporary directories. If it fails only with a temporary-directory permission error inside a sandbox, rerun `cargo test` in a regular terminal.

## Package for macOS

Fetch the pinned model before packaging, then build and verify the release artifacts:

```bash
pnpm fetch-models
pnpm tauri build
./scripts/verify-release.sh
```

Artifacts are written to:

- `src-tauri/target/release/bundle/macos/ColorCut.app`
- `src-tauri/target/release/bundle/dmg/ColorCut_<version>_aarch64.dmg`

Local builds are unsigned unless an approved Apple signing identity and notarization credentials are configured. See [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) before distributing a build.

## Implemented

- PNG/JPEG/WebP import through picker, drag-and-drop, and clipboard.
- Local background removal using `isnet-general-use`, ONNX Runtime, and CoreML.
- Original/cutout preview, comparison slider, side-by-side view, backgrounds, and zoom.
- Original/subject median-cut palettes with 4/6/8/12/16 colors.
- HEX, RGB, HSL, OKLCH, percentages, clipboard copy, and JSON/CSS/TXT/PNG-strip exports.
- Transparent cutout export in PNG and WebP.
- Typed frontend/native boundary, accessible states, tests, and macOS bundle configuration.

Architecture and product constraints live in [IMPLEMENTATION.md](IMPLEMENTATION.md), [AGENTS.md](AGENTS.md), and [docs/DECISIONS.md](docs/DECISIONS.md). Model evaluation and licensing notes live in [docs/MODEL_NOTES.md](docs/MODEL_NOTES.md).

## License

ColorCut is proprietary software. Copyright (c) 2026 Gutu Galuppo. All rights reserved — see [LICENSE](LICENSE). Bundled third-party components (including the Apache-2.0 `isnet-general-use` model) and their licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
