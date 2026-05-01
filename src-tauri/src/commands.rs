use chrono::{Datelike, Utc};
use std::time::{SystemTime, UNIX_EPOCH};

#[tauri::command]
pub fn generate_sop_id() -> String {
    let year = Utc::now().year();
    let mut ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u128;

    let valid_chars = ['2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];

    loop {
        let hex_str = format!("{:X}", ms);
        
        let last_8 = if hex_str.len() >= 8 {
            &hex_str[hex_str.len() - 8..]
        } else {
            &hex_str
        };

        let mut filtered = String::new();
        for c in last_8.chars() {
            if valid_chars.contains(&c) {
                filtered.push(c);
            }
        }

        if filtered.len() >= 6 {
            let six_char = &filtered[0..6];
            return format!("SOP-{}-{}", year, six_char);
        }

        ms += 1;
    }
}

// Auto-save commands placeholders

#[tauri::command]
pub async fn save_sop(_payload: serde_json::Value, _state: tauri::State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    // TODO: Implement UPSERT for sops table
    Ok(())
}

#[tauri::command]
pub async fn save_revision(_payload: serde_json::Value, _state: tauri::State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    // TODO: Implement UPSERT for revisions table
    Ok(())
}

#[tauri::command]
pub async fn save_definition(_payload: serde_json::Value, _state: tauri::State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    // TODO: Implement UPSERT for definitions table
    Ok(())
}

#[tauri::command]
pub async fn save_tool(_payload: serde_json::Value, _state: tauri::State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    // TODO: Implement UPSERT for tools table
    Ok(())
}

#[tauri::command]
pub async fn save_item(_payload: serde_json::Value, _state: tauri::State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    // TODO: Implement UPSERT for items table
    Ok(())
}

#[tauri::command]
pub async fn save_step(_payload: serde_json::Value, _state: tauri::State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    // TODO: Implement UPSERT for steps table
    Ok(())
}

#[tauri::command]
pub async fn save_step_image(_payload: serde_json::Value, _state: tauri::State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    // TODO: Implement UPSERT for step_images table
    Ok(())
}

#[tauri::command]
pub async fn save_step_tool(_payload: serde_json::Value, _state: tauri::State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    // TODO: Implement UPSERT for step_tools table
    Ok(())
}

#[tauri::command]
pub async fn save_step_item(_payload: serde_json::Value, _state: tauri::State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    // TODO: Implement UPSERT for step_items table
    Ok(())
}

