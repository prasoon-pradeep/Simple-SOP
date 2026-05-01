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

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
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

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Step {
    pub id: String,
    pub sop_id: String,
    pub step_number: i64,
    pub action: Option<String>,
    pub notes: Option<String>,
    pub expected_output: Option<String>,
    pub sort_order: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct StepImage {
    pub id: String,
    pub step_id: String,
    pub image_uuid: String,
    pub sort_order: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct StepTool {
    pub id: String,
    pub step_id: String,
    pub tool_id: Option<String>,
    pub free_text: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct StepItem {
    pub id: String,
    pub step_id: String,
    pub item_id: Option<String>,
    pub free_text: Option<String>,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StepFull {
    pub step: Step,
    pub images: Vec<StepImage>,
    pub tools: Vec<StepTool>,
    pub items: Vec<StepItem>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Definition {
    pub id: String,
    pub sop_id: String,
    pub term: String,
    pub meaning: String,
    pub sort_order: i64,
}

// --------------------------------------------------------
// Commands
// --------------------------------------------------------

#[tauri::command]
pub async fn get_definitions(sop_id: String, state: tauri::State<'_, SqlitePool>) -> Result<Vec<Definition>, String> {
    let definitions = sqlx::query_as::<sqlx::Sqlite, Definition>(
        "SELECT * FROM definitions WHERE sop_id = ? ORDER BY sort_order ASC"
    )
    .bind(sop_id)
    .fetch_all(state.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(definitions)
}

#[tauri::command]
pub async fn save_definition(payload: Definition, state: tauri::State<'_, SqlitePool>) -> Result<(), String> {
    sqlx::query(
        r#"
        INSERT INTO definitions (id, sop_id, term, meaning, sort_order)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            term = excluded.term,
            meaning = excluded.meaning,
            sort_order = excluded.sort_order
        "#
    )
    .bind(&payload.id)
    .bind(&payload.sop_id)
    .bind(&payload.term)
    .bind(&payload.meaning)
    .bind(payload.sort_order)
    .execute(state.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_definition(id: String, state: tauri::State<'_, SqlitePool>) -> Result<(), String> {
    sqlx::query("DELETE FROM definitions WHERE id = ?")
        .bind(id)
        .execute(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

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
    pub approved_by: Option<String>,
    pub approval_date: Option<String>,
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
            id, sop_id, version, revision_notes, revised_by, revision_date, 
            approval_status, approved_by, approval_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&rev_id)
    .bind(&payload.sop_id)
    .bind(new_version)
    .bind(&payload.revision_notes)
    .bind(&payload.revised_by)
    .bind(&now)
    .bind(&payload.approval_status)
    .bind(&payload.approved_by)
    .bind(&payload.approval_date)
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
        SELECT * FROM tools
        WHERE id IN (
            SELECT MIN(id)
            FROM tools
            WHERE name LIKE ?
            GROUP BY COALESCE(source_tool_uuid, id)
        )
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
pub async fn get_steps_full(sop_id: String, state: tauri::State<'_, SqlitePool>) -> Result<Vec<StepFull>, String> {
    let pool = state.inner();
    
    let steps = sqlx::query_as::<sqlx::Sqlite, Step>(
        "SELECT * FROM steps WHERE sop_id = ? ORDER BY sort_order ASC"
    )
    .bind(&sop_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;
    
    if steps.is_empty() {
        return Ok(Vec::new());
    }

    let images = sqlx::query_as::<sqlx::Sqlite, StepImage>(
        "SELECT * FROM step_images WHERE step_id IN (SELECT id FROM steps WHERE sop_id = ?) ORDER BY sort_order ASC"
    )
    .bind(&sop_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let tools = sqlx::query_as::<sqlx::Sqlite, StepTool>(
        "SELECT * FROM step_tools WHERE step_id IN (SELECT id FROM steps WHERE sop_id = ?)"
    )
    .bind(&sop_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let items = sqlx::query_as::<sqlx::Sqlite, StepItem>(
        "SELECT * FROM step_items WHERE step_id IN (SELECT id FROM steps WHERE sop_id = ?)"
    )
    .bind(&sop_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;
// 3. Assemble full objects in memory
let mut images_map: std::collections::HashMap<String, Vec<StepImage>> = std::collections::HashMap::new();
for img in images {
    images_map.entry(img.step_id.clone()).or_default().push(img);
}

let mut tools_map: std::collections::HashMap<String, Vec<StepTool>> = std::collections::HashMap::new();
for tool in tools {
    tools_map.entry(tool.step_id.clone()).or_default().push(tool);
}

let mut items_map: std::collections::HashMap<String, Vec<StepItem>> = std::collections::HashMap::new();
for item in items {
    items_map.entry(item.step_id.clone()).or_default().push(item);
}

let mut steps_full = Vec::new();
for step in steps {
    let sid = step.id.clone();
    steps_full.push(StepFull {
        step,
        images: images_map.remove(&sid).unwrap_or_default(),
        tools: tools_map.remove(&sid).unwrap_or_default(),
        items: items_map.remove(&sid).unwrap_or_default(),
    });
}
Ok(steps_full)
}

#[tauri::command]
pub async fn save_step(payload: Step, state: tauri::State<'_, SqlitePool>) -> Result<(), String> {
    sqlx::query(
        r#"
        INSERT INTO steps (id, sop_id, step_number, action, notes, expected_output, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            step_number = excluded.step_number,
            action = excluded.action,
            notes = excluded.notes,
            expected_output = excluded.expected_output,
            sort_order = excluded.sort_order
        "#
    )
    .bind(&payload.id).bind(&payload.sop_id).bind(payload.step_number)
    .bind(&payload.action).bind(&payload.notes).bind(&payload.expected_output).bind(payload.sort_order)
    .execute(state.inner()).await.map_err(|e| e.to_string())?;
    Ok(())
}

async fn normalize_steps(sop_id: &str, tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>) -> Result<(), sqlx::Error> {
    let steps = sqlx::query_as::<sqlx::Sqlite, Step>("SELECT * FROM steps WHERE sop_id = ? ORDER BY sort_order ASC, step_number ASC")
        .bind(sop_id)
        .fetch_all(&mut **tx)
        .await?;
    
    for (idx, step) in steps.iter().enumerate() {
        let order = (idx + 1) as i64;
        if step.sort_order != order || step.step_number != order {
            sqlx::query("UPDATE steps SET sort_order = ?, step_number = ? WHERE id = ?")
                .bind(order)
                .bind(order)
                .bind(&step.id)
                .execute(&mut **tx)
                .await?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn delete_step(id: String, state: tauri::State<'_, SqlitePool>) -> Result<(), String> {
    let pool = state.inner();
    
    // Get sop_id first
    let row = sqlx::query("SELECT sop_id FROM steps WHERE id = ?").bind(&id).fetch_one(pool).await.map_err(|e| e.to_string())?;
    let sop_id: String = row.try_get("sop_id").map_err(|e| e.to_string())?;

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM step_images WHERE step_id = ?").bind(&id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM step_tools WHERE step_id = ?").bind(&id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM step_items WHERE step_id = ?").bind(&id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM steps WHERE id = ?").bind(&id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    
    normalize_steps(&sop_id, &mut tx).await.map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn reorder_steps(sop_id: String, step_ids: Vec<String>, state: tauri::State<'_, SqlitePool>) -> Result<(), String> {
    let pool = state.inner();
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    for (idx, id) in step_ids.iter().enumerate() {
        let order = (idx + 1) as i64;
        sqlx::query("UPDATE steps SET sort_order = ?, step_number = ? WHERE id = ? AND sop_id = ?")
            .bind(order).bind(order).bind(id).bind(&sop_id)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }
    
    normalize_steps(&sop_id, &mut tx).await.map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn save_step_image(payload: StepImage, state: tauri::State<'_, SqlitePool>) -> Result<(), String> {
    sqlx::query(
        r#"
        INSERT INTO step_images (id, step_id, image_uuid, sort_order)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET sort_order = excluded.sort_order
        "#
    )
    .bind(&payload.id).bind(&payload.step_id).bind(&payload.image_uuid).bind(payload.sort_order)
    .execute(state.inner()).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_step_image(id: String, state: tauri::State<'_, SqlitePool>) -> Result<(), String> {
    sqlx::query("DELETE FROM step_images WHERE id = ?").bind(id).execute(state.inner()).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn save_step_tool(payload: StepTool, state: tauri::State<'_, SqlitePool>) -> Result<(), String> {
    sqlx::query(
        r#"
        INSERT INTO step_tools (id, step_id, tool_id, free_text)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET tool_id = excluded.tool_id, free_text = excluded.free_text
        "#
    )
    .bind(&payload.id).bind(&payload.step_id).bind(&payload.tool_id).bind(&payload.free_text)
    .execute(state.inner()).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_step_tool(id: String, state: tauri::State<'_, SqlitePool>) -> Result<(), String> {
    sqlx::query("DELETE FROM step_tools WHERE id = ?").bind(id).execute(state.inner()).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn save_step_item(payload: StepItem, state: tauri::State<'_, SqlitePool>) -> Result<(), String> {
    sqlx::query(
        r#"
        INSERT INTO step_items (id, step_id, item_id, free_text, quantity, unit)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET item_id = excluded.item_id, free_text = excluded.free_text, quantity = excluded.quantity, unit = excluded.unit
        "#
    )
    .bind(&payload.id).bind(&payload.step_id).bind(&payload.item_id).bind(&payload.free_text).bind(payload.quantity).bind(&payload.unit)
    .execute(state.inner()).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_step_item(id: String, state: tauri::State<'_, SqlitePool>) -> Result<(), String> {
    sqlx::query("DELETE FROM step_items WHERE id = ?").bind(id).execute(state.inner()).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn duplicate_step(step_id: String, state: tauri::State<'_, SqlitePool>) -> Result<String, String> {
    let pool = state.inner();
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    
    let original = sqlx::query_as::<sqlx::Sqlite, Step>("SELECT * FROM steps WHERE id = ?")
        .bind(&step_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
        
    let new_id = Uuid::new_v4().to_string();
    let row = sqlx::query("SELECT MAX(sort_order) as max_so FROM steps WHERE sop_id = ?")
        .bind(&original.sop_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    let max_so: i64 = row.try_get("max_so").unwrap_unwrap_or(0);
    let new_so = max_so + 1;

    sqlx::query(
        r#"
        INSERT INTO steps (id, sop_id, step_number, action, notes, expected_output, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&new_id).bind(&original.sop_id).bind(new_so)
    .bind(&original.action).bind(&original.notes).bind(&original.expected_output).bind(new_so)
    .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    
    // Images
    let images = sqlx::query_as::<sqlx::Sqlite, StepImage>("SELECT * FROM step_images WHERE step_id = ?")
        .bind(&step_id).fetch_all(&mut *tx).await.map_err(|e| e.to_string())?;
    for img in images {
        sqlx::query("INSERT INTO step_images (id, step_id, image_uuid, sort_order) VALUES (?, ?, ?, ?)")
            .bind(Uuid::new_v4().to_string()).bind(&new_id).bind(img.image_uuid).bind(img.sort_order)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }
    
    // Tools
    let tools = sqlx::query_as::<sqlx::Sqlite, StepTool>("SELECT * FROM step_tools WHERE step_id = ?")
        .bind(&step_id).fetch_all(&mut *tx).await.map_err(|e| e.to_string())?;
    for tool in tools {
        sqlx::query("INSERT INTO step_tools (id, step_id, tool_id, free_text) VALUES (?, ?, ?, ?)")
            .bind(Uuid::new_v4().to_string()).bind(&new_id).bind(tool.tool_id).bind(tool.free_text)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }
    
    // Items
    let items = sqlx::query_as::<sqlx::Sqlite, StepItem>("SELECT * FROM step_items WHERE step_id = ?")
        .bind(&step_id).fetch_all(&mut *tx).await.map_err(|e| e.to_string())?;
    for item in items {
        sqlx::query("INSERT INTO step_items (id, step_id, item_id, free_text, quantity, unit) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(Uuid::new_v4().to_string()).bind(&new_id).bind(item.item_id).bind(item.free_text).bind(item.quantity).bind(item.unit)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    normalize_steps(&original.sop_id, &mut tx).await.map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(new_id)
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

impl UnwrapOr for i64 {
    fn unwrap_unwrap_or(self, _default: i64) -> i64 {
        self
    }
}

impl UnwrapOr for Option<i64> {
    fn unwrap_unwrap_or(self, default: i64) -> i64 {
        self.unwrap_or(default)
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
