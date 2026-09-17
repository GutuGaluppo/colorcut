# ColorCut starter

Initial Tauri + React + TypeScript scaffold for **ColorCut**, a local-first palette and cutout utility.

## Start

Requirements: Node.js, pnpm, Rust, and the Tauri 2 platform prerequisites for macOS.

```bash
pnpm install
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

- Functional React shell.
- File-picker, drag/drop, and clipboard preview flow.
- Zustand state and cleanup.
- Typed Tauri adapter.
- Rust command/service placeholders.
- Background removal and production palette extraction are intentionally not implemented yet.

Read `IMPLEMENTATION.md` and `AGENTS.md` before continuing.

