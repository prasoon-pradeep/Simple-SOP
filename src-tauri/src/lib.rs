pub mod commands;
pub mod db;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                match db::init_db(&handle).await {
                    Ok(pool) => {
                        handle.manage(pool);
                        let backup_handle = handle.clone();
                        tauri::async_runtime::spawn(async move {
                            db::run_daily_backup(&backup_handle).await;
                        });
                        Ok::<(), anyhow::Error>(())
                    }
                    Err(e) => {
                        eprintln!("CRITICAL: Database initialization failed: {}", e);
                        if let Some(win) = handle.get_webview_window("main") {
                            let _ = win.close();
                        }
                        show_db_error_window(&handle);
                        Ok::<(), anyhow::Error>(())
                    }
                }
            })?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::generate_sop_id,
            commands::create_sop,
            commands::get_sops,
            commands::get_sop,
            commands::soft_delete_sop,
            commands::get_revisions,
            commands::save_sop,
            commands::save_revision,
            commands::get_definitions,
            commands::save_definition,
            commands::delete_definition,
            commands::get_tools,
            commands::save_tool,
            commands::delete_tool,
            commands::get_items,
            commands::save_item,
            commands::delete_item,
            commands::search_tools,
            commands::search_items,
            commands::clone_tool,
            commands::clone_item,
            commands::get_steps_full,
            commands::save_step,
            commands::delete_step,
            commands::reorder_steps,
            commands::save_step_image,
            commands::delete_step_image,
            commands::save_step_tool,
            commands::delete_step_tool,
            commands::save_step_item,
            commands::delete_step_item,
            commands::duplicate_step,
            commands::save_image,
            commands::export_sop,
            commands::import_sop_preview,
            commands::finalize_import,
            commands::check_db_health,
            commands::get_config_value,
            commands::set_config_value,
            commands::export_pdf,
            commands::check_chromium_available,
            commands::check_keyring_available,
            commands::set_ai_key,
            commands::get_ai_key,
            commands::delete_ai_key,
            commands::test_ai_connection,
            commands::list_ai_models,
            commands::enhance_text,
            commands::save_ai_enhancement,
            commands::get_ai_enhancements,
            commands::get_field_suggestions,
            commands::get_revision_name_suggestions,
            commands::read_file_as_base64,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn show_db_error_window(handle: &tauri::AppHandle) {
    let (data_path, finder_hint) = match std::env::consts::OS {
        "windows" => (
            r"C:\Users\{your-username}\AppData\Roaming\com.pp.sop-builder\",
            "Open File Explorer and paste the path above into the address bar.",
        ),
        "macos" => (
            "~/Library/Application Support/com.pp.sop-builder/",
            "Open Finder, press Cmd+Shift+G, and paste the path above.",
        ),
        _ => (
            "~/.local/share/com.pp.sop-builder/",
            "Open your file manager and navigate to the path above.",
        ),
    };

    let html = format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SOP Builder — Database Error</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #fdf0ef;
    color: #1a1917;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 32px;
  }}
  .card {{
    background: #ffffff;
    border: 1px solid rgba(200,75,47,0.2);
    border-radius: 10px;
    padding: 32px 36px;
    max-width: 580px;
    width: 100%;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  }}
  .icon {{
    width: 40px;
    height: 40px;
    background: #c84b2f;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    font-size: 20px;
    color: white;
  }}
  h1 {{
    font-size: 17px;
    font-weight: 700;
    color: #c84b2f;
    margin-bottom: 8px;
  }}
  p {{
    font-size: 13px;
    line-height: 1.6;
    color: #3d3b37;
    margin-bottom: 20px;
  }}
  .path-box {{
    background: #f0ede8;
    border: 1px solid rgba(26,25,23,0.12);
    border-radius: 6px;
    padding: 10px 14px;
    font-family: "SF Mono", "Fira Code", "Consolas", monospace;
    font-size: 12px;
    color: #1a1917;
    margin-bottom: 8px;
    word-break: break-all;
  }}
  .hint {{
    font-size: 12px;
    color: #7a756c;
    margin-bottom: 20px;
  }}
  h2 {{
    font-size: 13px;
    font-weight: 600;
    color: #1a1917;
    margin-bottom: 10px;
  }}
  ol {{
    padding-left: 18px;
  }}
  li {{
    font-size: 13px;
    line-height: 1.7;
    color: #3d3b37;
    margin-bottom: 4px;
  }}
  code {{
    font-family: "SF Mono", "Fira Code", "Consolas", monospace;
    font-size: 11.5px;
    background: #f0ede8;
    padding: 1px 5px;
    border-radius: 4px;
    color: #1a1917;
  }}
</style>
</head>
<body>
<div class="card">
  <div class="icon">&#9888;</div>
  <h1>Database Error — SOP Builder cannot start</h1>
  <p>The SOP database file is corrupt or unreadable. Your data is likely intact in a recent backup. Follow the steps below to recover.</p>
  <h2>Your data folder</h2>
  <div class="path-box">{data_path}</div>
  <p class="hint">{finder_hint}</p>
  <h2>Recovery steps</h2>
  <ol>
    <li>Close this window.</li>
    <li>Open the folder shown above in your file manager.</li>
    <li>Delete or rename <code>sop-builder.db</code> (e.g. rename to <code>sop-builder.db.broken</code>).</li>
    <li>Open the <code>backups/</code> subfolder and find the most recent file (e.g. <code>sop-builder-2026-05-10.db</code>).</li>
    <li>Copy that file into the parent folder and rename it to <code>sop-builder.db</code>.</li>
    <li>Relaunch SOP Builder.</li>
  </ol>
</div>
</body>
</html>"#,
        data_path = data_path,
        finder_hint = finder_hint,
    );

    let temp_path = std::env::temp_dir().join("sop-builder-db-error.html");
    if std::fs::write(&temp_path, &html).is_err() {
        return;
    }

    #[cfg(target_os = "windows")]
    let url_str = format!(
        "file:///{}",
        temp_path.to_string_lossy().replace('\\', "/")
    );
    #[cfg(not(target_os = "windows"))]
    let url_str = format!("file://{}", temp_path.to_string_lossy());

    if let Ok(url) = url_str.parse::<url::Url>() {
        let _ = tauri::WebviewWindowBuilder::new(
            handle,
            "db-error",
            tauri::WebviewUrl::External(url),
        )
        .title("SOP Builder — Database Error")
        .inner_size(680.0, 520.0)
        .resizable(false)
        .build();
    }
}
