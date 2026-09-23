use serde::Serialize;

use crate::services::photoroom_removal_service::PhotoroomRemovalError;

/// Structured error for `remove_background_cloud`, distinct from the plain-`String`
/// errors used elsewhere in this app: the UI branches on `kind` (offline gets an
/// explanatory modal per ADR-014, license/credit issues get inline feedback), so a
/// bare message string that the frontend would have to pattern-match on isn't
/// enough here.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhotoroomCloudError {
    pub kind: PhotoroomCloudErrorKind,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum PhotoroomCloudErrorKind {
    MissingLicense,
    InvalidLicense,
    NoCredit,
    Offline,
    Unavailable,
}

impl PhotoroomCloudError {
    pub fn unavailable(message: String) -> Self {
        PhotoroomCloudError {
            kind: PhotoroomCloudErrorKind::Unavailable,
            message,
        }
    }
}

impl From<PhotoroomRemovalError> for PhotoroomCloudError {
    fn from(error: PhotoroomRemovalError) -> Self {
        use PhotoroomRemovalError::*;
        let kind = match &error {
            MissingLicense => PhotoroomCloudErrorKind::MissingLicense,
            InvalidLicense => PhotoroomCloudErrorKind::InvalidLicense,
            NoCredit => PhotoroomCloudErrorKind::NoCredit,
            Network(_) => PhotoroomCloudErrorKind::Offline,
            ServiceUnavailable(_) | LicenseStorage(_) | Save(_) => {
                PhotoroomCloudErrorKind::Unavailable
            }
        };
        PhotoroomCloudError {
            kind,
            message: error.to_string(),
        }
    }
}
