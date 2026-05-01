use chrono::{Datelike, Utc};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use sqlx::{SqlitePool, Row};
use uuid::Uuid;

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

// Stubs for remaining tables
#[tauri::command]
pub async fn save_definition(_payload: serde_json::Value, _state: tauri::State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn save_tool(_payload: serde_json::Value, _state: tauri::State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn save_item(_payload: serde_json::Value, _state: tauri::State<'_, sqlx::SqlitePool>) -> Result<(), String> {
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
