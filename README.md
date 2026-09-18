# ColorCut

A focused, local-first macOS utility for background removal and palette extraction.

All image processing runs locally. ColorCut has no account, cloud upload, telemetry, or runtime network requirement.

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
