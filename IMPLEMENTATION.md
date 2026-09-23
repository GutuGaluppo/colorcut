# ColorCut — Implementation Guide

> `palette + cutout utility`

ColorCut is a local-first, macOS-first desktop utility for two focused jobs:

1. remove image backgrounds accurately;
2. extract, inspect, copy, and export useful color palettes.

The product should feel small, precise, calm, and premium. It must not evolve into a generic image editor without an explicit product decision.

## 1. Product contract

### Core outcomes

- Import an image by file picker, drag-and-drop, or clipboard.
- Produce a transparent cutout locally.
- Compare original and cutout without leaving the main window.
- Extract a weighted palette from the original image or visible subject pixels.
- Copy individual values and export image/palette results.

### MVP non-goals

- Cloud processing, accounts, sync, or analytics.
- Layer, timeline, typography, filter, or freeform canvas systems.
- Batch processing, resize, compression, conversion, or upscale.
- Manual erase/restore brushes and advanced edge cleanup.

Those capabilities may be explored after the MVP but must not shape the first architecture beyond clean service boundaries.

## 2. Approved identity

### Brand

- Name: **ColorCut**
- Descriptor: **palette + cutout utility**
- Character: local-first, precise, simple, robust, modern, macOS-native.
- Visual direction: **Third Exploration**.
- Icon direction: **C — Layered Leaf**.

The icon combines a layered organic leaf, translucent overlap, vivid color, and a transparency/checkerboard cue. It must remain legible at Dock and toolbar sizes.

### Color tokens

| Role | Value |
| --- | --- |
| Blue | `#2F8CFF` |
| Cyan | `#28C7E8` |
| Green | `#45D98C` |
| Yellow | `#F4D541` |
| Coral | `#FF7A5C` |
| App background | `#F7F8FA` |
| Surface | `#FFFFFF` |
| Soft surface | `#F1F3F7` |
| Border | `#E6EAF0` |
| Primary text | `#111827` |
| Secondary text | `#667085` |
| Tertiary text | `#98A2B3` |

Bright colors are accents, not large UI backgrounds. The interface remains quiet, spacious, and readable.

## 3. Technical direction

### Stack

- Tauri 2 desktop shell.
- Rust native layer and image-processing boundary.
- React + TypeScript + Vite frontend.
- Zustand for small, explicit client state.
- CSS variables and component CSS for the initial design system.
- Lucide for interface icons.
- Vitest + Testing Library for frontend behavior.
- Rust unit/integration tests for deterministic image and color logic.

Tailwind may be introduced only if the team decides it materially improves delivery. The starter intentionally uses CSS variables to keep the first dependency graph and visual system transparent.

### Architectural rules

- UI components never call Tauri directly; use `src/lib/tauri/commands.ts`.
- Heavy image operations belong in Rust.
- Domain data lives in typed models, not component-local ad hoc shapes.
- Services return structured success/error payloads.
- Processing must not block the renderer.
- The model integration stays behind `BackgroundRemovalService` so the model/runtime can change.
- Palette extraction ignores near-transparent pixels and reports normalized weights.

## 4. Target architecture

```text
React UI
  -> feature actions
    -> typed Tauri adapter
      -> focused Rust commands
        -> domain services
          -> image I/O / inference / palette engine / export
```

Temporary outputs are created in the app cache directory. User-selected exports are copied to an explicit destination. Never overwrite source images.

## 5. Repository map

```text
colorcut-starter/
├── src/
│   ├── app/                    # app composition
│   ├── components/             # reusable presentation components
│   ├── features/               # import, cutout, palette, export boundaries
│   ├── lib/tauri/              # only frontend/native bridge
│   ├── store/                  # Zustand state and actions
│   ├── styles/                 # tokens and global/component styles
│   └── types/                  # domain contracts
├── src-tauri/
│   ├── capabilities/           # minimum Tauri permissions
│   ├── resources/models/       # local model location; binaries are not committed
│   └── src/
│       ├── commands/           # thin command handlers
│       ├── models/             # serializable Rust contracts
│       └── services/           # domain and processing logic
├── docs/                       # decisions, model evaluation, brand notes
├── AGENTS.md                   # shared operating rules
├── CLAUDE.md                   # routes Claude Code to AGENTS.md
└── IMPLEMENTATION.md           # this roadmap
```

## 6. Domain contracts

### Frontend

```ts
type ImageAsset = {
  id: string;
  sourceUrl: string;
  fileName: string;
  width: number;
  height: number;
  mimeType: string;
  fileSizeBytes: number;
};

type RemovalResult = {
  cutoutPath: string;
  previewUrl?: string;
  maskPath?: string;
  processingTimeMs: number;
};

type PaletteColor = {
  id: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  oklch?: { l: number; c: number; h: number };
  percentage: number;
};
```

The Rust equivalents use `serde` and camelCase serialization. Additive schema changes are preferred. Breaking changes require an entry in `docs/DECISIONS.md`.

## 7. Main window

### Top bar

- Product identity.
- Open image.
- Paste.
- Remove background.
- Extract palette.
- Export.

### Preview workspace

- Empty/drop state.
- Image viewport with fit and zoom.
- Checkerboard, white, black, and solid background modes.
- Before/after slider and side-by-side comparison.
- Non-blocking processing overlay.

### Inspector

- File metadata.
- Cutout actions and preview settings.
- Palette source: Original / Subject.
- Color count: 4 / 6 / 8 / 12 / 16.
- Swatches and technical values.
- Copy/export actions.

### Status bar

- Filename and dimensions.
- Current operation/status.
- Short success/error feedback.

## 8. Feature specifications

### Image import

Accepted MVP inputs: PNG, JPEG, and WebP. The UI validates MIME type and reports unsupported/invalid inputs. Source files are read-only.

Acceptance criteria:

- File picker, drop, and clipboard produce the same `ImageAsset` state.
- Loading a new image clears stale cutout and palette results.
- Object URLs are revoked when replaced or when the app unmounts.
- Metadata and preview appear without blocking the window.

### Background removal

Use a locally packaged segmentation model through an isolated Rust service. Model selection is a milestone, not an assumption: benchmark candidate ONNX models on people, products, hair/fur, plants, and hard-edged objects on Apple Silicon. Record license, bundle size, latency, memory, and output quality in `docs/MODEL_NOTES.md` before adopting one.

Service boundary:

```text
BackgroundRemovalService
- initialize()
- remove_background(input_path)
- create_rgba_output(image, mask)
- export_result(source, destination, format)
```

Acceptance criteria:

- All processing is local.
- The renderer stays responsive.
- Transparent output preserves original pixel dimensions by default.
- Errors are recoverable and do not discard the imported source.
- PNG works before WebP is considered complete.

### Palette extraction

Start with a deterministic quantization implementation. Median cut is acceptable for the first vertical slice; k-means or a perceptual-space refinement can follow after visual evaluation.

Rules:

- Allow 4, 6, 8, 12, or 16 colors; default to 8.
- For Subject mode, ignore pixels below an alpha threshold.
- Merge perceptually near-duplicate clusters.
- Sort by relative pixel weight.
- Ensure percentages sum to approximately 100% after rounding.
- Return HEX, RGB, HSL, OKLCH, and relative percentage.

Palette exports: clipboard, JSON, CSS custom properties, TXT, and a simple PNG strip.

## 9. UI states

Every primary feature must implement:

- idle;
- disabled/no image;
- processing;
- success;
- recoverable error.

Errors use concise user language, with technical detail available separately for debugging. Avoid color-only status communication. All interactive controls require visible keyboard focus.

## 10. State strategy

The single Zustand store is initially small and divided conceptually into:

- image state;
- removal state;
- palette state;
- preview preferences;
- transient UI feedback.

Do not persist source image paths or sensitive file data automatically. Persist only harmless preferences later, such as palette count or preview background.

## 11. Tauri command surface

Planned commands:

```text
get_image_metadata
remove_background
extract_palette
export_cutout
export_palette
```

Post-MVP, per ADR-014 (Phase 6):

```text
remove_background_cloud
set_photoroom_license
get_photoroom_license_status
```

Commands should be thin: validate input, invoke a service, map errors, and return a typed DTO. Clipboard and file selection may use official Tauri plugins where that gives better native behavior.

## 12. Security and privacy

- No network permission for MVP runtime. **Exception (ADR-014, Phase 6):** the opt-in, paid Photoroom cloud cutout adds one narrowly-scoped network capability to the owner's own Cloudflare Worker domain only — never to `sdk.photoroom.com` directly, and never enabled unless the user explicitly triggers that feature. All other flows remain fully offline.
- Minimum Tauri capabilities only.
- No arbitrary shell execution.
- Canonicalize and validate file paths at the native boundary.
- Validate decoded image dimensions before expensive allocation.
- Cap unreasonable input sizes with an actionable message.
- Treat model and image decoding failures as untrusted-input errors.
- Do not log image bytes, paths, or palette source data in production. The same applies to the Photoroom cloud path's proxy: it forwards bytes and returns bytes, with no logging or storage of user images (ADR-014).

## 13. Testing strategy

### Frontend

- Import validation and state resets.
- Main action enable/disable rules.
- Palette formatting and copy behavior.
- Preview mode state changes.
- Error and progress feedback.

### Rust

- Color conversion fixtures.
- Quantization determinism and percentage totals.
- Alpha-threshold filtering.
- Image dimension/format validation.
- Export preserves dimensions and transparency.
- Service errors map to stable command errors.

### Manual QA set

Maintain a small local, rights-safe set containing:

- person with hair;
- product on plain background;
- foliage/organic edges;
- dark subject on dark background;
- translucent or reflective material;
- tiny and high-resolution files.

Do not commit private user images.

## 14. Delivery phases

### Phase 0 — Foundation

- Initialize Tauri, React, TypeScript, and Vite.
- Apply tokens and shell layout.
- Add state, command adapter, linting, and tests.

Exit: app launches as a native window and the empty state is polished.

### Phase 1 — Import and preview

- File picker, drop, and clipboard.
- Metadata and preview.
- Background modes, fit, and basic zoom.

Exit: all three import paths share one validated flow.

### Phase 2 — Background-removal vertical slice

- Benchmark and document model decision.
- Implement preprocessing, inference, alpha mask, and RGBA output.
- Show progress and transparent preview.
- Export PNG.

Exit: at least one representative image completes fully offline.

### Phase 3 — Palette vertical slice

- Extract original and subject palettes.
- Add count/source controls, swatches, and table.
- Copy values and export JSON/CSS/TXT.

Exit: outputs are deterministic and percentages/colors are validated.

### Phase 4 — Comparison and export polish

- Slider and side-by-side modes.
- WebP and palette-image export.
- Keyboard paths, toasts, and edge cases.

Exit: all MVP criteria pass and the product feels cohesive.

### Phase 5 — Packaging

- Integrate final icon assets.
- Configure signing/notarization when distribution requires it.
- Create release checklist and GitHub release assets.

Exit: a clean checkout can build a distributable macOS bundle.

### Phase 6 — Photoroom cloud cutout (premium add-on, post-MVP, per ADR-014)

Not part of the MVP; an explicit, scoped exception to the local-first non-negotiable rule, approved by the product owner. See `docs/DECISIONS.md` ADR-014 for the full decision, reasoning, and pricing.

**Owner actions (outside this repo, prerequisite to the app work below):**

1. Pick and set up the payment platform for credit-pack sales (Lemonsqueezy recommended for its license-validation API) and create the 50/100/250-credit products at $1.99/$3.29/$7.19.
2. Create the Cloudflare account/Worker project and a KV namespace for credit balances.
3. Write and deploy the Worker: receives an image + license code, validates the code against the payment platform's license API, checks/decrements the KV credit balance, forwards the image to `https://sdk.photoroom.com/v1/segment` (`format=png&channels=rgba&size=full&crop=false`) using the real Photoroom key (provisioned as a `wrangler secret`, never committed), and streams the resulting PNG straight back — no logging or storage of the image at any step.
4. Set a spend cap/budget alert on the Photoroom key from the Photoroom dashboard (defense in depth, not a substitute for the Worker's own credit check).
5. Smoke-test the Worker directly (valid code + credit, invalid code, zero credit, Photoroom down) before wiring the app to it.

**App work (this repo):**

6. Add a Tauri network capability scoped to the Worker's domain only (`src-tauri/capabilities/`).
7. Add `PhotoroomRemovalService` in Rust (`src-tauri/src/services/`), same typed-DTO success/error pattern as `BackgroundRemovalService`, calling the Worker (not Photoroom directly) and mapping its error responses (invalid license, no credit, network/Worker/Photoroom unreachable) to stable command errors.
8. Add the `remove_background_cloud`, `set_photoroom_license`, and `get_photoroom_license_status` Tauri commands (§11), thin per the existing convention.
9. Add a Settings surface for the user to paste their license code (stored locally as a plain config value — it identifies a purchase, it is not a secret that needs keychain-grade protection).
10. Add a separate, explicitly-labeled "Cloud cutout" action next to the existing local "Remove background" button; never substitutes for it.
11. Add the offline/unreachable explanatory modal: an instant `navigator.onLine` check for immediate feedback, plus handling the request's own network-class failures the same way (since `navigator.onLine` misses cases like a captive portal), with a "use local removal instead" action. Distinguish this from a "Worker/Photoroom is down" error, which is a different message (see ADR-014 caveats).
12. Add the no-credit / invalid-license states (idle/disabled/processing/success/error, matching §9's pattern) with a link to buy more credits.

Exit: a user with a valid license and credit balance can produce a cloud cutout end-to-end (button → Worker → Photoroom → transparent PNG in the preview), offline/no-credit/invalid-license all produce clear recoverable-error UI, and local removal is provably unaffected (existing Rust/frontend test suites still pass unchanged).

## 15. MVP definition of done

All items below are met, verified against the packaged `.app` (not only `pnpm tauri dev`) during the manual QA pass recorded in `docs/DECISIONS.md` ADR-006 through ADR-012.

- [x] PNG/JPEG/WebP import works by open, drop, and clipboard.
- [x] Background removal runs locally without freezing the UI.
- [x] Transparent PNG exports at original dimensions.
- [x] Original and Subject palette modes work.
- [x] 4/6/8/12/16-color choices work.
- [x] HEX/RGB/HSL/OKLCH and percentages are displayed and copyable.
- [x] JSON/CSS/TXT palette exports work.
- [x] Empty, loading, success, and error states are accessible.
- [x] No runtime network requirement or authentication exists.
- [x] Frontend and Rust test suites pass.
- [x] Setup and model licensing are documented.
- [x] The app remains a focused single-window utility.

This list describes the shipped 1.0.0 MVP and is not retroactively changed by Phase 6 (§14): the Photoroom cloud cutout is an explicit, opt-in, post-MVP exception approved via `docs/DECISIONS.md` ADR-014, not a revision of what "no runtime network requirement" meant at 1.0.0.

## 16. Risks and decision gates

| Risk | Mitigation / gate |
| --- | --- |
| Model quality varies | Benchmark a documented image set before committing. |
| Runtime or model inflates bundle | Measure size; quality wins for MVP, optimize later. |
| Apple Silicon inference friction | Prove packaging on a clean Mac before UI polish is declared complete. |
| Naive palettes feel muddy | Cluster in a perceptual space or add a refinement pass after baseline evaluation. |
| Native/renderer contract drifts | Keep shared fixtures and typed adapters; document breaking changes. |
| Feature creep | Apply AGENTS.md non-goals and require explicit scope changes. |

## 17. First execution sequence

1. Run `pnpm install`.
2. Run `pnpm tauri dev` and confirm the shell launches.
3. Complete and test file-picker, drop, and clipboard import.
4. Replace Rust command placeholders one vertical slice at a time.
5. Evaluate and record the background-removal model before adding its binary.
6. Implement transparent PNG output before secondary export formats.
7. Add palette extraction and its exports.
8. Finish accessibility, packaging, and release checks.

## 18. Immediate task

All MVP phases (§14, Phases 0–5) and the definition of done (§15) are complete and verified for 1.0.0. Release-gate work (`docs/RELEASE_CHECKLIST.md` §§1, 6, and 7) is separately tracked and still needs a human decision or Apple credentials an agent can't supply.

The active feature work is **Phase 6 — Photoroom cloud cutout** (§14), approved in `docs/DECISIONS.md` ADR-014. The owner-side prerequisites (payment platform, Cloudflare Worker + KV, Photoroom production key) are steps 1–5 of that phase and are not agent-automatable. Steps 6–12 (Tauri capability, `PhotoroomRemovalService`, commands, Settings license field, cloud button, offline/error modals) are in progress against a placeholder Worker URL until the real one exists.

Any new feature work from here (e.g. a stronger background-removal model, manual touch-up tools, batch processing) is post-MVP scope per `AGENTS.md` non-goals and needs an explicit product decision before starting.

