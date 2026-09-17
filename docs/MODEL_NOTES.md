# Background-removal model evaluation

No model is approved yet.

This file has two parts: a **shortlist** of candidates researched from public sources (license, size, format — verifiable without running anything), and the **benchmark table** that can only be filled in by actually running each candidate on Apple Silicon against the manual QA image set from `IMPLEMENTATION.md` §13. No model binary has been downloaded or committed for this evaluation.

## Shortlist (desk research — 2026-09-17)

| Candidate | License | Redistribution | Source | ONNX | Size (ONNX) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| U²-Net (`u2net`) | Apache-2.0 | Free, incl. commercial | [xuebinqin/U-2-Net](https://github.com/xuebinqin/U-2-Net) | Yes (community exports) | ~168 MB | General salient-object segmentation. Baseline reference; superseded in quality by IS-Net from the same author. |
| U²-Net-p (`u2netp`) | Apache-2.0 | Free, incl. commercial | [xuebinqin/U-2-Net](https://github.com/xuebinqin/U-2-Net) | Yes | ~4.6 MB | Distilled version, ~38x fewer params (1.13M) than `u2net`. Runs at 320×320 input — smallest/fastest option, but the lowest edge quality of this group. Keep only as an emergency fallback if every heavier model is too slow even with CoreML. |
| MODNet | Apache-2.0 | Free, incl. commercial | [ZHKKKe/MODNet](https://github.com/ZHKKKe/MODNet) | Yes (official `onnx/` export) | ~25 MB (photographic-portrait variant) | Trimap-free **portrait matting**, not general object segmentation — strong for "person with hair" specifically, weak for "product on plain background" and foliage. Pairing it with a general model conflicts with the single-model/small-scope goal, so only worth it if it's clearly better than IS-Net/BEN2 on hair. |
| IS-Net / DIS (`isnet-general-use`) | Apache-2.0 | Free, incl. commercial | [xuebinqin/DIS](https://github.com/xuebinqin/DIS) | Yes (community exports) | ~176 MB | Purpose-built for high-accuracy dichotomous (subject/background) segmentation up to 1024×1024. Generally sharper edges than `u2net`. Solid quality/size middle ground. |
| **BiRefNet_lite** | MIT | Free, incl. commercial | [ZhengPeng7/BiRefNet_lite](https://huggingface.co/ZhengPeng7/BiRefNet_lite) | Yes | 224 MB (fp32) / **115 MB (fp16)** | Distilled/lightweight sibling of full BiRefNet, same MIT-licensed lineage. Much closer to `isnet` in size than the ~1 GB general BiRefNet, while reportedly retaining most of its edge quality. **Best answer to "BiRefNet-like quality, lighter."** fp16 halves the size again; needs a hands-on check that fp16 doesn't visibly soften hair/fur edges. |
| **BEN2 (Base)** | MIT | Free, incl. commercial | [PramaLLC/BEN2](https://github.com/PramaLLC/BEN2) | ONNX export available | 94.6M params (file size to confirm at benchmark time, ballpark 190–380 MB depending on precision) | Trained on DIS5K + a 22K proprietary set specifically for hair matting, 4K processing, and edge refinement — direct answer to the "fine, quality results" goal. Only the base model is open (MIT); BEN2's paid "Refiner" tier is out of scope. License string had one conflicting search result ("Apache-2.0") vs. the model card ("MIT") — re-confirm the exact `LICENSE` file before shipping, but both are permissive. |
| BiRefNet (general) | MIT | Free, incl. commercial | [ZhengPeng7/BiRefNet](https://github.com/zhengpeng7/birefnet) | Yes (community ONNX exports) | 473 MB (fp16, 512×512) – 973 MB (fp32, general) | Highest reported cutout quality of this group, but 2–4x the size of `BiRefNet_lite` for a quality delta that's unconfirmed to be noticeable in a cutout tool. Keep as a quality-ceiling reference, not a default pick. |
| RMBG-1.4 / RMBG-2.0 (BRIA AI) | CC BY-NC 4.0 / non-commercial by default | **Commercial use requires a paid agreement with BRIA** | [briaai/RMBG-2.0](https://huggingface.co/briaai/RMBG-2.0) | Yes | Not measured (excluded) | Excluded: shipping ColorCut commercially would need a separate purchased license from BRIA. Only worth revisiting if someone explicitly approves buying that license (a "scope requiring explicit approval" item per `AGENTS.md`). |

**Hands-on pass complete (2026-09-17) — see the Benchmark section below for the results.** `isnet-general-use` is the recommendation; `u2netp` is the fallback; `BiRefNet_lite`/`BiRefNet`/`BEN2` are parked for the reasons detailed there. MODNet was not tested (isnet already handled the hair cases well; no reason to add a second model for the MVP).

## Rust/Apple Silicon runtime options

| Option | Summary |
| --- | --- |
| `ort` crate (pykeio/ort), ONNX Runtime C API bindings | Has a `coreml` execution-provider feature for Neural Engine/GPU acceleration on macOS 10.15+. **Verified hands-on on 2026-09-17** (see below) — CoreML works out of the box, no from-source build needed. |
| `tract` (pure Rust, no C/C++ dependency) | No CoreML acceleration, CPU-only, but avoids bundling a native ONNX Runtime binary entirely. Now the fallback option rather than the default, since `ort`+CoreML works without extra build complexity. |

### Verified: `ort` + CoreML works out of the box on this Mac

Built a disposable scratch crate (not part of this repo, nothing committed) with:

```toml
ort = { version = "2.0.0-rc.13", features = ["coreml", "download-binaries"] }
```

```rust
use ort::ep::{CoreML, ExecutionProvider};

fn main() {
    let coreml = CoreML::default();
    println!("{}", coreml.name());
    println!("{:?}", coreml.is_available());
}
```

`cargo run` transparently downloaded the prebuilt ONNX Runtime binary from pyke's CDN (the `download-binaries` feature) and printed:

```
ort execution provider identifier: CoreMLExecutionProvider
RESULT: CoreML EP AVAILABLE — this ONNX Runtime binary (via ort's download-binaries/pyke CDN) was compiled with CoreML support on this machine.
```

This confirms pyke's prebuilt macOS binaries include CoreML support — no from-source ONNX Runtime build is required. **Decision:** default to `ort` with the `coreml` + `download-binaries` features for `BackgroundRemovalService`, falling back to `tract` only if a licensing or packaging blocker with `ort`'s bundled binary shows up later. Record that as an ADR in `docs/DECISIONS.md` once the model choice is also finalized, since they're one integration decision together.

## Benchmark — real Mac run, 2026-09-17

**Image set:** `Images_QA/` at the repo root (33 rights-safe stock photos, gitignored, never committed). Classified all 33 into the six `IMPLEMENTATION.md` §13 categories and picked 13 representative cases, plus one synthetic 96×96 downscale (`_synthetic_tiny_96px.jpg`) since the set had no naturally tiny file. Every model ran through the same disposable Rust harness (`ort` 2.0.0-rc.13 + `coreml` + `download-binaries`, `image` 0.25 for resize/decode), with the exact rembg-verified preprocessing per model (see below). Nothing from this harness or its outputs is committed.

**BEN2 excluded from this pass:** rembg — the reference implementation used to verify preprocessing for the other three models — has no hardcoded, checksummed ONNX download for BEN2 (its `ben_custom.py` requires the user to supply their own `model_path`). The official PramaLLC/BEN2 repo is PyTorch-only with no ONNX export path. Rather than run inference against an unverified third-party ONNX conversion with guessed preprocessing, this model is parked until a trustworthy export with documented pre/postprocessing shows up.

**Models actually run:** `u2netp`, `isnet-general-use`, `BiRefNet-general-lite` (disqualified before completing the full set — see below).

| Candidate | Model size | Peak memory (whole batch, incl. model load) | Inference latency (fixed input, steady-state) | Model load / CoreML compile |
| --- | --- | --- | --- | --- |
| `u2netp` | 4.6 MB | 1.84 GiB | ~45–65 ms/image (320×320 input) | ~1.4 s |
| `isnet-general-use` | 176 MB | 3.18 GiB | ~170–410 ms/image (1024×1024 input) | ~6.9 s |
| `BiRefNet-general-lite` | 224 MB (fp32) | not measured — disqualified on latency before a full run | **~32 s/image** with `MLComputeUnits=CPUAndGPU` | **>25 min, killed before finishing**, with the default `MLComputeUnits=All` (ANE); **5.9 s** with `CPUAndGPU` |

Pre/post-processing (decode, resize, alpha composite) scales with the *source* image's resolution, not the model: the 8256×5504 stress image (`bin-thieu`) added ~650 ms pre + ~400–850 ms post on top of inference for `u2netp`/`isnet`. Peak memory is dominated by full-resolution RGBA buffers for that same image, not by the model weights — a real implementation should almost certainly downscale very large sources before compositing the final alpha to cap memory, independent of which model is chosen.

**`BiRefNet-general-lite` disqualified — CoreML/ANE compile is prohibitive either way.** With the default compute units (`All`, which lets CoreML target the Neural Engine), Apple's `ANECompilerService` XPC daemon pegged a CPU core at ~99% for **over 25 minutes** specializing the Swin-Transformer graph for the ANE and still hadn't finished — this was killed rather than let it run longer, so no quality data was collected for it in the main sweep. Forcing `MLComputeUnits=CPUAndGPU` (skipping ANE specialization) dropped model load to **5.9 s**, confirming the ANE compile — not a hang — was the bottleneck, but per-image inference on CPU/GPU came out to **~32 seconds** for a single 5472×3648 image (checked visually — output quality on that one easy case was on par with `isnet`, but that's irrelevant at this latency). Neither path is viable for an interactive desktop tool: a >25 minute one-time cost on first use (even if cached after) or a 32-second wait per cutout both fail the "simple, calm" product bar in `IMPLEMENTATION.md`. `BiRefNet_lite` and full `BiRefNet` are dropped from consideration for ColorCut's MVP; the killed process left an orphaned root-owned `ANECompilerService` still running afterward (couldn't be killed as a normal user — expect a CPU core busy for a while on this Mac, or force-quit it via Activity Monitor).

### Quality — `u2netp` vs `isnet-general-use` (visual review of checkerboard-composited output, 13 images)

`isnet-general-use` won decisively and consistently; `u2netp` is not viable as anything but an emergency fallback:

| Case | `u2netp` | `isnet-general-use` |
| --- | --- | --- |
| Dark-on-dark (DJ in dark club, `ramin-talebi`) | **Failure** — dropped the entire person, kept only the equipment | Correctly kept the full silhouette |
| Dark clothing, high contrast (`ayo-ogunseinde`) | **Failure** — black jacket rendered semi-transparent, checkerboard visible through it | Solid, correct opacity on the jacket; fine flyaway hair preserved |
| Foliage, clean background (`scott-webb`) | Leaves partially translucent/washed out | Crisp, fully opaque leaves with individual leaf edges |
| Foliage + hand holding subject (`olena-bohovyk` fern) | **Failure** — dropped the hand almost entirely | Hand fully and correctly preserved |
| Tiny file, 63×96 (`_synthetic_tiny`) | Dropped the wooden pedestal, kept only the bottle | Correctly kept bottle + pedestal, matching full-res behavior |
| Product, soft shadow (`kadarius-seegars` perfume) | Cleaner — fully removed a faint background shadow | Left a faint ghost of the shadow (minor over-retention) |
| Product, clean background (`ryan-waring` shoe) | Indistinguishable — both essentially perfect | Indistinguishable |
| Translucent/reflective (`giorgio-trovato` glass+ice) | Kept a diagonal shadow streak on the table | Cleanly cropped to just the glass |
| High-res stress (`bin-thieu`, 8256×5504) | Good, comparable to isnet | Good, marginally tighter around the hat brim |
| Abstract translucent art (`stesha-sss`) | Both struggle; arguably u2netp keeps the plant structure slightly more coherent | Fragments the shape into disconnected blades |
| Hair, plain background (`vinicius-amnx-amano`, `elvira-blumfelde`) | Comparable to isnet | Comparable to u2netp |

**Reading:** `isnet-general-use` is the clear baseline to beat. `u2netp`'s failures are not edge-case nitpicks — dropping an entire person's silhouette or a hand is a shipped-product-breaking bug, not a quality nuance. It stays in the shortlist only as a last-resort fast path, never as a default.

## Recommendation (pending explicit approval per `AGENTS.md`)

**`isnet-general-use` via `ort` (`coreml` + `download-binaries` features)** is the strongest candidate that actually finished the benchmark: Apache-2.0, 176 MB, ~7 s cold load, ~170–410 ms/image on real Apple Silicon hardware acceleration, and a decisive, consistent quality win over every other model that could actually run in reasonable time. `u2netp` stays bundled only as a manual "fast mode" fallback, never the default, given its silent-failure modes (dropping whole subjects). `BiRefNet_lite`/`BiRefNet`/`BEN2` are parked (see above) — not ruled out forever, but none of them cleared this round without a disqualifying cost (compile time, per-image latency, or no trustworthy ONNX export).

**Approved 2026-09-17.** Recorded as ADR-005 in `docs/DECISIONS.md` and wired into `BackgroundRemovalService`. Run `pnpm fetch-models` once to download the model locally (it is not committed — see ADR-005 for why) before `pnpm tauri dev`/`cargo test` can exercise it.

**Post-approval correction (2026-09-17):** the ~7 s load / ~170–410 ms/image numbers above were measured with `ComputeUnits::All` (letting CoreML use the Neural Engine). In real use, a stuck system `ANECompilerService` from an unrelated killed benchmark run caused every new CoreML session on the machine — including this one, in the actual packaged app — to hang indefinitely waiting on that shared compiler queue. `BackgroundRemovalService` was switched to `ComputeUnits::CPUAndGPU` (see ADR-005) to avoid ever touching that shared resource. Confirmed working end-to-end after the switch (model load + inference in 5.6 s in a clean test run), but the full 13-image latency/quality sweep above was not re-run under `CPUAndGPU` — if per-image latency ever matters for a later decision, re-benchmark under the actual production compute-units setting, not `All`.
