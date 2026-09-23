/**
 * ColorCut Photoroom proxy (ADR-014). Holds the real Photoroom API key as a
 * Worker secret — it never ships in the ColorCut app. Validates a license
 * code + credit balance in KV, forwards the image to Photoroom on success,
 * and streams the PNG straight back. No image bytes are logged or persisted
 * anywhere in this Worker.
 *
 * Request contract (must match src-tauri/src/services/photoroom_removal_service.rs):
 *   POST <this Worker's URL>
 *   multipart/form-data: image_file (binary), license_code (text)
 *
 * Response contract:
 *   200  -> PNG bytes (image/png)
 *   401  -> unknown/missing license code
 *   402  -> license has no credits left
 *   4xx/5xx (other) -> treated as "service unavailable" by the client
 */

export interface Env {
  LICENSES: KVNamespace;
  PHOTOROOM_API_KEY: string;
}

const PHOTOROOM_URL = "https://sdk.photoroom.com/v1/segment";

type LicenseRecord = { credits: number };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return new Response("Invalid multipart request", { status: 400 });
    }

    const licenseCodeField = form.get("license_code");
    const imageFile = form.get("image_file");

    if (typeof licenseCodeField !== "string" || !licenseCodeField.trim()) {
      return new Response("Missing license_code", { status: 401 });
    }
    if (!(imageFile instanceof Blob)) {
      return new Response("Missing image_file", { status: 400 });
    }

    // Normalized to uppercase so a customer's casing when typing the code into
    // ColorCut never causes a false "invalid license" — KV lookups are exact,
    // case-sensitive matches. Every code must be issued (and stored via
    // `wrangler kv key put`) in uppercase to match this.
    const licenseKey = licenseCodeField.trim().toUpperCase();
    const stored = await env.LICENSES.get(licenseKey);
    if (!stored) {
      return new Response("Invalid license code", { status: 401 });
    }

    let record: LicenseRecord;
    try {
      record = JSON.parse(stored);
    } catch {
      return new Response("Corrupt license record", { status: 401 });
    }

    if (!(record.credits > 0)) {
      return new Response("No cloud credits remaining", { status: 402 });
    }

    const photoroomForm = new FormData();
    photoroomForm.append("image_file", imageFile, "image");
    photoroomForm.append("format", "png");
    photoroomForm.append("channels", "rgba");
    photoroomForm.append("size", "full");
    photoroomForm.append("crop", "false");

    let photoroomResponse: Response;
    try {
      photoroomResponse = await fetch(PHOTOROOM_URL, {
        method: "POST",
        headers: { "x-api-key": env.PHOTOROOM_API_KEY },
        body: photoroomForm,
      });
    } catch {
      return new Response("Photoroom unreachable", { status: 502 });
    }

    if (!photoroomResponse.ok || !photoroomResponse.body) {
      return new Response(`Photoroom error: ${photoroomResponse.status}`, { status: 502 });
    }

    // Only spend the credit once Photoroom actually succeeded — a failed
    // upstream call should never cost the user anything. This is a plain
    // read-then-write on KV, not a transaction: two requests racing on the
    // same license code at the same instant could both pass the credits > 0
    // check before either write lands. Acceptable at this product's volume;
    // move to a Durable Object per license if that ever becomes a real issue.
    await env.LICENSES.put(licenseKey, JSON.stringify({ credits: record.credits - 1 }));

    return new Response(photoroomResponse.body, {
      status: 200,
      headers: { "Content-Type": "image/png" },
    });
  },
};
