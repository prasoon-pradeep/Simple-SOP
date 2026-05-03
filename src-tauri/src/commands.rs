use base64::prelude::BASE64_STANDARD;
use base64::Engine;
use chrono::{Datelike, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;
use uuid::Uuid;

#[tauri::command]
pub fn generate_sop_id() -> String {
    let year = Utc::now().year();
    let mut ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u128;

    let valid_chars = [
        '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F',
    ];

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

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
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
    pub is_deleted: i64,
    pub deleted_at: Option<String>,
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
pub async fn get_definitions(
    sop_id: String,
    state: tauri::State<'_, SqlitePool>,
) -> Result<Vec<Definition>, String> {
    let definitions = sqlx::query_as::<sqlx::Sqlite, Definition>(
        "SELECT * FROM definitions WHERE sop_id = ? ORDER BY sort_order ASC",
    )
    .bind(sop_id)
    .fetch_all(state.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(definitions)
}

#[tauri::command]
pub async fn save_definition(
    payload: Definition,
    state: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    sqlx::query(
        r#"
        INSERT INTO definitions (id, sop_id, term, meaning, sort_order)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            term = excluded.term,
            meaning = excluded.meaning,
            sort_order = excluded.sort_order
        "#,
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
pub async fn delete_definition(
    id: String,
    state: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    sqlx::query("DELETE FROM definitions WHERE id = ?")
        .bind(id)
        .execute(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn create_sop(
    title: String,
    state: tauri::State<'_, SqlitePool>,
) -> Result<String, String> {
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
        "#,
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
        "#,
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
               safety_notes, training_required, training_details, created_at, updated_at,
               is_deleted, deleted_at
        FROM sops
        WHERE is_deleted = 0
        ORDER BY updated_at DESC
        "#,
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
               safety_notes, training_required, training_details, created_at, updated_at,
               is_deleted, deleted_at
        FROM sops
        WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_one(state.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(sop)
}

#[tauri::command]
pub async fn soft_delete_sop(
    id: String,
    state: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let ts = Utc::now().to_rfc3339();
    sqlx::query("UPDATE sops SET is_deleted = 1, deleted_at = ? WHERE id = ?")
        .bind(&ts)
        .bind(id)
        .execute(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_revisions(
    sop_id: String,
    state: tauri::State<'_, SqlitePool>,
) -> Result<Vec<Revision>, String> {
    let revs = sqlx::query_as::<sqlx::Sqlite, Revision>(
        r#"
        SELECT id, sop_id, version, revision_notes, revised_by, revision_date,
               approval_status, approved_by, approval_date
        FROM revisions
        WHERE sop_id = ?
        ORDER BY version DESC
        "#,
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
        "#,
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
pub async fn save_revision(
    payload: CreateRevisionPayload,
    state: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
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
        "#,
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
        "#,
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
pub async fn get_tools(
    sop_id: String,
    state: tauri::State<'_, SqlitePool>,
) -> Result<Vec<Tool>, String> {
    let tools = sqlx::query_as::<sqlx::Sqlite, Tool>(
        r#"
        SELECT id, sop_id, name, type, model_part_no, specification, image_uuid,
               CASE WHEN calibration_required = 1 THEN 1 ELSE 0 END as calibration_required,
               calibration_due_date, source_tool_uuid
        FROM tools
        WHERE sop_id = ?
        "#,
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
        "#,
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
pub async fn get_items(
    sop_id: String,
    state: tauri::State<'_, SqlitePool>,
) -> Result<Vec<Item>, String> {
    let items = sqlx::query_as::<sqlx::Sqlite, Item>(
        r#"
        SELECT id, sop_id, name, part_no, description, image_uuid, unit, source_item_uuid
        FROM items
        WHERE sop_id = ?
        "#,
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
        "#,
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
pub async fn search_tools(
    query: String,
    state: tauri::State<'_, SqlitePool>,
) -> Result<Vec<Tool>, String> {
    let tools = sqlx::query_as::<sqlx::Sqlite, Tool>(
        r#"
        SELECT * FROM tools
        WHERE id IN (
            SELECT MIN(id)
            FROM tools
            WHERE name LIKE ?
            GROUP BY COALESCE(source_tool_uuid, id)
        )
        "#,
    )
    .bind(format!("%{}%", query))
    .fetch_all(state.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(tools)
}

#[tauri::command]
pub async fn search_items(
    query: String,
    state: tauri::State<'_, SqlitePool>,
) -> Result<Vec<Item>, String> {
    let items = sqlx::query_as::<sqlx::Sqlite, Item>(
        r#"
        SELECT * FROM items
        WHERE id IN (
            SELECT MIN(id)
            FROM items
            WHERE name LIKE ?
            GROUP BY COALESCE(source_item_uuid, id)
        )
        "#,
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
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?;
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
        "#,
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
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?;
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
        "#,
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
pub async fn get_steps_full(
    sop_id: String,
    state: tauri::State<'_, SqlitePool>,
) -> Result<Vec<StepFull>, String> {
    let pool = state.inner();

    let steps = sqlx::query_as::<sqlx::Sqlite, Step>(
        "SELECT * FROM steps WHERE sop_id = ? ORDER BY sort_order ASC",
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
        "SELECT * FROM step_tools WHERE step_id IN (SELECT id FROM steps WHERE sop_id = ?)",
    )
    .bind(&sop_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let items = sqlx::query_as::<sqlx::Sqlite, StepItem>(
        "SELECT * FROM step_items WHERE step_id IN (SELECT id FROM steps WHERE sop_id = ?)",
    )
    .bind(&sop_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;
    // 3. Assemble full objects in memory
    let mut images_map: std::collections::HashMap<String, Vec<StepImage>> =
        std::collections::HashMap::new();
    for img in images {
        images_map.entry(img.step_id.clone()).or_default().push(img);
    }

    let mut tools_map: std::collections::HashMap<String, Vec<StepTool>> =
        std::collections::HashMap::new();
    for tool in tools {
        tools_map
            .entry(tool.step_id.clone())
            .or_default()
            .push(tool);
    }

    let mut items_map: std::collections::HashMap<String, Vec<StepItem>> =
        std::collections::HashMap::new();
    for item in items {
        items_map
            .entry(item.step_id.clone())
            .or_default()
            .push(item);
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
        "#,
    )
    .bind(&payload.id)
    .bind(&payload.sop_id)
    .bind(payload.step_number)
    .bind(&payload.action)
    .bind(&payload.notes)
    .bind(&payload.expected_output)
    .bind(payload.sort_order)
    .execute(state.inner())
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

async fn normalize_steps(
    sop_id: &str,
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
) -> Result<(), sqlx::Error> {
    let steps = sqlx::query_as::<sqlx::Sqlite, Step>(
        "SELECT * FROM steps WHERE sop_id = ? ORDER BY sort_order ASC, step_number ASC",
    )
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
    let row = sqlx::query("SELECT sop_id FROM steps WHERE id = ?")
        .bind(&id)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;
    let sop_id: String = row.try_get("sop_id").map_err(|e| e.to_string())?;

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM step_images WHERE step_id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM step_tools WHERE step_id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM step_items WHERE step_id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM steps WHERE id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    normalize_steps(&sop_id, &mut tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn reorder_steps(
    sop_id: String,
    step_ids: Vec<String>,
    state: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let pool = state.inner();
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    for (idx, id) in step_ids.iter().enumerate() {
        let order = (idx + 1) as i64;
        sqlx::query("UPDATE steps SET sort_order = ?, step_number = ? WHERE id = ? AND sop_id = ?")
            .bind(order)
            .bind(order)
            .bind(id)
            .bind(&sop_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    normalize_steps(&sop_id, &mut tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn save_step_image(
    payload: StepImage,
    state: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    sqlx::query(
        r#"
        INSERT INTO step_images (id, step_id, image_uuid, sort_order)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET sort_order = excluded.sort_order
        "#,
    )
    .bind(&payload.id)
    .bind(&payload.step_id)
    .bind(&payload.image_uuid)
    .bind(payload.sort_order)
    .execute(state.inner())
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_step_image(
    id: String,
    state: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    sqlx::query("DELETE FROM step_images WHERE id = ?")
        .bind(id)
        .execute(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn save_step_tool(
    payload: StepTool,
    state: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    sqlx::query(
        r#"
        INSERT INTO step_tools (id, step_id, tool_id, free_text)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET tool_id = excluded.tool_id, free_text = excluded.free_text
        "#,
    )
    .bind(&payload.id)
    .bind(&payload.step_id)
    .bind(&payload.tool_id)
    .bind(&payload.free_text)
    .execute(state.inner())
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_step_tool(
    id: String,
    state: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    sqlx::query("DELETE FROM step_tools WHERE id = ?")
        .bind(id)
        .execute(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn save_step_item(
    payload: StepItem,
    state: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
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
pub async fn delete_step_item(
    id: String,
    state: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    sqlx::query("DELETE FROM step_items WHERE id = ?")
        .bind(id)
        .execute(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn duplicate_step(
    step_id: String,
    state: tauri::State<'_, SqlitePool>,
) -> Result<String, String> {
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
        "#,
    )
    .bind(&new_id)
    .bind(&original.sop_id)
    .bind(new_so)
    .bind(&original.action)
    .bind(&original.notes)
    .bind(&original.expected_output)
    .bind(new_so)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Images
    let images =
        sqlx::query_as::<sqlx::Sqlite, StepImage>("SELECT * FROM step_images WHERE step_id = ?")
            .bind(&step_id)
            .fetch_all(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    for img in images {
        sqlx::query(
            "INSERT INTO step_images (id, step_id, image_uuid, sort_order) VALUES (?, ?, ?, ?)",
        )
        .bind(Uuid::new_v4().to_string())
        .bind(&new_id)
        .bind(img.image_uuid)
        .bind(img.sort_order)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    // Tools
    let tools =
        sqlx::query_as::<sqlx::Sqlite, StepTool>("SELECT * FROM step_tools WHERE step_id = ?")
            .bind(&step_id)
            .fetch_all(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    for tool in tools {
        sqlx::query("INSERT INTO step_tools (id, step_id, tool_id, free_text) VALUES (?, ?, ?, ?)")
            .bind(Uuid::new_v4().to_string())
            .bind(&new_id)
            .bind(tool.tool_id)
            .bind(tool.free_text)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    // Items
    let items =
        sqlx::query_as::<sqlx::Sqlite, StepItem>("SELECT * FROM step_items WHERE step_id = ?")
            .bind(&step_id)
            .fetch_all(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    for item in items {
        sqlx::query("INSERT INTO step_items (id, step_id, item_id, free_text, quantity, unit) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(Uuid::new_v4().to_string()).bind(&new_id).bind(item.item_id).bind(item.free_text).bind(item.quantity).bind(item.unit)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    normalize_steps(&original.sop_id, &mut tx)
        .await
        .map_err(|e| e.to_string())?;

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
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
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

    let original_bytes = BASE64_STANDARD
        .decode(original_b64)
        .map_err(|e: base64::DecodeError| e.to_string())?;
    let annotated_bytes = BASE64_STANDARD
        .decode(annotated_b64)
        .map_err(|e: base64::DecodeError| e.to_string())?;

    std::fs::write(&original_path, original_bytes).map_err(|e: std::io::Error| e.to_string())?;
    std::fs::write(&annotated_path, annotated_bytes).map_err(|e: std::io::Error| e.to_string())?;

    Ok(uuid)
}

// --------------------------------------------------------
// .SOP Export/Import
// --------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
pub struct SopBundle {
    pub sop: SOP,
    pub revisions: Vec<Revision>,
    pub definitions: Vec<Definition>,
    pub tools: Vec<Tool>,
    pub items: Vec<Item>,
    pub steps: Vec<Step>,
    pub step_images: Vec<StepImage>,
    pub step_tools: Vec<StepTool>,
    pub step_items: Vec<StepItem>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportManifest {
    pub app_version: String,
    pub export_date: String,
    pub sop_id: String,
    pub sop_uuid: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportPreview {
    pub temp_dir: String,
    pub sop_id: String,
    pub sop_uuid: String,
    pub title: String,
    pub exists: bool,
}

#[tauri::command]
pub async fn export_sop(
    sop_id_uuid: String,
    save_path: String,
    state: tauri::State<'_, SqlitePool>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let pool = state.inner();
    
    // 1. Gather all data
    let sop = sqlx::query_as::<sqlx::Sqlite, SOP>("SELECT * FROM sops WHERE id = ?")
        .bind(&sop_id_uuid)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

    let revisions = sqlx::query_as::<sqlx::Sqlite, Revision>("SELECT * FROM revisions WHERE sop_id = ?")
        .bind(&sop_id_uuid)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let definitions = sqlx::query_as::<sqlx::Sqlite, Definition>("SELECT * FROM definitions WHERE sop_id = ?")
        .bind(&sop_id_uuid)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let tools = sqlx::query_as::<sqlx::Sqlite, Tool>("SELECT * FROM tools WHERE sop_id = ?")
        .bind(&sop_id_uuid)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let items = sqlx::query_as::<sqlx::Sqlite, Item>("SELECT * FROM items WHERE sop_id = ?")
        .bind(&sop_id_uuid)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let steps = sqlx::query_as::<sqlx::Sqlite, Step>("SELECT * FROM steps WHERE sop_id = ?")
        .bind(&sop_id_uuid)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let step_ids: Vec<String> = steps.iter().map(|s| s.id.clone()).collect();
    
    let mut step_images = Vec::new();
    let mut step_tools = Vec::new();
    let mut step_items = Vec::new();

    if !step_ids.is_empty() {
        let query_images = format!("SELECT * FROM step_images WHERE step_id IN ({})", step_ids.iter().map(|_| "?").collect::<Vec<_>>().join(","));
        let mut q = sqlx::query_as::<sqlx::Sqlite, StepImage>(&query_images);
        for id in &step_ids { q = q.bind(id); }
        step_images = q.fetch_all(pool).await.map_err(|e| e.to_string())?;

        let query_tools = format!("SELECT * FROM step_tools WHERE step_id IN ({})", step_ids.iter().map(|_| "?").collect::<Vec<_>>().join(","));
        let mut q = sqlx::query_as::<sqlx::Sqlite, StepTool>(&query_tools);
        for id in &step_ids { q = q.bind(id); }
        step_tools = q.fetch_all(pool).await.map_err(|e| e.to_string())?;

        let query_items = format!("SELECT * FROM step_items WHERE step_id IN ({})", step_ids.iter().map(|_| "?").collect::<Vec<_>>().join(","));
        let mut q = sqlx::query_as::<sqlx::Sqlite, StepItem>(&query_items);
        for id in &step_ids { q = q.bind(id); }
        step_items = q.fetch_all(pool).await.map_err(|e| e.to_string())?;
    }

    let bundle = SopBundle {
        sop: sop.clone(),
        revisions,
        definitions,
        tools,
        items,
        steps,
        step_images,
        step_tools,
        step_items,
    };

    // 2. Prepare Temp Directory
    let temp_dir = tempfile::tempdir().map_err(|e| e.to_string())?;
    let images_dir = temp_dir.path().join("images");
    std::fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;

    // 3. Write Data Files
    let data_json = serde_json::to_string_pretty(&bundle).map_err(|e| e.to_string())?;
    std::fs::write(temp_dir.path().join("sop-data.json"), data_json).map_err(|e| e.to_string())?;

    let manifest = ImportManifest {
        app_version: app_handle.package_info().version.to_string(),
        export_date: Utc::now().to_rfc3339(),
        sop_id: sop.sop_id,
        sop_uuid: sop.id,
    };
    let manifest_json = serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?;
    std::fs::write(temp_dir.path().join("manifest.json"), manifest_json).map_err(|e| e.to_string())?;

    // 4. Copy Images
    let mut image_uuids = std::collections::HashSet::new();
    for tool in &bundle.tools { if let Some(uuid) = &tool.image_uuid { image_uuids.insert(uuid.clone()); } }
    for item in &bundle.items { if let Some(uuid) = &item.image_uuid { image_uuids.insert(uuid.clone()); } }
    for img in &bundle.step_images { image_uuids.insert(img.image_uuid.clone()); }

    let app_images_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?.join("images");
    for uuid in image_uuids {
        let src = app_images_dir.join(&uuid);
        if src.exists() {
            let dst = images_dir.join(&uuid);
            std::fs::create_dir_all(&dst).map_err(|e| e.to_string())?;
            for entry in std::fs::read_dir(src).map_err(|e| e.to_string())? {
                let entry = entry.map_err(|e| e.to_string())?;
                std::fs::copy(entry.path(), dst.join(entry.file_name())).map_err(|e| e.to_string())?;
            }
        }
    }

    // 5. Zip it up
    let file = std::fs::File::create(save_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    let walk = walkdir::WalkDir::new(temp_dir.path());
    for entry in walk.into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        let name = path.strip_prefix(temp_dir.path()).map_err(|e| e.to_string())?;

        if path.is_file() {
            zip.start_file(name.to_string_lossy(), options).map_err(|e| e.to_string())?;
            let mut f = std::fs::File::open(path).map_err(|e| e.to_string())?;
            std::io::copy(&mut f, &mut zip).map_err(|e| e.to_string())?;
        } else if !name.as_os_str().is_empty() {
            zip.add_directory(name.to_string_lossy(), options).map_err(|e| e.to_string())?;
        }
    }
    zip.finish().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn import_sop_preview(
    file_path: String,
    state: tauri::State<'_, SqlitePool>,
) -> Result<ImportPreview, String> {
    let _temp_dir = tempfile::Builder::new()
        .prefix("sop_import_")
        .tempdir()
        .map_err(|e| e.to_string())?;
    
    // Unzip
    let file = std::fs::File::open(file_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    
    // We need to keep the temp dir alive, but we can't easily return it. 
    // So we'll move it to a persistent location or just return the path as a string and hope.
    // Actually, let's use a non-auto-deleting directory for the preview phase.
    let persistent_temp = std::env::temp_dir().join(format!("sop_import_{}", Uuid::new_v4()));
    std::fs::create_dir_all(&persistent_temp).map_err(|e| e.to_string())?;
    archive.extract(&persistent_temp).map_err(|e| e.to_string())?;

    let manifest_path = persistent_temp.join("manifest.json");
    let manifest_str = std::fs::read_to_string(manifest_path).map_err(|_| "Invalid .sop file: manifest.json missing".to_string())?;
    let manifest: ImportManifest = serde_json::from_str(&manifest_str).map_err(|e| e.to_string())?;

    let data_path = persistent_temp.join("sop-data.json");
    let data_str = std::fs::read_to_string(data_path).map_err(|_| "Invalid .sop file: sop-data.json missing".to_string())?;
    let bundle: SopBundle = serde_json::from_str(&data_str).map_err(|e| e.to_string())?;

    // Check if UUID exists
    let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM sops WHERE id = ?")
        .bind(&manifest.sop_uuid)
        .fetch_one(state.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(ImportPreview {
        temp_dir: persistent_temp.to_string_lossy().to_string(),
        sop_id: manifest.sop_id,
        sop_uuid: manifest.sop_uuid,
        title: bundle.sop.title,
        exists: row.0 > 0,
    })
}

#[tauri::command]
pub async fn finalize_import(
    temp_dir: String,
    mode: String, // "replace" or "new"
    state: tauri::State<'_, SqlitePool>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let pool = state.inner();
    let temp_path = std::path::Path::new(&temp_dir);
    
    let data_str = std::fs::read_to_string(temp_path.join("sop-data.json")).map_err(|e| e.to_string())?;
    let mut bundle: SopBundle = serde_json::from_str(&data_str).map_err(|e| e.to_string())?;

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let final_sop_uuid = if mode == "new" {
        let new_sop_uuid = Uuid::new_v4().to_string();
        let new_sop_id = generate_sop_id();
        
        // Update all UUIDs in the bundle to prevent collisions
        let _old_sop_uuid = bundle.sop.id.clone();
        bundle.sop.id = new_sop_uuid.clone();
        bundle.sop.sop_id = new_sop_id;

        for rev in &mut bundle.revisions { rev.id = Uuid::new_v4().to_string(); rev.sop_id = new_sop_uuid.clone(); }
        for def in &mut bundle.definitions { def.id = Uuid::new_v4().to_string(); def.sop_id = new_sop_uuid.clone(); }
        
        let mut tool_id_map = std::collections::HashMap::new();
        for tool in &mut bundle.tools {
            let old_id = tool.id.clone();
            let new_id = Uuid::new_v4().to_string();
            tool_id_map.insert(old_id, new_id.clone());
            tool.id = new_id;
            tool.sop_id = new_sop_uuid.clone();
        }

        let mut item_id_map = std::collections::HashMap::new();
        for item in &mut bundle.items {
            let old_id = item.id.clone();
            let new_id = Uuid::new_v4().to_string();
            item_id_map.insert(old_id, new_id.clone());
            item.id = new_id;
            item.sop_id = new_sop_uuid.clone();
        }

        let mut step_id_map = std::collections::HashMap::new();
        for step in &mut bundle.steps {
            let old_id = step.id.clone();
            let new_id = Uuid::new_v4().to_string();
            step_id_map.insert(old_id, new_id.clone());
            step.id = new_id;
            step.sop_id = new_sop_uuid.clone();
        }

        for img in &mut bundle.step_images {
            img.id = Uuid::new_v4().to_string();
            img.step_id = step_id_map.get(&img.step_id).cloned().unwrap_or(img.step_id.clone());
        }

        for st in &mut bundle.step_tools {
            st.id = Uuid::new_v4().to_string();
            st.step_id = step_id_map.get(&st.step_id).cloned().unwrap_or(st.step_id.clone());
            if let Some(tid) = &st.tool_id { st.tool_id = tool_id_map.get(tid).cloned().or(Some(tid.clone())); }
        }

        for si in &mut bundle.step_items {
            si.id = Uuid::new_v4().to_string();
            si.step_id = step_id_map.get(&si.step_id).cloned().unwrap_or(si.step_id.clone());
            if let Some(iid) = &si.item_id { si.item_id = item_id_map.get(iid).cloned().or(Some(iid.clone())); }
        }

        new_sop_uuid
    } else {
        // Replace mode: Delete existing first
        let id = bundle.sop.id.clone();
        sqlx::query("DELETE FROM step_items WHERE step_id IN (SELECT id FROM steps WHERE sop_id = ?)").bind(&id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM step_tools WHERE step_id IN (SELECT id FROM steps WHERE sop_id = ?)").bind(&id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM step_images WHERE step_id IN (SELECT id FROM steps WHERE sop_id = ?)").bind(&id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM steps WHERE sop_id = ?").bind(&id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM items WHERE sop_id = ?").bind(&id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM tools WHERE sop_id = ?").bind(&id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM definitions WHERE sop_id = ?").bind(&id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM revisions WHERE sop_id = ?").bind(&id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM sops WHERE id = ?").bind(&id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
        
        id
    };

    // Insert Data
    sqlx::query(
        r#"
        INSERT INTO sops (
            id, sop_id, version, title, project_tag, department, document_owner,
            created_by, created_date, active_date, next_review_date, approval_status,
            regulatory_ref, distribution_list, related_documents, purpose, scope,
            safety_notes, training_required, training_details, created_at, updated_at,
            is_deleted, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&bundle.sop.id).bind(&bundle.sop.sop_id).bind(bundle.sop.version).bind(&bundle.sop.title)
    .bind(&bundle.sop.project_tag).bind(&bundle.sop.department).bind(&bundle.sop.document_owner)
    .bind(&bundle.sop.created_by).bind(&bundle.sop.created_date).bind(&bundle.sop.active_date)
    .bind(&bundle.sop.next_review_date).bind(&bundle.sop.approval_status).bind(&bundle.sop.regulatory_ref)
    .bind(&bundle.sop.distribution_list).bind(&bundle.sop.related_documents).bind(&bundle.sop.purpose)
    .bind(&bundle.sop.scope).bind(&bundle.sop.safety_notes).bind(if bundle.sop.training_required {1} else {0})
    .bind(&bundle.sop.training_details).bind(&bundle.sop.created_at).bind(&bundle.sop.updated_at)
    .bind(bundle.sop.is_deleted).bind(&bundle.sop.deleted_at)
    .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    for rev in bundle.revisions {
        sqlx::query("INSERT INTO revisions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(rev.id).bind(rev.sop_id).bind(rev.version).bind(rev.revision_notes)
            .bind(rev.revised_by).bind(rev.revision_date).bind(rev.approval_status)
            .bind(rev.approved_by).bind(rev.approval_date)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    for def in bundle.definitions {
        sqlx::query("INSERT INTO definitions VALUES (?, ?, ?, ?, ?)")
            .bind(def.id).bind(def.sop_id).bind(def.term).bind(def.meaning).bind(def.sort_order)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    for tool in bundle.tools {
        sqlx::query("INSERT INTO tools VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(tool.id).bind(tool.sop_id).bind(tool.name).bind(tool.r#type)
            .bind(tool.model_part_no).bind(tool.specification).bind(tool.image_uuid)
            .bind(if tool.calibration_required {1} else {0}).bind(tool.calibration_due_date).bind(tool.source_tool_uuid)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    for item in bundle.items {
        sqlx::query("INSERT INTO items VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(item.id).bind(item.sop_id).bind(item.name).bind(item.part_no)
            .bind(item.description).bind(item.image_uuid).bind(item.unit).bind(item.source_item_uuid)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    for step in bundle.steps {
        sqlx::query("INSERT INTO steps VALUES (?, ?, ?, ?, ?, ?, ?)")
            .bind(step.id).bind(step.sop_id).bind(step.step_number).bind(step.action)
            .bind(step.notes).bind(step.expected_output).bind(step.sort_order)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    for img in bundle.step_images {
        sqlx::query("INSERT INTO step_images VALUES (?, ?, ?, ?)")
            .bind(img.id).bind(img.step_id).bind(img.image_uuid).bind(img.sort_order)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    for st in bundle.step_tools {
        sqlx::query("INSERT INTO step_tools VALUES (?, ?, ?, ?)")
            .bind(st.id).bind(st.step_id).bind(st.tool_id).bind(st.free_text)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    for si in bundle.step_items {
        sqlx::query("INSERT INTO step_items VALUES (?, ?, ?, ?, ?, ?)")
            .bind(si.id).bind(si.step_id).bind(si.item_id).bind(si.free_text).bind(si.quantity).bind(si.unit)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    // Copy Images
    let app_images_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?.join("images");
    let temp_images_dir = temp_path.join("images");
    if temp_images_dir.exists() {
        for entry in std::fs::read_dir(temp_images_dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let dst = app_images_dir.join(entry.file_name());
            std::fs::create_dir_all(&dst).map_err(|e| e.to_string())?;
            for file_entry in std::fs::read_dir(entry.path()).map_err(|e| e.to_string())? {
                let file_entry = file_entry.map_err(|e| e.to_string())?;
                std::fs::copy(file_entry.path(), dst.join(file_entry.file_name())).map_err(|e| e.to_string())?;
            }
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    // Cleanup temp
    let _ = std::fs::remove_dir_all(temp_path);

    Ok(final_sop_uuid)
}

// --------------------------------------------------------
// DB Health
// --------------------------------------------------------

#[tauri::command]
pub async fn check_db_health(
    state: tauri::State<'_, SqlitePool>,
) -> Result<bool, String> {
    let row: (String,) = sqlx::query_as("PRAGMA integrity_check;")
        .fetch_one(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(row.0 == "ok")
}

// --------------------------------------------------------
// App Config
// --------------------------------------------------------

#[tauri::command]
pub async fn get_config_value(
    key: String,
    state: tauri::State<'_, SqlitePool>,
) -> Result<Option<String>, String> {
    let row: Option<(String,)> = sqlx::query_as("SELECT value FROM app_config WHERE key = ?")
        .bind(&key)
        .fetch_optional(state.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(row.map(|(v,)| v))
}

#[tauri::command]
pub async fn set_config_value(
    key: String,
    value: String,
    state: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO app_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind(&key)
    .bind(&value)
    .execute(state.inner())
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

// --------------------------------------------------------
// PDF Export
// --------------------------------------------------------

#[tauri::command]
pub async fn export_pdf(
    sop_id_uuid: String,
    state: tauri::State<'_, SqlitePool>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let pool = state.inner();

    // Fetch all data
    let sop = sqlx::query_as::<sqlx::Sqlite, SOP>("SELECT * FROM sops WHERE id = ?")
        .bind(&sop_id_uuid).fetch_one(pool).await.map_err(|e| e.to_string())?;

    let revisions = sqlx::query_as::<sqlx::Sqlite, Revision>("SELECT * FROM revisions WHERE sop_id = ? ORDER BY version DESC")
        .bind(&sop_id_uuid).fetch_all(pool).await.map_err(|e| e.to_string())?;

    let definitions = sqlx::query_as::<sqlx::Sqlite, Definition>("SELECT * FROM definitions WHERE sop_id = ? ORDER BY sort_order")
        .bind(&sop_id_uuid).fetch_all(pool).await.map_err(|e| e.to_string())?;

    let tools = sqlx::query_as::<sqlx::Sqlite, Tool>("SELECT * FROM tools WHERE sop_id = ?")
        .bind(&sop_id_uuid).fetch_all(pool).await.map_err(|e| e.to_string())?;

    let items = sqlx::query_as::<sqlx::Sqlite, Item>("SELECT * FROM items WHERE sop_id = ?")
        .bind(&sop_id_uuid).fetch_all(pool).await.map_err(|e| e.to_string())?;

    let steps = sqlx::query_as::<sqlx::Sqlite, Step>("SELECT * FROM steps WHERE sop_id = ? ORDER BY sort_order")
        .bind(&sop_id_uuid).fetch_all(pool).await.map_err(|e| e.to_string())?;

    let step_ids: Vec<String> = steps.iter().map(|s| s.id.clone()).collect();
    let mut step_images: Vec<StepImage> = Vec::new();
    let mut step_tools_data: Vec<StepTool> = Vec::new();
    let mut step_items_data: Vec<StepItem> = Vec::new();

    if !step_ids.is_empty() {
        let placeholders = step_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");

        let q_imgs = format!("SELECT * FROM step_images WHERE step_id IN ({}) ORDER BY sort_order", placeholders);
        let mut q = sqlx::query_as::<sqlx::Sqlite, StepImage>(&q_imgs);
        for id in &step_ids { q = q.bind(id); }
        step_images = q.fetch_all(pool).await.map_err(|e| e.to_string())?;

        let q_st = format!("SELECT * FROM step_tools WHERE step_id IN ({})", placeholders);
        let mut q = sqlx::query_as::<sqlx::Sqlite, StepTool>(&q_st);
        for id in &step_ids { q = q.bind(id); }
        step_tools_data = q.fetch_all(pool).await.map_err(|e| e.to_string())?;

        let q_si = format!("SELECT * FROM step_items WHERE step_id IN ({})", placeholders);
        let mut q = sqlx::query_as::<sqlx::Sqlite, StepItem>(&q_si);
        for id in &step_ids { q = q.bind(id); }
        step_items_data = q.fetch_all(pool).await.map_err(|e| e.to_string())?;
    }

    // Build image URL helper — embed as base64 data URI to avoid asset:// protocol issues in PDF webview
    let app_data = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let image_url = |uuid: &str| -> String {
        let path = app_data.join("images").join(uuid).join("annotated.png");
        match std::fs::read(&path) {
            Ok(bytes) => format!("data:image/png;base64,{}", BASE64_STANDARD.encode(&bytes)),
            Err(_) => String::new(),
        }
    };

    // Build tool lookup map
    let tool_map: std::collections::HashMap<String, &Tool> = tools.iter().map(|t| (t.id.clone(), t)).collect();
    let item_map: std::collections::HashMap<String, &Item> = items.iter().map(|i| (i.id.clone(), i)).collect();

    // Build SOP_DATA JSON
    let tools_json: Vec<serde_json::Value> = tools.iter().map(|t| {
        serde_json::json!({
            "name": t.name,
            "type": t.r#type,
            "model_part_no": t.model_part_no,
            "specification": t.specification,
            "calibration_required": t.calibration_required,
            "calibration_due_date": t.calibration_due_date,
            "image_url": t.image_uuid.as_ref().map(|u| image_url(u))
        })
    }).collect();

    let items_json: Vec<serde_json::Value> = items.iter().map(|i| {
        serde_json::json!({
            "name": i.name,
            "part_no": i.part_no,
            "description": i.description,
            "unit": i.unit,
            "image_url": i.image_uuid.as_ref().map(|u| image_url(u))
        })
    }).collect();

    let steps_json: Vec<serde_json::Value> = steps.iter().map(|s| {
        let s_images: Vec<serde_json::Value> = step_images.iter()
            .filter(|i| i.step_id == s.id)
            .map(|i| serde_json::json!({ "url": image_url(&i.image_uuid) }))
            .collect();

        let s_tools: Vec<serde_json::Value> = step_tools_data.iter()
            .filter(|t| t.step_id == s.id)
            .map(|t| {
                let name = t.tool_id.as_ref()
                    .and_then(|id| tool_map.get(id))
                    .map(|tool| tool.name.clone())
                    .or_else(|| t.free_text.clone())
                    .unwrap_or_default();
                serde_json::json!({ "name": name, "is_library": t.tool_id.is_some() })
            }).collect();

        let s_items: Vec<serde_json::Value> = step_items_data.iter()
            .filter(|i| i.step_id == s.id)
            .map(|i| {
                let (name, unit) = i.item_id.as_ref()
                    .and_then(|id| item_map.get(id))
                    .map(|item| (item.name.clone(), item.unit.clone().unwrap_or_default()))
                    .unwrap_or_else(|| (i.free_text.clone().unwrap_or_default(), i.unit.clone().unwrap_or_default()));
                serde_json::json!({
                    "name": name,
                    "quantity": i.quantity,
                    "unit": unit,
                    "is_library": i.item_id.is_some()
                })
            }).collect();

        serde_json::json!({
            "step_number": s.step_number,
            "action": s.action,
            "expected_output": s.expected_output,
            "notes": s.notes,
            "tools": s_tools,
            "items": s_items,
            "images": s_images
        })
    }).collect();

    let definitions_json: Vec<serde_json::Value> = definitions.iter().map(|d| {
        serde_json::json!({ "term": d.term, "meaning": d.meaning })
    }).collect();

    let revisions_json: Vec<serde_json::Value> = revisions.iter().map(|r| {
        serde_json::json!({
            "version": r.version,
            "revision_notes": r.revision_notes,
            "revised_by": r.revised_by,
            "revision_date": r.revision_date,
            "approval_status": r.approval_status,
            "approved_by": r.approved_by,
            "approval_date": r.approval_date
        })
    }).collect();

    let company_name: String = sqlx::query_as::<sqlx::Sqlite, (String,)>(
        "SELECT value FROM app_config WHERE key = 'company_name'"
    )
    .fetch_optional(pool).await.map_err(|e| e.to_string())?
    .map(|(v,)| v)
    .unwrap_or_else(|| "My Company".to_string());

    let sop_data = serde_json::json!({
        "settings": {
            "company_name": company_name,
            "brand_color": "#c84b2f"
        },
        "sop": {
            "sop_id": sop.sop_id,
            "version": sop.version,
            "title": sop.title,
            "project_tag": sop.project_tag,
            "department": sop.department,
            "document_owner": sop.document_owner,
            "created_by": sop.created_by,
            "created_date": sop.created_date,
            "active_date": sop.active_date,
            "next_review_date": sop.next_review_date,
            "approval_status": sop.approval_status,
            "regulatory_ref": sop.regulatory_ref,
            "distribution_list": sop.distribution_list,
            "related_documents": sop.related_documents,
            "purpose": sop.purpose,
            "scope": sop.scope,
            "safety_notes": sop.safety_notes,
            "training_required": sop.training_required,
            "training_details": sop.training_details
        },
        "tools": tools_json,
        "items": items_json,
        "steps": steps_json,
        "definitions": definitions_json,
        "revisions": revisions_json
    });

    let json_str = serde_json::to_string(&sop_data).map_err(|e| e.to_string())?;

    let suggested_filename = format!("{}-V{}.pdf", sop.sop_id, sop.version);

    // Inject JSON directly (no template literal — avoids backtick/`${` breakage in user data)
    // Set document.title early so WebKitGTK can read it before the print dialog opens
    let init_script = format!(
        "window.SOP_DATA = {}; document.title = '{}';",
        json_str, suggested_filename
    );

    let print_script = "document.addEventListener('DOMContentLoaded', function() { \
        setTimeout(function() { window.print(); }, 800); \
    });";

    let full_init = format!("{}\n{}", init_script, print_script);

    // Close any existing pdf-export window to avoid duplicate label error
    if let Some(existing) = app_handle.get_webview_window("pdf-export") {
        let _ = existing.close();
        std::thread::sleep(std::time::Duration::from_millis(200));
    }

    tauri::WebviewWindowBuilder::new(
        &app_handle,
        "pdf-export",
        tauri::WebviewUrl::App("pdf-template.html".into()),
    )
    .title("Print SOP")
    .inner_size(1024.0, 768.0)
    .visible(false)
    .initialization_script(&full_init)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}
