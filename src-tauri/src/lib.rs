pub mod commands;
pub mod db;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let pool = db::init_db(&handle).await.map_err(|e| {
                    eprintln!("CRITICAL: Database initialization failed: {}", e);
                    e
                })?;
                handle.manage(pool);
                Result::<(), anyhow::Error>::Ok(())
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
            commands::export_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
