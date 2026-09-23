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

**Preprocessing hypotheses tested and ruled out for the plain-white-garment cutout gap (2026-09-18):** manual QA found part of a plain white crop top coming back ~18% transparent against a plain pink studio background (verified via alpha-channel histogram on the real photo, not just visually). Tested two plausible preprocessing fixes against that exact photo plus a spot-check of the other 6 diagnostic photos in `original/`, using the existing `diagnostic_reprocess_original_folder` test: (1) letterbox-resize into the 1024×1024 input instead of stretching to a square (avoids distorting subject proportions before inference), and (2) dropping the per-image min-max mask stretch in favor of a plain clamp. Neither changed the shirt region's near-zero-alpha share meaningfully (17.7% → 17.4%) or visibly in an alpha-composited-on-black comparison, and neither moved opacity coverage on the other photos beyond noise (<1pp). Both changes were reverted — no proven benefit, and (2) in particular would have second-guessed the min-max normalization this ADR already verified against the `rembg` reference implementation. Conclusion: this is very likely a genuine `isnet-general-use` limitation on low-texture, low-contrast garments (the model has much less to key on than skin/hair texture), not a preprocessing bug — a fix would mean benchmarking a different/better model per the "Revisit if" note above, not more pipeline tuning here.

## ADR-006 — Comparison stays in the renderer; export encoding stays native

**Status:** Accepted (2026-09-18)

**Decision:** Slider and side-by-side comparison reuse the already-loaded original object URL and native cutout asset URL, with a clamped shared slider position in the Zustand store. Cutout PNG/WebP conversion and the 960×160 equal-segment palette PNG are encoded by Rust services. Native export services allow-list the extensions exposed by the UI instead of inferring arbitrary formats from a destination path.

**Reason:** Comparison is presentation-only and does not justify another native image operation. Encoding belongs outside the renderer, preserves the existing frontend/native boundary, and extension validation keeps IPC behavior aligned with the visible save options.

## ADR-007 — macOS 11.0 and Apple Silicon are the initial distribution baseline

**Status:** Accepted (2026-09-18), approved by product owner

**Decision:** Set `bundle.macOS.minimumSystemVersion` to `11.0` and publish the initial macOS artifacts for Apple Silicon (`arm64`).

**Reason:** The release binary and CoreML path already require macOS 11.0, and Apple Silicon Macs began with macOS 11. Advertising 10.13 in `Info.plist` was therefore inaccurate rather than useful compatibility. A universal or Intel build remains a separate, explicitly tested distribution decision.

## ADR-008 — Manual-QA blockers found before release: drag-and-drop and a CSP-blocked blob fetch

**Status:** Accepted (2026-09-18)

**Found by manual QA (`TESTE_MANUAL_RESULTS.md`):** drag-and-drop import silently did nothing, and both Remove Background and Extract Palette failed with a generic webview "Load failed" error before any other checklist item could be exercised.

**Decision 1 — drag-and-drop:** set `app.windows[0].dragDropEnabled` to `false` in `tauri.conf.json`. Tauri v2 intercepts OS-level file drops before they reach the DOM unless this is disabled; the app's `onDrop`/`onDragEnter` handlers in `App.tsx` were already correct and simply never fired.

**Decision 2 (superseded, kept anyway) — IPC image transfer:** stop sending image bytes as a JSON `Vec<u8>` command argument. `remove_background` and `extract_palette` (Original mode) both serialized the full imported image as `Array.from(bytes)`, which Tauri's IPC bridge JSON-stringifies into one decimal number per byte — a real, wasteful inflation of a several-megabyte photo into tens of megabytes of text on every call. Added `cache_source_image`, a command that takes the invoke call's raw body (`tauri::ipc::Request` / `InvokeBody::Raw`, sent by calling `invoke("cache_source_image", bytes)` with the `Uint8Array` as the whole argument instead of wrapped in an object) and writes it to a new `originals_dir` cache directory, returning a path. `remove_background` and `extract_palette` now take that path and read the file server-side.

**This was not the cause of the "Load failed" error.** Installing the rebuilt app and reproducing manually still failed identically after decision 2 shipped — including on a 787 KB test image, far too small for JSON inflation to plausibly break delivery. Kept decision 2 anyway because it's a real, verified improvement (smaller IPC payloads, no redundant original-bytes transfer in Subject mode), but it was solving a latent problem, not the reported one.

**Decision 3 — the actual cause, found via WebView devtools:** temporarily added the `devtools` Cargo feature to `tauri` (release builds don't get devtools without it; `pnpm tauri dev` does, which is why the bug never reproduced there) and inspected the Console tab. It showed: `Refused to connect to blob:tauri://localhost/<id> because it does not appear in the connect-src directive of the Content Security Policy.` Both `remove_background` and `extract_palette` (Original mode) start by calling `fetch()` on the imported image's `blob:` object URL to read its bytes (`readObjectUrlBytes`). `app.security.csp`'s `img-src` already allowed `blob:` (so the image previews fine) but `connect-src` did not, so the `fetch()` itself was blocked — WebKit surfaces a CSP-blocked fetch as a rejected promise with the message `Load failed`, matching the symptom exactly. Fixed by adding `blob:` to `connect-src`. Tauri does not inject/enforce this CSP for the `pnpm tauri dev` server, only for the built app, which is why manual QA only ever caught this against the packaged `.app`. Reverted the `devtools` feature after confirming the fix; re-add it (temporarily) if a similar release-only bug needs live console inspection again.

**Revisit if:** a future command needs to send large binary data alongside multiple structured fields — decision 2's raw-body path only carries one opaque payload, so params like `count`/`source` still have to travel as normal JSON args on a separate call, as done here. Also revisit `connect-src` if a future fetch target (e.g. a different custom protocol) gets blocked the same way — check the CSP first, not the IPC transport, for any webview-only ("works in dev, fails packaged") failure.

## ADR-009 — Weight median-cut bucket splits by range, not population alone

**Status:** Accepted (2026-09-18)

**Found by manual QA** (real photo in `QA_MANULA_RESULT/`, exported `palette.css`): a portrait against a plain pink studio background produced 14 of 16 palette colors as near-identical pale pink/mauve shades, capturing only 2 real subject tones and missing skin, hair, eye, and clothing variation almost entirely.

**Root cause:** `median_cut::quantize`'s split loop chose which bucket to split next purely by pixel count (`max_by_key(|bucket| bucket.pixels.len())`). A large, low-variance background (most of the frame, narrow color range) has far more pixels than the whole subject combined, so the loop kept re-slicing the background into ever-finer near-duplicate shades long before the subject's much smaller, but far more varied, regions ever got split into their own clusters.

**Decision:** weight the split choice by `population * channel_range` instead of population alone, so a bucket's real color variety competes fairly against a large but visually flat region. Verified against the actual QA photo (16-color extraction): background-only shades dropped from 14/16 to 6/16, with the freed slots going to genuinely distinct skin/hair tones (previously only 2 non-background colors were captured; now 10). Added `median_cut::tests::a_large_low_variance_region_does_not_crowd_out_a_smaller_colorful_subject`, tuned to realistic proportions (16 target colors, subject ~20% of pixels across 4 hues), asserting every subject hue lands in its own cluster.

**Considered and rejected:** also adding a minimum-range-to-split floor (stop splitting a bucket once its range drops below a fixed threshold, as a stand-in for the "merge near-duplicate clusters" rule IMPLEMENTATION.md §8 still defers). Tuning it high enough to meaningfully shrink the background's slot share broke `produces_exactly_the_requested_count_when_enough_variety_exists` (colors 32 apart per channel are legitimately distinct, not near-duplicates) and did not actually fix the synthetic regression test it was meant for. Reverted; the population*range weighting alone was enough to pass all tests and produce a clear, verified improvement.

**Remaining gap:** eye color and denim (both a small fraction of pixels even within the subject) still didn't get their own cluster in the QA photo. Closing that fully likely needs the perceptual-space refinement IMPLEMENTATION.md §8 already flags as a later step (k-means or similar), not another median-cut tuning pass — revisit there if narrower coverage keeps coming up in QA.

## ADR-010 — Comparison slider clips both panes instead of stacking cutout over the original

**Status:** Accepted (2026-09-18)

**Found by manual QA:** dragging the Slider handle moved correctly, but the "after" side never visibly showed the cutout — the workspace looked identical to the plain original at every position.

**Root cause:** `CompareSlider` rendered the original photo as a full-size, always-visible base layer, then placed the cutout PNG on top of it clipped to the revealed portion. Compositing a cutout's alpha channel over that *same* original photo mathematically reconstructs the original exactly, pixel for pixel, everywhere the mask marks background — an RGBA image's transparent pixels just let the identical-colored photo directly beneath them show through unchanged. So the reveal could never look different from the original, regardless of mask quality; this wasn't a broken asset load (confirmed via devtools: the `asset://` cutout `src` and `clip-path` were both correct in the DOM) or a CSS positioning bug.

**Decision:** clip both the original and the cutout panes to complementary halves (`inset(0 0 0 X%)` / `inset(0 100-X% 0 0)`) instead of stacking one over the other. With the opaque original removed from underneath, the cutout's transparent pixels now show the shared `.image-stage` checker/white/black backdrop — the same compositing the plain Cutout view already uses — so the slider reveals an actual visual difference.

**Reason:** any design that composites a foreground extraction over its own source image is a no-op by construction; the backdrop behind the cutout must be independent of the original for a before/after comparison to show anything.

**Follow-up bug from this fix:** dragging the handle sometimes flashed a translucent blue tint across the whole image. Neither `.compare-slider` nor its `<img>`s set `user-select`/`-webkit-user-drag`, so click-dragging over the now-two stacked images could trigger the browser's native text/image selection or drag-ghost, painted in the OS selection-highlight blue. Fixed with `user-select: none` on `.compare-slider`, `-webkit-user-drag: none` / `-webkit-touch-callout: none` on `.compare-slider__layer`, and `draggable={false}` on both `<img>`s.

## ADR-011 — Clipboard paste only reads image data, not a Finder-copied file reference

**Status:** Accepted (2026-09-18)

**Found by manual QA:** clicking "Paste" after copying an image file in Finder (Cmd+C on its icon) always failed with "The clipboard does not contain a supported image."

**Investigated via devtools:** logged `clipboardItems.map(item => item.types)` inside the real `Paste` click (not from the console directly — calling `navigator.clipboard.read()` outside a real user-gesture event handler throws its own unrelated `NotAllowedError` in WebKit, which briefly looked like the bug but was an artifact of testing from the console). The real result: `navigator.clipboard.read()` resolves with exactly one `ClipboardItem`, but its `types` array is empty (`[]]`).

**Root cause:** copying a *file* in Finder puts a file reference on the system pasteboard using a macOS-specific UTI, not image bytes. WebKit's Web Clipboard API doesn't map that reference to any web-standard MIME type, so it exposes the item with no readable `types` at all — there is nothing our code (or any web-standard clipboard read) could have matched against. Copying actual image *data* (Preview's Copy, a browser's Copy Image, a screenshot) does put a real `image/png`-typed blob on the pasteboard and already works.

**Decision:** treat this as a real but out-of-scope-for-now platform limitation, not a code bug to route around. Reading a Finder file reference from the pasteboard would require native `NSPasteboard` access (e.g. a Tauri plugin reading file URLs), which is a bigger, separate feature — not a fix to the existing Web Clipboard-based `getClipboardImage`. Improved the error message instead, since "does not contain a supported image" reads like the clipboard was empty rather than explaining that a copied *file* specifically doesn't work here: it now names Finder-file-copy as the unsupported case and points at Open/drag-and-drop as the working alternative for files already on disk.

**Revisit if:** "paste a copied file" becomes a requested feature — that needs native pasteboard reading, not a Web Clipboard API change, and is a product-scope decision (new native capability), not a quick fix.

## ADR-012 — `pnpm tauri build`'s DMG step is flaky under load; not our code

**Status:** Accepted (2026-09-18)

**Reported:** `pnpm tauri build` intermittently failed at "Running bundle_dmg.sh" (`.app` bundle always succeeded first; only the `.dmg` step failed). Retrying the same build with no changes often succeeded.

**Investigated:** `bundle_dmg.sh` is a vendored copy of the third-party `create-dmg` script (regenerated into `target/release/bundle/dmg/` on every build, not a file we own or can durably patch there). It creates a temporary read-write DMG, mounts it, runs an AppleScript to arrange the Finder window/icons, then detaches and compresses it. The script's own comments acknowledge occasional `osascript` failures with error **-1728 ("Can't get disk")** when Finder hasn't fully caught up to the new mount, and paper over it with a fixed 2-second `sleep`. Confirmed a failure had happened during this session: found an orphaned read-write DMG (`rw.25970.ColorCut_0.1.0_aarch64.dmg`) still mounted at `/Volumes/dmg.7EX3TX` from an earlier failed run. Reading the script: when the AppleScript step fails, it calls its own unmount-with-retry helper (3 attempts, exponential backoff) before exiting — if Finder is still holding the volume open (e.g. it got as far as opening the window before the script-level failure), those retries can also fail, leaving exactly this kind of stale mount behind. Cleaned it up (`hdiutil detach`) along with a second orphaned temp DMG found alongside it; neither was blocking new builds (each run uses a PID-based unique temp filename and `-mountrandom`), but they were untidy leftovers.

**Decision:** don't try to fix or vendor-patch `bundle_dmg.sh` — it's regenerated by the `tauri-bundler` crate on every build, so any local edit would be silently overwritten. Treat this as expected, occasional flakiness of a third-party Finder-automation step, most likely to show up when the machine is busy (several back-to-back builds, other apps/Spotlight competing for Finder's attention — as was the case during this session's rapid rebuild-and-reinstall QA loop). Mitigation is just to retry the build; the `.app` itself is unaffected and `scripts/verify-release.sh` already warns-and-continues when no DMG is present rather than hard-failing.

**Revisit if:** the DMG step starts failing consistently (not intermittently) — that would point at a real environment problem (disk space, `create-dmg`/Xcode CLT version mismatch, System Settings > Privacy blocking Finder scripting) rather than this known timing race.

## ADR-013 — 1.0.0 ships as an unsigned pre-release under a proprietary license

**Status:** Accepted (2026-09-20), approved by product owner

**Decision:** Release version **1.0.0**. License: proprietary, all rights reserved, copyright (c) 2026 Gutu Galuppo (`LICENSE`), with bundled third-party licenses listed in `THIRD_PARTY_NOTICES.md`. Distribution: an **unsigned, non-notarized** DMG published on GitHub and marked as a **pre-release**, with documented Gatekeeper install steps (`docs/RELEASE_NOTES_TEMPLATE.md`, README "Install"). Apple signing and notarization are skipped for this release; `docs/RELEASE_CHECKLIST.md` §6 now has an unsigned path (6a) and keeps the signed path (6b) for when a Developer ID exists.

**Reason:** No Apple Developer identity is available, and notarization and Developer ID signing require the paid Apple Developer Program (there is no free route). The realistic alternatives were paying for the program, or distributing unsigned with honest install instructions; the owner chose the latter. Mac App Store and Homebrew cask distribution were not considered because they also require signed apps. A dependency license scan (294 Rust crates for `aarch64-apple-darwin`, 10 production npm packages) found only permissive licenses plus five MPL-2.0 crates (`cssparser`, `cssparser-macros`, `dtoa-short`, `option-ext`, `selectors`) used unmodified; no GPL or AGPL, so a proprietary license is compatible.

**Caveats to revisit:**
- Pure "all rights reserved" grants recipients no explicit right to run the downloaded app or build it from source. That is the owner's chosen position; if broader use should be allowed (personal use, evaluation), add an explicit grant to `LICENSE` first.
- Marking a `1.0.0` release as a GitHub pre-release is intentional: clear the flag when a signed and notarized build replaces it.
- `THIRD_PARTY_NOTICES.md` is a generated best-effort listing, not per-crate full license text; the `isnet-general-use` attribution rests on this repo's own records (`docs/MODEL_NOTES.md`, ADR-005) and the `rembg` distribution page, not on a separately reviewed upstream NOTICE file. Verify both before a wide public release, or generate full-text attribution with `cargo about`.
- Revisit the whole decision if an Apple Developer ID becomes available: follow `docs/RELEASE_CHECKLIST.md` §6b and drop the pre-release flag.

## ADR-014 — Photoroom cloud cutout as a paid, opt-in add-on to local removal

**Status:** Accepted (2026-09-23), approved by product owner. This is an explicit, scoped exception to `AGENTS.md`'s non-negotiable "local processing by default; no cloud API, upload, account, or telemetry" rule — see Reason below for why it is scoped the way it is. `AGENTS.md`'s "Scope requiring explicit approval" list (cloud/third-party processing; accounts) is the reason this needed an ADR rather than a normal implementation task.

**Decision:**

Add a second, clearly separate background-removal path that calls the Photoroom Remove Background API (`POST https://sdk.photoroom.com/v1/segment`, `format=png&channels=rgba&size=full&crop=false` — the same endpoint and parameters validated in the standalone `scripts/photoroom-benchmark.sh` spike), gated as follows:

- **Local removal (`isnet-general-use`, ADR-005) stays the free, default, always-available path.** Nothing about the existing offline flow changes.
- The Photoroom path is a **separate, explicitly-labeled button/action** ("Cloud cutout" or similar — final copy is a UI-slice decision), never silently substituted for the local one, so the product stays honest about which images leave the device.
- **The Photoroom API key never ships in the app.** It lives only as a server-side secret on **a Cloudflare Worker** the owner runs. `PhotoroomRemovalService` in Rust calls **our Worker endpoint**, not `sdk.photoroom.com` directly, sending the image plus the user's license code; the Worker validates the code and credit balance, forwards the call to Photoroom with the real key, and streams the PNG back. This is the only mechanism that actually prevents key extraction (see the correction note under Caveats — the original build-time-embedded-key design was replaced before any code was written).
- **Platform: Cloudflare Workers + Cloudflare KV, not Vercel — decided 2026-09-23, not "pick at implementation time."** Vercel Functions (Node.js and Edge alike) cap both request and response bodies at a hard **4.5 MB**, enforced platform-wide with no config to raise it (confirmed against `vercel.com/docs/functions/limitations`). Real files from this project's own `Images_QA/` set blow past that in both directions: source JPEGs up to 10.8 MB, and Photoroom's returned RGBA PNGs up to 34 MB for the same benchmark run recorded earlier in this conversation. Routing through Vercel would require a second hop through Vercel Blob (function writes the result to Blob, returns a signed URL, app fetches separately) — extra moving parts and, worse, actual (if brief) image retention, which cuts against the "no retention" stance below. Cloudflare Workers has no comparable low fixed cap for this use case, so it stays the simple "bytes in, bytes out, nothing stored" design with no workaround needed.
- **Gated to paying users via a license code, validated server-side by the Worker — still not a ColorCut account system.** The owner sells a one-time "cloud credit pack" through a merchant-of-record payment platform (e.g. Lemonsqueezy, Paddle, or Gumroad — pick one at implementation time based on current fees/terms and whether it exposes a license-validation API). The user pastes the resulting license code into the app once; on every cloud call, the Worker validates that code (via the payment platform's own license API where available, e.g. Lemonsqueezy's) and checks/decrements a credit count held in **Cloudflare KV**, not on the user's disk. This removes the "delete app data to refill credits" tamper path the client-side-counter design had. It is still not an account system in the `AGENTS.md` sense: no ColorCut login, no profile, no data retained beyond a license code → credit-count mapping.
- **Sold as metered credit packs, not a subscription or unlimited unlock.** Photoroom bills the owner per call with no way to meter individual end users server-side (telemetry is off the table), so an unlimited-usage price would be open-ended liability against a leaked or overused key. A fixed credit count bounds the owner's downside per sale.
- New Tauri network capability scoped to **our proxy's domain only** (not `sdk.photoroom.com` — the app never talks to Photoroom directly once the proxy exists), per the least-privilege rule in `AGENTS.md`'s security section — the first network permission this app has ever requested.
- **Offline/unreachable handling:** clicking the cloud button first does a cheap `navigator.onLine` check for instant feedback, and separately treats the actual request's network-class failures (timeout, DNS, connection refused) the same way, since `navigator.onLine` alone is not reliable (e.g. captive portals). Either path shows an explanatory modal — this feature requires internet, unlike local removal — with a "use local removal instead" action, reusing the existing recoverable-error UI pattern from `IMPLEMENTATION.md` §9.

**Reason:**

The standalone Photoroom benchmark (13→36 images from the `Images_QA/` manual QA set, same categories as ADR-005's local-model benchmark) showed decisively better results than `isnet-general-use` on exactly the cases ADR-005 flagged as weak or unresolved: dark-on-dark subjects, fine hair/flyaway strands, multi-instance scenes (several disconnected objects in one frame), and translucent/reflective subjects (glass, pouring liquid) — all inspected by compositing the real alpha channel over a checkerboard, not just eyeballing the raw PNG. This closes real, previously-accepted gaps (see the "plain-white-garment" limitation noted in ADR-005) without touching the local model or its known-good cases.

Making it free-and-embedded (the option explored before this ADR) would mean the owner pays Photoroom for every user's every click with no revenue offset — the "no telemetry" rule blocks any server-side usage cap, so cost exposure would be unbounded. Gating behind a paid, metered credit pack keeps the owner's worst case bounded (at most the credits sold, times the per-call cost).

A client-embedded key with local-only license verification was considered first specifically to avoid running any infrastructure, but was rejected (see Caveats correction below) because it cannot actually protect the key on an unsigned, non-notarized build (ADR-013) — anyone who extracts it gets unmetered access to the owner's paid Photoroom account. A minimal serverless proxy is the smallest amount of real infrastructure that closes that hole: one stateless function plus a key-value credit store, not a database-backed accounts system, so it stays well short of the "accounts/sync" scope `AGENTS.md` reserves for explicit approval.

**Pricing (baseline math, verify both inputs before shipping):**

Photoroom's Basic plan ("Remove Background" API, the same `/v1/segment` endpoint used here) is billed at **$0.02/image** past the first 10 free production calls (checked against `docs.photoroom.com/api/pricing` on 2026-09-23 — **re-verify at implementation time**, published API pricing can change). Assuming an illustrative merchant-of-record fee of ~5% + $0.50/transaction (Lemonsqueezy/Paddle-style — **re-verify against the actually chosen platform's current terms**) and a 10% buffer on the raw per-image cost (covers retries/failed calls that may still consume a Photoroom credit, plus rounding), the formula used is:

```
buffered_cost = credits × $0.02 × 1.10
price × (1 − fee_%) − fixed_fee = buffered_cost × 1.15   (≈15% margin over buffered cost)
```

| Pack | Buffered cost | Suggested price | Net after MoR fee | Profit | Margin over buffered cost |
| --- | --- | --- | --- | --- | --- |
| 50 credits | $1.10 | **$1.99** | $1.39 | ~$0.29 | ~26% |
| 100 credits (recommended default) | $2.20 | **$3.29** | $2.63 | ~$0.43 | ~19% |
| 250 credits | $5.50 | **$7.19** | $6.33 | ~$0.83 | ~15% |

This is deliberately thin margin, matching "don't lose money, minimal profit" rather than market-rate pricing — it is a cost-recovery mechanism for an already-shipped free product, not a profit center. The 50-credit pack carries relatively more margin only because the platform's flat per-transaction fee doesn't shrink at small sizes; if that's undesirable, drop it and start at 100.

**Correction (2026-09-23, same day, before any implementation started):** the original version of this ADR proposed embedding the Photoroom key directly in the client binary with only local, offline license verification, accepting key-extraction as an unsolved risk mitigated by a Photoroom-side spend cap. That was replaced by the server-side proxy design above (real key never ships to the client) once it was clear the local-only design gave a motivated user on this unsigned build (ADR-013) unmetered access to the owner's paid Photoroom account, not just their own purchased credits. The proxy is the smallest real fix, at the cost of introducing one small piece of infrastructure this project otherwise doesn't have.

**Caveats to revisit:**
- **The proxy itself is a new dependency and failure mode.** If it's down, the cloud path is unusable even with valid credits and a real internet connection — the offline/error modal (see Decision) should read as "cloud cutout unavailable," not specifically "you're offline," since the two are now distinguishable failures worth different copy. Local removal is unaffected either way.
- The Worker's exact implementation (how the license code ties to a KV credit balance, and how the Photoroom key secret is provisioned via `wrangler secret`) is not yet designed — needs its own pass before coding starts. The platform choice itself (Cloudflare Workers + KV) is settled, per the Decision section above.
- Decide whether the proxy strictly forwards bytes (image in, PNG out, no logging/retention of user images) or could ever persist anything — for consistency with `AGENTS.md`'s "treat imported files as untrusted" and the product's local-first ethos, the default should be **no image retention on the proxy**, request-scoped only. State this explicitly wherever the cloud feature is disclosed to users.
- This ADR does not itself edit `AGENTS.md`'s non-negotiable rule text or `IMPLEMENTATION.md` §12 (privacy) — both still read as pure local-first/no-cloud/no-accounts. They need a follow-up edit carving out this one named exception (including that a proxy the owner controls now exists) before implementation starts, since `AGENTS.md` is the shared contract with Codex and should not silently drift out of sync with an accepted ADR.
- Pricing inputs (Photoroom's per-image rate, the chosen payment platform's fee structure) are point-in-time research from this ADR's date — reconfirm both immediately before launch pricing is finalized, not just before writing the checkout integration. The proxy adds a small amount of hosting cost (likely within a free tier at this product's plausible volume, but not zero) that the pricing table above does not itemize separately.
