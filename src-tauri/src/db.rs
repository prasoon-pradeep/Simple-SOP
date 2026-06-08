use anyhow::Result;
use chrono::Utc;
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
            qty           TEXT,
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
        r#"CREATE TABLE IF NOT EXISTS ai_enhancements (
            id            TEXT PRIMARY KEY,
            sop_id        TEXT NOT NULL,
            entity_type   TEXT NOT NULL,
            entity_id     TEXT NOT NULL,
            field_name    TEXT NOT NULL,
            original_text TEXT NOT NULL,
            enhanced_text TEXT NOT NULL,
            provider      TEXT NOT NULL,
            model         TEXT NOT NULL,
            enhanced_at   TEXT NOT NULL,
            FOREIGN KEY (sop_id) REFERENCES sops(id)
        );"#,
    ];

    for query in queries {
        sqlx::query(query).execute(pool).await?;
    }

    Ok(())
}

pub async fn run_daily_backup(app_handle: &AppHandle) {
    let app_dir = match app_handle.path().app_data_dir() {
        Ok(d) => d,
        Err(e) => {
            eprintln!("Backup: failed to get app data dir: {}", e);
            return;
        }
    };

    let backups_dir = app_dir.join("backups");
    if let Err(e) = std::fs::create_dir_all(&backups_dir) {
        eprintln!("Backup: failed to create backups dir: {}", e);
        return;
    }

    let pool = app_handle.state::<SqlitePool>();
    let today = Utc::now().format("%Y-%m-%d").to_string();

    let last_backup: Option<(String,)> =
        sqlx::query_as("SELECT value FROM app_config WHERE key = 'last_backup_date'")
            .fetch_optional(pool.inner())
            .await
            .unwrap_or(None);

    if let Some((date,)) = last_backup {
        if date == today {
            return;
        }
    }

    let backup_path = backups_dir.join(format!("sop-builder-{}.db", today));
    let _ = std::fs::remove_file(&backup_path);

    // VACUUM INTO requires forward slashes even on Windows
    let backup_path_str = backup_path.to_string_lossy().replace('\\', "/");
    let vacuum_sql = format!("VACUUM INTO '{}'", backup_path_str);

    if let Err(e) = sqlx::query(&vacuum_sql).execute(pool.inner()).await {
        eprintln!("Backup: VACUUM INTO failed: {}", e);
        return;
    }

    let _ = sqlx::query(
        "INSERT INTO app_config (key, value) VALUES ('last_backup_date', ?) \
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(&today)
    .execute(pool.inner())
    .await;

    // Prune: keep only the 30 most recent backups
    let mut backups: Vec<_> = match std::fs::read_dir(&backups_dir) {
        Ok(rd) => rd
            .filter_map(|e| e.ok())
            .filter(|e| {
                let name = e.file_name();
                let n = name.to_string_lossy();
                n.starts_with("sop-builder-") && n.ends_with(".db")
            })
            .collect(),
        Err(_) => return,
    };

    backups.sort_by_key(|e| e.file_name());

    if backups.len() > 30 {
        for old in &backups[..backups.len() - 30] {
            let _ = std::fs::remove_file(old.path());
        }
    }
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

    let row: (i64,) =
        sqlx::query_as("SELECT count(*) FROM pragma_table_info('items') WHERE name='qty'")
            .fetch_one(pool)
            .await?;

    if row.0 == 0 {
        sqlx::query("ALTER TABLE items ADD COLUMN qty TEXT")
            .execute(pool)
            .await?;
    }

    let row: (i64,) =
        sqlx::query_as("SELECT count(*) FROM pragma_table_info('sops') WHERE name='cycle_time_value'")
            .fetch_one(pool)
            .await?;

    if row.0 == 0 {
        sqlx::query("ALTER TABLE sops ADD COLUMN cycle_time_value REAL")
            .execute(pool)
            .await?;
        sqlx::query("ALTER TABLE sops ADD COLUMN cycle_time_unit TEXT DEFAULT 'minutes'")
            .execute(pool)
            .await?;
        sqlx::query("ALTER TABLE sops ADD COLUMN cycle_time_notes TEXT")
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
