use anyhow::Result;
use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::str::FromStr;
use tauri::{AppHandle, Manager};

pub async fn init_db(app_handle: &AppHandle) -> Result<SqlitePool> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");

    // Ensure the app data directory exists
    std::fs::create_dir_all(&app_dir)?;

    // Ensure the images directory exists
    let images_dir = app_dir.join("images");
    std::fs::create_dir_all(&images_dir)?;

    let db_path = app_dir.join("sop-builder.db");
    let db_url = format!("sqlite:{}", db_path.to_string_lossy());

    // Connect and create file if it doesn't exist
    let options = SqliteConnectOptions::from_str(&db_url)?.create_if_missing(true);

    let pool = SqlitePool::connect_with(options).await?;

    // Apply PRAGMAs
    sqlx::query("PRAGMA journal_mode=WAL;")
        .execute(&pool)
        .await?;
    sqlx::query("PRAGMA synchronous=NORMAL;")
        .execute(&pool)
        .await?;
    sqlx::query("PRAGMA foreign_keys=ON;")
        .execute(&pool)
        .await?;

    // Create Tables
    create_tables(&pool).await?;

    // Migration: Add is_deleted and deleted_at if they don't exist
    migrate_db(&pool).await?;

    // Run Integrity Check
    let row: (String,) = sqlx::query_as("PRAGMA integrity_check;")
        .fetch_one(&pool)
        .await?;
    if row.0 != "ok" {
        return Err(anyhow::anyhow!(
            "Database integrity check failed: {}",
            row.0
        ));
    }

    Ok(pool)
}

async fn create_tables(pool: &SqlitePool) -> Result<()> {
    let queries = [
        r#"CREATE TABLE IF NOT EXISTS sops (
            id                  TEXT PRIMARY KEY,
            sop_id              TEXT UNIQUE NOT NULL,
            version             INTEGER NOT NULL DEFAULT 1,
            title               TEXT NOT NULL,
            project_tag         TEXT,
            department          TEXT,
            document_owner      TEXT,
            created_by          TEXT,
            created_date        TEXT,
            active_date         TEXT,
            next_review_date    TEXT,
            approval_status     TEXT,
            regulatory_ref      TEXT,
            distribution_list   TEXT,
            related_documents   TEXT,
            purpose             TEXT,
            scope               TEXT,
            safety_notes        TEXT,
            training_required   INTEGER DEFAULT 0,
            training_details    TEXT,
            created_at          TEXT NOT NULL,
            updated_at          TEXT NOT NULL,
            is_deleted          INTEGER NOT NULL DEFAULT 0,
            deleted_at          TEXT
        );"#,
        r#"CREATE TABLE IF NOT EXISTS revisions (
            id              TEXT PRIMARY KEY,
            sop_id          TEXT NOT NULL,
            version         INTEGER NOT NULL,
            revision_notes  TEXT NOT NULL,
            revised_by      TEXT,
            revision_date   TEXT NOT NULL,
            approval_status TEXT,
            approved_by     TEXT,
            approval_date   TEXT,
            FOREIGN KEY (sop_id) REFERENCES sops(id)
        );"#,
        r#"CREATE TABLE IF NOT EXISTS definitions (
            id      TEXT PRIMARY KEY,
            sop_id  TEXT NOT NULL,
            term    TEXT NOT NULL,
            meaning TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (sop_id) REFERENCES sops(id)
        );"#,
        r#"CREATE TABLE IF NOT EXISTS tools (
            id                  TEXT PRIMARY KEY,
            sop_id              TEXT NOT NULL,
            name                TEXT NOT NULL,
            type                TEXT,
            model_part_no       TEXT,
            specification       TEXT,
            image_uuid          TEXT,
            calibration_required INTEGER DEFAULT 0,
            calibration_due_date TEXT,
            source_tool_uuid    TEXT,
            FOREIGN KEY (sop_id) REFERENCES sops(id)
        );"#,
        r#"CREATE TABLE IF NOT EXISTS items (
            id            TEXT PRIMARY KEY,
            sop_id        TEXT NOT NULL,
            name          TEXT NOT NULL,
            part_no       TEXT,
            description   TEXT,
            image_uuid    TEXT,
            unit          TEXT,
            source_item_uuid TEXT,
            FOREIGN KEY (sop_id) REFERENCES sops(id)
        );"#,
        r#"CREATE TABLE IF NOT EXISTS steps (
            id          TEXT PRIMARY KEY,
            sop_id      TEXT NOT NULL,
            step_number INTEGER NOT NULL,
            action      TEXT,
            notes       TEXT,
            expected_output TEXT,
            sort_order  INTEGER NOT NULL,
            FOREIGN KEY (sop_id) REFERENCES sops(id)
        );"#,
        r#"CREATE TABLE IF NOT EXISTS step_images (
            id          TEXT PRIMARY KEY,
            step_id     TEXT NOT NULL,
            image_uuid  TEXT NOT NULL,
            sort_order  INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (step_id) REFERENCES steps(id)
        );"#,
        r#"CREATE TABLE IF NOT EXISTS step_tools (
            id          TEXT PRIMARY KEY,
            step_id     TEXT NOT NULL,
            tool_id     TEXT,
            free_text   TEXT,
            FOREIGN KEY (step_id) REFERENCES steps(id)
        );"#,
        r#"CREATE TABLE IF NOT EXISTS step_items (
            id          TEXT PRIMARY KEY,
            step_id     TEXT NOT NULL,
            item_id     TEXT,
            free_text   TEXT,
            quantity    REAL,
            unit        TEXT,
            FOREIGN KEY (step_id) REFERENCES steps(id)
        );"#,
        r#"CREATE TABLE IF NOT EXISTS app_config (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );"#,
    ];

    for query in queries {
        sqlx::query(query).execute(pool).await?;
    }

    Ok(())
}

async fn migrate_db(pool: &SqlitePool) -> Result<()> {
    // Check if is_deleted column exists
    let row: (i64,) =
        sqlx::query_as("SELECT count(*) FROM pragma_table_info('sops') WHERE name='is_deleted'")
            .fetch_one(pool)
            .await?;

    if row.0 == 0 {
        sqlx::query("ALTER TABLE sops ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0")
            .execute(pool)
            .await?;
        sqlx::query("ALTER TABLE sops ADD COLUMN deleted_at TEXT")
            .execute(pool)
            .await?;
    }

    // Migration: Standardize 'Review' -> 'Under Review'
    sqlx::query(
        "UPDATE sops SET approval_status = 'Under Review' WHERE approval_status = 'Review'",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "UPDATE revisions SET approval_status = 'Under Review' WHERE approval_status = 'Review'",
    )
    .execute(pool)
    .await?;

    Ok(())
}
