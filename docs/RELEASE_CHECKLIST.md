# ColorCut release checklist

Use this checklist for macOS release candidates. Generated bundles and model binaries remain uncommitted.

## 1. Release decisions

- [ ] Confirm the release version and update it consistently in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`.
- [ ] Confirm the release still targets Apple Silicon and macOS 11.0 or newer.
- [ ] Confirm the product license and copyright owner before public distribution (`LICENSE`, `THIRD_PARTY_NOTICES.md`; regenerate the notices if dependencies changed).
- [ ] Decide the distribution path in §6: unsigned pre-release, or signed and notarized. Obtain explicit approval before configuring Apple signing or notarization.

Decisions already recorded for **1.0.0** (`docs/DECISIONS.md` ADR-013): version `1.0.0`; proprietary license, all rights reserved, copyright Gutu Galuppo; unsigned pre-release distribution because no Apple Developer identity is available. Re-confirm these for any later release.

Never commit certificates, signing identities, notarization credentials, API keys, or the ONNX model.

## 2. Clean inputs

```bash
git status --short
pnpm install --frozen-lockfile
pnpm fetch-models
md5 -q src-tauri/resources/models/isnet-general-use.onnx
```

The expected model checksum is `fc16ebd8b0c10d971d3513d564d01e29`.

## 3. Automated validation

```bash
pnpm typecheck
pnpm test
pnpm build
(
  cd src-tauri
  cargo fmt --check
  cargo clippy --all-targets --all-features -- -D warnings
  cargo test
)
```

Record the exact test totals and any warnings in the release notes.

## 4. Manual QA

Use rights-safe local images covering hair, products, foliage, dark-on-dark subjects, translucent material, tiny files, and high-resolution files.

- [ ] Import PNG, JPEG, and WebP using Open, drag-and-drop, and clipboard.
- [ ] Confirm the source file is unchanged after every operation and export.
- [ ] Remove a background and confirm dimensions, orientation, transparency, and edge quality.
- [ ] Exercise Original, Cutout, Slider, and Side by side at minimum/default/maximum zoom.
- [ ] Exercise checker, white, and black preview backgrounds.
- [ ] Extract Original and Subject palettes at 4, 6, 8, 12, and 16 colors.
- [ ] Copy HEX/RGB/HSL/OKLCH values using only the keyboard.
- [ ] Export cutouts as PNG and WebP; confirm dimensions and alpha.
- [ ] Export palettes as JSON, CSS, TXT, and PNG strip; inspect every output.
- [ ] Confirm loading, empty, success, cancellation, and recoverable-error states.
- [ ] Confirm no image path or private image content appears in logs.
- [ ] Disable networking and repeat background removal and palette extraction.

## 5. Build and inspect

```bash
pnpm tauri build
./scripts/verify-release.sh
```

Expected unsigned artifacts:

- `src-tauri/target/release/bundle/macos/ColorCut.app`
- `src-tauri/target/release/bundle/dmg/ColorCut_<version>_aarch64.dmg`

The verification script checks the bundle identifier, version metadata, icon, executable architecture, packaged model checksum, DMG integrity, and code-signing status. Set `REQUIRE_SIGNED=1` only for an approved signed release.

If the build fails only at "Running bundle_dmg.sh" (the `.app` bundle logs as built before that step runs), this is known, occasional flakiness in the third-party Finder-automation script Tauri vendors for DMG creation, not a project bug — see `docs/DECISIONS.md` ADR-012. Just re-run `pnpm tauri build`. It fails more often the busier the machine is (multiple builds back to back, other apps competing for Finder). If it fails *every* time, check for a stray mounted volume first (`hdiutil info`, look for a `ColorCut`-named read-write image) and detach it before retrying.

## 6. Distribution path

Notarization and Developer ID signing require the paid Apple Developer Program; there is no free equivalent. Pick one path per release.

### 6a. Unsigned pre-release (used for 1.0.0, ADR-013)

The bundle carries only Tauri's ad-hoc signature, so Gatekeeper warns on any Mac that downloads it. Never describe this build as signed or notarized.

- [ ] Do **not** set `REQUIRE_SIGNED`. `./scripts/verify-release.sh` should end with the "bundle is unsigned" warning and nothing else failing.
- [ ] Record the DMG SHA-256 printed by the script.
- [ ] On a second Mac, download the DMG through a browser (so it gets the quarantine attribute), drag the app to Applications, and confirm the documented install steps work end to end: Gatekeeper blocks the first launch, then **System Settings → Privacy & Security → Open Anyway** opens it, and `xattr -dr com.apple.quarantine /Applications/ColorCut.app` also works.
- [ ] Confirm the release notes' install instructions match what you just saw on that Mac.

### 6b. Signed and notarized (only once a Developer ID identity exists)

- [ ] Configure signing only through local/keychain or CI secrets; never through tracked files.
- [ ] Build the final artifact with hardened runtime and the approved identity.
- [ ] Verify with `codesign --verify --deep --strict --verbose=2 ColorCut.app`.
- [ ] Verify Gatekeeper acceptance with `spctl --assess --type execute --verbose=4 ColorCut.app`.
- [ ] Submit for notarization, wait for acceptance, and staple the ticket to the distributed artifact.
- [ ] Run `REQUIRE_SIGNED=1 ./scripts/verify-release.sh` against the final bundle.

## 7. GitHub release

- [ ] Tag the released commit (`v<version>`).
- [ ] Create release notes from `docs/RELEASE_NOTES_TEMPLATE.md`, keeping only the section that matches the path used in §6.
- [ ] Attach the DMG and its SHA-256 checksum. For §6a, mark the GitHub release as a **pre-release**; clear that flag only after a signed and notarized build replaces it.
- [ ] State architecture, minimum macOS version, and (for §6a) that the build is unsigned, with the install steps.
- [ ] Describe local-only processing, the bundled model license, and the proprietary license (`LICENSE`, `THIRD_PARTY_NOTICES.md`).
- [ ] Install the uploaded DMG on a separate supported Mac before announcing the release.
