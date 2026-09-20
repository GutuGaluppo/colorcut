# Third-party notices

ColorCut itself is proprietary (see `LICENSE`). It bundles and depends on the third-party components below, each under its own license. This file satisfies the attribution requirements of those licenses as far as they can be met by a notice file; it is not legal advice.

## Background-removal model

**isnet-general-use** (IS-Net trained on DIS5K), bundled at `ColorCut.app/Contents/Resources/resources/models/isnet-general-use.onnx`.

- Origin: the DIS project, *Highly Accurate Dichotomous Image Segmentation* (Xuebin Qin et al., ECCV 2022) — <https://github.com/xuebinqin/DIS>
- License: Apache-2.0 (full text below), as recorded in `docs/MODEL_NOTES.md` and `docs/DECISIONS.md` ADR-005
- Distributed as an ONNX export by the `rembg` project (MIT License, Copyright (c) Daniel Gatis) — <https://github.com/danielgatis/rembg>; `scripts/fetch-models.sh` downloads it and verifies its MD5
- The model file is used unmodified.

## Inference runtime

**ONNX Runtime** (MIT License, Copyright (c) Microsoft Corporation) with its CoreML execution provider, linked through the `ort` crate, which downloads the prebuilt runtime at build time.

## Frontend packages (production dependencies)

| Package | License |
| --- | --- |
| @tauri-apps/api | Apache-2.0 OR MIT |
| @tauri-apps/plugin-dialog | MIT OR Apache-2.0 |
| @types/react | MIT |
| clsx | MIT |
| csstype | MIT |
| lucide-react | ISC |
| react | MIT |
| react-dom | MIT |
| scheduler | MIT |
| zustand | MIT |

Icons are from Lucide (ISC License) via `lucide-react`.

## Rust crates

294 crates in the dependency graph resolved for `aarch64-apple-darwin` (generated from `cargo metadata`; includes build-time-only crates, so it may list more than ends up linked into the binary).

### Notice for MPL-2.0 crates

The following crates are licensed under the Mozilla Public License 2.0 and are used **unmodified**, exactly as published on crates.io. Their complete Source Code Form is available at the linked upstream repositories and on crates.io at the listed versions:

- `cssparser` 0.36.0 — https://github.com/servo/rust-cssparser
- `cssparser-macros` 0.6.1 — https://github.com/servo/rust-cssparser
- `dtoa-short` 0.3.5 — https://github.com/upsuper/dtoa-short
- `option-ext` 0.2.0 — https://github.com/soc/option-ext
- `selectors` 0.36.1 — https://github.com/servo/stylo

The MPL-2.0 text is available at <https://www.mozilla.org/MPL/2.0/>.

### Crates by license

**MIT OR Apache-2.0** (135)

anyhow 1.0.104, base64 0.21.7, base64 0.22.1, base64 0.23.1, bitflags 2.13.2, block-buffer 0.10.4, camino 1.2.6, cargo-platform 0.1.9, cc 1.4.6, cfg-if 1.0.5, chrono 0.4.45, cookie 0.18.2, core-foundation 0.10.1, core-foundation-sys 0.8.7, core-graphics 0.25.0, core-graphics-types 0.2.0, cpufeatures 0.2.17, crc32fast 1.5.2, crossbeam-channel 0.5.17, crossbeam-utils 0.8.23, crypto-common 0.1.7, defmt 1.1.1, defmt-macros 1.1.1, defmt-parser 1.0.0, deranged 0.5.8, digest 0.10.7, dirs 6.0.0, dirs-sys 0.5.0, displaydoc 0.2.7, dtoa 1.0.11, dyn-clone 1.0.20, embed_plist 1.2.2, erased-serde 0.4.10, errno 0.3.14, fdeflate 0.3.7, find-msvc-tools 0.1.12, flate2 1.1.10, form_urlencoded 1.2.2, getrandom 0.3.4, getrandom 0.4.3, glob 0.3.4, hashbrown 0.12.3, hashbrown 0.17.1, heck 0.5.0, hex 0.4.3, html5ever 0.38.0, http 1.5.0, httparse 1.10.1, iana-time-zone 0.1.65, idna 1.1.0, image 0.25.10, image-webp 0.2.4, itoa 1.0.18, jsonptr 0.6.3, keyboard-types 0.7.0, libc 0.2.189, lock_api 0.4.14, log 0.4.34, markup5ever 0.38.0, mime 0.3.17, native-tls 0.2.18, ndarray 0.17.2, num-complex 0.4.6, num-conv 0.2.2, num-integer 0.1.47, num-traits 0.2.19, once_cell 1.21.4, ort 2.0.0-rc.13, ort-sys 2.0.0-rc.13, parking_lot 0.12.5, parking_lot_core 0.9.12, percent-encoding 2.3.2, png 0.17.16, png 0.18.1, powerfmt 0.2.0, proc-macro2 1.0.107, quote 1.0.47, ref-cast 1.0.27, ref-cast-impl 1.0.27, regex 1.13.1, regex-automata 0.4.18, regex-syntax 0.8.11, rustc_version 0.4.1, rustls-pki-types 1.15.1, scopeguard 1.2.0, security-framework 3.7.0, security-framework-sys 2.17.0, semver 1.0.28, serde 1.0.229, serde-untagged 0.1.9, serde_core 1.0.229, serde_derive 1.0.229, serde_derive_internals 0.29.1, serde_json 1.0.151, serde_repr 0.1.21, serde_spanned 1.1.1, serde_with 3.23.0, serde_with_macros 3.23.0, serialize-to-javascript 0.1.2, serialize-to-javascript-impl 0.1.2, servo_arc 0.4.3, sha2 0.10.9, shlex 2.0.1, smallvec 1.16.1, socket2 0.6.5, stable_deref_trait 1.2.1, string_cache 0.9.0, string_cache_codegen 0.6.1, swift-rs 1.0.8, syn 2.0.119, syn 3.0.6, tempfile 3.27.0, tendril 0.5.1, thiserror 1.0.69, thiserror 2.0.20, thiserror-impl 1.0.69, thiserror-impl 2.0.20, time 0.3.55, time-core 0.1.9, time-macros 0.2.32, toml 0.9.12+spec-1.1.0, toml 1.1.6+spec-1.1.0, toml_datetime 0.7.5+spec-1.1.0, toml_datetime 1.1.1+spec-1.1.0, toml_parser 1.1.3+spec-1.1.0, toml_writer 1.1.2+spec-1.1.0, tray-icon 0.24.2, typeid 1.0.3, typenum 1.20.1, unicode-segmentation 1.13.3, ureq 3.4.2, ureq-proto 0.6.4, url 2.5.8, utf8-zero 0.8.1, web_atoms 0.2.6

**MIT** (44)

block2 0.6.2, bytes 1.12.1, cargo_metadata 0.19.2, cfb 0.7.3, darling 0.24.1, darling_core 0.24.1, darling_macro 0.24.1, derive_more 2.1.1, derive_more-impl 2.1.1, dom_query 0.27.0, embed-resource 3.0.11, generic-array 0.14.7, http-range 0.1.5, ico 0.5.0, infer 0.19.0, mio 1.2.3, new_debug_unreachable 1.0.6, objc2 0.6.4, objc2-encode 4.1.0, objc2-foundation 0.3.2, phf 0.13.1, phf_codegen 0.13.1, phf_generator 0.13.1, phf_macros 0.13.1, phf_shared 0.13.1, plist 1.10.1, precomputed-hash 0.1.1, quick-xml 0.42.0, rfd 0.16.0, schemars 0.8.22, schemars 0.9.0, schemars 1.2.2, schemars_derive 0.8.22, simd-adler32 0.3.10, strsim 0.11.1, synstructure 0.14.0, tauri-winres 0.3.6, tokio 1.53.1, tracing 0.1.44, tracing-core 0.1.36, urlpattern 0.3.0, winnow 0.7.15, winnow 1.0.4, zmij 1.0.23

**Apache-2.0 OR MIT** (34)

autocfg 1.5.1, base64ct 1.8.3, bit-set 0.8.0, bit-vec 0.8.0, cargo_toml 0.22.3, ctor 0.8.0, ctor-proc-macro 0.0.7, der 0.8.2, dtor 0.3.0, dtor-proc-macro 0.0.6, equivalent 1.0.2, fastrand 2.5.0, idna_adapter 1.2.2, indexmap 1.9.3, indexmap 2.14.2, muda 0.19.3, pem-rfc7468 1.0.0, pin-project-lite 0.2.17, rustc-hash 2.1.3, tauri 2.11.5, tauri-build 2.6.3, tauri-codegen 2.6.3, tauri-macros 2.6.3, tauri-plugin 2.6.3, tauri-plugin-dialog 2.7.3, tauri-plugin-fs 2.5.2, tauri-runtime 2.11.3, tauri-runtime-wry 2.11.4, tauri-utils 2.9.3, utf8_iter 1.0.4, uuid 1.26.1, window-vibrancy 0.6.0, wry 0.55.1, zeroize 1.9.0

**MIT/Apache-2.0** (18)

bitflags 1.3.2, bs58 0.5.1, foreign-types 0.5.0, foreign-types-macros 0.2.4, foreign-types-shared 0.3.1, ident_case 1.0.1, json-patch 3.0.1, matrixmultiply 0.3.11, quick-error 2.0.1, rawpointer 0.2.1, siphasher 1.0.3, socks 0.3.4, unic-char-property 0.9.0, unic-char-range 0.9.0, unic-common 0.9.0, unic-ucd-ident 0.9.0, unic-ucd-version 0.9.0, version_check 0.9.5

**Unicode-3.0** (18)

icu_collections 2.3.0, icu_locale_core 2.3.0, icu_normalizer 2.3.0, icu_normalizer_data 2.3.0, icu_properties 2.3.0, icu_properties_data 2.3.0, icu_provider 2.3.1, litemap 0.8.3, potential_utf 0.1.6, tinystr 0.8.4, writeable 0.6.4, yoke 0.8.3, yoke-derive 0.8.3, zerofrom 0.1.8, zerofrom-derive 0.1.8, zerotrie 0.2.5, zerovec 0.11.8, zerovec-derive 0.11.6

**Zlib OR Apache-2.0 OR MIT** (9)

bytemuck 1.25.2, dispatch2 0.3.1, objc2-app-kit 0.3.2, objc2-core-foundation 0.3.2, objc2-core-graphics 0.3.2, objc2-exception-helper 0.1.1, objc2-io-surface 0.3.2, objc2-web-kit 0.3.2, tinyvec 1.13.3

**Unlicense OR MIT** (6)

aho-corasick 1.1.5, byteorder 1.5.0, byteorder-lite 0.1.0, jiff 0.2.37, jiff-core 0.1.1, memchr 2.8.3

**MPL-2.0** (5)

cssparser 0.36.0, cssparser-macros 0.6.1, dtoa-short 0.3.5, option-ext 0.2.0, selectors 0.36.1

**MIT OR Apache-2.0 OR Zlib** (3)

raw-window-handle 0.6.2, zune-core 0.5.3, zune-jpeg 0.5.15

**Apache-2.0** (2)

lzma-rust2 0.15.8, tao 0.35.3

**BSD-3-Clause** (2)

alloc-no-stdlib 2.0.4, alloc-stdlib 0.2.4

**BSD-3-Clause OR Apache-2.0** (2)

moxcms 0.8.1, pxfm 0.1.30

**MIT OR Zlib OR Apache-2.0** (2)

miniz_oxide 0.8.9, miniz_oxide 0.9.1

**Unlicense/MIT** (2)

same-file 1.0.6, walkdir 2.5.0

**Zlib** (2)

foldhash 0.2.0, zlib-rs 0.6.8

**(MIT OR Apache-2.0) AND Unicode-3.0** (1)

unicode-ident 1.0.26

**0BSD OR MIT OR Apache-2.0** (1)

adler2 2.0.1

**Apache-2.0 / MIT** (1)

fnv 1.0.7

**Apache-2.0 AND MIT** (1)

dpi 0.1.2

**Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT** (1)

rustix 1.1.5

**BSD-3-Clause AND MIT** (1)

brotli 8.0.4

**BSD-3-Clause/MIT** (1)

brotli-decompressor 5.0.3

**CC0-1.0 OR MIT-0 OR Apache-2.0** (1)

dunce 1.0.5

**CDLA-Permissive-2.0** (1)

webpki-root-certs 1.0.9

**ISC** (1)

hmac-sha256 1.1.14

Each crate's own license text and copyright notice are distributed with its source on crates.io. For a per-crate full-text attribution bundle, generate one with `cargo about` before a release that requires strict text-level compliance.

## Apache License 2.0 (full text)

Applies to the `isnet-general-use` model and to crates licensed Apache-2.0.

```text

                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS
```
