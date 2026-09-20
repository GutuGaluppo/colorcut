# AGENTS.md — ColorCut

This file is the shared operating contract for Codex, Claude Code, and human contributors. Read `IMPLEMENTATION.md` before modifying the project.

## Mission

Build ColorCut as a focused, local-first macOS utility that:

1. removes image backgrounds precisely;
2. extracts and exports useful color palettes.

Protect the product's small scope, privacy, responsiveness, and visual quality.

## Source of truth

Use this precedence when instructions conflict:

1. the user's current request;
2. this `AGENTS.md`;
3. `IMPLEMENTATION.md` product and architecture decisions;
4. `docs/DECISIONS.md` accepted technical decisions;
5. existing implementation and tests.

Ask before making a choice that changes product scope, privacy, persistence, distribution, or the inference model.

## Non-negotiable product rules

- Local processing by default; no cloud API, upload, account, or telemetry.
- Single-window, focused workflow.
- Never overwrite the user's source image.
- Do not build generic editing features during the MVP.
- Preserve the approved Fresh & Playful palette and Layered Leaf direction.
- Use vivid color sparingly against neutral, quiet surfaces.
- Keep all primary workflows keyboard-accessible and never rely on color alone.

## Architecture boundaries

- React components do not import Tauri APIs directly.
- Frontend/native calls go through `src/lib/tauri/commands.ts`.
- CPU-heavy image work belongs in Rust services, not the renderer.
- Tauri commands validate/map data and delegate; they do not contain domain algorithms.
- TypeScript domain types live in `src/types`.
- Rust serializable contracts live in `src-tauri/src/models`.
- Keep background-removal runtime/model details behind a service boundary.
- Add dependencies only when they remove meaningful complexity.

## Work protocol for Codex and Claude Code

Before coding:

1. Read this file and the relevant section of `IMPLEMENTATION.md`.
2. Inspect the current worktree; preserve unrelated user changes.
3. State the smallest testable outcome for the task.
4. Identify files likely to change.

While coding:

1. Work in a vertical slice that leaves the app runnable.
2. Do not let two agents edit the same file concurrently.
3. Prefer small, reviewable diffs over broad rewrites.
4. Keep frontend/native contracts typed and synchronized.
5. Add or update tests with behavior changes.
6. Record non-obvious decisions in `docs/DECISIONS.md`.

Before handoff:

1. Run the relevant validation commands.
2. Summarize files changed and observable behavior.
3. Report tests run and their exact result.
4. List unresolved risks or placeholders.
5. Give one concrete next task.

Never claim that a model, export format, platform build, or test works unless it was actually exercised.

## Coordination roles

Roles are temporary task boundaries, not permanent ownership.

### Product/UI slice

- React layout, interactions, visual states, keyboard behavior.
- Uses typed mock/service results; does not hide native TODOs.

### Native/image slice

- Rust commands, decoding, inference, masking, quantization, export.
- Publishes stable DTOs and error variants before UI integration.

### Verification slice

- Tests contracts and real user flows.
- Checks source-file safety, transparency, dimensions, and offline behavior.

For a multi-agent session, assign disjoint files or directories and nominate one integrator. The integrator resolves interface changes and runs the final checks.

## Required checks

Use the checks relevant to the change:

```bash
pnpm typecheck
pnpm test
pnpm build
cd src-tauri && cargo fmt --check
cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings
cd src-tauri && cargo test
```

For Tauri/runtime changes, also run `pnpm tauri dev` or `pnpm tauri build` on a supported machine and report which one ran.

## Definition of a good change

- It solves the requested behavior without expanding scope.
- It preserves or improves type safety and clear boundaries.
- It includes useful loading, empty, success, and failure states.
- It is accessible by keyboard and understandable without color alone.
- It does not expose paths, image data, or other private content in logs.
- It adds no unexplained warnings, dead code, or silent fallback.
- Its verification is reproducible.

## Security and file handling

- Treat imported files as untrusted.
- Validate formats, decoded dimensions, and allocation limits.
- Canonicalize native paths and use least-privilege Tauri capabilities.
- Do not execute arbitrary shell commands from the app.
- Do not commit model binaries until license and distribution terms are documented.
- Do not commit private sample images, secrets, signing identities, or generated exports.

## Scope requiring explicit approval

- Cloud or third-party processing.
- Accounts, sync, telemetry, or analytics.
- Persistent recent-file history.
- Batch processing or new editing tools.
- A different UI framework or state-management library.
- A chosen inference model/runtime added to production.
- Any breaking command or DTO change.

## Current priority

Phases 1–5 (import/preview, background removal, palette extraction, comparison/export polish, macOS packaging) are complete and verified against `docs/RELEASE_CHECKLIST.md` §§1–5, including a manual QA pass against the packaged `.app` (not just `pnpm tauri dev`) that found and fixed several release-build-only bugs — see `docs/DECISIONS.md` ADR-005 through ADR-012.

What's left is cutting the 1.0.0 release, decided in `docs/DECISIONS.md` ADR-013: version `1.0.0`, proprietary license (Gutu Galuppo), distributed as an **unsigned pre-release** because no Apple Developer identity is available. Follow `docs/RELEASE_CHECKLIST.md` §§5–7 using the unsigned path (§6a). Do not configure Apple signing or notarization without explicit approval and a Developer ID from the owner (§6b).

A known, accepted (not a bug to fix) limitation: `isnet-general-use` can under-detect a plain, low-texture light garment against a light background (see the ADR-005 follow-up note). Revisit only via the model-benchmark process in `docs/MODEL_NOTES.md`, not by re-tuning the current pipeline further — that was already tried and ruled out.

