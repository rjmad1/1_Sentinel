#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod model;
mod collector;

use crate::model::ConsolidatedAssessment;

// Tauri command to execute the native system telemetry scan
#[tauri::command]
fn run_system_scan() -> Result<ConsolidatedAssessment, String> {
    println!("Initiating native system scan via Tauri IPC...");
    let assessment = collector::harvest_telemetry();
    Ok(assessment)
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![run_system_scan])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
