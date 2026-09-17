# ColorCut starter

Initial Tauri + React + TypeScript scaffold for **ColorCut**, a local-first palette and cutout utility.

## Start

Requirements: Node.js, pnpm, Rust, and the Tauri 2 platform prerequisites for macOS.

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
cd src-tauri && cargo fmt --check && cargo test
```

## Current state

- Functional React shell with fit/zoom preview.
- File-picker, drag/drop, and clipboard import flow.
- Zustand state and cleanup.
- Typed Tauri adapter.
- Background removal is implemented locally (`isnet-general-use` via `ort` + CoreML — see `docs/DECISIONS.md` ADR-005 and `docs/MODEL_NOTES.md`), with PNG export.
- Palette extraction is still a placeholder.

Read `IMPLEMENTATION.md` and `AGENTS.md` before continuing.

