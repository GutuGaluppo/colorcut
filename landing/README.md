# ColorCut landing page

Static page (no build step): `index.html`, `styles.css`, `main.js`, and `i18n.js` (PT-BR, EN, ES, DE).

```bash
python3 -m http.server 5310 --directory landing
```

The language comes from `?lang=pt-BR|en|es|de`, then the last choice saved in `localStorage`, then the browser language, and falls back to English.

## Deploy

Published to GitHub Pages at https://gutugaluppo.github.io/colorcut/ by `.github/workflows/pages.yml` on every push to `master` that changes `landing/`. The workflow can also be run by hand from the Actions tab.

## Where the assets came from

- `assets/app/*.webp`: screenshots of the real ColorCut 1.0 React UI (`pnpm dev`) in headless Chrome at 2x scale. Native commands were answered with results from the app's own Rust services, not with made-up data.
- `assets/app/colorcut-demo.{webp,gif}`: the same flow recorded frame by frame (open → remove background → slider → extract palette). Browsers that support animated WebP get the WebP file; the GIF is the fallback.
- `assets/examples/*-after.webp`: cutouts from `BackgroundRemovalService` (`isnet-general-use`, CoreML), resized to 1400 px with no retouching. `*-before.jpg` are the matching originals.
- The portrait (`averie-after.webp`) is a licensed Photoroom (ColorCut Pro) cutout, labeled "Pro" on the page. The local model loses the white top against the light wall (ADR-005 limitation), and that local result is kept as `averie-local.webp` for the local vs Pro comparison. The app screenshots of that photo were captured through the real "Remove with Photoroom" path.
- The palettes and timings in `main.js` come from `palette_service::extract_palette` (8 colors, original and subject). The timings were measured on the Mac that generated the assets. The first run also includes model loading.
- Example photos are from Unsplash. Photographers are credited in the footer.

When you change the UI or the model, capture the assets again so the page keeps showing real output.
