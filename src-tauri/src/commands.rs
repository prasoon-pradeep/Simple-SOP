use chrono::{Datelike, Utc};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use sqlx::{SqlitePool, Row};
use uuid::Uuid;
use tauri::Manager;
use base64::prelude::BASE64_STANDARD;
use base64::Engine;

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

// --------------------------------------------------------
// Data Structures
// --------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SOP {
    pub id: String,
    pub sop_id: String,
    pub version: i64,
    pub title: String,
    pub project_tag: Option<String>,
    pub department: Option<String>,
    pub document_owner: Option<String>,
    pub created_by: Option<String>,
    pub created_date: Option<String>,
    pub active_date: Option<String>,
    pub next_review_date: Option<String>,
    pub approval_status: Option<String>,
    pub regulatory_ref: Option<String>,
    pub distribution_list: Option<String>,
    pub related_documents: Option<String>,
    pub purpose: Option<String>,
    pub scope: Option<String>,
    pub safety_notes: Option<String>,
    pub training_required: bool,
    pub training_details: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Revision {
    pub id: String,
    pub sop_id: String,
    pub version: i64,
    pub revision_notes: String,
    pub revised_by: Option<String>,
    pub revision_date: String,
    pub approval_status: Option<String>,
    pub approved_by: Option<String>,
    pub approval_date: Option<String>,
}

// --------------------------------------------------------
// Commands
// --------------------------------------------------------

#[tauri::command]
pub async fn create_sop(title: String, state: tauri::State<'_, SqlitePool>) -> Result<String, String> {
    let pool = state.inner();
    let sop_id_str = generate_sop_id();
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%d").to_string();
    let ts = Utc::now().to_rfc3339();

    // Start transaction
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query(
        r#"
        INSERT INTO sops (
            id, sop_id, version, title, approval_status, created_date, created_at, updated_at
        ) VALUES (?, ?, 1, ?, 'Draft', ?, ?, ?)
        "#
    )
    .bind(&id)
    .bind(&sop_id_str)
    .bind(&title)
    .bind(&now)
    .bind(&ts)
    .bind(&ts)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Auto-insert V1 revision
    let rev_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO revisions (
            id, sop_id, version, revision_notes, revision_date, approval_status
        ) VALUES (?, ?, 1, 'Initial Draft', ?, 'Draft')
        "#
    )
    .bind(&rev_id)
    .bind(&id)
    .bind(&now)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub async fn get_sops(state: tauri::State<'_, SqlitePool>) -> Result<Vec<SOP>, String> {
    let sops = sqlx::query_as::<sqlx::Sqlite, SOP>(
        r#"
        SELECT id, sop_id, version, title, project_tag, department, document_owner,
               created_by, created_date, active_date, next_review_date, approval_status,
               regulatory_ref, distribution_list, related_documents, purpose, scope,
               safety_notes, training_required, training_details, created_at, updated_at
        FROM sops
        ORDER BY updated_at DESC
        "#
    )
    .fetch_all(state.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(sops)
}

#[tauri::command]
pub async fn get_sop(id: String, state: tauri::State<'_, SqlitePool>) -> Result<SOP, String> {
    let sop = sqlx::query_as::<sqlx::Sqlite, SOP>(
        r#"
        SELECT id, sop_id, version, title, project_tag, department, document_owner,
               created_by, created_date, active_date, next_review_date, approval_status,
               regulatory_ref, distribution_list, related_documents, purpose, scope,
               safety_notes, training_required, training_details, created_at, updated_at
        FROM sops
        WHERE id = ?
        "#
    )
    .bind(id)
    .fetch_one(state.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(sop)
}

#[tauri::command]
pub async fn get_revisions(sop_id: String, state: tauri::State<'_, SqlitePool>) -> Result<Vec<Revision>, String> {
    let revs = sqlx::query_as::<sqlx::Sqlite, Revision>(
        r#"
        SELECT id, sop_id, version, revision_notes, revised_by, revision_date,
               approval_status, approved_by, approval_date
        FROM revisions
        WHERE sop_id = ?
        ORDER BY version DESC
        "#
    )
    .bind(sop_id)
    .fetch_all(state.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(revs)
}

#[tauri::command]
pub async fn save_sop(payload: SOP, state: tauri::State<'_, SqlitePool>) -> Result<(), String> {
    let ts = Utc::now().to_rfc3339();

    sqlx::query(
        r#"
        UPDATE sops SET
            title = ?, project_tag = ?, department = ?, document_owner = ?,
            created_by = ?, created_date = ?, active_date = ?, next_review_date = ?,
            regulatory_ref = ?, distribution_list = ?, related_documents = ?,
            purpose = ?, scope = ?, safety_notes = ?, training_required = ?,
            training_details = ?, updated_at = ?
        WHERE id = ?
        "#
    )
    .bind(&payload.title)
    .bind(&payload.project_tag)
    .bind(&payload.department)
    .bind(&payload.document_owner)
    .bind(&payload.created_by)
    .bind(&payload.created_date)
    .bind(&payload.active_date)
    .bind(&payload.next_review_date)
    .bind(&payload.regulatory_ref)
    .bind(&payload.distribution_list)
    .bind(&payload.related_documents)
    .bind(&payload.purpose)
    .bind(&payload.scope)
    .bind(&payload.safety_notes)
    .bind(payload.training_required)
    .bind(&payload.training_details)
    .bind(&ts)
    .bind(&payload.id)
    .execute(state.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct CreateRevisionPayload {
    pub sop_id: String,
    pub revision_notes: String,
    pub revised_by: Option<String>,
    pub approval_status: Option<String>,
}

#[tauri::command]
pub async fn save_revision(payload: CreateRevisionPayload, state: tauri::State<'_, SqlitePool>) -> Result<(), String> {
    let pool = state.inner();
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    
    // Get current max version
    let row = sqlx::query("SELECT MAX(version) as max_ver FROM revisions WHERE sop_id = ?")
        .bind(&payload.sop_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
        
    let current_max: i64 = row.try_get("max_ver").unwrap_unwrap_or(0);
    let new_version = current_max + 1;
    let rev_id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%d").to_string();

    sqlx::query(
        r#"
        INSERT INTO revisions (
            id, sop_id, version, revision_notes, revised_by, revision_date, approval_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&rev_id)
    .bind(&payload.sop_id)
    .bind(new_version)
    .bind(&payload.revision_notes)
    .bind(&payload.revised_by)
    .bind(&now)
    .bind(&payload.approval_status)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Auto-mirror approval_status and version to sops
    let ts = Utc::now().to_rfc3339();
    sqlx::query(
        r#"
        UPDATE sops SET
            version = ?,
            approval_status = ?,
            updated_at = ?
        WHERE id = ?
        "#
    )
    .bind(new_version)
    .bind(&payload.approval_status)
    .bind(&ts)
    .bind(&payload.sop_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Tool {
    pub id: String,
    pub sop_id: String,
    pub name: String,
    pub r#type: Option<String>,
    pub model_part_no: Option<String>,
    pub specification: Option<String>,
    pub image_uuid: Option<String>,
    pub calibration_required: bool,
    pub calibration_due_date: Option<String>,
    pub source_tool_uuid: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Item {
    pub id: String,
    pub sop_id: String,
    pub name: String,
    pub part_no: Option<String>,
    pub description: Option<String>,
    pub image_uuid: Option<String>,
    pub unit: Option<String>,
    pub source_item_uuid: Option<String>,
}

// --------------------------------------------------------
// Commands
// --------------------------------------------------------

#[tauri::command]
pub async fn get_tools(sop_id: String, state: tauri::State<'_, SqlitePool>) -> Result<Vec<Tool>, String> {
    let tools = sqlx::query_as::<sqlx::Sqlite, Tool>(
        r#"
        SELECT id, sop_id, name, type, model_part_no, specification, image_uuid,
               CASE WHEN calibration_required = 1 THEN 1 ELSE 0 END as calibration_required,
               calibration_due_date, source_tool_uuid
        FROM tools
        WHERE sop_id = ?
        "#
    )
    .bind(sop_id)
    .fetch_all(state.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(tools)
}

#[tauri::command]
pub async fn save_tool(payload: Tool, state: tauri::State<'_, SqlitePool>) -> Result<(), String> {
    let cal_req = if payload.calibration_required { 1 } else { 0 };

    sqlx::query(
        r#"
        INSERT INTO tools (
            id, sop_id, name, type, model_part_no, specification, image_uuid,
            calibration_required, calibration_due_date, source_tool_uuid
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            type = excluded.type,
            model_part_no = excluded.model_part_no,
            specification = excluded.specification,
            image_uuid = excluded.image_uuid,
            calibration_required = excluded.calibration_required,
            calibration_due_date = excluded.calibration_due_date
        "#
    )
    .bind(&payload.id)
    .bind(&payload.sop_id)
    .bind(&payload.name)
    .bind(&payload.r#type)
    .bind(&payload.model_part_no)
    .bind(&payload.specification)
    .bind(&payload.image_uuid)
    .bind(cal_req)
    .bind(&payload.calibration_due_date)
    .bind(&payload.source_tool_uuid)
    .execute(state.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_tool(id: String, state: tauri::State<'_, SqlitePool>) -> Result<(), String> {
    sqlx::query("DELETE FROM tools WHERE id = ?")
        .bind(id)
        .execute(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_items(sop_id: String, state: tauri::State<'_, SqlitePool>) -> Result<Vec<Item>, String> {
    let items = sqlx::query_as::<sqlx::Sqlite, Item>(
        r#"
        SELECT id, sop_id, name, part_no, description, image_uuid, unit, source_item_uuid
        FROM items
        WHERE sop_id = ?
        "#
    )
    .bind(sop_id)
    .fetch_all(state.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
pub async fn save_item(payload: Item, state: tauri::State<'_, SqlitePool>) -> Result<(), String> {
    sqlx::query(
        r#"
        INSERT INTO items (
            id, sop_id, name, part_no, description, image_uuid, unit, source_item_uuid
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            part_no = excluded.part_no,
            description = excluded.description,
            image_uuid = excluded.image_uuid,
            unit = excluded.unit
        "#
    )
    .bind(&payload.id)
    .bind(&payload.sop_id)
    .bind(&payload.name)
    .bind(&payload.part_no)
    .bind(&payload.description)
    .bind(&payload.image_uuid)
    .bind(&payload.unit)
    .bind(&payload.source_item_uuid)
    .execute(state.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_item(id: String, state: tauri::State<'_, SqlitePool>) -> Result<(), String> {
    sqlx::query("DELETE FROM items WHERE id = ?")
        .bind(id)
        .execute(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn search_tools(query: String, state: tauri::State<'_, SqlitePool>) -> Result<Vec<Tool>, String> {
    let tools = sqlx::query_as::<sqlx::Sqlite, Tool>(
        r#"
        SELECT * FROM (
            SELECT *, COALESCE(source_tool_uuid, id) as dedup_id
            FROM tools
            WHERE name LIKE ?
        ) GROUP BY dedup_id
        "#
    )
    .bind(format!("%{}%", query))
    .fetch_all(state.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(tools)
}

#[tauri::command]
pub async fn search_items(query: String, state: tauri::State<'_, SqlitePool>) -> Result<Vec<Item>, String> {
    let items = sqlx::query_as::<sqlx::Sqlite, Item>(
        r#"
        SELECT * FROM items
        WHERE id IN (
            SELECT MIN(id)
            FROM items
            WHERE name LIKE ?
            GROUP BY COALESCE(source_item_uuid, id)
        )
        "#
    )
    .bind(format!("%{}%", query))
    .fetch_all(state.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
pub async fn clone_tool(
    tool_id: String, 
    target_sop_id: String, 
    state: tauri::State<'_, SqlitePool>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let pool = state.inner();
    
    // 1. Get original tool
    let original = sqlx::query_as::<sqlx::Sqlite, Tool>("SELECT * FROM tools WHERE id = ?")
        .bind(&tool_id)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;
        
    let new_id = Uuid::new_v4().to_string();
    let source_uuid = original.source_tool_uuid.unwrap_or(original.id);
    
    // 2. Clone images if present
    let mut new_image_uuid = None;
    if let Some(img_uuid) = original.image_uuid {
        let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
        let src_dir = app_dir.join("images").join(&img_uuid);
        let dst_uuid = Uuid::new_v4().to_string();
        let dst_dir = app_dir.join("images").join(&dst_uuid);
        
        if src_dir.exists() {
            std::fs::create_dir_all(&dst_dir).map_err(|e| e.to_string())?;
            for entry in std::fs::read_dir(src_dir).map_err(|e| e.to_string())? {
                let entry = entry.map_err(|e| e.to_string())?;
                let path = entry.path();
                if path.is_file() {
                    let file_name = path.file_name().unwrap();
                    std::fs::copy(&path, dst_dir.join(file_name)).map_err(|e| e.to_string())?;
                }
            }
            new_image_uuid = Some(dst_uuid);
        }
    }
    
    // 3. Insert new tool
    sqlx::query(
        r#"
        INSERT INTO tools (
            id, sop_id, name, type, model_part_no, specification, image_uuid,
            calibration_required, calibration_due_date, source_tool_uuid
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(new_id)
    .bind(target_sop_id)
    .bind(original.name)
    .bind(original.r#type)
    .bind(original.model_part_no)
    .bind(original.specification)
    .bind(new_image_uuid)
    .bind(if original.calibration_required { 1 } else { 0 })
    .bind(original.calibration_due_date)
    .bind(source_uuid)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn clone_item(
    item_id: String, 
    target_sop_id: String, 
    state: tauri::State<'_, SqlitePool>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let pool = state.inner();
    
    // 1. Get original item
    let original = sqlx::query_as::<sqlx::Sqlite, Item>("SELECT * FROM items WHERE id = ?")
        .bind(&item_id)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;
        
    let new_id = Uuid::new_v4().to_string();
    let source_uuid = original.source_item_uuid.unwrap_or(original.id);
    
    // 2. Clone images if present
    let mut new_image_uuid = None;
    if let Some(img_uuid) = original.image_uuid {
        let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
        let src_dir = app_dir.join("images").join(&img_uuid);
        let dst_uuid = Uuid::new_v4().to_string();
        let dst_dir = app_dir.join("images").join(&dst_uuid);
        
        if src_dir.exists() {
            std::fs::create_dir_all(&dst_dir).map_err(|e| e.to_string())?;
            for entry in std::fs::read_dir(src_dir).map_err(|e| e.to_string())? {
                let entry = entry.map_err(|e| e.to_string())?;
                let path = entry.path();
                if path.is_file() {
                    let file_name = path.file_name().unwrap();
                    std::fs::copy(&path, dst_dir.join(file_name)).map_err(|e| e.to_string())?;
                }
            }
            new_image_uuid = Some(dst_uuid);
        }
    }
    
    // 3. Insert new item
    sqlx::query(
        r#"
        INSERT INTO items (
            id, sop_id, name, part_no, description, image_uuid, unit, source_item_uuid
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(new_id)
    .bind(target_sop_id)
    .bind(original.name)
    .bind(original.part_no)
    .bind(original.description)
    .bind(new_image_uuid)
    .bind(original.unit)
    .bind(source_uuid)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn save_definition(_payload: serde_json::Value, _state: tauri::State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn save_step(_payload: serde_json::Value, _state: tauri::State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn save_step_image(_payload: serde_json::Value, _state: tauri::State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn save_step_tool(_payload: serde_json::Value, _state: tauri::State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn save_step_item(_payload: serde_json::Value, _state: tauri::State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    Ok(())
}

// Trait for Row unwrapping with default since sqlite MAX on empty returns NULL
trait UnwrapOr {
    fn unwrap_unwrap_or(self, default: i64) -> i64;
}

impl UnwrapOr for Result<i64, sqlx::Error> {
    fn unwrap_unwrap_or(self, default: i64) -> i64 {
        match self {
            Ok(v) => v,
            Err(_) => default,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct SaveImagePayload {
    pub original_base64: String,
    pub annotated_base64: String,
    pub ext: String,
}

#[tauri::command]
pub async fn save_image(
    payload: SaveImagePayload,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let uuid = Uuid::new_v4().to_string();
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let image_dir = app_dir.join("images").join(&uuid);
    
    std::fs::create_dir_all(&image_dir).map_err(|e: std::io::Error| e.to_string())?;
    
    let original_path = image_dir.join(format!("original.{}", payload.ext));
    let annotated_path = image_dir.join("annotated.png");
    
    let original_b64 = if let Some(idx) = payload.original_base64.find(',') {
        &payload.original_base64[idx + 1..]
    } else {
        &payload.original_base64
    };
    
    let annotated_b64 = if let Some(idx) = payload.annotated_base64.find(',') {
        &payload.annotated_base64[idx + 1..]
    } else {
        &payload.annotated_base64
    };
    
    let original_bytes = BASE64_STANDARD.decode(original_b64).map_err(|e: base64::DecodeError| e.to_string())?;
    let annotated_bytes = BASE64_STANDARD.decode(annotated_b64).map_err(|e: base64::DecodeError| e.to_string())?;
    
    std::fs::write(&original_path, original_bytes).map_err(|e: std::io::Error| e.to_string())?;
    std::fs::write(&annotated_path, annotated_bytes).map_err(|e: std::io::Error| e.to_string())?;
    
    Ok(uuid)
}
