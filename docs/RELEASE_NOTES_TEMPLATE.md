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
- Bundle: signed and notarized / unsigned development build

## Verification

- Frontend tests: X passed
- Rust tests: X passed
- Manual QA set: completed / exceptions documented
- DMG SHA-256: `<checksum>`

## Known limitations

- Add only user-visible limitations that remain in this release.

## Model notice

Background removal uses the Apache-2.0-licensed `isnet-general-use` model through ONNX Runtime and CoreML. Processing is local.
