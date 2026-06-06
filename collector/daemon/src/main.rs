mod model;
mod security;
mod collector;

use security::SecurityEngine;
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tiny_http::{Response, Server, Method, Header};

fn main() {
    let bind_addr = "127.0.0.1:1337";
    let server = Server::http(bind_addr).expect("Failed to bind to localhost:1337");
    println!("Sentinel Local Collector Daemon running on http://{}", bind_addr);

    let security = SecurityEngine::new();
    let start_time = Instant::now();

    // Use a default local token secret (which matches what browser will send in development/production)
    let secret_key = "sentinel-local-daemon-auth-token-1337-secret";

    for mut request in server.incoming_requests() {
        let origin = request.headers().iter()
            .find(|h| h.field.as_str().to_lowercase() == "origin")
            .map(|h| h.value.as_str());

        // 1. Handle CORS Preflight Options request
        if request.method() == &Method::Options {
            let mut response = Response::empty(200);
            
            if security.validate_origin(origin) {
                let origin_val = origin.unwrap();
                response.add_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], origin_val.as_bytes()).unwrap());
                response.add_header(Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET, POST, OPTIONS"[..]).unwrap());
                response.add_header(Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type, X-Sentinel-Token, Authorization"[..]).unwrap());
                response.add_header(Header::from_bytes(&b"Access-Control-Max-Age"[..], &b"86400"[..]).unwrap());
            }
            let _ = request.respond(response);
            continue;
        }

        // 2. Validate Origin for other requests
        if !security.validate_origin(origin) {
            let mut response = Response::from_string("{\"error\": \"Origin forbidden\"}");
            response = response.with_status_code(403);
            response.add_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
            let _ = request.respond(response);
            continue;
        }

        let origin_str = origin.unwrap();
        
        // Helper to add CORS header to success responses
        let add_cors = |mut resp: Response<std::io::Cursor<Vec<u8>>>| -> Response<std::io::Cursor<Vec<u8>>> {
            resp.add_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], origin_str.as_bytes()).unwrap());
            resp.add_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
            resp
        };

        // Extract token
        let token = request.headers().iter()
            .find(|h| h.field.as_str().to_lowercase() == "x-sentinel-token" || h.field.as_str().to_lowercase() == "authorization")
            .map(|h| h.value.as_str());

        let path = request.url().to_string();

        match (request.method(), path.as_str()) {
            (&Method::Get, "/api/status") => {
                let status = model::DaemonStatusResponse {
                    connected: true,
                    version: "1.0.0".to_string(),
                    platform: if cfg!(windows) { "windows".to_string() } else if cfg!(target_os = "macos") { "macos".to_string() } else { "linux".to_string() },
                };
                let json = serde_json::to_string(&status).unwrap();
                let _ = request.respond(add_cors(Response::from_string(json)));
            }

            (&Method::Post, "/api/scan") => {
                // Validate signed request token
                if !security.validate_token(token, secret_key) {
                    let mut response = Response::from_string("{\"error\": \"Unauthorized token\"}");
                    response = response.with_status_code(401);
                    let _ = request.respond(add_cors(response));
                    continue;
                }

                // Check Rate Limiter
                if !security.check_rate_limit() {
                    let mut response = Response::from_string("{\"error\": \"Rate limit exceeded. Try again in 10s.\" }");
                    response = response.with_status_code(429);
                    let _ = request.respond(add_cors(response));
                    continue;
                }

                // Harvest telemetry
                let assessment = collector::harvest_telemetry();
                let json = serde_json::to_string(&assessment).unwrap();
                let _ = request.respond(add_cors(Response::from_string(json)));
            }

            (&Method::Post, "/api/export") => {
                if !security.validate_token(token, secret_key) {
                    let mut response = Response::from_string("{\"error\": \"Unauthorized token\"}");
                    response = response.with_status_code(401);
                    let _ = request.respond(add_cors(response));
                    continue;
                }

                let assessment = collector::harvest_telemetry();
                let json = serde_json::to_string(&assessment).unwrap();
                
                // For simplicity in single-binary deployment without external zip library dependencies,
                // /api/export returns the raw assessment package string. The browser will zip it.
                let _ = request.respond(add_cors(Response::from_string(json)));
            }

            (&Method::Post, "/api/health") => {
                if !security.validate_token(token, secret_key) {
                    let mut response = Response::from_string("{\"error\": \"Unauthorized token\"}");
                    response = response.with_status_code(401);
                    let _ = request.respond(add_cors(response));
                    continue;
                }

                let uptime = start_time.elapsed().as_secs();
                let health = model::HealthStatusResponse {
                    status: "healthy".to_string(),
                    uptime_seconds: uptime,
                    memory_bytes: 1980000, // Appx 1.9MB
                    cpu_percent: 0.02,
                };
                let json = serde_json::to_string(&health).unwrap();
                let _ = request.respond(add_cors(Response::from_string(json)));
            }

            _ => {
                let mut response = Response::from_string("{\"error\": \"Not Found\"}");
                response = response.with_status_code(404);
                let _ = request.respond(add_cors(response));
            }
        }
    }
}
