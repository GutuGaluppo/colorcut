use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;

use reqwest::multipart;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::models::PhotoroomLicenseStatus;
use crate::services::background_removal_service::RemovalOutcome;

#[derive(Debug, Error)]
pub enum PhotoroomRemovalError {
    #[error("Add your ColorCut Pro license code in Settings before using cloud cutout.")]
    MissingLicense,
    #[error("This license code isn't recognized. Check it in Settings or contact support.")]
    InvalidLicense,
    #[error("This license has no cloud credits left. Buy another credit pack to continue.")]
    NoCredit,
    #[error("Cloud cutout needs an internet connection. Check your connection and try again.")]
    Network(String),
    #[error("The cloud cutout service is temporarily unavailable: {0}")]
    ServiceUnavailable(String),
    #[error("The license code could not be saved: {0}")]
    LicenseStorage(String),
    #[error("The cutout could not be saved: {0}")]
    Save(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct StoredLicense {
    license_code: String,
}

/// Client for the ColorCut-owned Cloudflare Worker proxy (ADR-014) — never calls
/// `sdk.photoroom.com` directly. The Worker holds the real Photoroom API key and
/// validates the license code + credit balance server-side; this client only ever
/// sees the pass-through result or a mapped error.
///
/// Worker contract this client assumes (finalize when the Worker is built,
/// IMPLEMENTATION.md Phase 6 step 3): POST multipart (`image_file`, `license_code`)
/// returns the PNG on 200, 401 for an invalid code, 402 for no remaining credit,
/// and any other non-2xx is treated as a service-availability error.
pub struct PhotoroomRemovalService {
    worker_url: String,
    license_path: PathBuf,
    client: reqwest::Client,
}

impl PhotoroomRemovalService {
    pub fn new(worker_url: String, license_path: PathBuf) -> Self {
        Self {
            worker_url,
            license_path,
            client: reqwest::Client::new(),
        }
    }

    pub fn license_status(&self) -> PhotoroomLicenseStatus {
        PhotoroomLicenseStatus {
            has_license: self.read_license().is_some_and(|code| !code.is_empty()),
        }
    }

    pub fn set_license(&self, code: &str) -> Result<(), PhotoroomRemovalError> {
        if let Some(parent) = self.license_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| PhotoroomRemovalError::LicenseStorage(error.to_string()))?;
        }
        let contents = serde_json::to_vec(&StoredLicense {
            license_code: code.trim().to_owned(),
        })
        .map_err(|error| PhotoroomRemovalError::LicenseStorage(error.to_string()))?;
        fs::write(&self.license_path, contents)
            .map_err(|error| PhotoroomRemovalError::LicenseStorage(error.to_string()))
    }

    fn read_license(&self) -> Option<String> {
        let contents = fs::read(&self.license_path).ok()?;
        let stored: StoredLicense = serde_json::from_slice(&contents).ok()?;
        Some(stored.license_code)
    }

    /// Sends `image_bytes` to the Worker and writes the returned PNG into `cache_dir`.
    /// The source image is never modified; nothing is retained by the Worker per its
    /// own contract (ADR-014) or by this client beyond the local cutout cache.
    pub async fn remove_background(
        &self,
        image_bytes: &[u8],
        cache_dir: &Path,
    ) -> Result<RemovalOutcome, PhotoroomRemovalError> {
        let license_code = self
            .read_license()
            .filter(|code| !code.is_empty())
            .ok_or(PhotoroomRemovalError::MissingLicense)?;

        let start = Instant::now();

        let part = multipart::Part::bytes(image_bytes.to_vec())
            .file_name("image")
            .mime_str("application/octet-stream")
            .map_err(|error| PhotoroomRemovalError::Network(error.to_string()))?;
        let form = multipart::Form::new()
            .text("license_code", license_code)
            .part("image_file", part);

        let response = self
            .client
            .post(&self.worker_url)
            .multipart(form)
            .send()
            .await
            .map_err(|error| PhotoroomRemovalError::Network(error.to_string()))?;

        let status = response.status();
        if status == reqwest::StatusCode::UNAUTHORIZED {
            return Err(PhotoroomRemovalError::InvalidLicense);
        }
        if status == reqwest::StatusCode::PAYMENT_REQUIRED {
            return Err(PhotoroomRemovalError::NoCredit);
        }
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            let snippet: String = body.chars().take(200).collect();
            return Err(PhotoroomRemovalError::ServiceUnavailable(snippet));
        }

        let png_bytes = response
            .bytes()
            .await
            .map_err(|error| PhotoroomRemovalError::Network(error.to_string()))?;

        fs::create_dir_all(cache_dir)
            .map_err(|error| PhotoroomRemovalError::Save(error.to_string()))?;
        let cutout_path = cache_dir.join(format!("cutout-cloud-{}.png", unique_suffix()));
        fs::write(&cutout_path, &png_bytes)
            .map_err(|error| PhotoroomRemovalError::Save(error.to_string()))?;

        Ok(RemovalOutcome {
            cutout_path,
            processing_time_ms: start.elapsed().as_millis() as u64,
        })
    }
}

fn unique_suffix() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let count = COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("{nanos:x}-{count:x}")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_license_path() -> PathBuf {
        std::env::temp_dir().join(format!("colorcut-license-test-{}.json", unique_suffix()))
    }

    #[test]
    fn reports_no_license_before_one_is_set() {
        let path = temp_license_path();
        let service =
            PhotoroomRemovalService::new("https://example.invalid".to_owned(), path.clone());
        assert!(!service.license_status().has_license);
        fs::remove_file(&path).ok();
    }

    #[test]
    fn stores_and_reports_a_license_code() {
        let path = temp_license_path();
        let service =
            PhotoroomRemovalService::new("https://example.invalid".to_owned(), path.clone());
        service
            .set_license("CC-PRO-TEST-CODE")
            .expect("set_license should succeed");
        assert!(service.license_status().has_license);
        fs::remove_file(&path).ok();
    }

    #[tokio::test]
    async fn fails_with_missing_license_when_none_is_stored() {
        let path = temp_license_path();
        let service =
            PhotoroomRemovalService::new("https://example.invalid".to_owned(), path.clone());
        let result = service
            .remove_background(&[0u8, 1, 2], &std::env::temp_dir())
            .await;
        assert!(matches!(result, Err(PhotoroomRemovalError::MissingLicense)));
        fs::remove_file(&path).ok();
    }
}
