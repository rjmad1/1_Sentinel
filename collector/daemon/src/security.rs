use std::sync::Mutex;
use std::time::{Duration, Instant};

pub struct SecurityEngine {
    last_scan_time: Mutex<Option<Instant>>,
}

impl SecurityEngine {
    pub fn new() -> Self {
        Self {
            last_scan_time: Mutex::new(None),
        }
    }

    /// Validates that the request origin is whitelisted.
    pub fn validate_origin(&self, origin: Option<&str>) -> bool {
        match origin {
            Some(o) => {
                let lower_o = o.to_lowercase();
                lower_o == "https://1-sentinel.vercel.app" 
                    || lower_o == "http://localhost:5173"
                    || lower_o.starts_style_like_dev_domain()
            }
            None => false, // Require origin headers for API endpoints
        }
    }

    /// Validates the signed token passed from the browser.
    /// In production, this can perform a HMAC-SHA256 verification of the timestamp.
    /// For this version, we require the token to match a secret key stored locally.
    pub fn validate_token(&self, token: Option<&str>, expected_secret: &str) -> bool {
        match token {
            Some(t) => {
                // Remove prefix Bearer if present
                let clean_token = t.trim_start_matches("Bearer ").trim();
                clean_token == expected_secret
            }
            None => false,
        }
    }

    /// Rate limiter: prevents calling POST /api/scan more than once every 10 seconds.
    pub fn check_rate_limit(&self) -> bool {
        let mut last_scan = self.last_scan_time.lock().unwrap();
        let now = Instant::now();
        
        if let Some(last) = *last_scan {
            if now.duration_since(last) < Duration::from_secs(10) {
                return false; // Rate limited
            }
        }
        
        *last_scan = Some(now);
        true
    }
}

trait DevDomainCheck {
    fn starts_style_like_dev_domain(&self) -> bool;
}

impl DevDomainCheck for String {
    fn starts_style_like_dev_domain(&self) -> bool {
        self.starts_with("http://localhost:") || self.starts_with("http://127.0.0.1:")
    }
}
