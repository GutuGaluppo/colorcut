# Architecture decisions

Record accepted decisions here. Keep entries short and append-only.

## ADR-001 — CSS variables before a utility framework

**Status:** Accepted for starter scaffold  
**Decision:** Use CSS variables and component classes initially.  
**Reason:** Keeps the design tokens visible and avoids locking the scaffold to a styling dependency before the component language stabilizes.

## ADR-002 — Native work behind a typed adapter

**Status:** Accepted  
**Decision:** React features call `src/lib/tauri/commands.ts`; components never import Tauri APIs.  
**Reason:** Enables browser UI work, tests, predictable mocks, and controlled native-contract changes.

## ADR-003 — Model selection remains open

**Status:** Superseded by ADR-005  
**Decision:** Do not commit an inference model/runtime until benchmark and licensing notes are complete.  
**Reason:** Quality, packaging, Apple Silicon support, license, and bundle size are product-level tradeoffs.

## ADR-004 — Preview zoom scales relative to the fitted image

**Status:** Accepted  
**Decision:** The workspace zoom control (`useAppStore.zoom`, 25%–400%) applies a CSS `scale()` transform on top of the existing fit-to-container image, rather than computing an absolute pixel zoom against natural dimensions. Zoom resets to 100% whenever a new image is loaded or cleared.  
**Reason:** Keeps the vertical slice small for Phase 1 (fit + basic zoom) without introducing pan/viewport math; "100%" means "fit," matching the empty/idle mental model, not "1 image pixel per screen pixel." Revisit if a later phase needs pixel-accurate inspection (e.g. palette picking on exact pixels).

## ADR-005 — Background removal: `isnet-general-use` via `ort` + CoreML

**Status:** Accepted (2026-09-17), approved by product owner  
**Decision:** `BackgroundRemovalService` (`src-tauri/src/services/background_removal_service.rs`) runs Apache-2.0-licensed `isnet-general-use.onnx` (1024×1024 input, mean 0.5/std 1.0 normalization, no sigmoid, min-max mask normalization — preprocessing verified against the `rembg` reference implementation) through the `ort` crate 2.0.0-rc.13 with the `coreml` + `download-binaries` features, using the CoreML execution provider with **`ComputeUnits::CPUAndGPU`** (not `All`) and `error_on_failure()`. The ONNX session is created lazily on first use and cached in `AppState` behind a `Mutex`, not at app startup. The model file (~170 MB) is not committed to git — `scripts/fetch-models.sh` downloads and MD5-verifies it into `src-tauri/resources/models/`, which is declared as a Tauri bundle resource.  
**Reason:** Full hands-on benchmark against 13 categorized real photos (see `docs/MODEL_NOTES.md`) showed `isnet-general-use` winning decisively on every hard case (dark-on-dark subjects, foliage, tiny files) against `u2netp`. `BiRefNet_lite`, full `BiRefNet`, and `BEN2` were evaluated and rejected: the two BiRefNet variants either take 25+ minutes to compile for the Apple Neural Engine or ~32 s/image without it, and BEN2 has no trustworthy ONNX export with documented preprocessing. The model binary is excluded from git because it exceeds GitHub's 100 MB single-file push limit; a fetch script with a pinned checksum is the simplest option that avoids Git LFS for a single, infrequently-changed asset.  
**`ComputeUnits::CPUAndGPU` instead of `All` (2026-09-17, found in real use, not just benchmarking):** the initial implementation used the default `ComputeUnits::All`, which lets CoreML route the model through the Apple Neural Engine. In practice, `macOS`'s single shared `ANECompilerService` XPC daemon can get stuck mid-compile on an unrelated job (observed here: a killed `BiRefNet_lite` benchmark attempt left it pegged at 100% CPU for 2+ hours, seemingly immune even to `sudo kill -9`, likely SIP-protected) and **every subsequent CoreML session in every app on the machine queues behind it and hangs indefinitely** — this is exactly what surfaced as "Remove background" freezing on the loading state in a real run of the packaged app, unrelated to any bug in this codebase. Forcing `CPUAndGPU` skips ANE specialization entirely, so `isnet` (a comparatively light CNN, not a transformer) never touches that shared queue; verified end-to-end after the switch: model load + inference completed in 5.6 s total in a clean `cargo test` run. This is a robustness trade against a small, unmeasured amount of raw ANE speed — worth it since a frozen "Remove background" button with no error and no way for a user to self-recover is much worse than a slightly slower always-reliable path.  
**Revisit if:** a lighter or higher-quality Apache/MIT model with a trustworthy ONNX export and reasonable CoreML compile time turns up, or if `ort`'s bundled ONNX Runtime binary becomes a packaging/licensing blocker (fall back to `tract`, pure-Rust/CPU-only, per the runtime comparison in `docs/MODEL_NOTES.md`). Also revisit if a future profiling pass shows `CPUAndGPU` latency is worse than acceptable — the fix then is a startup-time `is_available()`/timeout-guarded probe before opportunistically trying ANE, not reverting to an unconditional `All`.  
**EXIF orientation fix (2026-09-17, found comparing real exports):** a phone photo (iPhone, portrait) came back from the cutout as landscape-oriented and at a different resolution than the source. Root cause: `image::load_from_memory` decodes the raw pixel buffer only and ignores the file's EXIF `Orientation` tag — phones commonly store the sensor's native (often landscape) pixel layout plus a tag saying how to rotate it for display, and every other consumer of the file (browsers, `sips`, Photos) applies that tag while the `image` crate does not unless told to. Fixed by decoding through `ImageReader::into_decoder` + `ImageDecoder::orientation()` + `DynamicImage::apply_orientation()` instead of the one-shot `load_from_memory` (see `decode_respecting_exif_orientation` in `background_removal_service.rs`). Verified by reprocessing the same 6 real photos (5 stock photos + 1 phone photo) end-to-end: all now preserve their source dimensions exactly, including the previously-broken phone photo (768×1024 in, 768×1024 out). The 5 stock photos were unaffected by the bug (no EXIF rotation tag) and their cutout quality was unaffected by the `ComputeUnits` change above.

