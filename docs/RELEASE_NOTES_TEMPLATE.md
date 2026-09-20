# ColorCut vX.Y.Z

ColorCut removes image backgrounds and extracts reusable palettes locally on macOS. Images remain on the device; no account or network connection is required at runtime.

## Highlights

- Background removal changes
- Palette extraction changes
- Comparison/export changes
- Accessibility and reliability changes

## Compatibility

- Architecture: Apple Silicon (`arm64`)
- Minimum macOS: 11.0
- Bundle: signed and notarized / **unsigned pre-release build** (keep one)

## Install

<!-- Keep this section only for an unsigned build (docs/RELEASE_CHECKLIST.md §6a); delete it for a signed and notarized release. -->

This build is **not signed or notarized** — it does not use an Apple Developer ID — so macOS Gatekeeper blocks the first launch. That is expected. To open it:

1. Open the downloaded `.dmg` and drag **ColorCut** into **Applications**.
2. Try to open ColorCut. macOS will refuse to open it and tell you it could not verify the app.
3. Open **System Settings → Privacy & Security**, scroll to the Security section, click **Open Anyway** next to the ColorCut message, and confirm with your password or Touch ID.

On macOS 11–14 you can instead Control-click ColorCut in Applications and choose **Open**.

Alternatively, from Terminal (removes the download quarantine flag):

```bash
xattr -dr com.apple.quarantine /Applications/ColorCut.app
```

Only do this for a copy you downloaded from this repository's Releases page. Verify the download first:

```bash
shasum -a 256 ColorCut_X.Y.Z_aarch64.dmg   # must match the checksum below
```

## Verification

- Frontend tests: X passed
- Rust tests: X passed
- Manual QA set: completed / exceptions documented
- DMG SHA-256: `<checksum>`

## Known limitations

- Add only user-visible limitations that remain in this release.

## License and notices

ColorCut is proprietary software, Copyright (c) 2026 Gutu Galuppo. All rights reserved (see `LICENSE`). Third-party components and their licenses are listed in `THIRD_PARTY_NOTICES.md`.

Background removal uses the Apache-2.0-licensed `isnet-general-use` model through ONNX Runtime and CoreML. Processing is local.
